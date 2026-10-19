-- 「新对话」分隔线:用户手动开新对话时插一条 role = 'divider' 的消息。
-- 聊天流仍是每人一条(00010 的设计不变),分隔线只决定发给模型的上下文从哪
-- 开始;往上翻依旧能看到旧对话。content 存「新对话」,满足 00011 的非空约束。
ALTER TABLE public.messages DROP CONSTRAINT IF EXISTS messages_role_check;
ALTER TABLE public.messages
  ADD CONSTRAINT messages_role_check
  CHECK (role IN ('user', 'assistant', 'divider'));
