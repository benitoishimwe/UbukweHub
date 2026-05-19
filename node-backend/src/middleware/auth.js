'use strict';

const { validateAndExtract, extractBearer } = require('../utils/jwt');
const { unauthorized } = require('../utils/response');
const prisma = require('../config/prisma');

/**
 * Resolves the authenticated user from either:
 *   1. `Authorization: Bearer <jwt>` header
 *   2. `session_token` cookie (falls back to a DB lookup in user_sessions)
 *
 * Returns a normalised user object or null if no valid credential is present.
 *
 * @param {import('express').Request} req
 * @returns {Promise<{userId:string, email:string, role:string, tenantId:string|null}|null>}
 */
async function resolveUser(req) {
  // ── 1. Try JWT from Authorization header ──────────────────────────────────
  const bearerToken = extractBearer(req);
  if (bearerToken) {
    try {
      const decoded = validateAndExtract(bearerToken);
      return {
        userId: decoded.sub,
        email: decoded.email,
        role: decoded.role,
        tenantId: decoded.tenantId || null,
        impersonatedBy: decoded.impersonatedBy || null,
        tokenType: decoded.type || 'access',
      };
    } catch {
      // Invalid / expired JWT — fall through to session token check
    }
  }

  // ── 2. Try session_token cookie (or query param for compatibility) ─────────
  const sessionToken =
    (req.cookies && req.cookies.session_token) ||
    req.headers['x-session-token'] ||
    null;

  if (sessionToken) {
    try {
      const session = await prisma.userSession.findUnique({
        where: { sessionToken },
        include: {
          user: {
            select: {
              userId: true,
              email: true,
              role: true,
              tenantId: true,
              isActive: true,
            },
          },
        },
      });

      if (!session) return null;
      if (session.expiresAt < new Date()) return null;
      if (!session.user || !session.user.isActive) return null;

      return {
        userId: session.user.userId,
        email: session.user.email,
        role: session.user.role,
        tenantId: session.user.tenantId || null,
        tokenType: 'session',
      };
    } catch {
      return null;
    }
  }

  return null;
}

/**
 * Required authentication middleware.
 * Responds with 401 if no valid credential is found.
 */
async function authenticate(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (!user) {
      return unauthorized(res, 'Authentication required. Please provide a valid token.');
    }
    req.user = user;
    return next();
  } catch (err) {
    return next(err);
  }
}

/**
 * Optional authentication middleware.
 * Sets req.user if a valid credential is present; otherwise continues without
 * setting req.user. Never rejects the request.
 */
async function optionalAuth(req, res, next) {
  try {
    const user = await resolveUser(req);
    if (user) {
      req.user = user;
    }
    return next();
  } catch {
    // Swallow errors in optional auth — just continue unauthenticated
    return next();
  }
}

module.exports = { authenticate, optionalAuth };
