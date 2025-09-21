-- Add comprehensive credits and genre fields to releases table

-- Add credits fields
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS label TEXT,
ADD COLUMN IF NOT EXISTS producer TEXT,
ADD COLUMN IF NOT EXISTS executive_producer TEXT,
ADD COLUMN IF NOT EXISTS songwriter TEXT,
ADD COLUMN IF NOT EXISTS composer TEXT,
ADD COLUMN IF NOT EXISTS mixing_engineer TEXT,
ADD COLUMN IF NOT EXISTS mastering_engineer TEXT,
ADD COLUMN IF NOT EXISTS recording_engineer TEXT,
ADD COLUMN IF NOT EXISTS additional_credits JSONB; -- For flexible additional credits

-- Add more detailed genre classification
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS primary_genre TEXT,
ADD COLUMN IF NOT EXISTS sub_genre TEXT,
ADD COLUMN IF NOT EXISTS mood_tags TEXT[],
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English';

-- Update existing releases to use primary_genre for the current genre field
UPDATE public.releases 
SET primary_genre = genre 
WHERE primary_genre IS NULL AND genre IS NOT NULL;

-- Add the same credits fields to tracks table for track-specific credits
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS producer TEXT,
ADD COLUMN IF NOT EXISTS songwriter TEXT,
ADD COLUMN IF NOT EXISTS composer TEXT,
ADD COLUMN IF NOT EXISTS additional_credits JSONB;

-- Add indexes for searching by genre and credits
CREATE INDEX IF NOT EXISTS idx_releases_primary_genre ON public.releases(primary_genre);
CREATE INDEX IF NOT EXISTS idx_releases_sub_genre ON public.releases(sub_genre);
CREATE INDEX IF NOT EXISTS idx_releases_label ON public.releases(label);
CREATE INDEX IF NOT EXISTS idx_releases_producer ON public.releases(producer);
CREATE INDEX IF NOT EXISTS idx_releases_mood_tags ON public.releases USING GIN(mood_tags);
CREATE INDEX IF NOT EXISTS idx_releases_language ON public.releases(language);

CREATE INDEX IF NOT EXISTS idx_tracks_producer ON public.tracks(producer);
CREATE INDEX IF NOT EXISTS idx_tracks_songwriter ON public.tracks(songwriter);

-- Add comments for documentation
COMMENT ON COLUMN public.releases.label IS 'Record label name';
COMMENT ON COLUMN public.releases.producer IS 'Primary producer(s) of the release';
COMMENT ON COLUMN public.releases.executive_producer IS 'Executive producer overseeing the project';
COMMENT ON COLUMN public.releases.songwriter IS 'Primary songwriter(s)';
COMMENT ON COLUMN public.releases.composer IS 'Music composer(s)';
COMMENT ON COLUMN public.releases.mixing_engineer IS 'Audio mixing engineer';
COMMENT ON COLUMN public.releases.mastering_engineer IS 'Audio mastering engineer';
COMMENT ON COLUMN public.releases.recording_engineer IS 'Recording engineer';
COMMENT ON COLUMN public.releases.additional_credits IS 'Additional credits in JSON format';
COMMENT ON COLUMN public.releases.primary_genre IS 'Main genre category';
COMMENT ON COLUMN public.releases.sub_genre IS 'Specific sub-genre';
COMMENT ON COLUMN public.releases.mood_tags IS 'Array of mood/style tags';
COMMENT ON COLUMN public.releases.language IS 'Primary language of the release';