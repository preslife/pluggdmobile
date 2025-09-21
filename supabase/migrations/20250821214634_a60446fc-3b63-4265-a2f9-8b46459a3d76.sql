-- Add storage policies for Community Hub image assets
-- These ensure users can view contest covers, campaign images, etc.

-- Contests bucket policies (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'contests') THEN
    -- Allow public read access to contest covers
    INSERT INTO storage.policies (name, bucket_id, operation, target, action, check_expression, check_actions)
    VALUES (
      'Public read access for contest covers',
      'contests',
      'SELECT',
      'public',
      'allow',
      'true',
      '{read}'
    )
    ON CONFLICT (name, bucket_id) DO NOTHING;
  END IF;
END $$;

-- Campaigns bucket policies (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'campaigns') THEN
    -- Allow public read access to campaign covers
    INSERT INTO storage.policies (name, bucket_id, operation, target, action, check_expression, check_actions)
    VALUES (
      'Public read access for campaign covers',
      'campaigns',
      'SELECT',
      'public',
      'allow',
      'true',
      '{read}'
    )
    ON CONFLICT (name, bucket_id) DO NOTHING;
  END IF;
END $$;

-- Events bucket policies (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'events') THEN
    -- Allow public read access to event covers
    INSERT INTO storage.policies (name, bucket_id, operation, target, action, check_expression, check_actions)
    VALUES (
      'Public read access for event covers',
      'events',
      'SELECT',
      'public',
      'allow',
      'true',
      '{read}'
    )
    ON CONFLICT (name, bucket_id) DO NOTHING;
  END IF;
END $$;

-- Update campaigns with raised amounts from pledges
UPDATE public.campaigns 
SET raised = COALESCE((
  SELECT SUM(amount) 
  FROM public.campaign_pledges 
  WHERE campaign_id = campaigns.id
), 0);