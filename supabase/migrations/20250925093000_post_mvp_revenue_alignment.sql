-- Align orders and artist tip tables for completed revenue flows

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

ALTER TABLE public.orders ALTER COLUMN payment_provider SET DEFAULT 'stripe';

UPDATE public.orders
SET payment_provider = COALESCE(payment_provider, 'stripe')
WHERE payment_id IS NOT NULL
  AND (payment_provider IS NULL OR payment_provider = '');

UPDATE public.orders
SET paid_at = COALESCE(paid_at, updated_at)
WHERE status = 'completed'
  AND payment_id IS NOT NULL
  AND paid_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_user_id_v2 ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id_v2 ON public.orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id_v2 ON public.order_items(order_id);

ALTER TABLE public.artist_tips ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE public.artist_tips ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE public.artist_tips ADD COLUMN IF NOT EXISTS stripe_session_id TEXT;

UPDATE public.artist_tips
SET status = 'succeeded'
WHERE status IS NULL;

UPDATE public.artist_tips
SET paid_at = COALESCE(paid_at, created_at)
WHERE status = 'succeeded'
  AND paid_at IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'artist_tips_status_check'
  ) THEN
    ALTER TABLE public.artist_tips
      ADD CONSTRAINT artist_tips_status_check
      CHECK (status IN ('pending', 'succeeded', 'failed'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_artist_tips_artist_status ON public.artist_tips(artist_id, status);
