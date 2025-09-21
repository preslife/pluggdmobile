-- Create tracks table for storing individual tracks of releases
CREATE TABLE IF NOT EXISTS public.tracks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  release_draft_id UUID REFERENCES public.release_drafts(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  track_number INTEGER NOT NULL,
  audio_url TEXT,
  duration INTEGER, -- in seconds
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure at least one of release_id or release_draft_id is set
  CONSTRAINT tracks_release_check CHECK (
    (release_id IS NOT NULL AND release_draft_id IS NULL) OR 
    (release_id IS NULL AND release_draft_id IS NOT NULL)
  )
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracks_release_id ON public.tracks(release_id);
CREATE INDEX IF NOT EXISTS idx_tracks_release_draft_id ON public.tracks(release_draft_id);
CREATE INDEX IF NOT EXISTS idx_tracks_track_number ON public.tracks(track_number);

-- Add RLS policies
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Users can view tracks for releases they own
CREATE POLICY "Users can view own release tracks" ON public.tracks
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.releases r 
      WHERE r.id = tracks.release_id AND r.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.release_drafts rd 
      WHERE rd.id = tracks.release_draft_id AND rd.user_id = auth.uid()
    )
  );

-- Users can insert tracks for their own releases
CREATE POLICY "Users can insert tracks for own releases" ON public.tracks
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.releases r 
      WHERE r.id = tracks.release_id AND r.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.release_drafts rd 
      WHERE rd.id = tracks.release_draft_id AND rd.user_id = auth.uid()
    )
  );

-- Users can update tracks for their own releases
CREATE POLICY "Users can update tracks for own releases" ON public.tracks
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.releases r 
      WHERE r.id = tracks.release_id AND r.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.release_drafts rd 
      WHERE rd.id = tracks.release_draft_id AND rd.user_id = auth.uid()
    )
  );

-- Users can delete tracks for their own releases
CREATE POLICY "Users can delete tracks for own releases" ON public.tracks
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.releases r 
      WHERE r.id = tracks.release_id AND r.user_id = auth.uid()
    ) OR EXISTS (
      SELECT 1 FROM public.release_drafts rd 
      WHERE rd.id = tracks.release_draft_id AND rd.user_id = auth.uid()
    )
  );

-- Add trigger for updated_at
CREATE TRIGGER update_tracks_updated_at 
    BEFORE UPDATE ON public.tracks
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Comment on table
COMMENT ON TABLE public.tracks IS 'Individual tracks for releases and release drafts';