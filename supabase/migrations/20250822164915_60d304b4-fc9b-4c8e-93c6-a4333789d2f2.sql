-- Enable RLS on storage.objects if not already enabled
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Allow public read access to contest files
CREATE POLICY "Public can view contest files"
ON storage.objects FOR SELECT
USING (bucket_id = 'contests');

-- Allow admins to upload contest files
CREATE POLICY "Admins can upload contest files"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'contests' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admins to update contest files
CREATE POLICY "Admins can update contest files"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'contests' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);

-- Allow admins to delete contest files
CREATE POLICY "Admins can delete contest files"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'contests' 
  AND EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'admin'
  )
);