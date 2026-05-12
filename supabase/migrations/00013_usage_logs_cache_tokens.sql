-- 00013_usage_logs_cache_tokens.sql
--
-- usage_logs 表增加 cache_read_tokens / cache_write_tokens 两列，对应
-- Anthropic prompt caching 的两个 token 计量维度：
--   - cache_read_tokens：命中缓存读取的 input tokens，Anthropic 收 0.1×
--   - cache_write_tokens：写入新缓存条目的 input tokens，Anthropic 收 1.25×
--
-- 注意：input_tokens 列保持「总 input tokens」语义不变（不减去 cache 部分）。
-- 单独存 cache 拆分是为了让查询能算「有效成本」和「缓存节省」。
--
-- 老 row 默认 0，对历史聚合无影响。

ALTER TABLE public.usage_logs
  ADD COLUMN IF NOT EXISTS cache_read_tokens INTEGER NOT NULL DEFAULT 0
    CHECK (cache_read_tokens >= 0),
  ADD COLUMN IF NOT EXISTS cache_write_tokens INTEGER NOT NULL DEFAULT 0
    CHECK (cache_write_tokens >= 0);
