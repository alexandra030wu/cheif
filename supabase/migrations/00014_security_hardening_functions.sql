-- 00014_security_hardening_functions.sql
--
-- 修 Supabase Security Advisor 报的两个 SECURITY DEFINER 相关警告：
--   - Public Can Execute SECURITY DEFINER Function
--   - Signed-In Users Can Execute SECURITY DEFINER Function
--
-- 涉及函数：
--   - public.append_food_note (00009 引入)
--   - public.handle_new_user  (00001 引入)
--
-- 两个函数都是 SECURITY DEFINER,以函数所有者(postgres)身份运行,绕过 RLS。
-- 现状风险：
--   1. append_food_note 接受 p_user_id 参数,任何登录用户可 supabase.rpc()
--      直接传别人的 UUID → 替他人写食物笔记(越权)。
--   2. handle_new_user 是 trigger 函数,PUBLIC 本无需 EXECUTE 权限,
--      放着增加攻击面。
--
-- 三处加固:
--   (a) 撤 PUBLIC EXECUTE,只授必需角色
--   (b) append_food_note 内嵌 auth.uid() = p_user_id 校验(防越权)
--   (c) 两个函数都 SET search_path,防 schema hijack(顺手修 Function Search
--       Path Mutable 警告)

-- ── 1. append_food_note ────────────────────────────────────────

-- CREATE OR REPLACE 保留原逻辑,只加权限校验 + search_path
CREATE OR REPLACE FUNCTION public.append_food_note(
  p_user_id UUID,
  p_food_name TEXT,
  p_food_name_normalized TEXT,
  p_summary_md TEXT,
  p_entry_type TEXT,
  p_ingredient_tags TEXT[]
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
DECLARE
  v_id UUID;
BEGIN
  -- 防越权:必须是登录用户,且只能给自己写笔记。
  -- 服务端 route 里传的是 user.id(来自 supabase.auth.getUser()),两者
  -- 恒等,不影响正常调用。
  IF auth.uid() IS NULL OR auth.uid() != p_user_id THEN
    RAISE EXCEPTION 'not authorized: p_user_id must match auth.uid()';
  END IF;

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

REVOKE EXECUTE ON FUNCTION public.append_food_note(uuid, text, text, text, text, text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.append_food_note(uuid, text, text, text, text, text[]) TO authenticated;

-- ── 2. handle_new_user (auth.users insert trigger) ────────────

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = pg_catalog, public
AS $$
BEGIN
  INSERT INTO public.profiles (id) VALUES (new.id);
  RETURN new;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
-- 不需 GRANT:trigger 在函数所有者上下文运行,不检查 caller 的 EXECUTE 权限
