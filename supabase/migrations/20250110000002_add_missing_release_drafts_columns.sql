-- Add missing columns to release_drafts table for complete release submission flow
-- These columns are needed for the EnhancedReleaseBuilder to properly submit releases for admin review

ALTER TABLE public.release_drafts 
ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS pay_what_you_want BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS minimum_price NUMERIC DEFAULT 0,
ADD COLUMN IF NOT EXISTS upc_code TEXT,
ADD COLUMN IF NOT EXISTS release_date DATE,
ADD COLUMN IF NOT EXISTS digital_release_date TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS distribution_settings JSONB DEFAULT '{}'::jsonb;

-- Add index for performance when filtering by status
CREATE INDEX IF NOT EXISTS idx_release_drafts_status 
ON public.release_drafts(status) 
WHERE status IN ('submitted', 'draft');

-- Add index for user lookups
CREATE INDEX IF NOT EXISTS idx_release_drafts_user_id 
ON public.release_drafts(user_id);

-- Add check constraint for valid JSON in distribution_settings
ALTER TABLE public.release_drafts 
DROP CONSTRAINT IF EXISTS release_drafts_distribution_settings_valid_json;

ALTER TABLE public.release_drafts 
ADD CONSTRAINT release_drafts_distribution_settings_valid_json 
CHECK (distribution_settings IS NULL OR jsonb_typeof(distribution_settings) = 'object');

-- Comment on the purpose of this table
COMMENT ON TABLE public.release_drafts IS 'Stores release submissions pending admin approval before they are moved to the releases table';
COMMENT ON COLUMN public.release_drafts.status IS 'Status values: draft (saved but not submitted), submitted (pending admin review), approved (moved to releases), rejected (declined with notes)';
COMMENT ON COLUMN public.release_drafts.moderation_notes IS 'Admin feedback when rejecting a release';
COMMENT ON COLUMN public.release_drafts.distribution_settings IS 'JSON object storing platform-specific distribution settings {spotify: bool, apple_music: bool, youtube_music: bool}';