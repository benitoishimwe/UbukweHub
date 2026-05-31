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

// ─── POST /me/init — vendor self-registration on first signup ────────────────
router.post('/me/init', authenticate, async (req, res, next) => {
  try {
    const { name, category, phone, location, country } = req.body;
    if (!category) return R.badRequest(res, 'Please select a business category');
    const vendor = await vendorService.selfCreateVendor(req.user.userId, { name, category, phone, location, country });
    return R.created(res, vendor, 'Vendor profile created — welcome to Plani!');
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

// ─── POST / — create vendor (super_admin platform-level only) ────────────────
router.post(
  '/',
  authenticate,
  requireRole(Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.tenantId || req.body.tenantId;
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

// ─── GET /accept-invite — preview vendor invite info ─────────────────────────
router.get('/accept-invite', async (req, res, next) => {
  try {
    const { token } = req.query;
    if (!token) return R.badRequest(res, 'token is required');
    const invitationService = require('../services/invitation.service');
    const preview = await invitationService.previewVendorInvitation(token);
    return R.ok(res, preview);
  } catch (err) {
    next(err);
  }
});

// ─── POST /accept-invite — accept vendor invitation, create account ───────────
router.post('/accept-invite', async (req, res, next) => {
  try {
    const { token, name, password, businessName, category, phone, location, country, description } = req.body;
    if (!token) return R.badRequest(res, 'token is required');
    if (!name) return R.badRequest(res, 'name is required');
    if (!password || password.length < 8) return R.badRequest(res, 'password must be at least 8 characters');
    if (!businessName) return R.badRequest(res, 'businessName is required');
    if (!category) return R.badRequest(res, 'category is required');

    const result = await vendorService.acceptVendorInvite({
      token, name, password, businessName, category, phone, location, country, description,
    });
    return R.created(res, result, 'Vendor account created — welcome to Plani!');
  } catch (err) {
    next(err);
  }
});

// ─── Vendor Portal routes (must be declared BEFORE /:vendorId) ───────────────

router.get('/portal/profile', authenticate, async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user.userId);
    if (!vendor) return R.notFound(res, 'No vendor profile linked to your account');
    return R.ok(res, vendor);
  } catch (err) { next(err); }
});

router.patch('/portal/profile', authenticate, async (req, res, next) => {
  try {
    const vendor = await vendorService.updateVendorSelf(req.user.userId, req.body);
    return R.ok(res, vendor, 'Profile updated');
  } catch (err) { next(err); }
});

router.patch('/portal/profile/toggle-public', authenticate, async (req, res, next) => {
  try {
    const result = await vendorService.togglePublicVisibility(req.user.userId);
    return R.ok(res, result, result.isPublic ? 'Now visible in marketplace' : 'Removed from marketplace');
  } catch (err) { next(err); }
});

router.get('/portal/onboarding', authenticate, async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user.userId);
    if (!vendor) return R.notFound(res, 'No vendor profile linked to your account');
    const onboarding = await vendorService.getVendorOnboarding(vendor.vendorId);
    return R.ok(res, { vendor: { vendorId: vendor.vendorId, onboardingComplete: vendor.onboardingComplete }, onboarding });
  } catch (err) { next(err); }
});

router.post('/portal/onboarding/step', authenticate, async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user.userId);
    if (!vendor) return R.notFound(res, 'No vendor profile linked to your account');
    const { step } = req.body;
    if (!step) return R.badRequest(res, 'step is required');
    const result = await vendorService.completeOnboardingStep(vendor.vendorId, step);
    return R.ok(res, result, 'Step completed');
  } catch (err) { next(err); }
});

router.get('/portal/analytics', authenticate, async (req, res, next) => {
  try {
    const days = req.query.days ? parseInt(req.query.days, 10) : 30;
    const result = await vendorService.getVendorPortalAnalytics(req.user.userId, days);
    return R.ok(res, result);
  } catch (err) { next(err); }
});

router.get('/portal/reviews', authenticate, async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user.userId);
    if (!vendor) return R.notFound(res, 'No vendor profile linked to your account');
    const { page, size } = req.query;
    const result = await vendorService.getVendorReviewsByVendorId(vendor.vendorId, {
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 10,
    });
    return R.ok(res, result);
  } catch (err) { next(err); }
});

router.get('/portal/inquiries', authenticate, async (req, res, next) => {
  try {
    const vendor = await vendorService.getVendorByUserId(req.user.userId);
    if (!vendor) return R.notFound(res, 'No vendor profile linked to your account');
    const { page, size } = req.query;
    const result = await vendorService.getVendorInquiriesByVendorId(vendor.vendorId, {
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 10,
    });
    return R.ok(res, result);
  } catch (err) { next(err); }
});

router.patch('/portal/inquiries/:id/mark-read', authenticate, async (req, res, next) => {
  try {
    const inquiry = await vendorService.markInquiryRead(req.params.id, req.user.userId);
    return R.ok(res, inquiry, 'Inquiry marked as read');
  } catch (err) { next(err); }
});

// ─── Admin action routes (declare before /:vendorId to avoid ambiguity) ──────

router.post(
  '/:vendorId/approve',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
      if (!tenantId && req.user.role !== Roles.SUPER_ADMIN) return R.badRequest(res, 'Tenant context required');
      const vendor = await vendorService.approveVendor(req.params.vendorId, tenantId);
      return R.ok(res, vendor, 'Vendor approved for marketplace');
    } catch (err) { next(err); }
  }
);

router.post(
  '/:vendorId/reject',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
      if (!tenantId && req.user.role !== Roles.SUPER_ADMIN) return R.badRequest(res, 'Tenant context required');
      const vendor = await vendorService.rejectVendor(req.params.vendorId, tenantId, req.body.reason);
      return R.ok(res, vendor, 'Vendor rejected');
    } catch (err) { next(err); }
  }
);

router.patch(
  '/:vendorId/internal-notes',
  authenticate,
  requireRole(Roles.TENANT_ADMIN, Roles.SUPER_ADMIN),
  async (req, res, next) => {
    try {
      const tenantId = req.user.role === Roles.SUPER_ADMIN ? null : req.user.tenantId;
      if (!tenantId && req.user.role !== Roles.SUPER_ADMIN) return R.badRequest(res, 'Tenant context required');
      const vendor = await vendorService.updateInternalNotes(req.params.vendorId, tenantId, req.body.notes);
      return R.ok(res, vendor, 'Notes updated');
    } catch (err) { next(err); }
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
