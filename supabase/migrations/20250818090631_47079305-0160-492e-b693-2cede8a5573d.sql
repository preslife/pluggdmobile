-- A1. Extend releases table for distributor connectors and press kits
ALTER TABLE public.releases 
ADD COLUMN IF NOT EXISTS distribution_submission_ref TEXT,
ADD COLUMN IF NOT EXISTS distribution_partner_response JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS presskit_url TEXT;

-- A2. Create social_connections table if not exists
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

-- C1. Create simplified trending content view using existing tables
CREATE OR REPLACE VIEW public.v_trending_content AS
WITH content_scores AS (
  -- Beat scores based on existing data
  SELECT 
    'beat' as content_type,
    b.id as content_id,
    b.title,
    b.user_id,
    b.created_at,
    -- Simple scoring: recency + purchase activity
    COALESCE(recent_sales.sales_score, 0) * 0.6 +
    GREATEST(0, 50 - EXTRACT(DAY FROM NOW() - b.created_at)) * 0.4 as total_score
  FROM beats b
  LEFT JOIN (
    -- Recent sales from purchases table
    SELECT 
      beat_id,
      COUNT(*) * 10 as sales_score
    FROM purchases 
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY beat_id
  ) recent_sales ON b.id = recent_sales.beat_id
  WHERE b.is_published = true
  
  UNION ALL
  
  -- Release scores
  SELECT 
    'release' as content_type,
    r.id as content_id,
    r.title,
    r.user_id,
    r.created_at,
    -- Release scoring: purchases + analytics + recency
    COALESCE(rel_sales.sales_score, 0) * 0.4 +
    COALESCE(rel_analytics.analytics_score, 0) * 0.2 +
    GREATEST(0, 50 - EXTRACT(DAY FROM NOW() - r.created_at)) * 0.4 as total_score
  FROM releases r
  LEFT JOIN (
    SELECT 
      release_id,
      COUNT(*) * 15 as sales_score
    FROM release_purchases 
    WHERE created_at > NOW() - INTERVAL '30 days'
    GROUP BY release_id
  ) rel_sales ON r.id = rel_sales.release_id
  LEFT JOIN (
    SELECT 
      release_id,
      SUM(plays_count + downloads_count * 2) * 0.1 as analytics_score
    FROM release_analytics 
    WHERE date_recorded > CURRENT_DATE - INTERVAL '7 days'
    GROUP BY release_id
  ) rel_analytics ON r.id = rel_analytics.release_id
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