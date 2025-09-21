-- Add stripe_account_id to profiles table
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_account_id TEXT;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS stripe_onboarding_complete BOOLEAN DEFAULT false;

-- Create fan_club_tiers table for creator subscription tiers
CREATE TABLE IF NOT EXISTS public.fan_club_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_pence INTEGER NOT NULL, -- GBP pence (500 = £5.00)
  benefits TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on fan_club_tiers
ALTER TABLE public.fan_club_tiers ENABLE ROW LEVEL SECURITY;

-- RLS policies for fan_club_tiers
CREATE POLICY "Anyone can view active fan club tiers" ON public.fan_club_tiers
FOR SELECT USING (is_active = true);

CREATE POLICY "Creators can manage their own tiers" ON public.fan_club_tiers
FOR ALL USING (auth.uid() = creator_id);

-- Add producer_stripe_accounts table for better Stripe Connect management
CREATE TABLE IF NOT EXISTS public.producer_stripe_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  stripe_account_id TEXT NOT NULL,
  onboarding_complete BOOLEAN DEFAULT false,
  charges_enabled BOOLEAN DEFAULT false,
  payouts_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on producer_stripe_accounts
ALTER TABLE public.producer_stripe_accounts ENABLE ROW LEVEL SECURITY;

-- RLS policies for producer_stripe_accounts
CREATE POLICY "Users can view their own stripe accounts" ON public.producer_stripe_accounts
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can manage their own stripe accounts" ON public.producer_stripe_accounts
FOR ALL USING (auth.uid() = user_id);

-- Update fan_subscriptions to use pence for GBP
ALTER TABLE public.fan_subscriptions 
ALTER COLUMN price_cents TYPE INTEGER,
ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'gbp';

-- Add trigger for updated_at on fan_club_tiers
CREATE TRIGGER update_fan_club_tiers_updated_at
  BEFORE UPDATE ON public.fan_club_tiers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add trigger for updated_at on producer_stripe_accounts  
CREATE TRIGGER update_producer_stripe_accounts_updated_at
  BEFORE UPDATE ON public.producer_stripe_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();