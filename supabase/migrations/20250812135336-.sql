-- Live Sessions MVP schema
-- 1) Tables

-- sessions
CREATE TABLE IF NOT EXISTS public.sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL,
  title text NOT NULL,
  description text,
  status text NOT NULL DEFAULT 'live', -- scheduled | live | ended
  is_public boolean NOT NULL DEFAULT true,
  scheduled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;

-- session_members
CREATE TABLE IF NOT EXISTS public.session_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'viewer', -- host | collaborator | viewer
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (session_id, user_id)
);

ALTER TABLE public.session_members ENABLE ROW LEVEL SECURITY;

-- session_messages
CREATE TABLE IF NOT EXISTS public.session_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_messages ENABLE ROW LEVEL SECURITY;

-- session_notes (single shared doc per session)
CREATE TABLE IF NOT EXISTS public.session_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL UNIQUE,
  content text NOT NULL DEFAULT '',
  updated_by uuid NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_notes ENABLE ROW LEVEL SECURITY;

-- session_files (metadata for uploaded files)
CREATE TABLE IF NOT EXISTS public.session_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  file_type text,
  size integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_files ENABLE ROW LEVEL SECURITY;

-- session_feedback (timestamped comments)
CREATE TABLE IF NOT EXISTS public.session_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL,
  user_id uuid NOT NULL,
  target_file_id uuid,
  target_audio_url text,
  timestamp_sec numeric,
  comment text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.session_feedback ENABLE ROW LEVEL SECURITY;

-- 2) Triggers for updated_at
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_sessions_updated_at'
  ) THEN
    CREATE TRIGGER trg_sessions_updated_at
    BEFORE UPDATE ON public.sessions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'trg_session_notes_updated_at'
  ) THEN
    CREATE TRIGGER trg_session_notes_updated_at
    BEFORE UPDATE ON public.session_notes
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END $$;

-- 3) RLS Policies
-- sessions policies
DROP POLICY IF EXISTS "Public or members can view sessions" ON public.sessions;
CREATE POLICY "Public or members can view sessions"
ON public.sessions FOR SELECT
USING (
  is_public = true OR
  host_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM public.session_members sm
    WHERE sm.session_id = sessions.id AND sm.user_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Hosts can insert sessions" ON public.sessions;
CREATE POLICY "Hosts can insert sessions"
ON public.sessions FOR INSERT
WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can update sessions" ON public.sessions;
CREATE POLICY "Hosts can update sessions"
ON public.sessions FOR UPDATE
USING (auth.uid() = host_id);

DROP POLICY IF EXISTS "Hosts can delete sessions" ON public.sessions;
CREATE POLICY "Hosts can delete sessions"
ON public.sessions FOR DELETE
USING (auth.uid() = host_id);

-- session_members policies
DROP POLICY IF EXISTS "Members and hosts can view members" ON public.session_members;
CREATE POLICY "Members and hosts can view members"
ON public.session_members FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_members.session_id AND (
      s.is_public = true OR s.host_id = auth.uid()
    )
  ) OR user_id = auth.uid()
);

DROP POLICY IF EXISTS "Users can join sessions" ON public.session_members;
CREATE POLICY "Users can join sessions"
ON public.session_members FOR INSERT
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Hosts can update member roles" ON public.session_members;
CREATE POLICY "Hosts can update member roles"
ON public.session_members FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_members.session_id AND s.host_id = auth.uid()
  )
);

DROP POLICY IF EXISTS "Hosts or self can leave" ON public.session_members;
CREATE POLICY "Hosts or self can leave"
ON public.session_members FOR DELETE
USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_members.session_id AND s.host_id = auth.uid()
  )
);

-- session_messages policies
DROP POLICY IF EXISTS "Members can view messages" ON public.session_messages;
CREATE POLICY "Members can view messages"
ON public.session_messages FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_messages.session_id AND (
      s.host_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.session_members sm
        WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Members can create messages" ON public.session_messages;
CREATE POLICY "Members can create messages"
ON public.session_messages FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_messages.session_id AND (
      s.host_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.session_members sm
        WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
      )
    )
  ) AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "Owners or host can delete messages" ON public.session_messages;
CREATE POLICY "Owners or host can delete messages"
ON public.session_messages FOR DELETE
USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_messages.session_id AND s.host_id = auth.uid()
  )
);

-- session_notes policies
DROP POLICY IF EXISTS "Members can view notes" ON public.session_notes;
CREATE POLICY "Members can view notes"
ON public.session_notes FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_notes.session_id AND (
      s.host_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.session_members sm
        WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Members can upsert notes" ON public.session_notes;
CREATE POLICY "Members can upsert notes"
ON public.session_notes FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_notes.session_id AND (
      s.host_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.session_members sm
        WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
      )
    )
  ) AND auth.uid() = updated_by
);

DROP POLICY IF EXISTS "Members can update notes" ON public.session_notes;
CREATE POLICY "Members can update notes"
ON public.session_notes FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_notes.session_id AND (
      s.host_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.session_members sm
        WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
      )
    )
  ) AND auth.uid() = updated_by
);

-- session_files policies
DROP POLICY IF EXISTS "Members can view files" ON public.session_files;
CREATE POLICY "Members can view files"
ON public.session_files FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_files.session_id AND (
      s.host_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.session_members sm
        WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Members can add files" ON public.session_files;
CREATE POLICY "Members can add files"
ON public.session_files FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_files.session_id AND (
      s.host_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.session_members sm
        WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
      )
    )
  ) AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "Owners or host can delete files" ON public.session_files;
CREATE POLICY "Owners or host can delete files"
ON public.session_files FOR DELETE
USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_files.session_id AND s.host_id = auth.uid()
  )
);

-- session_feedback policies
DROP POLICY IF EXISTS "Members can view feedback" ON public.session_feedback;
CREATE POLICY "Members can view feedback"
ON public.session_feedback FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_feedback.session_id AND (
      s.host_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.session_members sm
        WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
      )
    )
  )
);

DROP POLICY IF EXISTS "Members can add feedback" ON public.session_feedback;
CREATE POLICY "Members can add feedback"
ON public.session_feedback FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_feedback.session_id AND (
      s.host_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.session_members sm
        WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
      )
    )
  ) AND auth.uid() = user_id
);

DROP POLICY IF EXISTS "Owners or host can delete feedback" ON public.session_feedback;
CREATE POLICY "Owners or host can delete feedback"
ON public.session_feedback FOR DELETE
USING (
  user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id = session_feedback.session_id AND s.host_id = auth.uid()
  )
);

-- 4) Storage bucket for session files
INSERT INTO storage.buckets (id, name, public)
VALUES ('session-files', 'session-files', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Session files are viewable by members'
  ) THEN
    DROP POLICY "Session files are viewable by members" ON storage.objects;
  END IF;
END $$;

CREATE POLICY "Session files are viewable by members"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'session-files' AND (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id::text = (storage.foldername(name))[1] AND (
        s.host_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
    )
  )
);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Members can upload session files'
  ) THEN
    DROP POLICY "Members can upload session files" ON storage.objects;
  END IF;
END $$;

CREATE POLICY "Members can upload session files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'session-files' AND (
    EXISTS (
      SELECT 1 FROM public.sessions s
      WHERE s.id::text = (storage.foldername(name))[1] AND (
        s.host_id = auth.uid() OR EXISTS (
          SELECT 1 FROM public.session_members sm
          WHERE sm.session_id = s.id AND sm.user_id = auth.uid()
        )
      )
    )
  )
);

DO $$ BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Host can delete session files'
  ) THEN
    DROP POLICY "Host can delete session files" ON storage.objects;
  END IF;
END $$;

CREATE POLICY "Host can delete session files"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'session-files' AND EXISTS (
    SELECT 1 FROM public.sessions s
    WHERE s.id::text = (storage.foldername(name))[1] AND s.host_id = auth.uid()
  )
);
