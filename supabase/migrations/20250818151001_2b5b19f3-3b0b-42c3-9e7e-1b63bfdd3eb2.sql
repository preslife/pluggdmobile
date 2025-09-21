-- Add Analytics Events Table
CREATE TABLE public.analytics_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  event_name TEXT NOT NULL,
  properties JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS for analytics events
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;

-- Users can view their own events
CREATE POLICY "Users can view own events" ON public.analytics_events 
FOR SELECT USING (auth.uid() = user_id);

-- Admins can view all events
CREATE POLICY "Admins can view all events" ON public.analytics_events 
FOR SELECT USING (EXISTS (
  SELECT 1 FROM user_roles 
  WHERE user_id = auth.uid() AND role = 'admin'
));

-- System can insert events
CREATE POLICY "System can insert events" ON public.analytics_events 
FOR INSERT WITH CHECK (true);

-- Add referral rewards tracking to profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS referral_rewards_earned INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS referral_signups_count INTEGER DEFAULT 0;

-- Add referral reward tracking to orders
ALTER TABLE public.orders 
ADD COLUMN IF NOT EXISTS referral_reward_status TEXT DEFAULT 'none' 
  CHECK (referral_reward_status IN ('none', 'pending', 'granted')),
ADD COLUMN IF NOT EXISTS referral_reward_credits INTEGER DEFAULT 0;