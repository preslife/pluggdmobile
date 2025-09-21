-- Create creator_subscription_tiers table
CREATE TABLE public.creator_subscription_tiers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  price_cents INTEGER NOT NULL,
  perks TEXT[] DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.creator_subscription_tiers ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Creators can manage their own tiers" ON public.creator_subscription_tiers
FOR ALL
USING (user_id = auth.uid());

CREATE POLICY "Tiers are viewable by everyone" ON public.creator_subscription_tiers
FOR SELECT
USING (active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_creator_subscription_tiers_updated_at
BEFORE UPDATE ON public.creator_subscription_tiers
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();