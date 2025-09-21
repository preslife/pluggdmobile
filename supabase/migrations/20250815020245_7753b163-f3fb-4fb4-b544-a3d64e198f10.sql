-- Restore Lord Tokumbo profile and attribute all releases to him
UPDATE public.profiles 
SET 
  username = 'lord_tokumbo',
  full_name = 'Lord Tokumbo',
  bio = 'Music producer and artist',
  updated_at = now()
WHERE user_id = 'c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f'::uuid;

-- Move ALL artist releases to Lord Tokumbo
UPDATE public.releases 
SET user_id = 'c6e4bc7e-cf3d-4eac-87f3-bc3d72c6ff5f'::uuid
WHERE artist ILIKE '%yani%' 
   OR artist ILIKE '%elevatetoday%' 
   OR artist ILIKE '%akvr%';