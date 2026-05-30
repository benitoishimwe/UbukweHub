-- ============================================================
-- Migration 001: Guest Check-in + Support System Schema
-- Run this once in your Supabase SQL editor.
-- All statements are idempotent (safe to run multiple times).
-- ============================================================

-- 0. Allow null tenant_id on event_tasks and inventory_items (self-serve event managers have no tenant)
ALTER TABLE event_tasks ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE inventory_items ALTER COLUMN tenant_id DROP NOT NULL;

-- 1. Core event columns added after initial schema
ALTER TABLE events
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
  ADD COLUMN IF NOT EXISTS vendor_ids       TEXT[] DEFAULT '{}';

-- 2. Guest check-in feature flags on events table
ALTER TABLE events
  ADD COLUMN IF NOT EXISTS guest_checkin_enabled            BOOLEAN NOT NULL DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS guest_checkin_otp_expiry_minutes INTEGER NOT NULL DEFAULT 10;

-- 2. Guest check-in attempts (OTP flow)
CREATE TABLE IF NOT EXISTS guest_checkin_attempts (
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
);

CREATE INDEX IF NOT EXISTS idx_gca_event_id ON guest_checkin_attempts(event_id);
CREATE INDEX IF NOT EXISTS idx_gca_status   ON guest_checkin_attempts(status);

-- 3. Guest check-ins (confirmed check-in records)
CREATE TABLE IF NOT EXISTS guest_checkins (
  checkin_id    TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  event_id      TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  email         TEXT NOT NULL,
  guest_name    TEXT,
  checked_in_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address    TEXT
);

CREATE INDEX IF NOT EXISTS idx_gc_event_id ON guest_checkins(event_id);

-- 4. Support tickets
CREATE TABLE IF NOT EXISTS support_tickets (
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
);

CREATE INDEX IF NOT EXISTS idx_st_status     ON support_tickets(status);
CREATE INDEX IF NOT EXISTS idx_st_created_at ON support_tickets(created_at DESC);

-- 5. Support messages (replies on tickets)
CREATE TABLE IF NOT EXISTS support_messages (
  message_id  TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  ticket_id   TEXT NOT NULL REFERENCES support_tickets(ticket_id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL DEFAULT 'user',
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sm_ticket_id ON support_messages(ticket_id);

-- 6. Chatbot conversations
CREATE TABLE IF NOT EXISTS chatbot_conversations (
  conversation_id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id         TEXT REFERENCES users(user_id),
  session_token   TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cc_user_id       ON chatbot_conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_cc_session_token ON chatbot_conversations(session_token);

-- 7. Chatbot messages
CREATE TABLE IF NOT EXISTS chatbot_messages (
  message_id      TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  conversation_id TEXT NOT NULL REFERENCES chatbot_conversations(conversation_id) ON DELETE CASCADE,
  role            TEXT NOT NULL,
  content         TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cm_conversation_id ON chatbot_messages(conversation_id);
