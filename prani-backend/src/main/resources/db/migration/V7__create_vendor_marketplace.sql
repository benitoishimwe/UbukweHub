-- Vendor extended profiles (linked 1-to-1 with vendors table)
CREATE TABLE IF NOT EXISTS vendor_profiles (
    profile_id              VARCHAR(36) PRIMARY KEY,
    vendor_id               VARCHAR(36) NOT NULL UNIQUE REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    bio                     TEXT,
    website                 VARCHAR(500),
    instagram               VARCHAR(200),
    facebook                VARCHAR(200),
    service_areas           JSONB DEFAULT '[]',
    price_min               DECIMAL(10,2),
    price_max               DECIMAL(10,2),
    currency                VARCHAR(10) DEFAULT 'RWF',
    packages                JSONB DEFAULT '[]',
    availability            JSONB DEFAULT '{}',
    tags                    JSONB DEFAULT '[]',
    is_marketplace_active   BOOLEAN DEFAULT false,
    created_at              TIMESTAMPTZ DEFAULT NOW(),
    updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Portfolio images per vendor
CREATE TABLE IF NOT EXISTS vendor_portfolio (
    portfolio_id    VARCHAR(36) PRIMARY KEY,
    vendor_id       VARCHAR(36) NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    image_url       VARCHAR(1000) NOT NULL,
    caption         VARCHAR(255),
    event_type      VARCHAR(50),
    display_order   INTEGER DEFAULT 0,
    uploaded_at     TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_vendor ON vendor_portfolio(vendor_id);

-- User reviews of vendors
CREATE TABLE IF NOT EXISTS vendor_reviews (
    review_id   VARCHAR(36) PRIMARY KEY,
    vendor_id   VARCHAR(36) NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    user_id     VARCHAR(36) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_id    VARCHAR(36),
    rating      INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title       VARCHAR(255),
    body        TEXT,
    is_verified BOOLEAN DEFAULT false,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (vendor_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_vendor ON vendor_reviews(vendor_id);

-- Contact inquiries to vendors
CREATE TABLE IF NOT EXISTS vendor_inquiries (
    inquiry_id  VARCHAR(36) PRIMARY KEY,
    vendor_id   VARCHAR(36) NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    user_id     VARCHAR(36) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    event_id    VARCHAR(36),
    message     TEXT NOT NULL,
    budget      DECIMAL(10,2),
    event_date  DATE,
    status      VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','responded','closed')),
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inquiries_vendor ON vendor_inquiries(vendor_id);
CREATE INDEX IF NOT EXISTS idx_inquiries_user   ON vendor_inquiries(user_id);

-- User favorites (saved vendors)
CREATE TABLE IF NOT EXISTS vendor_favorites (
    favorite_id VARCHAR(36) PRIMARY KEY,
    user_id     VARCHAR(36) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
    vendor_id   VARCHAR(36) NOT NULL REFERENCES vendors(vendor_id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (user_id, vendor_id)
);

CREATE INDEX IF NOT EXISTS idx_favorites_user ON vendor_favorites(user_id);
