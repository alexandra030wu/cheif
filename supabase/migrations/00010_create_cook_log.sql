-- cook_log: one row per dish the user finished cooking (完成烹饪),
-- used by the daily nutrition summary (/nutrition)
CREATE TABLE cook_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipe_title TEXT NOT NULL,
  -- per-serving estimate snapshot: { calories, proteinG, carbsG, fatG }
  nutrition JSONB,
  cooked_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_cook_log_user_time ON cook_log(user_id, cooked_at DESC);

ALTER TABLE cook_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own cook log" ON cook_log
  FOR ALL USING (auth.uid() = user_id);
