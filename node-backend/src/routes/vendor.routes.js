'use strict';

const { Router } = require('express');
const vendorService = require('../services/vendor.service');
const { authenticate } = require('../middleware/auth');
const { requireRole, Roles } = require('../middleware/rbac');
const R = require('../utils/response');
const { AppError } = require('../middleware/errorHandler');

const router = Router();

// ─── GET /me — vendor's own profile ──────────────────────────────────────────
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user.userId);
    if (!vendor) return R.notFound(res, 'No vendor profile linked to your account');
    return R.ok(res, vendor);
  } catch (err) {
    next(err);
  }
});

// ─── GET /me/reviews — reviews received by the vendor ────────────────────────
router.get('/me/reviews', authenticate, async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user.userId);
    if (!vendor) return R.notFound(res, 'No vendor profile linked to your account');

    const { page, size } = req.query;
    const result = await vendorService.getVendorReviewsByVendorId(vendor.vendorId, {
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 10,
    });
    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /me — vendor self-update ──────────────────────────────────────────
router.patch('/me', authenticate, async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendorSelf(req.user.userId, req.body);
    return R.ok(res, vendor, 'Profile updated');
  } catch (err) {
    next(err);
  }
});

// ─── GET /me/inquiries — inquiries received by the vendor ─────────────────────
router.get('/me/inquiries', authenticate, async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user.userId);
    if (!vendor) return R.notFound(res, 'No vendor profile linked to your account');

    const { page, size } = req.query;
    const result = await vendorService.getVendorInquiriesByVendorId(vendor.vendorId, {
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 10,
    });
    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── GET / — list vendors ────────────────────────────────────────────────────
router.get('/', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const { category, isActive, search, page, size } = req.query;

    const result = await vendorService.listVendors({
      tenantId,
      category: category || undefined,
      isActive: isActive !== undefined ? isActive === 'true' : undefined,
      search: search || undefined,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 20,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST / — create vendor ───────────────────────────────────────────────────
router.post(
  '/',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) return R.badRequest(res, 'Tenant context required');

      const { name, category, contactName, email, phone, location } = req.body;
      if (!name) return R.badRequest(res, 'Vendor name is required');
      if (!category) return R.badRequest(res, 'Vendor category is required');

      const vendor = await vendorService.createVendor({
        tenantId,
        name,
        category,
        contactName,
        email,
        phone,
        location,
      });

      return R.created(res, vendor, 'Vendor created successfully');
    } catch (err) {
      next(err);
    }
  }
);

// ─── GET /:vendorId — get vendor ──────────────────────────────────────────────
router.get('/:vendorId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const vendor = await vendorService.getVendorById(req.params.vendorId, tenantId);
    return R.ok(res, vendor);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /:vendorId — update vendor ────────────────────────────────────────
router.patch(
  '/:vendorId',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) return R.badRequest(res, 'Tenant context required');

      const vendor = await vendorService.updateVendor(req.params.vendorId, tenantId, req.body);
      return R.ok(res, vendor, 'Vendor updated successfully');
    } catch (err) {
      next(err);
    }
  }
);

// ─── DELETE /:vendorId — soft-delete vendor ───────────────────────────────────
router.delete(
  '/:vendorId',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId;
      if (!tenantId) return R.badRequest(res, 'Tenant context required');

      await vendorService.deleteVendor(req.params.vendorId, tenantId);
      return R.noContent(res);
    } catch (err) {
      next(err);
    }
  }
);

// ─── PATCH /:vendorId/profile — update vendor profile ────────────────────────
router.patch('/:vendorId/profile', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const profile = await vendorService.updateVendorProfile(
      req.params.vendorId,
      tenantId,
      req.body
    );
    return R.ok(res, profile, 'Vendor profile updated successfully');
  } catch (err) {
    next(err);
  }
});

// ─── POST /:vendorId/portfolio — add portfolio image ─────────────────────────
router.post('/:vendorId/portfolio', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const { imageUrl, caption, eventType, displayOrder } = req.body;
    if (!imageUrl) return R.badRequest(res, 'imageUrl is required');

    const entry = await vendorService.addPortfolioImage(req.params.vendorId, tenantId, {
      imageUrl,
      caption,
      eventType,
      displayOrder,
    });
    return R.created(res, entry, 'Portfolio image added');
  } catch (err) {
    next(err);
  }
});

// ─── DELETE /:vendorId/portfolio/:portfolioId — delete portfolio image ────────
router.delete('/:vendorId/portfolio/:portfolioId', authenticate, async (req, res, next) => {
  try {
    const tenantId = req.user.tenantId;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    await vendorService.deletePortfolioImage(
      req.params.portfolioId,
      req.params.vendorId,
      tenantId
    );
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
