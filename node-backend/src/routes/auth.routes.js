'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { ok, created, badRequest } = require('../utils/response');
const authService = require('../services/auth.service');
const auditService = require('../services/audit.service');

const router = express.Router();

// ─── POST /api/auth/register ──────────────────────────────────────────────────
// Public. Create a new user account.
router.post('/register', async (req, res, next) => {
  try {
    const { email, password, name, role, tenantId } = req.body;

    if (!email || !password || !name) {
      return badRequest(res, 'email, password, and name are required');
    }

    const result = await authService.register({ email, password, name, role, tenantId });
    return created(res, result, 'Account created successfully');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/auth/login ─────────────────────────────────────────────────────
// Public. Authenticate with email + password.
router.post('/login', async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return badRequest(res, 'email and password are required');
    }

    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;

    const result = await authService.login({ email, password, ipAddress });
    return ok(res, result, 'Login successful');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/auth/verify-mfa ────────────────────────────────────────────────
// Public. Verify an MFA challenge (totp or email).
router.post('/verify-mfa', async (req, res, next) => {
  try {
    const { userId, code, method } = req.body;

    if (!userId || !code || !method) {
      return badRequest(res, 'userId, code, and method are required');
    }

    const ipAddress =
      req.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      null;

    const result = await authService.verifyMfa({ userId, code, method, ipAddress });
    return ok(res, result, 'MFA verified successfully');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/auth/send-email-otp ────────────────────────────────────────────
// Public. Send a 6-digit OTP to the user's email address.
router.post('/send-email-otp', async (req, res, next) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return badRequest(res, 'userId is required');
    }

    await authService.sendEmailOtp(userId);
    return ok(res, null, 'OTP sent to your email address');
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/auth/me ─────────────────────────────────────────────────────────
// Protected. Return the authenticated user's profile.
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const { userId } = req.user;

    const prisma = require('../config/prisma');
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
      const { notFound } = require('../utils/response');
      return notFound(res, 'User not found');
    }

    return ok(res, user);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/auth/logout ────────────────────────────────────────────────────
// Protected. Log the user out and record an audit event.
router.post('/logout', authenticate, async (req, res, next) => {
  try {
    const { userId, email } = req.user;

    await auditService.log({
      userId,
      userEmail: email,
      action: auditService.AuditAction.LOGOUT,
      resource: auditService.AuditResource.AUTH,
      resourceId: userId,
    });

    return ok(res, null, 'Logged out successfully');
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/auth/totp-setup ─────────────────────────────────────────────────
// Protected. Initiate TOTP setup and return QR URI + secret.
router.get('/totp-setup', authenticate, async (req, res, next) => {
  try {
    const result = await authService.setupTotp(req.user.userId);
    return ok(res, result, 'Scan the QR code with your authenticator app');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/auth/verify-totp-setup ────────────────────────────────────────
// Protected. Confirm TOTP setup by verifying the first code.
router.post('/verify-totp-setup', authenticate, async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return badRequest(res, 'code is required');
    }

    const result = await authService.verifyTotpSetup({ userId: req.user.userId, code });
    return ok(res, result, 'TOTP authentication has been enabled on your account');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/auth/change-password ──────────────────────────────────────────
// Protected. Change the authenticated user's password.
router.post('/change-password', authenticate, async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return badRequest(res, 'currentPassword and newPassword are required');
    }

    if (newPassword.length < 8) {
      return badRequest(res, 'newPassword must be at least 8 characters long');
    }

    const result = await authService.changePassword({
      userId: req.user.userId,
      currentPassword,
      newPassword,
    });

    return ok(res, result, 'Password changed successfully');
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/auth/invitation/:token ─────────────────────────────────────────
// Public. Retrieve invitation details to pre-fill the acceptance form.
router.get('/invitation/:token', async (req, res, next) => {
  try {
    const invitation = await authService.getInvitation(req.params.token);
    return ok(res, invitation);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/auth/accept-invitation ────────────────────────────────────────
// Public. Accept a tenant invitation and create the user account.
router.post('/accept-invitation', async (req, res, next) => {
  try {
    const { token, password, name } = req.body;

    if (!token || !password || !name) {
      return badRequest(res, 'token, password, and name are required');
    }

    if (password.length < 8) {
      return badRequest(res, 'password must be at least 8 characters long');
    }

    const result = await authService.acceptInvitation({ token, password, name });
    return created(res, result, 'Account created successfully');
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
