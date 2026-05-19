'use strict';

const { Router } = require('express');
const staffService = require('../services/staff.service');
const { authenticate } = require('../middleware/auth');
const { requireRole, Roles } = require('../middleware/rbac');
const R = require('../utils/response');

const router = Router();

// ─── GET /schedule — get schedule (date range) ───────────────────────────────
// NOTE: must be declared BEFORE /:staffId to avoid matching "schedule" as a staffId
router.get('/schedule', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const { from, to } = req.query;

    const schedule = await staffService.getSchedule(tenantId, {
      from: from || undefined,
      to: to || undefined,
    });

    return R.ok(res, schedule);
  } catch (err) {
    next(err);
  }
});

// ─── GET /shifts/all — list all shifts for tenant ────────────────────────────
// NOTE: declared before /shifts (POST) and /:staffId to avoid param collision
router.get('/shifts/all', authenticate, async (req, res, next) => {
  try {
    const prisma = require('../config/prisma');
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const where = tenantId ? { tenantId } : {};
    const { date, eventId } = req.query;
    if (date) where.date = { gte: new Date(date) };
    if (eventId) where.eventId = eventId;

    const shifts = await prisma.shift.findMany({
      where,
      orderBy: { date: 'asc' },
      take: 100,
    });
    return R.ok(res, { shifts });
  } catch (err) {
    next(err);
  }
});

// ─── POST /shifts — create shift ─────────────────────────────────────────────
// NOTE: declared before /:staffId/shifts to avoid param collision
router.post(
  '/shifts',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) return R.badRequest(res, 'Tenant context required');

      const { eventId, staffId, staffName, role, date, startTime, endTime, tasks } = req.body;
      if (!date) return R.badRequest(res, 'Shift date is required');

      const shift = await staffService.createShift({
        tenantId,
        eventId,
        staffId,
        staffName,
        role,
        date,
        startTime,
        endTime,
        tasks,
      });

      return R.created(res, shift, 'Shift created successfully');
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /shifts/:shiftId — update shift ───────────────────────────────────
router.patch('/shifts/:shiftId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const shift = await staffService.updateShift(req.params.shiftId, tenantId, req.body);
    return R.ok(res, shift, 'Shift updated successfully');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /shifts/:shiftId — delete shift ──────────────────────────────────
router.delete(
  '/shifts/:shiftId',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
      await staffService.deleteShift(req.params.shiftId, tenantId);
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /events/:eventId/shifts — shifts for event ──────────────────────────
router.get('/events/:eventId/shifts', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const shifts = await staffService.getShiftsByEvent(req.params.eventId, tenantId);
    return R.ok(res, shifts);
  } catch (err) {
    next(err);
  }
});

// ─── GET /me/shifts — today & upcoming shifts for logged-in staff ─────────────
// NOTE: must be declared BEFORE /:staffId to avoid "me" being treated as a staffId
router.get('/me/shifts', authenticate, async (req, res, next) => {
  try {
    const { userId, tenantId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    const data = await staffService.getMyShifts(userId, tenantId);
    return R.ok(res, data);
  } catch (err) {
    next(err);
  }
});

// ─── GET /me/tasks — tasks assigned to logged-in staff ────────────────────────
router.get('/me/tasks', authenticate, async (req, res, next) => {
  try {
    const { userId, tenantId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    const tasks = await staffService.getMyTasks(userId, tenantId);
    return R.ok(res, { tasks });
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /me/tasks/:taskId — update task status ─────────────────────────────
router.patch('/me/tasks/:taskId', authenticate, async (req, res, next) => {
  try {
    const { userId, tenantId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    const { status } = req.body;
    if (!status) return R.badRequest(res, 'Status is required');
    const task = await staffService.updateMyTask(req.params.taskId, userId, tenantId, status);
    return R.ok(res, task, 'Task updated');
  } catch (err) {
    next(err);
  }
});

// ─── GET /me/recent-transactions — recent transactions by logged-in staff ─────
router.get('/me/recent-transactions', authenticate, async (req, res, next) => {
  try {
    const { userId, tenantId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');
    const transactions = await staffService.getMyRecentTransactions(userId, tenantId);
    return R.ok(res, { transactions });
  } catch (err) {
    next(err);
  }
});

// ─── GET / — list staff ───────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const { search, page, size } = req.query;

    const result = await staffService.listStaff({
      tenantId,
      search: search || undefined,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 20,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:staffId — get staff member ────────────────────────────────────────
router.get('/:staffId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const staff = await staffService.getStaffById(req.params.staffId, tenantId);
    return R.ok(res, staff);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:staffId/profile — update staff profile ──────────────────────────
router.patch('/:staffId/profile', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const { name, skills, certifications, availability } = req.body;

    const staff = await staffService.updateStaffProfile(req.params.staffId, tenantId, {
      name,
      skills,
      certifications,
      availability,
    });

    return R.ok(res, staff, 'Staff profile updated successfully');
  } catch (err) {
    next(err);
  }
});

// ─── GET /:staffId/shifts — list shifts for staff member ─────────────────────
router.get('/:staffId/shifts', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const { eventId, date } = req.query;

    const shifts = await staffService.getStaffShifts(req.params.staffId, tenantId, {
      eventId: eventId || undefined,
      date: date || undefined,
    });

    return R.ok(res, shifts);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
