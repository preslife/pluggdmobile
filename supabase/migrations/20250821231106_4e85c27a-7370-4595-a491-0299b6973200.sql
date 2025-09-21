-- Create system user for anonymous plays tracking
-- Insert a special system user to represent anonymous listeners
INSERT INTO auth.users (
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  confirmation_token,
  raw_user_meta_data,
  is_super_admin
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'authenticated',
  'authenticated',
  'anonymous@system.internal',
  crypt('system_user_no_login', gen_salt('bf')),
  now(),
  now(),
  now(),
  '',
  '{"full_name": "Anonymous Listener", "username": "anonymous_listener"}'::jsonb,
  false
);

-- Create corresponding profile for the system user
INSERT INTO public.profiles (
  user_id,
  full_name,
  username,
  user_type,
  is_creator,
  onboarding_completed
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  'Anonymous Listener',
  'anonymous_listener',
  'listener',
  false,
  true
);

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
  longest_streak
) VALUES (
  '00000000-0000-0000-0000-000000000001'::uuid,
  0,
  1,
  0,
  0,
  0,
  0,
  0,
  0
);

-- Update existing NULL user_id records in release_plays to use system user
UPDATE public.release_plays 
SET user_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE user_id IS NULL;

-- Update existing NULL user_id records in release_analytics to use system user
UPDATE public.release_analytics 
SET user_id = '00000000-0000-0000-0000-000000000001'::uuid 
WHERE user_id IS NULL;