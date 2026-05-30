'use strict';

const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

function clean(s) {
  if (typeof s !== 'string') return s;
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s.charCodeAt(i) !== 0) out += s[i];
  }
  return out;
}

const STAFF_ROLES  = ['staff', 'event_manager'];
const ADMIN_ROLES  = ['tenant_admin', 'super_admin'];
const CLIENT_ROLES = ['client'];

// ─── Team member list ────────────────────────────────────────────────────────

async function listTeamMembers({ tenantId, excludeUserId }) {
  return prisma.user.findMany({
    where: {
      tenantId,
      role: { in: [...STAFF_ROLES, ...ADMIN_ROLES] },
      isActive: true,
      ...(excludeUserId ? { NOT: { userId: excludeUserId } } : {}),
    },
    select: { userId: true, name: true, email: true, role: true },
    orderBy: [{ role: 'asc' }, { name: 'asc' }],
  });
}

// ─── DM conversation previews (one entry per conversation partner) ────────────

async function listConversationPreviews({ tenantId, userId }) {
  // Gather all unique partner IDs from sent + received DMs
  const [sent, received] = await Promise.all([
    prisma.message.findMany({
      where: { tenantId, senderId: userId, recipientId: { not: null } },
      select: { recipientId: true },
      distinct: ['recipientId'],
    }),
    prisma.message.findMany({
      where: { tenantId, recipientId: userId },
      select: { senderId: true },
      distinct: ['senderId'],
    }),
  ]);

  const partnerIds = [...new Set([
    ...sent.map(m => m.recipientId),
    ...received.map(m => m.senderId),
  ])];

  const previews = await Promise.all(partnerIds.map(async (partnerId) => {
    const [lastMessage, unreadCount, partner] = await Promise.all([
      prisma.message.findFirst({
        where: {
          tenantId,
          OR: [
            { senderId: userId, recipientId: partnerId },
            { senderId: partnerId, recipientId: userId },
          ],
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.message.count({
        where: { tenantId, senderId: partnerId, recipientId: userId, isRead: false },
      }),
      prisma.user.findUnique({
        where: { userId: partnerId },
        select: { userId: true, name: true, role: true },
      }),
    ]);
    return { partner, lastMessage, unreadCount };
  }));

  return previews
    .filter(p => p.partner)
    .sort((a, b) =>
      new Date(b.lastMessage?.createdAt || 0) - new Date(a.lastMessage?.createdAt || 0)
    );
}

// ─── DM thread between two users ─────────────────────────────────────────────

async function listConversation({ tenantId, userId, partnerId, page = 1, size = 100 }) {
  const skip = (page - 1) * size;
  const where = {
    tenantId,
    OR: [
      { senderId: userId, recipientId: partnerId },
      { senderId: partnerId, recipientId: userId },
    ],
  };
  const [messages, total] = await Promise.all([
    prisma.message.findMany({ where, skip, take: size, orderBy: { createdAt: 'asc' } }),
    prisma.message.count({ where }),
  ]);
  return { messages, meta: { total, page, size } };
}

// ─── Send DM ─────────────────────────────────────────────────────────────────

async function sendDM({ tenantId, senderId, senderName, senderRole, recipientId, content }) {
  if (!content?.trim()) throw new AppError('Message content is required', 400, 'CONTENT_REQUIRED');
  if (!recipientId) throw new AppError('Recipient is required', 400, 'RECIPIENT_REQUIRED');
  return prisma.message.create({
    data: {
      tenantId,
      senderId,
      senderName: clean(senderName),
      senderRole: clean(senderRole),
      recipientId,
      content: clean(content.trim()),
    },
  });
}

// ─── Mark DM thread as read ───────────────────────────────────────────────────

async function markConversationRead({ tenantId, userId, partnerId }) {
  // Find unread messages from partner before marking them read
  const unread = await prisma.message.findMany({
    where: { tenantId, senderId: partnerId, recipientId: userId, isRead: false },
    orderBy: { createdAt: 'desc' },
    take: 1,
  });

  await prisma.message.updateMany({
    where: { tenantId, senderId: partnerId, recipientId: userId, isRead: false },
    data: { isRead: true },
  });

  // Notify the sender that their message was seen — only if messages were newly marked
  if (unread.length > 0) {
    const reader = await prisma.user.findUnique({
      where: { userId },
      select: { name: true },
    });

    // Avoid duplicate seen notifications: skip if one already exists in last 60s
    const recentlySent = await prisma.notification.findFirst({
      where: {
        userId: partnerId,
        tenantId,
        type: 'message_seen',
        resourceId: userId,
        createdAt: { gte: new Date(Date.now() - 60_000) },
      },
    });

    if (!recentlySent) {
      await prisma.notification.create({
        data: {
          userId: partnerId,
          tenantId,
          type: 'message_seen',
          title: `${reader?.name || 'Someone'} read your message`,
          body: unread[0].content.slice(0, 100),
          resourceId: userId,
          resourceType: 'user',
        },
      });
    }
  }

  return { success: true };
}

// ─── Total unread DM count for a user ────────────────────────────────────────

async function getUnreadDMCount({ tenantId, userId }) {
  return prisma.message.count({
    where: { tenantId, recipientId: userId, isRead: false },
  });
}

// ─── Broadcast (client channel) — kept for admin "Clients" tab ───────────────

async function listClientMessages({ tenantId, page = 1, size = 200 }) {
  const skip = (page - 1) * size;
  const where = {
    tenantId,
    recipientId: null,
    senderRole: { in: [...CLIENT_ROLES, ...ADMIN_ROLES] },
  };
  const [messages, total] = await Promise.all([
    prisma.message.findMany({ where, skip, take: size, orderBy: { createdAt: 'asc' } }),
    prisma.message.count({ where }),
  ]);
  return { messages, meta: { total, page, size } };
}

async function sendClientBroadcast({ tenantId, senderId, senderName, senderRole, content }) {
  if (!content?.trim()) throw new AppError('Message content is required', 400, 'CONTENT_REQUIRED');
  return prisma.message.create({
    data: {
      tenantId,
      senderId,
      senderName: clean(senderName),
      senderRole: clean(senderRole),
      content: clean(content.trim()),
      // recipientId stays null → broadcast
    },
  });
}

async function markClientMessagesRead({ tenantId, readerRole }) {
  const senderRoles = CLIENT_ROLES.includes(readerRole) ? [...ADMIN_ROLES] : [...CLIENT_ROLES];
  await prisma.message.updateMany({
    where: { tenantId, recipientId: null, isRead: false, senderRole: { in: senderRoles } },
    data: { isRead: true },
  });
  return { success: true };
}

module.exports = {
  listTeamMembers,
  listConversationPreviews,
  listConversation,
  sendDM,
  markConversationRead,
  getUnreadDMCount,
  listClientMessages,
  sendClientBroadcast,
  markClientMessagesRead,
};
