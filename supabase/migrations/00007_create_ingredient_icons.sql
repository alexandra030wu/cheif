-- Shared ingredient icon library: one icon per ingredient name, shared across all users
CREATE TABLE ingredient_icons (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  name_normalized TEXT NOT NULL,
  icon_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(name_normalized)
);

CREATE INDEX idx_ingredient_icons_name ON ingredient_icons(name_normalized);

ALTER TABLE ingredient_icons ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read icons
CREATE POLICY "Anyone can read icons" ON ingredient_icons
  FOR SELECT USING (true);

-- Migrate existing icon data into the shared library (deduplicated)
INSERT INTO ingredient_icons (name, name_normalized, icon_url)
SELECT DISTINCT ON (LOWER(TRIM(name)))
  name,
  LOWER(TRIM(REPLACE(name, ' ', ''))),
  icon_url
FROM ingredients
WHERE icon_url IS NOT NULL
ON CONFLICT (name_normalized) DO NOTHING;
