-- 00011_cleanup_empty_messages.sql
--
-- 一次性清理 messages 表里 content 为空/空白的脏数据。
--
-- 背景：早期 schema 允许 content="" 入库（/api/messages POST 的 z.string()
-- 没 trim 没 min(1)），导致历史里堆了一些空气泡。空 content 一旦被
-- /api/chat 取出来 spread 进 Anthropic messages 数组，会触发 400
-- 「text content blocks must be non-empty」整条请求崩。
--
-- 应用层 fix 已在代码里做：
--   - POST /api/messages 拒绝空 content
--   - GET /api/messages 和 chat/page.tsx 读出时过滤空 content
--   - /api/chat 入口 sanitize 历史
--   - MessageBubble 渲染层兜底
--
-- 这条 migration 是把存量脏数据物理清掉。**只删 content 空且不带
-- recipes 的行**：assistant 的纯 recipes 消息（content 为空但 recipes
-- 非空）是合法历史（封面只生成图片没文字），保留。

DELETE FROM public.messages
WHERE
  (content IS NULL OR btrim(content) = '')
  AND (recipes IS NULL OR jsonb_array_length(COALESCE(recipes, '[]'::jsonb)) = 0);

-- 加 CHECK 约束，从 DB 层兜底未来不再写入空 content（除非带 recipes）。
ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_or_recipes_nonempty
  CHECK (
    btrim(COALESCE(content, '')) <> ''
    OR (recipes IS NOT NULL AND jsonb_array_length(recipes) > 0)
  );
