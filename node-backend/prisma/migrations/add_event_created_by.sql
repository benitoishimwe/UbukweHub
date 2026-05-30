-- Track who created each event so event managers can be scoped to their own events only.
ALTER TABLE events ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES users(user_id) ON DELETE SET NULL;
