'use strict';

const Stripe = require('stripe');
const config = require('../config/env');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

let _stripe;

function getStripe() {
  if (!_stripe) {
    if (!config.stripe.secretKey) {
      throw new AppError('Stripe secret key is not configured', 500, 'STRIPE_NOT_CONFIGURED');
    }
    _stripe = new Stripe(config.stripe.secretKey, { apiVersion: '2024-06-20' });
  }
  return _stripe;
}

// ─── Lazy import of subscription service to avoid circular deps ───────────────
function getSubscriptionService() {
  return require('./subscription.service');
}

/**
 * Create a Stripe Checkout session for a subscription plan.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.userEmail
 * @param {string} params.priceId
 * @param {string} params.plan
 * @param {string} params.successUrl
 * @param {string} params.cancelUrl
 * @returns {Promise<{ url: string }>}
 */
async function createCheckoutSession({ userId, userEmail, priceId, plan, successUrl, cancelUrl }) {
  const stripe = getStripe();

  // Find existing Stripe customer or create one
  let stripeCustomerId = null;

  const existingSubscription = await prisma.subscription.findFirst({
    where: { userId, stripeCustomerId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { stripeCustomerId: true },
  });

  if (existingSubscription?.stripeCustomerId) {
    stripeCustomerId = existingSubscription.stripeCustomerId;
  } else {
    const customer = await stripe.customers.create({
      email: userEmail,
      metadata: { userId },
    });
    stripeCustomerId = customer.id;
  }

  const session = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    payment_method_types: ['card'],
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { userId, plan },
    subscription_data: {
      metadata: { userId, plan },
    },
  });

  return { url: session.url };
}

/**
 * Create a Stripe Customer Portal session for managing subscriptions.
 *
 * @param {string} stripeCustomerId
 * @param {string} returnUrl
 * @returns {Promise<{ url: string }>}
 */
async function createPortalSession(stripeCustomerId, returnUrl) {
  const stripe = getStripe();

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: returnUrl,
  });

  return { url: session.url };
}

/**
 * Process an incoming Stripe webhook event.
 *
 * @param {object} params
 * @param {Buffer} params.rawBody
 * @param {string} params.signature
 * @returns {Promise<{ received: true }>}
 */
async function handleWebhook({ rawBody, signature }) {
  const stripe = getStripe();

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, config.stripe.webhookSecret);
  } catch (err) {
    throw new AppError(`Webhook signature verification failed: ${err.message}`, 400, 'WEBHOOK_SIGNATURE_INVALID');
  }

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object;
      const { userId, plan } = session.metadata || {};
      if (userId && plan) {
        const subscriptionService = getSubscriptionService();
        await subscriptionService.activateSubscription({
          userId,
          plan,
          stripeCustomerId: session.customer,
          stripeSubscriptionId: session.subscription,
        });
      }
      break;
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object;
      const stripeSubscriptionId = invoice.subscription;
      if (stripeSubscriptionId) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId },
          data: { status: 'past_due' },
        });
      }
      break;
    }

    case 'customer.subscription.deleted': {
      const subscription = event.data.object;
      if (subscription.id) {
        await prisma.subscription.updateMany({
          where: { stripeSubscriptionId: subscription.id },
          data: { status: 'cancelled' },
        });
      }
      break;
    }

    default:
      // Unhandled event type — no action required
      break;
  }

  return { received: true };
}

/**
 * Return the Stripe price IDs from environment configuration.
 *
 * @returns {object}
 */
function getSubscriptionPrices() {
  return {
    pro: {
      monthly: config.stripe.prices.proMonthly,
      yearly: config.stripe.prices.proYearly,
    },
    enterprise: {
      monthly: config.stripe.prices.enterpriseMonthly,
      yearly: config.stripe.prices.enterpriseYearly,
    },
  };
}

module.exports = {
  createCheckoutSession,
  createPortalSession,
  handleWebhook,
  getSubscriptionPrices,
};
