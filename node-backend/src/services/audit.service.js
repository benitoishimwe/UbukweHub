'use strict';

const prisma = require('../config/prisma');

/**
 * Valid audit action constants.
 */
const AuditAction = Object.freeze({
  CREATE: 'create',
  UPDATE: 'update',
  DELETE: 'delete',
  LOGIN: 'login',
  LOGOUT: 'logout',
  MFA_SETUP: 'mfa_setup',
  MFA_VERIFY: 'mfa_verify',
  REGISTER: 'register',
  PASSWORD_CHANGE: 'password_change',
  IMPERSONATE: 'impersonate',
});

/**
 * Valid audit resource constants.
 */
const AuditResource = Object.freeze({
  USER: 'user',
  INVENTORY: 'inventory',
  TRANSACTION: 'transaction',
  EVENT: 'event',
  VENDOR: 'vendor',
  ALBUM: 'album',
  SUBSCRIPTION: 'subscription',
  TENANT: 'tenant',
  AUTH: 'auth',
});

/**
 * Persist an audit log entry asynchronously.
 * Errors are silently swallowed so that audit failures never interrupt
 * the primary request flow.
 *
 * @param {object} params
 * @param {string}      params.userId      - ID of the actor performing the action
 * @param {string}      params.userEmail   - Email of the actor
 * @param {string}      params.action      - One of AuditAction values
 * @param {string}      params.resource    - One of AuditResource values
 * @param {string}      [params.resourceId] - ID of the affected resource
 * @param {object}      [params.details]   - Arbitrary extra details (stored as JSON)
 * @param {string}      [params.ipAddress] - IP address of the request
 * @returns {Promise<void>}
 */
async function log({ userId, userEmail, action, resource, resourceId, details, ipAddress }) {
  try {
    await prisma.auditLog.create({
      data: {
        userId: userId || null,
        userEmail: userEmail || null,
        action,
        resource,
        resourceId: resourceId || null,
        details: details ? JSON.parse(JSON.stringify(details)) : null,
        ipAddress: ipAddress || null,
      },
    });
  } catch (err) {
    // Audit must never break the main flow — log and swallow
    console.error('[audit.service] Failed to write audit log:', err.message);
  }
}

module.exports = {
  log,
  AuditAction,
  AuditResource,
};
