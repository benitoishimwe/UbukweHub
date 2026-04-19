-- events: staff_ids and vendor_ids (stored as text[] by Python backend)
ALTER TABLE events ALTER COLUMN staff_ids DROP DEFAULT;
ALTER TABLE events ALTER COLUMN staff_ids TYPE jsonb USING to_jsonb(staff_ids);
ALTER TABLE events ALTER COLUMN staff_ids SET DEFAULT '[]'::jsonb;

ALTER TABLE events ALTER COLUMN vendor_ids DROP DEFAULT;
ALTER TABLE events ALTER COLUMN vendor_ids TYPE jsonb USING to_jsonb(vendor_ids);
ALTER TABLE events ALTER COLUMN vendor_ids SET DEFAULT '[]'::jsonb;

-- inventory: photos stored as text[]
ALTER TABLE inventory ALTER COLUMN photos DROP DEFAULT;
ALTER TABLE inventory ALTER COLUMN photos TYPE jsonb USING to_jsonb(photos);
ALTER TABLE inventory ALTER COLUMN photos SET DEFAULT '[]'::jsonb;
