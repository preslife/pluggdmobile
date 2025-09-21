-- T1 & T6: Add required fields to profiles and releases tables

-- Add is_creator field to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS is_creator BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS username TEXT UNIQUE;

-- Add moderation and scheduling fields to releases table  
ALTER TABLE public.releases
ADD COLUMN IF NOT EXISTS approved BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'live' CHECK (status IN ('draft', 'scheduled', 'live')),
ADD COLUMN IF NOT EXISTS spotlight BOOLEAN DEFAULT false;

-- Create index for username lookups
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);

-- Create simple playlists table for T4
CREATE TABLE IF NOT EXISTS public.playlists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on playlists
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;

-- Create playlist RLS policies
CREATE POLICY "Users can view public playlists or their own" ON public.playlists
FOR SELECT USING (is_public = true OR user_id = auth.uid());

CREATE POLICY "Users can manage their own playlists" ON public.playlists
FOR ALL USING (user_id = auth.uid());

-- Create playlist_items table
CREATE TABLE IF NOT EXISTS public.playlist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  playlist_id UUID NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(playlist_id, release_id)
);

-- Enable RLS on playlist_items
ALTER TABLE public.playlist_items ENABLE ROW LEVEL SECURITY;

-- Create playlist_items RLS policies
CREATE POLICY "Users can view playlist items for accessible playlists" ON public.playlist_items
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.playlists p 
    WHERE p.id = playlist_items.playlist_id 
    AND (p.is_public = true OR p.user_id = auth.uid())
  )
);

CREATE POLICY "Users can manage items in their own playlists" ON public.playlist_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.playlists p 
    WHERE p.id = playlist_items.playlist_id 
    AND p.user_id = auth.uid()
  )
);

-- Add trigger for auto-updating playlists updated_at
CREATE OR REPLACE FUNCTION update_playlist_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_playlists_updated_at
  BEFORE UPDATE ON public.playlists
  FOR EACH ROW
  EXECUTE FUNCTION update_playlist_updated_at();