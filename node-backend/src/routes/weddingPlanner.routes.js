'use strict';

const { Router } = require('express');
const plannerService = require('../services/weddingPlanner.service');
const { authenticate } = require('../middleware/auth');
const R = require('../utils/response');

const router = Router();

// All wedding planner routes require authentication
router.use(authenticate);

// ─── GET /plan — get or create plan ──────────────────────────────────────────
router.get('/plan', async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const { eventId } = req.query;
    const plan = await plannerService.getOrCreatePlan({ userId, tenantId, eventId });
    return R.ok(res, plan);
  } catch (err) {
    next(err);
  }
});

// ─── PATCH /plan/:planId — update plan ───────────────────────────────────────
router.patch('/plan/:planId', async (req, res, next) => {
  try {
    const plan = await plannerService.updatePlan(req.params.planId, req.user.userId, req.body);
    return R.ok(res, plan, 'Plan updated');
  } catch (err) {
    next(err);
  }
});

// ─── GET /plan/:planId/dashboard — dashboard summary ─────────────────────────
router.get('/plan/:planId/dashboard', async (req, res, next) => {
  try {
    const dashboard = await plannerService.getDashboard(req.params.planId, req.user.userId);
    return R.ok(res, dashboard);
  } catch (err) {
    next(err);
  }
});

// ─── Budget ───────────────────────────────────────────────────────────────────

// GET /plan/:planId/budget
router.get('/plan/:planId/budget', async (req, res, next) => {
  try {
    const result = await plannerService.listBudgetItems(req.params.planId, req.user.userId);
    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// POST /plan/:planId/budget
router.post('/plan/:planId/budget', async (req, res, next) => {
  try {
    const { category, description, estimatedCost, actualCost, vendorId, status, dueDate } = req.body;
    if (!category) return R.badRequest(res, 'category is required');

    const item = await plannerService.addBudgetItem(req.params.planId, req.user.userId, {
      category,
      description,
      estimatedCost,
      actualCost,
      vendorId,
      status,
      dueDate,
    });

    return R.created(res, item, 'Budget item added');
  } catch (err) {
    next(err);
  }
});

// PATCH /plan/:planId/budget/:itemId
router.patch('/plan/:planId/budget/:itemId', async (req, res, next) => {
  try {
    const item = await plannerService.updateBudgetItem(
      req.params.itemId,
      req.params.planId,
      req.body
    );
    return R.ok(res, item, 'Budget item updated');
  } catch (err) {
    next(err);
  }
});

// DELETE /plan/:planId/budget/:itemId
router.delete('/plan/:planId/budget/:itemId', async (req, res, next) => {
  try {
    await plannerService.deleteBudgetItem(req.params.itemId, req.params.planId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

// ─── Guests ───────────────────────────────────────────────────────────────────

// GET /plan/:planId/guests/stats — must be before /:guestId to avoid conflict
router.get('/plan/:planId/guests/stats', async (req, res, next) => {
  try {
    const stats = await plannerService.getGuestStats(req.params.planId);
    return R.ok(res, stats);
  } catch (err) {
    next(err);
  }
});

// GET /plan/:planId/guests
router.get('/plan/:planId/guests', async (req, res, next) => {
  try {
    const { rsvpStatus } = req.query;
    const guests = await plannerService.listGuests(req.params.planId, req.user.userId, {
      rsvpStatus: rsvpStatus || undefined,
    });
    return R.ok(res, guests);
  } catch (err) {
    next(err);
  }
});

// POST /plan/:planId/guests
router.post('/plan/:planId/guests', async (req, res, next) => {
  try {
    const { fullName, email, phone, rsvpStatus, mealChoice, dietaryRestrictions, tableNumber } =
      req.body;
    if (!fullName) return R.badRequest(res, 'fullName is required');

    const guest = await plannerService.addGuest(req.params.planId, req.user.userId, {
      fullName,
      email,
      phone,
      rsvpStatus,
      mealChoice,
      dietaryRestrictions,
      tableNumber,
    });

    return R.created(res, guest, 'Guest added');
  } catch (err) {
    next(err);
  }
});

// PATCH /plan/:planId/guests/:guestId
router.patch('/plan/:planId/guests/:guestId', async (req, res, next) => {
  try {
    const guest = await plannerService.updateGuest(
      req.params.guestId,
      req.params.planId,
      req.body
    );
    return R.ok(res, guest, 'Guest updated');
  } catch (err) {
    next(err);
  }
});

// DELETE /plan/:planId/guests/:guestId
router.delete('/plan/:planId/guests/:guestId', async (req, res, next) => {
  try {
    await plannerService.deleteGuest(req.params.guestId, req.params.planId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

// ─── Venues ───────────────────────────────────────────────────────────────────

// GET /plan/:planId/venues
router.get('/plan/:planId/venues', async (req, res, next) => {
  try {
    const venues = await plannerService.listVenues(req.params.planId);
    return R.ok(res, venues);
  } catch (err) {
    next(err);
  }
});

// POST /plan/:planId/venues
router.post('/plan/:planId/venues', async (req, res, next) => {
  try {
    const { name, address, contactName, contactPhone, capacity, rentalFee, includedItems, notes } =
      req.body;
    if (!name) return R.badRequest(res, 'Venue name is required');

    const venue = await plannerService.addVenue(req.params.planId, req.user.userId, {
      name,
      address,
      contactName,
      contactPhone,
      capacity,
      rentalFee,
      includedItems,
      notes,
    });

    return R.created(res, venue, 'Venue added');
  } catch (err) {
    next(err);
  }
});

// PATCH /plan/:planId/venues/:venueId
router.patch('/plan/:planId/venues/:venueId', async (req, res, next) => {
  try {
    const venue = await plannerService.updateVenue(
      req.params.venueId,
      req.params.planId,
      req.body
    );
    return R.ok(res, venue, 'Venue updated');
  } catch (err) {
    next(err);
  }
});

// DELETE /plan/:planId/venues/:venueId
router.delete('/plan/:planId/venues/:venueId', async (req, res, next) => {
  try {
    await plannerService.deleteVenue(req.params.venueId, req.params.planId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

// POST /plan/:planId/venues/:venueId/select
router.post('/plan/:planId/venues/:venueId/select', async (req, res, next) => {
  try {
    const venue = await plannerService.selectVenue(req.params.venueId, req.params.planId);
    return R.ok(res, venue, 'Venue selected');
  } catch (err) {
    next(err);
  }
});

// ─── Menu ─────────────────────────────────────────────────────────────────────

// GET /plan/:planId/menu
router.get('/plan/:planId/menu', async (req, res, next) => {
  try {
    const { course } = req.query;
    const items = await plannerService.listMenuItems(req.params.planId, course || undefined);
    return R.ok(res, items);
  } catch (err) {
    next(err);
  }
});

// POST /plan/:planId/menu
router.post('/plan/:planId/menu', async (req, res, next) => {
  try {
    const { course, name, description, dietaryInfo, isFinal } = req.body;
    if (!name) return R.badRequest(res, 'Menu item name is required');

    const item = await plannerService.addMenuItem(req.params.planId, req.user.userId, {
      course,
      name,
      description,
      dietaryInfo,
      isFinal,
    });

    return R.created(res, item, 'Menu item added');
  } catch (err) {
    next(err);
  }
});

// PATCH /plan/:planId/menu/:itemId
router.patch('/plan/:planId/menu/:itemId', async (req, res, next) => {
  try {
    const item = await plannerService.updateMenuItem(
      req.params.itemId,
      req.params.planId,
      req.body
    );
    return R.ok(res, item, 'Menu item updated');
  } catch (err) {
    next(err);
  }
});

// DELETE /plan/:planId/menu/:itemId
router.delete('/plan/:planId/menu/:itemId', async (req, res, next) => {
  try {
    await plannerService.deleteMenuItem(req.params.itemId, req.params.planId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

// ─── Design Assets ────────────────────────────────────────────────────────────

// GET /plan/:planId/assets
router.get('/plan/:planId/assets', async (req, res, next) => {
  try {
    const assets = await plannerService.listDesignAssets(req.params.planId);
    return R.ok(res, assets);
  } catch (err) {
    next(err);
  }
});

// POST /plan/:planId/assets
router.post('/plan/:planId/assets', async (req, res, next) => {
  try {
    const { imageUrl, caption, sortOrder } = req.body;
    if (!imageUrl) return R.badRequest(res, 'imageUrl is required');

    const asset = await plannerService.addDesignAsset(req.params.planId, req.user.userId, {
      imageUrl,
      caption,
      sortOrder,
    });

    return R.created(res, asset, 'Design asset added');
  } catch (err) {
    next(err);
  }
});

// DELETE /plan/:planId/assets/:assetId
router.delete('/plan/:planId/assets/:assetId', async (req, res, next) => {
  try {
    await plannerService.deleteDesignAsset(req.params.assetId, req.params.planId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
