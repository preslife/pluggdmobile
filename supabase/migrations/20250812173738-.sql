-- Align existing tables to expected schema before policies
-- Session notes: ensure required columns and constraints exist
CREATE TABLE IF NOT EXISTS public.session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  content text NOT NULL DEFAULT ''
);

ALTER TABLE public.session_notes
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now(),
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

-- Ensure unique constraint on session_id for upsert behavior
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.session_notes'::regclass
      AND conname = 'session_notes_session_id_key'
  ) THEN
    ALTER TABLE public.session_notes ADD CONSTRAINT session_notes_session_id_key UNIQUE (session_id);
  END IF;
END$$;

-- Trigger for updated_at on session_notes
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS update_session_notes_updated_at ON public.session_notes;
CREATE TRIGGER update_session_notes_updated_at
BEFORE UPDATE ON public.session_notes
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Session feedback: ensure table and columns exist
CREATE TABLE IF NOT EXISTS public.session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL
);

ALTER TABLE public.session_feedback
  ADD COLUMN IF NOT EXISTS user_id uuid,
  ADD COLUMN IF NOT EXISTS content text,
  ADD COLUMN IF NOT EXISTS timecode_seconds integer,
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

-- Enable RLS
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
    EXCEPTION WHEN duplicate_object THEN NULL; END;
    BEGIN
      ALTER PUBLICATION supabase_realtime ADD TABLE public.session_feedback;
    EXCEPTION WHEN duplicate_object THEN NULL; END;
  END IF;
END
$$;