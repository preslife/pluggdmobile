-- Create storage bucket for artist images
INSERT INTO storage.buckets (id, name, public) VALUES ('artist-images', 'artist-images', true);

-- Create storage policies for artist images
CREATE POLICY "Artist images are publicly accessible" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'artist-images');

CREATE POLICY "Admins can upload artist images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'artist-images' AND EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

CREATE POLICY "Admins can update artist images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'artist-images' AND EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

CREATE POLICY "Admins can delete artist images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'artist-images' AND EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));