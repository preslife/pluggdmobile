-- Fix infinite recursion in playlist RLS policies by creating security definer functions

-- Create security definer function to get user's playlist IDs
CREATE OR REPLACE FUNCTION public.get_user_playlist_ids(p_user_id uuid)
RETURNS TABLE(playlist_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT id FROM public.playlists WHERE user_id = p_user_id;
END;
$$;

-- Create security definer function to check if user is playlist collaborator
CREATE OR REPLACE FUNCTION public.is_playlist_collaborator(p_playlist_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  is_collaborator boolean := false;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.playlist_collaborators 
    WHERE playlist_id = p_playlist_id AND user_id = p_user_id
  ) INTO is_collaborator;
  
  RETURN is_collaborator;
END;
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can view playlists based on visibility" ON public.playlists;
DROP POLICY IF EXISTS "Users can manage their own playlists" ON public.playlists;

-- Create new playlist policies without circular references
CREATE POLICY "Users can manage their own playlists" 
ON public.playlists 
FOR ALL 
USING (user_id = auth.uid());

CREATE POLICY "Users can view playlists based on visibility" 
ON public.playlists 
FOR SELECT 
USING (
  visibility = 'public' OR 
  user_id = auth.uid() OR 
  public.is_playlist_collaborator(id, auth.uid())
);

-- Drop existing playlist collaborators policies if they exist
DROP POLICY IF EXISTS "Users can view collaborations they're part of" ON public.playlist_collaborators;
DROP POLICY IF EXISTS "Playlist owners can manage collaborators" ON public.playlist_collaborators;
DROP POLICY IF EXISTS "Users can leave collaborations" ON public.playlist_collaborators;

-- Create playlist collaborators policies
CREATE POLICY "Users can view collaborations they're part of" 
ON public.playlist_collaborators 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  playlist_id IN (SELECT playlist_id FROM public.get_user_playlist_ids(auth.uid()))
);

CREATE POLICY "Playlist owners can manage collaborators" 
ON public.playlist_collaborators 
FOR ALL 
USING (
  playlist_id IN (SELECT playlist_id FROM public.get_user_playlist_ids(auth.uid()))
);

CREATE POLICY "Users can accept collaboration invitations" 
ON public.playlist_collaborators 
FOR UPDATE 
USING (user_id = auth.uid());

-- Ensure RLS is enabled on both tables
ALTER TABLE public.playlists ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.playlist_collaborators ENABLE ROW LEVEL SECURITY;