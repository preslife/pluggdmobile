-- Final migration to add any remaining missing fields

-- Add ISRC and moderation_notes to releases table
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS isrc_code TEXT,
ADD COLUMN IF NOT EXISTS moderation_notes TEXT;

-- Add ISRC to tracks table (each track can have its own ISRC)
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS isrc_code TEXT;

-- Ensure status column has proper default and check constraint
DO $$ 
BEGIN
    -- Check if status column exists without proper constraint
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.check_constraints 
        WHERE constraint_name LIKE '%status%' 
        AND constraint_schema = 'public'
    ) THEN
        ALTER TABLE public.releases 
        DROP CONSTRAINT IF EXISTS releases_status_check;
        
        ALTER TABLE public.releases 
        ADD CONSTRAINT releases_status_check 
        CHECK (status IN ('draft', 'submitted', 'approved', 'rejected', 'live', 'scheduled'));
    END IF;
END $$;

-- Add indexes for new fields
CREATE INDEX IF NOT EXISTS idx_releases_isrc ON public.releases(isrc_code);
CREATE INDEX IF NOT EXISTS idx_tracks_isrc ON public.tracks(isrc_code);

-- Add comments for documentation
COMMENT ON COLUMN public.releases.isrc_code IS 'International Standard Recording Code for the release';
COMMENT ON COLUMN public.tracks.isrc_code IS 'International Standard Recording Code for individual track';
COMMENT ON COLUMN public.releases.moderation_notes IS 'Admin notes about moderation decisions';