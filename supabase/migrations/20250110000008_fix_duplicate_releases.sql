-- Fix duplicate releases and clean up workflow
-- Remove duplicates and ensure clean single-table architecture

-- First, find and remove duplicate releases (keep the one with the latest updated_at)
DELETE FROM public.releases 
WHERE id IN (
  SELECT r1.id 
  FROM public.releases r1
  INNER JOIN public.releases r2 
  WHERE r1.title = r2.title 
    AND r1.user_id = r2.user_id 
    AND r1.id != r2.id 
    AND r1.updated_at < r2.updated_at
);

-- Update tracks that might be pointing to deleted release IDs
-- Point them to the remaining release with the same title and user
UPDATE public.tracks 
SET release_id = (
  SELECT r.id 
  FROM public.releases r 
  WHERE r.title = (
    SELECT rd.title 
    FROM public.release_drafts rd 
    WHERE rd.id = tracks.release_draft_id
  )
  AND r.user_id = (
    SELECT rd.user_id 
    FROM public.release_drafts rd 
    WHERE rd.id = tracks.release_draft_id
  )
  ORDER BY r.updated_at DESC
  LIMIT 1
),
release_draft_id = NULL
WHERE release_draft_id IS NOT NULL 
  AND release_id IS NULL;

-- Now safely drop the release_drafts table since all data is consolidated
DROP TABLE IF EXISTS public.release_drafts CASCADE;

-- Ensure notifications table exists for admin approval notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read BOOLEAN DEFAULT FALSE,
  related_id UUID,
  related_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS for notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Users can only see their own notifications
CREATE POLICY "Users can view own notifications" ON public.notifications
  FOR SELECT USING (auth.uid() = user_id);

-- Users can mark their own notifications as read
CREATE POLICY "Users can update own notifications" ON public.notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read ON public.notifications(read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON public.notifications(created_at);

-- Add trigger for updated_at on notifications
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_notifications_updated_at 
  BEFORE UPDATE ON public.notifications
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();