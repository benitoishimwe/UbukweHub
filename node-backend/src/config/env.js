'use strict';

require('dotenv').config();

/**
 * Reads, validates, and exports all environment configuration.
 * Throws at startup if any required variable is missing so that
 * misconfigured deployments fail fast.
 */

function requireEnv(key) {
  const value = process.env[key];
  if (!value || value.trim() === '') {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value.trim();
}

function optionalEnv(key, defaultValue = '') {
  const value = process.env[key];
  return value && value.trim() !== '' ? value.trim() : defaultValue;
}

function requireInt(key, defaultValue) {
  const raw = process.env[key];
  if (!raw || raw.trim() === '') {
    if (defaultValue !== undefined) return defaultValue;
    throw new Error(`Missing required integer environment variable: ${key}`);
  }
  const parsed = parseInt(raw.trim(), 10);
  if (isNaN(parsed)) {
    throw new Error(`Environment variable ${key} must be a valid integer, got: ${raw}`);
  }
  return parsed;
}

const config = {
  // ── Server ─────────────────────────────────────────────────────────────────
  port: requireInt('PORT', 8080),
  nodeEnv: optionalEnv('NODE_ENV', 'development'),
  isDevelopment: optionalEnv('NODE_ENV', 'development') === 'development',
  isProduction: optionalEnv('NODE_ENV', 'development') === 'production',

  // ── Database ────────────────────────────────────────────────────────────────
  databaseUrl: requireEnv('DATABASE_URL'),
  directUrl: optionalEnv('DIRECT_URL'),

  // ── JWT ─────────────────────────────────────────────────────────────────────
  jwt: {
    secretKey: requireEnv('JWT_SECRET_KEY'),
    expirationHours: requireInt('JWT_EXPIRATION_HOURS', 168),
  },

  // ── Anthropic ───────────────────────────────────────────────────────────────
  anthropic: {
    apiKey: optionalEnv('ANTHROPIC_API_KEY'),
  },

  // ── OpenAI ──────────────────────────────────────────────────────────────────
  openai: {
    apiKey: optionalEnv('OPENAI_API_KEY'),
  },

  // ── GitHub Models (Prani API — GPT-5, DeepSeek-R1, Llama 4, Llama Vision) ──
  github: {
    token: optionalEnv('GITHUB_TOKEN'),
  },

  // ── Stripe ──────────────────────────────────────────────────────────────────
  stripe: {
    secretKey: optionalEnv('STRIPE_SECRET_KEY'),
    webhookSecret: optionalEnv('STRIPE_WEBHOOK_SECRET'),
    prices: {
      proMonthly: optionalEnv('STRIPE_PRICE_PRO_MONTHLY'),
      proYearly: optionalEnv('STRIPE_PRICE_PRO_YEARLY'),
      enterpriseMonthly: optionalEnv('STRIPE_PRICE_ENTERPRISE_MONTHLY'),
      enterpriseYearly: optionalEnv('STRIPE_PRICE_ENTERPRISE_YEARLY'),
    },
  },

  // ── Paystack ─────────────────────────────────────────────────────────────────
  paystack: {
    secretKey: optionalEnv('PAYSTACK_SECRET_KEY'),
  },

  // ── Email (Resend) ───────────────────────────────────────────────────────────
  resend: {
    apiKey: optionalEnv('RESEND_API_KEY'),
    fromEmail: optionalEnv('RESEND_FROM_EMAIL', 'noreply@prani.app'),
    fromName: optionalEnv('RESEND_FROM_NAME', 'Prani'),
  },

  // ── Supabase Storage ─────────────────────────────────────────────────────────
  supabase: {
    url: optionalEnv('SUPABASE_URL'),
    serviceKey: optionalEnv('SUPABASE_SERVICE_KEY'),
  },

  // ── CORS ────────────────────────────────────────────────────────────────────
  corsOrigins: optionalEnv('CORS_ORIGINS', 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),

  // ── App URLs ────────────────────────────────────────────────────────────────
  frontendUrl: optionalEnv('FRONTEND_URL', 'http://localhost:3000'),
  publicDir: optionalEnv('PUBLIC_DIR', './public'),
};

// Validate JWT secret is at least 32 characters
if (config.jwt.secretKey.length < 32) {
  throw new Error('JWT_SECRET_KEY must be at least 32 characters long');
}

module.exports = config;
