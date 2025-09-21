-- Fix the RLS policies with correct column names

-- Campaign pledges policies (corrected)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'campaign_pledges' AND table_schema = 'public') THEN
    ALTER TABLE public.campaign_pledges ENABLE ROW LEVEL SECURITY;
    
    EXECUTE 'CREATE POLICY "Campaign pledges are viewable by everyone"
    ON public.campaign_pledges
    FOR SELECT
    USING (true)';
    
    -- Check if pledger_id column exists, if not use the correct column name
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_pledges' AND column_name = 'pledger_id') THEN
      EXECUTE 'CREATE POLICY "Users can create pledges"
      ON public.campaign_pledges
      FOR INSERT
      WITH CHECK (auth.uid() = pledger_id)';
    ELSIF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'campaign_pledges' AND column_name = 'user_id') THEN
      EXECUTE 'CREATE POLICY "Users can create pledges"
      ON public.campaign_pledges
      FOR INSERT
      WITH CHECK (auth.uid() = user_id)';
    END IF;
  END IF;
END $$;

-- User quest progress policies (corrected)
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