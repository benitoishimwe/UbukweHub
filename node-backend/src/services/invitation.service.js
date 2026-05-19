'use strict';

const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');
const emailService = require('./email.service');
const config = require('../config/env');

const INVITATION_TTL_HOURS = 48;

/**
 * Create a new tenant invitation and send the invitation email.
 *
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} params.email       - Invitee's email address
 * @param {string} params.role        - Role to assign on acceptance
 * @param {string} params.invitedBy   - userId of the inviting admin
 * @returns {Promise<object>} The created invitation record
 */
async function createInvitation({ tenantId, email, role, invitedBy }) {
  const normalizedEmail = email.toLowerCase().trim();

  // Check for a pending (not yet accepted, not expired) invitation
  const pending = await prisma.tenantInvitation.findFirst({
    where: {
      email: normalizedEmail,
      tenantId,
      acceptedAt: null,
      expiresAt: { gt: new Date() },
    },
  });

  if (pending) {
    throw new AppError(
      'A pending invitation for this email address already exists for this organisation.',
      409,
      'INVITATION_ALREADY_PENDING'
    );
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + INVITATION_TTL_HOURS * 60 * 60 * 1000);

  const invitation = await prisma.tenantInvitation.create({
    data: {
      tenantId,
      email: normalizedEmail,
      role,
      invitedBy,
      token,
      expiresAt,
    },
  });

  // Resolve display names for the email
  const [inviter, tenant] = await Promise.all([
    prisma.user.findUnique({ where: { userId: invitedBy }, select: { name: true } }),
    prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ]);

  const inviterName = inviter?.name || 'A team member';
  const tenantName = tenant?.name || 'your organisation';
  const invitationLink = `${config.frontendUrl}/accept-invitation?token=${token}`;

  await emailService
    .sendInvitation(normalizedEmail, inviterName, tenantName, role, invitationLink)
    .catch((err) => {
      console.error('[invitation.service] Failed to send invitation email:', err.message);
    });

  return invitation;
}

/**
 * List invitations for a tenant with pagination.
 *
 * @param {string} tenantId
 * @param {object} [params]
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 * @returns {Promise<{ invitations: object[], total: number, page: number, size: number }>}
 */
async function listInvitations(tenantId, { page = 1, size = 20 } = {}) {
  const skip = (page - 1) * size;
  const where = { tenantId };

  const [invitations, total] = await Promise.all([
    prisma.tenantInvitation.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.tenantInvitation.count({ where }),
  ]);

  return { invitations, total, page, size };
}

/**
 * Revoke (delete) an invitation, ensuring it belongs to the given tenant.
 *
 * @param {string} invitationId
 * @param {string} tenantId
 * @returns {Promise<void>}
 */
async function revokeInvitation(invitationId, tenantId) {
  const invitation = await prisma.tenantInvitation.findUnique({
    where: { id: invitationId },
  });

  if (!invitation) {
    throw new AppError('Invitation not found', 404, 'INVITATION_NOT_FOUND');
  }

  if (invitation.tenantId !== tenantId) {
    throw new AppError('You do not have permission to revoke this invitation', 403, 'FORBIDDEN');
  }

  await prisma.tenantInvitation.delete({ where: { id: invitationId } });
}

module.exports = {
  createInvitation,
  listInvitations,
  revokeInvitation,
};
