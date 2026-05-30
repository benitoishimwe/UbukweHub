'use strict';

const { Router } = require('express');
const eventService = require('../services/event.service');
const { authenticate } = require('../middleware/auth');
const { requireRole, Roles } = require('../middleware/rbac');
const R = require('../utils/response');
const prisma = require('../config/prisma');
const emailService = require('../services/email.service');
const config = require('../config/env');

const router = Router();

// ─── GET / — list events ──────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const { status, eventTypeSlug, search, page, size } = req.query;

    // Clients only see their own events (linked by clientId)
    const clientId = req.user.role === Roles.CLIENT ? req.user.userId : undefined;

    // Event managers only see events they created
    const createdBy = req.user.role === Roles.EVENT_MANAGER ? req.user.userId : undefined;

    const result = await eventService.listEvents({
      tenantId,
      clientId,
      createdBy,
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
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN, Roles.EVENT_MANAGER, Roles.CLIENT),
  async (req, res, next) => {
    try {
      const isClient = req.user.role === Roles.CLIENT;
      const tenantId = req.user.tenantId;

      // Clients are self-serve and have no tenant; all other roles require one
      if (!tenantId && !isClient) return R.badRequest(res, 'Tenant context required');

      const { name, eventDate, venue, eventTypeSlug, budget, guestCount, notes } = req.body;
      if (!name) return R.badRequest(res, 'Event name is required');
      const clientId   = isClient ? req.user.userId   : (req.body.clientId   || null);
      const clientName = isClient ? req.user.name     : (req.body.clientName || null);

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
        createdBy: req.user.userId,
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
    const createdBy = req.user.role === Roles.EVENT_MANAGER ? req.user.userId : undefined;
    const stats = await eventService.getEventStats(tenantId, createdBy);
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

// ─── GET /tasks/assigned-to-me — tasks assigned to current user ──────────────
// NOTE: declared before /:eventId to avoid "tasks" being treated as an eventId
// Uses raw SQL to avoid UUID vs TEXT type mismatch on assigned_to column
router.get('/tasks/assigned-to-me', authenticate, async (req, res, next) => {
  try {
    const { userId, tenantId } = req.user;

    const rows = await prisma.$queryRawUnsafe(
      `SELECT
         et.task_id       AS "taskId",
         et.event_id      AS "eventId",
         et.tenant_id     AS "tenantId",
         et.title,
         et.description,
         et.category,
         et.due_date      AS "dueDate",
         et.assigned_to   AS "assignedTo",
         et.status,
         et.priority,
         et.created_at    AS "createdAt",
         et.updated_at    AS "updatedAt",
         e.event_id       AS "event_eventId",
         e.name           AS "event_name",
         e.event_date     AS "event_eventDate",
         e.venue          AS "event_venue"
       FROM event_tasks et
       LEFT JOIN events e ON e.event_id::text = et.event_id::text
       WHERE et.assigned_to::text = $1
       ${tenantId ? 'AND et.tenant_id::text = $2' : ''}
       ORDER BY et.status ASC, et.due_date ASC NULLS LAST, et.created_at DESC
       LIMIT 30`,
      ...(tenantId ? [userId, tenantId] : [userId])
    );

    const tasks = rows.map((r) => ({
      taskId:      r.taskId,
      eventId:     r.eventId,
      tenantId:    r.tenantId,
      title:       r.title,
      description: r.description,
      category:    r.category,
      dueDate:     r.dueDate,
      assignedTo:  r.assignedTo,
      status:      r.status,
      priority:    r.priority,
      createdAt:   r.createdAt,
      updatedAt:   r.updatedAt,
      event: r.event_eventId ? {
        eventId:   r.event_eventId,
        name:      r.event_name,
        eventDate: r.event_eventDate,
        venue:     r.event_venue,
      } : null,
    }));

    return R.ok(res, { tasks });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /tasks/:taskId/status — update task status ────────────────────────
router.patch('/tasks/:taskId/status', authenticate, async (req, res, next) => {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const { userId, tenantId, role } = req.user;

    const VALID = ['todo', 'in_progress', 'done'];
    if (!VALID.includes(status)) return R.badRequest(res, `Status must be one of: ${VALID.join(', ')}`);

    const where = { taskId };
    if (tenantId) where.tenantId = tenantId;
    if (role === Roles.STAFF) where.assignedTo = userId;

    const task = await prisma.eventTask.findFirst({ where });
    if (!task) return R.notFound(res, 'Task not found');

    const updated = await prisma.eventTask.update({
      where: { taskId },
      data: { status },
    });
    return R.ok(res, updated, 'Task status updated');
  } catch (err) {
    next(err);
  }
});

// ─── POST /tasks/:taskId/assign — assign task to a staff member ───────────────
router.post(
  '/tasks/:taskId/assign',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN, Roles.EVENT_MANAGER),
  async (req, res, next) => {
    try {
      const { taskId } = req.params;
      const { assigneeId } = req.body;
      const { tenantId } = req.user;

      if (!assigneeId) return R.badRequest(res, 'assigneeId is required');

      const task = await prisma.eventTask.findFirst({
        where: { taskId, ...(tenantId ? { tenantId } : {}) },
        include: { event: { select: { eventId: true, name: true } } },
      });
      if (!task) return R.notFound(res, 'Task not found');

      const assignee = await prisma.user.findFirst({
        where: { userId: assigneeId, ...(tenantId ? { tenantId } : {}) },
        select: { userId: true, email: true, name: true },
      });
      if (!assignee) return R.notFound(res, 'Assignee not found in this tenant');

      let updated;
      try {
        updated = await prisma.eventTask.update({
          where: { taskId },
          data: { assignedTo: assigneeId, assignedAt: new Date(), status: task.status === 'done' ? 'todo' : task.status },
          include: { event: { select: { eventId: true, name: true } } },
        });
      } catch (assignErr) {
        // assigned_at column may not exist yet — fall back without it
        if (assignErr.code === 'P2009' || assignErr.message?.includes('assignedAt') || assignErr.message?.includes('assigned_at')) {
          updated = await prisma.eventTask.update({
            where: { taskId },
            data: { assignedTo: assigneeId, status: task.status === 'done' ? 'todo' : task.status },
            include: { event: { select: { eventId: true, name: true } } },
          });
        } else {
          throw assignErr;
        }
      }

      // Create in-app notification
      await prisma.notification.create({
        data: {
          userId: assigneeId,
          tenantId: task.tenantId,
          type: 'task_assigned',
          title: `New task: ${task.title}`,
          body: task.event?.name ? `For event: ${task.event.name}` : null,
          resourceId: taskId,
          resourceType: 'event_task',
        },
      });

      // Send email notification (best-effort, never blocks the response)
      emailService.sendTaskAssigned(
        assignee.email,
        assignee.name,
        task.title,
        task.event?.name || null,
        `${config.frontendUrl}/dashboard`,
      ).catch((e) => console.warn('[assign-task] email failed:', e.message));

      return R.ok(res, { ...updated, assigneeName: assignee.name }, 'Task assigned successfully');
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /:eventId — get event ────────────────────────────────────────────────
router.get('/:eventId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const clientId = req.user.role === Roles.CLIENT ? req.user.userId : undefined;
    const event = await eventService.getEventById(req.params.eventId, tenantId, clientId);
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
