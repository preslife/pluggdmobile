-- Make the audio-files bucket public so course audio can be accessed
UPDATE storage.buckets 
SET public = true 
WHERE id = 'audio-files';

-- Create RLS policies for audio files access
CREATE POLICY "Allow public read access to audio files" ON storage.objects
FOR SELECT USING (bucket_id = 'audio-files');

CREATE POLICY "Allow authenticated users to upload audio files" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'audio-files' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own audio files" ON storage.objects
FOR UPDATE USING (bucket_id = 'audio-files' AND owner = auth.uid());

CREATE POLICY "Allow users to delete their own audio files" ON storage.objects
FOR DELETE USING (bucket_id = 'audio-files' AND owner = auth.uid());