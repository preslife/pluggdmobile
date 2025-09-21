-- Convert beat pricing and licensing to GBP (pence)
-- Update beats table to use pence instead of dollars
ALTER TABLE public.beats 
ADD COLUMN price_pence INTEGER DEFAULT 0;

-- Update existing beats to convert USD to pence (assuming $1 = £0.80, so $10 = £8 = 800 pence)
UPDATE public.beats 
SET price_pence = ROUND(price * 80)
WHERE price IS NOT NULL;

-- Make price_pence the primary price field
ALTER TABLE public.beats 
ALTER COLUMN price_pence SET NOT NULL;

-- Update licensing_contracts to use pence
ALTER TABLE public.licensing_contracts 
ADD COLUMN license_fee_pence INTEGER DEFAULT 0;

-- Convert existing license fees to pence
UPDATE public.licensing_contracts 
SET license_fee_pence = ROUND(license_fee * 80)
WHERE license_fee IS NOT NULL;

-- Make license_fee_pence the primary fee field
ALTER TABLE public.licensing_contracts 
ALTER COLUMN license_fee_pence SET NOT NULL;

-- Update licensing_options to use pence
ALTER TABLE public.licensing_options 
ADD COLUMN price_pence INTEGER DEFAULT 0;

-- Convert existing prices to pence
UPDATE public.licensing_options 
SET price_pence = ROUND(price * 80)
WHERE price IS NOT NULL;

-- Make price_pence the primary price field
ALTER TABLE public.licensing_options 
ALTER COLUMN price_pence SET NOT NULL;

-- Update contract_templates to use pence ranges
ALTER TABLE public.contract_templates 
ADD COLUMN price_range_min_pence INTEGER DEFAULT 0,
ADD COLUMN price_range_max_pence INTEGER DEFAULT 0;

-- Convert existing price ranges to pence
UPDATE public.contract_templates 
SET price_range_min_pence = ROUND(price_range_min * 80),
    price_range_max_pence = ROUND(price_range_max * 80)
WHERE price_range_min IS NOT NULL AND price_range_max IS NOT NULL;

-- Add revenue tracking for producers
CREATE TABLE IF NOT EXISTS public.producer_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id UUID NOT NULL,
  beat_id UUID,
  contract_id UUID,
  sale_type TEXT NOT NULL CHECK (sale_type IN ('beat_license', 'beat_purchase', 'commission')),
  gross_amount_pence INTEGER NOT NULL,
  platform_fee_pence INTEGER NOT NULL DEFAULT 0,
  net_amount_pence INTEGER NOT NULL,
  payout_status TEXT DEFAULT 'pending' CHECK (payout_status IN ('pending', 'processing', 'paid', 'failed')),
  stripe_transfer_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  paid_at TIMESTAMPTZ,
  FOREIGN KEY (producer_id) REFERENCES profiles(user_id) ON DELETE CASCADE,
  FOREIGN KEY (beat_id) REFERENCES beats(id) ON DELETE SET NULL,
  FOREIGN KEY (contract_id) REFERENCES licensing_contracts(id) ON DELETE SET NULL
);

-- Enable RLS on producer earnings
ALTER TABLE public.producer_earnings ENABLE ROW LEVEL SECURITY;

-- Create policies for producer earnings
CREATE POLICY "Producers can view their own earnings" 
ON public.producer_earnings 
FOR SELECT 
USING (auth.uid() = producer_id);

CREATE POLICY "System can create earnings records" 
ON public.producer_earnings 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update earnings records" 
ON public.producer_earnings 
FOR UPDATE 
USING (true);

-- Admins can view all earnings
CREATE POLICY "Admins can view all earnings" 
ON public.producer_earnings 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Add Stripe Connect account tracking
CREATE TABLE IF NOT EXISTS public.producer_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  onboarding_complete BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  FOREIGN KEY (user_id) REFERENCES profiles(user_id) ON DELETE CASCADE
);

-- Enable RLS on stripe accounts
ALTER TABLE public.producer_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Create policies for stripe accounts
CREATE POLICY "Users can view their own stripe account" 
ON public.producer_stripe_accounts 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "System can manage stripe accounts" 
ON public.producer_stripe_accounts 
FOR ALL 
USING (true);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_producer_earnings_producer_id ON public.producer_earnings(producer_id);
CREATE INDEX IF NOT EXISTS idx_producer_earnings_created_at ON public.producer_earnings(created_at);
CREATE INDEX IF NOT EXISTS idx_producer_earnings_payout_status ON public.producer_earnings(payout_status);
CREATE INDEX IF NOT EXISTS idx_producer_stripe_accounts_stripe_id ON public.producer_stripe_accounts(stripe_account_id);

-- Add updated_at trigger for producer_stripe_accounts
CREATE TRIGGER update_producer_stripe_accounts_updated_at
    BEFORE UPDATE ON public.producer_stripe_accounts
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();