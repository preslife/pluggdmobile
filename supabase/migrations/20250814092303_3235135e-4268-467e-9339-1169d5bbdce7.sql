-- Fix search path for all functions that don't have it set
-- Update get_release_analytics function
DROP FUNCTION IF EXISTS public.get_release_analytics(UUID, UUID, INTEGER);
CREATE OR REPLACE FUNCTION public.get_release_analytics(p_user_id UUID, p_release_id UUID DEFAULT NULL, p_days INTEGER DEFAULT 30)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  analytics_data JSONB;
  start_date DATE;
BEGIN
  start_date := CURRENT_DATE - INTERVAL '1 day' * p_days;
  
  WITH daily_stats AS (
    SELECT 
      date_recorded,
      SUM(plays_count) as plays,
      SUM(downloads_count) as downloads,
      SUM(revenue_amount) as revenue
    FROM public.release_analytics 
    WHERE user_id = p_user_id
    AND date_recorded >= start_date
    AND (p_release_id IS NULL OR release_id = p_release_id)
    GROUP BY date_recorded
    ORDER BY date_recorded
  ),
  totals AS (
    SELECT 
      COALESCE(SUM(plays_count), 0) as total_plays,
      COALESCE(SUM(downloads_count), 0) as total_downloads,
      COALESCE(SUM(revenue_amount), 0) as total_revenue,
      COALESCE(SUM(unique_listeners), 0) as unique_listeners
    FROM public.release_analytics 
    WHERE user_id = p_user_id
    AND date_recorded >= start_date
    AND (p_release_id IS NULL OR release_id = p_release_id)
  )
  SELECT jsonb_build_object(
    'total_plays', totals.total_plays,
    'total_downloads', totals.total_downloads,
    'total_revenue', totals.total_revenue,
    'unique_listeners', totals.unique_listeners,
    'daily_data', COALESCE(
      jsonb_agg(
        jsonb_build_object(
          'date', daily_stats.date_recorded,
          'plays', daily_stats.plays,
          'downloads', daily_stats.downloads,
          'revenue', daily_stats.revenue
        ) ORDER BY daily_stats.date_recorded
      ) FILTER (WHERE daily_stats.date_recorded IS NOT NULL), 
      '[]'::jsonb
    )
  ) INTO analytics_data
  FROM totals
  LEFT JOIN daily_stats ON true
  GROUP BY totals.total_plays, totals.total_downloads, totals.total_revenue, totals.unique_listeners;
  
  RETURN analytics_data;
END;
$function$;

-- Fix update_challenge_vote_counts function
DROP FUNCTION IF EXISTS public.update_challenge_vote_counts();
CREATE OR REPLACE FUNCTION public.update_challenge_vote_counts()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE public.challenge_submissions 
    SET votes_count = votes_count + 1 
    WHERE id = NEW.submission_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE public.challenge_submissions 
    SET votes_count = votes_count - 1 
    WHERE id = OLD.submission_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;