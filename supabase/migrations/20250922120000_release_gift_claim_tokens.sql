-- Add claim tracking for gifted releases
ALTER TABLE public.release_gift_queue
  ADD COLUMN IF NOT EXISTS claim_token TEXT NOT NULL DEFAULT encode(gen_random_bytes(18), 'hex'),
  ADD COLUMN IF NOT EXISTS claimed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS claimed_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'release_gift_queue_claim_token_key'
      AND conrelid = 'public.release_gift_queue'::regclass
  ) THEN
    ALTER TABLE public.release_gift_queue
      ADD CONSTRAINT release_gift_queue_claim_token_key UNIQUE (claim_token);
  END IF;
END $$;
