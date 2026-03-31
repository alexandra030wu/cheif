-- Migration: Add cover_image_url to recipes + create Storage bucket
-- Run this in the Supabase SQL Editor

-- 1. Add cover_image_url column
ALTER TABLE public.recipes ADD COLUMN IF NOT EXISTS cover_image_url text;

-- 2. Create public storage bucket for recipe covers
INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-covers', 'recipe-covers', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Storage policies
CREATE POLICY "Anyone can read recipe covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-covers');

CREATE POLICY "Authenticated users can upload recipe covers"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'recipe-covers');

CREATE POLICY "Authenticated users can update recipe covers"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'recipe-covers');
