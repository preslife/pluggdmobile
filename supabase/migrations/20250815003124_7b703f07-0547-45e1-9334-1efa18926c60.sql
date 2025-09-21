-- Set D'yani as featured artist
UPDATE public.artists 
SET is_featured = true, updated_at = now()
WHERE name = 'D''yani';