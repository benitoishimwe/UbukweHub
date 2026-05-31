'use strict';

const prisma = require('./prisma');

/**
 * Idempotent startup migrations.
 * All statements use IF NOT EXISTS / ADD COLUMN IF NOT EXISTS so they are
 * safe to run every time the server boots. New columns/tables are only
 * created once; subsequent boots are no-ops.
 */
const MIGRATIONS = [
  // ── Allow null tenant_id on event_tasks and inventory_items ───────────────
  `ALTER TABLE event_tasks ALTER COLUMN tenant_id DROP NOT NULL`,
  `ALTER TABLE inventory_items ALTER COLUMN tenant_id DROP NOT NULL`,

  // ── Core event columns added after initial schema ─────────────────────────
  `ALTER TABLE events
     ADD COLUMN IF NOT EXISTS created_by       TEXT REFERENCES users(user_id),
     ADD COLUMN IF NOT EXISTS event_type_slug  TEXT,
     ADD COLUMN IF NOT EXISTS client_name      TEXT,
     ADD COLUMN IF NOT EXISTS guest_count      INTEGER,
     ADD COLUMN IF NOT EXISTS budget           NUMERIC,
     ADD COLUMN IF NOT EXISTS notes            TEXT,
     ADD COLUMN IF NOT EXISTS checklist        JSONB,
     ADD COLUMN IF NOT EXISTS timeline         JSONB,
     ADD COLUMN IF NOT EXISTS greatness_score  INTEGER DEFAULT 0,
     ADD COLUMN IF NOT EXISTS staff_ids        TEXT[] DEFAULT '{}',
     ADD COLUMN IF NOT EXISTS vendor_ids       TEXT[] DEFAULT '{}'`,

  // ── Guest check-in columns on events ──────────────────────────────────────
  `ALTER TABLE events
     ADD COLUMN IF NOT EXISTS guest_checkin_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
     ADD COLUMN IF NOT EXISTS guest_checkin_otp_expiry_minutes INTEGER NOT NULL DEFAULT 10`,

  // ── Guest check-in attempts ───────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS guest_checkin_attempts (
     attempt_id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
     event_id        TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
     email           TEXT NOT NULL,
     guest_name      TEXT,
     otp_code        TEXT,
     otp_expires_at  TIMESTAMPTZ,
     verified_at     TIMESTAMPTZ,
     status          TEXT NOT NULL DEFAULT 'pending',
     failed_attempts INTEGER NOT NULL DEFAULT 0,
     locked_until    TIMESTAMPTZ,
     created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
     UNIQUE (event_id, email)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gca_event_id ON guest_checkin_attempts(event_id)`,
  `CREATE INDEX IF NOT EXISTS idx_gca_status   ON guest_checkin_attempts(status)`,

  // ── Guest check-ins (verified records) ───────────────────────────────────
  `CREATE TABLE IF NOT EXISTS guest_checkins (
     checkin_id    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
     event_id      TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
     email         TEXT NOT NULL,
     guest_name    TEXT,
     checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     ip_address    TEXT
  )`,

  `CREATE INDEX IF NOT EXISTS idx_gc_event_id ON guest_checkins(event_id)`,

  // ── Drop CHECK constraints on subscriptions.plan / status and
  //    tenants.subscription_tier that block valid values like 'trial'.
  //    All use IF EXISTS so they are safe no-ops once already dropped. ────────
  `ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_check`,
  `ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_status_check`,
  `ALTER TABLE subscriptions DROP CONSTRAINT IF EXISTS subscriptions_plan_status_check`,
  `ALTER TABLE tenants DROP CONSTRAINT IF EXISTS tenants_subscription_tier_check`,

  // ── Support tickets ───────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS support_tickets (
     ticket_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
     user_id     TEXT REFERENCES users(user_id),
     email       TEXT NOT NULL,
     subject     TEXT NOT NULL,
     message     TEXT NOT NULL,
     status      TEXT NOT NULL DEFAULT 'open',
     priority    TEXT NOT NULL DEFAULT 'normal',
     assigned_to TEXT REFERENCES users(user_id),
     resolution  TEXT,
     created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_st_status     ON support_tickets(status)`,
  `CREATE INDEX IF NOT EXISTS idx_st_created_at ON support_tickets(created_at DESC)`,

  // ── Support messages ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS support_messages (
     message_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
     ticket_id    TEXT NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
     sender_type  TEXT NOT NULL DEFAULT 'user',
     message      TEXT NOT NULL,
     created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_sm_ticket_id ON support_messages(ticket_id)`,

  // ── Chatbot conversations ─────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS chatbot_conversations (
     conversation_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
     user_id         TEXT REFERENCES users(user_id),
     session_token   TEXT,
     created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
     updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_cc_user_id       ON chatbot_conversations(user_id)`,
  `CREATE INDEX IF NOT EXISTS idx_cc_session_token ON chatbot_conversations(session_token)`,

  // ── Chatbot messages ──────────────────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS chatbot_messages (
     message_id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
     conversation_id TEXT NOT NULL REFERENCES chatbot_conversations(conversation_id) ON DELETE CASCADE,
     role            TEXT NOT NULL,
     content         TEXT NOT NULL,
     created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,

  `CREATE INDEX IF NOT EXISTS idx_cm_conversation_id ON chatbot_messages(conversation_id)`,

  // ── Vendor invite flow ────────────────────────────────────────────────────
  `ALTER TABLE tenant_invitations ADD COLUMN IF NOT EXISTS type TEXT NOT NULL DEFAULT 'team'`,

  // ── Event-vendor junction table ───────────────────────────────────────────
  `CREATE TABLE IF NOT EXISTS event_vendors (
     event_id     UUID NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
     vendor_id    UUID NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
     connected_at TIMESTAMPTZ NOT NULL DEFAULT now(),
     PRIMARY KEY (event_id, vendor_id)
  )`,

  `CREATE INDEX IF NOT EXISTS idx_ev_event_id  ON event_vendors(event_id)`,
  `CREATE INDEX IF NOT EXISTS idx_ev_vendor_id ON event_vendors(vendor_id)`,

  // ── Self-service password reset tokens ───────────────────────────────────
  `CREATE TABLE IF NOT EXISTS password_reset_tokens (
     token_id   TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
     user_id    TEXT NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
     token      TEXT NOT NULL UNIQUE,
     expires_at TIMESTAMPTZ NOT NULL,
     used_at    TIMESTAMPTZ,
     created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )`,
  `CREATE INDEX IF NOT EXISTS idx_prt_token ON password_reset_tokens(token)`,
];

async function runMigrations() {
  console.log('[migrations] Running startup schema migrations...');
  let applied = 0;
  for (const sql of MIGRATIONS) {
    try {
      await prisma.$executeRawUnsafe(sql);
      applied++;
    } catch (err) {
      // Already-exists errors are harmless — log and continue
      const msg = err.message || '';
      if (
        msg.includes('already exists') ||
        msg.includes('duplicate column') ||
        msg.includes('already been defined')
      ) {
        // no-op, column/table was already there
      } else {
        console.warn(`[migrations] Warning on statement:\n  ${sql.trim().split('\n')[0]}...\n  Error: ${msg}`);
      }
    }
  }
  console.log(`[migrations] Done — ${applied}/${MIGRATIONS.length} statements executed.`);
}

module.exports = { runMigrations };
