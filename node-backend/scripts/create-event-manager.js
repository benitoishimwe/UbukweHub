'use strict';

/**
 * create-event-manager.js
 * Run with: node scripts/create-event-manager.js
 *
 * Creates a test event_manager account under the same tenant as
 * benishimwe31@gmail.com, then prints the login credentials.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL    = 'benishimwe31@gmail.com';
const EM_EMAIL       = 'eventmanager@prani.com';
const EM_PASSWORD    = 'EventManager@2025';
const EM_NAME        = 'Event Manager';

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin?.tenantId) {
    console.error('Admin user not found or has no tenant. Run setup-db.js first and log in once.');
    process.exit(1);
  }

  const { tenantId } = admin;

  const existing = await prisma.user.findUnique({ where: { email: EM_EMAIL } });
  if (existing) {
    console.log(`\nEvent manager already exists (${EM_EMAIL}). Skipping creation.`);
  } else {
    const passwordHash = await bcrypt.hash(EM_PASSWORD, 10);
    await prisma.user.create({
      data: {
        name: EM_NAME,
        email: EM_EMAIL,
        role: 'event_manager',
        tenantId,
        isActive: true,
        passwordHash,
      },
    });
    console.log('\n✅ Event manager account created.');
  }

  console.log('\n──────────────────────────────────────');
  console.log('  Event Manager Credentials');
  console.log('──────────────────────────────────────');
  console.log(`  Email    : ${EM_EMAIL}`);
  console.log(`  Password : ${EM_PASSWORD}`);
  console.log(`  Role     : event_manager`);
  console.log(`  Tenant   : ${tenantId}`);
  console.log('──────────────────────────────────────\n');
}

main()
  .catch(err => { console.error(err); process.exit(1); })
  .finally(() => prisma.$disconnect());
