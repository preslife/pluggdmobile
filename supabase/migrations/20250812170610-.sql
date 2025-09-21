-- Create session_feedback table and policies
-- and session_notes table with realtime and RLS

-- 1) session_feedback
CREATE TABLE IF NOT EXISTS public.session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  timecode_seconds integer NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- Policies for session_feedback
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session_feedback' AND policyname = 'Members can view feedback'
  ) THEN
    CREATE POLICY "Members can view feedback"
    ON public.session_feedback
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = session_feedback.session_id
          AND (
            s.host_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.session_members sm
              WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
            )
          )
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session_feedback' AND policyname = 'Members can add feedback'
  ) THEN
    CREATE POLICY "Members can add feedback"
    ON public.session_feedback
    FOR INSERT
    WITH CHECK (
      user_id = auth.uid() AND EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = session_feedback.session_id
          AND (
            s.host_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.session_members sm
              WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
            )
          )
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session_feedback' AND policyname = 'Owners or host can delete feedback'
  ) THEN
    CREATE POLICY "Owners or host can delete feedback"
    ON public.session_feedback
    FOR DELETE
    USING (
      user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = session_feedback.session_id AND s.host_id = auth.uid()
      )
    );
  END IF;
END $$;

-- Index to speed up queries
CREATE INDEX IF NOT EXISTS idx_session_feedback_session_created_at
  ON public.session_feedback (session_id, created_at DESC);

-- Ensure realtime delete payloads include full row
ALTER TABLE public.session_feedback REPLICA IDENTITY FULL;

-- Add to realtime publication
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.session_feedback';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;


-- 2) session_notes (one shared note per session)
CREATE TABLE IF NOT EXISTS public.session_notes (
  session_id uuid PRIMARY KEY,
  content text NOT NULL DEFAULT '',
  updated_by uuid NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- Trigger to auto-update updated_at
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_update_session_notes_updated_at'
  ) THEN
    CREATE TRIGGER trg_update_session_notes_updated_at
    BEFORE UPDATE ON public.session_notes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- Policies for session_notes
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session_notes' AND policyname = 'Members can view notes'
  ) THEN
    CREATE POLICY "Members can view notes"
    ON public.session_notes
    FOR SELECT
    USING (
      EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = session_notes.session_id
          AND (
            s.host_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.session_members sm
              WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
            )
          )
      )
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session_notes' AND policyname = 'Members can insert notes'
  ) THEN
    CREATE POLICY "Members can insert notes"
    ON public.session_notes
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = session_notes.session_id
          AND (
            s.host_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.session_members sm
              WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
            )
          )
      ) AND (updated_by IS NULL OR updated_by = auth.uid())
    );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'session_notes' AND policyname = 'Members can update notes'
  ) THEN
    CREATE POLICY "Members can update notes"
    ON public.session_notes
    FOR UPDATE
    USING (
      EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = session_notes.session_id
          AND (
            s.host_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.session_members sm
              WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
            )
          )
      )
    )
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.sessions s
        WHERE s.id = session_notes.session_id
          AND (
            s.host_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.session_members sm
              WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
            )
          )
      ) AND (updated_by IS NULL OR updated_by = auth.uid())
    );
  END IF;
END $$;

-- Realtime for session_notes
ALTER TABLE public.session_notes REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.session_notes';
  EXCEPTION WHEN duplicate_object THEN
    NULL;
  END;
END $$;