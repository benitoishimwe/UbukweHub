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
  const [totalTenants, activeTenants, totalUsers, activeUsers] = await Promise.all([
    prisma.tenant.count(),
    prisma.tenant.count({ where: { isActive: true } }),
    prisma.user.count(),
    prisma.user.count({ where: { isActive: true } }),
  ]);

  return { totalTenants, activeTenants, totalUsers, activeUsers };
}

module.exports = {
  listAllTenants,
  getTenantById,
  getTenantBySlug,
  createTenant,
  updateTenant,
  deactivateTenant,
  listTenantUsers,
  createTenantAdmin,
  getPlatformStats,
  VALID_PLANS,
};
