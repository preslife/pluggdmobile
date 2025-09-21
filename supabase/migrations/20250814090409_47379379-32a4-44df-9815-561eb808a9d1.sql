-- Create commission bidding system
CREATE TABLE public.commission_bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  commission_request_id UUID REFERENCES public.commission_requests(id) ON DELETE CASCADE,
  producer_id UUID NOT NULL,
  bid_amount_cents INTEGER NOT NULL,
  estimated_delivery_days INTEGER,
  proposal_message TEXT,
  portfolio_samples TEXT[], -- URLs to sample work
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected', 'withdrawn')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on commission_bids
ALTER TABLE public.commission_bids ENABLE ROW LEVEL SECURITY;

-- RLS policies for commission_bids
CREATE POLICY "Commission bids are viewable by involved parties"
ON public.commission_bids
FOR SELECT
USING (
  producer_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.commission_requests cr 
    WHERE cr.id = commission_bids.commission_request_id 
    AND cr.requester_id = auth.uid()
  )
);

CREATE POLICY "Producers can create bids"
ON public.commission_bids
FOR INSERT
WITH CHECK (auth.uid() = producer_id);

CREATE POLICY "Producers can update their own bids"
ON public.commission_bids
FOR UPDATE
USING (auth.uid() = producer_id);

CREATE POLICY "Requesters can update bid status"
ON public.commission_bids
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.commission_requests cr 
    WHERE cr.id = commission_bids.commission_request_id 
    AND cr.requester_id = auth.uid()
  )
);

-- Create real analytics tracking tables
CREATE TABLE public.release_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  release_id UUID REFERENCES public.releases(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  date_recorded DATE NOT NULL DEFAULT CURRENT_DATE,
  plays_count INTEGER DEFAULT 0,
  downloads_count INTEGER DEFAULT 0,
  revenue_amount NUMERIC DEFAULT 0,
  unique_listeners INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on release_analytics
ALTER TABLE public.release_analytics ENABLE ROW LEVEL SECURITY;

-- RLS policies for release_analytics
CREATE POLICY "Users can view their own analytics"
ON public.release_analytics
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "System can manage analytics"
ON public.release_analytics
FOR ALL
USING (true);

-- Create analytics aggregation function
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

-- Add direct sales support to releases table
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS enable_direct_sales BOOLEAN DEFAULT true;
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS download_limit INTEGER DEFAULT 3; -- max downloads per purchase
ALTER TABLE public.releases ADD COLUMN IF NOT EXISTS download_expires_days INTEGER DEFAULT 30; -- download link expires after N days

-- Update release_purchases to track download usage
ALTER TABLE public.release_purchases ADD COLUMN IF NOT EXISTS downloads_used INTEGER DEFAULT 0;
ALTER TABLE public.release_purchases ADD COLUMN IF NOT EXISTS last_download_at TIMESTAMPTZ;