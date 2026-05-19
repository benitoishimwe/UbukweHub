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

const router = Router();

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
router.use('/events',         eventRoutes);
router.use('/inventory',      inventoryRoutes);
router.use('/transactions',   transactionRoutes);
router.use('/staff',          staffRoutes);
router.use('/super-admin',    superAdminRoutes);

module.exports = router;
