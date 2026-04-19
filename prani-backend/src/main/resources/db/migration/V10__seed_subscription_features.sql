-- Seed subscription feature gates for all four plans
-- feature_key values: ai_assistant | save_the_date | vendor_marketplace | analytics | unlimited_events | advanced_reports

INSERT INTO subscription_features (feature_id, plan, feature_key, is_enabled, limit_value)
VALUES
  -- FREE plan
  (gen_random_uuid()::text, 'free', 'ai_assistant',       false, 0),
  (gen_random_uuid()::text, 'free', 'save_the_date',       false, 0),
  (gen_random_uuid()::text, 'free', 'vendor_marketplace',  true,  NULL), -- browse only
  (gen_random_uuid()::text, 'free', 'analytics',           false, 0),
  (gen_random_uuid()::text, 'free', 'unlimited_events',    false, 3),    -- 3-event cap
  (gen_random_uuid()::text, 'free', 'advanced_reports',    false, 0),

  -- TRIAL plan (14 days — all pro features)
  (gen_random_uuid()::text, 'trial', 'ai_assistant',       true,  NULL),
  (gen_random_uuid()::text, 'trial', 'save_the_date',      true,  5),
  (gen_random_uuid()::text, 'trial', 'vendor_marketplace', true,  NULL),
  (gen_random_uuid()::text, 'trial', 'analytics',          true,  NULL),
  (gen_random_uuid()::text, 'trial', 'unlimited_events',   true,  NULL),
  (gen_random_uuid()::text, 'trial', 'advanced_reports',   true,  NULL),

  -- PRO plan
  (gen_random_uuid()::text, 'pro', 'ai_assistant',         true,  NULL),
  (gen_random_uuid()::text, 'pro', 'save_the_date',        true,  20),
  (gen_random_uuid()::text, 'pro', 'vendor_marketplace',   true,  NULL),
  (gen_random_uuid()::text, 'pro', 'analytics',            true,  NULL),
  (gen_random_uuid()::text, 'pro', 'unlimited_events',     true,  NULL),
  (gen_random_uuid()::text, 'pro', 'advanced_reports',     true,  NULL),

  -- ENTERPRISE plan (everything unlimited)
  (gen_random_uuid()::text, 'enterprise', 'ai_assistant',       true, NULL),
  (gen_random_uuid()::text, 'enterprise', 'save_the_date',      true, NULL),
  (gen_random_uuid()::text, 'enterprise', 'vendor_marketplace', true, NULL),
  (gen_random_uuid()::text, 'enterprise', 'analytics',          true, NULL),
  (gen_random_uuid()::text, 'enterprise', 'unlimited_events',   true, NULL),
  (gen_random_uuid()::text, 'enterprise', 'advanced_reports',   true, NULL)

ON CONFLICT (plan, feature_key) DO NOTHING;
