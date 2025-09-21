-- Create table for session feedback with timestamped notes
CREATE TABLE IF NOT EXISTS public.session_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL,
  user_id UUID NOT NULL,
  content TEXT NOT NULL,
  timecode_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- Realtime delete payloads should include full row
ALTER TABLE public.session_feedback REPLICA IDENTITY FULL;

-- Index for faster querying by session
CREATE INDEX IF NOT EXISTS idx_session_feedback_session_id ON public.session_feedback(session_id);
CREATE INDEX IF NOT EXISTS idx_session_feedback_created_at ON public.session_feedback(created_at);

-- Policies mirroring session_messages/session_files style
-- Members (or host) can view feedback
DROP POLICY IF EXISTS "Members can view feedback" ON public.session_feedback;
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

-- Members (or host) can create feedback; user_id must match auth.uid()
DROP POLICY IF EXISTS "Members can create feedback" ON public.session_feedback;
CREATE POLICY "Members can create feedback"
ON public.session_feedback
FOR INSERT
WITH CHECK (
  auth.uid() = user_id AND
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

-- Owners or host can delete feedback
DROP POLICY IF EXISTS "Owners or host can delete feedback" ON public.session_feedback;
CREATE POLICY "Owners or host can delete feedback"
ON public.session_feedback
FOR DELETE
USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_feedback.session_id AND s.host_id = auth.uid()
  )
);
