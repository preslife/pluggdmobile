-- Create tracks table for EP/Album releases
CREATE TABLE public.tracks (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    release_id UUID NOT NULL REFERENCES public.releases(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    track_number INTEGER NOT NULL,
    audio_url TEXT NOT NULL,
    duration INTEGER, -- duration in seconds
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE(release_id, track_number)
);

-- Enable RLS
ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for tracks
CREATE POLICY "Only admins can manage tracks" 
ON public.tracks 
FOR ALL 
USING (
    EXISTS (
        SELECT 1 FROM user_roles 
        WHERE user_id = auth.uid() AND role = 'admin'
    )
);

CREATE POLICY "Tracks are viewable by everyone" 
ON public.tracks 
FOR SELECT 
USING (true);

-- Create updated_at trigger for tracks
CREATE TRIGGER update_tracks_updated_at
    BEFORE UPDATE ON public.tracks
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();