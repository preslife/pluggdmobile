-- Create RLS policies for events storage bucket (copying from working beat-artwork pattern)

-- Allow authenticated users to upload event images to their own folder
CREATE POLICY "Users can upload event images" 
ON storage.objects FOR INSERT 
WITH CHECK (
  bucket_id = 'events' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow public read access to event images (since events bucket is public)
CREATE POLICY "Event images are publicly accessible" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'events');

-- Allow users to update their own event images
CREATE POLICY "Users can update their own event images" 
ON storage.objects FOR UPDATE 
USING (
  bucket_id = 'events' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- Allow users to delete their own event images
CREATE POLICY "Users can delete their own event images" 
ON storage.objects FOR DELETE 
USING (
  bucket_id = 'events' 
  AND auth.uid()::text = (storage.foldername(name))[1]
);