-- 00012_create_usage_logs.sql
--
-- 用户每次 /api/chat 调用的 token 消耗流水表。第一阶段「只测量、不收费、
-- 不限额」的存储基座：先攒真实数据，再决定免费档/收费档具体数字。
--
-- 设计要点：
--   - 一次 chat 请求 = 一条 row（不论 intent 是 chat 还是 recipe）
--   - input/output tokens 各自单列存原始值，不在写入时合并 —— 后面要按
--     provider 不同价位加权时，原始值是必须的
--   - cover_count 单独存（封面图按次数收 Imagen 的钱，不按 token）
--   - request_id 跟 /api/chat 的结构化日志对得上，方便联合排查

CREATE TABLE IF NOT EXISTS public.usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  request_id TEXT NOT NULL,
  intent TEXT NOT NULL CHECK (intent IN ('chat', 'recipe')),
  provider TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0 CHECK (input_tokens >= 0),
  output_tokens INTEGER NOT NULL DEFAULT 0 CHECK (output_tokens >= 0),
  cover_count INTEGER NOT NULL DEFAULT 0 CHECK (cover_count >= 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 查 user 当月聚合 / 最近 N 天，都走这个索引
CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id_created_at
  ON public.usage_logs (user_id, created_at DESC);

-- RLS：只能看自己的，只能写自己的
ALTER TABLE public.usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own usage logs"
  ON public.usage_logs FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own usage logs"
  ON public.usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
