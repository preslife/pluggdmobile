-- Add preview_url field to releases table for 30-second audio previews
ALTER TABLE public.releases 
ADD COLUMN preview_url text;

-- Add comment to document the field purpose
COMMENT ON COLUMN public.releases.preview_url IS '30-second audio preview URL for the release';