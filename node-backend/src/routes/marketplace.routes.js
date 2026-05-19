'use strict';

const { Router } = require('express');
const marketplaceService = require('../services/vendorMarketplace.service');
const { authenticate } = require('../middleware/auth');
const R = require('../utils/response');

const router = Router();

// ─── GET /vendors — browse marketplace vendors (public) ───────────────────────
router.get('/vendors', async (req, res, next) => {
  try {
    const { category, search, minPrice, maxPrice, page, size } = req.query;

    const result = await marketplaceService.browseVendors({
      category: category || undefined,
      search: search || undefined,
      minPrice: minPrice !== undefined ? parseFloat(minPrice) : undefined,
      maxPrice: maxPrice !== undefined ? parseFloat(maxPrice) : undefined,
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 20,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /vendors/:vendorId — vendor public profile (public) ──────────────────
router.get('/vendors/:vendorId', async (req, res, next) => {
  try {
    const profile = await marketplaceService.getVendorPublicProfile(req.params.vendorId);
    return R.ok(res, profile);
  } catch (err) {
    next(err);
  }
});

// ─── GET /vendors/:vendorId/reviews — vendor reviews (public) ────────────────
router.get('/vendors/:vendorId/reviews', async (req, res, next) => {
  try {
    const { page, size } = req.query;
    const result = await marketplaceService.getVendorReviews(req.params.vendorId, {
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 20,
    });
    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /vendors/:vendorId/reviews — create review (auth) ──────────────────
router.post('/vendors/:vendorId/reviews', authenticate, async (req, res, next) => {
  try {
    const { rating, title, body, eventId } = req.body;
    if (rating === undefined || rating === null) {
      return R.badRequest(res, 'rating is required');
    }

    const review = await marketplaceService.createReview({
      vendorId: req.params.vendorId,
      userId: req.user.userId,
      eventId: eventId || undefined,
      rating: parseInt(rating, 10),
      title: title || undefined,
      body: body || undefined,
    });

    return R.created(res, review, 'Review submitted successfully');
  } catch (err) {
    next(err);
  }
});

// ─── POST /vendors/:vendorId/inquiries — create inquiry (auth) ───────────────
router.post('/vendors/:vendorId/inquiries', authenticate, async (req, res, next) => {
  try {
    const { message, budget, eventDate, eventId } = req.body;

    const inquiry = await marketplaceService.createInquiry({
      vendorId: req.params.vendorId,
      userId: req.user.userId,
      eventId: eventId || undefined,
      message: message || undefined,
      budget: budget !== undefined ? parseFloat(budget) : undefined,
      eventDate: eventDate || undefined,
    });

    return R.created(res, inquiry, 'Inquiry sent successfully');
  } catch (err) {
    next(err);
  }
});

// ─── GET /inquiries — my inquiries (auth) ────────────────────────────────────
router.get('/inquiries', authenticate, async (req, res, next) => {
  try {
    const { page, size } = req.query;

    const result = await marketplaceService.listMyInquiries(req.user.userId, {
      page: page ? parseInt(page, 10) : 1,
      size: size ? parseInt(size, 10) : 20,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /favorites/:vendorId — toggle favorite (auth) ──────────────────────
router.post('/favorites/:vendorId', authenticate, async (req, res, next) => {
  try {
    const result = await marketplaceService.toggleFavorite({
      userId: req.user.userId,
      vendorId: req.params.vendorId,
    });
    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /favorites — list favorites (auth) ───────────────────────────────────
router.get('/favorites', authenticate, async (req, res, next) => {
  try {
    const favorites = await marketplaceService.listFavorites(req.user.userId);
    return R.ok(res, favorites);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
