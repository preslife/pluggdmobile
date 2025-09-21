-- Phase 1: Data Synchronization - Populate release_analytics from existing release_plays data

-- First, populate release_analytics with aggregated data from release_plays
INSERT INTO public.release_analytics (
  user_id,
  release_id,
  date_recorded,
  plays_count,
  downloads_count,
  revenue_amount,
  unique_listeners
)
SELECT 
  r.user_id,
  rp.release_id,
  DATE(rp.played_at) as date_recorded,
  COUNT(*) as plays_count,
  0 as downloads_count,
  0 as revenue_amount,
  COUNT(DISTINCT COALESCE(rp.user_id, rp.id)) as unique_listeners
FROM public.release_plays rp
JOIN public.releases r ON r.id = rp.release_id
GROUP BY r.user_id, rp.release_id, DATE(rp.played_at)
ON CONFLICT (user_id, release_id, date_recorded) 
DO UPDATE SET
  plays_count = EXCLUDED.plays_count,
  unique_listeners = EXCLUDED.unique_listeners,
  updated_at = now();

-- Update releases.total_plays with actual counts from release_plays
UPDATE public.releases 
SET total_plays = (
  SELECT COUNT(*) 
  FROM public.release_plays rp 
  WHERE rp.release_id = releases.id
)
WHERE id IN (
  SELECT DISTINCT release_id 
  FROM public.release_plays
);

-- Ensure releases without plays have total_plays = 0
UPDATE public.releases 
SET total_plays = 0 
WHERE total_plays IS NULL;