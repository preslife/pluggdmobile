-- Create FAV nicknames system for Pluggd platform
-- Allows users to select and customize their favorite nicknames for personalization

-- Create table for storing user's favorite nicknames
CREATE TABLE public.user_fav_nicknames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  nickname TEXT NOT NULL,
  custom_icon TEXT DEFAULT NULL, -- Icon/emoji for the nickname
  display_order INTEGER NOT NULL DEFAULT 0, -- Order for display (0=primary, 1=secondary, 2=tertiary)
  is_active BOOLEAN DEFAULT true, -- Whether this nickname is currently in use
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Constraints
  CONSTRAINT user_fav_nicknames_display_order_check CHECK (display_order >= 0 AND display_order <= 2),
  CONSTRAINT user_fav_nicknames_unique_user_order UNIQUE (user_id, display_order),
  CONSTRAINT user_fav_nicknames_nickname_length CHECK (char_length(nickname) >= 2 AND char_length(nickname) <= 50)
);

-- Enable RLS on user_fav_nicknames
ALTER TABLE public.user_fav_nicknames ENABLE ROW LEVEL SECURITY;

-- RLS policies for user_fav_nicknames
CREATE POLICY "Users can view their own FAV nicknames"
ON public.user_fav_nicknames
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own FAV nicknames"
ON public.user_fav_nicknames
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own FAV nicknames"
ON public.user_fav_nicknames
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own FAV nicknames"
ON public.user_fav_nicknames
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_user_fav_nicknames_updated_at
BEFORE UPDATE ON public.user_fav_nicknames
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add first_run_completed field to profiles table to track onboarding
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS fav_nicknames_setup_completed BOOLEAN DEFAULT false;

-- Create function to get user's active FAV nicknames
CREATE OR REPLACE FUNCTION public.get_user_fav_nicknames(p_user_id UUID)
RETURNS TABLE (
  nickname TEXT,
  custom_icon TEXT,
  display_order INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ufn.nickname,
    ufn.custom_icon,
    ufn.display_order
  FROM public.user_fav_nicknames ufn
  WHERE ufn.user_id = p_user_id 
    AND ufn.is_active = true
  ORDER BY ufn.display_order ASC;
END;
$function$;

-- Create function to set user's FAV nicknames (max 3)
CREATE OR REPLACE FUNCTION public.set_user_fav_nicknames(
  p_user_id UUID,
  p_nicknames JSONB
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  nickname_record JSONB;
  i INTEGER := 0;
BEGIN
  -- Validate input
  IF jsonb_array_length(p_nicknames) > 3 THEN
    RAISE EXCEPTION 'Maximum of 3 FAV nicknames allowed';
  END IF;

  -- Check if user exists
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = p_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Deactivate existing nicknames
  UPDATE public.user_fav_nicknames 
  SET is_active = false, updated_at = now()
  WHERE user_id = p_user_id;

  -- Insert new nicknames
  FOR nickname_record IN SELECT * FROM jsonb_array_elements(p_nicknames)
  LOOP
    INSERT INTO public.user_fav_nicknames (
      user_id, 
      nickname, 
      custom_icon, 
      display_order, 
      is_active
    )
    VALUES (
      p_user_id,
      nickname_record->>'nickname',
      COALESCE(nickname_record->>'custom_icon', '🎵'),
      i,
      true
    )
    ON CONFLICT (user_id, display_order) 
    DO UPDATE SET
      nickname = EXCLUDED.nickname,
      custom_icon = EXCLUDED.custom_icon,
      is_active = true,
      updated_at = now();
      
    i := i + 1;
  END LOOP;

  -- Mark FAV nicknames setup as completed
  UPDATE public.profiles 
  SET fav_nicknames_setup_completed = true, updated_at = now()
  WHERE user_id = p_user_id;

  RETURN true;
END;
$function$;

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_user_fav_nicknames_user_id_active ON public.user_fav_nicknames(user_id, is_active);
CREATE INDEX IF NOT EXISTS idx_user_fav_nicknames_display_order ON public.user_fav_nicknames(user_id, display_order);

-- Insert some default/suggested nicknames for the system
-- This will be used in the first-run experience
CREATE TABLE public.suggested_fav_nicknames (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nickname TEXT NOT NULL UNIQUE,
  category TEXT DEFAULT 'general',
  icon TEXT DEFAULT '🎵',
  popularity_score INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on suggested nicknames (read-only for all users)
ALTER TABLE public.suggested_fav_nicknames ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Everyone can view suggested FAV nicknames"
ON public.suggested_fav_nicknames
FOR SELECT
USING (true);

-- Insert popular nickname suggestions
INSERT INTO public.suggested_fav_nicknames (nickname, category, icon, popularity_score) VALUES
  ('Beatmaker', 'producer', '🎛️', 100),
  ('Hitmaker', 'producer', '🔥', 95),
  ('Sound Architect', 'producer', '🏗️', 90),
  ('Melody Master', 'producer', '🎼', 88),
  ('Bass King', 'producer', '👑', 85),
  ('Rhythm God', 'producer', '⚡', 83),
  ('Studio Legend', 'producer', '🏆', 80),
  ('Beat Boss', 'producer', '💼', 78),
  ('Track God', 'producer', '🎯', 75),
  ('Mix Master', 'producer', '🎚️', 72),
  ('Vibes Creator', 'artist', '✨', 90),
  ('Flow King', 'artist', '🌊', 88),
  ('Voice of Gold', 'artist', '🥇', 85),
  ('Lyric Genius', 'artist', '🧠', 83),
  ('Melody Queen', 'artist', '👸', 80),
  ('Harmony Hero', 'artist', '🦸', 78),
  ('Chart Topper', 'artist', '📈', 75),
  ('Star Power', 'artist', '⭐', 72),
  ('Dream Chaser', 'artist', '🌟', 70),
  ('Music Lover', 'general', '❤️', 95),
  ('Creative Soul', 'general', '💫', 90),
  ('Sound Explorer', 'general', '🧭', 85),
  ('Beat Head', 'general', '🎧', 80),
  ('Music Addict', 'general', '💊', 78),
  ('Frequency Rider', 'general', '🌈', 75),
  ('Audio Alchemist', 'general', '🧪', 72),
  ('Sonic Warrior', 'general', '⚔️', 70);