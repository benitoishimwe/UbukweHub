'use strict';

/**
 * Event-scoped chat routes.
 *
 * Mounted at /api/events/:eventId/messages  (and a few flat helpers below)
 * in routes/index.js alongside the existing messages routes.
 *
 * Endpoints:
 *   GET    /api/channels                              – list event channels
 *   GET    /api/events/:eventId/messages              – paginated messages
 *   POST   /api/events/:eventId/messages              – send message (+file)
 *   PATCH  /api/events/:eventId/messages/:messageId/pin – pin/unpin
 *   GET    /api/events/:eventId/messages/search       – FTS search
 *   POST   /api/events/:eventId/messages/:messageId/task – create task
 *   POST   /api/events/:eventId/typing                – set typing indicator
 *   GET    /api/events/:eventId/typing                – get typing users
 *   PATCH  /api/events/:eventId/read                  – mark channel read
 *   POST   /api/events/:eventId/messages/upload       – upload attachment
 */

const { Router }       = require('express');
const multer           = require('multer');
const { authenticate } = require('../middleware/auth');
const R                = require('../utils/response');
const svc              = require('../services/eventMessages.service');

const router  = Router({ mergeParams: true }); // inherit :eventId from parent
const upload  = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_, file, cb) {
    const allowed = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'text/csv',
    ];
    cb(null, allowed.includes(file.mimetype));
  },
});

// ── Helper: verify event access and return the event ─────────────────────────
async function guard(req, res) {
  const { userId, role, tenantId } = req.user;
  const { eventId } = req.params;
  return svc.checkEventAccess(eventId, userId, role, tenantId);
}

// ─── GET /api/channels — list all event channels for the caller ───────────────
// Exported separately so index.js can mount it at /channels
const channelsRouter = Router();
channelsRouter.get('/', authenticate, async (req, res, next) => {
  try {
    const { userId, role, tenantId } = req.user;
    const channels = await svc.listChannels({ userId, role, tenantId });
    return R.ok(res, { channels });
  } catch (err) { next(err); }
});

// ─── GET /api/events/:eventId/messages ────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    await guard(req, res);
    const { page, size } = req.query;
    const result = await svc.listMessages({
      eventId: req.params.eventId,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 50,
    });
    return R.ok(res, result);
  } catch (err) { next(err); }
});

// ─── GET /api/events/:eventId/messages/search ─────────────────────────────────
// Must be before /:messageId routes to avoid collision
router.get('/search', authenticate, async (req, res, next) => {
  try {
    await guard(req, res);
    const { q } = req.query;
    if (!q?.trim()) return R.ok(res, { results: [] });
    const results = await svc.searchMessages({ q, eventId: req.params.eventId });
    return R.ok(res, { results });
  } catch (err) { next(err); }
});

// ─── POST /api/events/:eventId/messages/upload ───────────────────────────────
router.post('/upload', authenticate, upload.single('file'), async (req, res, next) => {
  try {
    await guard(req, res);
    if (!req.file) return R.badRequest(res, 'A file is required (field: "file"). Max 10 MB.');
    const attachment = await svc.uploadAttachment({ eventId: req.params.eventId, file: req.file });
    return R.ok(res, { attachment });
  } catch (err) { next(err); }
});

// ─── POST /api/events/:eventId/messages ──────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    await guard(req, res);
    const { userId, role, tenantId } = req.user;
    const { content, attachments, parentMessageId } = req.body;

    if (!content?.trim() && (!attachments || !attachments.length)) {
      return R.badRequest(res, 'content or at least one attachment is required');
    }

    const message = await svc.sendMessage({
      eventId:         req.params.eventId,
      senderId:        userId,
      senderName:      req.user.name || req.user.email,
      senderRole:      role,
      tenantId,
      content,
      attachments,
      parentMessageId,
    });

    return R.created(res, message, 'Message sent');
  } catch (err) { next(err); }
});

// ─── PATCH /api/events/:eventId/messages/:messageId/pin ──────────────────────
router.patch('/:messageId/pin', authenticate, async (req, res, next) => {
  try {
    const { userId, role, tenantId } = req.user;
    const { messageId } = req.params;
    const { isPinned } = req.body;
    if (typeof isPinned !== 'boolean') return R.badRequest(res, 'isPinned (boolean) is required');

    const updated = await svc.setPinned({ messageId, isPinned, userId, role, tenantId });
    return R.ok(res, updated, isPinned ? 'Message pinned' : 'Message unpinned');
  } catch (err) { next(err); }
});

// ─── POST /api/events/:eventId/messages/:messageId/task ──────────────────────
router.post('/:messageId/task', authenticate, async (req, res, next) => {
  try {
    await guard(req, res);
    const { userId, tenantId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    const { title, description, assignedTo, dueDate } = req.body;

    const task = await svc.createTaskFromMessage({
      eventId:    req.params.eventId,
      tenantId,
      messageId:  req.params.messageId,
      title,
      description,
      assignedTo,
      dueDate,
      createdBy:  userId,
    });

    return R.created(res, task, 'Task created from message');
  } catch (err) { next(err); }
});

// ─── POST /api/events/:eventId/typing ────────────────────────────────────────
router.post('/typing', authenticate, async (req, res, next) => {
  try {
    const { userId, role } = req.user;
    const name = req.user.name || req.user.email;
    svc.setTyping({ channelId: req.params.eventId, userId, name, role });
    return R.ok(res, null, 'ok');
  } catch (err) { next(err); }
});

// ─── GET /api/events/:eventId/typing ─────────────────────────────────────────
router.get('/typing', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.user;
    const typingUsers = svc.getTyping({ channelId: req.params.eventId, userId });
    return R.ok(res, { typingUsers });
  } catch (err) { next(err); }
});

// ─── PATCH /api/events/:eventId/read ─────────────────────────────────────────
router.patch('/read', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.user;
    await svc.markChannelRead({ userId, channelId: req.params.eventId });
    return R.ok(res, null, 'Marked as read');
  } catch (err) { next(err); }
});

module.exports = { router, channelsRouter };
