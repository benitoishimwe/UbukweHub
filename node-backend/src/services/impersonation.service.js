'use strict';

const prisma = require('../config/prisma');
const { createImpersonationToken } = require('../utils/jwt');
const { AppError } = require('../middleware/errorHandler');
const auditService = require('./audit.service');

/**
 * Allow a super_admin to impersonate another user.
 * Returns a short-lived impersonation JWT and the target user's profile.
 *
 * @param {object} params
 * @param {string} params.targetUserId     - ID of the user to impersonate
 * @param {string} params.superAdminId     - ID of the super_admin performing the action
 * @param {string} params.superAdminEmail  - Email of the super_admin (recorded in token + audit)
 * @returns {Promise<{ token: string, user: object }>}
 */
async function impersonate({ targetUserId, superAdminId, superAdminEmail }) {
  const targetUser = await prisma.user.findUnique({
    where: { userId: targetUserId },
    select: {
      userId: true,
      email: true,
      name: true,
      role: true,
      tenantId: true,
      isActive: true,
      mfaEnabled: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!targetUser) {
    throw new AppError('Target user not found', 404, 'USER_NOT_FOUND');
  }

  if (!targetUser.isActive) {
    throw new AppError('Cannot impersonate an inactive user account', 400, 'USER_INACTIVE');
  }

  const token = createImpersonationToken(
    targetUser.userId,
    targetUser.role,
    targetUser.email,
    targetUser.tenantId,
    superAdminEmail
  );

  await auditService.log({
    userId: superAdminId,
    userEmail: superAdminEmail,
    action: auditService.AuditAction.IMPERSONATE,
    resource: auditService.AuditResource.USER,
    resourceId: targetUserId,
    details: {
      impersonatedEmail: targetUser.email,
      impersonatedRole: targetUser.role,
      tenantId: targetUser.tenantId,
    },
  });

  return { token, user: targetUser };
}

module.exports = { impersonate };
