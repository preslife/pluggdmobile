-- Create beats/tracks table for marketplace
CREATE TABLE public.beats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  genre TEXT,
  bpm INTEGER,
  key TEXT,
  price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
  audio_url TEXT,
  image_url TEXT,
  tags TEXT[],
  is_published BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.beats ENABLE ROW LEVEL SECURITY;

-- Create policies for beats
CREATE POLICY "Published beats are viewable by everyone" 
ON public.beats 
FOR SELECT 
USING (is_published = true);

CREATE POLICY "Users can view their own beats" 
ON public.beats 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own beats" 
ON public.beats 
FOR INSERT 
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own beats" 
ON public.beats 
FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own beats" 
ON public.beats 
FOR DELETE 
USING (auth.uid() = user_id);

-- Add trigger for beats timestamps
CREATE TRIGGER update_beats_updated_at
BEFORE UPDATE ON public.beats
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create purchases table
CREATE TABLE public.purchases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  beat_id UUID NOT NULL REFERENCES public.beats(id) ON DELETE CASCADE,
  amount DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(buyer_id, beat_id)
);

-- Enable RLS
ALTER TABLE public.purchases ENABLE ROW LEVEL SECURITY;

-- Create policies for purchases
CREATE POLICY "Users can view their own purchases" 
ON public.purchases 
FOR SELECT 
USING (auth.uid() = buyer_id);

CREATE POLICY "Users can create their own purchases" 
ON public.purchases 
FOR INSERT 
WITH CHECK (auth.uid() = buyer_id);