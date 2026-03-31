-- Migration: Add icon_url to ingredients + create Storage bucket
-- Run this in the Supabase SQL Editor

-- 1. Add icon_url column
ALTER TABLE public.ingredients ADD COLUMN IF NOT EXISTS icon_url text;

-- 2. Create public storage bucket for ingredient icons
INSERT INTO storage.buckets (id, name, public)
VALUES ('ingredient-icons', 'ingredient-icons', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
CREATE POLICY "Anyone can read ingredient icons"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'ingredient-icons');

CREATE POLICY "Authenticated users can upload ingredient icons"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'ingredient-icons');

CREATE POLICY "Authenticated users can update ingredient icons"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'ingredient-icons');
