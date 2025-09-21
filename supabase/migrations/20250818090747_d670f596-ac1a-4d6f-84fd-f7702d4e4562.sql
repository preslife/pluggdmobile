-- Fix security definer view by recreating without SECURITY DEFINER
DROP VIEW IF EXISTS public.v_trending_content;

-- C1. Create simple trending content view without security definer
CREATE VIEW public.v_trending_content AS
SELECT 
  'beat' as content_type,
  b.id as content_id,
  b.title,
  b.user_id,
  b.created_at,
  GREATEST(0, 50 - EXTRACT(DAY FROM NOW() - b.created_at)) as total_score,
  ROW_NUMBER() OVER (ORDER BY b.created_at DESC) as rank
FROM beats b
WHERE b.is_published = true

UNION ALL

SELECT 
  'release' as content_type,
  r.id as content_id,
  r.title,
  r.user_id,
  r.created_at,
  GREATEST(0, 50 - EXTRACT(DAY FROM NOW() - r.created_at)) as total_score,
  ROW_NUMBER() OVER (ORDER BY r.created_at DESC) as rank
FROM releases r
ORDER BY total_score DESC, created_at DESC;