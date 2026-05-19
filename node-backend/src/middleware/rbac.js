'use strict';

const { forbidden, unauthorized } = require('../utils/response');

/**
 * Role constants — single source of truth for role names used throughout the app.
 */
const Roles = {
  SUPER_ADMIN: 'super_admin',
  TENANT_ADMIN: 'tenant_admin',
  EVENT_MANAGER: 'event_manager',
  STAFF: 'staff',
  CLIENT: 'client',
  VENDOR: 'vendor',
};

/**
 * Build middleware that allows access only to users whose role is in the
 * provided list.  Requires `authenticate` middleware to have run first.
 *
 * Usage:
 *   router.delete('/event/:id', authenticate, requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN), handler)
 *
 * @param {...string} roles - Allowed role values
 * @returns {import('express').RequestHandler}
 */
function requireRole(...roles) {
  if (roles.length === 0) {
    throw new Error('requireRole() must be called with at least one role');
  }

  return function rbacMiddleware(req, res, next) {
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }

    if (!roles.includes(req.user.role)) {
      return forbidden(
        res,
        `Access denied. Required role: ${roles.join(' or ')}`
      );
    }

    return next();
  };
}

/**
 * Alias for requireRole — more expressive when multiple roles are allowed.
 *
 * Usage:
 *   router.get('/staff', authenticate, requireAnyOf(Roles.TENANT_ADMIN, Roles.STAFF), handler)
 */
const requireAnyOf = requireRole;

module.exports = {
  Roles,
  requireRole,
  requireAnyOf,
};
