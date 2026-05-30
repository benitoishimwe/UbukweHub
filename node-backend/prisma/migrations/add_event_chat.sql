-- ─── Event Chat: channel_messages + channel_read_status ──────────────────────
-- Run this migration against your Supabase PostgreSQL database.
-- Supabase Storage: create a bucket named "chat-attachments" with public access
-- (or private + signed URLs) before using file attachments.

-- ── 1. channel_messages ──────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS channel_messages (
  message_id        UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id          TEXT        NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  sender_id         TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  sender_name       TEXT        NOT NULL,
  sender_role       TEXT        NOT NULL,
  content           TEXT,
  attachments       JSONB,
  parent_message_id UUID        REFERENCES channel_messages(message_id) ON DELETE SET NULL,
  is_pinned         BOOLEAN     NOT NULL DEFAULT false,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Full-text search vector (stored generated column)
ALTER TABLE channel_messages
  ADD COLUMN IF NOT EXISTS search_vector tsvector
    GENERATED ALWAYS AS (to_tsvector('english', coalesce(content, ''))) STORED;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_channel_messages_event_id   ON channel_messages(event_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_sender_id  ON channel_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_parent     ON channel_messages(parent_message_id);
CREATE INDEX IF NOT EXISTS idx_channel_messages_pinned     ON channel_messages(event_id, is_pinned) WHERE is_pinned = true;
CREATE INDEX IF NOT EXISTS idx_channel_messages_created    ON channel_messages(event_id, created_at);
CREATE INDEX IF NOT EXISTS idx_channel_messages_search     ON channel_messages USING GIN(search_vector);

-- updated_at trigger
CREATE OR REPLACE FUNCTION update_channel_messages_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_channel_messages_updated_at ON channel_messages;
CREATE TRIGGER trg_channel_messages_updated_at
  BEFORE UPDATE ON channel_messages
  FOR EACH ROW EXECUTE FUNCTION update_channel_messages_updated_at();

-- ── 2. channel_read_status ───────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS channel_read_status (
  user_id      TEXT        NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  channel_id   TEXT        NOT NULL,  -- equals event_id
  last_read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, channel_id)
);

CREATE INDEX IF NOT EXISTS idx_channel_read_status_user ON channel_read_status(user_id);

-- ── 3. RLS Policies (Supabase) ───────────────────────────────────────────────
-- Enable Row Level Security if using Supabase directly from the client.
-- Since this app accesses the DB via the service-role key through the backend,
-- RLS is bypassed. Enable only if you add direct Supabase client access later.

-- ALTER TABLE channel_messages    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE channel_read_status ENABLE ROW LEVEL SECURITY;

-- ── 4. Storage bucket setup instructions ─────────────────────────────────────
-- In Supabase Dashboard → Storage:
--   1. Create bucket "chat-attachments"
--   2. Set to Public (for public URLs) OR Private (and use signed URLs)
--   3. Add file size limit: 10 MB
--   4. Allowed MIME types: image/*, application/pdf,
--      application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,
--      application/vnd.ms-excel, text/csv
