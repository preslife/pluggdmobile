-- Fix RLS policies with fully-qualified column references
-- Ensure tables exist (no-op if already there)
CREATE TABLE IF NOT EXISTS public.session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  user_id uuid NOT NULL,
  content text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  timecode_seconds integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- Drop existing policies to prevent duplicates
DROP POLICY IF EXISTS "Members can view notes" ON public.session_notes;
DROP POLICY IF EXISTS "Members can insert notes" ON public.session_notes;
DROP POLICY IF EXISTS "Members can update notes" ON public.session_notes;

DROP POLICY IF EXISTS "Members can view feedback" ON public.session_feedback;
DROP POLICY IF EXISTS "Members can create feedback" ON public.session_feedback;
DROP POLICY IF EXISTS "Owners or host can delete feedback" ON public.session_feedback;

-- Recreate policies with qualified columns
CREATE POLICY "Members can view notes"
ON public.session_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = public.session_notes.session_id
      AND (
        s.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Members can insert notes"
ON public.session_notes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = public.session_notes.session_id
      AND (
        s.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
  )
  AND auth.uid() = public.session_notes.user_id
);

CREATE POLICY "Members can update notes"
ON public.session_notes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = public.session_notes.session_id
      AND (
        s.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = public.session_notes.session_id
      AND (
        s.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
  )
  AND auth.uid() = public.session_notes.user_id
);

CREATE POLICY "Members can view feedback"
ON public.session_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = public.session_feedback.session_id
      AND (
        s.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY "Members can create feedback"
ON public.session_feedback
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = public.session_feedback.session_id
      AND (
        s.host_id = auth.uid() OR
        EXISTS (
          SELECT 1 FROM public.session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
  )
  AND auth.uid() = public.session_feedback.user_id
);

CREATE POLICY "Owners or host can delete feedback"
ON public.session_feedback
FOR DELETE
USING (
  public.session_feedback.user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = public.session_feedback.session_id AND s.host_id = auth.uid()
  )
);

-- Realtime configuration (idempotent)
ALTER TABLE public.session_notes REPLICA IDENTITY FULL;
ALTER TABLE public.session_feedback REPLICA IDENTITY FULL;
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_notes;
    EXCEPTION WHEN duplicate_object THEN
      -- already added
      NULL;
    END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_feedback;
    EXCEPTION WHEN duplicate_object THEN
      -- already added
      NULL;
    END;
  END IF;
END
$$;