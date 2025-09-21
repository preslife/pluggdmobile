-- Create web_push_subscriptions table for push notifications
CREATE TABLE public.web_push_subscriptions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can manage their own push subscriptions" 
ON public.web_push_subscriptions 
FOR ALL 
USING (auth.uid() = user_id);

-- Add audience insight fields to creator_metrics
ALTER TABLE public.creator_metrics 
ADD COLUMN IF NOT EXISTS audience_geo JSONB DEFAULT '{}'::jsonb,
ADD COLUMN IF NOT EXISTS retention_30d INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS new_fans_30d INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS churn_30d INTEGER DEFAULT 0;

-- Add performance indexes (using correct column names)
CREATE INDEX IF NOT EXISTS idx_releases_status_approved_date 
ON public.releases(status, approved, release_date DESC);

CREATE INDEX IF NOT EXISTS idx_releases_spotlight 
ON public.releases(spotlight) WHERE spotlight = true;

CREATE INDEX IF NOT EXISTS idx_beats_featured_price_date 
ON public.beats(is_featured, price, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_user_date 
ON public.orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id 
ON public.order_items(order_id);

CREATE INDEX IF NOT EXISTS idx_fan_subscriptions_creator_status 
ON public.fan_subscriptions(creator_id, status);

CREATE INDEX IF NOT EXISTS idx_content_splits_type_id 
ON public.content_splits(content_type, content_id);

CREATE INDEX IF NOT EXISTS idx_producer_payouts_user_status_date 
ON public.producer_payouts(producer_id, payout_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_posts_creator_date 
ON public.community_posts(creator_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_community_likes_post_user 
ON public.community_likes(post_id, user_id);

CREATE INDEX IF NOT EXISTS idx_community_comments_post_date 
ON public.community_comments(post_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_battle_votes_matchup_voter 
ON public.battle_votes(matchup_id, voter_user_id);

CREATE INDEX IF NOT EXISTS idx_event_tickets_event_user 
ON public.event_tickets(event_id, user_id);

-- Add trigger for updated_at
CREATE TRIGGER update_web_push_subscriptions_updated_at
BEFORE UPDATE ON public.web_push_subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();