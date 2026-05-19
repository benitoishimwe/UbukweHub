'use strict';

const { Router } = require('express');
const eventService = require('../services/event.service');
const { authenticate } = require('../middleware/auth');
const { requireRole, Roles } = require('../middleware/rbac');
const R = require('../utils/response');

const router = Router();

// ─── GET / — list events ──────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const { status, eventTypeSlug, search, page, size } = req.query;

    const result = await eventService.listEvents({
      tenantId,
      status: status || undefined,
      eventTypeSlug: eventTypeSlug || undefined,
      search: search || undefined,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 20,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST / — create event ────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN, Roles.EVENT_MANAGER),
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) return R.badRequest(res, 'Tenant context required');

      const { name, eventDate, venue, clientId, clientName, eventTypeSlug, budget, guestCount, notes } = req.body;
      if (!name) return R.badRequest(res, 'Event name is required');

      const event = await eventService.createEvent({
        tenantId,
        name,
        eventDate,
        venue,
        clientId,
        clientName,
        eventTypeSlug,
        budget,
        guestCount,
        notes,
      });

      return R.created(res, event, 'Event created successfully');
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /stats — event stats ─────────────────────────────────────────────────
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const stats = await eventService.getEventStats(tenantId);
    return R.ok(res, stats);
  } catch (err) {
    next(err);
  }
});

// ─── GET /types — list event types ───────────────────────────────────────────
router.get('/types', authenticate, async (req, res, next) => {
  try {
    const types = await eventService.getEventTypes();
    return R.ok(res, types);
  } catch (err) {
    next(err);
  }
});

// ─── GET /types/:slug — get event type template ───────────────────────────────
router.get('/types/:slug', authenticate, async (req, res, next) => {
  try {
    const template = await eventService.getEventTemplate(req.params.slug);
    return R.ok(res, template);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:eventId — get event ────────────────────────────────────────────────
router.get('/:eventId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const event = await eventService.getEventById(req.params.eventId, tenantId);
    return R.ok(res, event);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:eventId — update event ──────────────────────────────────────────
router.patch('/:eventId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const event = await eventService.updateEvent(req.params.eventId, tenantId, req.body);
    return R.ok(res, event, 'Event updated successfully');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:eventId — delete event ─────────────────────────────────────────
router.delete(
  '/:eventId',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
      await eventService.deleteEvent(req.params.eventId, tenantId);
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /:eventId/tasks — list tasks ────────────────────────────────────────
router.get('/:eventId/tasks', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const tasks = await eventService.listEventTasks(req.params.eventId, tenantId, req.query.status || undefined);
    return R.ok(res, tasks);
  } catch (err) {
    next(err);
  }
});

// ─── POST /:eventId/tasks — create task ──────────────────────────────────────
router.post('/:eventId/tasks', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const { title, description, category, dueDate, assignedTo, priority } = req.body;
    if (!title) return R.badRequest(res, 'Task title is required');

    const task = await eventService.createTask({
      eventId: req.params.eventId,
      tenantId,
      title,
      description,
      category,
      dueDate,
      assignedTo,
      priority,
      createdBy: req.user.userId,
    });

    return R.created(res, task, 'Task created successfully');
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:eventId/tasks/:taskId — update task ─────────────────────────────
router.patch('/:eventId/tasks/:taskId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const task = await eventService.updateTask(req.params.taskId, tenantId, req.body);
    return R.ok(res, task, 'Task updated successfully');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:eventId/tasks/:taskId — delete task ────────────────────────────
router.delete('/:eventId/tasks/:taskId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    await eventService.deleteTask(req.params.taskId, tenantId);
    return res.status(204).end();
  } catch (err) {
    next(err);
  }
});

// ─── GET /:eventId/report — download PDF report ──────────────────────────────
router.get('/:eventId/report', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const buffer = await eventService.generateEventPdf(req.params.eventId, tenantId);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="event-report.pdf"');
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
