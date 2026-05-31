'use strict';

const bcrypt = require('bcryptjs');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');
const { createToken } = require('../utils/jwt');
const subscriptionService = require('./subscription.service');

const BCRYPT_ROUNDS = 10;

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

    // Keep Vendor.isPublic in sync with VendorProfile.isMarketplaceActive
    if (updates.isMarketplaceActive !== undefined) {
      await prisma.vendor.update({
        where: { vendorId: vendor.vendorId },
        data: { isPublic: updates.isMarketplaceActive },
      });
    }
  }

  // Return fresh full vendor object
  return prisma.vendor.findUnique({
    where: { vendorId: vendor.vendorId },
    include: { profile: true, portfolio: { orderBy: { displayOrder: 'asc' } } },
  });
}

// ─── Approval workflow ────────────────────────────────────────────────────────

async function approveVendor(vendorId, tenantId) {
  const vendor = await prisma.vendor.findUnique({ where: { vendorId } });
  if (!vendor) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  if (tenantId && vendor.tenantId !== tenantId) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  return prisma.vendor.update({
    where: { vendorId },
    data: { approvedByAdmin: true, approvedAt: new Date(), rejectedReason: null },
  });
}

async function rejectVendor(vendorId, tenantId, reason) {
  const vendor = await prisma.vendor.findUnique({ where: { vendorId } });
  if (!vendor) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  if (tenantId && vendor.tenantId !== tenantId) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  return prisma.vendor.update({
    where: { vendorId },
    data: { approvedByAdmin: false, isPublic: false, rejectedReason: reason || null },
  });
}

async function updateInternalNotes(vendorId, tenantId, notes) {
  const vendor = await prisma.vendor.findUnique({ where: { vendorId } });
  if (!vendor) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');
  if (tenantId && vendor.tenantId !== tenantId) throw new AppError('Vendor not found', 404, 'VENDOR_NOT_FOUND');

  return prisma.vendor.update({ where: { vendorId }, data: { internalNotes: notes || null } });
}

// ─── Onboarding ───────────────────────────────────────────────────────────────

async function getVendorOnboarding(vendorId) {
  const onboarding = await prisma.vendorOnboarding.upsert({
    where: { vendorId },
    create: { vendorId },
    update: {},
  });
  return onboarding;
}

async function completeOnboardingStep(vendorId, step) {
  const VALID = ['stepBio', 'stepPricing', 'stepPhotos', 'stepMarketplaceConsent'];
  if (!VALID.includes(step)) {
    throw new AppError(`Invalid step. Must be one of: ${VALID.join(', ')}`, 400, 'INVALID_STEP');
  }

  const onboarding = await prisma.vendorOnboarding.upsert({
    where: { vendorId },
    create: { vendorId, [step]: true },
    update: { [step]: true },
  });

  const allDone = onboarding.stepBio && onboarding.stepPricing && onboarding.stepPhotos && onboarding.stepMarketplaceConsent;
  if (allDone) {
    await Promise.all([
      prisma.vendorOnboarding.update({ where: { vendorId }, data: { completedAt: new Date() } }),
      prisma.vendor.update({ where: { vendorId }, data: { onboardingComplete: true } }),
    ]);
  }

  return { ...onboarding, [step]: true, allComplete: allDone };
}

/**
 * Allow a vendor user to self-create their own profile on signup.
 * Uses their account email so getVendorByUserId can find them immediately.
 */
async function selfCreateVendor(userId, { name, category, phone, location, country }) {
  const user = await prisma.user.findUnique({
    where: { userId },
    select: { email: true, name: true, tenantId: true },
  });
  if (!user) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const existing = await prisma.vendor.findFirst({
    where: { email: user.email, isActive: true },
  });
  if (existing) throw new AppError('A vendor profile already exists for this account', 409, 'VENDOR_EXISTS');

  return prisma.$transaction(async (tx) => {
    const created = await tx.vendor.create({
      data: {
        tenantId:    user.tenantId || null,
        name:        name || user.name,
        category,
        contactName: user.name,
        email:       user.email,
        phone:       phone    || null,
        location:    location || null,
        country:     country  || null,
      },
    });
    await tx.vendorProfile.create({
      data: { tenantId: user.tenantId || null, vendorId: created.vendorId },
    });
    return created;
  });
}

// ─── Vendor portal (self-service) ────────────────────────────────────────────

async function togglePublicVisibility(userId) {
  const user = await prisma.user.findUnique({ where: { userId }, select: { email: true, tenantId: true } });
  if (!user?.email) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const vendor = await prisma.vendor.findFirst({
    where: { email: user.email, isActive: true, ...(user.tenantId ? { tenantId: user.tenantId } : {}) },
  });
  if (!vendor) throw new AppError('No vendor profile linked to your account', 404, 'VENDOR_NOT_FOUND');
  if (!vendor.onboardingComplete) {
    throw new AppError('Complete your profile before going public', 400, 'ONBOARDING_INCOMPLETE');
  }

  const updated = await prisma.vendor.update({
    where: { vendorId: vendor.vendorId },
    data: { isPublic: !vendor.isPublic },
  });
  return { isPublic: updated.isPublic };
}

async function getVendorPortalAnalytics(userId, days = 30) {
  const user = await prisma.user.findUnique({ where: { userId }, select: { email: true, tenantId: true } });
  if (!user?.email) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const vendor = await prisma.vendor.findFirst({
    where: { email: user.email, isActive: true, ...(user.tenantId ? { tenantId: user.tenantId } : {}) },
    select: { vendorId: true, viewCount: true, likeCount: true, rating: true, ratingCount: true },
  });
  if (!vendor) throw new AppError('No vendor profile linked to your account', 404, 'VENDOR_NOT_FOUND');

  const since = new Date();
  since.setDate(since.getDate() - days);

  const daily = await prisma.vendorAnalytics.findMany({
    where: { vendorId: vendor.vendorId, date: { gte: since } },
    orderBy: { date: 'asc' },
  });

  const totals = daily.reduce(
    (acc, r) => ({ views: acc.views + r.views, likes: acc.likes + r.likes, inquiries: acc.inquiries + r.inquiries }),
    { views: 0, likes: 0, inquiries: 0 }
  );

  return {
    summary: {
      totalViews: vendor.viewCount,
      totalLikes: vendor.likeCount,
      avgRating: vendor.rating ? Number(vendor.rating) : null,
      totalReviews: vendor.ratingCount,
    },
    period: { days, ...totals },
    daily,
  };
}

async function incrementViewCount(vendorId) {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    await Promise.all([
      prisma.vendor.update({ where: { vendorId }, data: { viewCount: { increment: 1 } } }),
      prisma.vendorAnalytics.upsert({
        where: { vendorId_date: { vendorId, date: today } },
        create: { vendorId, date: today, views: 1 },
        update: { views: { increment: 1 } },
      }),
    ]);
  } catch {} // fire-and-forget
}

async function markInquiryRead(inquiryId, userId) {
  const user = await prisma.user.findUnique({ where: { userId }, select: { email: true, tenantId: true } });
  if (!user?.email) throw new AppError('User not found', 404, 'USER_NOT_FOUND');

  const vendor = await prisma.vendor.findFirst({
    where: { email: user.email, isActive: true, ...(user.tenantId ? { tenantId: user.tenantId } : {}) },
  });
  if (!vendor) throw new AppError('No vendor profile linked to your account', 404, 'VENDOR_NOT_FOUND');

  const inquiry = await prisma.vendorInquiry.findUnique({ where: { inquiryId } });
  if (!inquiry || inquiry.vendorId !== vendor.vendorId) {
    throw new AppError('Inquiry not found', 404, 'INQUIRY_NOT_FOUND');
  }

  return prisma.vendorInquiry.update({ where: { inquiryId }, data: { status: 'read' } });
}

/**
 * Accept a vendor invitation: create user account + vendor profile, return JWT.
 *
 * @param {object} params
 * @param {string} params.token       - Invitation token from email link
 * @param {string} params.name        - Contact person name
 * @param {string} params.password    - Password for the new account
 * @param {string} params.businessName - Vendor / business name
 * @param {string} params.category    - Vendor category
 * @param {string} [params.phone]
 * @param {string} [params.location]
 * @param {string} [params.country]
 * @param {string} [params.description]
 * @returns {Promise<{ token: string, user: object, vendor: object }>}
 */
async function acceptVendorInvite({ token, name, password, businessName, category, phone, location, country, description }) {
  const invitation = await prisma.tenantInvitation.findUnique({ where: { token } });

  if (!invitation) throw new AppError('Invitation not found', 404, 'INVITATION_NOT_FOUND');
  if (invitation.type !== 'vendor') throw new AppError('Invalid invitation type', 400, 'INVALID_INVITATION_TYPE');
  if (invitation.expiresAt < new Date()) throw new AppError('This invitation has expired. Please ask for a new one.', 400, 'INVITATION_EXPIRED');
  if (invitation.acceptedAt) throw new AppError('This invitation has already been accepted', 400, 'INVITATION_ALREADY_ACCEPTED');

  const existingUser = await prisma.user.findUnique({ where: { email: invitation.email.toLowerCase() } });
  if (existingUser) throw new AppError('An account with this email already exists', 409, 'EMAIL_TAKEN');

  if (!businessName) throw new AppError('Business name is required', 400, 'BUSINESS_NAME_REQUIRED');
  if (!category) throw new AppError('Business category is required', 400, 'CATEGORY_REQUIRED');

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  const autoPublic = process.env.VENDOR_AUTO_PUBLIC === 'true';

  const user = await prisma.user.create({
    data: {
      email: invitation.email.toLowerCase(),
      passwordHash,
      name,
      role: 'vendor',
      tenantId: invitation.tenantId,
      isActive: true,
    },
  });

  const vendor = await prisma.vendor.create({
    data: {
      tenantId: invitation.tenantId,
      userId: user.userId,
      name: businessName,
      category,
      contactName: name,
      email: invitation.email.toLowerCase(),
      phone: phone || null,
      location: location || null,
      country: country || null,
      description: description || null,
      isActive: true,
      isPublic: autoPublic,
      onboardingComplete: true,
      approvedByAdmin: false,
      profile: {
        create: {
          tenantId: invitation.tenantId,
          bio: description || null,
          isMarketplaceActive: autoPublic,
        },
      },
      onboarding: {
        create: {
          stepBio: !!description,
          stepPricing: false,
          stepPhotos: false,
          stepMarketplaceConsent: true,
          completedAt: new Date(),
        },
      },
    },
    include: { profile: true },
  });

  await prisma.tenantInvitation.update({
    where: { invitationId: invitation.invitationId },
    data: { acceptedAt: new Date() },
  });

  await subscriptionService.createFreeSubscription(user.userId, user.tenantId).catch(() => {});

  const jwtToken = createToken(user.userId, user.role, user.email, user.tenantId);

  const { passwordHash: _ph, ...safeUser } = user;
  return { token: jwtToken, user: safeUser, vendor };
}

/**
 * Search marketplace vendors for the "connect vendor to event" picker.
 * Returns vendors with onboardingComplete=true (regardless of approval state
 * so tenant admins can connect even pending vendors to their events).
 *
 * @param {object} params
 * @param {string} [params.search]
 * @param {string} [params.category]
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 */
async function searchAvailableVendors({ search, category, page = 1, size = 20 }) {
  const skip = (page - 1) * size;
  const where = { isActive: true, onboardingComplete: true };

  if (category) where.category = category;
  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { location: { contains: search, mode: 'insensitive' } },
    ];
  }

  const [vendors, total] = await Promise.all([
    prisma.vendor.findMany({
      where,
      skip,
      take: size,
      orderBy: [{ approvedByAdmin: 'desc' }, { rating: 'desc' }, { createdAt: 'desc' }],
      include: {
        profile: { select: { priceMin: true, priceMax: true, currency: true, tags: true } },
      },
    }),
    prisma.vendor.count({ where }),
  ]);

  return {
    data: vendors,
    meta: { total, page, size, totalPages: Math.ceil(total / size) },
  };
}

/**
 * Get all vendors connected to an event.
 *
 * @param {string} eventId
 * @param {string} tenantId
 */
async function getEventVendors(eventId, tenantId) {
  const event = await prisma.event.findUnique({ where: { eventId }, select: { tenantId: true } });
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  if (event.tenantId && event.tenantId !== tenantId) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

  const connections = await prisma.eventVendor.findMany({
    where: { eventId },
    include: {
      vendor: {
        include: {
          profile: { select: { priceMin: true, priceMax: true, currency: true } },
        },
      },
    },
    orderBy: { connectedAt: 'desc' },
  });

  return connections.map((c) => ({ ...c.vendor, connectedAt: c.connectedAt }));
}

/**
 * Connect a vendor to an event (creates EventVendor row).
 *
 * @param {string} eventId
 * @param {string} vendorId
 * @param {string} tenantId
 */
async function connectVendorToEvent(eventId, vendorId, tenantId) {
  const event = await prisma.event.findUnique({ where: { eventId }, select: { tenantId: true } });
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  if (event.tenantId && event.tenantId !== tenantId) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

  const vendor = await prisma.vendor.findUnique({ where: { vendorId }, select: { vendorId: true, isActive: true } });
  if (!vendor || !vendor.isActive) throw new AppError('Vendor not found or inactive', 404, 'VENDOR_NOT_FOUND');

  await prisma.eventVendor.upsert({
    where: { eventId_vendorId: { eventId, vendorId } },
    create: { eventId, vendorId },
    update: {},
  });

  return { eventId, vendorId, connected: true };
}

/**
 * Remove a vendor from an event.
 *
 * @param {string} eventId
 * @param {string} vendorId
 * @param {string} tenantId
 */
async function disconnectVendorFromEvent(eventId, vendorId, tenantId) {
  const event = await prisma.event.findUnique({ where: { eventId }, select: { tenantId: true } });
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  if (event.tenantId && event.tenantId !== tenantId) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

  await prisma.eventVendor.deleteMany({ where: { eventId, vendorId } });
  return { eventId, vendorId, connected: false };
}

module.exports = {
  listVendors,
  getVendorById,
  createVendor,
  selfCreateVendor,
  updateVendor,
  deleteVendor,
  updateVendorProfile,
  addPortfolioImage,
  deletePortfolioImage,
  getVendorByUserId,
  updateVendorSelf,
  getVendorReviewsByVendorId,
  getVendorInquiriesByVendorId,
  approveVendor,
  rejectVendor,
  updateInternalNotes,
  getVendorOnboarding,
  completeOnboardingStep,
  togglePublicVisibility,
  getVendorPortalAnalytics,
  incrementViewCount,
  markInquiryRead,
  acceptVendorInvite,
  searchAvailableVendors,
  getEventVendors,
  connectVendorToEvent,
  disconnectVendorFromEvent,
};
