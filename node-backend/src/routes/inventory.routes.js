'use strict';

const { Router } = require('express');
const inventoryService = require('../services/inventory.service');
const { authenticate } = require('../middleware/auth');
const { requireRole, Roles } = require('../middleware/rbac');
const R = require('../utils/response');

const router = Router();

// ─── GET / — list items ───────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    if (!tenantId && req.user.role !== Roles.SUPER_ADMIN) {
      return R.badRequest(res, 'Tenant context required');
    }

    const { category, condition, search, page, size } = req.query;

    const result = await inventoryService.listItems({
      tenantId,
      category: category || undefined,
      condition: condition || undefined,
      search: search || undefined,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 20,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST / — create item ─────────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) return R.badRequest(res, 'Tenant context required');

      const { name, category, barcode, quantity, condition, purchasePrice, rentalPrice, photos } = req.body;
      if (!name) return R.badRequest(res, 'Item name is required');

      const item = await inventoryService.createItem({
        tenantId,
        name,
        category,
        barcode,
        quantity,
        condition,
        purchasePrice,
        rentalPrice,
        photos,
      });

      return R.created(res, item, 'Inventory item created successfully');
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /stats — inventory stats ────────────────────────────────────────────
router.get('/stats', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const stats = await inventoryService.getInventoryStats(tenantId);
    return R.ok(res, stats);
  } catch (err) {
    next(err);
  }
});

// ─── GET /categories — list categories ───────────────────────────────────────
router.get('/categories', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const categories = await inventoryService.getCategories(tenantId);
    return R.ok(res, categories);
  } catch (err) {
    next(err);
  }
});

// ─── GET /scan/:code — shorthand alias (frontend uses this form) ──────────────
router.get('/scan/:code', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const item = await inventoryService.getItemByQrCode(req.params.code, tenantId)
      .catch(() => inventoryService.getItemByBarcode(req.params.code, tenantId));
    return R.ok(res, item);
  } catch (err) {
    next(err);
  }
});

// ─── GET /scan/qr/:qrCode — get item by QR code ──────────────────────────────
router.get('/scan/qr/:qrCode', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const item = await inventoryService.getItemByQrCode(req.params.qrCode, tenantId);
    return R.ok(res, item);
  } catch (err) {
    next(err);
  }
});

// ─── GET /scan/barcode/:barcode — get item by barcode ────────────────────────
router.get('/scan/barcode/:barcode', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const item = await inventoryService.getItemByBarcode(req.params.barcode, tenantId);
    return R.ok(res, item);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:itemId — get item ──────────────────────────────────────────────────
router.get('/:itemId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const item = await inventoryService.getItemById(req.params.itemId, tenantId);
    return R.ok(res, item);
  } catch (err) {
    next(err);
  }
});

// ─── PUT /:itemId — update item (alias for PATCH, used by frontend) ──────────
router.put(
  '/:itemId',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
      const item = await inventoryService.updateItem(req.params.itemId, tenantId, req.body);
      return R.ok(res, item, 'Inventory item updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /:itemId — update item ────────────────────────────────────────────
router.patch(
  '/:itemId',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
      const item = await inventoryService.updateItem(req.params.itemId, tenantId, req.body);
      return R.ok(res, item, 'Inventory item updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /:itemId — soft-delete item ──────────────────────────────────────
router.delete(
  '/:itemId',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
      await inventoryService.deleteItem(req.params.itemId, tenantId);
      return res.status(204).end();
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /:itemId/qrcode — download QR code PNG ──────────────────────────────
router.get('/:itemId/qrcode', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const buffer = await inventoryService.generateItemQrCode(req.params.itemId, tenantId);

    res.setHeader('Content-Type', 'image/png');
    res.setHeader('Content-Disposition', `attachment; filename="PRANI-QR-${req.params.itemId}.png"`);
    res.setHeader('Content-Length', buffer.length);
    return res.end(buffer);
  } catch (err) {
    next(err);
  }
});

// ─── GET /:itemId/qrcode/data — QR code as base64 JSON (for inline display) ──
router.get('/:itemId/qrcode/data', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
    const data = await inventoryService.getItemQrData(req.params.itemId, tenantId);
    return R.ok(res, data);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
