'use strict';

/**
 * One-time cleanup: remove manually-created vendors (no linked user account)
 * that were created by tenant admins under the old workflow.
 *
 * Targets: vendors where userId IS NULL (admin-created, no self-signup).
 * You can also pass a specific name via env: VENDOR_NAME="Luxury Limo Rwanda"
 *
 * Usage:
 *   node scripts/remove-manual-vendor.js
 *   VENDOR_NAME="Luxury Limo Rwanda" node scripts/remove-manual-vendor.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const targetName = process.env.VENDOR_NAME || null;

  const where = targetName
    ? { name: targetName, userId: null }
    : { userId: null };

  const vendors = await prisma.vendor.findMany({ where, select: { vendorId: true, name: true, email: true } });

  if (vendors.length === 0) {
    console.log('No matching vendors found — nothing to delete.');
    return;
  }

  console.log(`Found ${vendors.length} vendor(s) to remove:`);
  vendors.forEach((v) => console.log(`  • ${v.name} (${v.email || 'no email'}) — id: ${v.vendorId}`));

  for (const v of vendors) {
    const { vendorId } = v;

    // Use raw SQL for event_vendors in case Prisma client predates that migration
    await prisma.$executeRawUnsafe(`DELETE FROM event_vendors WHERE vendor_id = $1::uuid`, vendorId).catch(() => {});

    await prisma.vendorAnalytics.deleteMany({ where: { vendorId } }).catch(() => {});
    await prisma.vendorOnboarding.deleteMany({ where: { vendorId } }).catch(() => {});
    await prisma.vendorFavorite.deleteMany({ where: { vendorId } }).catch(() => {});
    await prisma.vendorInquiry.deleteMany({ where: { vendorId } }).catch(() => {});
    await prisma.vendorReview.deleteMany({ where: { vendorId } }).catch(() => {});
    await prisma.vendorPortfolio.deleteMany({ where: { vendorId } }).catch(() => {});
    await prisma.vendorProfile.deleteMany({ where: { vendorId } }).catch(() => {});
    await prisma.vendor.delete({ where: { vendorId } });

    console.log(`  ✓ Deleted: ${v.name}`);
  }

  console.log('Done.');
}

main()
  .catch((err) => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
