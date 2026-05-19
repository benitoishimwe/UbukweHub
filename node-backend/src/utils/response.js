'use strict';

/**
 * Centralised HTTP response helpers.
 * Every helper returns the Express Response so callers can chain if needed.
 */

/**
 * 200 OK
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 */
function ok(res, data, message) {
  return res.status(200).json({
    data: data !== undefined ? data : null,
    message: message || 'Success',
  });
}

/**
 * 201 Created
 * @param {import('express').Response} res
 * @param {*} data
 * @param {string} [message]
 */
function created(res, data, message) {
  return res.status(201).json({
    data: data !== undefined ? data : null,
    message: message || 'Created',
  });
}

/**
 * 204 No Content
 * @param {import('express').Response} res
 */
function noContent(res) {
  return res.status(204).end();
}

/**
 * 400 Bad Request
 * @param {import('express').Response} res
 * @param {string} [message]
 */
function badRequest(res, message) {
  return res.status(400).json({
    error: 'BAD_REQUEST',
    message: message || 'Bad request',
  });
}

/**
 * 401 Unauthorized
 * @param {import('express').Response} res
 * @param {string} [message]
 */
function unauthorized(res, message) {
  return res.status(401).json({
    error: 'UNAUTHORIZED',
    message: message || 'Authentication required',
  });
}

/**
 * 402 Payment Required — feature not available on current plan.
 * @param {import('express').Response} res
 * @param {string} featureKey  - Machine-readable feature identifier
 * @param {string} [message]
 */
function paymentRequired(res, featureKey, message) {
  return res.status(402).json({
    error: 'PAYMENT_REQUIRED',
    feature_key: featureKey || null,
    message: message || 'This feature requires a paid subscription',
  });
}

/**
 * 403 Forbidden
 * @param {import('express').Response} res
 * @param {string} [message]
 */
function forbidden(res, message) {
  return res.status(403).json({
    error: 'FORBIDDEN',
    message: message || 'You do not have permission to perform this action',
  });
}

/**
 * 404 Not Found
 * @param {import('express').Response} res
 * @param {string} [message]
 */
function notFound(res, message) {
  return res.status(404).json({
    error: 'NOT_FOUND',
    message: message || 'Resource not found',
  });
}

/**
 * 409 Conflict
 * @param {import('express').Response} res
 * @param {string} [message]
 */
function conflict(res, message) {
  return res.status(409).json({
    error: 'CONFLICT',
    message: message || 'Resource already exists',
  });
}

/**
 * 500 Internal Server Error
 * @param {import('express').Response} res
 * @param {string} [message]
 */
function serverError(res, message) {
  return res.status(500).json({
    error: 'INTERNAL_SERVER_ERROR',
    message: message || 'An unexpected error occurred',
  });
}

module.exports = {
  ok,
  created,
  noContent,
  badRequest,
  unauthorized,
  paymentRequired,
  forbidden,
  notFound,
  conflict,
  serverError,
};
