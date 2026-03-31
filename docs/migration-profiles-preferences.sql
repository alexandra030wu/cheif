-- Migration: Add user preference fields to profiles table
-- Run this in the Supabase SQL Editor

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS dietary_preferences jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS allergies text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS cooking_level text DEFAULT 'beginner',
  ADD COLUMN IF NOT EXISTS kitchen_equipment text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS default_servings text DEFAULT '1人食';

-- Add a comment for documentation
COMMENT ON COLUMN public.profiles.nickname IS '用户昵称';
COMMENT ON COLUMN public.profiles.dietary_preferences IS '饮食偏好 JSON 数组，如 ["素食","低碳水"]';
COMMENT ON COLUMN public.profiles.allergies IS '过敏原列表，如 {花生,海鲜}';
COMMENT ON COLUMN public.profiles.cooking_level IS '厨艺水平: beginner / intermediate / expert';
COMMENT ON COLUMN public.profiles.kitchen_equipment IS '常用厨具列表，如 {烤箱,空气炸锅}';
COMMENT ON COLUMN public.profiles.default_servings IS '默认人份: 1人食 / 2人食 / 一家三口 / 聚餐4-6人';
