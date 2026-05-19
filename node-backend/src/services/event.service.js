'use strict';

const { Prisma } = require('@prisma/client');
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');
const { generateEventReport } = require('../utils/pdf');

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Build a WHERE clause that scopes queries to a tenant.
 * super_admin passes tenantId=null and bypasses tenant scoping.
 *
 * @param {string|null} tenantId
 */
function tenantScope(tenantId) {
  return tenantId ? { tenantId } : {};
}

// ─── Event methods ────────────────────────────────────────────────────────────

/**
 * List events for a tenant with optional filters and pagination.
 *
 * @param {object} params
 * @param {string|null} params.tenantId
 * @param {string} [params.status]
 * @param {string} [params.eventTypeSlug]
 * @param {string} [params.search]
 * @param {number} [params.page=1]
 * @param {number} [params.size=20]
 */
async function listEvents({ tenantId, status, eventTypeSlug, search, page = 1, size = 20 }) {
  const skip = (page - 1) * size;

  // Use raw SQL to bypass Prisma TIMESTAMPTZ deserialization issue
  const conditions = [];
  if (tenantId) conditions.push(Prisma.sql`tenant_id = ${tenantId}`);
  if (status) conditions.push(Prisma.sql`status = ${status}`);
  if (eventTypeSlug) conditions.push(Prisma.sql`event_type_slug = ${eventTypeSlug}`);
  if (search) {
    const q = `%${search}%`;
    conditions.push(Prisma.sql`(name ILIKE ${q} OR venue ILIKE ${q} OR client_name ILIKE ${q})`);
  }

  const whereClause = conditions.length > 0
    ? Prisma.sql`WHERE ${Prisma.join(conditions, ' AND ')}`
    : Prisma.empty;

  const [events, countResult] = await Promise.all([
    prisma.$queryRaw(Prisma.sql`
      SELECT
        event_id            AS "eventId",
        tenant_id           AS "tenantId",
        name,
        CASE
          WHEN event_date IS NULL THEN NULL
          WHEN event_date::text ~ '^\d{2}/\d{2}/\d{4}$'
            THEN to_char(to_date(event_date::text, 'DD/MM/YYYY'), 'YYYY-MM-DD')
          WHEN event_date::text ~ '^\d{4}-\d{2}-\d{2}'
            THEN to_char(event_date::timestamptz, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
          ELSE event_date::text
        END                 AS "eventDate",
        venue,
        client_id           AS "clientId",
        client_name         AS "clientName",
        staff_ids           AS "staffIds",
        vendor_ids          AS "vendorIds",
        status,
        budget::text        AS "budget",
        guest_count         AS "guestCount",
        greatness_score     AS "greatnessScore",
        notes,
        event_type_slug     AS "eventTypeSlug",
        created_at::text    AS "createdAt",
        updated_at::text    AS "updatedAt"
      FROM events
      ${whereClause}
      ORDER BY created_at DESC
      LIMIT ${size} OFFSET ${skip}
    `),
    prisma.$queryRaw(Prisma.sql`
      SELECT COUNT(*)::int AS total FROM events ${whereClause}
    `),
  ]);

  const total = Number(countResult[0]?.total || 0);
  return { events, total, page, size };
}

/**
 * Get a single event by ID, verifying tenant ownership.
 *
 * @param {string} eventId
 * @param {string|null} tenantId  - null for super_admin (bypasses tenant check)
 */
async function getEventById(eventId, tenantId) {
  const rows = await prisma.$queryRaw(Prisma.sql`
    SELECT
      event_id            AS "eventId",
      tenant_id           AS "tenantId",
      name,
      CASE
        WHEN event_date IS NULL THEN NULL
        WHEN event_date::text ~ '^\d{2}/\d{2}/\d{4}$'
          THEN to_char(to_date(event_date::text, 'DD/MM/YYYY'), 'YYYY-MM-DD')
        WHEN event_date::text ~ '^\d{4}-\d{2}-\d{2}'
          THEN to_char(event_date::timestamptz, 'YYYY-MM-DD"T"HH24:MI:SS"Z"')
        ELSE event_date::text
      END                 AS "eventDate",
      venue,
      client_id           AS "clientId",
      client_name         AS "clientName",
      staff_ids           AS "staffIds",
      vendor_ids          AS "vendorIds",
      status,
      budget::text        AS "budget",
      guest_count         AS "guestCount",
      greatness_score     AS "greatnessScore",
      notes,
      event_type_slug     AS "eventTypeSlug",
      created_at::text    AS "createdAt",
      updated_at::text    AS "updatedAt"
    FROM events
    WHERE event_id = ${eventId}
  `);

  const event = rows[0];
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  if (tenantId && event.tenantId !== tenantId) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

  return event;
}

/**
 * Create a new event, seeding checklist/timeline from the event type template.
 *
 * @param {object} params
 */
function stripNullBytes(str) {
  return typeof str === 'string' ? str.replace(/\0/g, '') : str;
}

async function createEvent({
  tenantId,
  name,
  eventDate,
  venue,
  clientId,
  clientName,
  eventTypeSlug,
  budget,
  guestCount,
  notes,
}) {
  name        = stripNullBytes(name);
  venue       = stripNullBytes(venue);
  clientName  = stripNullBytes(clientName);
  notes       = stripNullBytes(notes);
  let checklistTemplate = null;
  let timelineTemplate = null;

  if (eventTypeSlug) {
    const eventType = await prisma.eventType.findUnique({ where: { slug: eventTypeSlug } });
    if (eventType) {
      checklistTemplate = eventType.checklistTemplate || null;
      timelineTemplate = eventType.timelineTemplate || null;
    }
  }

  // Use raw SQL INSERT to avoid Prisma binary-protocol null-byte encoding issues
  const eventDateStr = eventDate ? new Date(eventDate).toISOString().replace('T', ' ').replace('Z', '+00') : null;
  const budgetStr    = budget !== undefined && budget !== null ? String(budget) : null;
  const checklistStr = checklistTemplate ? JSON.stringify(checklistTemplate) : null;
  const timelineStr  = timelineTemplate  ? JSON.stringify(timelineTemplate)  : null;

  const rows = await prisma.$queryRaw(Prisma.sql`
    INSERT INTO events (
      tenant_id, name, event_date, venue, client_id, client_name,
      event_type_slug, budget, guest_count, notes, checklist, timeline, status
    ) VALUES (
      ${tenantId}, ${name}, ${eventDateStr},
      ${venue || null}, ${clientId || null}, ${clientName || null},
      ${eventTypeSlug || null},
      ${budgetStr}::numeric,
      ${guestCount !== undefined && guestCount !== null ? Number(guestCount) : null}::integer,
      ${notes || null},
      ${checklistStr}::jsonb,
      ${timelineStr}::jsonb,
      'planning'
    )
    RETURNING
      event_id        AS "eventId",
      tenant_id       AS "tenantId",
      name,
      event_date::text AS "eventDate",
      venue,
      client_id       AS "clientId",
      client_name     AS "clientName",
      status,
      budget::text    AS "budget",
      guest_count     AS "guestCount",
      notes,
      event_type_slug AS "eventTypeSlug",
      created_at::text AS "createdAt",
      updated_at::text AS "updatedAt"
  `);
  return rows[0];
}

/**
 * Update allowed fields on an event.
 *
 * @param {string} eventId
 * @param {string|null} tenantId
 * @param {object} updates
 */
async function updateEvent(eventId, tenantId, updates) {
  const event = await prisma.event.findUnique({ where: { eventId } });
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  if (tenantId && event.tenantId !== tenantId) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

  const ALLOWED = [
    'name', 'eventDate', 'venue', 'clientId', 'clientName',
    'budget', 'guestCount', 'notes', 'status',
    'checklist', 'timeline', 'seatingPlan', 'guestList',
    'budgetBreakdown', 'staffIds', 'vendorIds', 'greatnessScore',
  ];

  const data = {};
  for (const key of ALLOWED) {
    if (updates[key] !== undefined) {
      data[key] = key === 'eventDate' && updates[key] ? new Date(updates[key]) : updates[key];
    }
  }

  return prisma.event.update({ where: { eventId }, data });
}

/**
 * Delete an event and all its tasks.
 *
 * @param {string} eventId
 * @param {string|null} tenantId
 */
async function deleteEvent(eventId, tenantId) {
  const event = await prisma.event.findUnique({ where: { eventId } });
  if (!event) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');
  if (tenantId && event.tenantId !== tenantId) throw new AppError('Event not found', 404, 'EVENT_NOT_FOUND');

  await prisma.$transaction([
    prisma.eventTask.deleteMany({ where: { eventId } }),
    prisma.event.delete({ where: { eventId } }),
  ]);
}

/**
 * Return all event types (no tenant scope — shared catalogue).
 */
async function getEventTypes() {
  return prisma.eventType.findMany({ orderBy: { name: 'asc' } });
}

/**
 * Return a single event type by slug, including templates.
 *
 * @param {string} slug
 */
async function getEventTemplate(slug) {
  const eventType = await prisma.eventType.findUnique({ where: { slug } });
  if (!eventType) throw new AppError('Event type not found', 404, 'EVENT_TYPE_NOT_FOUND');
  return eventType;
}

// ─── Task methods ─────────────────────────────────────────────────────────────

/**
 * List tasks for an event.
 *
 * @param {string} eventId
 * @param {string|null} tenantId
 * @param {string} [status]
 */
async function listEventTasks(eventId, tenantId, status) {
  // Verify event access first
  await getEventById(eventId, tenantId);

  const where = { eventId };
  if (tenantId) where.tenantId = tenantId;
  if (status) where.status = status;

  return prisma.eventTask.findMany({
    where,
    orderBy: { createdAt: 'desc' },
  });
}

/**
 * Create a task linked to an event.
 *
 * @param {object} params
 */
async function createTask({ eventId, tenantId, title, description, category, dueDate, assignedTo, priority, createdBy }) {
  // Verify event access
  await getEventById(eventId, tenantId);

  return prisma.eventTask.create({
    data: {
      eventId,
      tenantId,
      title,
      description: description || null,
      category: category || null,
      dueDate: dueDate ? new Date(dueDate) : null,
      assignedTo: assignedTo || null,
      priority: priority || 'medium',
      status: 'todo',
      createdBy: createdBy || null,
    },
  });
}

/**
 * Update allowed fields on a task.
 *
 * @param {string} taskId
 * @param {string|null} tenantId
 * @param {object} updates
 */
async function updateTask(taskId, tenantId, updates) {
  const task = await prisma.eventTask.findUnique({ where: { taskId } });
  if (!task) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  if (tenantId && task.tenantId !== tenantId) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');

  const ALLOWED = ['title', 'description', 'status', 'priority', 'dueDate', 'assignedTo'];
  const data = {};
  for (const key of ALLOWED) {
    if (updates[key] !== undefined) {
      data[key] = key === 'dueDate' && updates[key] ? new Date(updates[key]) : updates[key];
    }
  }

  return prisma.eventTask.update({ where: { taskId }, data });
}

/**
 * Delete a task after verifying tenant ownership.
 *
 * @param {string} taskId
 * @param {string|null} tenantId
 */
async function deleteTask(taskId, tenantId) {
  const task = await prisma.eventTask.findUnique({ where: { taskId } });
  if (!task) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');
  if (tenantId && task.tenantId !== tenantId) throw new AppError('Task not found', 404, 'TASK_NOT_FOUND');

  await prisma.eventTask.delete({ where: { taskId } });
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

/**
 * Generate an event report PDF and return it as a Buffer.
 *
 * @param {string} eventId
 * @param {string|null} tenantId
 * @returns {Promise<Buffer>}
 */
async function generateEventPdf(eventId, tenantId) {
  const event = await getEventById(eventId, tenantId);
  const tasks = await prisma.eventTask.findMany({
    where: { eventId },
    orderBy: { createdAt: 'asc' },
  });

  return generateEventReport(event, tasks);
}

// ─── Stats ────────────────────────────────────────────────────────────────────

/**
 * Count events grouped by status for a tenant.
 *
 * @param {string|null} tenantId
 */
async function getEventStats(tenantId) {
  const where = tenantScope(tenantId);

  const [planning, active, completed, cancelled, total] = await Promise.all([
    prisma.event.count({ where: { ...where, status: 'planning' } }),
    prisma.event.count({ where: { ...where, status: 'active' } }),
    prisma.event.count({ where: { ...where, status: 'completed' } }),
    prisma.event.count({ where: { ...where, status: 'cancelled' } }),
    prisma.event.count({ where }),
  ]);

  return { total, planning, active, completed, cancelled };
}

module.exports = {
  listEvents,
  getEventById,
  createEvent,
  updateEvent,
  deleteEvent,
  getEventTypes,
  getEventTemplate,
  listEventTasks,
  createTask,
  updateTask,
  deleteTask,
  generateEventPdf,
  getEventStats,
};
