-- Create genre taxonomy system
CREATE TABLE public.genre_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  parent_id UUID REFERENCES public.genre_categories(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.genre_categories ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Genre categories are viewable by everyone" 
ON public.genre_categories FOR SELECT USING (true);

CREATE POLICY "Only admins can manage genre categories" 
ON public.genre_categories FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- Insert comprehensive genre taxonomy
INSERT INTO public.genre_categories (name, description) VALUES
('Hip Hop', 'Hip hop and rap music'),
('Electronic', 'Electronic dance music and derivatives'),
('R&B', 'Rhythm and blues, soul, and contemporary R&B'),
('Pop', 'Popular music and mainstream sounds'),
('Rock', 'Rock and alternative music'),
('Jazz', 'Jazz and fusion'),
('Classical', 'Classical and orchestral music'),
('World', 'World music and ethnic sounds'),
('Experimental', 'Experimental and avant-garde music'),
('Ambient', 'Ambient and atmospheric music');

-- Insert sub-genres for Hip Hop
INSERT INTO public.genre_categories (name, description, parent_id) 
SELECT 'Trap', 'Trap music with heavy 808s and hi-hats', id FROM public.genre_categories WHERE name = 'Hip Hop';

INSERT INTO public.genre_categories (name, description, parent_id) 
SELECT 'Boom Bap', 'Classic hip hop with boom bap drums', id FROM public.genre_categories WHERE name = 'Hip Hop';

INSERT INTO public.genre_categories (name, description, parent_id) 
SELECT 'Drill', 'Drill music style', id FROM public.genre_categories WHERE name = 'Hip Hop';

INSERT INTO public.genre_categories (name, description, parent_id) 
SELECT 'Lo-Fi Hip Hop', 'Lo-fi and chill hip hop beats', id FROM public.genre_categories WHERE name = 'Hip Hop';

-- Insert sub-genres for Electronic
INSERT INTO public.genre_categories (name, description, parent_id) 
SELECT 'House', 'House music and derivatives', id FROM public.genre_categories WHERE name = 'Electronic';

INSERT INTO public.genre_categories (name, description, parent_id) 
SELECT 'Techno', 'Techno and industrial electronic', id FROM public.genre_categories WHERE name = 'Electronic';

INSERT INTO public.genre_categories (name, description, parent_id) 
SELECT 'Dubstep', 'Dubstep and bass music', id FROM public.genre_categories WHERE name = 'Electronic';

INSERT INTO public.genre_categories (name, description, parent_id) 
SELECT 'Synthwave', 'Synthwave and retrowave', id FROM public.genre_categories WHERE name = 'Electronic';

-- Create audio file management table
CREATE TABLE public.audio_files (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  file_name TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  file_type TEXT NOT NULL,
  storage_path TEXT NOT NULL,
  stream_url TEXT,
  duration_seconds INTEGER,
  sample_rate INTEGER,
  bit_rate INTEGER,
  waveform_data JSONB,
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')),
  upload_session_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.audio_files ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own audio files" 
ON public.audio_files FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own audio files" 
ON public.audio_files FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own audio files" 
ON public.audio_files FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own audio files" 
ON public.audio_files FOR DELETE 
USING (auth.uid() = user_id);

-- Create file quota tracking table
CREATE TABLE public.user_file_quotas (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  total_storage_used BIGINT DEFAULT 0,
  monthly_uploads_count INTEGER DEFAULT 0,
  monthly_uploads_size BIGINT DEFAULT 0,
  last_reset_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_file_quotas ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own file quotas" 
ON public.user_file_quotas FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage file quotas" 
ON public.user_file_quotas FOR ALL 
USING (true);

-- Create function to get user file limits based on subscription tier
CREATE OR REPLACE FUNCTION public.get_user_file_limits(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  user_tier subscription_tier;
  file_limits JSONB;
BEGIN
  -- Get user tier
  SELECT tier INTO user_tier
  FROM public.user_subscriptions
  WHERE user_id = p_user_id
  AND status = 'active';
  
  user_tier := COALESCE(user_tier, 'free');
  
  file_limits := CASE user_tier
    WHEN 'free' THEN jsonb_build_object(
      'max_file_size_mb', 10,
      'monthly_upload_limit_count', 10,
      'monthly_upload_limit_mb', 100,
      'total_storage_limit_mb', 500,
      'allowed_formats', '["mp3", "wav"]'::jsonb
    )
    WHEN 'creator' THEN jsonb_build_object(
      'max_file_size_mb', 50,
      'monthly_upload_limit_count', 100,
      'monthly_upload_limit_mb', 1000,
      'total_storage_limit_mb', 5000,
      'allowed_formats', '["mp3", "wav", "flac", "aiff"]'::jsonb
    )
    WHEN 'pro' THEN jsonb_build_object(
      'max_file_size_mb', 100,
      'monthly_upload_limit_count', -1,
      'monthly_upload_limit_mb', -1,
      'total_storage_limit_mb', -1,
      'allowed_formats', '["mp3", "wav", "flac", "aiff", "m4a"]'::jsonb
    )
    ELSE jsonb_build_object(
      'max_file_size_mb', 10,
      'monthly_upload_limit_count', 10,
      'monthly_upload_limit_mb', 100,
      'total_storage_limit_mb', 500,
      'allowed_formats', '["mp3", "wav"]'::jsonb
    )
  END;
  
  RETURN file_limits;
END;
$function$;

-- Create function to update file quotas
CREATE OR REPLACE FUNCTION public.update_file_quotas(p_user_id UUID, p_file_size BIGINT)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- Reset monthly counters if needed
  UPDATE public.user_file_quotas 
  SET 
    monthly_uploads_count = CASE 
      WHEN last_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN 1 
      ELSE monthly_uploads_count + 1 
    END,
    monthly_uploads_size = CASE 
      WHEN last_reset_date < DATE_TRUNC('month', CURRENT_DATE) THEN p_file_size 
      ELSE monthly_uploads_size + p_file_size 
    END,
    total_storage_used = total_storage_used + p_file_size,
    last_reset_date = CURRENT_DATE,
    updated_at = now()
  WHERE user_id = p_user_id;
  
  -- Create record if it doesn't exist
  INSERT INTO public.user_file_quotas (user_id, total_storage_used, monthly_uploads_count, monthly_uploads_size)
  VALUES (p_user_id, p_file_size, 1, p_file_size)
  ON CONFLICT (user_id) DO NOTHING;
END;
$function$;