-- Creator Page Analytics and Features Support
-- These tables support the world-class creator page functionality

-- Creator page views for analytics
CREATE TABLE IF NOT EXISTS creator_page_views (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  visitor_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  page_type TEXT DEFAULT 'creator_profile',
  referrer TEXT,
  user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creator email list for notifications
CREATE TABLE IF NOT EXISTS creator_email_list (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  subscriber_email TEXT NOT NULL,
  subscriber_id UUID REFERENCES profiles(user_id) ON DELETE SET NULL,
  source TEXT DEFAULT 'creator_page',
  tags TEXT[] DEFAULT '{}',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(creator_id, subscriber_email)
);

-- User discounts for conversion optimization
CREATE TABLE IF NOT EXISTS user_discounts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  creator_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  discount_type TEXT NOT NULL,
  discount_percent INTEGER DEFAULT 0,
  discount_amount INTEGER DEFAULT 0, -- in cents
  code TEXT,
  expires_at TIMESTAMP WITH TIME ZONE,
  used_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Community posts for creator communities
CREATE TABLE IF NOT EXISTS community_posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  media_urls TEXT[] DEFAULT '{}',
  post_type TEXT DEFAULT 'update', -- update, announcement, exclusive, etc.
  visibility TEXT DEFAULT 'subscribers', -- public, followers, subscribers
  status TEXT DEFAULT 'published',
  likes_count INTEGER DEFAULT 0,
  comments_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Live sessions
CREATE TABLE IF NOT EXISTS live_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  duration_minutes INTEGER DEFAULT 60,
  session_type TEXT DEFAULT 'performance', -- performance, qa, production, collaboration, tutorial
  max_participants INTEGER,
  is_free BOOLEAN DEFAULT true,
  price_cents INTEGER DEFAULT 0,
  status TEXT DEFAULT 'scheduled', -- scheduled, live, ended, cancelled
  thumbnail_url TEXT,
  stream_url TEXT,
  recording_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Creator subscription tiers (if not exists)
CREATE TABLE IF NOT EXISTS creator_subscription_tiers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  price_cents INTEGER NOT NULL,
  benefits TEXT[] DEFAULT '{}',
  badge_color TEXT,
  max_subscribers INTEGER,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table (for store functionality)
CREATE TABLE IF NOT EXISTS products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  creator_id UUID REFERENCES profiles(user_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  product_type TEXT DEFAULT 'digital', -- digital, physical, service
  price_cents INTEGER NOT NULL,
  image_url TEXT,
  download_url TEXT,
  is_featured BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'draft', -- draft, active, archived
  inventory_count INTEGER,
  tags TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns to existing tables
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_verified BOOLEAN DEFAULT false;
ALTER TABLE beats ADD COLUMN IF NOT EXISTS producer_name TEXT;
ALTER TABLE beats ADD COLUMN IF NOT EXISTS likes_count INTEGER DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS total_likes INTEGER DEFAULT 0;
ALTER TABLE releases ADD COLUMN IF NOT EXISTS streaming_links JSONB DEFAULT '{}';

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_creator_page_views_creator_id ON creator_page_views(creator_id);
CREATE INDEX IF NOT EXISTS idx_creator_page_views_created_at ON creator_page_views(created_at);
CREATE INDEX IF NOT EXISTS idx_creator_email_list_creator_id ON creator_email_list(creator_id);
CREATE INDEX IF NOT EXISTS idx_user_discounts_user_id ON user_discounts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_discounts_creator_id ON user_discounts(creator_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_creator_id ON community_posts(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_creator_id ON live_sessions(creator_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_scheduled_for ON live_sessions(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_products_creator_id ON products(creator_id);

-- RLS Policies
ALTER TABLE creator_page_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_email_list ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_discounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE creator_subscription_tiers ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies (can be refined based on specific requirements)
CREATE POLICY "Public read access to live sessions" ON live_sessions FOR SELECT USING (true);
CREATE POLICY "Public read access to products" ON products FOR SELECT USING (status = 'active');
CREATE POLICY "Public read access to community posts" ON community_posts FOR SELECT USING (status = 'published' AND visibility = 'public');

-- Function to get creator membership stats
CREATE OR REPLACE FUNCTION get_creator_membership_stats(p_creator_id UUID)
RETURNS TABLE (
  total_subscribers INTEGER,
  monthly_revenue NUMERIC,
  growth_rate NUMERIC,
  tier_distribution JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COALESCE(COUNT(fs.id)::INTEGER, 0) as total_subscribers,
    COALESCE(SUM(cst.price_cents) / 100.0, 0) as monthly_revenue,
    COALESCE(
      (COUNT(fs.id) FILTER (WHERE fs.created_at >= NOW() - INTERVAL '30 days'))::NUMERIC / 
      NULLIF(COUNT(fs.id) FILTER (WHERE fs.created_at < NOW() - INTERVAL '30 days'), 0) - 1, 
      0
    ) as growth_rate,
    COALESCE(
      jsonb_object_agg(cst.name, COUNT(fs.id)),
      '{}'::jsonb
    ) as tier_distribution
  FROM creator_subscription_tiers cst
  LEFT JOIN fan_subscriptions fs ON fs.tier_id = cst.id AND fs.status = 'active'
  WHERE cst.user_id = p_creator_id AND cst.active = true
  GROUP BY cst.user_id;
END;
$$;