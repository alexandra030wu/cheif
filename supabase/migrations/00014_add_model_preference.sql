-- Per-user AI model preference. Lets a user pick which LLM powers their chat /
-- recipe / extraction calls. NULL means "use the default" (Claude) — so we
-- don't need to backfill existing rows; code treats NULL as 'claude'.
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_model_preference TEXT
    CHECK (ai_model_preference IS NULL OR ai_model_preference IN ('claude', 'deepseek'));
