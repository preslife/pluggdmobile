-- Add preview_url column to release_drafts table for admin audio preview
ALTER TABLE public.release_drafts 
ADD COLUMN IF NOT EXISTS preview_url TEXT;

-- Add comment explaining the column purpose
COMMENT ON COLUMN public.release_drafts.preview_url IS 'URL to preview audio file for admin review (typically first track)';