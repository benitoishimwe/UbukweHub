CREATE TABLE IF NOT EXISTS event_types (
    event_type_id   VARCHAR(36) PRIMARY KEY,
    slug            VARCHAR(50) UNIQUE NOT NULL,
    name            VARCHAR(100) NOT NULL,
    description     TEXT,
    icon            VARCHAR(50),
    checklist_template  JSONB DEFAULT '[]',
    timeline_template   JSONB DEFAULT '[]',
    budget_categories   JSONB DEFAULT '[]',
    created_at      TIMESTAMPTZ DEFAULT NOW()
);
