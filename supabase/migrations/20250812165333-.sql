-- Ensure realtime delete payloads include full row and tables are in publication

-- Session files: always exists per schema
ALTER TABLE public.session_files REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.session_files';
  EXCEPTION WHEN duplicate_object THEN
    -- Table already in publication, ignore
    NULL;
  END;
END $$;

-- Session feedback: apply only if table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'session_feedback'
  ) THEN
    EXECUTE 'ALTER TABLE public.session_feedback REPLICA IDENTITY FULL';
    BEGIN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.session_feedback';
    EXCEPTION WHEN duplicate_object THEN
      NULL;
    END;
  END IF;
END $$;