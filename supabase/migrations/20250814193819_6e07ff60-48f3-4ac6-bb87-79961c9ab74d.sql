-- Phase 1: Database Schema Enhancements

-- Add missing columns to producer_stripe_accounts
ALTER TABLE public.producer_stripe_accounts 
ADD COLUMN IF NOT EXISTS payouts_enabled BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS capabilities JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS details_submitted BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS external_account_id TEXT,
ADD COLUMN IF NOT EXISTS country TEXT DEFAULT 'GB',
ADD COLUMN IF NOT EXISTS default_currency TEXT DEFAULT 'gbp';

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_producer_stripe_accounts_user_id ON public.producer_stripe_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_producer_stripe_accounts_stripe_id ON public.producer_stripe_accounts(stripe_account_id);
CREATE INDEX IF NOT EXISTS idx_beat_sales_producer_payout ON public.beat_sales(producer_id, payout_status);
CREATE INDEX IF NOT EXISTS idx_beat_sales_created_at ON public.beat_sales(created_at);

-- Create function to check payout eligibility
CREATE OR REPLACE FUNCTION public.is_payout_eligible(p_producer_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  account_record RECORD;
  pending_amount NUMERIC;
BEGIN
  -- Check if producer has a valid Stripe account
  SELECT * INTO account_record
  FROM public.producer_stripe_accounts
  WHERE user_id = p_producer_id
  AND onboarding_complete = true
  AND charges_enabled = true
  AND payouts_enabled = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check if there's enough pending earnings (minimum £10)
  SELECT COALESCE(SUM(producer_earnings), 0) INTO pending_amount
  FROM public.beat_sales
  WHERE producer_id = p_producer_id
  AND payout_status = 'pending';
  
  RETURN pending_amount >= 10.00;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to calculate producer pending earnings
CREATE OR REPLACE FUNCTION public.get_producer_pending_earnings(p_producer_id UUID)
RETURNS NUMERIC AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(producer_earnings)
    FROM public.beat_sales
    WHERE producer_id = p_producer_id
    AND payout_status = 'pending'
  ), 0);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger to update producer earnings when beat sales change
CREATE OR REPLACE FUNCTION public.update_producer_earnings_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  -- Refresh the producer earnings summary
  PERFORM public.update_producer_earnings();
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create the trigger
DROP TRIGGER IF EXISTS trigger_update_producer_earnings ON public.beat_sales;
CREATE TRIGGER trigger_update_producer_earnings
  AFTER INSERT OR UPDATE OR DELETE ON public.beat_sales
  FOR EACH ROW
  EXECUTE FUNCTION public.update_producer_earnings_on_sale();

-- Create table for payout batch records
CREATE TABLE IF NOT EXISTS public.payout_batches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id TEXT NOT NULL UNIQUE,
  total_amount NUMERIC NOT NULL DEFAULT 0,
  total_producers INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'processing',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

-- Enable RLS on payout_batches
ALTER TABLE public.payout_batches ENABLE ROW LEVEL SECURITY;

-- Create policies for payout_batches
CREATE POLICY "Admins can manage payout batches" ON public.payout_batches
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid() AND role = 'admin'
  )
);

-- Create function to initiate payout batch
CREATE OR REPLACE FUNCTION public.create_payout_batch()
RETURNS UUID AS $$
DECLARE
  batch_id TEXT;
  new_batch_id UUID;
  total_amount NUMERIC := 0;
  total_producers INTEGER := 0;
BEGIN
  -- Generate unique batch ID
  batch_id := 'batch_' || extract(epoch from now())::text;
  
  -- Count eligible producers and total amount
  SELECT 
    COUNT(DISTINCT producer_id),
    COALESCE(SUM(producer_earnings), 0)
  INTO total_producers, total_amount
  FROM public.beat_sales bs
  JOIN public.producer_stripe_accounts psa ON psa.user_id = bs.producer_id
  WHERE bs.payout_status = 'pending'
  AND psa.onboarding_complete = true
  AND psa.charges_enabled = true
  AND psa.payouts_enabled = true
  AND bs.producer_earnings >= 1.00; -- Minimum £1 per transaction
  
  -- Create batch record
  INSERT INTO public.payout_batches (batch_id, total_amount, total_producers)
  VALUES (batch_id, total_amount, total_producers)
  RETURNING id INTO new_batch_id;
  
  RETURN new_batch_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;