-- Comprehensive migration to add all missing fields that weren't applied

-- Add missing credit fields to releases table
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS label TEXT,
ADD COLUMN IF NOT EXISTS executive_producer TEXT,
ADD COLUMN IF NOT EXISTS mixing_engineer TEXT,
ADD COLUMN IF NOT EXISTS mastering_engineer TEXT,
ADD COLUMN IF NOT EXISTS recording_engineer TEXT,
ADD COLUMN IF NOT EXISTS additional_credits JSONB,
ADD COLUMN IF NOT EXISTS primary_genre TEXT,
ADD COLUMN IF NOT EXISTS sub_genre TEXT,
ADD COLUMN IF NOT EXISTS mood_tags TEXT[],
ADD COLUMN IF NOT EXISTS language TEXT DEFAULT 'English',
ADD COLUMN IF NOT EXISTS featured_artists TEXT[],
ADD COLUMN IF NOT EXISTS owns_100_percent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS distribution_rights_confirmed BOOLEAN DEFAULT FALSE;

-- Add missing credit fields to tracks table
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS featured_artists TEXT[],
ADD COLUMN IF NOT EXISTS owns_100_percent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS distribution_rights_confirmed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS additional_credits JSONB;

-- Create collaborators table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  email TEXT,
  role TEXT NOT NULL CHECK (role IN ('featured_artist', 'vocalist', 'producer', 'songwriter', 'composer', 'label', 'manager', 'other')),
  role_description TEXT,
  is_external BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT collaborators_target_check CHECK (
    (release_id IS NOT NULL AND track_id IS NULL) OR 
    (release_id IS NULL AND track_id IS NOT NULL)
  )
);

-- Create splits table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.splits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  collaborator_id UUID REFERENCES public.collaborators(id) ON DELETE CASCADE,
  split_type TEXT NOT NULL CHECK (split_type IN ('master_recording', 'publishing', 'performance', 'mechanical')),
  percentage DECIMAL(5,2) NOT NULL CHECK (percentage >= 0 AND percentage <= 100),
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  CONSTRAINT splits_target_check CHECK (
    (release_id IS NOT NULL AND track_id IS NULL) OR 
    (release_id IS NULL AND track_id IS NOT NULL)
  )
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_releases_primary_genre ON public.releases(primary_genre);
CREATE INDEX IF NOT EXISTS idx_releases_sub_genre ON public.releases(sub_genre);
CREATE INDEX IF NOT EXISTS idx_releases_label ON public.releases(label);
CREATE INDEX IF NOT EXISTS idx_releases_mood_tags ON public.releases USING GIN(mood_tags);
CREATE INDEX IF NOT EXISTS idx_releases_language ON public.releases(language);
CREATE INDEX IF NOT EXISTS idx_releases_featured_artists ON public.releases USING GIN(featured_artists);

CREATE INDEX IF NOT EXISTS idx_collaborators_release_id ON public.collaborators(release_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_track_id ON public.collaborators(track_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON public.collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_role ON public.collaborators(role);

CREATE INDEX IF NOT EXISTS idx_splits_release_id ON public.splits(release_id);
CREATE INDEX IF NOT EXISTS idx_splits_track_id ON public.splits(track_id);
CREATE INDEX IF NOT EXISTS idx_splits_collaborator_id ON public.splits(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_splits_type ON public.splits(split_type);

-- Enable RLS on new tables
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.splits ENABLE ROW LEVEL SECURITY;

-- Add RLS policies for collaborators
CREATE POLICY "Users can view relevant collaborators" ON public.collaborators
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.releases r 
      WHERE r.id = collaborators.release_id AND r.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.tracks t 
      WHERE t.id = collaborators.track_id 
      AND EXISTS (
        SELECT 1 FROM public.releases r2 
        WHERE r2.id = t.release_id AND r2.user_id = auth.uid()
      )
    ) OR collaborators.user_id = auth.uid()
  );

CREATE POLICY "Users can manage collaborators for own releases" ON public.collaborators
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.releases r 
      WHERE r.id = collaborators.release_id AND r.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.tracks t 
      WHERE t.id = collaborators.track_id 
      AND EXISTS (
        SELECT 1 FROM public.releases r2 
        WHERE r2.id = t.release_id AND r2.user_id = auth.uid()
      )
    )
  );

-- Add RLS policies for splits
CREATE POLICY "Users can view relevant splits" ON public.splits
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.releases r 
      WHERE r.id = splits.release_id AND r.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.tracks t 
      WHERE t.id = splits.track_id 
      AND EXISTS (
        SELECT 1 FROM public.releases r2 
        WHERE r2.id = t.release_id AND r2.user_id = auth.uid()
      )
    ) OR EXISTS (
      SELECT 1 FROM public.collaborators c
      WHERE c.id = splits.collaborator_id AND c.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage splits for own releases" ON public.splits
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.releases r 
      WHERE r.id = splits.release_id AND r.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.tracks t 
      WHERE t.id = splits.track_id 
      AND EXISTS (
        SELECT 1 FROM public.releases r2 
        WHERE r2.id = t.release_id AND r2.user_id = auth.uid()
      )
    )
  );

-- Add triggers for updated_at on new tables
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_collaborators_updated_at 
  BEFORE UPDATE ON public.collaborators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_splits_updated_at 
  BEFORE UPDATE ON public.splits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();