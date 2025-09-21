-- Enhanced Phase 2 Database Schema
-- Create new tables for comprehensive feature set

-- Fan Club Tiers for Premium Content
CREATE TABLE IF NOT EXISTS public.fan_club_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  tier_name TEXT NOT NULL,
  price_cents INTEGER NOT NULL DEFAULT 0,
  description TEXT,
  benefits JSONB DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Release Reviews and Ratings
CREATE TABLE IF NOT EXISTS public.release_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
  review_text TEXT,
  is_featured BOOLEAN DEFAULT false,
  helpful_votes INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(release_id, user_id)
);

-- User Generated Playlists
CREATE TABLE IF NOT EXISTS public.user_playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  is_collaborative BOOLEAN DEFAULT false,
  cover_image_url TEXT,
  total_duration INTEGER DEFAULT 0,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Playlist Items
CREATE TABLE IF NOT EXISTS public.playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL,
  release_id UUID,
  track_id UUID,
  position INTEGER NOT NULL,
  added_by_user_id UUID NOT NULL,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Distribution Status Tracking
CREATE TABLE IF NOT EXISTS public.distribution_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  distribution_id TEXT,
  submitted_at TIMESTAMPTZ,
  approved_at TIMESTAMPTZ,
  live_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Audio Processing Jobs
CREATE TABLE IF NOT EXISTS public.audio_processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID,
  track_id UUID,
  job_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  input_url TEXT NOT NULL,
  output_url TEXT,
  processing_data JSONB DEFAULT '{}'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Social Shares Tracking
CREATE TABLE IF NOT EXISTS public.social_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  release_id UUID,
  platform TEXT NOT NULL,
  share_url TEXT,
  engagement_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Offline Downloads Management
CREATE TABLE IF NOT EXISTS public.offline_downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  release_id UUID,
  track_id UUID,
  download_quality TEXT DEFAULT 'standard',
  file_size INTEGER,
  download_url TEXT,
  expires_at TIMESTAMPTZ,
  status TEXT DEFAULT 'pending',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Fan Club Content mapping
CREATE TABLE IF NOT EXISTS public.fan_club_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL,
  release_id UUID,
  tier_id UUID,
  content_type TEXT NOT NULL DEFAULT 'release',
  access_level TEXT NOT NULL DEFAULT 'premium',
  scheduled_release TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Track records for releases
CREATE TABLE IF NOT EXISTS public.release_tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID NOT NULL,
  title TEXT NOT NULL,
  track_number INTEGER NOT NULL,
  duration INTEGER,
  audio_url TEXT,
  waveform_data JSONB,
  isrc_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.fan_club_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.distribution_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audio_processing_jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offline_downloads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_club_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_tracks ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Fan Club Tiers
CREATE POLICY "Creators can manage their fan club tiers" ON public.fan_club_tiers
  FOR ALL USING (creator_id = auth.uid());

CREATE POLICY "Fan club tiers are viewable by everyone" ON public.fan_club_tiers
  FOR SELECT USING (is_active = true);

-- RLS Policies for Release Reviews
CREATE POLICY "Users can create their own reviews" ON public.release_reviews
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews" ON public.release_reviews
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "Reviews are viewable by everyone" ON public.release_reviews
  FOR SELECT USING (true);

-- RLS Policies for User Playlists
CREATE POLICY "Users can manage their own playlists" ON public.user_playlists
  FOR ALL USING (user_id = auth.uid());

CREATE POLICY "Public playlists are viewable by everyone" ON public.user_playlists
  FOR SELECT USING (is_public = true OR user_id = auth.uid());

-- RLS Policies for Playlist Items
CREATE POLICY "Users can manage items in their playlists" ON public.playlist_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_playlists 
      WHERE id = playlist_items.playlist_id 
      AND user_id = auth.uid()
    )
  );

CREATE POLICY "Playlist items viewable if playlist is accessible" ON public.playlist_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.user_playlists 
      WHERE id = playlist_items.playlist_id 
      AND (is_public = true OR user_id = auth.uid())
    )
  );

-- RLS Policies for Distribution Status
CREATE POLICY "Users can view distribution for their releases" ON public.distribution_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.releases r
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE r.id = distribution_status.release_id
    )
  );

CREATE POLICY "System can manage distribution status" ON public.distribution_status
  FOR ALL USING (true);

-- RLS Policies for Audio Processing Jobs
CREATE POLICY "Users can view processing jobs for their content" ON public.audio_processing_jobs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.releases r
      JOIN public.profiles p ON p.user_id = auth.uid()
      WHERE r.id = audio_processing_jobs.release_id
    )
  );

CREATE POLICY "System can manage audio processing jobs" ON public.audio_processing_jobs
  FOR ALL USING (true);

-- RLS Policies for Social Shares
CREATE POLICY "Users can create their own shares" ON public.social_shares
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can view their own shares" ON public.social_shares
  FOR SELECT USING (user_id = auth.uid());

-- RLS Policies for Offline Downloads
CREATE POLICY "Users can manage their own downloads" ON public.offline_downloads
  FOR ALL USING (user_id = auth.uid());

-- RLS Policies for Fan Club Content
CREATE POLICY "Creators can manage their fan club content" ON public.fan_club_content
  FOR ALL USING (creator_id = auth.uid());

CREATE POLICY "Fan club content viewable by subscribers" ON public.fan_club_content
  FOR SELECT USING (
    creator_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM public.fan_subscriptions fs
      WHERE fs.creator_id = fan_club_content.creator_id
      AND fs.fan_id = auth.uid()
      AND fs.status = 'active'
    )
  );

-- RLS Policies for Release Tracks
CREATE POLICY "Release tracks viewable by everyone" ON public.release_tracks
  FOR SELECT USING (true);

CREATE POLICY "Admins can manage release tracks" ON public.release_tracks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'admin'
    )
  );

-- Add updated_at triggers for new tables
CREATE TRIGGER update_fan_club_tiers_updated_at
  BEFORE UPDATE ON public.fan_club_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_release_reviews_updated_at
  BEFORE UPDATE ON public.release_reviews
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_playlists_updated_at
  BEFORE UPDATE ON public.user_playlists
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_distribution_status_updated_at
  BEFORE UPDATE ON public.distribution_status
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_release_tracks_updated_at
  BEFORE UPDATE ON public.release_tracks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();