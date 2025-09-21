-- Create system user in profiles table for anonymous plays tracking
INSERT INTO public.profiles (
  user_id,
  full_name,
  username,
  user_type,
  is_creator,
  onboarding_completed,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Anonymous Listener',
  'anonymous_listener',
  'artist',
  false,
  true,
  now(),
  now()
) ON CONFLICT (user_id) DO NOTHING;

-- Create user stats record for the system user
INSERT INTO public.user_stats (
  user_id,
  total_points,
  level,
  beats_uploaded,
  beats_sold,
  beats_purchased,
  collaborations_completed,
  current_streak,
  longest_streak,
  created_at,
  updated_at
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0,
  now(),
  now()
) ON CONFLICT (user_id) DO NOTHING;

-- Temporarily disable foreign key constraint for release_plays if it exists
ALTER TABLE public.release_plays DROP CONSTRAINT IF EXISTS release_plays_user_id_fkey;

-- Update existing NULL user_id records in release_plays to use system user
UPDATE public.release_plays 
SET user_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE user_id IS NULL;

-- Update existing NULL user_id records in release_analytics to use system user  
UPDATE public.release_analytics 
SET user_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE user_id IS NULL;

-- Re-enable foreign key constraint to profiles instead of auth.users
ALTER TABLE public.release_plays 
ADD CONSTRAINT release_plays_user_id_fkey 
FOREIGN KEY (user_id) REFERENCES public.profiles(user_id) ON DELETE CASCADE;