-- Create producer_stripe_accounts table
CREATE TABLE IF NOT EXISTS public.producer_stripe_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  stripe_account_id text NOT NULL,
  onboarding_complete boolean NOT NULL DEFAULT false,
  account_status text NOT NULL DEFAULT 'created',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.producer_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own connect account"
ON public.producer_stripe_accounts
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own connect account"
ON public.producer_stripe_accounts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own connect account"
ON public.producer_stripe_accounts
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all connect accounts"
ON public.producer_stripe_accounts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_producer_stripe_accounts_updated_at ON public.producer_stripe_accounts;
CREATE TRIGGER trg_producer_stripe_accounts_updated_at
BEFORE UPDATE ON public.producer_stripe_accounts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_producer_stripe_accounts_user ON public.producer_stripe_accounts(user_id);
CREATE INDEX IF NOT EXISTS idx_producer_stripe_accounts_status ON public.producer_stripe_accounts(account_status);


-- Create producer_payouts table
CREATE TABLE IF NOT EXISTS public.producer_payouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  producer_id uuid NOT NULL,
  beat_id uuid,
  purchase_id uuid,
  gross_amount numeric NOT NULL,
  platform_fee numeric NOT NULL DEFAULT 0,
  net_amount numeric NOT NULL,
  payout_status text NOT NULL DEFAULT 'pending',
  payout_method text NOT NULL DEFAULT 'stripe',
  stripe_transfer_id text,
  paypal_payout_id text,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.producer_payouts ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view their own payouts"
ON public.producer_payouts
FOR SELECT
USING (auth.uid() = producer_id);

CREATE POLICY "Admins can view all payouts"
ON public.producer_payouts
FOR SELECT
USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trg_producer_payouts_updated_at ON public.producer_payouts;
CREATE TRIGGER trg_producer_payouts_updated_at
BEFORE UPDATE ON public.producer_payouts
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_producer_payouts_producer ON public.producer_payouts(producer_id);
CREATE INDEX IF NOT EXISTS idx_producer_payouts_status ON public.producer_payouts(payout_status);