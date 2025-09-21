-- Create storage buckets for audio files and beat artwork
INSERT INTO storage.buckets (id, name, public) VALUES ('audio-files', 'audio-files', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('beat-artwork', 'beat-artwork', true);

-- Create policies for audio files bucket (private - only accessible by owner)
CREATE POLICY "Users can upload their own audio files" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can view their own audio files" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own audio files" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own audio files" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'audio-files' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Create policies for beat artwork bucket (public - viewable by everyone)
CREATE POLICY "Beat artwork is publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'beat-artwork');

CREATE POLICY "Users can upload beat artwork" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'beat-artwork' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can update their own beat artwork" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'beat-artwork' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own beat artwork" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'beat-artwork' AND auth.uid()::text = (storage.foldername(name))[1]);