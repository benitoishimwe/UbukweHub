'use strict';

const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');
const { uploadFile } = require('../config/supabase');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const CHAT_BUCKET = 'chat-attachments';

// ─── In-memory typing indicator (no Redis needed for MVP) ─────────────────────
// Map<channelId, Map<userId, { name, role, expiresAt }>>
const _typing = new Map();
const TYPING_TTL_MS = 4000;

function _setTyping(channelId, userId, name, role) {
  if (!_typing.has(channelId)) _typing.set(channelId, new Map());
  _typing.get(channelId).set(userId, { name, role, expiresAt: Date.now() + TYPING_TTL_MS });
}

function _getTyping(channelId, excludeUserId) {
  const now = Date.now();
  const map = _typing.get(channelId);
  if (!map) return [];
  const active = [];
  for (const [uid, info] of map.entries()) {
    if (info.expiresAt > now && uid !== excludeUserId) {
      active.push({ userId: uid, name: info.name, role: info.role });
    } else if (info.expiresAt <= now) {
      map.delete(uid);
    }
  }
  return active;
}

// ─── Null-byte sanitiser ──────────────────────────────────────────────────────
function clean(s) {
  if (typeof s !== 'string') return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) !== 0) out += s[i];
  }
  return out;
}

// ─── Access control ───────────────────────────────────────────────────────────

async function checkEventAccess(eventId, userId, role, tenantId) {
  const event = await prisma.event.findUnique({
    where: { eventId },
    select: {
      eventId: true, tenantId: true, clientId: true,
      staffIds: true, vendorIds: true, createdBy: true, name: true,
    },
  });
  if (!event) throw new AppError('Event not found', 404, 'NOT_FOUND');

  if (role === 'super_admin') return event;
  if (role === 'tenant_admin' && event.tenantId === tenantId) return event;
  if (event.clientId === userId) return event;
  if (event.createdBy === userId) return event;

  const staffIds  = Array.isArray(event.staffIds)  ? event.staffIds  : [];
  const vendorIds = Array.isArray(event.vendorIds) ? event.vendorIds : [];
  if (staffIds.includes(userId) || vendorIds.includes(userId)) return event;

  throw new AppError('Access denied to this event channel', 403, 'FORBIDDEN');
}

// ─── List channels (events the user has access to) ────────────────────────────

async function listChannels({ userId, role, tenantId }) {
  let events = [];

  if (role === 'super_admin') {
    events = await prisma.event.findMany({
      select: { eventId: true, name: true, status: true, eventDate: true },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  } else if (role === 'tenant_admin') {
    events = await prisma.event.findMany({
      where: { tenantId },
      select: { eventId: true, name: true, status: true, eventDate: true },
      orderBy: { createdAt: 'desc' },
    });
  } else if (role === 'event_manager') {
    events = await prisma.event.findMany({
      where: { createdBy: userId },
      select: { eventId: true, name: true, status: true, eventDate: true },
      orderBy: { createdAt: 'desc' },
    });
  } else if (role === 'client') {
    events = await prisma.event.findMany({
      where: { clientId: userId },
      select: { eventId: true, name: true, status: true, eventDate: true },
      orderBy: { createdAt: 'desc' },
    });
  } else {
    // staff / vendor — match via JSON array containment
    const raw = await prisma.$queryRaw`
      SELECT event_id    AS "eventId",
             name,
             status,
             event_date  AS "eventDate"
      FROM   events
      WHERE  (
               (staff_ids  IS NOT NULL AND staff_ids  @> ${JSON.stringify([userId])}::jsonb)
            OR (vendor_ids IS NOT NULL AND vendor_ids @> ${JSON.stringify([userId])}::jsonb)
             )
      ORDER  BY created_at DESC
    `;
    events = raw;
  }

  // Enrich each channel with last message + unread count
  const enriched = await Promise.all(
    events.map(async (ev) => {
      const [lastMsg, readStatus] = await Promise.all([
        prisma.channelMessage.findFirst({
          where:   { eventId: ev.eventId, parentMessageId: null },
          orderBy: { createdAt: 'desc' },
          select:  { content: true, createdAt: true, senderName: true, attachments: true },
        }),
        prisma.channelReadStatus.findUnique({
          where: { userId_channelId: { userId, channelId: ev.eventId } },
        }),
      ]);

      let unreadCount = 0;
      if (lastMsg) {
        unreadCount = await prisma.channelMessage.count({
          where: {
            eventId:  ev.eventId,
            senderId: { not: userId },
            createdAt: { gt: readStatus?.lastReadAt ?? new Date(0) },
          },
        });
      }

      return { ...ev, lastMessage: lastMsg, unreadCount };
    })
  );

  return enriched;
}

// ─── List messages ────────────────────────────────────────────────────────────

async function listMessages({ eventId, page = 1, size = 50 }) {
  const skip  = (page - 1) * size;
  const where = { eventId, parentMessageId: null };

  const [messages, total, pinned] = await Promise.all([
    prisma.channelMessage.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'asc' },
      include: {
        replies: {
          orderBy: { createdAt: 'asc' },
          select: {
            messageId: true, senderId: true, senderName: true, senderRole: true,
            content: true, attachments: true, isPinned: true, createdAt: true,
          },
        },
      },
    }),
    prisma.channelMessage.count({ where }),
    prisma.channelMessage.findMany({
      where:   { eventId, isPinned: true, parentMessageId: null },
      orderBy: { createdAt: 'desc' },
      take:    10,
      select: {
        messageId: true, senderId: true, senderName: true, senderRole: true,
        content: true, createdAt: true,
      },
    }),
  ]);

  return { messages, pinned, meta: { total, page, size } };
}

// ─── Send message ─────────────────────────────────────────────────────────────

async function sendMessage({ eventId, senderId, senderName, senderRole, tenantId, content, attachments, parentMessageId }) {
  if (!content?.trim() && (!attachments || attachments.length === 0)) {
    throw new AppError('Message must have content or an attachment', 400, 'EMPTY_MESSAGE');
  }

  const message = await prisma.channelMessage.create({
    data: {
      eventId,
      senderId,
      senderName: clean(senderName),
      senderRole: clean(senderRole),
      content:    content ? clean(content.trim()) : null,
      attachments: attachments?.length ? attachments : null,
      parentMessageId: parentMessageId || null,
    },
    include: {
      replies: true,
    },
  });

  // Detect @mentions and create in-app notifications
  if (content && tenantId) {
    await processMentions({
      content, eventId, tenantId,
      senderId, senderName,
      messageId: message.messageId,
    }).catch(() => {}); // non-fatal
  }

  return message;
}

// ─── Upload attachment ────────────────────────────────────────────────────────

async function uploadAttachment({ eventId, file }) {
  const ext      = path.extname(file.originalname);
  const fileName = `${uuidv4()}${ext}`;
  const storagePath = `events/${eventId}/${fileName}`;

  const publicUrl = await uploadFile(CHAT_BUCKET, storagePath, file.buffer, file.mimetype);

  return {
    url:      publicUrl,
    filename: file.originalname,
    mimeType: file.mimetype,
    size:     file.size,
  };
}

// ─── Pin / unpin ──────────────────────────────────────────────────────────────

async function setPinned({ messageId, isPinned, userId, role, tenantId }) {
  const msg = await prisma.channelMessage.findUnique({
    where:  { messageId },
    select: { eventId: true },
  });
  if (!msg) throw new AppError('Message not found', 404, 'NOT_FOUND');

  // Only tenant_admin, super_admin, or event_manager (createdBy) can pin
  const event = await prisma.event.findUnique({
    where:  { eventId: msg.eventId },
    select: { createdBy: true, tenantId: true },
  });
  const canPin =
    role === 'super_admin' ||
    (role === 'tenant_admin' && event.tenantId === tenantId) ||
    (role === 'event_manager' && event.createdBy === userId);

  if (!canPin) throw new AppError('Only admins and event managers can pin messages', 403, 'FORBIDDEN');

  return prisma.channelMessage.update({
    where: { messageId },
    data:  { isPinned },
  });
}

// ─── Mark channel as read ─────────────────────────────────────────────────────

async function markChannelRead({ userId, channelId }) {
  await prisma.channelReadStatus.upsert({
    where:  { userId_channelId: { userId, channelId } },
    update: { lastReadAt: new Date() },
    create: { userId, channelId, lastReadAt: new Date() },
  });
}

// ─── Full-text search ─────────────────────────────────────────────────────────

async function searchMessages({ q, eventId }) {
  if (!q?.trim()) return [];

  const results = await prisma.$queryRaw`
    SELECT
      message_id   AS "messageId",
      event_id     AS "eventId",
      sender_id    AS "senderId",
      sender_name  AS "senderName",
      sender_role  AS "senderRole",
      content,
      is_pinned    AS "isPinned",
      created_at   AS "createdAt",
      ts_headline(
        'english', content,
        plainto_tsquery('english', ${q}),
        'MaxWords=15, MinWords=5, StartSel=<mark>, StopSel=</mark>'
      ) AS snippet
    FROM channel_messages
    WHERE event_id = ${eventId}::uuid
      AND search_vector @@ plainto_tsquery('english', ${q})
    ORDER BY ts_rank(search_vector, plainto_tsquery('english', ${q})) DESC
    LIMIT 30
  `;

  return results;
}

// ─── Convert message to task ──────────────────────────────────────────────────

async function createTaskFromMessage({ eventId, tenantId, messageId, title, description, assignedTo, dueDate, createdBy }) {
  const msg = await prisma.channelMessage.findUnique({ where: { messageId } });
  if (!msg) throw new AppError('Message not found', 404, 'NOT_FOUND');

  return prisma.eventTask.create({
    data: {
      eventId,
      tenantId,
      title:       clean(title || msg.content?.slice(0, 100) || 'Task from chat'),
      description: description ? clean(description) : msg.content,
      assignedTo:  assignedTo || null,
      dueDate:     dueDate ? new Date(dueDate) : null,
      createdBy,
      status:      'todo',
      priority:    'medium',
    },
  });
}

// ─── Typing indicator ─────────────────────────────────────────────────────────

function setTyping({ channelId, userId, name, role }) {
  _setTyping(channelId, userId, name, role);
}

function getTyping({ channelId, userId }) {
  return _getTyping(channelId, userId);
}

// ─── Mention helpers ─────────────────────────────────────────────────────────

function extractMentions(content) {
  const re = /@([\w][\w .'-]{0,49})/g;
  const mentions = [];
  let m;
  while ((m = re.exec(content)) !== null) {
    mentions.push(m[1].trim());
  }
  return [...new Set(mentions)];
}

async function processMentions({ content, eventId, tenantId, senderId, senderName, messageId }) {
  const mentions = extractMentions(content);
  if (!mentions.length) return;

  for (const mentionStr of mentions) {
    const user = await prisma.user.findFirst({
      where: {
        tenantId,
        isActive: true,
        NOT:  { userId: senderId },
        name: { contains: mentionStr, mode: 'insensitive' },
      },
      select: { userId: true },
    });

    if (user) {
      await prisma.notification.create({
        data: {
          userId:       user.userId,
          tenantId,
          type:         'chat_mention',
          title:        `${senderName} mentioned you`,
          body:         content.slice(0, 150),
          resourceId:   messageId,
          resourceType: 'channel_message',
        },
      }).catch(() => {});
    }
  }
}

module.exports = {
  checkEventAccess,
  listChannels,
  listMessages,
  sendMessage,
  uploadAttachment,
  setPinned,
  markChannelRead,
  searchMessages,
  createTaskFromMessage,
  setTyping,
  getTyping,
};
