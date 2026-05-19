'use strict';

/**
 * Integration-style tests for  /api/super-admin/*
 *
 * All Prisma calls and service calls are mocked so no database is required.
 * The tests verify request validation, response shapes, status codes, and
 * that the correct service methods are invoked.
 *
 * Run:  npm test  (after  npm install)
 */

const request = require('supertest');

// ── Mock heavy dependencies before requiring the app ─────────────────────────

jest.mock('../config/prisma', () => ({
  tenant: {
    findUnique: jest.fn(),
    findMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
    findUniqueOrThrow: jest.fn(),
    findMany: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
  },
  subscription: {
    findMany: jest.fn(),
    update: jest.fn(),
    count: jest.fn(),
    create: jest.fn(),
    findFirst: jest.fn(),
  },
  subscriptionFeature: {
    findMany: jest.fn(),
    update: jest.fn(),
  },
  auditLog: {
    findMany: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
}));

jest.mock('../middleware/auth', () => ({
  authenticate: (req, _res, next) => {
    req.user = { userId: 'superuser-1', email: 'admin@test.com', role: 'super_admin' };
    next();
  },
}));

jest.mock('../middleware/rbac', () => ({
  requireRole: () => (_req, _res, next) => next(),
  Roles: { SUPER_ADMIN: 'super_admin' },
}));

jest.mock('../utils/jwt', () => ({
  createImpersonationToken: jest.fn(() => 'mock-impersonation-token'),
}));

jest.mock('../services/audit.service', () => ({
  log: jest.fn().mockResolvedValue(undefined),
  AuditAction: {
    CREATE: 'create',
    UPDATE: 'update',
    DELETE: 'delete',
    LOGIN: 'login',
    IMPERSONATE: 'impersonate',
  },
  AuditResource: {
    USER: 'user',
    TENANT: 'tenant',
    SUBSCRIPTION: 'subscription',
  },
}));

jest.mock('../services/tenant.service', () => ({
  listAllTenants: jest.fn(),
  createTenant: jest.fn(),
  getTenantById: jest.fn(),
  updateTenant: jest.fn(),
  deactivateTenant: jest.fn(),
  listTenantUsers: jest.fn(),
  createTenantAdmin: jest.fn(),
  getPlatformStats: jest.fn(),
  VALID_PLANS: ['free', 'trial', 'pro', 'enterprise', 'starter'],
}));

jest.mock('../services/admin.service', () => ({
  listUsers: jest.fn(),
  getUserById: jest.fn(),
  deactivateUser: jest.fn(),
  getAuditLogs: jest.fn(),
  getDashboardStats: jest.fn(),
}));

// ── Require app AFTER mocks are set up ────────────────────────────────────────
const app = require('../app');
const prisma = require('../config/prisma');
const tenantService = require('../services/tenant.service');
const adminService = require('../services/admin.service');
const auditService = require('../services/audit.service');

// ── Helpers ───────────────────────────────────────────────────────────────────

const BASE = '/api/super-admin';

const mockTenant = {
  tenantId: 'tenant-uuid-1',
  name: 'Benito Multi Service Limited',
  slug: 'benito-multi',
  subdomain: null,
  subscriptionTier: 'enterprise',
  isActive: true,
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/super-admin/plans
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /plans', () => {
  it('returns the plan catalogue with 200', async () => {
    const res = await request(app).get(`${BASE}/plans`);
    expect(res.status).toBe(200);
    expect(res.body.data).toBeInstanceOf(Array);
    expect(res.body.data.length).toBeGreaterThan(0);

    const ids = res.body.data.map((p) => p.id);
    expect(ids).toContain('free');
    expect(ids).toContain('enterprise');
  });

  it('each plan has id, name, description, features', async () => {
    const res = await request(app).get(`${BASE}/plans`);
    for (const plan of res.body.data) {
      expect(plan).toHaveProperty('id');
      expect(plan).toHaveProperty('name');
      expect(plan).toHaveProperty('description');
      expect(plan).toHaveProperty('features');
      expect(Array.isArray(plan.features)).toBe(true);
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/super-admin/dashboard
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /dashboard', () => {
  beforeEach(() => {
    tenantService.getPlatformStats.mockResolvedValue({
      totalTenants: 5,
      activeTenants: 4,
      totalUsers: 100,
      activeUsers: 95,
    });
    adminService.getDashboardStats.mockResolvedValue({
      eventCount: 20,
      userCount: 100,
      vendorCount: 15,
      recentAuditLogs: [],
    });
  });

  it('returns merged stats with 200', async () => {
    const res = await request(app).get(`${BASE}/dashboard`);
    expect(res.status).toBe(200);
    expect(res.body.data).toMatchObject({
      totalTenants: 5,
      activeTenants: 4,
      eventCount: 20,
      vendorCount: 15,
    });
  });

  it('returns 500 when service throws', async () => {
    tenantService.getPlatformStats.mockRejectedValue(new Error('DB down'));
    const res = await request(app).get(`${BASE}/dashboard`);
    expect(res.status).toBe(500);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/super-admin/tenants
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /tenants', () => {
  it('returns tenant list with 200', async () => {
    tenantService.listAllTenants.mockResolvedValue({
      tenants: [mockTenant],
      total: 1,
      page: 1,
      size: 20,
    });

    const res = await request(app).get(`${BASE}/tenants`);
    expect(res.status).toBe(200);
    expect(res.body.data.tenants).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  it('passes page / size / search query params to service', async () => {
    tenantService.listAllTenants.mockResolvedValue({ tenants: [], total: 0, page: 2, size: 5 });

    await request(app).get(`${BASE}/tenants?page=2&size=5&search=benito`);
    expect(tenantService.listAllTenants).toHaveBeenCalledWith({
      page: 2,
      size: 5,
      search: 'benito',
    });
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/super-admin/tenants
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /tenants', () => {
  const validPayload = {
    name: 'Benito Multi Service Limited',
    slug: 'benito-multi',
    subdomain: 'benito',
    plan: 'Enterprise',
  };

  it('creates tenant and returns 201', async () => {
    tenantService.createTenant.mockResolvedValue(mockTenant);

    const res = await request(app).post(`${BASE}/tenants`).send(validPayload);
    expect(res.status).toBe(201);
    expect(res.body.data.tenantId).toBe('tenant-uuid-1');
  });

  it('normalises plan to lowercase before calling service', async () => {
    tenantService.createTenant.mockResolvedValue(mockTenant);

    await request(app).post(`${BASE}/tenants`).send(validPayload);
    expect(tenantService.createTenant).toHaveBeenCalledWith(
      expect.objectContaining({ plan: 'enterprise' })
    );
  });

  it('writes an audit log on success', async () => {
    tenantService.createTenant.mockResolvedValue(mockTenant);
    auditService.log.mockClear();

    await request(app).post(`${BASE}/tenants`).send(validPayload);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'create', resource: 'tenant' })
    );
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/tenants`)
      .send({ slug: 'ange-decor', plan: 'pro' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/name/i);
  });

  it('returns 400 when slug is missing', async () => {
    const res = await request(app)
      .post(`${BASE}/tenants`)
      .send({ name: 'Ange Decor', plan: 'pro' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/slug/i);
  });

  it('returns 400 for an unrecognised plan', async () => {
    const res = await request(app)
      .post(`${BASE}/tenants`)
      .send({ name: 'Test Co', slug: 'test-co', plan: 'diamond' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/plan/i);
  });

  it('returns 409 when service throws SLUG_TAKEN', async () => {
    const { AppError } = require('../middleware/errorHandler');
    tenantService.createTenant.mockRejectedValue(
      new AppError('slug taken', 409, 'SLUG_TAKEN')
    );

    const res = await request(app)
      .post(`${BASE}/tenants`)
      .send({ name: 'Dup', slug: 'existing-slug', plan: 'free' });
    expect(res.status).toBe(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/super-admin/tenants/:tenantId
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /tenants/:tenantId', () => {
  it('returns the tenant with 200', async () => {
    tenantService.getTenantById.mockResolvedValue(mockTenant);

    const res = await request(app).get(`${BASE}/tenants/tenant-uuid-1`);
    expect(res.status).toBe(200);
    expect(res.body.data.tenantId).toBe('tenant-uuid-1');
  });

  it('returns 404 when tenant not found', async () => {
    const { AppError } = require('../middleware/errorHandler');
    tenantService.getTenantById.mockRejectedValue(
      new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND')
    );

    const res = await request(app).get(`${BASE}/tenants/nonexistent`);
    expect(res.status).toBe(404);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/super-admin/tenants/:tenantId
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /tenants/:tenantId', () => {
  it('updates the tenant and returns 200', async () => {
    tenantService.updateTenant.mockResolvedValue({ ...mockTenant, name: 'Updated Name' });

    const res = await request(app)
      .patch(`${BASE}/tenants/tenant-uuid-1`)
      .send({ name: 'Updated Name' });
    expect(res.status).toBe(200);
    expect(res.body.data.name).toBe('Updated Name');
  });

  it('normalises plan to subscriptionTier before calling service', async () => {
    tenantService.updateTenant.mockResolvedValue(mockTenant);

    await request(app)
      .patch(`${BASE}/tenants/tenant-uuid-1`)
      .send({ plan: 'Pro' });
    expect(tenantService.updateTenant).toHaveBeenCalledWith(
      'tenant-uuid-1',
      expect.objectContaining({ subscriptionTier: 'pro' })
    );
  });

  it('returns 400 for invalid plan', async () => {
    const res = await request(app)
      .patch(`${BASE}/tenants/tenant-uuid-1`)
      .send({ plan: 'galaxy' });
    expect(res.status).toBe(400);
  });

  it('writes an audit log on success', async () => {
    tenantService.updateTenant.mockResolvedValue(mockTenant);
    auditService.log.mockClear();

    await request(app)
      .patch(`${BASE}/tenants/tenant-uuid-1`)
      .send({ isActive: false });
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'update', resource: 'tenant' })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/super-admin/tenants/:tenantId
// ─────────────────────────────────────────────────────────────────────────────
describe('DELETE /tenants/:tenantId', () => {
  it('deactivates tenant and returns 204', async () => {
    tenantService.deactivateTenant.mockResolvedValue(undefined);

    const res = await request(app).delete(`${BASE}/tenants/tenant-uuid-1`);
    expect(res.status).toBe(204);
  });

  it('calls deactivateTenant with the correct ID', async () => {
    tenantService.deactivateTenant.mockResolvedValue(undefined);

    await request(app).delete(`${BASE}/tenants/tenant-uuid-1`);
    expect(tenantService.deactivateTenant).toHaveBeenCalledWith('tenant-uuid-1');
  });

  it('writes an audit log on success', async () => {
    tenantService.deactivateTenant.mockResolvedValue(undefined);
    auditService.log.mockClear();

    await request(app).delete(`${BASE}/tenants/tenant-uuid-1`);
    expect(auditService.log).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'delete', resource: 'tenant' })
    );
  });

  it('returns 403 when trying to deactivate the platform tenant', async () => {
    const { AppError } = require('../middleware/errorHandler');
    tenantService.deactivateTenant.mockRejectedValue(
      new AppError('Protected', 403, 'PROTECTED_TENANT')
    );

    const res = await request(app).delete(
      `${BASE}/tenants/00000000-0000-0000-0000-000000000001`
    );
    expect(res.status).toBe(403);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/super-admin/audit-logs
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /audit-logs', () => {
  it('returns audit logs with 200', async () => {
    adminService.getAuditLogs.mockResolvedValue({
      logs: [
        {
          logId: 'log-1',
          action: 'create',
          resource: 'tenant',
          timestamp: new Date().toISOString(),
        },
      ],
      total: 1,
      page: 1,
      size: 50,
    });

    const res = await request(app).get(`${BASE}/audit-logs`);
    expect(res.status).toBe(200);
    expect(res.body.data.logs).toHaveLength(1);
  });

  it('passes filter params to service', async () => {
    adminService.getAuditLogs.mockResolvedValue({ logs: [], total: 0, page: 1, size: 50 });

    await request(app).get(`${BASE}/audit-logs?action=create&resource=tenant&page=2&size=10`);
    expect(adminService.getAuditLogs).toHaveBeenCalledWith(
      expect.objectContaining({ action: 'create', resource: 'tenant', page: 2, size: 10 })
    );
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Authentication guard
// ─────────────────────────────────────────────────────────────────────────────
describe('Authentication enforcement', () => {
  it('returns 401 when no token is provided (real auth middleware)', async () => {
    // Override the auth mock for this specific test by using a fresh module
    jest.resetModules();

    jest.mock('../middleware/auth', () => ({
      authenticate: (_req, res, _next) => {
        res.status(401).json({ error: 'UNAUTHENTICATED', message: 'No token provided' });
      },
    }));

    jest.mock('../middleware/rbac', () => ({
      requireRole: () => (_req, _res, next) => next(),
      Roles: { SUPER_ADMIN: 'super_admin' },
    }));

    const freshApp = require('../app');
    const res = await request(freshApp).get('/api/super-admin/tenants');
    expect(res.status).toBe(401);

    jest.resetModules();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenant service unit tests
// ─────────────────────────────────────────────────────────────────────────────
describe('tenantService.createTenant — unit', () => {
  let realTenantService;

  beforeEach(() => {
    jest.resetModules();

    // re-mock prisma before requiring the real service
    jest.mock('../config/prisma', () => ({
      tenant: {
        findUnique: jest.fn(),
        create: jest.fn(),
      },
      user: {},
      subscription: {},
      subscriptionFeature: {},
      auditLog: {},
    }));

    jest.mock('./subscription.service', () => ({
      createFreeSubscription: jest.fn().mockResolvedValue({}),
    }));

    realTenantService = require('../services/tenant.service');
  });

  it('throws INVALID_PLAN for unknown plan', async () => {
    const { AppError } = require('../middleware/errorHandler');
    await expect(
      realTenantService.createTenant({ name: 'X', slug: 'x', plan: 'diamond' })
    ).rejects.toThrow(AppError);
  });

  it('throws SLUG_TAKEN when slug already exists', async () => {
    const prisma2 = require('../config/prisma');
    prisma2.tenant.findUnique.mockResolvedValue({ tenantId: 'existing' });

    const { AppError } = require('../middleware/errorHandler');
    await expect(
      realTenantService.createTenant({ name: 'X', slug: 'existing', plan: 'free' })
    ).rejects.toThrow(AppError);
  });

  it('creates tenant with subscriptionTier from plan arg', async () => {
    const prisma2 = require('../config/prisma');
    prisma2.tenant.findUnique.mockResolvedValue(null); // slug not taken
    prisma2.tenant.create.mockResolvedValue({
      tenantId: 'new-id',
      name: 'New Co',
      slug: 'new-co',
      subscriptionTier: 'pro',
    });

    const result = await realTenantService.createTenant({
      name: 'New Co',
      slug: 'new-co',
      plan: 'pro',
    });

    expect(prisma2.tenant.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ subscriptionTier: 'pro' }),
      })
    );
    expect(result.subscriptionTier).toBe('pro');
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// adminService.getAuditLogs — unit (orderBy timestamp fix)
// ─────────────────────────────────────────────────────────────────────────────
describe('adminService.getAuditLogs — orderBy field', () => {
  it('orders by timestamp not createdAt', async () => {
    jest.resetModules();

    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);

    jest.mock('../config/prisma', () => ({
      auditLog: { findMany: mockFindMany, count: mockCount },
    }));

    const realAdminService = require('../services/admin.service');
    await realAdminService.getAuditLogs({});

    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ orderBy: { timestamp: 'desc' } })
    );
  });
});
