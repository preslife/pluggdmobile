-- Fix playlist_items table schema to allow nullable release_id
-- This fixes the constraint violation when adding beats to playlists

-- Make release_id nullable to allow playlist items with only beat_id
ALTER TABLE public.playlist_items ALTER COLUMN release_id DROP NOT NULL;

-- Add constraint to ensure at least one ID is provided (either beat_id or release_id)
ALTER TABLE public.playlist_items ADD CONSTRAINT playlist_items_track_check 
CHECK (beat_id IS NOT NULL OR release_id IS NOT NULL);