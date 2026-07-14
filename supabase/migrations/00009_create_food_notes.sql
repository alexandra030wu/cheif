-- food_notes: per-user, per-food markdown notes that grow automatically from chat
-- Aligned with DIRECTION-v2 §6.1. No state field, no project concept — by design.
CREATE TABLE food_notes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  food_name TEXT NOT NULL,
  food_name_normalized TEXT NOT NULL,
  content_md TEXT NOT NULL DEFAULT '',
  cover_image_url TEXT,
  ingredient_tags TEXT[] NOT NULL DEFAULT '{}',
  entry_type TEXT NOT NULL DEFAULT 'food',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, food_name_normalized)
);

CREATE INDEX idx_food_notes_user_updated ON food_notes(user_id, updated_at DESC);
CREATE INDEX idx_food_notes_normalized ON food_notes(user_id, food_name_normalized);

ALTER TABLE food_notes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own food notes" ON food_notes
  FOR ALL USING (auth.uid() = user_id);

-- Atomic upsert + append: existing note → append summary fragment + merge tags + bump
-- updated_at; missing note → insert. Avoids client-side read/write race.
CREATE OR REPLACE FUNCTION append_food_note(
  p_user_id UUID,
  p_food_name TEXT,
  p_food_name_normalized TEXT,
  p_summary_md TEXT,
  p_entry_type TEXT,
  p_ingredient_tags TEXT[]
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_id UUID;
BEGIN
  INSERT INTO food_notes (
    user_id, food_name, food_name_normalized,
    content_md, ingredient_tags, entry_type
  ) VALUES (
    p_user_id, p_food_name, p_food_name_normalized,
    p_summary_md, COALESCE(p_ingredient_tags, '{}'), COALESCE(p_entry_type, 'food')
  )
  ON CONFLICT (user_id, food_name_normalized) DO UPDATE SET
    content_md = food_notes.content_md || p_summary_md,
    ingredient_tags = (
      SELECT ARRAY(
        SELECT DISTINCT unnest(food_notes.ingredient_tags || COALESCE(p_ingredient_tags, '{}'))
      )
    ),
    updated_at = NOW()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
