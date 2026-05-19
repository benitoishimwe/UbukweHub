'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole, Roles } = require('../middleware/rbac');
const { ok, created, badRequest } = require('../utils/response');
const tenantService = require('../services/tenant.service');

const router = express.Router();

// All tenant routes require authentication and super_admin role unless noted.
const isSuperAdmin = [authenticate, requireRole(Roles.SUPER_ADMIN)];

// ─── GET /api/tenants/stats/platform ─────────────────────────────────────────
// Must be declared before /:tenantId to avoid 'stats' being treated as an ID.
router.get('/stats/platform', ...isSuperAdmin, async (req, res, next) => {
  try {
    const stats = await tenantService.getPlatformStats();
    return ok(res, stats);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/tenants ─────────────────────────────────────────────────────────
// List all tenants with pagination and optional search.
router.get('/', ...isSuperAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size, 10) || 20));
    const search = req.query.search?.trim() || undefined;

    const result = await tenantService.listAllTenants({ page, size, search });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/tenants ────────────────────────────────────────────────────────
// Create a new tenant.
router.post('/', ...isSuperAdmin, async (req, res, next) => {
  try {
    const { name, slug, subdomain, primaryColor } = req.body;

    if (!name || !slug) {
      return badRequest(res, 'name and slug are required');
    }

    const tenant = await tenantService.createTenant({ name, slug, subdomain, primaryColor });
    return created(res, tenant, 'Tenant created successfully');
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/tenants/:tenantId ───────────────────────────────────────────────
// Get a single tenant by ID.
router.get('/:tenantId', ...isSuperAdmin, async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenantById(req.params.tenantId);
    return ok(res, tenant);
  } catch (err) {
    return next(err);
  }
});

// ─── PATCH /api/tenants/:tenantId ─────────────────────────────────────────────
// Update tenant fields.
router.patch('/:tenantId', ...isSuperAdmin, async (req, res, next) => {
  try {
    const { name, slug, subdomain, primaryColor, isActive } = req.body;

    // Build updates object with only provided fields
    const updates = {};
    if (name !== undefined) updates.name = name;
    if (slug !== undefined) updates.slug = slug;
    if (subdomain !== undefined) updates.subdomain = subdomain;
    if (primaryColor !== undefined) updates.primaryColor = primaryColor;
    if (isActive !== undefined) updates.isActive = isActive;

    if (Object.keys(updates).length === 0) {
      return badRequest(res, 'No updatable fields provided');
    }

    const tenant = await tenantService.updateTenant(req.params.tenantId, updates);
    return ok(res, tenant, 'Tenant updated successfully');
  } catch (err) {
    return next(err);
  }
});

// ─── DELETE /api/tenants/:tenantId/deactivate ─────────────────────────────────
// Deactivate a tenant (soft delete).
router.delete('/:tenantId/deactivate', ...isSuperAdmin, async (req, res, next) => {
  try {
    const tenant = await tenantService.deactivateTenant(req.params.tenantId);
    return ok(res, tenant, 'Tenant deactivated successfully');
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/tenants/:tenantId/users ─────────────────────────────────────────
// List paginated users for a tenant.
router.get('/:tenantId/users', ...isSuperAdmin, async (req, res, next) => {
  try {
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const size = Math.min(100, Math.max(1, parseInt(req.query.size, 10) || 20));

    const result = await tenantService.listTenantUsers(req.params.tenantId, { page, size });
    return ok(res, result);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/tenants/:tenantId/users ────────────────────────────────────────
// Create a tenant_admin user for the specified tenant.
router.post('/:tenantId/users', ...isSuperAdmin, async (req, res, next) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password || !name) {
      return badRequest(res, 'email, password, and name are required');
    }

    if (password.length < 8) {
      return badRequest(res, 'password must be at least 8 characters long');
    }

    const user = await tenantService.createTenantAdmin({
      tenantId: req.params.tenantId,
      email,
      password,
      name,
    });

    return created(res, user, 'Tenant admin created successfully');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
