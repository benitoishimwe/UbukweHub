'use strict';

const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

/**
 * Browse marketplace-active vendors with optional filters and pagination.
 *
 * @param {object} params
 * @param {string} [params.category]
 * @param {string} [params.search]
 * @param {number} [params.minPrice]
 * @param {number} [params.maxPrice]
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 * @param {string} [params.tenantId]
 */
async function browseVendors({ category, search, minPrice, maxPrice, page = 1, size = 20 } = {}) {
  const skip = (page - 1) * size;

  // Show vendors that have opted into marketplace (isPublic) OR have been admin-approved
  const where = {
    isActive: true,
    OR: [
      { isPublic: true },
      { approvedByAdmin: true },
    ],
  };
  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { contactName: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      skip,
      take: size,
      include: {
        profile: {
          select: { priceMin: true, priceMax: true, currency: true, bio: true },
        },
      },
      orderBy: [{ rating: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.vendor.count({ where }),
  ]);

  const enriched = vendors.map((v) => ({
    vendorId:        v.vendorId,
    name:            v.name,
    category:        v.category,
    contactName:     v.contactName,
    email:           v.email,
    phone:           v.phone,
    location:        v.location,
    rating:          Number(v.rating),
    isVerified:      v.isVerified,
    approvedByAdmin: v.approvedByAdmin,
    priceMin:        v.profile?.priceMin  ? Number(v.profile.priceMin)  : null,
    priceMax:        v.profile?.priceMax  ? Number(v.profile.priceMax)  : null,
    currency:        v.profile?.currency  || 'USD',
    bio:             v.profile?.bio       || null,
    tenantId:        v.tenantId,
  }));

  return {
    data: enriched,
    meta: { total, page, size, totalPages: Math.ceil(total / size) },
  };
}

/**
 * Get the public profile for a single vendor including portfolio, rating, and reviews.
 *
 * @param {string} vendorId
 */
async function getVendorPublicProfile(vendorId) {
  const vendor = await prisma.vendor.findUnique({
    where: { vendorId },
    include: {
      profile: true,
      portfolio: { orderBy: { displayOrder: 'asc' } },
    },
  });

  if (!vendor || !vendor.isActive || !vendor.approvedByAdmin) {
    throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  }

  // Increment view count asynchronously
  const today = new Date(); today.setHours(0, 0, 0, 0);
  Promise.all([
    prisma.vendor.update({ where: { vendorId }, data: { viewCount: { increment: 1 } } }),
    prisma.vendorAnalytics.upsert({
      where: { vendorId_date: { vendorId, date: today } },
      create: { vendorId, date: today, views: 1 },
      update: { views: { increment: 1 } },
    }),
  ]).catch(() => {});

  const agg = await prisma.vendorReview.aggregate({
    where: { vendorId },
    _avg: { rating: true },
    _count: { reviewId: true },
  });

  return {
    ...vendor,
    avgRating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : null,
    reviewCount: agg._count.reviewId,
  };
}

/**
 * Get paginated reviews for a vendor.
 *
 * @param {string} vendorId
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 */
async function getVendorReviews(vendorId, { page = 1, size = 20 } = {}) {
  const skip = (page - 1) * size;
  const where = { vendorId };

  const [reviews, total] = await Promise.all([
    prisma.vendorReview.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { userId: true, name: true } },
      },
    }),
    prisma.vendorReview.count({ where }),
  ]);

  return {
    data: reviews,
    meta: { total, page, size, totalPages: Math.ceil(total / size) },
  };
}

/**
 * Create a review for a vendor. Each user may only review a vendor once.
 *
 * @param {object} params
 * @param {string} params.vendorId
 * @param {string} params.userId
 * @param {string} [params.eventId]
 * @param {number} params.rating
 * @param {string} [params.title]
 * @param {string} [params.body]
 */
async function createReview({ vendorId, userId, eventId, rating, title, body }) {
  const vendor = await prisma.vendor.findUnique({ where: { vendorId } });
  if (!vendor || !vendor.isActive) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const existing = await prisma.vendorReview.findFirst({ where: { vendorId, userId } });
  if (existing) throw new AppError('You have already reviewed this vendor', 409, 'ALREADY_REVIEWED');

  const review = await prisma.$transaction(async (tx) => {
    const created = await tx.vendorReview.create({
      data: {
        vendorId,
        userId,
        eventId: eventId || null,
        rating,
        title: title || null,
        body: body || null,
      },
    });

    // Recalculate and persist average rating + count on the vendor
    const agg = await tx.vendorReview.aggregate({
      where: { vendorId },
      _avg: { rating: true },
      _count: { reviewId: true },
    });

    await tx.vendor.update({
      where: { vendorId },
      data: {
        rating: agg._avg.rating ? Number(agg._avg.rating.toFixed(2)) : 0,
        ratingCount: agg._count.reviewId,
      },
    });

    return created;
  });

  return review;
}

/**
 * Create an inquiry to a vendor.
 *
 * @param {object} params
 * @param {string} params.vendorId
 * @param {string} params.userId
 * @param {string} [params.eventId]
 * @param {string} [params.message]
 * @param {number} [params.budget]
 * @param {string|Date} [params.eventDate]
 */
async function createInquiry({ vendorId, userId, eventId, message, budget, eventDate }) {
  const vendor = await prisma.vendor.findUnique({ where: { vendorId } });
  if (!vendor || !vendor.isActive) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const inquiry = await prisma.vendorInquiry.create({
    data: {
      vendorId,
      userId,
      eventId: eventId || null,
      message: message || null,
      budget: budget !== undefined ? budget : null,
      eventDate: eventDate ? new Date(eventDate) : null,
    },
  });

  // Track in daily analytics (non-blocking)
  const today = new Date(); today.setHours(0, 0, 0, 0);
  prisma.vendorAnalytics.upsert({
    where: { vendorId_date: { vendorId, date: today } },
    create: { vendorId, date: today, inquiries: 1 },
    update: { inquiries: { increment: 1 } },
  }).catch(() => {});

  return inquiry;
}

/**
 * List paginated inquiries submitted by a user.
 *
 * @param {string} userId
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 */
async function listMyInquiries(userId, { page = 1, size = 20 } = {}) {
  const skip = (page - 1) * size;
  const where = { userId };

  const [inquiries, total] = await Promise.all([
    prisma.vendorInquiry.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: { select: { vendorId: true, name: true, category: true } },
      },
    }),
    prisma.vendorInquiry.count({ where }),
  ]);

  return {
    data: inquiries,
    meta: { total, page, size, totalPages: Math.ceil(total / size) },
  };
}

/**
 * Toggle a vendor favorite for a user.
 * Returns { favorited: true } when created, { favorited: false } when removed.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.vendorId
 */
async function toggleFavorite({ userId, vendorId }) {
  const existing = await prisma.vendorFavorite.findUnique({
    where: { userId_vendorId: { userId, vendorId } },
  });

  if (existing) {
    await prisma.vendorFavorite.delete({ where: { favoriteId: existing.favoriteId } });
    prisma.vendor.update({ where: { vendorId }, data: { likeCount: { decrement: 1 } } }).catch(() => {});
    return { favorited: false };
  }

  await prisma.vendorFavorite.create({ data: { userId, vendorId } });
  prisma.vendor.update({ where: { vendorId }, data: { likeCount: { increment: 1 } } }).catch(() => {});

  // Track in daily analytics
  const today = new Date(); today.setHours(0, 0, 0, 0);
  prisma.vendorAnalytics.upsert({
    where: { vendorId_date: { vendorId, date: today } },
    create: { vendorId, date: today, likes: 1 },
    update: { likes: { increment: 1 } },
  }).catch(() => {});

  return { favorited: true };
}

/**
 * List all favorited vendors for a user.
 *
 * @param {string} userId
 */
async function listFavorites(userId) {
  const favorites = await prisma.vendorFavorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      vendor: {
        include: {
          profile: {
            select: {
              bio: true,
              priceMin: true,
              priceMax: true,
              currency: true,
              isMarketplaceActive: true,
              tags: true,
            },
          },
        },
      },
    },
  });

  return favorites;
}

module.exports = {
  browseVendors,
  getVendorPublicProfile,
  getVendorReviews,
  createReview,
  createInquiry,
  listMyInquiries,
  toggleFavorite,
  listFavorites,
};
