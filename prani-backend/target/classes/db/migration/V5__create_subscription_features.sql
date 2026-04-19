CREATE TABLE IF NOT EXISTS subscription_features (
    feature_id  VARCHAR(36) PRIMARY KEY,
    plan        VARCHAR(20)  NOT NULL,
    feature_key VARCHAR(50)  NOT NULL,
    is_enabled  BOOLEAN      NOT NULL DEFAULT false,
    limit_value INTEGER,  -- NULL = unlimited
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (plan, feature_key)
);

CREATE INDEX IF NOT EXISTS idx_sub_features_plan ON subscription_features(plan);
