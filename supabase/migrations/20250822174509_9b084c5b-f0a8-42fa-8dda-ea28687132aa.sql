-- Update view_hub_contests to use actual cover_image_url instead of NULL
CREATE OR REPLACE VIEW public.view_hub_contests AS
SELECT 
  c.id,
  c.title,
  c.cover_image_url AS cover,  -- Use actual cover_image_url instead of NULL
  COALESCE((
    SELECT count(*)::integer 
    FROM contest_submissions s 
    WHERE s.contest_id = c.id
  ), 0) AS entrants,
  c.end_date AS ends_at,
  (slugify(c.title) || '-' || substr(c.id::text, 1, 6)) AS slug
FROM contests c
WHERE c.status = ANY (ARRAY['upcoming'::text, 'active'::text, 'voting'::text]);