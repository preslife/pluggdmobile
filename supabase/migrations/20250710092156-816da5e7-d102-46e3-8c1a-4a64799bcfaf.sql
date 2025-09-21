-- Revert the audio-files bucket back to private
UPDATE storage.buckets 
SET public = false 
WHERE id = 'audio-files';

-- Remove the policies we just created for audio-files
DROP POLICY IF EXISTS "Allow public read access to audio files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload audio files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to update their own audio files" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own audio files" ON storage.objects;

-- Create a new public bucket specifically for course audio
INSERT INTO storage.buckets (id, name, public) 
VALUES ('course-audio', 'course-audio', true);

-- Create policies for the course-audio bucket
CREATE POLICY "Allow public read access to course audio" ON storage.objects
FOR SELECT USING (bucket_id = 'course-audio');

CREATE POLICY "Allow authenticated users to upload course audio" ON storage.objects
FOR INSERT WITH CHECK (bucket_id = 'course-audio' AND auth.role() = 'authenticated');

CREATE POLICY "Allow users to update their own course audio" ON storage.objects
FOR UPDATE USING (bucket_id = 'course-audio' AND owner = auth.uid());

CREATE POLICY "Allow users to delete their own course audio" ON storage.objects
FOR DELETE USING (bucket_id = 'course-audio' AND owner = auth.uid());