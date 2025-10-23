BEGIN;

ALTER TABLE public.wallet_ledger
  ADD COLUMN IF NOT EXISTS balance_before BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS balance_after BIGINT NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS reversal_of_entry_id UUID REFERENCES public.wallet_ledger(id) ON DELETE SET NULL;

WITH ordered AS (
  SELECT
    id,
    amount_credits,
    SUM(amount_credits) OVER (PARTITION BY user_id ORDER BY created_at, id) AS running_total
  FROM public.wallet_ledger
)
UPDATE public.wallet_ledger wl
SET
  balance_before = COALESCE(ordered.running_total - wl.amount_credits, 0),
  balance_after = COALESCE(ordered.running_total, wl.amount_credits)
FROM ordered
WHERE wl.id = ordered.id;

CREATE UNIQUE INDEX IF NOT EXISTS wallet_ledger_reversal_of_entry_id_uidx
  ON public.wallet_ledger(reversal_of_entry_id)
  WHERE reversal_of_entry_id IS NOT NULL;

ALTER TABLE public.wallet_ledger
  ADD CONSTRAINT wallet_ledger_no_self_reversal
  CHECK (reversal_of_entry_id IS NULL OR reversal_of_entry_id <> id);

CREATE OR REPLACE FUNCTION public.wallet_ledger_before_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  latest_balance BIGINT;
  reversal_record RECORD;
BEGIN
  IF NEW.meta IS NULL THEN
    NEW.meta := '{}'::jsonb;
  END IF;

  IF NEW.reversal_of_entry_id IS NOT NULL THEN
    SELECT id, user_id
      INTO reversal_record
    FROM public.wallet_ledger
    WHERE id = NEW.reversal_of_entry_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'WALLET_REVERSAL_MISSING_ORIGINAL'
        USING ERRCODE = 'P0001',
              DETAIL = format('Original ledger entry %s not found for reversal', NEW.reversal_of_entry_id);
    END IF;

    IF reversal_record.user_id <> NEW.user_id THEN
      RAISE EXCEPTION 'WALLET_REVERSAL_USER_MISMATCH'
        USING ERRCODE = 'P0001',
              DETAIL = format('Reversal user %s does not match original user %s', NEW.user_id, reversal_record.user_id);
    END IF;
  END IF;

  SELECT balance_after
    INTO latest_balance
  FROM public.wallet_ledger
  WHERE user_id = NEW.user_id
  ORDER BY created_at DESC, id DESC
  LIMIT 1
  FOR UPDATE;

  latest_balance := COALESCE(latest_balance, 0);

  NEW.balance_before := latest_balance;
  NEW.balance_after := latest_balance + NEW.amount_credits;

  IF NEW.balance_after < 0 AND NEW.reversal_of_entry_id IS NULL THEN
    RAISE EXCEPTION 'WALLET_BALANCE_NEGATIVE'
      USING ERRCODE = 'P0001',
            DETAIL = format('User %s balance would drop below zero (%s)', NEW.user_id, NEW.balance_after);
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS wallet_ledger_before_insert_trigger ON public.wallet_ledger;
CREATE TRIGGER wallet_ledger_before_insert_trigger
BEFORE INSERT ON public.wallet_ledger
FOR EACH ROW
EXECUTE FUNCTION public.wallet_ledger_before_insert();

COMMIT;
