-- Enable RLS and create read policies for Community Hub tables

-- Enable RLS on all community hub tables
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_prompts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radio_queue ENABLE ROW LEVEL SECURITY;

-- Campaigns policies
CREATE POLICY "Campaigns are viewable by everyone"
ON public.campaigns
FOR SELECT
USING (true);

CREATE POLICY "Users can create their own campaigns"
ON public.campaigns
FOR INSERT
WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "Users can update their own campaigns"
ON public.campaigns
FOR UPDATE
USING (auth.uid() = owner_id);

-- Campaign pledges policies (if this table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_pledges' AND table_schema = 'public') THEN
    ALTER TABLE public.campaign_pledges ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'CREATE POLICY "Campaign pledges are viewable by everyone"
    ON public.campaign_pledges
    FOR SELECT
    USING (true)';
    
    EXECUTE 'CREATE POLICY "Users can create pledges"
    ON public.campaign_pledges
    FOR INSERT
    WITH CHECK (auth.uid() = user_id)';
  END IF;
END $$;

-- Announcements policies
CREATE POLICY "Announcements are viewable by everyone"
ON public.announcements
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage announcements"
ON public.announcements
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Daily prompts policies
CREATE POLICY "Daily prompts are viewable by everyone"
ON public.daily_prompts
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage daily prompts"
ON public.daily_prompts
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Quests policies
CREATE POLICY "Quests are viewable by everyone"
ON public.quests
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage quests"
ON public.quests
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Radio state policies
CREATE POLICY "Radio state is viewable by everyone"
ON public.radio_state
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage radio state"
ON public.radio_state
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- Radio queue policies
CREATE POLICY "Radio queue is viewable by everyone"
ON public.radio_queue
FOR SELECT
USING (true);

CREATE POLICY "Only admins can manage radio queue"
ON public.radio_queue
FOR ALL
USING (EXISTS (
  SELECT 1 FROM user_roles
  WHERE user_id = auth.uid() AND role = 'admin'::user_role
));

-- User quest progress policies (if this table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_quest_progress' AND table_schema = 'public') THEN
    ALTER TABLE public.user_quest_progress ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'CREATE POLICY "Users can view their own quest progress"
    ON public.user_quest_progress
    FOR SELECT
    USING (auth.uid() = user_id)';
    
    EXECUTE 'CREATE POLICY "Users can create their own quest progress"
    ON public.user_quest_progress
    FOR INSERT
    WITH CHECK (auth.uid() = user_id)';
    
    EXECUTE 'CREATE POLICY "Users can update their own quest progress"
    ON public.user_quest_progress
    FOR UPDATE
    USING (auth.uid() = user_id)';
  END IF;
END $$;