-- Just update the mapping and move releases since profiles exist

-- Restore Lord Tokumbo profile
UPDATE public.profiles 
SET 
  username = 'lord_tokumbo',
  full_name = 'Lord Tokumbo',
  bio = 'Music producer and artist',
  updated_at = now()
WHERE user_id = 'c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f'::uuid;

-- Move D'yani's release to the existing D'yani profile
UPDATE public.releases 
SET user_id = 'a1b2c3d4-5e6f-7a8b-9c0d-1e2f3a4b5c6d'::uuid
WHERE artist LIKE '%yani%' OR artist LIKE '%YANI%';