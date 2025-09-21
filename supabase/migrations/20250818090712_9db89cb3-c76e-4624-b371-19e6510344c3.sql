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

-- B1. Create producer_payouts table with referral support
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'producer_payouts') THEN
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
  END IF;
END $$;

-- Add presskit_url to profiles if not exists
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS presskit_url TEXT;

-- C1. Create simple trending content view
CREATE OR REPLACE VIEW public.v_trending_content AS
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