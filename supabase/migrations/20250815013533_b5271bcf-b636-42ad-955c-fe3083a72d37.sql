-- First, we need to create auth.users entries for the new artists
-- Since we can't directly insert into auth.users via migration, we'll use a different approach
-- We'll create the profiles with new UUIDs and handle the auth separately

-- Generate UUIDs for the new artists
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
VALUES 
  (
    '8f2e4d5c-9a1b-4c3d-8e7f-1a2b3c4d5e6f'::uuid,
    'elevatetoday@example.com',
    crypt('temp_password_123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Elevatetoday"}'::jsonb,
    false,
    'authenticated'
  ),
  (
    'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a'::uuid,
    'akvr@example.com',
    crypt('temp_password_123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "AKVR"}'::jsonb,
    false,
    'authenticated'
  );

-- Create creator profiles for the new artists
INSERT INTO public.profiles (user_id, username, full_name, bio, user_type, created_at)
VALUES 
  (
    '8f2e4d5c-9a1b-4c3d-8e7f-1a2b3c4d5e6f'::uuid,
    'elevatetoday',
    'Elevatetoday',
    'Dancehall artist and producer creating authentic Caribbean vibes',
    'artist',
    now()
  ),
  (
    'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a'::uuid,
    'akvr',
    'AKVR',
    'Contemporary R&B artist with a unique sound',
    'artist',
    now()
  );

-- Initialize user stats for the new creators
INSERT INTO public.user_stats (user_id, total_points, level, beats_uploaded, created_at)
VALUES 
  (
    '8f2e4d5c-9a1b-4c3d-8e7f-1a2b3c4d5e6f'::uuid,
    50, -- 50 XP for 2 releases (25 each)
    1,
    2,
    now()
  ),
  (
    'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a'::uuid,
    25, -- 25 XP for 1 release
    1,
    1,
    now()
  );

-- Link Elevatetoday's releases to their creator profile
UPDATE public.releases 
SET user_id = '8f2e4d5c-9a1b-4c3d-8e7f-1a2b3c4d5e6f'::uuid
WHERE artist = 'Elevatetoday' OR artist = 'ELEVATETODAY';

-- Link AKVR's releases to their creator profile  
UPDATE public.releases 
SET user_id = 'd1e2f3a4-5b6c-7d8e-9f0a-1b2c3d4e5f6a'::uuid
WHERE artist = 'AKVR' OR artist = 'akvr';