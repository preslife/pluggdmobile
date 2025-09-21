-- Complete the artist separation plan - Fixed syntax

-- First, create auth user and profile for D'yani
INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at, created_at, updated_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, role)
VALUES 
  (
    'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d'::uuid,
    'dyani@example.com',
    crypt('temp_password_123', gen_salt('bf')),
    now(),
    now(),
    now(),
    '{"provider": "email", "providers": ["email"]}'::jsonb,
    '{"full_name": "Dyani"}'::jsonb,
    false,
    'authenticated'
  );

-- Create D'yani's creator profile
INSERT INTO public.profiles (user_id, username, full_name, bio, user_type, created_at)
VALUES 
  (
    'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d'::uuid,
    'dyani',
    'Dyani',
    'R&B artist with soulful vocals and contemporary sound',
    'artist',
    now()
  );

-- Initialize user stats for D'yani
INSERT INTO public.user_stats (user_id, total_points, level, beats_uploaded, created_at)
VALUES 
  (
    'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d'::uuid,
    25, -- 25 XP for 1 release
    1,
    1,
    now()
  );

-- Restore Lord Tokumbo profile (overwrite the D'yani info back to original)
UPDATE public.profiles 
SET 
  username = 'lord_tokumbo',
  full_name = 'Lord Tokumbo',
  bio = 'Music producer and artist',
  updated_at = now()
WHERE user_id = 'c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f'::uuid;

-- Move D'yani's release from Lord Tokumbo's account to D'yani's new profile
UPDATE public.releases 
SET user_id = 'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d'::uuid
WHERE artist LIKE '%yani%' OR artist LIKE '%YANI%';