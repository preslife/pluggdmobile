-- Fix security definer view by creating a regular view instead
DROP VIEW IF EXISTS public.v_wallet_balances;

-- Create a simple view without security definer
CREATE VIEW public.v_wallet_balances AS 
SELECT 
  user_id,
  COALESCE(SUM(amount_credits), 0) as balance_credits,
  COALESCE(SUM(CASE WHEN kind = 'topup' AND created_at > now() - interval '48 hours' THEN amount_credits ELSE 0 END), 0) as pending_credits
FROM public.wallet_ledger 
GROUP BY user_id;

-- Update the get_wallet_balance function to be simpler
CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  balance_credits BIGINT := 0;
  pending_credits BIGINT := 0;
BEGIN
  -- Get total balance
  SELECT COALESCE(SUM(amount_credits), 0) INTO balance_credits
  FROM wallet_ledger
  WHERE user_id = p_user_id;
  
  -- Get pending credits (top-ups within 48 hours)
  SELECT COALESCE(SUM(amount_credits), 0) INTO pending_credits
  FROM wallet_ledger
  WHERE user_id = p_user_id
  AND kind = 'topup'
  AND created_at > now() - interval '48 hours';
  
  RETURN jsonb_build_object(
    'balance_credits', balance_credits,
    'pending_credits', pending_credits,
    'available_credits', balance_credits - pending_credits
  );
END;
$$;