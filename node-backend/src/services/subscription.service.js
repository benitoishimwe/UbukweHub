'use strict';

const prisma = require('../config/prisma');
const config = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

// ─── Constants ────────────────────────────────────────────────────────────────

const VALID_PLANS = ['free', 'trial', 'pro', 'enterprise', 'starter'];

// ─── Internal helpers ─────────────────────────────────────────────────────────

/**
 * Find the most recently created active or trial subscription for a user.
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function _findActiveSubscription(userId) {
  return prisma.subscription.findFirst({
    where: {
      userId,
      status: { in: ['active', 'trial'] },
    },
    orderBy: { createdAt: 'desc' },
  });
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * Create a free-plan subscription for a newly registered user.
 *
 * @param {string} userId
 * @returns {Promise<object>} The created subscription
 */
async function createFreeSubscription(userId) {
  return prisma.subscription.create({
    data: {
      userId,
      plan: 'free',
      status: 'active',
    },
  });
}

/**
 * Get the user's current active or trial subscription.
 *
 * @param {string} userId
 * @returns {Promise<object|null>}
 */
async function getActiveSubscription(userId) {
  return _findActiveSubscription(userId);
}

/**
 * Return just the plan name string for a user. Defaults to 'free'.
 *
 * @param {string} userId
 * @returns {Promise<string>}
 */
async function getCurrentPlan(userId) {
  const subscription = await _findActiveSubscription(userId);
  return subscription ? subscription.plan : 'free';
}

/**
 * Check whether a specific feature is enabled on the user's current plan.
 *
 * @param {string} userId
 * @param {string} featureKey
 * @returns {Promise<boolean>}
 */
async function isFeatureEnabled(userId, featureKey) {
  const plan = await getCurrentPlan(userId);

  const feature = await prisma.subscriptionFeature.findFirst({
    where: { plan, featureKey },
  });

  return feature ? feature.isEnabled : false;
}

/**
 * Return the limit value for a feature on the user's plan.
 * Returns null for unlimited, or a number for a capped plan.
 *
 * @param {string} userId
 * @param {string} featureKey
 * @returns {Promise<number|null>}
 */
async function getFeatureLimit(userId, featureKey) {
  const plan = await getCurrentPlan(userId);

  const feature = await prisma.subscriptionFeature.findFirst({
    where: { plan, featureKey },
  });

  return feature ? feature.limitValue : null;
}

/**
 * Return full subscription details including all features for the current plan.
 *
 * @param {string} userId
 * @returns {Promise<{ subscription: object|null, features: object, plan: string }>}
 */
async function getSubscriptionDetails(userId) {
  const subscription = await _findActiveSubscription(userId);
  const plan = subscription ? subscription.plan : 'free';

  const featureRows = await prisma.subscriptionFeature.findMany({
    where: { plan },
  });

  const features = featureRows.reduce((acc, row) => {
    acc[row.featureKey] = row.isEnabled;
    return acc;
  }, {});

  return { subscription, features, plan };
}

/**
 * Activate or upgrade a subscription for a user (typically called after Stripe payment).
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.plan
 * @param {string} [params.stripeSubscriptionId]
 * @param {string} [params.stripeCustomerId]
 * @param {Date}   [params.periodStart]
 * @param {Date}   [params.periodEnd]
 * @param {string} [params.tenantId]
 * @returns {Promise<object>} The updated or created subscription
 */
async function activateSubscription({
  userId,
  plan,
  stripeSubscriptionId,
  stripeCustomerId,
  periodStart,
  periodEnd,
  tenantId,
}) {
  if (!VALID_PLANS.includes(plan)) {
    throw new AppError(`Invalid plan: ${plan}`, 400, 'INVALID_PLAN');
  }

  const existing = await prisma.subscription.findFirst({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  const data = {
    plan,
    status: 'active',
    stripeSubscriptionId: stripeSubscriptionId || null,
    stripeCustomerId: stripeCustomerId || null,
    currentPeriodStart: periodStart || null,
    currentPeriodEnd: periodEnd || null,
    cancelAtPeriodEnd: false,
    tenantId: tenantId || null,
  };

  if (existing) {
    return prisma.subscription.update({
      where: { id: existing.id },
      data,
    });
  }

  return prisma.subscription.create({
    data: { userId, ...data },
  });
}

/**
 * Schedule a subscription for cancellation at the end of the current period.
 *
 * @param {string} userId
 * @returns {Promise<object>} The updated subscription
 */
async function cancelSubscription(userId) {
  const subscription = await _findActiveSubscription(userId);
  if (!subscription) {
    throw new AppError('No active subscription found', 404, 'SUBSCRIPTION_NOT_FOUND');
  }

  return prisma.subscription.update({
    where: { id: subscription.id },
    data: { cancelAtPeriodEnd: true },
  });
}

/**
 * Return all plans with their features, grouped by plan name.
 *
 * @returns {Promise<object>} Map of plan name → { plan, features[] }
 */
async function getPlansWithFeatures() {
  const allFeatures = await prisma.subscriptionFeature.findMany({
    orderBy: [{ plan: 'asc' }, { featureKey: 'asc' }],
  });

  const grouped = {};

  for (const plan of VALID_PLANS) {
    grouped[plan] = {
      plan,
      features: allFeatures.filter((f) => f.plan === plan),
    };
  }

  return grouped;
}

/**
 * Handle incoming Stripe webhook events to keep subscription state in sync.
 *
 * @param {object} params
 * @param {object} params.event   - Stripe event object (type + data.object)
 * @param {Buffer} [params.payload] - Raw request body (for signature verification upstream)
 * @returns {Promise<{ handled: boolean, type: string }>}
 */
async function handleStripeWebhook({ event }) {
  const { type, data } = event;
  const obj = data.object;

  switch (type) {
    case 'checkout.session.completed': {
      // obj is a Stripe CheckoutSession
      const customerId = obj.customer;
      const subscriptionId = obj.subscription;
      const metadata = obj.metadata || {};
      const userId = metadata.userId;
      const plan = metadata.plan || 'pro';

      if (userId) {
        await activateSubscription({
          userId,
          plan,
          stripeSubscriptionId: subscriptionId,
          stripeCustomerId: customerId,
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      // obj is a Stripe Invoice
      const stripeSubscriptionId = obj.subscription;

      if (stripeSubscriptionId) {
        const subscription = await prisma.subscription.findFirst({
          where: { stripeSubscriptionId },
        });

        if (subscription) {
          await prisma.subscription.update({
            where: { id: subscription.id },
            data: { status: 'past_due' },
          });
        }
      }
      break;
    }

    case 'customer.subscription.deleted': {
      // obj is a Stripe Subscription
      const stripeSubscriptionId = obj.id;

      const subscription = await prisma.subscription.findFirst({
        where: { stripeSubscriptionId },
      });

      if (subscription) {
        await prisma.subscription.update({
          where: { id: subscription.id },
          data: { status: 'cancelled', cancelAtPeriodEnd: false },
        });
      }
      break;
    }

    default:
      return { handled: false, type };
  }

  return { handled: true, type };
}

module.exports = {
  createFreeSubscription,
  getActiveSubscription,
  getCurrentPlan,
  isFeatureEnabled,
  getFeatureLimit,
  getSubscriptionDetails,
  activateSubscription,
  cancelSubscription,
  getPlansWithFeatures,
  handleStripeWebhook,
};
