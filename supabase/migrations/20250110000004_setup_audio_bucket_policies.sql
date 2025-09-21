-- Create storage bucket for audio files if it doesn't exist
INSERT INTO storage.buckets (id, name, public) 
VALUES ('release-audio', 'release-audio', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Allow public read access to audio files
CREATE POLICY IF NOT EXISTS "Public read access for audio files" 
ON storage.objects FOR SELECT 
USING (bucket_id = 'release-audio');

-- Allow authenticated users to upload audio files
CREATE POLICY IF NOT EXISTS "Authenticated users can upload audio files" 
ON storage.objects FOR INSERT 
WITH CHECK (bucket_id = 'release-audio' AND auth.role() = 'authenticated');

-- Allow users to update their own audio files
CREATE POLICY IF NOT EXISTS "Users can update their own audio files" 
ON storage.objects FOR UPDATE 
USING (bucket_id = 'release-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Allow users to delete their own audio files
CREATE POLICY IF NOT EXISTS "Users can delete their own audio files" 
ON storage.objects FOR DELETE 
USING (bucket_id = 'release-audio' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Comment on the bucket purpose
COMMENT ON TABLE storage.buckets IS 'Storage buckets for file uploads including audio, artwork, and other media';