'use strict';

const { Router } = require('express');
const stripeService = require('../services/stripe.service');
const { authenticate } = require('../middleware/auth');
const R = require('../utils/response');
const prisma = require('../config/prisma');
const config = require('../config/env');

const router = Router();

// ─── POST /webhook — Stripe webhook (raw body, no auth) ──────────────────────
// NOTE: This route must use express.raw() body parser.
// In app.js mount this BEFORE the global JSON middleware:
//   app.use('/api/stripe/webhook', express.raw({ type: 'application/json' }), stripeRoutes);
// Or configure express.raw on this specific path in app.js.
router.post('/webhook', async (req, res, next) => {
  try {
    const signature = req.headers['stripe-signature'];
    if (!signature) {
      return R.badRequest(res, 'Missing stripe-signature header');
    }

    // req.body is a raw Buffer when express.raw() middleware is used upstream
    const result = await stripeService.handleWebhook({
      rawBody: req.body,
      signature,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /checkout — create checkout session (auth) ──────────────────────────
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const { priceId, plan, successUrl, cancelUrl } = req.body;
    if (!priceId) return R.badRequest(res, 'priceId is required');
    if (!plan) return R.badRequest(res, 'plan is required');
    if (!successUrl) return R.badRequest(res, 'successUrl is required');
    if (!cancelUrl) return R.badRequest(res, 'cancelUrl is required');

    const result = await stripeService.createCheckoutSession({
      userId: req.user.userId,
      userEmail: req.user.email,
      priceId,
      plan,
      successUrl,
      cancelUrl,
    });

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── POST /portal — create billing portal session (auth) ─────────────────────
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    const { returnUrl } = req.body;
    const resolvedReturnUrl = returnUrl || config.frontendUrl;

    // Resolve stripe customer ID for the current user
    const subscription = await prisma.subscription.findFirst({
      where: {
        userId: req.user.userId,
        stripeCustomerId: { not: null },
      },
      orderBy: { createdAt: 'desc' },
      select: { stripeCustomerId: true },
    });

    if (!subscription?.stripeCustomerId) {
      return R.badRequest(res, 'No Stripe billing account found for this user');
    }

    const result = await stripeService.createPortalSession(
      subscription.stripeCustomerId,
      resolvedReturnUrl
    );

    return R.ok(res, result);
  } catch (err) {
    next(err);
  }
});

// ─── GET /prices — get available subscription prices ─────────────────────────
router.get('/prices', (req, res) => {
  const prices = stripeService.getSubscriptionPrices();
  return R.ok(res, prices);
});

module.exports = router;
