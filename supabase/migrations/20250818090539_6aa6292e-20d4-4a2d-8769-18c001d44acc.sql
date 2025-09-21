-- A1. Extend releases table for distributor connectors and press kits
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS distribution_submission_ref TEXT,
ADD COLUMN IF NOT EXISTS distribution_partner_response JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS presskit_url TEXT;

-- A2. Extend social_connections for distributor providers (check if table exists)
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'social_connections') THEN
    CREATE TABLE public.social_connections (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
      provider TEXT NOT NULL,
      provider_user_id TEXT,
      access_token TEXT,
      refresh_token TEXT,
      expires_at TIMESTAMP WITH TIME ZONE,
      connection_data JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      UNIQUE(user_id, provider)
    );
    
    ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Users can manage their own connections" ON public.social_connections
    FOR ALL USING (auth.uid() = user_id);
  END IF;
END $$;

-- B1. Extend producer_payouts for referral payouts
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'producer_payouts') THEN
    -- Create the table if it doesn't exist
    CREATE TABLE public.producer_payouts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      producer_id UUID NOT NULL,
      amount_cents INTEGER NOT NULL,
      currency TEXT NOT NULL DEFAULT 'gbp',
      status TEXT NOT NULL DEFAULT 'pending',
      stripe_transfer_id TEXT,
      created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
      payout_type TEXT DEFAULT 'content',
      referral_code TEXT,
      source_kind TEXT,
      source_id TEXT
    );
    
    ALTER TABLE public.producer_payouts ENABLE ROW LEVEL SECURITY;
    
    CREATE POLICY "Admins can manage all payouts" ON public.producer_payouts
    FOR ALL USING (EXISTS (
      SELECT 1 FROM user_roles 
      WHERE user_id = auth.uid() AND role = 'admin'
    ));
    
    CREATE POLICY "Producers can view their own payouts" ON public.producer_payouts
    FOR SELECT USING (auth.uid() = producer_id);
  ELSE
    -- Extend existing table
    ALTER TABLE public.producer_payouts 
    ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'content',
    ADD COLUMN IF NOT EXISTS referral_code TEXT,
    ADD COLUMN IF NOT EXISTS source_kind TEXT,
    ADD COLUMN IF NOT EXISTS source_id TEXT;
  END IF;
END $$;

-- Add presskit_url to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS presskit_url TEXT;

-- C1. Create trending content view for recommendations
CREATE OR REPLACE VIEW public.v_trending_content AS
WITH content_scores AS (
  -- Beat scores
  SELECT 
    'beat' as content_type,
    b.id as content_id,
    b.title,
    b.user_id,
    b.created_at,
    COALESCE(recent_sales.sales_score, 0) * 0.4 +
    COALESCE(engagement.engagement_score, 0) * 0.3 +
    COALESCE(recency.recency_score, 0) * 0.3 as total_score
  FROM beats b
  LEFT JOIN (
    -- Recent sales score (last 30 days)
    SELECT 
      beat_id,
      COUNT(*) * 10 + SUM(sale_price * 0.1) as sales_score
    FROM beat_sales 
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY beat_id
  ) recent_sales ON b.id = recent_sales.beat_id
  LEFT JOIN (
    -- Engagement score (likes + downloads)
    SELECT 
      b2.id as beat_id,
      (COALESCE(likes_count, 0) * 2 + COALESCE(downloads_count, 0)) as engagement_score
    FROM beats b2
    LEFT JOIN (
      SELECT beat_id, COUNT(*) as likes_count 
      FROM beat_likes 
      GROUP BY beat_id
    ) bl ON b2.id = bl.beat_id
    LEFT JOIN (
      SELECT beat_id, COUNT(*) as downloads_count 
      FROM beat_downloads 
      WHERE created_at > NOW() - INTERVAL '7 days'
      GROUP BY beat_id
    ) bd ON b2.id = bd.beat_id
  ) engagement ON b.id = engagement.beat_id
  LEFT JOIN (
    -- Recency bonus (newer = higher score)
    SELECT 
      id,
      GREATEST(0, 100 - EXTRACT(DAY FROM NOW() - created_at)) as recency_score
    FROM beats
  ) recency ON b.id = recency.id
  WHERE b.is_published = true
  
  UNION ALL
  
  -- Release scores  
  SELECT 
    'release' as content_type,
    r.id as content_id,
    r.title,
    r.user_id,
    r.created_at,
    COALESCE(rel_sales.sales_score, 0) * 0.4 +
    COALESCE(rel_engagement.engagement_score, 0) * 0.3 +
    COALESCE(rel_recency.recency_score, 0) * 0.3 as total_score
  FROM releases r
  LEFT JOIN (
    SELECT 
      release_id,
      COUNT(*) * 15 + SUM(amount * 0.1) as sales_score
    FROM release_purchases 
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY release_id
  ) rel_sales ON r.id = rel_sales.release_id
  LEFT JOIN (
    SELECT 
      r2.id as release_id,
      (COALESCE(comments_count, 0) * 3 + COALESCE(plays_count, 0) * 0.1) as engagement_score
    FROM releases r2
    LEFT JOIN (
      SELECT release_id, COUNT(*) as comments_count 
      FROM release_comments 
      GROUP BY release_id
    ) rc ON r2.id = rc.release_id
    LEFT JOIN (
      SELECT release_id, SUM(plays_count) as plays_count
      FROM release_analytics 
      WHERE date_recorded > CURRENT_DATE - INTERVAL '7 days'
      GROUP BY release_id
    ) ra ON r2.id = ra.release_id
  ) rel_engagement ON r.id = rel_engagement.release_id
  LEFT JOIN (
    SELECT 
      id,
      GREATEST(0, 100 - EXTRACT(DAY FROM NOW() - created_at)) as recency_score
    FROM releases
  ) rel_recency ON r.id = rel_recency.id
)
SELECT 
  content_type,
  content_id,
  title,
  user_id,
  created_at,
  total_score,
  ROW_NUMBER() OVER (PARTITION BY content_type ORDER BY total_score DESC, created_at DESC) as rank
FROM content_scores
ORDER BY total_score DESC, created_at DESC;