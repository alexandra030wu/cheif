-- taste_signals: raw taste preference signals extracted from conversations and behaviors
CREATE TABLE taste_signals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  signal_type TEXT NOT NULL,
  signal_value TEXT NOT NULL,
  confidence FLOAT DEFAULT 0.7,
  source TEXT DEFAULT 'chat',
  context TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_taste_signals_user ON taste_signals(user_id);
CREATE INDEX idx_taste_signals_type ON taste_signals(user_id, signal_type);

ALTER TABLE taste_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own signals" ON taste_signals
  FOR ALL USING (auth.uid() = user_id);

-- Add taste_profile JSONB column to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS taste_profile JSONB DEFAULT '{}';
