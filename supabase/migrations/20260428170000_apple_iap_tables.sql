-- ─── Apple IAP support tables ────────────────────────────────────────
-- Used by: validate-iap-receipt, apple-server-notification edge functions

-- Transaction log for all validated IAP receipts
CREATE TABLE IF NOT EXISTS iap_transactions (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  transaction_id        text NOT NULL,
  original_transaction_id text NOT NULL,
  product_id    text NOT NULL,
  type          text NOT NULL CHECK (type IN ('credits', 'subscription')),
  environment   text NOT NULL DEFAULT 'Production',
  purchase_date timestamptz NOT NULL DEFAULT now(),
  expires_date  timestamptz,
  status        text NOT NULL DEFAULT 'validated',
  raw_receipt   text,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (transaction_id)
);

-- Index for duplicate checks and user lookups
CREATE INDEX IF NOT EXISTS idx_iap_transactions_user
  ON iap_transactions (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_iap_transactions_original_tx
  ON iap_transactions (original_transaction_id);

-- Apple App Store Server Notifications V2 log
CREATE TABLE IF NOT EXISTS apple_notification_log (
  id                    uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  notification_uuid     text NOT NULL UNIQUE,
  notification_type     text NOT NULL,
  subtype               text,
  original_transaction_id text,
  transaction_id        text,
  product_id            text,
  environment           text,
  app_account_token     text,
  payload               jsonb,
  processed_at          timestamptz DEFAULT now(),
  created_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_apple_notification_log_uuid
  ON apple_notification_log (notification_uuid);
CREATE INDEX IF NOT EXISTS idx_apple_notification_log_original_tx
  ON apple_notification_log (original_transaction_id);

-- Add Apple IAP metadata columns to fan_subscriptions if not present
DO $$
BEGIN
  -- Add current_period_end if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fan_subscriptions' AND column_name = 'current_period_end'
  ) THEN
    ALTER TABLE fan_subscriptions ADD COLUMN current_period_end timestamptz;
  END IF;

  -- Add last_payment_at if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fan_subscriptions' AND column_name = 'last_payment_at'
  ) THEN
    ALTER TABLE fan_subscriptions ADD COLUMN last_payment_at timestamptz;
  END IF;

  -- Add apple_sku if it doesn't exist (for quick lookups)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fan_subscriptions' AND column_name = 'apple_sku'
  ) THEN
    ALTER TABLE fan_subscriptions ADD COLUMN apple_sku text;
  END IF;
END $$;

-- RLS policies
ALTER TABLE iap_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE apple_notification_log ENABLE ROW LEVEL SECURITY;

-- Users can read their own transactions
CREATE POLICY "Users can view own IAP transactions"
  ON iap_transactions FOR SELECT
  USING (auth.uid() = user_id);

-- Service role can do everything (edge functions use service role key)
CREATE POLICY "Service role full access to iap_transactions"
  ON iap_transactions FOR ALL
  USING (auth.role() = 'service_role');

CREATE POLICY "Service role full access to apple_notification_log"
  ON apple_notification_log FOR ALL
  USING (auth.role() = 'service_role');
