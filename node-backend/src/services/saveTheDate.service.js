'use strict';

const path = require('path');
const crypto = require('crypto');
const prisma = require('../config/prisma');
const { uploadFile } = require('../config/supabase');
const { AppError } = require('../middleware/errorHandler');

const STORAGE_BUCKET = 'save-the-date';

// Static template catalogue
const TEMPLATES = [
  {
    id: 'classic',
    name: 'Classic',
    description: 'Timeless and elegant design with clean typography',
    thumbnailUrl: null,
    styles: { fontFamily: 'serif', backgroundStyle: 'light', borderStyle: 'thin' },
  },
  {
    id: 'modern',
    name: 'Modern',
    description: 'Sleek, contemporary layout with bold typography',
    thumbnailUrl: null,
    styles: { fontFamily: 'sans-serif', backgroundStyle: 'dark', borderStyle: 'none' },
  },
  {
    id: 'rustic',
    name: 'Rustic',
    description: 'Warm earthy tones with vintage-inspired styling',
    thumbnailUrl: null,
    styles: { fontFamily: 'handwriting', backgroundStyle: 'cream', borderStyle: 'decorative' },
  },
  {
    id: 'floral',
    name: 'Floral',
    description: 'Botanical accents and romantic floral elements',
    thumbnailUrl: null,
    styles: { fontFamily: 'script', backgroundStyle: 'white', borderStyle: 'floral' },
  },
  {
    id: 'minimalist',
    name: 'Minimalist',
    description: 'Less is more — simple, refined, and impactful',
    thumbnailUrl: null,
    styles: { fontFamily: 'sans-serif', backgroundStyle: 'white', borderStyle: 'none' },
  },
  {
    id: 'glam',
    name: 'Glam',
    description: 'Luxurious gold and black with opulent details',
    thumbnailUrl: null,
    styles: { fontFamily: 'display', backgroundStyle: 'black', borderStyle: 'gold' },
  },
];

/**
 * List all save-the-date designs for a user (paginated).
 *
 * @param {string} userId
 * @param {object} params
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 */
async function listDesigns(userId, { page = 1, size = 20 } = {}) {
  const skip = (page - 1) * size;
  const where = { userId };

  const [designs, total] = await Promise.all([
    prisma.saveTheDateDesign.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.saveTheDateDesign.count({ where }),
  ]);

  return {
    data: designs,
    meta: { total, page, size, totalPages: Math.ceil(total / size) },
  };
}

/**
 * Get a single design, verifying userId ownership.
 *
 * @param {string} designId
 * @param {string} userId
 */
async function getDesignById(designId, userId) {
  const design = await prisma.saveTheDateDesign.findUnique({ where: { designId } });
  if (!design) throw new AppError('Design not found', 404, 'DESIGN_NOT_FOUND');
  if (design.userId !== userId) throw new AppError('Design not found', 404, 'DESIGN_NOT_FOUND');
  return design;
}

/**
 * Create a new save-the-date design draft.
 *
 * @param {object} params
 * @param {string} params.userId
 * @param {string} params.tenantId
 * @param {string} [params.eventId]
 * @param {string} params.title
 * @param {string} [params.templateId]
 * @param {object} [params.textContent]
 * @param {object} [params.style]
 */
async function createDesign({ userId, tenantId, eventId, title, templateId, textContent, style }) {
  return prisma.saveTheDateDesign.create({
    data: {
      userId,
      tenantId,
      eventId: eventId || null,
      title,
      templateId: templateId || null,
      textContent: textContent || null,
      style: style || null,
      status: 'draft',
    },
  });
}

/**
 * Update design fields.
 *
 * @param {string} designId
 * @param {string} userId
 * @param {object} updates
 */
async function updateDesign(designId, userId, updates) {
  await getDesignById(designId, userId);

  const allowed = ['title', 'templateId', 'textContent', 'style', 'generatedImageUrl', 'aiPromptUsed', 'status'];
  const data = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  return prisma.saveTheDateDesign.update({ where: { designId }, data });
}

/**
 * Delete a design.
 *
 * @param {string} designId
 * @param {string} userId
 */
async function deleteDesign(designId, userId) {
  await getDesignById(designId, userId);
  await prisma.saveTheDateDesign.delete({ where: { designId } });
}

/**
 * Publish a design by setting its status to 'published'.
 *
 * @param {string} designId
 * @param {string} userId
 */
async function publishDesign(designId, userId) {
  await getDesignById(designId, userId);
  return prisma.saveTheDateDesign.update({
    where: { designId },
    data: { status: 'published' },
  });
}

/**
 * Upload a photo for a design.
 * Tries Supabase Storage first; falls back to base64 data URL if Supabase is
 * not configured or the upload fails (e.g. no bucket, wrong credentials).
 *
 * @param {object} params
 * @param {string} params.designId
 * @param {string} params.userId
 * @param {Express.Multer.File} params.file
 */
async function uploadPhoto({ designId, userId, file }) {
  await getDesignById(designId, userId);

  let photoUrl;

  try {
    const ext = path.extname(file.originalname) || '';
    const storagePath = `${designId}/photo-${Date.now()}-${crypto.randomBytes(4).toString('hex')}${ext}`;
    photoUrl = await uploadFile(STORAGE_BUCKET, storagePath, file.buffer, file.mimetype);
  } catch (uploadErr) {
    // Supabase not configured or bucket missing — store as base64 data URL
    console.warn('[saveTheDate] Supabase upload failed, using base64 fallback:', uploadErr.message);
    const base64 = file.buffer.toString('base64');
    photoUrl = `data:${file.mimetype};base64,${base64}`;
  }

  return prisma.saveTheDateDesign.update({
    where: { designId },
    data: { uploadedPhoto: photoUrl },
  });
}

/**
 * Return the static list of available design templates.
 */
function getTemplates() {
  return TEMPLATES;
}

// ─── AI design generation ──────────────────────────────────────────────────────

function escapeXml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function buildSaveTheDateSVG(cardContent, style = {}) {
  const colorStr = String(style?.primaryColor || '#C9A84C');
  const safeColor = /^#[0-9A-Fa-f]{3,8}$/.test(colorStr) ? colorStr : '#C9A84C';

  const names   = escapeXml((cardContent?.coupleNames || '').substring(0, 35));
  const date    = escapeXml((cardContent?.date || '').substring(0, 40));
  const venue   = escapeXml((cardContent?.venue || '').substring(0, 45));
  const tagline = escapeXml((cardContent?.tagline || '').substring(0, 55));
  const rsvp    = escapeXml((cardContent?.rsvp || '').substring(0, 45));
  const nameFontSize = names.length > 22 ? 27 : names.length > 16 ? 32 : 36;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="400" viewBox="0 0 600 400">
<defs>
  <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
    <stop offset="0%" style="stop-color:#FDFAF5"/>
    <stop offset="100%" style="stop-color:#F5EDD8"/>
  </linearGradient>
</defs>
<rect width="600" height="400" fill="url(#bg)"/>
<rect x="14" y="14" width="572" height="372" fill="none" stroke="${safeColor}" stroke-width="1.5" opacity="0.65"/>
<rect x="21" y="21" width="558" height="358" fill="none" stroke="${safeColor}" stroke-width="0.5" opacity="0.35"/>
<text x="30" y="44" font-family="Georgia,serif" font-size="12" fill="${safeColor}" opacity="0.45">&#x2736;</text>
<text x="570" y="44" font-family="Georgia,serif" font-size="12" fill="${safeColor}" opacity="0.45" text-anchor="end">&#x2736;</text>
<text x="30" y="394" font-family="Georgia,serif" font-size="12" fill="${safeColor}" opacity="0.45">&#x2736;</text>
<text x="570" y="394" font-family="Georgia,serif" font-size="12" fill="${safeColor}" opacity="0.45" text-anchor="end">&#x2736;</text>
<text x="300" y="78" font-family="Georgia,'Times New Roman',serif" font-size="12" fill="${safeColor}" text-anchor="middle" letter-spacing="5">SAVE THE DATE</text>
<line x1="170" y1="93" x2="430" y2="93" stroke="${safeColor}" stroke-width="0.8" opacity="0.5"/>
${names ? `<text x="300" y="158" font-family="Georgia,'Times New Roman',serif" font-size="${nameFontSize}" fill="#2D2D2D" text-anchor="middle" font-style="italic">${names}</text>` : ''}
<text x="300" y="186" font-family="Georgia,serif" font-size="12" fill="${safeColor}" text-anchor="middle">&#x25C6;</text>
${date ? `<text x="300" y="224" font-family="Georgia,'Times New Roman',serif" font-size="16" fill="#4A4A4A" text-anchor="middle">${date}</text>` : ''}
${venue ? `<text x="300" y="252" font-family="Georgia,'Times New Roman',serif" font-size="13" fill="#6B6B6B" text-anchor="middle">${venue}</text>` : ''}
${tagline ? `<text x="300" y="296" font-family="Georgia,'Times New Roman',serif" font-size="12" fill="${safeColor}" text-anchor="middle" font-style="italic">${tagline}</text>` : ''}
<line x1="220" y1="314" x2="380" y2="314" stroke="${safeColor}" stroke-width="0.5" opacity="0.4"/>
${rsvp ? `<text x="300" y="350" font-family="Georgia,'Times New Roman',serif" font-size="11" fill="#9A9A9A" text-anchor="middle">${rsvp}</text>` : ''}
</svg>`;

  return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`;
}

/**
 * Generate AI card content + SVG preview for a design.
 *
 * @param {string} designId
 * @param {string} userId
 */
async function generateDesign(designId, userId) {
  const design = await getDesignById(designId, userId);
  const aiService = require('./ai.service');

  const cardContent = await aiService.generateSaveTheDateCard(design);
  const content = (typeof cardContent === 'object' && cardContent !== null) ? cardContent : {};

  const svgDataUrl = buildSaveTheDateSVG(content, design.style || {});

  const mergedTextContent = {
    ...(typeof design.textContent === 'object' && design.textContent !== null ? design.textContent : {}),
    aiGenerated: content,
  };

  return prisma.saveTheDateDesign.update({
    where: { designId },
    data: {
      textContent: mergedTextContent,
      generatedImageUrl: svgDataUrl,
      aiPromptUsed: JSON.stringify(content).substring(0, 1000),
      status: 'generated',
    },
  });
}

module.exports = {
  listDesigns,
  getDesignById,
  createDesign,
  updateDesign,
  deleteDesign,
  publishDesign,
  uploadPhoto,
  generateDesign,
  getTemplates,
};
