CREATE TABLE IF NOT EXISTS save_the_date_designs (
    design_id           VARCHAR(36) PRIMARY KEY,
    user_id             VARCHAR(36) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_id            VARCHAR(36),
    title               VARCHAR(255) NOT NULL,
    template_id         VARCHAR(50),
    text_content        JSONB DEFAULT '{}',
    style               JSONB DEFAULT '{}',
    uploaded_photo      VARCHAR(1000),
    generated_image_url VARCHAR(1000),
    ai_prompt_used      TEXT,
    status              VARCHAR(20) DEFAULT 'draft' CHECK (status IN ('draft','published')),
    created_at          TIMESTAMPTZ DEFAULT NOW(),
    updated_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_std_user ON save_the_date_designs(user_id);
