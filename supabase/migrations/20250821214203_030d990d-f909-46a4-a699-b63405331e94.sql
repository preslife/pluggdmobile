-- Fix campaign pledges policy with correct column name
CREATE POLICY "Users can create pledges"
ON public.campaign_pledges
FOR INSERT
WITH CHECK (auth.uid() = backer_id);

-- Enable RLS on remaining tables that still need it
DO $$
BEGIN
  -- Check and enable RLS on additional tables if they exist
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tracks' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'tracks' AND rowsecurity = true) THEN
      ALTER TABLE public.tracks ENABLE ROW LEVEL SECURITY;
      
      -- Basic policies for tracks (update as needed based on business logic)
      EXECUTE 'CREATE POLICY "Tracks are viewable by everyone"
      ON public.tracks
      FOR SELECT
      USING (true)';
    END IF;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'releases' AND table_schema = 'public') THEN
    IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'releases' AND rowsecurity = true) THEN
      ALTER TABLE public.releases ENABLE ROW LEVEL SECURITY;
      
      -- Basic policies for releases (update as needed based on business logic)
      EXECUTE 'CREATE POLICY "Releases are viewable by everyone"
      ON public.releases
      FOR SELECT
      USING (true)';
    END IF;
  END IF;
END $$;