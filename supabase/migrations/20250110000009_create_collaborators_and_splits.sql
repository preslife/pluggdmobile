-- Create collaborators and splits system for releases and tracks

-- Collaborators table for managing featured artists and other collaborators
CREATE TABLE IF NOT EXISTS public.collaborators (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE, -- If collaborator is a platform user
  name TEXT NOT NULL, -- Name for external collaborators or display name
  email TEXT, -- Contact email for external collaborators
  role TEXT NOT NULL CHECK (role IN ('featured_artist', 'vocalist', 'producer', 'songwriter', 'composer', 'label', 'manager', 'other')),
  role_description TEXT, -- Custom description for 'other' role
  is_external BOOLEAN DEFAULT TRUE, -- True if not a platform user
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure either release_id or track_id is set (but not both)
  CONSTRAINT collaborators_target_check CHECK (
    (release_id IS NOT NULL AND track_id IS NULL) OR 
    (release_id IS NULL AND track_id IS NOT NULL)
  )
);

-- Splits table for managing revenue/royalty splits
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
  
  -- Ensure either release_id or track_id is set (but not both)
  CONSTRAINT splits_target_check CHECK (
    (release_id IS NOT NULL AND track_id IS NULL) OR 
    (release_id IS NULL AND track_id IS NOT NULL)
  )
);

-- Add featured artists field to releases table
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS featured_artists TEXT[]; -- Array of featured artist names

-- Add ownership confirmation fields
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS owns_100_percent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS distribution_rights_confirmed BOOLEAN DEFAULT FALSE;

-- Add the same fields to tracks for track-specific ownership
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS featured_artists TEXT[],
ADD COLUMN IF NOT EXISTS owns_100_percent BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS distribution_rights_confirmed BOOLEAN DEFAULT FALSE;

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_collaborators_release_id ON public.collaborators(release_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_track_id ON public.collaborators(track_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_user_id ON public.collaborators(user_id);
CREATE INDEX IF NOT EXISTS idx_collaborators_role ON public.collaborators(role);

CREATE INDEX IF NOT EXISTS idx_splits_release_id ON public.splits(release_id);
CREATE INDEX IF NOT EXISTS idx_splits_track_id ON public.splits(track_id);
CREATE INDEX IF NOT EXISTS idx_splits_collaborator_id ON public.splits(collaborator_id);
CREATE INDEX IF NOT EXISTS idx_splits_type ON public.splits(split_type);

-- Add RLS policies
ALTER TABLE public.collaborators ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.splits ENABLE ROW LEVEL SECURITY;

-- Users can view collaborators for releases they own or are collaborators on
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

-- Users can manage collaborators for their own releases
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

-- Similar policies for splits
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

-- Add triggers for updated_at
CREATE TRIGGER update_collaborators_updated_at 
  BEFORE UPDATE ON public.collaborators
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_splits_updated_at 
  BEFORE UPDATE ON public.splits
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE public.collaborators IS 'Manages featured artists and collaborators for releases and tracks';
COMMENT ON TABLE public.splits IS 'Manages revenue/royalty splits between collaborators';
COMMENT ON COLUMN public.collaborators.role IS 'Type of collaboration: featured_artist, vocalist, producer, songwriter, composer, label, manager, other';
COMMENT ON COLUMN public.splits.split_type IS 'Type of split: master_recording, publishing, performance, mechanical';
COMMENT ON COLUMN public.releases.owns_100_percent IS 'User confirms they own 100% of the release';
COMMENT ON COLUMN public.releases.distribution_rights_confirmed IS 'User confirms they have distribution rights';