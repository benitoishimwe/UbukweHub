'use strict';

const { Router } = require('express');
const transactionService = require('../services/transaction.service');
const { authenticate } = require('../middleware/auth');
const { Roles } = require('../middleware/rbac');
const R = require('../utils/response');

const router = Router();

// ─── GET / — list transactions ────────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const { type, itemId, eventId, staffId, page, size } = req.query;

    const result = await transactionService.listTransactions({
      tenantId,
      type: type || undefined,
      itemId: itemId || undefined,
      eventId: eventId || undefined,
      staffId: staffId || undefined,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 20,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST / — create transaction ─────────────────────────────────────────────
router.post('/', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const { type, itemId, eventId, eventName, staffId, staffName, quantity, photo, returnDate } = req.body;

    if (!type)   return R.badRequest(res, 'Transaction type is required');
    if (!itemId) return R.badRequest(res, 'Item ID is required');
    if (!quantity || Number(quantity) < 1) return R.badRequest(res, 'Quantity must be a positive integer');

    const transaction = await transactionService.createTransaction({
      tenantId,
      type,
      itemId,
      eventId,
      eventName,
      staffId,
      staffName,
      quantity,
      photo,
      returnDate,
    });

    return R.created(res, transaction, 'Transaction recorded successfully');
  } catch (err) {
    next(err);
  }
});

// ─── GET /stats — transaction stats ──────────────────────────────────────────
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const stats = await transactionService.getTransactionStats(tenantId);
    return R.ok(res, stats);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:id — get transaction ───────────────────────────────────────────────
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const transaction = await transactionService.getTransactionById(req.params.id, tenantId);
    return R.ok(res, transaction);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
