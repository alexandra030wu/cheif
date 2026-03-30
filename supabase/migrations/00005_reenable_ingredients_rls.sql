-- Re-enable RLS on ingredients table (was disabled during development)
ALTER TABLE ingredients ENABLE ROW LEVEL SECURITY;

-- Ensure the policy exists (drop + recreate to be idempotent)
DROP POLICY IF EXISTS "Users can manage own ingredients" ON ingredients;
CREATE POLICY "Users can manage own ingredients"
  ON ingredients
  FOR ALL
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);
