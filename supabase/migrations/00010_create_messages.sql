-- messages: persistent chat history per user. DIRECTION-v2 §2.3 keeps the chat
-- flat (no conversation/project switcher), so this is one continuous stream
-- per user, sliced into "days" by the client at render time.
CREATE TABLE messages (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
  content TEXT NOT NULL DEFAULT '',
  recipes JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_messages_user_created ON messages(user_id, created_at DESC);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage own messages" ON messages
  FOR ALL USING (auth.uid() = user_id);
