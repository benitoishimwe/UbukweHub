CREATE TABLE IF NOT EXISTS payments (
    payment_id          VARCHAR(36) PRIMARY KEY,
    user_id             VARCHAR(36) NOT NULL REFERENCES users(user_id),
    subscription_id     VARCHAR(36) REFERENCES subscriptions(subscription_id),
    provider            VARCHAR(20) NOT NULL CHECK (provider IN ('stripe','paystack')),
    provider_payment_id VARCHAR(200),
    amount              DECIMAL(10,2) NOT NULL,
    currency            VARCHAR(10)   NOT NULL DEFAULT 'USD',
    status              VARCHAR(20)   NOT NULL CHECK (status IN ('pending','succeeded','failed','refunded')),
    metadata            JSONB,
    created_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
