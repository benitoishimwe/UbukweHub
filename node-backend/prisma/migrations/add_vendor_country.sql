-- Add country field to vendors so vendors can specify the country they operate in.
-- Worldwide platform — no default country assumed.

ALTER TABLE vendors ADD COLUMN IF NOT EXISTS country TEXT;
