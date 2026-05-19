'use strict';

const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function tenantScope(tenantId) {
  return tenantId ? { tenantId } : {};
}

/**
 * Compute the inventory counter deltas for a given transaction type.
 * Returns { available, rented, washing, quantity } — only the fields that change.
 *
 * @param {string} type
 * @param {number} qty
 * @param {object} current  - Current item counters
 */
function computeInventoryDelta(type, qty, current) {
  const delta = {};

  switch (type) {
    case 'rent':
      delta.available = Math.max(0, current.available - qty);
      delta.rented    = (current.rented || 0) + qty;
      break;

    case 'return':
      delta.rented    = Math.max(0, (current.rented || 0) - qty);
      delta.available = (current.available || 0) + qty;
      break;

    case 'wash':
      delta.available = Math.max(0, current.available - qty);
      delta.washing   = (current.washing || 0) + qty;
      break;

    case 'return_from_wash':
      delta.washing   = Math.max(0, (current.washing || 0) - qty);
      delta.available = (current.available || 0) + qty;
      break;

    case 'buy':
      delta.quantity  = (current.quantity || 0) + qty;
      delta.available = (current.available || 0) + qty;
      break;

    case 'lost':
      // Deduct from rented first, then from available
      if ((current.rented || 0) >= qty) {
        delta.rented = (current.rented || 0) - qty;
      } else {
        const fromRented  = current.rented || 0;
        const remainder   = qty - fromRented;
        delta.rented      = 0;
        delta.available   = Math.max(0, (current.available || 0) - remainder);
      }
      delta.quantity = Math.max(0, (current.quantity || 0) - qty);
      break;

    case 'damage':
      // Mark condition change — handled separately; just adjust available
      delta.available = Math.max(0, current.available - qty);
      break;

    default:
      throw new AppError(`Unknown transaction type: ${type}`, 400, 'INVALID_TRANSACTION_TYPE');
  }

  return delta;
}

// ─── Service methods ──────────────────────────────────────────────────────────

/**
 * List transactions for a tenant with optional filters and pagination.
 *
 * @param {object} params
 */
async function listTransactions({ tenantId, type, itemId, eventId, staffId, page = 1, size = 20 }) {
  const skip = (page - 1) * size;
  const where = { ...tenantScope(tenantId) };

  if (type)    where.type    = type;
  if (itemId)  where.itemId  = itemId;
  if (eventId) where.eventId = eventId;
  if (staffId) where.staffId = staffId;

  const [transactions, total] = await Promise.all([
    prisma.transaction.findMany({
      where,
      skip,
      take: size,
      orderBy: { createdAt: 'desc' },
      include: {
        item: { select: { name: true, category: true, qrCode: true } },
      },
    }),
    prisma.transaction.count({ where }),
  ]);

  return {
    transactions,
    meta: { total, page, size, totalPages: Math.ceil(total / size) },
  };
}

/**
 * Get a single transaction by ID, verifying tenant ownership.
 *
 * @param {string} transactionId
 * @param {string|null} tenantId
 */
async function getTransactionById(transactionId, tenantId) {
  const tx = await prisma.transaction.findUnique({
    where: { transactionId },
    include: {
      item: { select: { name: true, category: true, qrCode: true } },
    },
  });

  if (!tx) throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');
  if (tenantId && tx.tenantId !== tenantId) throw new AppError('Transaction not found', 404, 'TRANSACTION_NOT_FOUND');

  return tx;
}

/**
 * Create a transaction and update inventory counters atomically.
 *
 * @param {object} params
 */
async function createTransaction({
  tenantId,
  type,
  itemId,
  eventId,
  eventName,
  staffId,
  staffName,
  quantity,
  photo,
  returnDate,
}) {
  const qty = Number(quantity) || 1;

  // Fetch item and verify tenant
  const item = await prisma.inventoryItem.findUnique({ where: { itemId } });
  if (!item || !item.isActive) throw new AppError('Inventory item not found', 404, 'ITEM_NOT_FOUND');
  if (tenantId && item.tenantId !== tenantId) throw new AppError('Inventory item not found', 404, 'ITEM_NOT_FOUND');

  // Validate stock for outbound transactions
  const OUTBOUND_FROM_AVAILABLE = ['rent', 'wash', 'damage'];
  if (OUTBOUND_FROM_AVAILABLE.includes(type) && qty > item.available) {
    throw new AppError(
      `Insufficient stock. Available: ${item.available}, requested: ${qty}`,
      400,
      'INSUFFICIENT_STOCK'
    );
  }
  if (type === 'return' && qty > (item.rented || 0)) {
    throw new AppError(
      `Cannot return more than rented. Rented: ${item.rented}, requested: ${qty}`,
      400,
      'INVALID_RETURN_QUANTITY'
    );
  }
  if (type === 'return_from_wash' && qty > (item.washing || 0)) {
    throw new AppError(
      `Cannot return more than in washing. Washing: ${item.washing}, requested: ${qty}`,
      400,
      'INVALID_WASH_RETURN_QUANTITY'
    );
  }

  const delta = computeInventoryDelta(type, qty, item);

  // Build extra data for damage type
  const extraItemData = {};
  if (type === 'damage') extraItemData.condition = 'maintenance';

  const result = await prisma.$transaction(async (tx) => {
    // Update inventory counters
    await tx.inventoryItem.update({
      where: { itemId },
      data: { ...delta, ...extraItemData },
    });

    // Create transaction record
    return tx.transaction.create({
      data: {
        tenantId: tenantId || item.tenantId,
        type,
        itemId,
        itemName: item.name,
        eventId: eventId || null,
        eventName: eventName || null,
        staffId: staffId || null,
        staffName: staffName || null,
        quantity: qty,
        photo: photo || null,
        returnDate: returnDate ? new Date(returnDate) : null,
      },
    });
  });

  return result;
}

/**
 * Count transactions grouped by type for a tenant.
 *
 * @param {string|null} tenantId
 */
async function getTransactionStats(tenantId) {
  const where = tenantScope(tenantId);

  const groups = await prisma.transaction.groupBy({
    by: ['type'],
    where,
    _count: { transactionId: true },
  });

  const stats = {};
  for (const g of groups) {
    stats[g.type] = g._count.transactionId;
  }

  const total = await prisma.transaction.count({ where });
  stats.total = total;

  return stats;
}

module.exports = {
  listTransactions,
  getTransactionById,
  createTransaction,
  getTransactionStats,
};
