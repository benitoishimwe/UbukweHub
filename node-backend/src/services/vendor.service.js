'use strict';

const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

/**
 * List vendors for a tenant with optional filters and pagination.
 *
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} [params.category]
 * @param {boolean} [params.isActive]
 * @param {string} [params.search]
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 */
async function listVendors({ tenantId, category, isActive, search, page = 1, size = 20 }) {
  const skip = (page - 1) * size;

  const where = { tenantId };

  if (category) where.category = category;
  if (isActive !== undefined) where.isActive = isActive;
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
      orderBy: { createdAt: 'desc' },
      include: {
        profile: { select: { isMarketplaceActive: true, priceMin: true, priceMax: true, currency: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    data: vendors,
    meta: {
      total,
      page,
      size,
      totalPages: Math.ceil(total / size),
    },
  };
}

/**
 * Get a single vendor by ID, verified against the tenant.
 *
 * @param {string} vendorId
 * @param {string} tenantId
 */
async function getVendorById(vendorId, tenantId) {
  const vendor = await prisma.vendor.findUnique({
    where: { vendorId },
    include: {
      profile: true,
      portfolio: { orderBy: { displayOrder: 'asc' } },
    },
  });

  if (!vendor) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  if (vendor.tenantId !== tenantId) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  return vendor;
}

/**
 * Create a new vendor and auto-create an empty vendor profile.
 *
 * @param {object} params
 * @param {string} params.tenantId
 * @param {string} params.name
 * @param {string} params.category
 * @param {string} [params.contactName]
 * @param {string} [params.email]
 * @param {string} [params.phone]
 * @param {string} [params.location]
 */
async function createVendor({ tenantId, name, category, contactName, email, phone, location }) {
  const vendor = await prisma.$transaction(async (tx) => {
    const created = await tx.vendor.create({
      data: {
        tenantId,
        name,
        category,
        contactName: contactName || null,
        email: email || null,
        phone: phone || null,
        location: location || null,
      },
    });

    await tx.vendorProfile.create({
      data: {
        tenantId,
        vendorId: created.vendorId,
      },
    });

    return created;
  });

  return vendor;
}

/**
 * Update a vendor's fields.
 *
 * @param {string} vendorId
 * @param {string} tenantId
 * @param {object} updates
 */
async function updateVendor(vendorId, tenantId, updates) {
  const vendor = await prisma.vendor.findUnique({ where: { vendorId } });
  if (!vendor) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  if (vendor.tenantId !== tenantId) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const allowed = ['name', 'category', 'contactName', 'email', 'phone', 'location', 'isVerified'];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  return prisma.vendor.update({ where: { vendorId }, data });
}

/**
 * Soft-delete a vendor by setting isActive = false.
 *
 * @param {string} vendorId
 * @param {string} tenantId
 */
async function deleteVendor(vendorId, tenantId) {
  const vendor = await prisma.vendor.findUnique({ where: { vendorId } });
  if (!vendor) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  if (vendor.tenantId !== tenantId) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  return prisma.vendor.update({ where: { vendorId }, data: { isActive: false } });
}

/**
 * Upsert the extended profile for a vendor.
 *
 * @param {string} vendorId
 * @param {string} tenantId
 * @param {object} fields
 */
async function updateVendorProfile(
  vendorId,
  tenantId,
  { bio, website, instagram, facebook, serviceAreas, priceMin, priceMax, currency, packages, availability, tags, isMarketplaceActive }
) {
  const vendor = await prisma.vendor.findUnique({ where: { vendorId } });
  if (!vendor) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  if (vendor.tenantId !== tenantId) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  const data = {};
  if (bio !== undefined) data.bio = bio;
  if (website !== undefined) data.website = website;
  if (instagram !== undefined) data.instagram = instagram;
  if (facebook !== undefined) data.facebook = facebook;
  if (serviceAreas !== undefined) data.serviceAreas = serviceAreas;
  if (priceMin !== undefined) data.priceMin = priceMin;
  if (priceMax !== undefined) data.priceMax = priceMax;
  if (currency !== undefined) data.currency = currency;
  if (packages !== undefined) data.packages = packages;
  if (availability !== undefined) data.availability = availability;
  if (tags !== undefined) data.tags = tags;
  if (isMarketplaceActive !== undefined) data.isMarketplaceActive = isMarketplaceActive;

  return prisma.vendorProfile.upsert({
    where: { vendorId },
    update: data,
    create: { tenantId, vendorId, ...data },
  });
}

/**
 * Add a portfolio image entry for a vendor.
 *
 * @param {string} vendorId
 * @param {string} tenantId
 * @param {object} params
 */
async function addPortfolioImage(vendorId, tenantId, { imageUrl, caption, eventType, displayOrder }) {
  const vendor = await prisma.vendor.findUnique({ where: { vendorId } });
  if (!vendor) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  if (vendor.tenantId !== tenantId) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  return prisma.vendorPortfolio.create({
    data: {
      vendorId,
      imageUrl,
      caption: caption || null,
      eventType: eventType || null,
      displayOrder: displayOrder !== undefined ? displayOrder : 0,
    },
  });
}

/**
 * Delete a portfolio image, verifying vendor tenant ownership.
 *
 * @param {string} portfolioId
 * @param {string} vendorId
 * @param {string} tenantId
 */
async function deletePortfolioImage(portfolioId, vendorId, tenantId) {
  const entry = await prisma.vendorPortfolio.findUnique({
    where: { portfolioId },
    include: { vendor: true },
  });

  if (!entry) throw new AppError('Portfolio image not found', 404, 'PORTFOLIO_NOT_FOUND');
  if (entry.vendorId !== vendorId) throw new AppError('Portfolio image not found', 404, 'PORTFOLIO_NOT_FOUND');
  if (entry.vendor.tenantId !== tenantId) throw new AppError('Portfolio image not found', 404, 'PORTFOLIO_NOT_FOUND');

  await prisma.vendorPortfolio.delete({ where: { portfolioId } });
}

/**
 * Find the Vendor record linked to a user account (matched by email).
 *
 * @param {string} userId
 */
async function getVendorByUserId(userId) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { email: true, tenantId: true },
  });

  if (!user?.email) return null;

  return prisma.vendor.findFirst({
    where: {
      email: user.email,
      isActive: true,
      ...(user.tenantId ? { tenantId: user.tenantId } : {}),
    },
    include: {
      profile: true,
      portfolio: { orderBy: { displayOrder: 'asc' } },
    },
  });
}

/**
 * Get paginated reviews received by a vendor.
 *
 * @param {string} vendorId
 * @param {object} params
 */
async function getVendorReviewsByVendorId(vendorId, { page = 1, size = 10 } = {}) {
  const skip = (page - 1) * size;
  const [reviews, total] = await Promise.all([
    prisma.vendorReview.findMany({
      where: { vendorId },
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { userId: true, name: true } } },
    }),
    prisma.vendorReview.count({ where: { vendorId } }),
  ]);
  return { data: reviews, meta: { total, page, size, totalPages: Math.ceil(total / size) } };
}

/**
 * Get paginated inquiries received by a vendor.
 *
 * @param {string} vendorId
 * @param {object} params
 */
async function getVendorInquiriesByVendorId(vendorId, { page = 1, size = 10 } = {}) {
  const skip = (page - 1) * size;
  const [inquiries, total] = await Promise.all([
    prisma.vendorInquiry.findMany({
      where: { vendorId },
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      include: { user: { select: { userId: true, name: true, email: true } } },
    }),
    prisma.vendorInquiry.count({ where: { vendorId } }),
  ]);
  return { data: inquiries, meta: { total, page, size, totalPages: Math.ceil(total / size) } };
}

/**
 * Allow a vendor user to update their own profile (safe fields only).
 * Vendor record is matched by user email.
 *
 * @param {string} userId
 * @param {object} updates - { location, phone, contactName, bio, website, instagram, facebook, priceMin, priceMax, currency, isMarketplaceActive }
 */
async function updateVendorSelf(userId, updates) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { email: true, tenantId: true },
  });
  if (!user?.email) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const vendor = await prisma.vendor.findFirst({
    where: { email: user.email, isActive: true, ...(user.tenantId ? { tenantId: user.tenantId } : {}) },
  });
  if (!vendor) throw new AppError('No vendor profile linked to your account', 404, 'VENDOR_NOT_FOUND');

  // Vendor can update limited safe fields on the Vendor table
  const vendorFields = ['location', 'phone', 'contactName'];
  const vendorData = {};
  for (const key of vendorFields) {
    if (updates[key] !== undefined) vendorData[key] = updates[key];
  }
  if (Object.keys(vendorData).length) {
    await prisma.vendor.update({ where: { vendorId: vendor.vendorId }, data: vendorData });
  }

  // Extended profile fields
  const profileFields = ['bio', 'website', 'instagram', 'facebook', 'priceMin', 'priceMax', 'currency', 'isMarketplaceActive'];
  const profileData = {};
  for (const key of profileFields) {
    if (updates[key] !== undefined) profileData[key] = updates[key];
  }
  if (Object.keys(profileData).length) {
    await prisma.vendorProfile.upsert({
      where: { vendorId: vendor.vendorId },
      update: profileData,
      create: { tenantId: vendor.tenantId, vendorId: vendor.vendorId, ...profileData },
    });
  }

  // Return fresh full vendor object
  return prisma.vendor.findUnique({
    where: { vendorId: vendor.vendorId },
    include: { profile: true, portfolio: { orderBy: { displayOrder: 'asc' } } },
  });
}

module.exports = {
  listVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
  updateVendorProfile,
  addPortfolioImage,
  deletePortfolioImage,
  getVendorByUserId,
  updateVendorSelf,
  getVendorReviewsByVendorId,
  getVendorInquiriesByVendorId,
};
