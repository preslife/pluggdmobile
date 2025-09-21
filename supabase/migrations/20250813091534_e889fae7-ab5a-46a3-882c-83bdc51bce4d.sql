-- Add moderation_notes column to release_drafts
ALTER TABLE public.release_drafts
ADD COLUMN IF NOT EXISTS moderation_notes text;