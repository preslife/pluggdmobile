-- Update release_purchases to support pending/completed states and safer download handling
ALTER TABLE public.release_purchases
  ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS stripe_session_id TEXT,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Mark existing historical purchases as completed
UPDATE public.release_purchases
SET status = 'completed',
    paid_at = COALESCE(paid_at, purchased_at)
WHERE status IS NULL
   OR status NOT IN ('pending', 'completed')
   OR stripe_payment_intent_id IS NOT NULL;

-- Remove any legacy download URLs from the purchases table
ALTER TABLE public.release_purchases
  DROP COLUMN IF EXISTS download_url;

-- Helpful indexes for webhook reconciliation
CREATE INDEX IF NOT EXISTS release_purchases_stripe_session_idx
  ON public.release_purchases (stripe_session_id);

CREATE INDEX IF NOT EXISTS release_purchases_status_idx
  ON public.release_purchases (status);
