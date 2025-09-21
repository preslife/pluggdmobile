-- Update contests bucket to ensure it's completely public
UPDATE storage.buckets 
SET public = true 
WHERE id = 'contests';

-- Remove any restrictive policies on contests bucket if they exist
DROP POLICY IF EXISTS "Public can view contest files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can upload contest files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can update contest files" ON storage.objects;
DROP POLICY IF EXISTS "Admins can delete contest files" ON storage.objects;