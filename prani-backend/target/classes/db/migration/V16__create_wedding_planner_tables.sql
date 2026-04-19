-- Wedding Planner Module

CREATE TABLE wedding_plans (
    plan_id          VARCHAR(36)     PRIMARY KEY,
    user_id          VARCHAR(36)     NOT NULL,
    event_id         VARCHAR(36),
    wedding_date     DATE,
    theme            VARCHAR(100),
    primary_color    VARCHAR(7)      DEFAULT '#C9A84C',
    secondary_color  VARCHAR(7)      DEFAULT '#E8A4B8',
    total_budget     DECIMAL(12,2)   DEFAULT 0,
    notes            TEXT,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wedding_plans_user_id ON wedding_plans(user_id);

CREATE TABLE wedding_budget_items (
    item_id          VARCHAR(36)     PRIMARY KEY,
    plan_id          VARCHAR(36)     NOT NULL REFERENCES wedding_plans(plan_id) ON DELETE CASCADE,
    category         VARCHAR(50)     NOT NULL,
    description      TEXT,
    estimated_cost   DECIMAL(12,2)   NOT NULL DEFAULT 0,
    actual_cost      DECIMAL(12,2),
    vendor_id        VARCHAR(36),
    status           VARCHAR(20)     NOT NULL DEFAULT 'planned',
    due_date         DATE,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_budget_items_plan_id ON wedding_budget_items(plan_id);

CREATE TABLE wedding_guests (
    guest_id             VARCHAR(36)     PRIMARY KEY,
    plan_id              VARCHAR(36)     NOT NULL REFERENCES wedding_plans(plan_id) ON DELETE CASCADE,
    full_name            VARCHAR(100)    NOT NULL,
    email                VARCHAR(100),
    phone                VARCHAR(20),
    rsvp_status          VARCHAR(20)     NOT NULL DEFAULT 'pending',
    meal_choice          VARCHAR(50),
    dietary_restrictions TEXT,
    table_number         INT,
    invitation_sent      BOOLEAN         NOT NULL DEFAULT false,
    thank_you_sent       BOOLEAN         NOT NULL DEFAULT false,
    created_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at           TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wedding_guests_plan_id ON wedding_guests(plan_id);

CREATE TABLE wedding_venues (
    venue_id         VARCHAR(36)     PRIMARY KEY,
    plan_id          VARCHAR(36)     NOT NULL REFERENCES wedding_plans(plan_id) ON DELETE CASCADE,
    name             VARCHAR(150)    NOT NULL,
    address          TEXT,
    contact_name     VARCHAR(100),
    contact_phone    VARCHAR(20),
    capacity         INT,
    rental_fee       DECIMAL(12,2),
    included_items   TEXT,
    notes            TEXT,
    is_selected      BOOLEAN         NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wedding_venues_plan_id ON wedding_venues(plan_id);

CREATE TABLE wedding_menu_items (
    item_id          VARCHAR(36)     PRIMARY KEY,
    plan_id          VARCHAR(36)     NOT NULL REFERENCES wedding_plans(plan_id) ON DELETE CASCADE,
    course           VARCHAR(50)     NOT NULL,
    name             VARCHAR(100)    NOT NULL,
    description      TEXT,
    dietary_info     VARCHAR(100),
    is_final         BOOLEAN         NOT NULL DEFAULT false,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
    updated_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wedding_menu_items_plan_id ON wedding_menu_items(plan_id);

CREATE TABLE wedding_design_assets (
    asset_id         VARCHAR(36)     PRIMARY KEY,
    plan_id          VARCHAR(36)     NOT NULL REFERENCES wedding_plans(plan_id) ON DELETE CASCADE,
    image_url        TEXT            NOT NULL,
    caption          VARCHAR(200),
    sort_order       INT             NOT NULL DEFAULT 0,
    created_at       TIMESTAMPTZ     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_wedding_design_assets_plan_id ON wedding_design_assets(plan_id);
