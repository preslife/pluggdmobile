
-- Enable realtime for contest_submissions and contest_votes (idempotent)

-- Ensure full row data is captured for realtime updates
ALTER TABLE public.contest_submissions REPLICA IDENTITY FULL;
ALTER TABLE public.contest_votes REPLICA IDENTITY FULL;

-- Add tables to supabase_realtime publication if not already present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'contest_submissions'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_submissions;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'contest_votes'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.contest_votes;
  END IF;
END $$;
