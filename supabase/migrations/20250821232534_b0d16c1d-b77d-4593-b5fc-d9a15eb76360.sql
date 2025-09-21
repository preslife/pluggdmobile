-- Update existing NULL user_id records in release_plays to use system user
UPDATE public.release_plays 
SET user_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE user_id IS NULL;

-- Update existing NULL user_id records in release_analytics to use system user
UPDATE public.release_analytics 
SET user_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE user_id IS NULL;