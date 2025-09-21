-- Phase 2 Database Schema Extensions for Pluggd

-- Extend releases table with monetization and scheduling fields
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS price NUMERIC DEFAULT 0;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS pay_what_you_want BOOLEAN DEFAULT false;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS minimum_price NUMERIC DEFAULT 0;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS scheduled_publish_date TIMESTAMPTZ;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'auto_approved';
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS is_premium_content BOOLEAN DEFAULT false;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS total_plays INTEGER DEFAULT 0;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS total_revenue NUMERIC DEFAULT 0;

-- Create tracks table for individual tracks within releases
CREATE TABLE IF NOT EXISTS public.tracks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  duration INTEGER, -- in seconds
  track_number INTEGER NOT NULL,
  file_url TEXT,
  waveform_data JSONB,
  play_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create release_purchases table
CREATE TABLE IF NOT EXISTS public.release_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  amount_paid NUMERIC NOT NULL,
  stripe_payment_intent_id TEXT,
  purchased_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  download_url TEXT,
  download_expires_at TIMESTAMPTZ,
  UNIQUE(user_id, release_id)
);

-- Create artist_tips table
CREATE TABLE IF NOT EXISTS public.artist_tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  artist_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id UUID REFERENCES public.releases(id) ON DELETE SET NULL,
  amount NUMERIC NOT NULL,
  message TEXT,
  stripe_payment_intent_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create fan_club_content table for exclusive releases
CREATE TABLE IF NOT EXISTS public.fan_club_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  subscription_tier_required TEXT NOT NULL DEFAULT 'basic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(release_id)
);

-- Create release_plays table for streaming analytics
CREATE TABLE IF NOT EXISTS public.release_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  play_duration INTEGER, -- seconds played
  country_code TEXT,
  device_type TEXT
);

-- Create release_comments table (extends existing comments for releases)
CREATE TABLE IF NOT EXISTS public.release_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.release_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_club_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for tracks
CREATE POLICY "Tracks are viewable by everyone" ON public.tracks
FOR SELECT USING (true);

CREATE POLICY "Release owners can manage tracks" ON public.tracks
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.releases r 
    WHERE r.id = tracks.release_id 
    AND r.artist = (SELECT username FROM public.profiles WHERE user_id = auth.uid())
  )
);

-- RLS Policies for release_purchases
CREATE POLICY "Users can view their own purchases" ON public.release_purchases
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own purchases" ON public.release_purchases
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all purchases" ON public.release_purchases
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for artist_tips
CREATE POLICY "Users can view tips they sent or received" ON public.artist_tips
FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = artist_id);

CREATE POLICY "Users can create tips" ON public.artist_tips
FOR INSERT WITH CHECK (auth.uid() = fan_id);

-- RLS Policies for fan_club_content
CREATE POLICY "Creators can manage their fan club content" ON public.fan_club_content
FOR ALL USING (auth.uid() = creator_id);

CREATE POLICY "Fan club subscribers can view exclusive content" ON public.fan_club_content
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.fan_subscriptions fs
    WHERE fs.creator_id = fan_club_content.creator_id
    AND fs.fan_id = auth.uid()
    AND fs.status = 'active'
  )
);

-- RLS Policies for release_plays
CREATE POLICY "Anyone can create play records" ON public.release_plays
FOR INSERT WITH CHECK (true);

CREATE POLICY "Artists can view plays for their releases" ON public.release_plays
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.releases r 
    WHERE r.id = release_plays.release_id 
    AND r.artist = (SELECT username FROM public.profiles WHERE user_id = auth.uid())
  )
);

CREATE POLICY "Admins can view all play records" ON public.release_plays
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- RLS Policies for release_comments
CREATE POLICY "Release comments are viewable by everyone" ON public.release_comments
FOR SELECT USING (true);

CREATE POLICY "Users can create release comments" ON public.release_comments
FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own release comments" ON public.release_comments
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own release comments" ON public.release_comments
FOR DELETE USING (auth.uid() = user_id);

-- Create updated_at trigger for tracks
CREATE TRIGGER update_tracks_updated_at
BEFORE UPDATE ON public.tracks
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create updated_at trigger for release_comments
CREATE TRIGGER update_release_comments_updated_at
BEFORE UPDATE ON public.release_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Function to check if user has purchased a release
CREATE OR REPLACE FUNCTION public.has_purchased_release(p_user_id UUID, p_release_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.release_purchases
    WHERE user_id = p_user_id AND release_id = p_release_id
  );
END;
$$;

-- Function to check if release is accessible to user
CREATE OR REPLACE FUNCTION public.can_access_release(p_user_id UUID, p_release_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  release_price NUMERIC;
  is_premium BOOLEAN;
  has_subscription BOOLEAN;
BEGIN
  -- Get release info
  SELECT price, is_premium_content INTO release_price, is_premium
  FROM public.releases WHERE id = p_release_id;
  
  -- If it's free and not premium, everyone can access
  IF release_price = 0 AND NOT is_premium THEN
    RETURN true;
  END IF;
  
  -- If user purchased it
  IF public.has_purchased_release(p_user_id, p_release_id) THEN
    RETURN true;
  END IF;
  
  -- If it's premium content, check fan subscription
  IF is_premium THEN
    SELECT EXISTS (
      SELECT 1 FROM public.fan_subscriptions fs
      JOIN public.fan_club_content fcc ON fcc.creator_id = fs.creator_id
      WHERE fcc.release_id = p_release_id
      AND fs.fan_id = p_user_id
      AND fs.status = 'active'
    ) INTO has_subscription;
    
    RETURN has_subscription;
  END IF;
  
  RETURN false;
END;
$$;