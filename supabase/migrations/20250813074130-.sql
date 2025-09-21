-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create release_drafts table
CREATE TABLE IF NOT EXISTS public.release_drafts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  artist TEXT,
  description TEXT,
  genre TEXT,
  release_type TEXT NOT NULL DEFAULT 'Single',
  cover_art_url TEXT,
  preview_url TEXT,
  download_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.release_drafts ENABLE ROW LEVEL SECURITY;

-- RLS policies for owners
CREATE POLICY IF NOT EXISTS "select_own_release_drafts"
ON public.release_drafts FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "insert_own_release_drafts"
ON public.release_drafts FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "update_own_release_drafts"
ON public.release_drafts FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "delete_own_release_drafts"
ON public.release_drafts FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_release_drafts_user_id ON public.release_drafts(user_id);
CREATE INDEX IF NOT EXISTS idx_release_drafts_status ON public.release_drafts(status);

-- Updated_at trigger
CREATE TRIGGER IF NOT EXISTS update_release_drafts_updated_at
BEFORE UPDATE ON public.release_drafts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies for release buckets
-- Public read for release artwork and audio
CREATE POLICY IF NOT EXISTS "public_read_release_media"
ON storage.objects FOR SELECT
USING (bucket_id IN ('release-artwork', 'release-audio'));

-- Allow users to upload files to their own folder (/{user_id}/...)
CREATE POLICY IF NOT EXISTS "users_upload_release_media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id IN ('release-artwork', 'release-audio')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to update their own files in these buckets
CREATE POLICY IF NOT EXISTS "users_update_release_media"
ON storage.objects FOR UPDATE
USING (
  bucket_id IN ('release-artwork', 'release-audio')
  AND auth.uid()::text = (storage.foldername(name))[1]
)
WITH CHECK (
  bucket_id IN ('release-artwork', 'release-audio')
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own files in these buckets
CREATE POLICY IF NOT EXISTS "users_delete_release_media"
ON storage.objects FOR DELETE
USING (
  bucket_id IN ('release-artwork', 'release-audio')
  AND auth.uid()::text = (storage.foldername(name))[1]
);
