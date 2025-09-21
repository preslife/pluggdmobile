-- Create wallet_ledger table (single source of truth for all credit transactions)
CREATE TABLE public.wallet_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN (
    'topup',             -- user buys credits with Stripe
    'spend_tip',         -- user tips creator
    'spend_purchase',    -- user buys beat/release/pack with credits
    'spend_battle',      -- battle entry fees
    'award_prize',       -- platform grants credits (battle prize, promo)
    'convert_cashout',   -- creator converts credits to GBP payout
    'convert_sub_applied'-- credits applied to Stripe customer balance
  )),
  amount_credits BIGINT NOT NULL,      -- positive or negative
  ref_type TEXT,                       -- 'order','battle','release','beat','tip'
  ref_id UUID,                         -- pointer to the entity
  counterparty_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- e.g., creator id when tipping
  meta JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wallet_ledger ENABLE ROW LEVEL SECURITY;

-- Users can view their own ledger entries
CREATE POLICY "users_own_ledger" ON public.wallet_ledger
  FOR SELECT
  USING (user_id = auth.uid() OR counterparty_user_id = auth.uid());

-- System can insert ledger entries
CREATE POLICY "system_insert_ledger" ON public.wallet_ledger
  FOR INSERT
  WITH CHECK (true);

-- Admins can view all ledger entries
CREATE POLICY "admins_view_all_ledger" ON public.wallet_ledger
  FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_roles.user_id = auth.uid() 
    AND user_roles.role = 'admin'::user_role
  ));

-- Create wallet balances view (computed from ledger)
CREATE VIEW public.v_wallet_balances AS 
SELECT 
  user_id,
  COALESCE(SUM(amount_credits), 0) as balance_credits,
  COALESCE(SUM(CASE WHEN kind = 'topup' AND created_at > now() - interval '48 hours' THEN amount_credits ELSE 0 END), 0) as pending_credits
FROM public.wallet_ledger 
GROUP BY user_id;

-- Extend producer_payouts table for wallet cash-outs
ALTER TABLE public.producer_payouts 
ADD COLUMN IF NOT EXISTS payout_type TEXT DEFAULT 'content';

ALTER TABLE public.producer_payouts 
ADD COLUMN IF NOT EXISTS from_credits BOOLEAN DEFAULT false;

-- Add check constraint for payout_type
ALTER TABLE public.producer_payouts 
ADD CONSTRAINT valid_payout_type CHECK (payout_type IN ('content', 'wallet_cashout'));

-- Create indexes for performance
CREATE INDEX idx_wallet_ledger_user_id ON public.wallet_ledger(user_id);
CREATE INDEX idx_wallet_ledger_created_at ON public.wallet_ledger(created_at);
CREATE INDEX idx_wallet_ledger_kind ON public.wallet_ledger(kind);

-- Function to get user wallet balance
CREATE OR REPLACE FUNCTION public.get_wallet_balance(p_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  balance_data JSONB;
BEGIN
  SELECT jsonb_build_object(
    'balance_credits', COALESCE(balance_credits, 0),
    'pending_credits', COALESCE(pending_credits, 0),
    'available_credits', COALESCE(balance_credits - pending_credits, 0)
  ) INTO balance_data
  FROM v_wallet_balances
  WHERE user_id = p_user_id;
  
  RETURN COALESCE(balance_data, jsonb_build_object('balance_credits', 0, 'pending_credits', 0, 'available_credits', 0));
END;
$$;