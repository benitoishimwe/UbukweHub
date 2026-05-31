'use strict';

const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');
const prisma = require('../config/prisma');
const { createToken } = require('../utils/jwt');
const { generateSecret, generateQrUri, verify: verifyTotp, generateEmailOtp } = require('../utils/totp');
const { AppError } = require('../middleware/errorHandler');
const emailService = require('./email.service');
const auditService = require('./audit.service');
const subscriptionService = require('./subscription.service');
const config = require('../config/env');

const BCRYPT_ROUNDS = 10;
const EMAIL_OTP_TTL_MINUTES = 10;

// ─── Helpers ─────────────────────────────────────────────────────────────────

/**
 * Strip sensitive fields before returning a user to the caller.
 */
function safeUser(user) {
  const { passwordHash, mfaSecret, ...rest } = user;
  return rest;
}

/**
 * Build a standard auth response object.
 */
function buildAuthResponse(user, token) {
  return { token, user: safeUser(user) };
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Register a new user account.
 *
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} params.name
 * @param {string} [params.role]
 * @param {string} [params.tenantId]
 * @returns {Promise<{ token: string, user: object }>}
 */
async function register({ email, password, name, role = 'client', tenantId = null }) {
  const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (existing) {
    throw new AppError('An account with this email address already exists', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: email.toLowerCase().trim(),
      passwordHash,
      name,
      role,
      tenantId,
      isActive: true,
    },
  });

  try {
    await subscriptionService.createAutoTrial(user.userId, user.tenantId || null);
  } catch (trialErr) {
    // Trial creation may fail if DB constraints haven't been migrated yet.
    // Fall back silently to free plan — user can always upgrade later.
    console.warn('[register] createAutoTrial failed, falling back to free:', trialErr.message);
    await subscriptionService.createFreeSubscription(user.userId, user.tenantId || null).catch(() => {});
  }

  const token = createToken(user.userId, user.role, user.email, user.tenantId);

  await auditService.log({
    userId: user.userId,
    userEmail: user.email,
    action: auditService.AuditAction.REGISTER,
    resource: auditService.AuditResource.AUTH,
    resourceId: user.userId,
  });

  await emailService.sendWelcome(user.email, user.name).catch(() => {});

  return buildAuthResponse(user, token);
}

/**
 * Authenticate a user with email + password.
 * If MFA is enabled, returns a challenge response instead of a token.
 *
 * @param {object} params
 * @param {string} params.email
 * @param {string} params.password
 * @param {string} [params.ipAddress]
 * @returns {Promise<{ token: string, user: object } | { mfa_required: true, userId: string, method: string }>}
 */
async function login({ email, password, ipAddress }) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
  if (!user) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (!user.isActive) {
    throw new AppError('Your account has been deactivated. Please contact support.', 403, 'ACCOUNT_INACTIVE');
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) {
    throw new AppError('Invalid email or password', 401, 'INVALID_CREDENTIALS');
  }

  if (user.mfaEnabled) {
    return {
      mfa_required: true,
      userId: user.userId,
      method: 'totp',
    };
  }

  const token = createToken(user.userId, user.role, user.email, user.tenantId);

  await auditService.log({
    userId: user.userId,
    userEmail: user.email,
    action: auditService.AuditAction.LOGIN,
    resource: auditService.AuditResource.AUTH,
    resourceId: user.userId,
    ipAddress,
  });

  return buildAuthResponse(user, token);
}

/**
 * Verify an MFA challenge (TOTP or email OTP) and issue a JWT on success.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.code
 * @param {string} params.method  - 'totp' | 'email'
 * @param {string} [params.ipAddress]
 * @returns {Promise<{ token: string, user: object }>}
 */
async function verifyMfa({ userId, code, method, ipAddress }) {
  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user || !user.isActive) {
    throw new AppError('User not found or inactive', 404, 'USER_NOT_FOUND');
  }

  let verified = false;

  if (method === 'totp') {
    if (!user.mfaSecret) {
      throw new AppError('TOTP is not configured for this account', 400, 'TOTP_NOT_CONFIGURED');
    }
    verified = verifyTotp(user.mfaSecret, code);
  } else if (method === 'email') {
    const otpRecord = await prisma.emailOtp.findFirst({
      where: {
        userId,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new AppError('OTP not found or has expired. Please request a new code.', 400, 'OTP_EXPIRED');
    }

    verified = otpRecord.code === code;

    if (verified) {
      await prisma.emailOtp.delete({ where: { id: otpRecord.id } });
    }
  } else {
    throw new AppError(`Unsupported MFA method: ${method}`, 400, 'INVALID_MFA_METHOD');
  }

  if (!verified) {
    throw new AppError('Invalid verification code', 401, 'INVALID_MFA_CODE');
  }

  const token = createToken(user.userId, user.role, user.email, user.tenantId);

  await auditService.log({
    userId: user.userId,
    userEmail: user.email,
    action: auditService.AuditAction.MFA_VERIFY,
    resource: auditService.AuditResource.AUTH,
    resourceId: user.userId,
    details: { method },
    ipAddress,
  });

  return buildAuthResponse(user, token);
}

/**
 * Generate and send an email OTP to the user.
 *
 * @param {string} userId
 * @returns {Promise<void>}
 */
async function sendEmailOtp(userId) {
  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user || !user.isActive) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const code = generateEmailOtp();
  const expiresAt = new Date(Date.now() + EMAIL_OTP_TTL_MINUTES * 60 * 1000);

  // Remove any existing OTPs for this user before creating a new one
  await prisma.emailOtp.deleteMany({ where: { userId } });

  await prisma.emailOtp.create({
    data: {
      userId,
      code,
      expiresAt,
    },
  });

  await emailService.sendEmailOtp(user.email, code);
}

/**
 * Initiate TOTP setup: generate a new secret and return the QR URI.
 * The secret is saved to the user but MFA is NOT yet enabled.
 *
 * @param {string} userId
 * @returns {Promise<{ qrUri: string, secret: string }>}
 */
async function setupTotp(userId) {
  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const secret = generateSecret();
  const qrUri = generateQrUri(user.email, secret);

  await prisma.user.update({
    where: { userId },
    data: { mfaSecret: secret },
  });

  await auditService.log({
    userId: user.userId,
    userEmail: user.email,
    action: auditService.AuditAction.MFA_SETUP,
    resource: auditService.AuditResource.AUTH,
    resourceId: user.userId,
    details: { step: 'initiated' },
  });

  return { qrUri, secret };
}

/**
 * Verify the first TOTP code to confirm setup and enable MFA on the account.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.code
 * @returns {Promise<{ success: true }>}
 */
async function verifyTotpSetup({ userId, code }) {
  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user || !user.mfaSecret) {
    throw new AppError('TOTP setup has not been initiated. Call /totp-setup first.', 400, 'TOTP_NOT_INITIATED');
  }

  const valid = verifyTotp(user.mfaSecret, code);
  if (!valid) {
    throw new AppError('Invalid TOTP code. Please try again.', 401, 'INVALID_TOTP_CODE');
  }

  await prisma.user.update({
    where: { userId },
    data: { mfaEnabled: true },
  });

  await auditService.log({
    userId: user.userId,
    userEmail: user.email,
    action: auditService.AuditAction.MFA_SETUP,
    resource: auditService.AuditResource.AUTH,
    resourceId: user.userId,
    details: { step: 'completed' },
  });

  return { success: true };
}

/**
 * Change the authenticated user's password.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.currentPassword
 * @param {string} params.newPassword
 * @returns {Promise<{ success: true }>}
 */
async function changePassword({ userId, currentPassword, newPassword }) {
  const user = await prisma.user.findUnique({ where: { userId } });
  if (!user) {
    throw new AppError('User not found', 404, 'USER_NOT_FOUND');
  }

  const match = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!match) {
    throw new AppError('Current password is incorrect', 401, 'WRONG_PASSWORD');
  }

  const newHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({
    where: { userId },
    data: { passwordHash: newHash },
  });

  await auditService.log({
    userId: user.userId,
    userEmail: user.email,
    action: auditService.AuditAction.PASSWORD_CHANGE,
    resource: auditService.AuditResource.AUTH,
    resourceId: user.userId,
  });

  await emailService.sendPasswordChanged(user.email, user.name).catch(() => {});

  return { success: true };
}

/**
 * Authenticate via a persisted session token (cookie-based session).
 *
 * @param {object} params
 * @param {string} params.sessionToken
 * @param {string} [params.ipAddress]
 * @returns {Promise<{ token: string, user: object }>}
 */
async function loginWithSession({ sessionToken, ipAddress }) {
  const session = await prisma.userSession.findUnique({
    where: { sessionToken },
    include: {
      user: true,
    },
  });

  if (!session) {
    throw new AppError('Session not found', 401, 'INVALID_SESSION');
  }

  if (session.expiresAt < new Date()) {
    throw new AppError('Session has expired', 401, 'SESSION_EXPIRED');
  }

  const user = session.user;

  if (!user || !user.isActive) {
    throw new AppError('Account not found or inactive', 401, 'ACCOUNT_INACTIVE');
  }

  const token = createToken(user.userId, user.role, user.email, user.tenantId);

  await auditService.log({
    userId: user.userId,
    userEmail: user.email,
    action: auditService.AuditAction.LOGIN,
    resource: auditService.AuditResource.AUTH,
    resourceId: user.userId,
    details: { method: 'session' },
    ipAddress,
  });

  return buildAuthResponse(user, token);
}

/**
 * Accept a tenant invitation, create the user account, and return a JWT.
 *
 * @param {object} params
 * @param {string} params.token    - Invitation token from the email link
 * @param {string} params.password - Password chosen by the invitee
 * @param {string} params.name     - Display name chosen by the invitee
 * @returns {Promise<{ token: string, user: object }>}
 */
async function acceptInvitation({ token, password, name }) {
  const invitation = await prisma.tenantInvitation.findUnique({ where: { token } });

  if (!invitation) {
    throw new AppError('Invitation not found', 404, 'INVITATION_NOT_FOUND');
  }

  if (invitation.expiresAt < new Date()) {
    throw new AppError('This invitation has expired. Please ask for a new one.', 400, 'INVITATION_EXPIRED');
  }

  if (invitation.acceptedAt) {
    throw new AppError('This invitation has already been accepted', 400, 'INVITATION_ALREADY_ACCEPTED');
  }

  const existing = await prisma.user.findUnique({ where: { email: invitation.email.toLowerCase() } });
  if (existing) {
    throw new AppError('An account with this email address already exists', 409, 'EMAIL_TAKEN');
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

  const user = await prisma.user.create({
    data: {
      email: invitation.email.toLowerCase(),
      passwordHash,
      name,
      role: invitation.role,
      tenantId: invitation.tenantId,
      isActive: true,
    },
  });

  await subscriptionService.createFreeSubscription(user.userId);

  await prisma.tenantInvitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });

  const jwtToken = createToken(user.userId, user.role, user.email, user.tenantId);

  await auditService.log({
    userId: user.userId,
    userEmail: user.email,
    action: auditService.AuditAction.REGISTER,
    resource: auditService.AuditResource.AUTH,
    resourceId: user.userId,
    details: { via: 'invitation', tenantId: invitation.tenantId },
  });

  await emailService.sendWelcome(user.email, user.name).catch(() => {});

  return buildAuthResponse(user, jwtToken);
}

/**
 * Retrieve invitation details by token for pre-filling the acceptance form.
 *
 * @param {string} token
 * @returns {Promise<object>} The invitation record
 */
async function getInvitation(token) {
  const invitation = await prisma.tenantInvitation.findUnique({ where: { token } });

  if (!invitation) {
    throw new AppError('Invitation not found', 404, 'INVITATION_NOT_FOUND');
  }

  if (invitation.expiresAt < new Date()) {
    throw new AppError('This invitation has expired', 400, 'INVITATION_EXPIRED');
  }

  if (invitation.acceptedAt) {
    throw new AppError('This invitation has already been accepted', 400, 'INVITATION_ALREADY_ACCEPTED');
  }

  return invitation;
}

/**
 * Initiate a self-service password reset. Always returns without error to
 * prevent email enumeration — the reset email is sent only when the account exists.
 *
 * @param {string} email
 */
async function forgotPassword(email) {
  const normalised = email.toLowerCase().trim();
  const user = await prisma.user.findUnique({
    where: { email: normalised },
    select: { userId: true, name: true, email: true, isActive: true },
  });

  if (!user || !user.isActive) return; // silent — don't reveal whether email exists

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  // Invalidate any existing tokens for this user
  await prisma.$executeRawUnsafe(
    `DELETE FROM password_reset_tokens WHERE user_id = $1`,
    user.userId
  );

  await prisma.$executeRawUnsafe(
    `INSERT INTO password_reset_tokens (user_id, token, expires_at)
     VALUES ($1, $2, $3::timestamptz)`,
    user.userId, token, expiresAt.toISOString()
  );

  const resetLink = `${config.frontendUrl}/reset-password?token=${token}`;
  await emailService.sendPasswordResetRequest(user.email, user.name, resetLink).catch((err) => {
    console.error('[auth.service] Failed to send password reset email:', err.message);
  });
}

/**
 * Complete a password reset using the token sent by email.
 *
 * @param {string} token       - UUID token from the reset link
 * @param {string} newPassword - New plaintext password (min 8 chars)
 */
async function resetPassword(token, newPassword) {
  const rows = await prisma.$queryRawUnsafe(
    `SELECT token_id, user_id::text, expires_at, used_at
     FROM password_reset_tokens WHERE token = $1`,
    token
  );

  if (!rows.length) throw new AppError('Invalid or expired reset link', 400, 'INVALID_RESET_TOKEN');

  const row = rows[0];
  if (row.used_at)                        throw new AppError('This reset link has already been used', 400, 'TOKEN_USED');
  if (new Date(row.expires_at) < new Date()) throw new AppError('This reset link has expired. Please request a new one.', 400, 'TOKEN_EXPIRED');

  const passwordHash = await bcrypt.hash(newPassword, BCRYPT_ROUNDS);

  await prisma.user.update({ where: { userId: row.user_id }, data: { passwordHash } });
  await prisma.$executeRawUnsafe(
    `UPDATE password_reset_tokens SET used_at = now() WHERE token_id = $1`,
    row.token_id
  );
}

module.exports = {
  register,
  login,
  verifyMfa,
  sendEmailOtp,
  setupTotp,
  verifyTotpSetup,
  changePassword,
  loginWithSession,
  acceptInvitation,
  getInvitation,
  forgotPassword,
  resetPassword,
};
