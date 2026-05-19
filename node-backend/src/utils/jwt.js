'use strict';

const jwt = require('jsonwebtoken');
const config = require('../config/env');

const SECRET = config.jwt.secretKey;
const DEFAULT_EXPIRY_SECONDS = config.jwt.expirationHours * 3600;

/**
 * Issue a standard application JWT.
 *
 * @param {string} userId
 * @param {string} role
 * @param {string} email
 * @param {string|null} tenantId
 * @returns {string} Signed JWT
 */
function createToken(userId, role, email, tenantId) {
  const payload = {
    sub: userId,
    role,
    email,
    tenantId: tenantId || null,
    type: 'access',
  };

  return jwt.sign(payload, SECRET, {
    expiresIn: DEFAULT_EXPIRY_SECONDS,
    algorithm: 'HS256',
  });
}

/**
 * Issue a short-lived impersonation token used by SUPER_ADMIN.
 *
 * @param {string} userId          - The user being impersonated
 * @param {string} role            - Role of the impersonated user
 * @param {string} email           - Email of the impersonated user
 * @param {string|null} tenantId
 * @param {string} impersonatedBy  - userId of the admin performing impersonation
 * @returns {string} Signed JWT (1-hour expiry)
 */
function createImpersonationToken(userId, role, email, tenantId, impersonatedBy) {
  const payload = {
    sub: userId,
    role,
    email,
    tenantId: tenantId || null,
    type: 'impersonation',
    impersonatedBy,
  };

  return jwt.sign(payload, SECRET, {
    expiresIn: 3600, // 1 hour
    algorithm: 'HS256',
  });
}

/**
 * Verify a token and return its decoded payload.
 * Throws a JsonWebTokenError / TokenExpiredError on failure.
 *
 * @param {string} token
 * @returns {object} Decoded payload
 */
function validateAndExtract(token) {
  return jwt.verify(token, SECRET, { algorithms: ['HS256'] });
}

/**
 * Extract the raw bearer token string from an Express request.
 * Returns null if the header is absent or malformed.
 *
 * @param {import('express').Request} req
 * @returns {string|null}
 */
function extractBearer(req) {
  const authHeader = req.headers['authorization'] || req.headers['Authorization'];
  if (!authHeader) return null;

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') return null;

  return parts[1] || null;
}

module.exports = {
  createToken,
  createImpersonationToken,
  validateAndExtract,
  extractBearer,
};
