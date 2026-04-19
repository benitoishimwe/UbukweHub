CREATE TABLE IF NOT EXISTS subscriptions (
    subscription_id             VARCHAR(36) PRIMARY KEY,
    user_id                     VARCHAR(36) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    plan                        VARCHAR(20)  NOT NULL DEFAULT 'free' CHECK (plan IN ('free','trial','pro','enterprise')),
    status                      VARCHAR(20)  NOT NULL DEFAULT 'active' CHECK (status IN ('active','cancelled','past_due','expired')),
    stripe_customer_id          VARCHAR(100),
    stripe_subscription_id      VARCHAR(100),
    paystack_subscription_code  VARCHAR(100),
    current_period_start        TIMESTAMPTZ,
    current_period_end          TIMESTAMPTZ,
    trial_ends_at               TIMESTAMPTZ,
    cancel_at_period_end        BOOLEAN DEFAULT false,
    created_at                  TIMESTAMPTZ DEFAULT NOW(),
    updated_at                  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_status ON subscriptions(status);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe ON subscriptions(stripe_subscription_id);
