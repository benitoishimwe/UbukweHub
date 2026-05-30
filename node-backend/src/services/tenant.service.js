'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');
const subscriptionService = require('./subscription.service');

const BCRYPT_ROUNDS = 10;
const PLATFORM_TENANT_ID = '00000000-0000-0000-0000-000000000001';

const VALID_PLANS = ['free', 'trial', 'pro', 'enterprise', 'starter'];

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * List all tenants with optional name/slug search and pagination.
 */
async function listAllTenants({ page = 1, size = 20, search } = {}) {
  const skip = (page - 1) * size;

  const where = search
    ? {
        OR: [
          { name: { contains: search, mode: 'insensitive' } },
          { slug: { contains: search, mode: 'insensitive' } },
        ],
      }
    : {};

  const [tenants, total] = await Promise.all([
    prisma.tenant.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenant.count({ where }),
  ]);

  return { tenants, total, page, size };
}

/**
 * Get a single tenant by ID. Throws 404 if not found.
 */
async function getTenantById(tenantId) {
  const tenant = await prisma.tenant.findUnique({ where: { tenantId } });
  if (!tenant) {
    throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
  }
  return tenant;
}

/**
 * Get a single tenant by its URL slug. Throws 404 if not found.
 */
async function getTenantBySlug(slug) {
  const tenant = await prisma.tenant.findUnique({ where: { slug } });
  if (!tenant) {
    throw new AppError('Tenant not found', 404, 'TENANT_NOT_FOUND');
  }
  return tenant;
}

/**
 * Create a new tenant. Slug must be globally unique.
 *
 * @param {object} params
 * @param {string}  params.name
 * @param {string}  params.slug
 * @param {string}  [params.subdomain]
 * @param {string}  [params.primaryColor]
 * @param {string}  [params.plan]        - Subscription tier (defaults to 'free')
 */
async function createTenant({ name, slug, subdomain, primaryColor, plan = 'free' }) {
  const normalizedPlan = plan.toLowerCase();
  if (!VALID_PLANS.includes(normalizedPlan)) {
    throw new AppError(
      `Invalid plan "${plan}". Must be one of: ${VALID_PLANS.join(', ')}`,
      400,
      'INVALID_PLAN'
    );
  }

  const existing = await prisma.tenant.findUnique({ where: { slug } });
  if (existing) {
    throw new AppError(`A tenant with slug "${slug}" already exists`, 409, 'SLUG_TAKEN');
  }

  // subdomain uniqueness check only when a subdomain is provided
  if (subdomain) {
    const subdomainTaken = await prisma.tenant.findUnique({ where: { subdomain } });
    if (subdomainTaken) {
      throw new AppError(
        `A tenant with subdomain "${subdomain}" already exists`,
        409,
        'SUBDOMAIN_TAKEN'
      );
    }
  }

  return prisma.tenant.create({
    data: {
      name,
      slug,
      subdomain: subdomain || null,
      primaryColor: primaryColor || null,
      subscriptionTier: normalizedPlan,
      isActive: true,
    },
  });
}

/**
 * Patch one or more fields on a tenant record.
 */
async function updateTenant(tenantId, updates) {
  await getTenantById(tenantId);

  if (updates.slug) {
    const existing = await prisma.tenant.findFirst({
      where: { slug: updates.slug, NOT: { tenantId } },
    });
    if (existing) {
      throw new AppError(
        `A tenant with slug "${updates.slug}" already exists`,
        409,
        'SLUG_TAKEN'
      );
    }
  }

  return prisma.tenant.update({
    where: { tenantId },
    data: updates,
  });
}

/**
 * Permanently delete a tenant and ALL related data.
 * The tenant must already be deactivated (isActive = false).
 * The platform root tenant is protected.
 */
async function hardDeleteTenant(tenantId) {
  if (tenantId === PLATFORM_TENANT_ID) {
    throw new AppError('The platform root tenant cannot be deleted', 403, 'PROTECTED_TENANT');
  }

  const tenant = await getTenantById(tenantId);
  if (tenant.isActive) {
    throw new AppError('Deactivate the tenant before deleting it', 400, 'TENANT_STILL_ACTIVE');
  }

  // Delete in dependency order to satisfy FK constraints.
  // deepest children first, then parent tables, then the tenant itself.
  // tenant_id columns are character varying in this DB — no ::uuid cast.
  await prisma.$transaction(async (tx) => {
    const t = tenantId;
    // ── Vendor sub-records ─────────────────────────────────────────────────────
    await tx.$executeRaw`DELETE FROM vendor_reviews   WHERE vendor_id IN (SELECT vendor_id FROM vendors WHERE tenant_id = ${t})`;
    await tx.$executeRaw`DELETE FROM vendor_favorites WHERE vendor_id IN (SELECT vendor_id FROM vendors WHERE tenant_id = ${t})`;
    await tx.$executeRaw`DELETE FROM vendor_inquiries WHERE vendor_id IN (SELECT vendor_id FROM vendors WHERE tenant_id = ${t})`;
    await tx.$executeRaw`DELETE FROM vendor_portfolio WHERE vendor_id IN (SELECT vendor_id FROM vendors WHERE tenant_id = ${t})`;
    // ── Album sub-records ──────────────────────────────────────────────────────
    await tx.$executeRaw`DELETE FROM album_media WHERE album_id IN (SELECT album_id FROM albums WHERE tenant_id = ${t})`;
    // ── Wedding plan sub-records ───────────────────────────────────────────────
    await tx.$executeRaw`DELETE FROM wedding_budget_items  WHERE plan_id IN (SELECT plan_id FROM wedding_plans WHERE tenant_id = ${t})`;
    await tx.$executeRaw`DELETE FROM wedding_guests        WHERE plan_id IN (SELECT plan_id FROM wedding_plans WHERE tenant_id = ${t})`;
    await tx.$executeRaw`DELETE FROM wedding_venues        WHERE plan_id IN (SELECT plan_id FROM wedding_plans WHERE tenant_id = ${t})`;
    await tx.$executeRaw`DELETE FROM wedding_menu_items    WHERE plan_id IN (SELECT plan_id FROM wedding_plans WHERE tenant_id = ${t})`;
    await tx.$executeRaw`DELETE FROM wedding_design_assets WHERE plan_id IN (SELECT plan_id FROM wedding_plans WHERE tenant_id = ${t})`;
    // ── User sub-records ───────────────────────────────────────────────────────
    await tx.$executeRaw`DELETE FROM user_sessions WHERE user_id IN (SELECT user_id FROM users WHERE tenant_id = ${t})`;
    await tx.$executeRaw`DELETE FROM email_otps    WHERE user_id IN (SELECT user_id FROM users WHERE tenant_id = ${t})`;
    await tx.$executeRaw`DELETE FROM audit_logs    WHERE user_id IN (SELECT user_id FROM users WHERE tenant_id = ${t})`;
    await tx.$executeRaw`DELETE FROM payments      WHERE user_id IN (SELECT user_id FROM users WHERE tenant_id = ${t})`;
    await tx.$executeRaw`DELETE FROM subscriptions WHERE user_id IN (SELECT user_id FROM users WHERE tenant_id = ${t})`;
    // Also delete subscriptions referenced directly by tenant_id (e.g. orphaned after user reassignment)
    await tx.$executeRaw`DELETE FROM subscriptions WHERE tenant_id = ${t}`;
    // ── Direct tenant-scoped tables ────────────────────────────────────────────
    await tx.$executeRaw`DELETE FROM vendor_profiles       WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM vendors               WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM albums                WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM save_the_date_designs WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM wedding_plans         WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM event_tasks           WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM transactions          WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM shifts                WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM inventory             WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM events                WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM tenant_invitations    WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM test_accounts         WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM api_keys              WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM users                 WHERE tenant_id = ${t}`;
    await tx.$executeRaw`DELETE FROM tenants               WHERE tenant_id = ${t}`;
  }, { timeout: 30000 });
}

/**
 * Mark a tenant as inactive. The platform root tenant cannot be deactivated.
 */
async function deactivateTenant(tenantId) {
  if (tenantId === PLATFORM_TENANT_ID) {
    throw new AppError('The platform root tenant cannot be deactivated', 403, 'PROTECTED_TENANT');
  }

  await getTenantById(tenantId);

  return prisma.tenant.update({
    where: { tenantId },
    data: { isActive: false },
  });
}

/**
 * List users belonging to a tenant with pagination.
 * Password hashes are excluded from the response.
 */
async function listTenantUsers(tenantId, { page = 1, size = 20 } = {}) {
  const skip = (page - 1) * size;

  const where = { tenantId };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      select: {
        userId: true,
        email: true,
        name: true,
        role: true,
        isActive: true,
        mfaEnabled: true,
        tenantId: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
    prisma.user.count({ where }),
  ]);

  return { users, total, page, size };
}

/**
 * Create a tenant_admin user for an existing tenant.
 */
async function createTenantAdmin({ tenantId, email, password, name }) {
  await getTenantById(tenantId);

  const existing = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });
  if (existing) {
    throw new AppError(
      'An account with this email address already exists',
      409,
      'EMAIL_TAKEN'
    );
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      name,
      role: 'tenant_admin',
      tenantId,
      isActive: true,
    },
    select: {
      userId: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      tenantId: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  await subscriptionService.createFreeSubscription(user.userId);

  return user;
}

/**
 * Return high-level platform statistics for the super_admin dashboard.
 */
async function getPlatformStats() {
  // Find tenant IDs on trial plan so we can count trial users
  const trialTenants = await prisma.tenant.findMany({
    where: { subscriptionTier: 'trial', isActive: true },
    select: { tenantId: true },
  });
  const trialTenantIds = trialTenants.map(t => t.tenantId);

  const [totalTenants, activeTenants, totalUsers, activeUsers, standaloneUsers, trialUsers] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
    prisma.user.count({ where: { tenantId: null } }),
    trialTenantIds.length > 0
      ? prisma.user.count({ where: { tenantId: { in: trialTenantIds } } })
      : Promise.resolve(0),
  ]);

  const tenantUsers = totalUsers - standaloneUsers;

  return { totalTenants, activeTenants, totalUsers, activeUsers, standaloneUsers, tenantUsers, trialUsers };
}

module.exports = {
  listAllTenants,
  getTenantById,
  getTenantBySlug,
  createTenant,
  updateTenant,
  deactivateTenant,
  hardDeleteTenant,
  listTenantUsers,
  createTenantAdmin,
  getPlatformStats,
  VALID_PLANS,
};
