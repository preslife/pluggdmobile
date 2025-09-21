-- Create tables for storing music analytics data
CREATE TABLE public.artist_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  platform TEXT NOT NULL, -- 'spotify', 'youtube', etc.
  artist_id TEXT NOT NULL, -- platform-specific artist ID
  artist_name TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id, platform, artist_id)
);

CREATE TABLE public.track_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_analytics_id UUID NOT NULL REFERENCES public.artist_analytics(id) ON DELETE CASCADE,
  track_id TEXT NOT NULL, -- platform-specific track ID
  track_name TEXT NOT NULL,
  streams INTEGER DEFAULT 0,
  likes INTEGER DEFAULT 0,
  comments INTEGER DEFAULT 0,
  shares INTEGER DEFAULT 0,
  views INTEGER DEFAULT 0, -- for YouTube
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artist_analytics_id, track_id, date_recorded)
);

CREATE TABLE public.audience_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  artist_analytics_id UUID NOT NULL REFERENCES public.artist_analytics(id) ON DELETE CASCADE,
  platform TEXT NOT NULL,
  age_range TEXT, -- '18-24', '25-34', etc.
  gender TEXT, -- 'male', 'female', 'other'
  country TEXT, -- country code
  city TEXT,
  percentage DECIMAL(5,2), -- percentage of total audience
  listener_count INTEGER DEFAULT 0,
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(artist_analytics_id, platform, age_range, gender, country, date_recorded)
);

-- Enable Row Level Security
ALTER TABLE public.artist_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.track_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audience_analytics ENABLE ROW LEVEL SECURITY;

-- Create policies for artist_analytics
CREATE POLICY "Users can view their own artist analytics" 
ON public.artist_analytics 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own artist analytics" 
ON public.artist_analytics 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own artist analytics" 
ON public.artist_analytics 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own artist analytics" 
ON public.artist_analytics 
FOR DELETE 
USING (auth.uid() = user_id);

-- Create policies for track_analytics
CREATE POLICY "Users can view their own track analytics" 
ON public.track_analytics 
FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM public.artist_analytics 
  WHERE id = track_analytics.artist_analytics_id
));

CREATE POLICY "Users can create their own track analytics" 
ON public.track_analytics 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.artist_analytics 
  WHERE id = track_analytics.artist_analytics_id
));

CREATE POLICY "Users can update their own track analytics" 
ON public.track_analytics 
FOR UPDATE 
USING (auth.uid() IN (
  SELECT user_id FROM public.artist_analytics 
  WHERE id = track_analytics.artist_analytics_id
));

CREATE POLICY "Users can delete their own track analytics" 
ON public.track_analytics 
FOR DELETE 
USING (auth.uid() IN (
  SELECT user_id FROM public.artist_analytics 
  WHERE id = track_analytics.artist_analytics_id
));

-- Create policies for audience_analytics
CREATE POLICY "Users can view their own audience analytics" 
ON public.audience_analytics 
FOR SELECT 
USING (auth.uid() IN (
  SELECT user_id FROM public.artist_analytics 
  WHERE id = audience_analytics.artist_analytics_id
));

CREATE POLICY "Users can create their own audience analytics" 
ON public.audience_analytics 
FOR INSERT 
WITH CHECK (auth.uid() IN (
  SELECT user_id FROM public.artist_analytics 
  WHERE id = audience_analytics.artist_analytics_id
));

CREATE POLICY "Users can update their own audience analytics" 
ON public.audience_analytics 
FOR UPDATE 
USING (auth.uid() IN (
  SELECT user_id FROM public.artist_analytics 
  WHERE id = audience_analytics.artist_analytics_id
));

CREATE POLICY "Users can delete their own audience analytics" 
ON public.audience_analytics 
FOR DELETE 
USING (auth.uid() IN (
  SELECT user_id FROM public.artist_analytics 
  WHERE id = audience_analytics.artist_analytics_id
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_artist_analytics_updated_at
BEFORE UPDATE ON public.artist_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_track_analytics_updated_at
BEFORE UPDATE ON public.track_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_audience_analytics_updated_at
BEFORE UPDATE ON public.audience_analytics
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();