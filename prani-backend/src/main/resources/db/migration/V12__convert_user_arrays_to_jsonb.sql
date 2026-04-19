ALTER TABLE users ALTER COLUMN skills DROP DEFAULT;
ALTER TABLE users ALTER COLUMN skills TYPE jsonb USING to_jsonb(skills);
ALTER TABLE users ALTER COLUMN skills SET DEFAULT '[]'::jsonb;

ALTER TABLE users ALTER COLUMN certifications DROP DEFAULT;
ALTER TABLE users ALTER COLUMN certifications TYPE jsonb USING to_jsonb(certifications);
ALTER TABLE users ALTER COLUMN certifications SET DEFAULT '[]'::jsonb;
