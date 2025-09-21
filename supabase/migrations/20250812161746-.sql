-- Create session_notes table for collaborative notes per session
CREATE TABLE IF NOT EXISTS public.session_notes (
  session_id uuid PRIMARY KEY,
  content text NOT NULL DEFAULT '',
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- Policies: hosts or members can view/insert/update
CREATE POLICY IF NOT EXISTS "Members can view session notes"
ON public.session_notes
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_notes.session_id
      AND (
        s.host_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY IF NOT EXISTS "Members can insert session notes"
ON public.session_notes
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_notes.session_id
      AND (
        s.host_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY IF NOT EXISTS "Members can update session notes"
ON public.session_notes
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_notes.session_id
      AND (
        s.host_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
  )
);

-- Auto-update updated_at on changes
DROP TRIGGER IF EXISTS trg_update_session_notes_updated_at ON public.session_notes;
CREATE TRIGGER trg_update_session_notes_updated_at
BEFORE UPDATE ON public.session_notes
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();


-- Create session_feedback table for timestamped comments
CREATE TABLE IF NOT EXISTS public.session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  timecode_seconds numeric,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- Helpful index
CREATE INDEX IF NOT EXISTS idx_session_feedback_session ON public.session_feedback(session_id);

-- Policies: members can view, owners can add/update, owners or host can delete
CREATE POLICY IF NOT EXISTS "Members can view session feedback"
ON public.session_feedback
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_feedback.session_id
      AND (
        s.host_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY IF NOT EXISTS "Members can add session feedback"
ON public.session_feedback
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
  EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_feedback.session_id
      AND (
        s.host_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
  )
);

CREATE POLICY IF NOT EXISTS "Owners can update their feedback"
ON public.session_feedback
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Owners or host can delete session feedback"
ON public.session_feedback
FOR DELETE
USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM sessions s
    WHERE s.id = session_feedback.session_id AND s.host_id = auth.uid()
  )
);
