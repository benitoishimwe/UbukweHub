'use strict';

const express = require('express');
const { authenticate } = require('../middleware/auth');
const { ok, badRequest, serverError } = require('../utils/response');
const subscriptionService = require('../services/subscription.service');
const config = require('../config/env');

const router = express.Router();

// ─── GET /api/subscriptions/plans ────────────────────────────────────────────
// Public. Return all plans and their features.
router.get('/plans', async (req, res, next) => {
  try {
    const plans = await subscriptionService.getPlansWithFeatures();
    return ok(res, plans);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/subscriptions/me ────────────────────────────────────────────────
// Protected. Return the current user's active subscription.
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const subscription = await subscriptionService.getActiveSubscription(req.user.userId);
    return ok(res, subscription);
  } catch (err) {
    return next(err);
  }
});

// ─── GET /api/subscriptions/me/details ───────────────────────────────────────
// Protected. Return full subscription details including feature flags.
router.get('/me/details', authenticate, async (req, res, next) => {
  try {
    const details = await subscriptionService.getSubscriptionDetails(req.user.userId);
    return ok(res, details);
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/subscriptions/checkout ────────────────────────────────────────
// Protected. Create a Stripe Checkout Session for the given price/plan.
router.post('/checkout', authenticate, async (req, res, next) => {
  try {
    const { priceId, plan } = req.body;

    if (!priceId || !plan) {
      return badRequest(res, 'priceId and plan are required');
    }

    if (!config.stripe.secretKey) {
      return serverError(res, 'Stripe is not configured on this server');
    }

    const stripe = require('stripe')(config.stripe.secretKey);

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: {
        userId: req.user.userId,
        plan,
      },
      success_url: `${config.frontendUrl}/dashboard?checkout=success&plan=${plan}`,
      cancel_url: `${config.frontendUrl}/pricing?checkout=cancelled`,
    });

    return ok(res, { url: session.url, sessionId: session.id });
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/subscriptions/cancel ──────────────────────────────────────────
// Protected. Schedule the current subscription for cancellation at period end.
router.post('/cancel', authenticate, async (req, res, next) => {
  try {
    const subscription = await subscriptionService.cancelSubscription(req.user.userId);
    return ok(res, subscription, 'Subscription will be cancelled at the end of the current billing period');
  } catch (err) {
    return next(err);
  }
});

// ─── POST /api/subscriptions/portal ──────────────────────────────────────────
// Protected. Create a Stripe Customer Portal session.
router.post('/portal', authenticate, async (req, res, next) => {
  try {
    if (!config.stripe.secretKey) {
      return serverError(res, 'Stripe is not configured on this server');
    }

    const stripe = require('stripe')(config.stripe.secretKey);

    const subscription = await subscriptionService.getActiveSubscription(req.user.userId);

    if (!subscription || !subscription.stripeCustomerId) {
      return badRequest(res, 'No Stripe customer found for this account. Please subscribe to a plan first.');
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscription.stripeCustomerId,
      return_url: `${config.frontendUrl}/dashboard/billing`,
    });

    return ok(res, { url: portalSession.url });
  } catch (err) {
    return next(err);
  }
});

module.exports = router;
