'use strict';

const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

// ─── Users ────────────────────────────────────────────────────────────────────

/**
 * List users with optional tenant and role filtering.
 * Super admins may omit tenantId to list all users platform-wide.
 *
 * @param {object} params
 * @param {string} [params.tenantId]  - Restrict to a specific tenant
 * @param {string} [params.role]      - Filter by role
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 * @returns {Promise<{ users: object[], total: number, page: number, size: number }>}
 */
async function listUsers({ tenantId, role, page = 1, size = 20 } = {}) {
  const skip = (page - 1) * size;

  const where = {};
  if (tenantId) where.tenantId = tenantId;
  if (role) where.role = role;

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
 * Get a single user by ID. Throws 404 if not found.
 *
 * @param {string} userId
 * @returns {Promise<object>}
 */
async function getUserById(userId) {
  const user = await prisma.user.findUnique({
    where: { userId },
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
  });

  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  return user;
}

/**
 * Deactivate a user account.
 *
 * @param {string} userId
 * @returns {Promise<object>} The updated user
 */
async function deactivateUser(userId) {
  await getUserById(userId);

  return prisma.user.update({
    where: { userId },
    data: { isActive: false },
    select: {
      userId: true,
      email: true,
      name: true,
      role: true,
      isActive: true,
      tenantId: true,
      updatedAt: true,
    },
  });
}

// ─── Audit logs ───────────────────────────────────────────────────────────────

/**
 * List audit logs with optional filters and pagination.
 *
 * @param {object} params
 * @param {string} [params.userId]    - Filter by the acting user
 * @param {string} [params.action]    - Filter by action type
 * @param {string} [params.resource]  - Filter by resource type
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 * @returns {Promise<{ logs: object[], total: number, page: number, size: number }>}
 */
async function getAuditLogs({ userId, action, resource, page = 1, size = 20 } = {}) {
  const skip = (page - 1) * size;

  const where = {};
  if (userId) where.userId = userId;
  if (action) where.action = action;
  if (resource) where.resource = resource;

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      skip,
      take: size,
      orderBy: { timestamp: 'desc' },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { logs, total, page, size };
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

/**
 * Return dashboard statistics for a given tenant (or platform-wide if tenantId is omitted).
 *
 * @param {string} [tenantId]  - Scoped tenant ID; omit for platform-wide stats
 * @returns {Promise<{ eventCount: number, userCount: number, vendorCount: number, recentAuditLogs: object[] }>}
 */
async function getDashboardStats(tenantId) {
  const tenantFilter = tenantId ? { tenantId } : {};

  const [eventCount, userCount, vendorCount, recentAuditLogs] = await Promise.all([
    prisma.event.count({ where: tenantFilter }),
    prisma.user.count({ where: tenantFilter }),
    prisma.vendor.count({ where: tenantFilter }),
    prisma.auditLog.findMany({
      where: tenantId ? { userId: { in: await _getTenantUserIds(tenantId) } } : {},
      orderBy: { timestamp: 'desc' },
      take: 10,
    }),
  ]);

  return { eventCount, userCount, vendorCount, recentAuditLogs };
}

/**
 * Helper: collect user IDs that belong to a tenant for audit log scoping.
 *
 * @param {string} tenantId
 * @returns {Promise<string[]>}
 */
async function _getTenantUserIds(tenantId) {
  const users = await prisma.user.findMany({
    where: { tenantId },
    select: { userId: true },
  });
  return users.map((u) => u.userId);
}

module.exports = {
  listUsers,
  getUserById,
  deactivateUser,
  getAuditLogs,
  getDashboardStats,
};
