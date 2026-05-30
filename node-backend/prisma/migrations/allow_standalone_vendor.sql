-- Allow self-registered vendors (no tenant) to create their profile without
-- being tied to a planning company tenant.

ALTER TABLE vendors         ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE vendor_profiles ALTER COLUMN tenant_id DROP NOT NULL;
