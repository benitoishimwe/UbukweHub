'use strict';

const { randomUUID, randomBytes } = require('crypto');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');
const { generateQrCode } = require('../utils/qrcode');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tenantScope(tenantId) {
  return tenantId ? { tenantId } : {};
}

function generatePraniCode() {
  return `PRANI-${randomBytes(4).toString('hex').toUpperCase()}`;
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * List active inventory items for a tenant with optional filters.
 *
 * @param {object} params
 * @param {string|null} params.tenantId
 * @param {string} [params.category]
 * @param {string} [params.condition]
 * @param {string} [params.search]
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 */
async function listItems({ tenantId, category, condition, search, page = 1, size = 20 }) {
  const skip = (page - 1) * size;

  const where = { ...tenantScope(tenantId), isActive: true };

  if (category) where.category = category;
  if (condition) where.condition = condition;
  if (search) {
    where.name = { contains: search, mode: 'insensitive' };
  }

  const [items, total] = await Promise.all([
    prisma.inventoryItem.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inventoryItem.count({ where }),
  ]);

  return {
    items,
    total,
    page,
    size,
    totalPages: Math.ceil(total / size),
  };
}

/**
 * Get a single inventory item by ID, verifying tenant ownership.
 *
 * @param {string} itemId
 * @param {string|null} tenantId
 */
async function getItemById(itemId, tenantId) {
  let item = await prisma.inventoryItem.findUnique({ where: { itemId } });

  if (!item || !item.isActive) throw new AppError('Item not found', 404, 'ITEM_NOT_FOUND');
  if (tenantId && item.tenantId !== tenantId) throw new AppError('Item not found', 404, 'ITEM_NOT_FOUND');

  // Auto-assign a PRANI code to legacy items that were seeded without one
  if (!item.qrCode) {
    item = await prisma.inventoryItem.update({
      where: { itemId },
      data: { qrCode: generatePraniCode() },
    });
  }

  return item;
}

/**
 * Get an item by its QR code value.
 *
 * @param {string} qrCode
 * @param {string|null} tenantId
 */
async function getItemByQrCode(qrCode, tenantId) {
  const item = await prisma.inventoryItem.findUnique({ where: { qrCode } });

  if (!item || !item.isActive) throw new AppError('Item not found', 404, 'ITEM_NOT_FOUND');
  if (tenantId && item.tenantId !== tenantId) throw new AppError('Item not found', 404, 'ITEM_NOT_FOUND');

  return item;
}

/**
 * Get an item by its barcode.
 *
 * @param {string} barcode
 * @param {string|null} tenantId
 */
async function getItemByBarcode(barcode, tenantId) {
  const item = await prisma.inventoryItem.findFirst({
    where: { barcode, isActive: true, ...(tenantId ? { tenantId } : {}) },
  });

  if (!item) throw new AppError('Item not found', 404, 'ITEM_NOT_FOUND');

  return item;
}

/**
 * Create a new inventory item, generating a unique QR code.
 *
 * @param {object} params
 */
async function createItem({ tenantId, name, category, barcode, quantity, condition, purchasePrice, rentalPrice, photos }) {
  const qrCode = generatePraniCode();
  const qty = quantity !== undefined ? Number(quantity) : 0;

  return prisma.inventoryItem.create({
    data: {
      tenantId,
      name,
      category: category || null,
      qrCode,
      barcode: barcode || null,
      quantity: qty,
      available: qty,
      rented: 0,
      washing: 0,
      condition: condition || 'good',
      purchasePrice: purchasePrice !== undefined ? purchasePrice : null,
      rentalPrice: rentalPrice !== undefined ? rentalPrice : null,
      photos: photos || null,
      isActive: true,
    },
  });
}

/**
 * Update allowed fields on an inventory item.
 * Recalculates `available` when `quantity` changes.
 *
 * @param {string} itemId
 * @param {string|null} tenantId
 * @param {object} updates
 */
async function updateItem(itemId, tenantId, updates) {
  const item = await getItemById(itemId, tenantId);

  const ALLOWED = ['name', 'category', 'barcode', 'quantity', 'condition', 'purchasePrice', 'rentalPrice', 'photos'];
  const data = {};
  for (const key of ALLOWED) {
    if (updates[key] !== undefined) data[key] = updates[key];
  }

  // Recalculate available when quantity changes
  if (data.quantity !== undefined) {
    const newQty = Number(data.quantity);
    const rented = item.rented || 0;
    const washing = item.washing || 0;
    data.available = Math.max(0, newQty - rented - washing);
    data.quantity = newQty;
  }

  return prisma.inventoryItem.update({ where: { itemId }, data });
}

/**
 * Soft-delete an item by setting isActive = false.
 *
 * @param {string} itemId
 * @param {string|null} tenantId
 */
async function deleteItem(itemId, tenantId) {
  await getItemById(itemId, tenantId); // verify ownership

  return prisma.inventoryItem.update({
    where: { itemId },
    data: { isActive: false },
  });
}

/**
 * Aggregate inventory stats for a tenant.
 *
 * @param {string|null} tenantId
 */
async function getInventoryStats(tenantId) {
  const where = { ...tenantScope(tenantId), isActive: true };

  const [aggregate, maintenance, categoryRows] = await Promise.all([
    prisma.inventoryItem.aggregate({
      where,
      _sum: { available: true, rented: true, washing: true, quantity: true },
      _count: true,
    }),
    prisma.inventoryItem.count({ where: { ...where, condition: 'maintenance' } }),
    prisma.inventoryItem.groupBy({
      by: ['category'],
      where,
      _count: { itemId: true },
      orderBy: { _count: { itemId: 'desc' } },
    }),
  ]);

  const categories = categoryRows.map(r => ({ category: r.category, count: r._count.itemId }));

  return {
    total: aggregate._count || 0,
    totalItems: aggregate._sum.quantity || 0,
    available: aggregate._sum.available || 0,
    rented: aggregate._sum.rented || 0,
    washing: aggregate._sum.washing || 0,
    maintenance,
    categories,
  };
}

/**
 * Return distinct category values for a tenant's inventory.
 *
 * @param {string|null} tenantId
 */
async function getCategories(tenantId) {
  const where = { ...tenantScope(tenantId), isActive: true };

  const rows = await prisma.inventoryItem.findMany({
    where,
    select: { category: true },
    distinct: ['category'],
    orderBy: { category: 'asc' },
  });

  return rows.map((r) => r.category).filter(Boolean);
}

/**
 * Generate a QR code PNG buffer for a specific item.
 *
 * @param {string} itemId
 * @param {string|null} tenantId
 * @returns {Promise<Buffer>}
 */
async function generateItemQrCode(itemId, tenantId) {
  const item = await getItemById(itemId, tenantId);
  return generateQrCode(item.qrCode);
}

async function getItemQrData(itemId, tenantId) {
  const item = await getItemById(itemId, tenantId);
  const { generateQrCodeBase64 } = require('../utils/qrcode');
  const qrDataUrl = await generateQrCodeBase64(item.qrCode, { width: 256, margin: 1 });
  return { qrCode: item.qrCode, qrDataUrl, itemName: item.name, category: item.category };
}

module.exports = {
  listItems,
  getItemById,
  getItemByQrCode,
  getItemByBarcode,
  createItem,
  updateItem,
  deleteItem,
  getInventoryStats,
  getCategories,
  generateItemQrCode,
  getItemQrData,
};
