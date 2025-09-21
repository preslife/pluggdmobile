-- Fix the validation function column ambiguity issue
CREATE OR REPLACE FUNCTION public.validate_analytics_consistency()
RETURNS TABLE (
  release_id UUID,
  actual_plays BIGINT,
  analytics_plays BIGINT,
  total_plays_column INTEGER,
  is_consistent BOOLEAN
) 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    r.id as release_id,
    COALESCE(play_counts.actual_plays, 0) as actual_plays,
    COALESCE(analytics_counts.analytics_plays, 0) as analytics_plays,
    COALESCE(r.total_plays, 0) as total_plays_column,
    (
      COALESCE(play_counts.actual_plays, 0) = COALESCE(analytics_counts.analytics_plays, 0)
      AND COALESCE(play_counts.actual_plays, 0) = COALESCE(r.total_plays, 0)
    ) as is_consistent
  FROM public.releases r
  LEFT JOIN (
    SELECT rp.release_id, COUNT(*) as actual_plays
    FROM public.release_plays rp
    GROUP BY rp.release_id
  ) play_counts ON r.id = play_counts.release_id
  LEFT JOIN (
    SELECT ra.release_id, SUM(ra.plays_count) as analytics_plays
    FROM public.release_analytics ra
    GROUP BY ra.release_id
  ) analytics_counts ON r.id = analytics_counts.release_id
  WHERE (
    COALESCE(play_counts.actual_plays, 0) != COALESCE(analytics_counts.analytics_plays, 0)
    OR COALESCE(play_counts.actual_plays, 0) != COALESCE(r.total_plays, 0)
  );
END;
$$;