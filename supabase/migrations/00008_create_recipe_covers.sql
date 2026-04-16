-- Shared recipe cover library: one cover image per dish title, shared across all users.
-- Mirrors ingredient_icons pattern. DB lookup is ~10ms; HEAD-checking public Storage URLs was 500ms-1s.
CREATE TABLE recipe_covers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  title_normalized TEXT NOT NULL,
  cover_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(title_normalized)
);

CREATE INDEX idx_recipe_covers_title ON recipe_covers(title_normalized);

ALTER TABLE recipe_covers ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read covers
CREATE POLICY "Anyone can read covers" ON recipe_covers
  FOR SELECT USING (true);

-- Backfill: migrate existing recipe covers into the shared library (dedup by normalized title)
INSERT INTO recipe_covers (title, title_normalized, cover_url)
SELECT DISTINCT ON (LOWER(TRIM(REPLACE(title, ' ', ''))))
  title,
  LOWER(TRIM(REPLACE(REPLACE(REPLACE(title, ' ', ''), '(', ''), ')', ''))),
  cover_image_url
FROM recipes
WHERE cover_image_url IS NOT NULL
ON CONFLICT (title_normalized) DO NOTHING;
