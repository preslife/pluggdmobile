-- For existing NULL user_id records, we'll use a different approach
-- Instead of a fake user, we'll modify the edge function to allow NULL user_id for anonymous plays
-- and update analytics to handle this case

-- First, let's see if there are any NULL user_id records
UPDATE public.release_plays 
SET user_id = NULL 
WHERE user_id IS NULL;

-- Update analytics to handle anonymous plays properly
-- We'll aggregate anonymous plays under a special case in analytics
-- For now, let's ensure the analytics table can handle the current data structure