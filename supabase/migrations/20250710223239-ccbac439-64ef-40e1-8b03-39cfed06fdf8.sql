-- Create table for producer Stripe Connect accounts
CREATE TABLE IF NOT EXISTS public.producer_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  stripe_account_id TEXT NOT NULL UNIQUE,
  onboarding_complete BOOLEAN DEFAULT FALSE,
  account_status TEXT DEFAULT 'pending', -- pending, active, restricted, rejected
  capabilities JSONB DEFAULT '{}',
  requirements JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE public.producer_stripe_accounts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own Stripe accounts" ON public.producer_stripe_accounts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own Stripe accounts" ON public.producer_stripe_accounts
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can manage Stripe accounts" ON public.producer_stripe_accounts
  FOR ALL USING (true);

-- Add trigger for updating timestamps
CREATE TRIGGER update_producer_stripe_accounts_updated_at
  BEFORE UPDATE ON public.producer_stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create unique index on user_id
CREATE UNIQUE INDEX IF NOT EXISTS idx_producer_stripe_accounts_user_id 
ON public.producer_stripe_accounts(user_id);