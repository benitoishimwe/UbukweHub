'use strict';

/**
 * /api/wedding-plans routes
 *
 * Provides the flat-URL pattern the frontend api.js expects:
 *   POST   /wedding-plans              → create plan
 *   GET    /wedding-plans/current      → get current plan (no auto-create)
 *   GET    /wedding-plans/:planId      → get plan by ID
 *   PATCH  /wedding-plans/:planId      → update plan
 *   GET    /wedding-plans/:planId/dashboard
 *   …/budget, /guests, /venues, /menu, /design-assets
 *
 * Delegates to the same weddingPlanner.service that powers /wedding-planner/plan/*
 */

const { Router } = require('express');
const prisma = require('../config/prisma');
const plannerService = require('../services/weddingPlanner.service');
const { authenticate } = require('../middleware/auth');
const R = require('../utils/response');

const router = Router();
router.use(authenticate);

// ─── Plan ─────────────────────────────────────────────────────────────────────

// POST / — explicit plan creation with wedding_date / theme / total_budget
router.post('/', async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const { wedding_date, theme, total_budget, eventId } = req.body;

    const plan = await prisma.weddingPlan.create({
      data: {
        userId,
        tenantId,
        eventId: eventId || null,
        weddingDate: wedding_date ? new Date(wedding_date) : null,
        theme: theme || null,
        totalBudget: total_budget != null ? total_budget : null,
      },
      include: {
        _count: {
          select: { budgetItems: true, guests: true, venues: true, menuItems: true, designAssets: true },
        },
      },
    });

    return R.created(res, plan, 'Wedding plan created');
  } catch (err) {
    next(err);
  }
});

// GET /current — return the user's latest plan; 404 if none
router.get('/current', async (req, res, next) => {
  try {
    const { tenantId, userId } = req.user;
    if (!tenantId) return R.badRequest(res, 'Tenant context required');

    const plan = await prisma.weddingPlan.findFirst({
      where: { userId, tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: {
          select: { budgetItems: true, guests: true, venues: true, menuItems: true, designAssets: true },
        },
      },
    });

    if (!plan) return R.notFound(res, 'No wedding plan found');
    return R.ok(res, plan);
  } catch (err) {
    next(err);
  }
});

// GET /:planId
router.get('/:planId', async (req, res, next) => {
  try {
    const plan = await plannerService.getPlanById(req.params.planId, req.user.userId);
    return R.ok(res, plan);
  } catch (err) {
    next(err);
  }
});

// PATCH /:planId
router.patch('/:planId', async (req, res, next) => {
  try {
    const { weddingDate, wedding_date, theme, primaryColor, secondaryColor, totalBudget, total_budget, notes } = req.body;
    const plan = await plannerService.updatePlan(req.params.planId, req.user.userId, {
      weddingDate: weddingDate ?? wedding_date,
      theme,
      primaryColor,
      secondaryColor,
      totalBudget: totalBudget ?? total_budget,
      notes,
    });
    return R.ok(res, plan, 'Plan updated');
  } catch (err) {
    next(err);
  }
});

// GET /:planId/dashboard
router.get('/:planId/dashboard', async (req, res, next) => {
  try {
    const dashboard = await plannerService.getDashboard(req.params.planId, req.user.userId);
    return R.ok(res, dashboard);
  } catch (err) {
    next(err);
  }
});

// ─── Budget ───────────────────────────────────────────────────────────────────

router.get('/:planId/budget', async (req, res, next) => {
  try {
    const result = await plannerService.listBudgetItems(req.params.planId, req.user.userId);
    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

router.post('/:planId/budget', async (req, res, next) => {
  try {
    const { category, description, estimatedCost, actualCost, vendorId, status, dueDate } = req.body;
    if (!category) return R.badRequest(res, 'category is required');
    const item = await plannerService.addBudgetItem(req.params.planId, req.user.userId, {
      category, description, estimatedCost, actualCost, vendorId, status, dueDate,
    });
    return R.created(res, item, 'Budget item added');
  } catch (err) {
    next(err);
  }
});

router.put('/:planId/budget/:itemId', async (req, res, next) => {
  try {
    const item = await plannerService.updateBudgetItem(req.params.itemId, req.params.planId, req.body);
    return R.ok(res, item, 'Budget item updated');
  } catch (err) {
    next(err);
  }
});

router.patch('/:planId/budget/:itemId', async (req, res, next) => {
  try {
    const item = await plannerService.updateBudgetItem(req.params.itemId, req.params.planId, req.body);
    return R.ok(res, item, 'Budget item updated');
  } catch (err) {
    next(err);
  }
});

router.delete('/:planId/budget/:itemId', async (req, res, next) => {
  try {
    await plannerService.deleteBudgetItem(req.params.itemId, req.params.planId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

// ─── Guests ───────────────────────────────────────────────────────────────────

router.get('/:planId/guests/stats', async (req, res, next) => {
  try {
    const stats = await plannerService.getGuestStats(req.params.planId);
    return R.ok(res, stats);
  } catch (err) {
    next(err);
  }
});

// summary alias
router.get('/:planId/guests/summary', async (req, res, next) => {
  try {
    const stats = await plannerService.getGuestStats(req.params.planId);
    return R.ok(res, stats);
  } catch (err) {
    next(err);
  }
});

router.get('/:planId/guests', async (req, res, next) => {
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

router.post('/:planId/guests', async (req, res, next) => {
  try {
    const { fullName, email, phone, rsvpStatus, mealChoice, dietaryRestrictions, tableNumber } = req.body;
    if (!fullName) return R.badRequest(res, 'fullName is required');
    const guest = await plannerService.addGuest(req.params.planId, req.user.userId, {
      fullName, email, phone, rsvpStatus, mealChoice, dietaryRestrictions, tableNumber,
    });
    return R.created(res, guest, 'Guest added');
  } catch (err) {
    next(err);
  }
});

router.put('/:planId/guests/:guestId', async (req, res, next) => {
  try {
    const guest = await plannerService.updateGuest(req.params.guestId, req.params.planId, req.body);
    return R.ok(res, guest, 'Guest updated');
  } catch (err) {
    next(err);
  }
});

router.patch('/:planId/guests/:guestId', async (req, res, next) => {
  try {
    const guest = await plannerService.updateGuest(req.params.guestId, req.params.planId, req.body);
    return R.ok(res, guest, 'Guest updated');
  } catch (err) {
    next(err);
  }
});

router.delete('/:planId/guests/:guestId', async (req, res, next) => {
  try {
    await plannerService.deleteGuest(req.params.guestId, req.params.planId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

// ─── Venues ───────────────────────────────────────────────────────────────────

router.get('/:planId/venues', async (req, res, next) => {
  try {
    const venues = await plannerService.listVenues(req.params.planId);
    return R.ok(res, venues);
  } catch (err) {
    next(err);
  }
});

router.post('/:planId/venues', async (req, res, next) => {
  try {
    const { name, address, contactName, contactPhone, capacity, rentalFee, includedItems, notes } = req.body;
    if (!name) return R.badRequest(res, 'Venue name is required');
    const venue = await plannerService.addVenue(req.params.planId, req.user.userId, {
      name, address, contactName, contactPhone, capacity, rentalFee, includedItems, notes,
    });
    return R.created(res, venue, 'Venue added');
  } catch (err) {
    next(err);
  }
});

router.put('/:planId/venues/:venueId', async (req, res, next) => {
  try {
    const venue = await plannerService.updateVenue(req.params.venueId, req.params.planId, req.body);
    return R.ok(res, venue, 'Venue updated');
  } catch (err) {
    next(err);
  }
});

router.patch('/:planId/venues/:venueId', async (req, res, next) => {
  try {
    const venue = await plannerService.updateVenue(req.params.venueId, req.params.planId, req.body);
    return R.ok(res, venue, 'Venue updated');
  } catch (err) {
    next(err);
  }
});

router.delete('/:planId/venues/:venueId', async (req, res, next) => {
  try {
    await plannerService.deleteVenue(req.params.venueId, req.params.planId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

// ─── Menu ─────────────────────────────────────────────────────────────────────

router.get('/:planId/menu', async (req, res, next) => {
  try {
    const { course } = req.query;
    const items = await plannerService.listMenuItems(req.params.planId, course || undefined);
    return R.ok(res, items);
  } catch (err) {
    next(err);
  }
});

// meal-summary alias
router.get('/:planId/menu/meal-summary', async (req, res, next) => {
  try {
    const items = await plannerService.listMenuItems(req.params.planId);
    return R.ok(res, items);
  } catch (err) {
    next(err);
  }
});

router.post('/:planId/menu', async (req, res, next) => {
  try {
    const { course, name, description, dietaryInfo, isFinal } = req.body;
    if (!name) return R.badRequest(res, 'Menu item name is required');
    const item = await plannerService.addMenuItem(req.params.planId, req.user.userId, {
      course, name, description, dietaryInfo, isFinal,
    });
    return R.created(res, item, 'Menu item added');
  } catch (err) {
    next(err);
  }
});

router.put('/:planId/menu/:itemId', async (req, res, next) => {
  try {
    const item = await plannerService.updateMenuItem(req.params.itemId, req.params.planId, req.body);
    return R.ok(res, item, 'Menu item updated');
  } catch (err) {
    next(err);
  }
});

router.patch('/:planId/menu/:itemId', async (req, res, next) => {
  try {
    const item = await plannerService.updateMenuItem(req.params.itemId, req.params.planId, req.body);
    return R.ok(res, item, 'Menu item updated');
  } catch (err) {
    next(err);
  }
});

router.delete('/:planId/menu/:itemId', async (req, res, next) => {
  try {
    await plannerService.deleteMenuItem(req.params.itemId, req.params.planId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

// ─── Design Assets ────────────────────────────────────────────────────────────

router.get('/:planId/design-assets', async (req, res, next) => {
  try {
    const assets = await plannerService.listDesignAssets(req.params.planId);
    return R.ok(res, assets);
  } catch (err) {
    next(err);
  }
});

router.post('/:planId/design-assets', async (req, res, next) => {
  try {
    const { imageUrl, caption, sortOrder } = req.body;
    if (!imageUrl) return R.badRequest(res, 'imageUrl is required');
    const asset = await plannerService.addDesignAsset(req.params.planId, req.user.userId, {
      imageUrl, caption, sortOrder,
    });
    return R.created(res, asset, 'Design asset added');
  } catch (err) {
    next(err);
  }
});

router.put('/:planId/design-assets/:assetId', async (req, res, next) => {
  try {
    await plannerService.deleteDesignAsset(req.params.assetId, req.params.planId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

router.delete('/:planId/design-assets/:assetId', async (req, res, next) => {
  try {
    await plannerService.deleteDesignAsset(req.params.assetId, req.params.planId);
    return R.noContent(res);
  } catch (err) {
    next(err);
  }
});

module.exports = router;
