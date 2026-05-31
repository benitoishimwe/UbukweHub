'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const { authenticate } = require('../middleware/auth');
const { requireRole, Roles } = require('../middleware/rbac');
const { ok, badRequest, notFound } = require('../utils/response');
const adminService = require('../services/admin.service');
const impersonationService = require('../services/impersonation.service');
const invitationService = require('../services/invitation.service');
const emailService = require('../services/email.service');
const auditService = require('../services/audit.service');
const prisma = require('../config/prisma');

const router = express.Router();

// Both super_admin and tenant_admin may access admin routes.
// Individual handlers further restrict by role where necessary.
const isAdmin = [authenticate, requireRole(Roles.SUPER_ADMIN, Roles.TENANT_ADMIN)];

// event_manager on trial also gets access to user-management routes scoped to their tenant.
const isAdminOrManager = [authenticate, requireRole(Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.EVENT_MANAGER)];

// Roles that only super_admin / tenant_admin may assign — event_manager cannot elevate.
const MANAGER_FORBIDDEN_ROLES = ['tenant_admin', 'super_admin'];

// ─── GET /api/admin/users ─────────────────────────────────────────────────────
// super_admin: list all users platform-wide.
// tenant_admin / event_manager: list users scoped to their own tenant.
router.get('/users', ...isAdminOrManager, async (req, res, next) => {
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
router.get('/users/:userId', ...isAdminOrManager, async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.userId);
    return ok(res, user);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/admin/users/:userId/deactivate ─────────────────────────────────
router.post('/users/:userId/deactivate', ...isAdminOrManager, async (req, res, next) => {
  try {
    const user = await adminService.deactivateUser(req.params.userId);
    return ok(res, user, 'User has been deactivated');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/admin/users/:userId/activate ───────────────────────────────────
router.post('/users/:userId/activate', ...isAdminOrManager, async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { userId: req.params.userId },
      data: { isActive: true },
      select: { userId: true, email: true, name: true, role: true, isActive: true },
    });
    return ok(res, user, 'User has been activated');
  } catch (err) {
    if (err.code === 'P2025') return notFound(res, 'User not found');
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
// Create a new user scoped to the caller's tenant.
// event_manager may not assign tenant_admin or super_admin roles.
router.post('/users', ...isAdminOrManager, async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!email || !name) return badRequest(res, 'name and email are required');

    let tenantId =
      req.user.role === Roles.SUPER_ADMIN
        ? req.body.tenantId || req.user.tenantId
        : req.user.tenantId;

    // Standalone event_manager with no tenant yet: auto-provision a personal team tenant.
    if (!tenantId && req.user.role === Roles.EVENT_MANAGER) {
      const slug = `team-${req.user.userId.slice(0, 8)}`;
      const existing = await prisma.tenant.findUnique({ where: { slug } });
      const tenant = existing ?? await prisma.tenant.create({
        data: { name: req.user.name || req.user.email, slug, subscriptionTier: 'trial', subscriptionStatus: 'active' },
      });
      await prisma.user.update({ where: { userId: req.user.userId }, data: { tenantId: tenant.tenantId } });
      tenantId = tenant.tenantId;
    }

    if (!tenantId) return badRequest(res, 'Tenant context required');

    const mappedRole = role === 'admin' ? 'tenant_admin' : (role || 'staff');
    if (req.user.role === Roles.EVENT_MANAGER && MANAGER_FORBIDDEN_ROLES.includes(mappedRole)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Event managers cannot assign admin roles' });
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return res.status(409).json({ error: 'CONFLICT', message: 'A user with this email already exists', detail: 'EMAIL_TAKEN' });

    const passwordHash = password ? await bcrypt.hash(password, 10) : await bcrypt.hash(Math.random().toString(36).slice(-12), 10);

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
// When role is set to "vendor", auto-creates a Vendor record (if none exists for that email)
// so the vendor portal shows a usable profile immediately.
router.put('/users/:userId', ...isAdminOrManager, async (req, res, next) => {
  try {
    const { name, role, skills, availability, certifications, vendorCategory } = req.body;
    const mappedRole = role === 'admin' ? 'tenant_admin' : role;

    if (req.user.role === Roles.EVENT_MANAGER && mappedRole && MANAGER_FORBIDDEN_ROLES.includes(mappedRole)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Event managers cannot assign admin roles' });
    }

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

    // Auto-provision a Vendor record when role is set to "vendor"
    if (mappedRole === 'vendor' && user.email && user.tenantId) {
      const existing = await prisma.vendor.findFirst({
        where: { email: user.email, tenantId: user.tenantId },
      });
      if (!existing) {
        const vendor = await prisma.vendor.create({
          data: {
            tenantId: user.tenantId,
            name: user.name || user.email,
            category: vendorCategory || 'General',
            email: user.email,
            contactName: user.name || null,
          },
        });
        // Also create the marketplace profile record
        await prisma.vendorProfile.create({
          data: { tenantId: user.tenantId, vendorId: vendor.vendorId },
        });
      }
    }

    return ok(res, user, 'User updated successfully');
  } catch (err) {
    if (err.code === 'P2025') return notFound(res, 'User not found');
    return next(err);
  }
});

// ─── POST /api/admin/users/:userId/link-vendor ────────────────────────────────
// Explicitly link a user account to an existing Vendor record by setting the
// vendor's email to match the user's email.
router.post('/users/:userId/link-vendor', ...isAdmin, async (req, res, next) => {
  try {
    const { vendorId } = req.body;
    if (!vendorId) return badRequest(res, 'vendorId is required');

    const user = await prisma.user.findUnique({
      where: { userId: req.params.userId },
      select: { userId: true, email: true, tenantId: true, name: true },
    });
    if (!user) return notFound(res, 'User not found');

    const vendor = await prisma.vendor.findUnique({ where: { vendorId } });
    if (!vendor) return notFound(res, 'Vendor not found');
    if (vendor.tenantId !== user.tenantId) return badRequest(res, 'Vendor belongs to a different tenant');

    // Link by setting vendor email to user email
    await prisma.vendor.update({
      where: { vendorId },
      data: { email: user.email, contactName: vendor.contactName || user.name },
    });

    // Ensure vendor profile exists
    const profile = await prisma.vendorProfile.findUnique({ where: { vendorId } });
    if (!profile) {
      await prisma.vendorProfile.create({ data: { tenantId: vendor.tenantId, vendorId } });
    }

    // Make sure the user has the vendor role
    await prisma.user.update({ where: { userId: user.userId }, data: { role: 'vendor' } });

    return ok(res, { linked: true, vendorId }, 'User linked to vendor profile');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/admin/users/invite ─────────────────────────────────────────────
// Send an invitation email to a new user.
// Allowed for super_admin, tenant_admin, and standalone event_manager.
router.post('/users/invite', authenticate, requireRole(Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.EVENT_MANAGER), async (req, res, next) => {
  try {
    const { email, role, name } = req.body;
    if (!email || typeof email !== 'string' || !email.trim()) {
      return badRequest(res, 'email is required');
    }
    const VALID_ROLES = ['staff', 'event_manager', 'tenant_admin', 'vendor', 'client'];
    const assignedRole = role && VALID_ROLES.includes(role) ? role : 'staff';
    let tenantId = req.user.role === Roles.SUPER_ADMIN
      ? (req.body.tenantId || req.user.tenantId)
      : req.user.tenantId;

    // Standalone event_manager (no tenant yet): auto-provision a personal team tenant
    if (!tenantId && req.user.role === Roles.EVENT_MANAGER) {
      const slug = `team-${req.user.userId.slice(0, 8)}`;
      const existing = await prisma.tenant.findUnique({ where: { slug } });
      const tenant = existing ?? await prisma.tenant.create({
        data: {
          name: req.user.name || req.user.email,
          slug,
          subscriptionTier: 'trial',
          subscriptionStatus: 'active',
        },
      });
      await prisma.user.update({
        where: { userId: req.user.userId },
        data: { tenantId: tenant.tenantId },
      });
      tenantId = tenant.tenantId;
    }

    if (!tenantId) return badRequest(res, 'Tenant context required');

    const invitation = await invitationService.createInvitation({
      tenantId,
      email: email.trim().toLowerCase(),
      role: assignedRole,
      invitedBy: req.user.userId,
    });

    auditService.log({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: auditService.AuditAction.CREATE,
      resource: 'invitation',
      resourceId: invitation.invitationId,
      details: { inviteeEmail: email, role: assignedRole, name },
      ipAddress: req.ip,
    });

    return res.status(201).json({ data: invitation, message: 'Invitation sent successfully' });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/admin/users/:userId/resend-invite ───────────────────────────────
// Revoke the existing pending invitation (if any) and send a new one.
router.post('/users/:userId/resend-invite', authenticate, requireRole(Roles.SUPER_ADMIN, Roles.TENANT_ADMIN, Roles.EVENT_MANAGER), async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: req.params.userId },
      select: { userId: true, email: true, tenantId: true, name: true },
    });
    if (!user) return notFound(res, 'User not found');

    const tenantId = req.user.role === Roles.SUPER_ADMIN ? (user.tenantId || req.user.tenantId) : req.user.tenantId;

    // Revoke any existing pending invitation for this email+tenant
    const pending = await prisma.tenantInvitation.findFirst({
      where: { email: user.email, tenantId, acceptedAt: null, expiresAt: { gt: new Date() } },
    });
    if (pending) {
      await prisma.tenantInvitation.delete({ where: { invitationId: pending.invitationId } });
    }

    const invitation = await invitationService.createInvitation({
      tenantId,
      email: user.email,
      role: user.role || 'staff',
      invitedBy: req.user.userId,
    });

    return ok(res, invitation, 'Invitation resent successfully');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/admin/users/:userId/reset-password ─────────────────────────────
// Generate a temporary password, update the user, and email it to them.
router.post('/users/:userId/reset-password', ...isAdmin, async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { userId: req.params.userId },
      select: { userId: true, email: true, name: true, tenantId: true },
    });
    if (!user) return notFound(res, 'User not found');

    // Scope check: tenant_admin can only reset users in their own tenant
    if (req.user.role !== Roles.SUPER_ADMIN && user.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied' });
    }

    const tempPassword = randomUUID().replace(/-/g, '').slice(0, 12);
    const passwordHash = await bcrypt.hash(tempPassword, 10);

    await prisma.user.update({
      where: { userId: user.userId },
      data: { passwordHash },
    });

    // Send notification email (fire-and-forget)
    emailService.sendPasswordReset(user.email, user.name, tempPassword).catch((err) => {
      console.error('[admin] Failed to send password reset email:', err.message);
    });

    auditService.log({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: auditService.AuditAction.PASSWORD_CHANGE,
      resource: auditService.AuditResource.USER,
      resourceId: user.userId,
      details: { initiatedBy: 'admin', targetEmail: user.email },
      ipAddress: req.ip,
    });

    return ok(res, { email: user.email }, 'Temporary password sent to user\'s email');
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /api/admin/users/:userId/role ──────────────────────────────────────
// Change a user's role with audit logging.
router.patch('/users/:userId/role', ...isAdminOrManager, async (req, res, next) => {
  try {
    const { role } = req.body;
    const VALID_ROLES = ['staff', 'event_manager', 'tenant_admin', 'vendor', 'client'];
    if (!role || !VALID_ROLES.includes(role)) {
      return badRequest(res, `role must be one of: ${VALID_ROLES.join(', ')}`);
    }

    if (req.user.role === Roles.EVENT_MANAGER && MANAGER_FORBIDDEN_ROLES.includes(role)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Event managers cannot assign admin roles' });
    }

    const existing = await prisma.user.findUnique({
      where: { userId: req.params.userId },
      select: { userId: true, role: true, tenantId: true, email: true, name: true },
    });
    if (!existing) return notFound(res, 'User not found');
    if (req.user.role !== Roles.SUPER_ADMIN && existing.tenantId !== req.user.tenantId) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Access denied' });
    }

    const user = await prisma.user.update({
      where: { userId: req.params.userId },
      data: { role },
      select: { userId: true, email: true, name: true, role: true, isActive: true, tenantId: true },
    });

    auditService.log({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: auditService.AuditAction.UPDATE,
      resource: auditService.AuditResource.USER,
      resourceId: user.userId,
      details: { previousRole: existing.role, newRole: role, targetEmail: user.email },
      ipAddress: req.ip,
    });

    return ok(res, user, `Role updated to ${role}`);
  } catch (err) {
    if (err.code === 'P2025') return notFound(res, 'User not found');
    return next(err);
  }
});

// ─── DELETE /api/admin/users/:userId ──────────────────────────────────────────
// Soft-delete (deactivate) a user.
router.delete('/users/:userId', ...isAdminOrManager, async (req, res, next) => {
  try {
    await adminService.deactivateUser(req.params.userId);
    return res.status(204).end();
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/admin/stats ─────────────────────────────────────────────────────
// Return counts for the tenant admin's dashboard.
router.get('/stats', ...isAdminOrManager, async (req, res, next) => {
  try {
    const { role: callerRole, tenantId: callerTenantId } = req.user;
    const tenantId = callerRole === Roles.SUPER_ADMIN ? req.query.tenantId?.trim() || undefined : callerTenantId;
    const tf = tenantId ? { tenantId } : {};

    const [users, events, inventory, transactions, vendors, usersByRoleRaw] = await Promise.all([
      prisma.user.count({ where: { ...tf, isActive: true } }),
      prisma.event.count({ where: tf }),
      prisma.inventoryItem.count({ where: { ...tf, isActive: true } }),
      prisma.transaction.count({ where: tf }),
      prisma.vendor.count({ where: { ...tf, isActive: true } }),
      prisma.user.groupBy({ by: ['role'], where: { ...tf, isActive: true }, _count: { role: true } }),
    ]);

    const users_by_role = Object.fromEntries(usersByRoleRaw.map(r => [r.role, r._count.role]));

    return ok(res, { total_users: users, total_events: events, total_inventory: inventory, total_transactions: transactions, total_vendors: vendors, users_by_role });
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
router.get('/audit-logs', ...isAdminOrManager, async (req, res, next) => {
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

// ─── POST /api/admin/vendors/invite ──────────────────────────────────────────
// Tenant admin invites a vendor by email. A vendor must sign up themselves.
router.post('/vendors/invite', ...isAdmin, async (req, res, next) => {
  try {
    const { role: callerRole, tenantId: callerTenantId } = req.user;
    if (callerRole !== Roles.TENANT_ADMIN && callerRole !== Roles.SUPER_ADMIN) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const tenantId = callerRole === Roles.SUPER_ADMIN
      ? req.body.tenantId || callerTenantId
      : callerTenantId;

    if (!tenantId) return badRequest(res, 'Tenant context required');

    const { email, message } = req.body;
    if (!email) return badRequest(res, 'email is required');

    const invitation = await invitationService.createVendorInvitation({
      tenantId,
      email,
      invitedBy: req.user.userId,
      message: message || null,
    });

    return ok(res, invitation, 'Vendor invitation sent');
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/admin/vendors/search ───────────────────────────────────────────
// Search public marketplace vendors for connecting to events.
router.get('/vendors/search', ...isAdmin, async (req, res, next) => {
  try {
    const vendorService = require('../services/vendor.service');
    const { search, category, page, size } = req.query;
    const result = await vendorService.searchAvailableVendors({
      search: search || undefined,
      category: category || undefined,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 20,
    });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/admin/events/:eventId/vendors ───────────────────────────────────
// List vendors connected to an event.
router.get('/events/:eventId/vendors', ...isAdmin, async (req, res, next) => {
  try {
    const vendorService = require('../services/vendor.service');
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? undefined : req.user.tenantId;
    const vendors = await vendorService.getEventVendors(req.params.eventId, tenantId || req.user.tenantId);
    return ok(res, vendors);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/admin/events/:eventId/vendors/:vendorId ───────────────────────
// Connect a vendor to an event.
router.post('/events/:eventId/vendors/:vendorId', ...isAdmin, async (req, res, next) => {
  try {
    const vendorService = require('../services/vendor.service');
    const tenantId = req.user.tenantId;
    if (!tenantId) return badRequest(res, 'Tenant context required');
    const result = await vendorService.connectVendorToEvent(req.params.eventId, req.params.vendorId, tenantId);
    return ok(res, result, 'Vendor connected to event');
  } catch (err) {
    return next(err);
  }
});

// ─── DELETE /api/admin/events/:eventId/vendors/:vendorId ─────────────────────
// Disconnect a vendor from an event.
router.delete('/events/:eventId/vendors/:vendorId', ...isAdmin, async (req, res, next) => {
  try {
    const vendorService = require('../services/vendor.service');
    const tenantId = req.user.tenantId;
    if (!tenantId) return badRequest(res, 'Tenant context required');
    const result = await vendorService.disconnectVendorFromEvent(req.params.eventId, req.params.vendorId, tenantId);
    return ok(res, result, 'Vendor disconnected from event');
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/admin/dashboard ─────────────────────────────────────────────────
// Dashboard stats scoped by tenant (tenant_admin / event_manager) or platform-wide (super_admin).
router.get('/dashboard', ...isAdminOrManager, async (req, res, next) => {
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
