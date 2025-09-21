-- Phase 2: Future-Proof Analytics & Performance Optimizations

-- Add unique constraint to prevent duplicate analytics records
ALTER TABLE public.release_analytics 
ADD CONSTRAINT unique_analytics_per_day 
UNIQUE (user_id, release_id, date_recorded);

-- Add indexes for better performance on creator spotlight queries
CREATE INDEX IF NOT EXISTS idx_release_analytics_user_date 
ON public.release_analytics (user_id, date_recorded DESC);

CREATE INDEX IF NOT EXISTS idx_release_analytics_plays_count 
ON public.release_analytics (plays_count DESC) 
WHERE plays_count > 0;

-- Add function to validate analytics data consistency
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
    SELECT release_id, COUNT(*) as actual_plays
    FROM public.release_plays
    GROUP BY release_id
  ) play_counts ON r.id = play_counts.release_id
  LEFT JOIN (
    SELECT release_id, SUM(plays_count) as analytics_plays
    FROM public.release_analytics
    GROUP BY release_id
  ) analytics_counts ON r.id = analytics_counts.release_id
  WHERE (
    COALESCE(play_counts.actual_plays, 0) != COALESCE(analytics_counts.analytics_plays, 0)
    OR COALESCE(play_counts.actual_plays, 0) != COALESCE(r.total_plays, 0)
  );
END;
$$;