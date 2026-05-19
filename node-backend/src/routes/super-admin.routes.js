'use strict';

/**
 * Super-admin routes — platform-wide management.
 * All routes require authentication and the super_admin role.
 *
 * Mounted at /api/super-admin  (filename: super-admin.routes.js)
 *
 * Response convention: payload is returned directly (no { data: } envelope)
 * so that axios .data destructuring in the frontend resolves immediately.
 */

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const { requireRole, Roles } = require('../middleware/rbac');
const prisma = require('../config/prisma');
const { createImpersonationToken } = require('../utils/jwt');
const { log: auditLog, AuditAction, AuditResource } = require('../services/audit.service');
const tenantService = require('../services/tenant.service');
const adminService = require('../services/admin.service');

const router = Router();

router.use(authenticate);
router.use(requireRole(Roles.SUPER_ADMIN));

// ── Plan catalogue ────────────────────────────────────────────────────────────

const PLANS = [
  {
    id: 'free',
    name: 'Free',
    description: 'Get started at no cost',
    price: 0,
    currency: 'USD',
    features: ['1 event', '2 staff', 'Basic reports'],
  },
  {
    id: 'trial',
    name: 'Trial',
    description: '14-day full-access trial',
    price: 0,
    currency: 'USD',
    features: ['All Pro features', '14 days free', 'No credit card required'],
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing businesses',
    price: 79,
    currency: 'USD',
    features: ['Unlimited events', 'Unlimited staff', 'AI assistant', 'Priority support'],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'Custom solutions for large organisations',
    price: null,
    currency: 'USD',
    features: ['Everything in Pro', 'Custom branding', 'Dedicated account manager', 'SLA'],
  },
];

const VALID_PLAN_IDS = PLANS.map((p) => p.id);

/** Clamp page to a minimum of 1 so skip never goes negative. */
function safePage(raw) {
  const n = parseInt(raw, 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

/** Accept both camelCase and snake_case field names for the plan value. */
function extractPlan(body) {
  const raw = body.plan ?? body.subscription_tier ?? 'free';
  return String(raw).toLowerCase();
}

// ── Plans catalogue ───────────────────────────────────────────────────────────

/**
 * GET /api/super-admin/plans
 */
router.get('/plans', (_req, res) => {
  res.json(PLANS);
});

// ── Dashboard / Platform stats ────────────────────────────────────────────────

/**
 * GET /api/super-admin/dashboard
 */
router.get('/dashboard', async (req, res, next) => {
  try {
    const [platformStats, dashboardStats] = await Promise.all([
      tenantService.getPlatformStats(),
      adminService.getDashboardStats(),
    ]);
    res.json(_toSnakeStats({ ...platformStats, ...dashboardStats }));
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/super-admin/stats  (backwards-compat alias for /dashboard)
 */
router.get('/stats', async (req, res, next) => {
  try {
    const stats = await tenantService.getPlatformStats();
    res.json(_toSnakeStats(stats));
  } catch (err) {
    next(err);
  }
});

// ── Tenant management ─────────────────────────────────────────────────────────

/**
 * GET /api/super-admin/tenants
 */
router.get('/tenants', async (req, res, next) => {
  try {
    const { page, size = 20, search } = req.query;
    const result = await tenantService.listAllTenants({
      page: safePage(page),
      size: Math.max(1, +size || 20),
      search,
    });
    res.json(result);
  } catch (err) {
    console.error('[GET /super-admin/tenants] error:', err);
    next(err);
  }
});

/**
 * POST /api/super-admin/tenants
 *
 * Accepts: { name, slug, subdomain?, plan?, subscription_tier?, primary_color?, primaryColor? }
 */
router.post('/tenants', async (req, res, next) => {
  try {
    const { name, slug, subdomain, primary_color, primaryColor } = req.body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'name is required' });
    }
    if (!slug || typeof slug !== 'string' || !slug.trim()) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: 'slug is required' });
    }

    const normalizedPlan = extractPlan(req.body);
    if (!VALID_PLAN_IDS.includes(normalizedPlan)) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `plan must be one of: ${VALID_PLAN_IDS.join(', ')}`,
      });
    }

    const tenant = await tenantService.createTenant({
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      subdomain: subdomain ? subdomain.trim().toLowerCase() : null,
      primaryColor: primary_color || primaryColor || null,
      plan: normalizedPlan,
    });

    auditLog({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: AuditAction.CREATE,
      resource: AuditResource.TENANT,
      resourceId: tenant.tenantId,
      details: { name: tenant.name, slug: tenant.slug, plan: normalizedPlan },
      ipAddress: req.ip,
    });

    res.status(201).json(tenant);
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/super-admin/tenants/:tenantId
 */
router.get('/tenants/:tenantId', async (req, res, next) => {
  try {
    const tenant = await tenantService.getTenantById(req.params.tenantId);
    res.json(tenant);
  } catch (err) {
    next(err);
  }
});

/**
 * PATCH /api/super-admin/tenants/:tenantId
 */
router.patch('/tenants/:tenantId', async (req, res, next) => {
  try {
    const updates = _buildTenantUpdates(req.body);
    if (updates._error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: updates._error });
    }

    const tenant = await tenantService.updateTenant(req.params.tenantId, updates);
    auditLog({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: AuditAction.UPDATE,
      resource: AuditResource.TENANT,
      resourceId: req.params.tenantId,
      details: updates,
      ipAddress: req.ip,
    });
    res.json(tenant);
  } catch (err) {
    next(err);
  }
});

/**
 * PUT /api/super-admin/tenants/:tenantId  (frontend uses PUT)
 */
router.put('/tenants/:tenantId', async (req, res, next) => {
  try {
    const updates = _buildTenantUpdates(req.body);
    if (updates._error) {
      return res.status(400).json({ error: 'VALIDATION_ERROR', message: updates._error });
    }

    const tenant = await tenantService.updateTenant(req.params.tenantId, updates);
    auditLog({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: AuditAction.UPDATE,
      resource: AuditResource.TENANT,
      resourceId: req.params.tenantId,
      details: updates,
      ipAddress: req.ip,
    });
    res.json(tenant);
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/super-admin/tenants/:tenantId
 * Soft-deletes (deactivates) the tenant.
 */
router.delete('/tenants/:tenantId', async (req, res, next) => {
  try {
    await tenantService.deactivateTenant(req.params.tenantId);
    auditLog({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: AuditAction.DELETE,
      resource: AuditResource.TENANT,
      resourceId: req.params.tenantId,
      details: { action: 'deactivate' },
      ipAddress: req.ip,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/super-admin/tenants/:tenantId/deactivate  (legacy path)
 */
router.delete('/tenants/:tenantId/deactivate', async (req, res, next) => {
  try {
    await tenantService.deactivateTenant(req.params.tenantId);
    auditLog({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: AuditAction.DELETE,
      resource: AuditResource.TENANT,
      resourceId: req.params.tenantId,
      details: { action: 'deactivate' },
      ipAddress: req.ip,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/super-admin/tenants/:tenantId/users
 */
router.get('/tenants/:tenantId/users', async (req, res, next) => {
  try {
    const result = await tenantService.listTenantUsers(req.params.tenantId, {
      page: safePage(req.query.page),
      size: Math.max(1, +req.query.size || 20),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/super-admin/tenants/:tenantId/users
 * POST /api/super-admin/tenants/:tenantId/admins  (kept for internal calls)
 *
 * Creates a tenant_admin user. Body: { email, password, name }
 */
async function _handleCreateTenantAdmin(req, res, next) {
  try {
    const { email, password, name } = req.body;
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: 'email, password, and name are required',
      });
    }

    const user = await tenantService.createTenantAdmin({
      tenantId: req.params.tenantId,
      email,
      password,
      name,
    });

    auditLog({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: AuditAction.CREATE,
      resource: AuditResource.USER,
      resourceId: user.userId,
      details: { role: 'tenant_admin', tenantId: req.params.tenantId, email: user.email },
      ipAddress: req.ip,
    });

    res.status(201).json(user);
  } catch (err) {
    next(err);
  }
}

router.post('/tenants/:tenantId/users', _handleCreateTenantAdmin);
router.post('/tenants/:tenantId/admins', _handleCreateTenantAdmin);

// ── User management ───────────────────────────────────────────────────────────

router.get('/users', async (req, res, next) => {
  try {
    const { page, size = 20, role, search, tenantId } = req.query;
    const result = await adminService.listUsers({
      tenantId,
      role,
      search,
      page: safePage(page),
      size: Math.max(1, +size || 20),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get('/users/:userId', async (req, res, next) => {
  try {
    const user = await adminService.getUserById(req.params.userId);
    res.json(user);
  } catch (err) {
    next(err);
  }
});

router.post('/users/:userId/deactivate', async (req, res, next) => {
  try {
    await adminService.deactivateUser(req.params.userId);
    auditLog({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: AuditAction.UPDATE,
      resource: AuditResource.USER,
      resourceId: req.params.userId,
      details: { action: 'deactivate' },
      ipAddress: req.ip,
    });
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post('/users/:userId/activate', async (req, res, next) => {
  try {
    const user = await prisma.user.update({
      where: { userId: req.params.userId },
      data: { isActive: true },
      select: { userId: true, email: true, name: true, role: true, isActive: true },
    });
    auditLog({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: AuditAction.UPDATE,
      resource: AuditResource.USER,
      resourceId: req.params.userId,
      details: { action: 'activate' },
      ipAddress: req.ip,
    });
    res.json(user);
  } catch (err) {
    next(err);
  }
});

// ── Impersonation ─────────────────────────────────────────────────────────────

async function _handleImpersonate(req, res, next) {
  try {
    const userId = req.params.userId;
    const target = await prisma.user.findUniqueOrThrow({
      where: { userId },
      select: { userId: true, email: true, role: true, tenantId: true, name: true, isActive: true },
    });

    if (!target.isActive) {
      return res.status(400).json({ error: 'INACTIVE_USER', message: 'Cannot impersonate an inactive user' });
    }
    if (target.role === Roles.SUPER_ADMIN) {
      return res.status(400).json({ error: 'FORBIDDEN', message: 'Cannot impersonate another super admin' });
    }

    const token = createImpersonationToken(
      target.userId,
      target.role,
      target.email,
      target.tenantId,
      req.user.email
    );

    auditLog({
      userId: req.user.userId,
      userEmail: req.user.email,
      action: AuditAction.IMPERSONATE,
      resource: AuditResource.USER,
      resourceId: target.userId,
      details: { targetEmail: target.email },
      ipAddress: req.ip,
    });

    res.json({ token, user: target });
  } catch (err) {
    next(err);
  }
}

/** Frontend calls POST /super-admin/impersonate/:userId */
router.post('/impersonate/:userId', _handleImpersonate);

/** Also keep the original nested path for direct API calls */
router.post('/users/:userId/impersonate', _handleImpersonate);

// ── Subscription management ───────────────────────────────────────────────────

router.get('/subscriptions', async (req, res, next) => {
  try {
    const page = safePage(req.query.page);
    const size = Math.max(1, +req.query.size || 20);
    const skip = (page - 1) * size;

    const [subscriptions, total] = await Promise.all([
      prisma.subscription.findMany({
        skip,
        take: size,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { email: true, name: true } } },
      }),
      prisma.subscription.count(),
    ]);
    res.json({ subscriptions, total, page, size });
  } catch (err) {
    next(err);
  }
});

router.patch('/subscriptions/:subscriptionId', async (req, res, next) => {
  try {
    const { plan, status } = req.body;

    if (plan && !VALID_PLAN_IDS.includes(plan.toLowerCase())) {
      return res.status(400).json({
        error: 'VALIDATION_ERROR',
        message: `plan must be one of: ${VALID_PLAN_IDS.join(', ')}`,
      });
    }

    const subscription = await prisma.subscription.update({
      where: { subscriptionId: req.params.subscriptionId },
      data: {
        ...(plan && { plan: plan.toLowerCase() }),
        ...(status && { status }),
      },
    });
    res.json(subscription);
  } catch (err) {
    next(err);
  }
});

// ── Audit logs ────────────────────────────────────────────────────────────────

router.get('/audit-logs', async (req, res, next) => {
  try {
    const { userId, action, resource } = req.query;
    const result = await adminService.getAuditLogs({
      userId,
      action,
      resource,
      page: safePage(req.query.page),
      size: Math.max(1, +req.query.size || 50),
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

// ── Feature flags ─────────────────────────────────────────────────────────────

router.get('/features', async (req, res, next) => {
  try {
    const features = await prisma.subscriptionFeature.findMany({
      orderBy: [{ plan: 'asc' }, { featureKey: 'asc' }],
    });
    res.json(features);
  } catch (err) {
    next(err);
  }
});

router.patch('/features/:featureId', async (req, res, next) => {
  try {
    const { isEnabled, limitValue } = req.body;
    const feature = await prisma.subscriptionFeature.update({
      where: { featureId: req.params.featureId },
      data: {
        ...(isEnabled !== undefined && { isEnabled }),
        ...(limitValue !== undefined && { limitValue }),
      },
    });
    res.json(feature);
  } catch (err) {
    next(err);
  }
});

// ── Internal helpers ──────────────────────────────────────────────────────────

/**
 * Convert all keys of a stats object to snake_case so the frontend
 * (which reads total_tenants, active_tenants, total_users) gets the right shape.
 * Non-scalar values (arrays, objects) are passed through as-is.
 */
function _toSnakeStats(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  const result = {};
  for (const [key, value] of Object.entries(obj)) {
    const snakeKey = key.replace(/([A-Z])/g, (c) => `_${c.toLowerCase()}`);
    result[snakeKey] = value;
  }
  return result;
}

/**
 * Build the DB update object for PATCH/PUT /tenants/:id.
 * Returns { _error: string } if validation fails.
 */
function _buildTenantUpdates(body) {
  const updates = { ...body };

  // Normalise plan → subscriptionTier
  const rawPlan = updates.plan ?? updates.subscription_tier;
  if (rawPlan !== undefined) {
    const normalizedPlan = String(rawPlan).toLowerCase();
    if (!VALID_PLAN_IDS.includes(normalizedPlan)) {
      return { _error: `plan must be one of: ${VALID_PLAN_IDS.join(', ')}` };
    }
    updates.subscriptionTier = normalizedPlan;
  }

  // Normalise primary_color → primaryColor
  if (updates.primary_color !== undefined) {
    updates.primaryColor = updates.primary_color;
    delete updates.primary_color;
  }

  // Remove fields that don't belong on the Tenant model
  delete updates.plan;
  delete updates.subscription_tier;
  delete updates._error;

  return updates;
}

module.exports = router;
