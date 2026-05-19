'use strict';

const { paymentRequired, unauthorized } = require('../utils/response');
const prisma = require('../config/prisma');

// Features included by plan tier — used as fallback when DB rows are missing
const PLAN_FEATURES = {
  max:        ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'white_label', 'api_access', 'save_the_date_image'],
  enterprise: ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'white_label', 'api_access', 'save_the_date_image'],
  pro:        ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'save_the_date_image'],
  wedding:    ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'advanced_reports', 'save_the_date_image'],
  trial:      ['ai_assistant', 'save_the_date', 'vendor_marketplace', 'analytics', 'unlimited_events', 'advanced_reports', 'save_the_date_image'],
  free:       [],
};

/**
 * Resolve the current subscription plan for a tenant.
 * Priority order:
 *   1. Active subscription row for the tenant
 *   2. Tenant-level subscription_tier field
 *   3. Default: 'free'
 *
 * @param {string} tenantId
 * @returns {Promise<string>} plan slug (e.g. 'free', 'pro', 'enterprise')
 */
async function resolvePlan(tenantId) {
  if (!tenantId) return 'free';

  // Look for an active subscription for this tenant
  const subscription = await prisma.subscription.findFirst({
    where: {
      tenantId,
      status: { in: ['active', 'trialing'] },
    },
    orderBy: { createdAt: 'desc' },
    select: { plan: true },
  });

  if (subscription) return subscription.plan;

  // Fall back to the tenant's own tier field
  const tenant = await prisma.tenant.findUnique({
    where: { tenantId },
    select: { subscriptionTier: true },
  });

  return tenant?.subscriptionTier || 'free';
}

/**
 * Build middleware that gates a route behind a subscription feature flag.
 *
 * Looks up the `subscription_features` table for the resolved plan and the
 * requested feature key.  Returns 402 if the feature is not enabled.
 *
 * Usage:
 *   router.post('/ai/generate', authenticate, requireFeature('ai_generation'), handler)
 *
 * @param {string} featureKey - e.g. 'ai_generation', 'partycam', 'multi_staff'
 * @returns {import('express').RequestHandler}
 */
function requireFeature(featureKey) {
  return async function featureGateMiddleware(req, res, next) {
    if (!req.user) {
      return unauthorized(res, 'Authentication required');
    }

    try {
      const plan = await resolvePlan(req.user.tenantId);

      // SUPER_ADMIN always passes through
      if (req.user.role === 'super_admin') return next();

      // Check plan-tier inclusion first (covers plans without DB feature rows)
      if (PLAN_FEATURES[plan]?.includes(featureKey)) {
        req.featureGate = { plan, featureKey, limitValue: null };
        return next();
      }

      // Fall back to explicit DB feature flag
      const feature = await prisma.subscriptionFeature.findFirst({
        where: { plan, featureKey },
      });

      if (!feature || !feature.isEnabled) {
        return paymentRequired(
          res,
          featureKey,
          `The "${featureKey}" feature is not available on the "${plan}" plan. Please upgrade to access it.`
        );
      }

      // Attach feature metadata to req so handlers can read limitValue if needed
      req.featureGate = {
        plan,
        featureKey,
        limitValue: feature.limitValue ?? null,
      };

      return next();
    } catch (err) {
      return next(err);
    }
  };
}

module.exports = { requireFeature, resolvePlan };
