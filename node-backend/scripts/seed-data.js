'use strict';

/**
 * seed-data.js
 * Run with: node scripts/seed-data.js
 *
 * Seeds demo data (events, inventory, vendors, staff, transactions)
 * for the tenant belonging to benishimwe31@gmail.com.
 */

require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');

const prisma = new PrismaClient();

const ADMIN_EMAIL = 'benishimwe31@gmail.com';

async function main() {
  const admin = await prisma.user.findUnique({ where: { email: ADMIN_EMAIL } });
  if (!admin?.tenantId) {
    console.error('Admin user not found or has no tenant. Run setup-db.js first and log in once.');
    process.exit(1);
  }

  const { userId: adminId, tenantId } = admin;
  console.log(`Seeding data for tenant ${tenantId}...`);

  // ─── Staff members ────────────────────────────────────────────────────────────
  console.log('\nCreating staff members...');
  const staffHash = await bcrypt.hash('Staff@2025!', 10);
  const staffData = [
    { name: 'Amina Uwase', email: 'amina.uwase@prani.app', role: 'staff', skills: ['Photography', 'Decoration'], availability: 'weekends' },
    { name: 'Jean-Pierre Habimana', email: 'jp.habimana@prani.app', role: 'staff', skills: ['Coordination', 'Guest Management'], availability: 'full-time' },
    { name: 'Grace Mukamana', email: 'grace.mukamana@prani.app', role: 'staff', skills: ['Catering', 'Bartending'], availability: 'evenings' },
  ];
  const staffUsers = [];
  for (const s of staffData) {
    const existing = await prisma.user.findUnique({ where: { email: s.email } });
    if (existing) {
      staffUsers.push(existing);
      console.log(`  - ${s.name} (already exists)`);
      continue;
    }
    const u = await prisma.user.create({
      data: { ...s, tenantId, isActive: true, passwordHash: staffHash },
    });
    staffUsers.push(u);
    console.log(`  + ${s.name}`);
  }

  // ─── Vendors ──────────────────────────────────────────────────────────────────
  console.log('\nCreating vendors...');
  const vendorData = [
    { name: 'Kigali Floral Studio', category: 'Flowers & Decoration', contactName: 'Marie Uwera', email: 'info@kigalifloral.rw', phone: '+250 788 001 001', location: 'Kigali, KG 123 Ave', rating: 4.8, isActive: true },
    { name: 'Serena Catering Co.', category: 'Catering', contactName: 'David Nkusi', email: 'catering@serena.rw', phone: '+250 788 002 002', location: 'Kigali, KN 4 Ave', rating: 4.9, isActive: true },
    { name: 'Rwanda Photo Masters', category: 'Photography', contactName: 'Patrick Mugabo', email: 'hello@rwandaphoto.rw', phone: '+250 788 003 003', location: 'Kigali, KG 7 Ave', rating: 4.7, isActive: true },
    { name: 'Kigali Sound & Light', category: 'Entertainment', contactName: 'Eric Niyomukiza', email: 'events@kigalisound.rw', phone: '+250 788 004 004', location: 'Kigali, KN 12 St', rating: 4.6, isActive: true },
    { name: 'Luxury Limo Rwanda', category: 'Transportation', contactName: 'Alice Mukamutesi', email: 'bookings@luxlimo.rw', phone: '+250 788 005 005', location: 'Kigali, KG 9 Ave', rating: 4.5, isActive: true },
  ];
  const vendors = [];
  for (const v of vendorData) {
    const existing = await prisma.vendor.findFirst({ where: { name: v.name, tenantId } });
    if (existing) {
      vendors.push(existing);
      console.log(`  - ${v.name} (already exists)`);
      continue;
    }
    const vendor = await prisma.vendor.create({ data: { ...v, tenantId } });
    vendors.push(vendor);
    console.log(`  + ${v.name}`);
  }

  // ─── Events ───────────────────────────────────────────────────────────────────
  console.log('\nCreating events...');
  const now = new Date();
  const eventsData = [
    {
      name: 'Uwase Habimana Wedding',
      eventDate: new Date(now.getFullYear(), now.getMonth() + 2, 15),
      venue: 'Kigali Serena Hotel',
      guestCount: 350,
      budget: 25000000,
      status: 'planning',
      clientName: 'Amina Uwase',
      notes: 'Traditional Rwandan ceremony and modern reception',
    },
    {
      name: 'Nkurunziza Corporate Gala',
      eventDate: new Date(now.getFullYear(), now.getMonth() + 1, 20),
      venue: 'Radisson Blu Hotel Kigali',
      guestCount: 200,
      budget: 15000000,
      status: 'confirmed',
      clientName: 'Emmanuel Nkurunziza',
      notes: 'Annual company awards dinner',
    },
  ];
  // Use raw SQL throughout to avoid Prisma binary-protocol issues with Supabase
  const existingEvents = await prisma.$queryRawUnsafe(
    `SELECT event_id AS "eventId", name FROM events WHERE tenant_id = '${tenantId}'`
  );
  const existingEventNames = new Set(existingEvents.map(e => e.name));
  const events = [...existingEvents];

  for (const e of eventsData) {
    if (existingEventNames.has(e.name)) {
      console.log(`  - ${e.name} (already exists)`);
      continue;
    }
    const [ev] = await prisma.$queryRaw`
      INSERT INTO events (event_id, tenant_id, name, event_date, venue, guest_count, budget, status, client_name, notes)
      VALUES (
        gen_random_uuid()::text, ${tenantId}, ${e.name}, ${e.eventDate}::timestamp,
        ${e.venue}, ${e.guestCount}::int, ${String(e.budget)}::numeric, ${e.status}, ${e.clientName}, ${e.notes}
      )
      RETURNING event_id::text AS "eventId", name
    `;
    events.push(ev);
    console.log(`  + ${e.name}`);
  }

  // ─── Inventory items ──────────────────────────────────────────────────────────
  console.log('\nCreating inventory items...');
  const inventoryData = [
    { name: 'Round Banquet Table (180cm)', category: 'Furniture', quantity: 50, condition: 'good', purchasePrice: 75000, rentalPrice: 5000 },
    { name: 'Chiavari Chair (Gold)', category: 'Furniture', quantity: 400, condition: 'good', purchasePrice: 35000, rentalPrice: 2000 },
    { name: 'LED Uplighting Unit', category: 'Lighting', quantity: 20, condition: 'excellent', purchasePrice: 180000, rentalPrice: 15000 },
    { name: 'Wedding Arch (White Floral)', category: 'Decoration', quantity: 3, condition: 'good', purchasePrice: 250000, rentalPrice: 30000 },
    { name: 'Portable PA System (1000W)', category: 'Audio', quantity: 4, condition: 'good', purchasePrice: 450000, rentalPrice: 50000 },
  ];
  for (const item of inventoryData) {
    const existing = await prisma.inventoryItem.findFirst({ where: { name: item.name, tenantId } });
    if (existing) {
      console.log(`  - ${item.name} (already exists)`);
      continue;
    }
    await prisma.inventoryItem.create({ data: { ...item, tenantId, isActive: true } });
    console.log(`  + ${item.name}`);
  }

  // ─── Transactions (inventory rental records) ─────────────────────────────────
  console.log('\nCreating transactions...');
  const inventoryItems = await prisma.inventoryItem.findMany({ where: { tenantId }, take: 5 });

  const txData = [
    { type: 'rent', itemName: 'Round Banquet Table (180cm)', eventName: 'Uwase Habimana Wedding', quantity: 30 },
    { type: 'rent', itemName: 'Chiavari Chair (Gold)', eventName: 'Uwase Habimana Wedding', quantity: 250 },
    { type: 'rent', itemName: 'LED Uplighting Unit', eventName: 'Uwase Habimana Wedding', quantity: 10 },
    { type: 'rent', itemName: 'Wedding Arch (White Floral)', eventName: 'Uwase Habimana Wedding', quantity: 1 },
    { type: 'rent', itemName: 'Portable PA System (1000W)', eventName: 'Nkurunziza Corporate Gala', quantity: 2 },
    { type: 'return', itemName: 'Round Banquet Table (180cm)', eventName: 'Nkurunziza Corporate Gala', quantity: 20 },
    { type: 'rent', itemName: 'Chiavari Chair (Gold)', eventName: 'Nkurunziza Corporate Gala', quantity: 150 },
    { type: 'return', itemName: 'LED Uplighting Unit', eventName: 'Previous Event', quantity: 5 },
    { type: 'rent', itemName: 'Wedding Arch (White Floral)', eventName: 'Previous Event', quantity: 1 },
    { type: 'return', itemName: 'Portable PA System (1000W)', eventName: 'Previous Event', quantity: 2 },
  ];

  const existingTxCount = await prisma.transaction.count({ where: { tenantId } });
  if (existingTxCount >= 10) {
    console.log(`  - Transactions already exist (${existingTxCount} found)`);
  } else {
    for (let i = 0; i < txData.length; i++) {
      const tx = txData[i];
      const item = inventoryItems[i % inventoryItems.length];
      const staff = staffUsers[i % staffUsers.length];
      if (!item || !staff) { console.log(`  - skipping tx (no item or staff)`); continue; }
      await prisma.transaction.create({
        data: {
          type: tx.type,
          tenantId,
          itemId: item.itemId,
          itemName: tx.itemName,
          eventId: i < 5 ? events[0]?.eventId : events[1]?.eventId,
          eventName: tx.eventName,
          staffId: staff.userId,
          staffName: staff.name,
          quantity: tx.quantity,
        },
      });
      console.log(`  + ${tx.type}: ${tx.itemName} (qty: ${tx.quantity})`);
    }
  }

  // ─── Shifts ───────────────────────────────────────────────────────────────────
  console.log('\nCreating shifts...');
  const existingShiftCount = await prisma.shift.count({ where: { tenantId } });
  if (existingShiftCount > 0) {
    console.log(`  - Shifts already exist (${existingShiftCount} found)`);
  } else {
    const shiftData = [
      { role: 'Photography Lead', staffIdx: 0, eventIdx: 0, date: new Date(now.getFullYear(), now.getMonth() + 2, 15), startTime: '08:00', endTime: '20:00' },
      { role: 'Guest Coordinator', staffIdx: 1, eventIdx: 0, date: new Date(now.getFullYear(), now.getMonth() + 2, 15), startTime: '10:00', endTime: '22:00' },
      { role: 'Catering Supervisor', staffIdx: 2, eventIdx: 0, date: new Date(now.getFullYear(), now.getMonth() + 2, 15), startTime: '12:00', endTime: '23:00' },
      { role: 'Event Coordinator', staffIdx: 1, eventIdx: 1, date: new Date(now.getFullYear(), now.getMonth() + 1, 20), startTime: '09:00', endTime: '18:00' },
      { role: 'AV Technician', staffIdx: 0, eventIdx: 1, date: new Date(now.getFullYear(), now.getMonth() + 1, 20), startTime: '07:00', endTime: '19:00' },
    ];
    for (const s of shiftData) {
      const staff = staffUsers[s.staffIdx];
      const event = events[s.eventIdx];
      if (!staff) { console.log('  - skipping shift (no staff)'); continue; }
      await prisma.shift.create({
        data: {
          tenantId,
          eventId: event?.eventId || null,
          staffId: staff.userId,
          staffName: staff.name,
          role: s.role,
          date: s.date,
          startTime: s.startTime,
          endTime: s.endTime,
          status: 'scheduled',
        },
      });
      console.log(`  + ${s.role} — ${staff.name}`);
    }
  }

  console.log('\n✅ Seed data complete!');
}

main()
  .catch((err) => {
    console.error('Seeding failed:', err.message);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
