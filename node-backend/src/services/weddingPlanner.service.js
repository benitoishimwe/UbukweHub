'use strict';

const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

// ─── Plan ─────────────────────────────────────────────────────────────────────

/**
 * Get the latest wedding plan for a user (or create one if none exists).
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.tenantId
 * @param {string} [params.eventId]
 */
async function getOrCreatePlan({ userId, tenantId, eventId }) {
  let plan = await prisma.weddingPlan.findFirst({
    where: { userId, tenantId },
    orderBy: { createdAt: 'desc' },
    include: {
      _count: {
        select: {
          budgetItems: true,
          guests: true,
          venues: true,
          menuItems: true,
          designAssets: true,
        },
      },
    },
  });

  if (!plan) {
    plan = await prisma.weddingPlan.create({
      data: {
        userId,
        tenantId,
        eventId: eventId || null,
      },
      include: {
        _count: {
          select: {
            budgetItems: true,
            guests: true,
            venues: true,
            menuItems: true,
            designAssets: true,
          },
        },
      },
    });
  }

  return plan;
}

/**
 * Get a plan by ID, verified against userId ownership.
 *
 * @param {string} planId
 * @param {string} userId
 */
async function getPlanById(planId, userId) {
  const plan = await prisma.weddingPlan.findUnique({ where: { planId } });
  if (!plan) throw new AppError('Wedding plan not found', 404, 'PLAN_NOT_FOUND');
  if (plan.userId !== userId) throw new AppError('Wedding plan not found', 404, 'PLAN_NOT_FOUND');
  return plan;
}

/**
 * Update top-level plan fields.
 *
 * @param {string} planId
 * @param {string} userId
 * @param {object} updates
 */
async function updatePlan(planId, userId, { weddingDate, theme, primaryColor, secondaryColor, totalBudget, notes }) {
  await getPlanById(planId, userId);

  const data = {};
  if (weddingDate !== undefined) data.weddingDate = weddingDate ? new Date(weddingDate) : null;
  if (theme !== undefined) data.theme = theme;
  if (primaryColor !== undefined) data.primaryColor = primaryColor;
  if (secondaryColor !== undefined) data.secondaryColor = secondaryColor;
  if (totalBudget !== undefined) data.totalBudget = totalBudget;
  if (notes !== undefined) data.notes = notes;

  return prisma.weddingPlan.update({ where: { planId }, data });
}

/**
 * Return a dashboard summary for the plan.
 *
 * @param {string} planId
 * @param {string} userId
 */
async function getDashboard(planId, userId) {
  const plan = await getPlanById(planId, userId);

  const [budgetAgg, guestStats, venueCount, menuAgg] = await Promise.all([
    prisma.weddingBudgetItem.aggregate({
      where: { planId },
      _sum: { estimatedCost: true, actualCost: true },
      _count: { itemId: true },
    }),
    prisma.weddingGuest.groupBy({
      by: ['rsvpStatus'],
      where: { planId },
      _count: { guestId: true },
    }),
    prisma.weddingVenue.count({ where: { planId } }),
    prisma.weddingMenuItem.groupBy({
      by: ['course'],
      where: { planId },
      _count: { itemId: true },
    }),
  ]);

  const guestBreakdown = {};
  let guestTotal = 0;
  for (const g of guestStats) {
    guestBreakdown[g.rsvpStatus] = g._count.guestId;
    guestTotal += g._count.guestId;
  }

  return {
    plan,
    budget: {
      totalEstimated: budgetAgg._sum.estimatedCost || 0,
      totalActual: budgetAgg._sum.actualCost || 0,
      itemCount: budgetAgg._count.itemId,
      totalBudget: plan.totalBudget || 0,
    },
    guests: {
      total: guestTotal,
      ...guestBreakdown,
    },
    venueCount,
    menu: menuAgg.map((m) => ({ course: m.course, count: m._count.itemId })),
  };
}

// ─── Budget ───────────────────────────────────────────────────────────────────

async function addBudgetItem(planId, userId, { category, description, estimatedCost, actualCost, vendorId, status, dueDate }) {
  await getPlanById(planId, userId);

  return prisma.weddingBudgetItem.create({
    data: {
      planId,
      category,
      description: description || null,
      estimatedCost: estimatedCost !== undefined ? estimatedCost : null,
      actualCost: actualCost !== undefined ? actualCost : null,
      vendorId: vendorId || null,
      status: status || 'planned',
      dueDate: dueDate ? new Date(dueDate) : null,
    },
  });
}

async function updateBudgetItem(itemId, planId, updates) {
  const item = await prisma.weddingBudgetItem.findUnique({ where: { itemId } });
  if (!item || item.planId !== planId) throw new AppError('Budget item not found', 404, 'ITEM_NOT_FOUND');

  const allowed = ['category', 'description', 'estimatedCost', 'actualCost', 'vendorId', 'status', 'dueDate'];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) {
      data[key] = key === 'dueDate' ? (updates[key] ? new Date(updates[key]) : null) : updates[key];
    }
  }

  return prisma.weddingBudgetItem.update({ where: { itemId }, data });
}

async function deleteBudgetItem(itemId, planId) {
  const item = await prisma.weddingBudgetItem.findUnique({ where: { itemId } });
  if (!item || item.planId !== planId) throw new AppError('Budget item not found', 404, 'ITEM_NOT_FOUND');
  await prisma.weddingBudgetItem.delete({ where: { itemId } });
}

async function listBudgetItems(planId, userId) {
  await getPlanById(planId, userId);

  const [items, agg] = await Promise.all([
    prisma.weddingBudgetItem.findMany({
      where: { planId },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.weddingBudgetItem.aggregate({
      where: { planId },
      _sum: { estimatedCost: true, actualCost: true },
    }),
  ]);

  return {
    items,
    totals: {
      estimatedCost: agg._sum.estimatedCost || 0,
      actualCost: agg._sum.actualCost || 0,
    },
  };
}

// ─── Guests ───────────────────────────────────────────────────────────────────

async function addGuest(planId, userId, { fullName, email, phone, rsvpStatus, mealChoice, dietaryRestrictions, tableNumber }) {
  await getPlanById(planId, userId);

  return prisma.weddingGuest.create({
    data: {
      planId,
      fullName,
      email: email || null,
      phone: phone || null,
      rsvpStatus: rsvpStatus || 'pending',
      mealChoice: mealChoice || null,
      dietaryRestrictions: dietaryRestrictions || null,
      tableNumber: tableNumber !== undefined ? tableNumber : null,
    },
  });
}

async function updateGuest(guestId, planId, updates) {
  const guest = await prisma.weddingGuest.findUnique({ where: { guestId } });
  if (!guest || guest.planId !== planId) throw new AppError('Guest not found', 404, 'GUEST_NOT_FOUND');

  const allowed = ['fullName', 'email', 'phone', 'rsvpStatus', 'mealChoice', 'dietaryRestrictions', 'tableNumber', 'invitationSent', 'thankYouSent'];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  return prisma.weddingGuest.update({ where: { guestId }, data });
}

async function deleteGuest(guestId, planId) {
  const guest = await prisma.weddingGuest.findUnique({ where: { guestId } });
  if (!guest || guest.planId !== planId) throw new AppError('Guest not found', 404, 'GUEST_NOT_FOUND');
  await prisma.weddingGuest.delete({ where: { guestId } });
}

async function listGuests(planId, userId, { rsvpStatus } = {}) {
  await getPlanById(planId, userId);

  const where = { planId };
  if (rsvpStatus) where.rsvpStatus = rsvpStatus;

  return prisma.weddingGuest.findMany({
    where,
    orderBy: { fullName: 'asc' },
  });
}

async function getGuestStats(planId) {
  const [total, attending, declined, pending, mealChoices] = await Promise.all([
    prisma.weddingGuest.count({ where: { planId } }),
    prisma.weddingGuest.count({ where: { planId, rsvpStatus: 'attending' } }),
    prisma.weddingGuest.count({ where: { planId, rsvpStatus: 'declined' } }),
    prisma.weddingGuest.count({ where: { planId, rsvpStatus: 'pending' } }),
    prisma.weddingGuest.groupBy({
      by: ['mealChoice'],
      where: { planId },
      _count: { guestId: true },
    }),
  ]);

  const mealBreakdown = {};
  for (const m of mealChoices) {
    const choice = m.mealChoice || 'unspecified';
    mealBreakdown[choice] = m._count.guestId;
  }

  return { total, attending, declined, pending, mealChoices: mealBreakdown };
}

// ─── Venues ───────────────────────────────────────────────────────────────────

async function addVenue(planId, userId, { name, address, contactName, contactPhone, capacity, rentalFee, includedItems, notes }) {
  await getPlanById(planId, userId);

  return prisma.weddingVenue.create({
    data: {
      planId,
      name,
      address: address || null,
      contactName: contactName || null,
      contactPhone: contactPhone || null,
      capacity: capacity !== undefined ? capacity : null,
      rentalFee: rentalFee !== undefined ? rentalFee : null,
      includedItems: includedItems || null,
      notes: notes || null,
    },
  });
}

async function updateVenue(venueId, planId, updates) {
  const venue = await prisma.weddingVenue.findUnique({ where: { venueId } });
  if (!venue || venue.planId !== planId) throw new AppError('Venue not found', 404, 'VENUE_NOT_FOUND');

  const allowed = ['name', 'address', 'contactName', 'contactPhone', 'capacity', 'rentalFee', 'includedItems', 'notes'];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  return prisma.weddingVenue.update({ where: { venueId }, data });
}

async function deleteVenue(venueId, planId) {
  const venue = await prisma.weddingVenue.findUnique({ where: { venueId } });
  if (!venue || venue.planId !== planId) throw new AppError('Venue not found', 404, 'VENUE_NOT_FOUND');
  await prisma.weddingVenue.delete({ where: { venueId } });
}

async function selectVenue(venueId, planId) {
  const venue = await prisma.weddingVenue.findUnique({ where: { venueId } });
  if (!venue || venue.planId !== planId) throw new AppError('Venue not found', 404, 'VENUE_NOT_FOUND');

  // Deselect all venues for this plan, then select the chosen one
  await prisma.$transaction([
    prisma.weddingVenue.updateMany({ where: { planId }, data: { isSelected: false } }),
    prisma.weddingVenue.update({ where: { venueId }, data: { isSelected: true } }),
  ]);

  return prisma.weddingVenue.findUnique({ where: { venueId } });
}

async function listVenues(planId) {
  return prisma.weddingVenue.findMany({
    where: { planId },
    orderBy: { createdAt: 'asc' },
  });
}

// ─── Menu ─────────────────────────────────────────────────────────────────────

async function addMenuItem(planId, userId, { course, name, description, dietaryInfo, isFinal }) {
  await getPlanById(planId, userId);

  return prisma.weddingMenuItem.create({
    data: {
      planId,
      course: course || null,
      name,
      description: description || null,
      dietaryInfo: dietaryInfo || null,
      isFinal: isFinal !== undefined ? isFinal : false,
    },
  });
}

async function updateMenuItem(itemId, planId, updates) {
  const item = await prisma.weddingMenuItem.findUnique({ where: { itemId } });
  if (!item || item.planId !== planId) throw new AppError('Menu item not found', 404, 'MENU_ITEM_NOT_FOUND');

  const allowed = ['course', 'name', 'description', 'dietaryInfo', 'isFinal'];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  return prisma.weddingMenuItem.update({ where: { itemId }, data });
}

async function deleteMenuItem(itemId, planId) {
  const item = await prisma.weddingMenuItem.findUnique({ where: { itemId } });
  if (!item || item.planId !== planId) throw new AppError('Menu item not found', 404, 'MENU_ITEM_NOT_FOUND');
  await prisma.weddingMenuItem.delete({ where: { itemId } });
}

async function listMenuItems(planId, course) {
  const where = { planId };
  if (course) where.course = course;
  return prisma.weddingMenuItem.findMany({
    where,
    orderBy: { createdAt: 'asc' },
  });
}

// ─── Design Assets ────────────────────────────────────────────────────────────

async function addDesignAsset(planId, userId, { imageUrl, caption, sortOrder }) {
  await getPlanById(planId, userId);

  return prisma.weddingDesignAsset.create({
    data: {
      planId,
      imageUrl,
      caption: caption || null,
      sortOrder: sortOrder !== undefined ? sortOrder : 0,
    },
  });
}

async function deleteDesignAsset(assetId, planId) {
  const asset = await prisma.weddingDesignAsset.findUnique({ where: { assetId } });
  if (!asset || asset.planId !== planId) throw new AppError('Design asset not found', 404, 'ASSET_NOT_FOUND');
  await prisma.weddingDesignAsset.delete({ where: { assetId } });
}

async function listDesignAssets(planId) {
  return prisma.weddingDesignAsset.findMany({
    where: { planId },
    orderBy: { sortOrder: 'asc' },
  });
}

module.exports = {
  // Plan
  getOrCreatePlan,
  getPlanById,
  updatePlan,
  getDashboard,
  // Budget
  addBudgetItem,
  updateBudgetItem,
  deleteBudgetItem,
  listBudgetItems,
  // Guests
  addGuest,
  updateGuest,
  deleteGuest,
  listGuests,
  getGuestStats,
  // Venues
  addVenue,
  updateVenue,
  deleteVenue,
  selectVenue,
  listVenues,
  // Menu
  addMenuItem,
  updateMenuItem,
  deleteMenuItem,
  listMenuItems,
  // Design Assets
  addDesignAsset,
  deleteDesignAsset,
  listDesignAssets,
};
