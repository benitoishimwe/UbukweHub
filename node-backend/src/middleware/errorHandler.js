'use strict';

const config = require('../config/env');

/**
 * Custom application error class.
 * Throw this anywhere in the app to produce a deterministic HTTP response.
 *
 * @example
 *   throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
 */
class AppError extends Error {
  /**
   * @param {string} message    - Human-readable error message
   * @param {number} statusCode - HTTP status code (default 500)
   * @param {string} [code]     - Machine-readable error code (optional)
   */
  constructor(message, statusCode = 500, code) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code || null;
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Map Prisma client error codes to HTTP status codes.
 *
 * @param {Error} err
 * @returns {{ statusCode: number, message: string, code: string } | null}
 */
function mapPrismaError(err) {
  // Prisma known request errors carry a `code` property
  if (err.constructor?.name !== 'PrismaClientKnownRequestError') return null;

  switch (err.code) {
    case 'P2002': {
      // Unique constraint violation
      const fields = err.meta?.target
        ? (Array.isArray(err.meta.target) ? err.meta.target.join(', ') : err.meta.target)
        : 'field';
      return {
        statusCode: 409,
        message: `A record with this ${fields} already exists`,
        code: 'UNIQUE_CONSTRAINT_VIOLATION',
      };
    }
    case 'P2025':
      // Record not found (e.g. update/delete on non-existent row)
      return {
        statusCode: 404,
        message: err.meta?.cause || 'Record not found',
        code: 'RECORD_NOT_FOUND',
      };
    case 'P2003':
      return {
        statusCode: 409,
        message: 'Foreign key constraint failed — referenced record does not exist',
        code: 'FOREIGN_KEY_CONSTRAINT',
      };
    case 'P2014':
      return {
        statusCode: 409,
        message: 'The change you are trying to make would violate a required relation',
        code: 'RELATION_VIOLATION',
      };
    default:
      return null;
  }
}

/**
 * Global Express error-handling middleware.
 * Must be registered AFTER all routes and other middleware.
 *
 * @type {import('express').ErrorRequestHandler}
 */
// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // ── AppError (intentionally thrown) ────────────────────────────────────────
  if (err instanceof AppError) {
    const body = {
      error: err.code || 'APPLICATION_ERROR',
      message: err.message,
    };
    if (config.isDevelopment) {
      body.stack = err.stack;
    }
    return res.status(err.statusCode).json(body);
  }

  // ── JWT errors ──────────────────────────────────────────────────────────────
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      error: 'INVALID_TOKEN',
      message: 'Invalid authentication token',
    });
  }
  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      error: 'TOKEN_EXPIRED',
      message: 'Authentication token has expired',
    });
  }

  // ── Express body-parser errors ──────────────────────────────────────────────
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({
      error: 'INVALID_JSON',
      message: 'Request body contains invalid JSON',
    });
  }
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'PAYLOAD_TOO_LARGE',
      message: 'Request payload is too large',
    });
  }

  // ── Prisma errors ───────────────────────────────────────────────────────────
  const prismaMapping = mapPrismaError(err);
  if (prismaMapping) {
    return res.status(prismaMapping.statusCode).json({
      error: prismaMapping.code,
      message: prismaMapping.message,
    });
  }

  // ── Prisma validation error ─────────────────────────────────────────────────
  if (err.constructor?.name === 'PrismaClientValidationError') {
    return res.status(400).json({
      error: 'VALIDATION_ERROR',
      message: config.isDevelopment
        ? err.message
        : 'Invalid data provided to the database layer',
    });
  }

  // ── Multer errors ────────────────────────────────────────────────────────────
  if (err.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({
      error: 'FILE_TOO_LARGE',
      message: 'Uploaded file exceeds the maximum allowed size',
    });
  }
  if (err.code === 'LIMIT_UNEXPECTED_FILE') {
    return res.status(400).json({
      error: 'UNEXPECTED_FILE_FIELD',
      message: `Unexpected file field: ${err.field}`,
    });
  }

  // ── Unhandled / unknown errors ───────────────────────────────────────────────
  const statusCode = err.statusCode || err.status || 500;

  // Log unexpected server errors
  if (statusCode >= 500) {
    console.error('[ErrorHandler] Unhandled error:', err);
  }

  const body = {
    error: 'INTERNAL_SERVER_ERROR',
    message: config.isProduction
      ? 'An unexpected error occurred. Please try again later.'
      : err.message || 'Internal server error',
  };

  if (config.isDevelopment) {
    body.stack = err.stack;
  }

  return res.status(statusCode).json(body);
}

module.exports = { errorHandler, AppError };
