-- Add missing fields to releases table for EnhancedReleaseBuilder
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS upc_code TEXT,
ADD COLUMN IF NOT EXISTS distribution_settings JSONB DEFAULT '{}'::jsonb;

-- Add missing download_url to release_drafts table for MyReleases.tsx
ALTER TABLE public.release_drafts
ADD COLUMN IF NOT EXISTS download_url TEXT;

-- Create index for UPC code lookups
CREATE INDEX IF NOT EXISTS idx_releases_upc_code 
ON public.releases(upc_code) 
WHERE upc_code IS NOT NULL;

-- Add check constraint for valid JSON in distribution_settings
ALTER TABLE public.releases 
ADD CONSTRAINT IF NOT EXISTS releases_distribution_settings_valid_json 
CHECK (distribution_settings IS NULL OR jsonb_typeof(distribution_settings) = 'object');