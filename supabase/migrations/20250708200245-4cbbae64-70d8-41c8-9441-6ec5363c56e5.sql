-- Fix foreign key relationship for profiles in activity feed
ALTER TABLE public.activity_feed 
DROP CONSTRAINT IF EXISTS activity_feed_actor_id_fkey;

-- Add proper constraint that references the profiles table indirectly
-- We'll handle the join manually in queries since actor_id references auth.users