-- Add is_featured column to beats table
ALTER TABLE public.beats 
ADD COLUMN is_featured boolean NOT NULL DEFAULT false;

-- Create index for better performance when filtering featured beats
CREATE INDEX idx_beats_is_featured ON public.beats(is_featured) WHERE is_featured = true;