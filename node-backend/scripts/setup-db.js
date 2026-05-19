'use strict';

/**
 * setup-db.js
 * Run with: node scripts/setup-db.js
 *
 * - Seeds subscription_features for free/pro/enterprise plans
 * - Upgrades benishimwe31@gmail.com to the 'enterprise' plan
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FEATURES = [
  // ─── FREE plan ───────────────────────────────────────────────────
  { plan: 'free', featureKey: 'events',            isEnabled: true,  limitValue: 1 },
  { plan: 'free', featureKey: 'team_members',      isEnabled: true,  limitValue: 3 },
  { plan: 'free', featureKey: 'inventory',         isEnabled: true,  limitValue: null },
  { plan: 'free', featureKey: 'transactions',      isEnabled: true,  limitValue: null },
  { plan: 'free', featureKey: 'vendors',           isEnabled: true,  limitValue: null },
  { plan: 'free', featureKey: 'guest_album',       isEnabled: true,  limitValue: null },
  { plan: 'free', featureKey: 'ai_assistant',      isEnabled: false, limitValue: null },
  { plan: 'free', featureKey: 'save_the_date',     isEnabled: false, limitValue: null },
  { plan: 'free', featureKey: 'vendor_marketplace',isEnabled: false, limitValue: null },
  { plan: 'free', featureKey: 'reports',           isEnabled: false, limitValue: null },
  { plan: 'free', featureKey: 'wedding_planner',   isEnabled: false, limitValue: null },

  // ─── PRO plan ────────────────────────────────────────────────────
  { plan: 'pro',  featureKey: 'events',            isEnabled: true,  limitValue: null },
  { plan: 'pro',  featureKey: 'team_members',      isEnabled: true,  limitValue: 20 },
  { plan: 'pro',  featureKey: 'inventory',         isEnabled: true,  limitValue: null },
  { plan: 'pro',  featureKey: 'transactions',      isEnabled: true,  limitValue: null },
  { plan: 'pro',  featureKey: 'vendors',           isEnabled: true,  limitValue: null },
  { plan: 'pro',  featureKey: 'guest_album',       isEnabled: true,  limitValue: null },
  { plan: 'pro',  featureKey: 'ai_assistant',      isEnabled: true,  limitValue: null },
  { plan: 'pro',  featureKey: 'save_the_date',     isEnabled: true,  limitValue: null },
  { plan: 'pro',  featureKey: 'vendor_marketplace',isEnabled: true,  limitValue: null },
  { plan: 'pro',  featureKey: 'reports',           isEnabled: true,  limitValue: null },
  { plan: 'pro',  featureKey: 'wedding_planner',   isEnabled: true,  limitValue: null },

  // ─── ENTERPRISE plan ─────────────────────────────────────────────
  { plan: 'enterprise', featureKey: 'events',            isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'team_members',      isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'inventory',         isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'transactions',      isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'vendors',           isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'guest_album',       isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'ai_assistant',      isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'save_the_date',     isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'vendor_marketplace',isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'reports',           isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'wedding_planner',   isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'white_label',       isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'api_access',        isEnabled: true,  limitValue: null },
  { plan: 'enterprise', featureKey: 'subdomain',         isEnabled: true,  limitValue: null },

  // ─── TRIAL plan (same as pro) ─────────────────────────────────────
  { plan: 'trial', featureKey: 'events',            isEnabled: true,  limitValue: null },
  { plan: 'trial', featureKey: 'team_members',      isEnabled: true,  limitValue: 10 },
  { plan: 'trial', featureKey: 'inventory',         isEnabled: true,  limitValue: null },
  { plan: 'trial', featureKey: 'transactions',      isEnabled: true,  limitValue: null },
  { plan: 'trial', featureKey: 'vendors',           isEnabled: true,  limitValue: null },
  { plan: 'trial', featureKey: 'guest_album',       isEnabled: true,  limitValue: null },
  { plan: 'trial', featureKey: 'ai_assistant',      isEnabled: true,  limitValue: null },
  { plan: 'trial', featureKey: 'save_the_date',     isEnabled: true,  limitValue: null },
  { plan: 'trial', featureKey: 'vendor_marketplace',isEnabled: true,  limitValue: null },
  { plan: 'trial', featureKey: 'reports',           isEnabled: true,  limitValue: null },
  { plan: 'trial', featureKey: 'wedding_planner',   isEnabled: true,  limitValue: null },
];

async function seedFeatures() {
  console.log('Seeding subscription features...');
  for (const f of FEATURES) {
    await prisma.subscriptionFeature.upsert({
      where: {
        // Use a compound unique approach: delete existing and insert
        featureId: '00000000-0000-0000-0000-000000000000', // won't match
      },
      update: {},
      create: {
        plan: f.plan,
        featureKey: f.featureKey,
        isEnabled: f.isEnabled,
        limitValue: f.limitValue ?? null,
      },
    }).catch(async () => {
      // If upsert fails, try findFirst then update/create
      const existing = await prisma.subscriptionFeature.findFirst({
        where: { plan: f.plan, featureKey: f.featureKey },
      });
      if (existing) {
        await prisma.subscriptionFeature.update({
          where: { featureId: existing.featureId },
          data: { isEnabled: f.isEnabled, limitValue: f.limitValue ?? null },
        });
      } else {
        await prisma.subscriptionFeature.create({
          data: { plan: f.plan, featureKey: f.featureKey, isEnabled: f.isEnabled, limitValue: f.limitValue ?? null },
        });
      }
    });
  }
  console.log(`  ✓ ${FEATURES.length} feature rows seeded`);
}

async function upgradeAdminToMax() {
  const ADMIN_EMAIL = 'benishimwe31@gmail.com';
  console.log(`\nUpgrading ${ADMIN_EMAIL} to enterprise plan...`);

  const user = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!user) {
    console.log(`  ✗ User not found. Login once to create the account, then re-run this script.`);
    return;
  }

  // Ensure the user is tenant_admin role
  if (user.role !== 'tenant_admin' && user.role !== 'super_admin') {
    await prisma.user.update({
      where: { userId: user.userId },
      data: { role: 'tenant_admin' },
    });
    console.log(`  ✓ Set role to tenant_admin`);
  }

  // Create or update the tenant's subscription to max
  if (user.tenantId) {
    // Upgrade tenant's subscriptionTier
    await prisma.tenant.update({
      where: { tenantId: user.tenantId },
      data: { subscriptionTier: 'enterprise', subscriptionStatus: 'active' },
    });
    console.log(`  ✓ Tenant subscriptionTier set to 'enterprise'`);

    // Create or update subscription record
    const existing = await prisma.subscription.findFirst({
      where: { tenantId: user.tenantId, status: { in: ['active', 'trialing'] } },
    });
    if (existing) {
      await prisma.subscription.update({
        where: { subscriptionId: existing.subscriptionId },
        data: { plan: 'enterprise', status: 'active' },
      });
      console.log(`  ✓ Updated existing subscription to plan='enterprise'`);
    } else {
      await prisma.subscription.create({
        data: {
          userId: user.userId,
          tenantId: user.tenantId,
          plan: 'enterprise',
          status: 'active',
          currentPeriodStart: new Date(),
          currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        },
      });
      console.log(`  ✓ Created new subscription with plan='enterprise'`);
    }
  } else {
    // User has no tenant — create one
    const tenant = await prisma.tenant.create({
      data: {
        name: 'Prani Events',
        slug: 'prani-events-' + Date.now(),
        subscriptionTier: 'enterprise',
        subscriptionStatus: 'active',
        isActive: true,
      },
    });
    await prisma.user.update({
      where: { userId: user.userId },
      data: { tenantId: tenant.tenantId, role: 'tenant_admin' },
    });
    await prisma.subscription.create({
      data: {
        userId: user.userId,
        tenantId: tenant.tenantId,
        plan: 'enterprise',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
    console.log(`  ✓ Created tenant and subscription for ${ADMIN_EMAIL}`);
  }

  // Also create a free subscription on the user record if missing
  const userSub = await prisma.subscription.findFirst({ where: { userId: user.userId } });
  if (!userSub) {
    await prisma.subscription.create({
      data: {
        userId: user.userId,
        tenantId: user.tenantId,
        plan: 'enterprise',
        status: 'active',
        currentPeriodStart: new Date(),
        currentPeriodEnd: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log(`  ✓ ${ADMIN_EMAIL} now has enterprise plan`);
}

async function main() {
  try {
    await seedFeatures();
    await upgradeAdminToMax();
    console.log('\n✅ Setup complete!');
  } catch (err) {
    console.error('Setup failed:', err.message);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
