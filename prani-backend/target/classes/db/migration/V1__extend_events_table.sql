-- Extend existing events table with Prani multi-event fields
-- Safe: uses IF NOT EXISTS / ALTER ... ADD IF NOT EXISTS
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS event_type_slug VARCHAR DEFAULT 'wedding',
    ADD COLUMN IF NOT EXISTS checklist JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS timeline JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS seating_plan JSONB DEFAULT '{}',
    ADD COLUMN IF NOT EXISTS guest_list JSONB DEFAULT '[]',
    ADD COLUMN IF NOT EXISTS budget_breakdown JSONB DEFAULT '[]';

CREATE INDEX IF NOT EXISTS idx_events_event_type ON events(event_type_slug);
CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
