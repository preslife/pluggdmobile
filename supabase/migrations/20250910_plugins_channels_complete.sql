-- =====================================================
-- COMPLETE PLUG-INS/CHANNELS SYSTEM DATABASE SCHEMA
-- According to PLUGGD_MASTER_FEATURESPEC.MD
-- =====================================================

-- Drop existing inadequate tables to rebuild to spec
DROP TABLE IF EXISTS public.social_posts CASCADE;
DROP TABLE IF EXISTS public.unified_inbox CASCADE;
DROP TABLE IF EXISTS public.social_connections CASCADE;

-- =====================================================
-- 1. OAUTH CONNECTIONS (All Platforms)
-- =====================================================
CREATE TABLE public.social_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  provider text NOT NULL CHECK (provider IN (
    'instagram_business', 'facebook_pages', 'youtube', 'tiktok_business', 
    'twitter', 'soundcloud', 'discord', 'mailchimp', 'substack', 'patreon'
  )),
  account_id text NOT NULL,
  account_name text NOT NULL,
  account_handle text,
  profile_image_url text,
  is_active boolean DEFAULT true,
  connection_status text DEFAULT 'connected' CHECK (connection_status IN ('connected', 'expired', 'revoked', 'error')),
  last_synced_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, provider, account_id)
);

CREATE TABLE public.oauth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  access_token text NOT NULL,
  refresh_token text,
  token_type text DEFAULT 'Bearer',
  expires_at timestamptz,
  scopes text[],
  additional_data jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 2. COMPOSER & POST MANAGEMENT
-- =====================================================
CREATE TABLE public.social_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  
  -- Content
  content text NOT NULL,
  media_urls text[] DEFAULT '{}',
  media_types text[] DEFAULT '{}', -- image, video, audio
  
  -- Per-channel variants stored as JSONB
  channel_variants jsonb DEFAULT '{}',
  /* Example structure:
  {
    "instagram_business": {
      "content": "Shortened version for IG...",
      "hashtags": ["#music", "#newrelease"],
      "mentions": ["@collaborator"],
      "media_url": "optimized_for_ig.jpg"
    },
    "twitter": {
      "content": "Thread part 1...",
      "thread": ["Part 2...", "Part 3..."],
      "hashtags": ["#NowPlaying"],
      "media_url": "optimized_for_twitter.jpg"
    }
  }
  */
  
  -- Smart links & tracking
  smart_link_id uuid,
  utm_source text,
  utm_medium text DEFAULT 'social',
  utm_campaign text,
  utm_content text,
  
  -- Status
  status text DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'publishing', 'published', 'partial', 'failed', 'cancelled')),
  
  -- Metadata
  post_type text DEFAULT 'manual' CHECK (post_type IN ('manual', 'auto_release', 'auto_live', 'auto_course', 'auto_campaign')),
  related_entity_type text CHECK (related_entity_type IN ('release', 'beat', 'live_session', 'course', 'campaign', 'membership_post')),
  related_entity_id uuid,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 3. SCHEDULER & QUEUE
-- =====================================================
CREATE TABLE public.post_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES public.social_posts(id) ON DELETE CASCADE,
  social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  
  -- Scheduling
  scheduled_at timestamptz NOT NULL,
  timezone text DEFAULT 'UTC',
  
  -- Publishing status
  status text DEFAULT 'queued' CHECK (status IN ('queued', 'publishing', 'published', 'failed', 'cancelled')),
  publish_started_at timestamptz,
  published_at timestamptz,
  
  -- Provider response
  provider_post_id text,
  provider_response jsonb,
  provider_metrics jsonb, -- Initial metrics from provider
  
  -- Retry logic
  retry_count int DEFAULT 0,
  max_retries int DEFAULT 3,
  next_retry_at timestamptz,
  failure_reason text,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  
  UNIQUE(post_id, social_account_id)
);

-- =====================================================
-- 4. SMART LINKS & TRACKING
-- =====================================================
CREATE TABLE public.shortlinks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  
  -- Link details
  short_code text UNIQUE NOT NULL,
  destination_url text NOT NULL,
  title text,
  
  -- Tracking
  post_id uuid REFERENCES public.social_posts(id) ON DELETE SET NULL,
  
  -- Metrics
  click_count int DEFAULT 0,
  unique_visitors int DEFAULT 0,
  
  -- Status
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.shortlink_clicks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shortlink_id uuid NOT NULL REFERENCES public.shortlinks(id) ON DELETE CASCADE,
  
  -- Visitor info
  ip_address inet,
  user_agent text,
  referer text,
  country_code text,
  city text,
  
  -- Attribution
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  utm_term text,
  
  -- User tracking (if logged in)
  user_id uuid REFERENCES public.profiles(user_id) ON DELETE SET NULL,
  
  clicked_at timestamptz DEFAULT now()
);

-- =====================================================
-- 5. INBOX & INTERACTIONS
-- =====================================================
CREATE TABLE public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  
  -- Message details
  provider_message_id text NOT NULL,
  provider_thread_id text,
  message_type text CHECK (message_type IN ('comment', 'mention', 'dm', 'reply', 'review')),
  
  -- Content
  author_id text,
  author_name text,
  author_handle text,
  author_avatar_url text,
  content text,
  media_urls text[] DEFAULT '{}',
  
  -- Context
  parent_post_id uuid REFERENCES public.social_posts(id) ON DELETE SET NULL,
  parent_provider_post_id text,
  permalink text,
  
  -- Status
  is_read boolean DEFAULT false,
  is_starred boolean DEFAULT false,
  is_archived boolean DEFAULT false,
  sentiment text CHECK (sentiment IN ('positive', 'neutral', 'negative', 'unknown')),
  requires_response boolean DEFAULT false,
  responded_at timestamptz,
  
  -- Moderation
  is_hidden boolean DEFAULT false,
  is_spam boolean DEFAULT false,
  moderation_status text DEFAULT 'pending' CHECK (moderation_status IN ('pending', 'approved', 'rejected', 'hidden')),
  
  created_at timestamptz DEFAULT now(),
  received_at timestamptz DEFAULT now(),
  
  UNIQUE(social_account_id, provider_message_id)
);

CREATE TABLE public.saved_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  
  title text NOT NULL,
  content text NOT NULL,
  category text,
  shortcut text UNIQUE,
  use_count int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 6. ANALYTICS & METRICS
-- =====================================================
CREATE TABLE public.social_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_target_id uuid NOT NULL REFERENCES public.post_targets(id) ON DELETE CASCADE,
  
  -- Engagement metrics
  impressions int DEFAULT 0,
  reach int DEFAULT 0,
  engagements int DEFAULT 0,
  likes int DEFAULT 0,
  comments int DEFAULT 0,
  shares int DEFAULT 0,
  saves int DEFAULT 0,
  clicks int DEFAULT 0,
  
  -- Video/Audio metrics
  plays int DEFAULT 0,
  average_watch_time int DEFAULT 0, -- seconds
  completion_rate decimal(5,2),
  
  -- Audience metrics
  follower_count_at_post int,
  new_followers int DEFAULT 0,
  
  -- Revenue attribution
  attributed_sales decimal(10,2) DEFAULT 0,
  attributed_plays int DEFAULT 0,
  attributed_tips decimal(10,2) DEFAULT 0,
  attributed_tickets int DEFAULT 0,
  
  -- Fetched timestamp
  fetched_at timestamptz DEFAULT now(),
  metrics_date date DEFAULT CURRENT_DATE,
  
  created_at timestamptz DEFAULT now()
);

CREATE TABLE public.channel_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  social_account_id uuid NOT NULL REFERENCES public.social_accounts(id) ON DELETE CASCADE,
  
  -- Period
  period_start date NOT NULL,
  period_end date NOT NULL,
  period_type text CHECK (period_type IN ('day', 'week', 'month', 'quarter', 'year')),
  
  -- Metrics
  total_posts int DEFAULT 0,
  total_impressions int DEFAULT 0,
  total_engagements int DEFAULT 0,
  engagement_rate decimal(5,2),
  follower_count_start int,
  follower_count_end int,
  follower_growth int,
  
  -- Revenue attribution
  total_attributed_sales decimal(10,2) DEFAULT 0,
  total_attributed_plays int DEFAULT 0,
  conversion_rate decimal(5,2),
  
  created_at timestamptz DEFAULT now(),
  
  UNIQUE(social_account_id, period_start, period_end, period_type)
);

-- =====================================================
-- 7. AUTOMATION RULES
-- =====================================================
CREATE TABLE public.automation_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  
  -- Trigger
  trigger_type text NOT NULL CHECK (trigger_type IN (
    'release_published', 'beat_published', 'live_scheduled', 'live_started', 
    'course_published', 'campaign_launched', 'membership_post'
  )),
  
  -- Actions
  actions jsonb NOT NULL,
  /* Example:
  {
    "post_to_channels": ["instagram_business", "twitter"],
    "use_template": "uuid-of-template",
    "delay_minutes": 30,
    "add_smart_link": true
  }
  */
  
  -- Status
  is_active boolean DEFAULT true,
  last_triggered_at timestamptz,
  trigger_count int DEFAULT 0,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE public.post_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
  
  name text NOT NULL,
  description text,
  
  -- Template content
  template_type text CHECK (template_type IN ('release', 'beat', 'live', 'course', 'general')),
  content_template text NOT NULL,
  channel_variants jsonb DEFAULT '{}',
  
  -- Media
  default_media_urls text[] DEFAULT '{}',
  
  -- Usage
  use_count int DEFAULT 0,
  last_used_at timestamptz,
  
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- =====================================================
-- 8. INDEXES FOR PERFORMANCE
-- =====================================================
CREATE INDEX idx_social_accounts_user_provider ON public.social_accounts(user_id, provider);
CREATE INDEX idx_oauth_tokens_account ON public.oauth_tokens(social_account_id);
CREATE INDEX idx_social_posts_user_status ON public.social_posts(user_id, status);
CREATE INDEX idx_post_targets_scheduled ON public.post_targets(scheduled_at) WHERE status = 'queued';
CREATE INDEX idx_post_targets_retry ON public.post_targets(next_retry_at) WHERE status = 'failed' AND retry_count < max_retries;
CREATE INDEX idx_shortlinks_code ON public.shortlinks(short_code) WHERE is_active = true;
CREATE INDEX idx_inbox_messages_user_unread ON public.inbox_messages(user_id, is_read) WHERE is_read = false;
CREATE INDEX idx_inbox_messages_account ON public.inbox_messages(social_account_id);
CREATE INDEX idx_social_metrics_post ON public.social_metrics(post_target_id);
CREATE INDEX idx_social_metrics_date ON public.social_metrics(metrics_date);
CREATE INDEX idx_channel_analytics_account_period ON public.channel_analytics(social_account_id, period_start, period_end);

-- =====================================================
-- 9. ROW LEVEL SECURITY
-- =====================================================
ALTER TABLE public.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.oauth_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_targets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shortlink_clicks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_replies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_analytics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.post_templates ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own social accounts" ON public.social_accounts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own oauth tokens" ON public.oauth_tokens
  FOR ALL USING (
    social_account_id IN (
      SELECT id FROM public.social_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own posts" ON public.social_posts
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own post targets" ON public.post_targets
  FOR ALL USING (
    post_id IN (
      SELECT id FROM public.social_posts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own shortlinks" ON public.shortlinks
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Anyone can create shortlink clicks" ON public.shortlink_clicks
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view own shortlink clicks" ON public.shortlink_clicks
  FOR SELECT USING (
    shortlink_id IN (
      SELECT id FROM public.shortlinks WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own inbox" ON public.inbox_messages
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own saved replies" ON public.saved_replies
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view own metrics" ON public.social_metrics
  FOR SELECT USING (
    post_target_id IN (
      SELECT pt.id FROM public.post_targets pt
      JOIN public.social_posts sp ON pt.post_id = sp.id
      WHERE sp.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can view own channel analytics" ON public.channel_analytics
  FOR SELECT USING (
    social_account_id IN (
      SELECT id FROM public.social_accounts WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage own automation rules" ON public.automation_rules
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can manage own templates" ON public.post_templates
  FOR ALL USING (auth.uid() = user_id);

-- =====================================================
-- 10. FUNCTIONS & TRIGGERS
-- =====================================================

-- Function to generate unique short codes
CREATE OR REPLACE FUNCTION generate_short_code()
RETURNS text AS $$
DECLARE
  chars text := 'abcdefghijklmnopqrstuvwxyz0123456789';
  result text := '';
  i int;
BEGIN
  FOR i IN 1..6 LOOP
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  END LOOP;
  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- Function to track shortlink clicks
CREATE OR REPLACE FUNCTION track_shortlink_click()
RETURNS trigger AS $$
BEGIN
  UPDATE public.shortlinks
  SET 
    click_count = click_count + 1,
    updated_at = now()
  WHERE id = NEW.shortlink_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_shortlink_click
  AFTER INSERT ON public.shortlink_clicks
  FOR EACH ROW
  EXECUTE FUNCTION track_shortlink_click();

-- Function to update social metrics attribution
CREATE OR REPLACE FUNCTION update_attribution_metrics(
  p_shortlink_id uuid,
  p_order_amount decimal,
  p_metric_type text
)
RETURNS void AS $$
DECLARE
  v_post_id uuid;
BEGIN
  -- Get the associated post
  SELECT post_id INTO v_post_id
  FROM public.shortlinks
  WHERE id = p_shortlink_id;
  
  IF v_post_id IS NOT NULL THEN
    -- Update all related social metrics
    UPDATE public.social_metrics sm
    SET 
      attributed_sales = CASE WHEN p_metric_type = 'sale' THEN attributed_sales + p_order_amount ELSE attributed_sales END,
      attributed_tips = CASE WHEN p_metric_type = 'tip' THEN attributed_tips + p_order_amount ELSE attributed_tips END,
      attributed_plays = CASE WHEN p_metric_type = 'play' THEN attributed_plays + 1 ELSE attributed_plays END,
      attributed_tickets = CASE WHEN p_metric_type = 'ticket' THEN attributed_tickets + 1 ELSE attributed_tickets END
    FROM public.post_targets pt
    WHERE pt.id = sm.post_target_id
      AND pt.post_id = v_post_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Updated_at trigger for all tables
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_social_accounts_updated_at BEFORE UPDATE ON public.social_accounts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_oauth_tokens_updated_at BEFORE UPDATE ON public.oauth_tokens
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_social_posts_updated_at BEFORE UPDATE ON public.social_posts
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_post_targets_updated_at BEFORE UPDATE ON public.post_targets
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_shortlinks_updated_at BEFORE UPDATE ON public.shortlinks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_saved_replies_updated_at BEFORE UPDATE ON public.saved_replies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_automation_rules_updated_at BEFORE UPDATE ON public.automation_rules
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER update_post_templates_updated_at BEFORE UPDATE ON public.post_templates
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();