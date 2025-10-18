BEGIN;

-- Add running balance columns if they do not yet exist
ALTER TABLE public.wallet_ledger
  ADD COLUMN IF NOT EXISTS balance_before BIGINT,
  ADD COLUMN IF NOT EXISTS balance_after BIGINT;

-- Backfill historical data to populate running balances
DO $$
DECLARE
  rec RECORD;
  previous_user UUID := NULL;
  running_balance BIGINT := 0;
BEGIN
  FOR rec IN
    SELECT id, user_id, amount_credits
    FROM public.wallet_ledger
    ORDER BY user_id, created_at, id
  LOOP
    IF previous_user IS DISTINCT FROM rec.user_id THEN
      running_balance := 0;
      previous_user := rec.user_id;
    END IF;

    UPDATE public.wallet_ledger
    SET
      balance_before = running_balance,
      balance_after = running_balance + rec.amount_credits
    WHERE id = rec.id;

    running_balance := running_balance + rec.amount_credits;

    IF running_balance < 0 THEN
      RAISE EXCEPTION 'Wallet ledger entry % results in negative balance for user %', rec.id, rec.user_id;
    END IF;
  END LOOP;
END;
$$;

ALTER TABLE public.wallet_ledger
  ALTER COLUMN balance_before SET NOT NULL,
  ALTER COLUMN balance_after SET NOT NULL;

ALTER TABLE public.wallet_ledger
  ADD CONSTRAINT wallet_ledger_balance_non_negative CHECK (balance_after >= 0);

-- Trigger function to enforce running balance integrity on inserts
CREATE OR REPLACE FUNCTION public.wallet_ledger_enforce_balance()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  latest_balance BIGINT;
BEGIN
  SELECT balance_after
    INTO latest_balance
  FROM public.wallet_ledger
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1;

  IF latest_balance IS NULL THEN
    latest_balance := 0;
  END IF;

  NEW.balance_before := latest_balance;
  NEW.balance_after := latest_balance + NEW.amount_credits;

  IF NEW.balance_after < 0 THEN
    RAISE EXCEPTION 'Insufficient credits for user %, balance would be %', NEW.user_id, NEW.balance_after;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_ledger_enforce_balance_trigger ON public.wallet_ledger;
CREATE TRIGGER wallet_ledger_enforce_balance_trigger
  BEFORE INSERT ON public.wallet_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.wallet_ledger_enforce_balance();

-- Prevent updates or deletes that could bypass balance integrity
CREATE OR REPLACE FUNCTION public.wallet_ledger_prevent_mutation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  RAISE EXCEPTION 'Wallet ledger entries are immutable';
END;
$$;

DROP TRIGGER IF EXISTS wallet_ledger_prevent_update ON public.wallet_ledger;
CREATE TRIGGER wallet_ledger_prevent_update
  BEFORE UPDATE OR DELETE ON public.wallet_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.wallet_ledger_prevent_mutation();

-- Recreate wallet balance view to leverage running balances
DROP VIEW IF EXISTS public.v_wallet_balances;
CREATE VIEW public.v_wallet_balances AS
WITH recent_topups AS (
  SELECT
    user_id,
    COALESCE(SUM(amount_credits), 0) AS pending_credits
  FROM public.wallet_ledger
  WHERE kind = 'topup'
    AND created_at > now() - INTERVAL '48 hours'
  GROUP BY user_id
),
latest_created AS (
  SELECT
    user_id,
    MAX(created_at) AS max_created_at
  FROM public.wallet_ledger
  GROUP BY user_id
),
latest_rows AS (
  SELECT wl.*
  FROM public.wallet_ledger wl
  JOIN latest_created lc ON lc.user_id = wl.user_id AND wl.created_at = lc.max_created_at
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.wallet_ledger newer
    WHERE newer.user_id = wl.user_id
      AND newer.created_at = wl.created_at
      AND newer.id > wl.id
  )
)
SELECT
  lr.user_id,
  COALESCE(lr.balance_after, 0) AS balance_credits,
  COALESCE(recent_topups.pending_credits, 0) AS pending_credits
FROM latest_rows lr
LEFT JOIN recent_topups ON recent_topups.user_id = lr.user_id;

-- Ensure the balance RPC still works with the updated view
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

COMMIT;
