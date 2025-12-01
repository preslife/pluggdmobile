-- Update Lord Tokumbo's profile to represent D'yani for demo purposes
UPDATE public.profiles 
SET 
  full_name = 'D''yani',
  username = 'dyani',
  bio = 'Rising R&B artist creating soulful music that connects hearts and minds. Known for powerful vocals and emotionally resonant songwriting.',
  avatar_url = '/uploads/695d06f7-2a64-4b9c-9cd1-34dd538fc6d9.png',
  user_type = 'artist',
  updated_at = now()
WHERE user_id = 'c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f';

-- Initialize user stats if not exists
INSERT INTO public.user_stats (
  user_id,
  total_points,
  level,
  beats_uploaded,
  beats_sold,
  collaborations_completed,
  created_at,
  updated_at
) VALUES (
  'c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f',
  350,
  4,
  3,
  1,
  2,
  now(),
  now()
)
ON CONFLICT (user_id) DO UPDATE SET
  total_points = EXCLUDED.total_points,
  level = EXCLUDED.level,
  beats_uploaded = EXCLUDED.beats_uploaded,
  beats_sold = EXCLUDED.beats_sold,
  collaborations_completed = EXCLUDED.collaborations_completed,
  updated_at = now();