'use strict';

/**
 * Central route registry.
 *
 * This file aggregates every route module into a single Express Router.
 * The app already supports dynamic auto-loading from this directory, so
 * this index serves as:
 *   1. An explicit manifest of all mounted API paths.
 *   2. A drop-in replacement for the auto-loader if fine-grained ordering
 *      is ever needed (e.g. mount /api/auth before other routes).
 *
 * To use this index instead of the auto-loader, replace the dynamic
 * require() block in app.js with:
 *   app.use('/api', require('./routes/index'));
 */

const { Router } = require('express');
const { authenticate } = require('../middleware/auth');
const albumService = require('../services/album.service');
const R = require('../utils/response');

const authRoutes         = require('./auth.routes');
const adminRoutes        = require('./admin.routes');
const tenantRoutes       = require('./tenant.routes');
const healthRoutes       = require('./health.routes');
const subscriptionRoutes = require('./subscription.routes');
const vendorRoutes       = require('./vendor.routes');
const marketplaceRoutes  = require('./marketplace.routes');
const albumRoutes        = require('./album.routes');
const weddingPlannerRoutes = require('./weddingPlanner.routes');
const weddingPlansRoutes   = require('./weddingPlans.routes');
const saveTheDateRoutes  = require('./saveTheDate.routes');
const aiRoutes           = require('./ai.routes');
const stripeRoutes       = require('./stripe.routes');
const uploadRoutes       = require('./upload.routes');
const eventRoutes        = require('./event.routes');
const inventoryRoutes    = require('./inventory.routes');
const transactionRoutes  = require('./transaction.routes');
const staffRoutes        = require('./staff.routes');
const superAdminRoutes   = require('./super-admin.routes');
const messagesRoutes       = require('./messages.routes');
const { router: eventMessagesRouter, channelsRouter } = require('./eventMessages.routes');
const notificationRoutes   = require('./notification.routes');
const apiKeysRoutes        = require('./apiKeys.routes');
const guestCheckinRoutes   = require('./guestCheckin.routes');
const supportRoutes        = require('./support.routes');

const router = Router();

// ── Event-scoped album routes (/events/:eventId/albums) ───────────────────────
router.post('/events/:eventId/albums', authenticate, async (req, res, next) => {
  try {
    // tenantId is optional — self-serve clients (no tenant) can also create albums
    const tenantId = req.user.tenantId || null;
    const { title, description, maxFileSizeMb, allowVideos } = req.body;
    const album = await albumService.createAlbum({
      tenantId,
      eventId: req.params.eventId,
      title: title || 'Live Album',
      description: description || null,
      maxFileSizeMb: maxFileSizeMb !== undefined ? parseInt(maxFileSizeMb, 10) : 50,
      allowVideos: allowVideos !== undefined ? allowVideos === true || allowVideos === 'true' : true,
      createdBy: req.user.userId,
    });
    return R.created(res, album, 'Album created successfully');
  } catch (err) { next(err); }
});

router.get('/events/:eventId/albums', authenticate, async (req, res, next) => {
  try {
    // tenantId is optional — scope by eventId alone when the user has no tenant
    const tenantId = req.user.tenantId || null;

    const { data: albums } = await albumService.listAlbums({
      tenantId,
      eventId: req.params.eventId,
      size: 1,
    });
    if (!albums || albums.length === 0) {
      return R.notFound(res, 'No album for this event');
    }
    const album = albums[0];
    const { data: media } = await albumService.listMedia({ albumId: album.albumId, size: 200 });
    return R.ok(res, { album, media, media_count: media.length });
  } catch (err) { next(err); }
});

router.use('/auth',           authRoutes);
router.use('/admin',          adminRoutes);
router.use('/tenants',        tenantRoutes);
router.use('/health',         healthRoutes);
router.use('/subscriptions',  subscriptionRoutes);
router.use('/vendors',        vendorRoutes);
router.use('/marketplace',    marketplaceRoutes);
router.use('/albums',         albumRoutes);
router.use('/wedding-planner', weddingPlannerRoutes);
router.use('/wedding-plans',   weddingPlansRoutes);
router.use('/save-the-date',  saveTheDateRoutes);
router.use('/ai',             aiRoutes);
router.use('/stripe',         stripeRoutes);
router.use('/upload',         uploadRoutes);
router.use('/events/:eventId/messages', eventMessagesRouter);
router.use('/events',         eventRoutes);
router.use('/inventory',      inventoryRoutes);
router.use('/transactions',   transactionRoutes);
router.use('/staff',          staffRoutes);
router.use('/super-admin',    superAdminRoutes);
router.use('/messages',       messagesRoutes);
router.use('/channels',       channelsRouter);
router.use('/notifications',  notificationRoutes);
router.use('/api-keys',       apiKeysRoutes);
router.use('/',               guestCheckinRoutes);
router.use('/',               supportRoutes);

module.exports = router;
