-- Fix security warnings by adding search_path to all new functions

-- Update is_payout_eligible function
CREATE OR REPLACE FUNCTION public.is_payout_eligible(p_producer_id UUID)
RETURNS BOOLEAN 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;

-- Update get_producer_pending_earnings function
CREATE OR REPLACE FUNCTION public.get_producer_pending_earnings(p_producer_id UUID)
RETURNS NUMERIC 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN COALESCE((
    SELECT SUM(producer_earnings)
    FROM public.beat_sales
    WHERE producer_id = p_producer_id
    AND payout_status = 'pending'
  ), 0);
END;
$$;

-- Update update_producer_earnings_on_sale function
CREATE OR REPLACE FUNCTION public.update_producer_earnings_on_sale()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Refresh the producer earnings summary
  PERFORM public.update_producer_earnings();
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Update create_payout_batch function
CREATE OR REPLACE FUNCTION public.create_payout_batch()
RETURNS UUID 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
$$;