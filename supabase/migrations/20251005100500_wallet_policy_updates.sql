-- Wallet policy + ledger summary improvements for Milestone E4

-- Ensure credit rules table exists for checkout policy enforcement
CREATE TABLE IF NOT EXISTS public.credit_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  max_cart_percent NUMERIC(4,3) NOT NULL DEFAULT 0.500,
  daily_spend_limit INTEGER,
  metadata JSONB DEFAULT '{}'::jsonb,
  effective_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.credit_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS credit_rules_public_select ON public.credit_rules;
CREATE POLICY credit_rules_public_select
  ON public.credit_rules
  FOR SELECT
  USING (true);

DROP POLICY IF EXISTS credit_rules_service_manage ON public.credit_rules;
CREATE POLICY credit_rules_service_manage
  ON public.credit_rules
  FOR ALL
  USING (auth.role() = 'service_role')
  WITH CHECK (auth.role() = 'service_role');

INSERT INTO public.credit_rules (max_cart_percent, metadata)
SELECT 0.500, jsonb_build_object('seed', 'e4-default')
WHERE NOT EXISTS (SELECT 1 FROM public.credit_rules);

-- Extend wallet balance helper to expose earned/spent totals
CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  balance_data JSONB;
BEGIN
  WITH balance_totals AS (
    SELECT
      COALESCE(SUM(amount_credits), 0) AS balance_credits,
      COALESCE(SUM(CASE WHEN amount_credits > 0 THEN amount_credits ELSE 0 END), 0) AS total_earned,
      COALESCE(SUM(CASE WHEN amount_credits < 0 THEN ABS(amount_credits) ELSE 0 END), 0) AS total_spent
    FROM public.wallet_ledger
    WHERE user_id = p_user_id
  ),
  pending AS (
    SELECT
      COALESCE(SUM(amount_credits), 0) AS pending_credits
    FROM public.wallet_ledger
    WHERE user_id = p_user_id
      AND kind = 'topup'
      AND created_at > now() - interval '48 hours'
  )
  SELECT jsonb_build_object(
    'balance_credits', bt.balance_credits,
    'pending_credits', pend.pending_credits,
    'available_credits', GREATEST(bt.balance_credits - pend.pending_credits, 0),
    'total_earned', bt.total_earned,
    'total_spent', bt.total_spent
  )
  INTO balance_data
  FROM balance_totals bt CROSS JOIN pending pend;

  RETURN COALESCE(
    balance_data,
    jsonb_build_object(
      'balance_credits', 0,
      'pending_credits', 0,
      'available_credits', 0,
      'total_earned', 0,
      'total_spent', 0
    )
  );
END;
$$;
