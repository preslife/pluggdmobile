-- Add release_type column to releases table
ALTER TABLE public.releases 
ADD COLUMN release_type text DEFAULT 'Single' NOT NULL;