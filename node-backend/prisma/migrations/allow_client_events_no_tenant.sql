-- Allow self-serve clients to create events, albums, and wedding plans without
-- being tied to a tenant. Clients register independently and have no tenantId;
-- their records are scoped by client_id / user_id / event_id instead.

ALTER TABLE events        ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE albums        ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE wedding_plans ALTER COLUMN tenant_id DROP NOT NULL;
