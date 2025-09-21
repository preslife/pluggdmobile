-- Fix security warning for the function by setting search_path
CREATE OR REPLACE FUNCTION public.process_tip_payment(
  p_creator_id UUID,
  p_amount_credits INTEGER,
  p_payment_method TEXT DEFAULT 'credits'
) RETURNS jsonb AS $$
DECLARE
  result jsonb;
BEGIN
  -- For credits payment, handle via wallet ledger
  IF p_payment_method = 'credits' THEN
    -- This will be handled by the existing spend_credits function
    -- which creates appropriate ledger entries
    result := jsonb_build_object(
      'success', true,
      'payment_method', 'credits',
      'amount', p_amount_credits
    );
  ELSE
    -- For Stripe payments, this will be handled by the webhook
    result := jsonb_build_object(
      'success', true,
      'payment_method', 'stripe'
    );
  END IF;
  
  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public';