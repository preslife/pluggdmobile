-- Create creator profiles for remaining artists
INSERT INTO public.profiles (user_id, username, full_name, bio, user_type, location, created_at)
VALUES 
  (
    '8f2e4d5c-9a1b-4c3d-8e7f-1a2b3c4d5e6f',
    'elevatetoday',
    'Elevatetoday',
    'Dancehall artist and producer creating authentic Caribbean vibes',
    'artist',
    'Jamaica',
    now()
  ),
  (
    'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a',
    'akvr',
    'AKVR',
    'Contemporary R&B artist with a unique sound',
    'artist',
    'UK',
    now()
  );

-- Initialize user stats for the new creators
INSERT INTO public.user_stats (user_id, total_points, level, beats_uploaded, created_at)
VALUES 
  (
    '8f2e4d5c-9a1b-4c3d-8e7f-1a2b3c4d5e6f',
    50, -- 50 XP for 2 releases (25 each)
    1,
    2,
    now()
  ),
  (
    'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a',
    25, -- 25 XP for 1 release
    1,
    1,
    now()
  );

-- Link Elevatetoday's releases to their creator profile
UPDATE public.releases 
SET user_id = '8f2e4d5c-9a1b-4c3d-8e7f-1a2b3c4d5e6f'
WHERE artist = 'Elevatetoday' OR artist = 'ELEVATETODAY';

-- Link AKVR's releases to their creator profile  
UPDATE public.releases 
SET user_id = 'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a'
WHERE artist = 'AKVR' OR artist = 'akvr';