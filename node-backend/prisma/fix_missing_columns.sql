-- ============================================================
-- Run this in Supabase SQL Editor (one-time migration)
-- Safe: uses IF NOT EXISTS — harmless to run more than once
-- ============================================================

-- 1. Add tenant_id to users (needed by Node.js Prisma schema)
ALTER TABLE users ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 2. Add tenant_id to subscriptions (needed by Node.js Prisma schema)
ALTER TABLE subscriptions ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- 3. Performance indexes
CREATE INDEX IF NOT EXISTS idx_users_tenant_id       ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_email            ON users(email);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id  ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_tenant_id ON subscriptions(tenant_id);

-- Verify
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name IN ('users', 'subscriptions')
  AND column_name = 'tenant_id'
ORDER BY table_name;
