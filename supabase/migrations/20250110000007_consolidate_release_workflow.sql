-- Consolidate release workflow to use single table with status transitions
-- Instead of copying between release_drafts and releases tables

-- First, add status column to releases table if it doesn't exist
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft',
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- Update existing releases to have 'live' status (they're already published)
UPDATE public.releases 
SET status = 'live' 
WHERE status IS NULL OR status = '';

-- Add constraint for valid statuses
ALTER TABLE public.releases 
DROP CONSTRAINT IF EXISTS releases_status_check;

ALTER TABLE public.releases 
ADD CONSTRAINT releases_status_check 
CHECK (status IN ('draft', 'submitted', 'approved', 'live', 'rejected'));

-- Migrate data from release_drafts to releases table
INSERT INTO public.releases (
  user_id, title, artist, description, genre, release_type, 
  cover_art_url, preview_url, download_url, price, pay_what_you_want, 
  minimum_price, upc_code, release_date, digital_release_date, 
  distribution_settings, status, moderation_notes, created_at, updated_at
)
SELECT 
  user_id, title, artist, description, genre, release_type,
  cover_art_url, preview_url, download_url, price, pay_what_you_want,
  minimum_price, upc_code, release_date, digital_release_date,
  distribution_settings, status, moderation_notes, created_at, updated_at
FROM public.release_drafts
ON CONFLICT DO NOTHING;

-- Update tracks to reference the migrated releases
UPDATE public.tracks 
SET release_id = (
  SELECT r.id 
  FROM public.releases r 
  WHERE r.title = (
    SELECT rd.title 
    FROM public.release_drafts rd 
    WHERE rd.id = tracks.release_draft_id
  )
  AND r.user_id = (
    SELECT rd.user_id 
    FROM public.release_drafts rd 
    WHERE rd.id = tracks.release_draft_id
  )
  LIMIT 1
),
release_draft_id = NULL
WHERE release_draft_id IS NOT NULL;

-- Comment on the status flow
COMMENT ON COLUMN public.releases.status IS 'Release status: draft → submitted → approved/rejected → live';
COMMENT ON COLUMN public.releases.moderation_notes IS 'Admin notes when rejecting or requesting changes';

-- Drop release_drafts table after migration (commented out for safety)
-- DROP TABLE IF EXISTS public.release_drafts CASCADE;