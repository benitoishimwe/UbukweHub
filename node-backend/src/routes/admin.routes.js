'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { authenticate } = require('../middleware/auth');
const { requireRole, Roles } = require('../middleware/rbac');
const { ok, badRequest, notFound } = require('../utils/response');
const adminService = require('../services/admin.service');
const impersonationService = require('../services/impersonation.service');
const prisma = require('../config/prisma');

const router = express.Router();

// Both super_admin and tenant_admin may access admin routes.
// Individual handlers further restrict by role where necessary.
const isAdmin = [authenticate, requireRole(Roles.SUPER_ADMIN, Roles.TENANT_ADMIN)];

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// super_admin: list all users platform-wide.
// tenant_admin: list users scoped to their own tenant.
router.get('/users', ...isAdmin, async (req, res, next) => {
  try {
    const { role: callerRole, tenantId: callerTenantId } = req.user;

    // tenant_admin is always scoped to their own tenant regardless of query param
    const tenantId =
      callerRole === Roles.SUPER_ADMIN
        ? req.query.tenantId?.trim() || undefined
        : callerTenantId;

    const role = req.query.role?.trim() || undefined;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size, 10) || 20));

    const result = await adminService.listUsers({ tenantId, role, page, size });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/admin/users/:userId ─────────────────────────────────────────────
// Get a single user by ID.
router.get('/users/:userId', ...isAdmin, async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.userId);
    return ok(res, user);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/admin/users/:userId/deactivate ─────────────────────────────────
// Deactivate a user account.
router.post('/users/:userId/deactivate', ...isAdmin, async (req, res, next) => {
  try {
    const user = await adminService.deactivateUser(req.params.userId);
    return ok(res, user, 'User has been deactivated');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/admin/users/:userId/impersonate ────────────────────────────────
// super_admin only: issue a short-lived impersonation token for the target user.
router.post(
  '/users/:userId/impersonate',
  authenticate,
  requireRole(Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const result = await impersonationService.impersonate({
        targetUserId: req.params.userId,
        superAdminId: req.user.userId,
        superAdminEmail: req.user.email,
      });

      return ok(res, result, 'Impersonation token issued');
    } catch (err) {
      return next(err);
    }
  }
);

// ─── POST /api/admin/users ────────────────────────────────────────────────────
// Create a new user scoped to the tenant-admin's tenant.
router.post('/users', ...isAdmin, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !name) return badRequest(res, 'name and email are required');

    const tenantId =
      req.user.role === Roles.SUPER_ADMIN
        ? req.body.tenantId || req.user.tenantId
        : req.user.tenantId;

    if (!tenantId) return badRequest(res, 'Tenant context required');

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return res.status(409).json({ error: 'CONFLICT', message: 'A user with this email already exists', detail: 'EMAIL_TAKEN' });

    const passwordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash(Math.random().toString(36).slice(-12), 10);
    const mappedRole = role === 'admin' ? 'tenant_admin' : (role || 'staff');

    const user = await prisma.user.create({
      data: { email: email.toLowerCase().trim(), name, passwordHash, role: mappedRole, tenantId, isActive: true },
      select: { userId: true, email: true, name: true, role: true, isActive: true, tenantId: true, createdAt: true },
    });

    return res.status(201).json({ data: user, message: 'User created successfully' });
  } catch (err) {
    return next(err);
  }
});

// ─── PUT /api/admin/users/:userId ─────────────────────────────────────────────
// Update a user's profile or role.
router.put('/users/:userId', ...isAdmin, async (req, res, next) => {
  try {
    const { name, role, skills, availability, certifications } = req.body;
    const mappedRole = role === 'admin' ? 'tenant_admin' : role;

    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (mappedRole !== undefined) updateData.role = mappedRole;
    if (skills !== undefined) updateData.skills = skills;
    if (availability !== undefined) updateData.availability = availability;
    if (certifications !== undefined) updateData.certifications = certifications;

    const user = await prisma.user.update({
      where: { userId: req.params.userId },
      data: updateData,
      select: { userId: true, email: true, name: true, role: true, isActive: true, skills: true, availability: true, tenantId: true, updatedAt: true },
    });

    return ok(res, user, 'User updated successfully');
  } catch (err) {
    if (err.code === 'P2025') return notFound(res, 'User not found');
    return next(err);
  }
});

// ─── DELETE /api/admin/users/:userId ──────────────────────────────────────────
// Soft-delete (deactivate) a user.
router.delete('/users/:userId', ...isAdmin, async (req, res, next) => {
  try {
    await adminService.deactivateUser(req.params.userId);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
// Return counts for the tenant admin's dashboard.
router.get('/stats', ...isAdmin, async (req, res, next) => {
  try {
    const { role: callerRole, tenantId: callerTenantId } = req.user;
    const tenantId = callerRole === Roles.SUPER_ADMIN ? req.query.tenantId?.trim() || undefined : callerTenantId;
    const tf = tenantId ? { tenantId } : {};

    const [users, events, inventory, transactions, vendors] = await Promise.all([
      prisma.user.count({ where: tf }),
      prisma.event.count({ where: tf }),
      prisma.inventoryItem.count({ where: { ...tf, isActive: true } }),
      prisma.transaction.count({ where: tf }),
      prisma.vendor.count({ where: { ...tf, isActive: true } }),
    ]);

    return ok(res, { total_users: users, total_events: events, total_inventory: inventory, total_transactions: transactions, total_vendors: vendors });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/admin/sessions ──────────────────────────────────────────────────
router.get('/sessions', ...isAdmin, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? undefined : req.user.tenantId;
    const where = tenantId ? { user: { tenantId } } : {};
    const sessions = await prisma.userSession.findMany({
      where: { expiresAt: { gt: new Date() }, ...where },
      select: { sessionId: true, userId: true, expiresAt: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return ok(res, { sessions });
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/admin/audit-logs ────────────────────────────────────────────────
// List audit logs with optional filters. Paginated.
router.get('/audit-logs', ...isAdmin, async (req, res, next) => {
  try {
    const { action, resource } = req.query;
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size, 10) || 20));

    // tenant_admin may only query their own tenant's logs; userId filter optional
    const userId = req.query.userId?.trim() || undefined;

    const result = await adminService.getAuditLogs({
      userId,
      action: action?.trim() || undefined,
      resource: resource?.trim() || undefined,
      page,
      size,
    });

    return ok(res, result);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
// Dashboard stats scoped by tenant (tenant_admin) or platform-wide (super_admin).
router.get('/dashboard', ...isAdmin, async (req, res, next) => {
  try {
    const { role: callerRole, tenantId: callerTenantId } = req.user;

    // tenant_admin always scoped to their tenant; super_admin may scope via query param
    const tenantId =
      callerRole === Roles.SUPER_ADMIN
        ? req.query.tenantId?.trim() || undefined
        : callerTenantId;

    const stats = await adminService.getDashboardStats(tenantId);
    return ok(res, stats);
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
