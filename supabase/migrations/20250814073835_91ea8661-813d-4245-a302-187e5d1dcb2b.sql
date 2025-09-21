-- Phase 2 Database Schema Extensions for Pluggd (Fixed)

-- Only add new columns to releases table if they don't exist
DO $$
BEGIN
  -- Add pricing fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'releases' AND column_name = 'price') THEN
    ALTER TABLE public.releases ADD COLUMN price NUMERIC DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'releases' AND column_name = 'pay_what_you_want') THEN
    ALTER TABLE public.releases ADD COLUMN pay_what_you_want BOOLEAN DEFAULT false;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'releases' AND column_name = 'minimum_price') THEN
    ALTER TABLE public.releases ADD COLUMN minimum_price NUMERIC DEFAULT 0;
  END IF;
  
  -- Add scheduling fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'releases' AND column_name = 'scheduled_publish_date') THEN
    ALTER TABLE public.releases ADD COLUMN scheduled_publish_date TIMESTAMPTZ;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'releases' AND column_name = 'approval_status') THEN
    ALTER TABLE public.releases ADD COLUMN approval_status TEXT DEFAULT 'auto_approved';
  END IF;
  
  -- Add premium content fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'releases' AND column_name = 'is_premium_content') THEN
    ALTER TABLE public.releases ADD COLUMN is_premium_content BOOLEAN DEFAULT false;
  END IF;
  
  -- Add analytics fields
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'releases' AND column_name = 'total_plays') THEN
    ALTER TABLE public.releases ADD COLUMN total_plays INTEGER DEFAULT 0;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'releases' AND column_name = 'total_revenue') THEN
    ALTER TABLE public.releases ADD COLUMN total_revenue NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Create new tables only if they don't exist
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

CREATE TABLE IF NOT EXISTS public.fan_club_content (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  subscription_tier_required TEXT NOT NULL DEFAULT 'basic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(release_id)
);

CREATE TABLE IF NOT EXISTS public.release_plays (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  track_id UUID REFERENCES public.tracks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  played_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  play_duration INTEGER,
  country_code TEXT,
  device_type TEXT
);

CREATE TABLE IF NOT EXISTS public.release_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  parent_comment_id UUID REFERENCES public.release_comments(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.release_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.artist_tips ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fan_club_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_plays ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.release_comments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies only if they don't exist
DO $$
BEGIN
  -- RLS Policies for release_purchases
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'release_purchases' AND policyname = 'Users can view their own purchases') THEN
    CREATE POLICY "Users can view their own purchases" ON public.release_purchases
    FOR SELECT USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'release_purchases' AND policyname = 'Users can create their own purchases') THEN
    CREATE POLICY "Users can create their own purchases" ON public.release_purchases
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  -- RLS Policies for artist_tips
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_tips' AND policyname = 'Users can view tips they sent or received') THEN
    CREATE POLICY "Users can view tips they sent or received" ON public.artist_tips
    FOR SELECT USING (auth.uid() = fan_id OR auth.uid() = artist_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'artist_tips' AND policyname = 'Users can create tips') THEN
    CREATE POLICY "Users can create tips" ON public.artist_tips
    FOR INSERT WITH CHECK (auth.uid() = fan_id);
  END IF;

  -- RLS Policies for fan_club_content
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'fan_club_content' AND policyname = 'Creators can manage their fan club content') THEN
    CREATE POLICY "Creators can manage their fan club content" ON public.fan_club_content
    FOR ALL USING (auth.uid() = creator_id);
  END IF;

  -- RLS Policies for release_plays
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'release_plays' AND policyname = 'Anyone can create play records') THEN
    CREATE POLICY "Anyone can create play records" ON public.release_plays
    FOR INSERT WITH CHECK (true);
  END IF;

  -- RLS Policies for release_comments
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'release_comments' AND policyname = 'Release comments are viewable by everyone') THEN
    CREATE POLICY "Release comments are viewable by everyone" ON public.release_comments
    FOR SELECT USING (true);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'release_comments' AND policyname = 'Users can create release comments') THEN
    CREATE POLICY "Users can create release comments" ON public.release_comments
    FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'release_comments' AND policyname = 'Users can update their own release comments') THEN
    CREATE POLICY "Users can update their own release comments" ON public.release_comments
    FOR UPDATE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'release_comments' AND policyname = 'Users can delete their own release comments') THEN
    CREATE POLICY "Users can delete their own release comments" ON public.release_comments
    FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create functions
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
  SELECT COALESCE(price, 0), COALESCE(is_premium_content, false) 
  INTO release_price, is_premium
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