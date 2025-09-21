-- Add new columns to playlists table for enhanced functionality
ALTER TABLE public.playlists 
ADD COLUMN IF NOT EXISTS tags text[] DEFAULT '{}',
ADD COLUMN IF NOT EXISTS visibility text DEFAULT 'private' CHECK (visibility IN ('public', 'unlisted', 'private')),
ADD COLUMN IF NOT EXISTS collaborative boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS cover_art_url text;

-- Create playlist_collaborators table for collaborative playlists
CREATE TABLE IF NOT EXISTS public.playlist_collaborators (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  playlist_id uuid NOT NULL REFERENCES public.playlists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'editor' CHECK (role IN ('owner', 'editor', 'viewer')),
  invited_at timestamp with time zone DEFAULT now(),
  accepted_at timestamp with time zone,
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on playlist_collaborators
ALTER TABLE public.playlist_collaborators ENABLE ROW LEVEL SECURITY;

-- Create policies for playlist_collaborators
CREATE POLICY "Users can view collaborators for their playlists" ON public.playlist_collaborators
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.playlists 
    WHERE playlists.id = playlist_collaborators.playlist_id 
    AND playlists.user_id = auth.uid()
  ) OR playlist_collaborators.user_id = auth.uid()
);

CREATE POLICY "Playlist owners can manage collaborators" ON public.playlist_collaborators
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.playlists 
    WHERE playlists.id = playlist_collaborators.playlist_id 
    AND playlists.user_id = auth.uid()
  )
);

-- Add support for beats in playlist_items (currently only supports releases)
ALTER TABLE public.playlist_items 
ADD COLUMN IF NOT EXISTS beat_id uuid,
ADD COLUMN IF NOT EXISTS position integer DEFAULT 0,
ADD CONSTRAINT playlist_items_content_check CHECK (
  (release_id IS NOT NULL AND beat_id IS NULL) OR 
  (release_id IS NULL AND beat_id IS NOT NULL)
);

-- Update playlist visibility in existing RLS policies
DROP POLICY IF EXISTS "Users can view public playlists or their own" ON public.playlists;

CREATE POLICY "Users can view playlists based on visibility" ON public.playlists
FOR SELECT USING (
  visibility = 'public' OR 
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.playlist_collaborators pc
    WHERE pc.playlist_id = playlists.id AND pc.user_id = auth.uid()
  )
);