-- =====================================================
-- GLOBAL PLAYER ANALYTICS AND STREAMING TABLES
-- Track play events, queue interactions, and streaming metrics
-- =====================================================

-- Play events for analytics
CREATE TABLE IF NOT EXISTS public.play_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  track_id text NOT NULL,
  track_type text NOT NULL CHECK (track_type IN ('beat', 'release', 'pack')),
  play_type text NOT NULL CHECK (play_type IN ('full', 'preview')),
  duration_played integer DEFAULT 0, -- seconds played
  completion_percentage decimal(5,2), -- 0.00 to 100.00
  source text, -- where the play originated (homepage, search, etc)
  session_id uuid, -- to group plays in same session
  device_type text,
  played_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

-- Streaming sessions for analytics
CREATE TABLE IF NOT EXISTS public.streaming_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  session_start timestamptz DEFAULT now(),
  session_end timestamptz,
  total_tracks_played integer DEFAULT 0,
  total_duration integer DEFAULT 0, -- total seconds streamed
  unique_tracks integer DEFAULT 0, -- count of unique tracks played
  device_info jsonb,
  quality_settings jsonb,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Playlist interactions
CREATE TABLE IF NOT EXISTS public.playlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  cover_image text,
  is_public boolean DEFAULT true,
  is_collaborative boolean DEFAULT false,
  is_followable boolean DEFAULT false,
  track_count integer DEFAULT 0,
  total_duration integer DEFAULT 0, -- seconds
  play_count integer DEFAULT 0,
  like_count integer DEFAULT 0,
  follower_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Playlist tracks
CREATE TABLE IF NOT EXISTS public.playlist_tracks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  track_id text NOT NULL,
  track_type text NOT NULL CHECK (track_type IN ('beat', 'release', 'pack')),
  position integer NOT NULL,
  added_by uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  added_at timestamptz DEFAULT now(),
  
  UNIQUE(playlist_id, position)
);

-- Playlist followers
CREATE TABLE IF NOT EXISTS public.playlist_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  followed_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, playlist_id)
);

-- User preferences for global player
CREATE TABLE IF NOT EXISTS public.player_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  volume decimal(3,2) DEFAULT 1.0 CHECK (volume >= 0 AND volume <= 1),
  quality text DEFAULT 'auto' CHECK (quality IN ('auto', 'high', 'medium', 'low')),
  crossfade_enabled boolean DEFAULT false,
  gapless_enabled boolean DEFAULT true,
  shuffle_enabled boolean DEFAULT false,
  repeat_mode text DEFAULT 'none' CHECK (repeat_mode IN ('none', 'one', 'all')),
  auto_queue_similar boolean DEFAULT true,
  show_explicit boolean DEFAULT true,
  normalize_volume boolean DEFAULT true,
  hardware_acceleration boolean DEFAULT true,
  cellular_streaming boolean DEFAULT true,
  cellular_downloads boolean DEFAULT false,
  cellular_quality text DEFAULT 'medium' CHECK (cellular_quality IN ('high', 'medium', 'low')),
  cache_limit_gb integer DEFAULT 5,
  auto_cache_liked boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id)
);

-- Track access control (for streaming permissions)
CREATE TABLE IF NOT EXISTS public.track_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  track_id text NOT NULL,
  track_type text NOT NULL CHECK (track_type IN ('beat', 'release', 'pack')),
  access_type text NOT NULL CHECK (access_type IN ('owned', 'licensed', 'preview_only', 'membership')),
  expires_at timestamptz, -- for temporary access
  granted_at timestamptz DEFAULT now(),
  
  UNIQUE(user_id, track_id, track_type)
);

-- =====================================================
-- INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_play_events_user_time ON public.play_events(user_id, played_at DESC);
CREATE INDEX idx_play_events_track ON public.play_events(track_id, track_type, played_at DESC);
CREATE INDEX idx_play_events_session ON public.play_events(session_id, played_at);

CREATE INDEX idx_streaming_sessions_user ON public.streaming_sessions(user_id, session_start DESC);
CREATE INDEX idx_streaming_sessions_active ON public.streaming_sessions(session_start DESC) WHERE session_end IS NULL;

CREATE INDEX idx_playlists_user_public ON public.playlists(user_id, is_public, updated_at DESC);
CREATE INDEX idx_playlists_public_popular ON public.playlists(is_public, follower_count DESC) WHERE is_public = true;

CREATE INDEX idx_playlist_tracks_playlist_position ON public.playlist_tracks(playlist_id, position);
CREATE INDEX idx_playlist_tracks_track ON public.playlist_tracks(track_id, track_type);

CREATE INDEX idx_playlist_follows_user ON public.playlist_follows(user_id, followed_at DESC);
CREATE INDEX idx_playlist_follows_playlist ON public.playlist_follows(playlist_id, followed_at DESC);

CREATE INDEX idx_track_access_user_track ON public.track_access(user_id, track_id, track_type);
CREATE INDEX idx_track_access_expires ON public.track_access(expires_at) WHERE expires_at IS NOT NULL;

-- =====================================================
-- ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.play_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.streaming_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.player_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_access ENABLE ROW LEVEL SECURITY;

-- Play events: users can only see their own events
CREATE POLICY "Users can manage own play events" ON public.play_events
  FOR ALL USING (auth.uid() = user_id);

-- Streaming sessions: users can only see their own sessions  
CREATE POLICY "Users can manage own streaming sessions" ON public.streaming_sessions
  FOR ALL USING (auth.uid() = user_id);

-- Playlists: users can see public playlists and manage their own
CREATE POLICY "Users can view public playlists and manage own" ON public.playlists
  FOR SELECT USING (is_public = true OR auth.uid() = user_id);

CREATE POLICY "Users can manage own playlists" ON public.playlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own playlists" ON public.playlists
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own playlists" ON public.playlists
  FOR DELETE USING (auth.uid() = user_id);

-- Playlist tracks: users can see tracks in public playlists and manage their own
CREATE POLICY "Users can view playlist tracks" ON public.playlist_tracks
  FOR SELECT USING (
    playlist_id IN (
      SELECT id FROM public.playlists 
      WHERE is_public = true OR user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own playlist tracks" ON public.playlist_tracks
  FOR ALL USING (
    playlist_id IN (
      SELECT id FROM public.playlists WHERE user_id = auth.uid()
    )
  );

-- Playlist follows: users can manage their own follows
CREATE POLICY "Users can manage own playlist follows" ON public.playlist_follows
  FOR ALL USING (auth.uid() = user_id);

-- Player preferences: users can only access their own preferences
CREATE POLICY "Users can manage own player preferences" ON public.player_preferences
  FOR ALL USING (auth.uid() = user_id);

-- Track access: users can only see their own access permissions
CREATE POLICY "Users can view own track access" ON public.track_access
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to update playlist stats when tracks are added/removed
CREATE OR REPLACE FUNCTION update_playlist_stats()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.playlists
    SET 
      track_count = track_count + 1,
      updated_at = now()
    WHERE id = NEW.playlist_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.playlists
    SET 
      track_count = track_count - 1,
      updated_at = now()
    WHERE id = OLD.playlist_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlist_track_stats_trigger
  AFTER INSERT OR DELETE ON public.playlist_tracks
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_stats();

-- Function to update playlist follower count
CREATE OR REPLACE FUNCTION update_playlist_follower_count()
RETURNS trigger AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.playlists
    SET follower_count = follower_count + 1
    WHERE id = NEW.playlist_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.playlists
    SET follower_count = follower_count - 1
    WHERE id = OLD.playlist_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER playlist_follow_count_trigger
  AFTER INSERT OR DELETE ON public.playlist_follows
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_follower_count();

-- Function to clean up expired track access
CREATE OR REPLACE FUNCTION cleanup_expired_track_access()
RETURNS void AS $$
BEGIN
  DELETE FROM public.track_access
  WHERE expires_at IS NOT NULL AND expires_at < now();
END;
$$ LANGUAGE plpgsql;

-- Updated_at triggers
CREATE TRIGGER update_streaming_sessions_updated_at 
  BEFORE UPDATE ON public.streaming_sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_playlists_updated_at 
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER update_player_preferences_updated_at 
  BEFORE UPDATE ON public.player_preferences
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- =====================================================
-- VIEWS FOR ANALYTICS
-- =====================================================

-- Popular tracks view
CREATE OR REPLACE VIEW popular_tracks AS
SELECT 
  track_id,
  track_type,
  COUNT(*) as play_count,
  COUNT(DISTINCT user_id) as unique_listeners,
  AVG(completion_percentage) as avg_completion,
  MAX(played_at) as last_played
FROM public.play_events
WHERE played_at >= now() - interval '30 days'
GROUP BY track_id, track_type
ORDER BY play_count DESC;

-- User listening stats view
CREATE OR REPLACE VIEW user_listening_stats AS
SELECT 
  user_id,
  COUNT(*) as total_plays,
  COUNT(DISTINCT track_id) as unique_tracks,
  SUM(duration_played) as total_time_listened,
  AVG(completion_percentage) as avg_completion,
  MAX(played_at) as last_active
FROM public.play_events
WHERE played_at >= now() - interval '30 days'
GROUP BY user_id;