CREATE TABLE IF NOT EXISTS event_tasks (
    task_id     VARCHAR(36) PRIMARY KEY,
    event_id    VARCHAR(36) NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
    title       VARCHAR(255) NOT NULL,
    description TEXT,
    category    VARCHAR(100),
    due_date    DATE,
    assigned_to VARCHAR(36) REFERENCES users(user_id) ON DELETE SET NULL,
    status      VARCHAR(20) NOT NULL DEFAULT 'todo'   CHECK (status IN ('todo','in_progress','done')),
    priority    VARCHAR(10) NOT NULL DEFAULT 'medium' CHECK (priority IN ('high','medium','low')),
    created_by  VARCHAR(36) REFERENCES users(user_id) ON DELETE SET NULL,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_event_tasks_event ON event_tasks(event_id);
CREATE INDEX IF NOT EXISTS idx_event_tasks_status ON event_tasks(status);
