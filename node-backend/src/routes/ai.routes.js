'use strict';

const { Router } = require('express');
const aiService = require('../services/ai.service');
const { authenticate } = require('../middleware/auth');
const { requireFeature } = require('../middleware/featureGate');
const R = require('../utils/response');

const router = Router();

// All AI routes require authentication + ai_assistant feature
router.use(authenticate, requireFeature('ai_assistant'));

// ─── POST /chat — AI chat ─────────────────────────────────────────────────────
router.post('/chat', async (req, res, next) => {
  try {
    const { message, context, eventId } = req.body;
    if (!message) return R.badRequest(res, 'message is required');

    const result = await aiService.chat({
      userId: req.user.userId,
      message,
      context: context || undefined,
      eventId: eventId || undefined,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /greatness — wedding greatness score ────────────────────────────────
router.post('/greatness', async (req, res, next) => {
  try {
    const { event_id } = req.body;
    if (!event_id) return R.badRequest(res, 'event_id is required');

    const prisma = require('../config/prisma');

    // Use select to skip eventDate — Prisma @db.Timestamptz can fail to parse
    // the "+00" offset format stored by some PostgreSQL versions.
    const event = await prisma.event.findFirst({
      where: { eventId: event_id, tenantId: req.user.tenantId },
      select: {
        eventId: true, name: true, venue: true,
        guestCount: true, budget: true, status: true,
        notes: true, checklist: true, timeline: true,
      },
    });
    if (!event) return R.badRequest(res, 'Event not found');

    // Get eventDate as a plain string via raw SQL to bypass the Prisma DateTime error.
    try {
      const rows = await prisma.$queryRaw`
        SELECT event_date::text AS "eventDate" FROM events WHERE event_id = ${event_id} LIMIT 1
      `;
      event.eventDate = rows[0]?.eventDate || null;
    } catch {
      event.eventDate = null;
    }

    const result = await aiService.calculateGreatness(event);
    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /checklist — generate event checklist ───────────────────────────────
router.post('/checklist', async (req, res, next) => {
  try {
    // Accept both camelCase and snake_case field names from frontend
    const eventType = req.body.eventType || req.body.event_name || 'Wedding';
    const eventDate = req.body.eventDate || req.body.event_date || 'TBD';
    const guestCount = req.body.guestCount || req.body.guest_count;
    const venue = req.body.venue;
    const budget = req.body.budget;

    if (!guestCount) return R.badRequest(res, 'guestCount is required');

    const result = await aiService.generateChecklist({
      eventType,
      eventDate,
      guestCount: parseInt(guestCount, 10),
      venue,
      budget,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /budget — generate budget breakdown ─────────────────────────────────
router.post('/budget', async (req, res, next) => {
  try {
    // Accept both camelCase and snake_case field names from frontend
    const eventType = req.body.eventType || req.body.event_name || 'Wedding';
    const guestCount = req.body.guestCount || req.body.guest_count;
    const totalBudget = req.body.totalBudget || req.body.budget || 10000000;
    const currency = req.body.currency || 'RWF';
    const venue = req.body.venue;

    if (!guestCount) return R.badRequest(res, 'guestCount is required');

    const result = await aiService.generateBudget({
      eventType,
      guestCount: parseInt(guestCount, 10),
      totalBudget: parseFloat(totalBudget),
      currency,
      venue,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /timeline — generate day-of timeline ────────────────────────────────
router.post('/timeline', async (req, res, next) => {
  try {
    const { eventType, eventDate, startTime } = req.body;
    if (!eventType) return R.badRequest(res, 'eventType is required');

    const result = await aiService.generateTimeline({
      eventType,
      eventDate: eventDate || 'TBD',
      startTime: startTime || '09:00 AM',
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /seating — generate seating plan ───────────────────────────────────
router.post('/seating', async (req, res, next) => {
  try {
    const { guestCount, tableSize, specialRequests } = req.body;
    if (!guestCount) return R.badRequest(res, 'guestCount is required');
    if (!tableSize) return R.badRequest(res, 'tableSize is required');

    const result = await aiService.generateSeating({
      guestCount: parseInt(guestCount, 10),
      tableSize: parseInt(tableSize, 10),
      specialRequests: specialRequests || undefined,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /vendor-suggestions — vendor guidance ───────────────────────────────
router.post('/vendor-suggestions', async (req, res, next) => {
  try {
    const { category, budget, location, eventType } = req.body;
    if (!category) return R.badRequest(res, 'category is required');

    const result = await aiService.suggestVendors({
      category,
      budget: budget || 'not specified',
      location: location || 'not specified',
      eventType: eventType || 'event',
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /save-the-date/text — generate save-the-date text ──────────────────
router.post('/save-the-date/text', async (req, res, next) => {
  try {
    const { occasion, coupleNames, date, venue, style } = req.body;
    if (!coupleNames) return R.badRequest(res, 'coupleNames is required');

    const result = await aiService.generateSaveTheDateText({
      occasion: occasion || 'wedding',
      coupleNames,
      date: date || 'TBD',
      venue: venue || 'TBD',
      style: style || 'classic',
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /save-the-date/image — generate save-the-date image ────────────────
router.post(
  '/save-the-date/image',
  requireFeature('save_the_date'),
  async (req, res, next) => {
    try {
      const { prompt, style } = req.body;
      if (!prompt) return R.badRequest(res, 'prompt is required');

      const result = await aiService.generateSaveTheDateImage({
        prompt,
        style: style || undefined,
      });

      return R.ok(res, result);
    } catch (err) {
      next(err);
    }
  }
);

module.exports = router;
