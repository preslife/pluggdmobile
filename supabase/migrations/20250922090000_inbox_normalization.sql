-- Normalize inbox storage with threads, participants, and messages tables
-- and expose role-aware RPCs for MessagingCenter flows.

-- Rename legacy inbox_messages table if it exists --------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'inbox_messages'
  ) THEN
    EXECUTE 'ALTER TABLE public.inbox_messages RENAME TO inbox_messages_legacy';
  END IF;
END
$$;

-- Core tables --------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.inbox_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  label_id uuid REFERENCES public.labels(id) ON DELETE CASCADE,
  social_account_id uuid,
  subject text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  last_message_at timestamptz,
  last_message_preview text
);

CREATE INDEX IF NOT EXISTS idx_inbox_threads_last_message_at
  ON public.inbox_threads(last_message_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_label
  ON public.inbox_threads(label_id);
CREATE INDEX IF NOT EXISTS idx_inbox_threads_social_account
  ON public.inbox_threads(social_account_id);

CREATE TABLE IF NOT EXISTS public.inbox_thread_participants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.inbox_threads(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  social_account_id uuid,
  label_id uuid REFERENCES public.labels(id) ON DELETE CASCADE,
  external_id text,
  external_display_name text,
  external_handle text,
  external_avatar_url text,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('member','owner','external','automation')),
  last_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (thread_id, user_id),
  UNIQUE (thread_id, social_account_id),
  UNIQUE (thread_id, label_id),
  CHECK (
    user_id IS NOT NULL
    OR social_account_id IS NOT NULL
    OR label_id IS NOT NULL
    OR external_id IS NOT NULL
  )
);

CREATE INDEX IF NOT EXISTS idx_inbox_participants_thread_user
  ON public.inbox_thread_participants(thread_id, user_id);
CREATE INDEX IF NOT EXISTS idx_inbox_participants_thread_label
  ON public.inbox_thread_participants(thread_id, label_id);
CREATE INDEX IF NOT EXISTS idx_inbox_participants_thread_social
  ON public.inbox_thread_participants(thread_id, social_account_id);

CREATE TABLE IF NOT EXISTS public.inbox_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.inbox_threads(id) ON DELETE CASCADE,
  social_account_id uuid,
  provider_message_id text,
  provider_thread_id text,
  author_participant_id uuid REFERENCES public.inbox_thread_participants(id) ON DELETE SET NULL,
  author_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  author_external_id text,
  author_name text,
  author_handle text,
  author_avatar_url text,
  content text,
  media_urls text[] NOT NULL DEFAULT '{}',
  requires_response boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_inbox_messages_thread_created_at
  ON public.inbox_messages(thread_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_thread
  ON public.inbox_messages(thread_id);
CREATE INDEX IF NOT EXISTS idx_inbox_messages_provider
  ON public.inbox_messages(provider_message_id);

-- Add social account foreign keys when the table exists ---------------------------
DO $$
BEGIN
  IF to_regclass('public.social_accounts') IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'inbox_threads_social_account_id_fkey'
        AND conrelid = 'public.inbox_threads'::regclass
    ) THEN
      ALTER TABLE public.inbox_threads
        ADD CONSTRAINT inbox_threads_social_account_id_fkey
        FOREIGN KEY (social_account_id)
        REFERENCES public.social_accounts(id)
        ON DELETE SET NULL;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'inbox_thread_participants_social_account_id_fkey'
        AND conrelid = 'public.inbox_thread_participants'::regclass
    ) THEN
      ALTER TABLE public.inbox_thread_participants
        ADD CONSTRAINT inbox_thread_participants_social_account_id_fkey
        FOREIGN KEY (social_account_id)
        REFERENCES public.social_accounts(id)
        ON DELETE CASCADE;
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_constraint
      WHERE conname = 'inbox_messages_social_account_id_fkey'
        AND conrelid = 'public.inbox_messages'::regclass
    ) THEN
      ALTER TABLE public.inbox_messages
        ADD CONSTRAINT inbox_messages_social_account_id_fkey
        FOREIGN KEY (social_account_id)
        REFERENCES public.social_accounts(id)
        ON DELETE SET NULL;
    END IF;
  END IF;
END;
$$;

-- Trigger helpers ----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_touch_thread()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_preview text;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    v_preview := left(coalesce(NEW.content, ''), 280);

    UPDATE public.inbox_threads
    SET
      last_message_at = COALESCE(NEW.created_at, now()),
      last_message_preview = v_preview,
      updated_at = now()
    WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inbox_messages_touch_thread
AFTER INSERT OR UPDATE ON public.inbox_messages
FOR EACH ROW
EXECUTE FUNCTION public.inbox_touch_thread();

CREATE OR REPLACE FUNCTION public.inbox_participant_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inbox_participants_set_updated_at
BEFORE UPDATE ON public.inbox_thread_participants
FOR EACH ROW
EXECUTE FUNCTION public.inbox_participant_set_updated_at();

CREATE OR REPLACE FUNCTION public.inbox_thread_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inbox_threads_set_updated_at
BEFORE UPDATE ON public.inbox_threads
FOR EACH ROW
EXECUTE FUNCTION public.inbox_thread_set_updated_at();

-- Access helpers -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_user_owns_social_account(
  p_social_account_id uuid,
  p_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_result boolean := FALSE;
BEGIN
  IF p_social_account_id IS NULL OR p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;

  IF to_regclass('public.social_accounts') IS NULL THEN
    RETURN FALSE;
  END IF;

  EXECUTE 'SELECT EXISTS (
      SELECT 1 FROM public.social_accounts
      WHERE id = $1 AND user_id = $2
    )'
  INTO v_result
  USING p_social_account_id, p_user_id;

  RETURN COALESCE(v_result, FALSE);
END;
$$;

ALTER FUNCTION public.inbox_user_owns_social_account(uuid, uuid)
OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.inbox_get_social_account_details(
  p_social_account_id uuid
)
RETURNS TABLE (
  provider text,
  account_name text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_social_account_id IS NULL THEN
    RETURN;
  END IF;

  IF to_regclass('public.social_accounts') IS NULL THEN
    RETURN;
  END IF;

  RETURN QUERY EXECUTE $$
    SELECT provider, account_name
    FROM public.social_accounts
    WHERE id = $1
  $$ USING p_social_account_id;
END;
$$;

ALTER FUNCTION public.inbox_get_social_account_details(uuid)
OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.inbox_user_can_access_thread(p_thread_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN
    RETURN FALSE;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM public.inbox_thread_participants itp
    WHERE itp.thread_id = p_thread_id
      AND (
        itp.user_id = v_uid
        OR public.inbox_user_owns_social_account(itp.social_account_id, v_uid)
        OR (
          itp.label_id IS NOT NULL
          AND EXISTS (
            SELECT 1 FROM public.label_members lm
            WHERE lm.label_id = itp.label_id AND lm.user_id = v_uid
          )
        )
      )
  )
  OR EXISTS (
    SELECT 1
    FROM public.inbox_threads t
    WHERE t.id = p_thread_id
      AND (
        public.inbox_user_owns_social_account(t.social_account_id, v_uid)
        OR (t.label_id IS NOT NULL AND EXISTS (
          SELECT 1 FROM public.label_members lm
          WHERE lm.label_id = t.label_id AND lm.user_id = v_uid
        ))
      )
  );
END;
$$;

ALTER FUNCTION public.inbox_user_can_access_thread(uuid)
OWNER TO postgres;

CREATE OR REPLACE FUNCTION public.inbox_assert_thread_access(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.inbox_user_can_access_thread(p_thread_id) THEN
    RAISE EXCEPTION 'Access denied for inbox thread %', p_thread_id USING ERRCODE = '42501';
  END IF;
END;
$$;

ALTER FUNCTION public.inbox_assert_thread_access(uuid)
OWNER TO postgres;

-- RLS policies -------------------------------------------------------------------
ALTER TABLE public.inbox_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_thread_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inbox_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS inbox_threads_all ON public.inbox_threads;
CREATE POLICY inbox_threads_select ON public.inbox_threads
  FOR SELECT
  USING (public.inbox_user_can_access_thread(id));

CREATE POLICY inbox_threads_update ON public.inbox_threads
  FOR UPDATE
  USING (public.inbox_user_can_access_thread(id))
  WITH CHECK (public.inbox_user_can_access_thread(id));

CREATE POLICY inbox_threads_insert ON public.inbox_threads
  FOR INSERT
  WITH CHECK (
    (label_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.label_members lm WHERE lm.label_id = label_id AND lm.user_id = auth.uid()
    ))
    OR public.inbox_user_owns_social_account(social_account_id, auth.uid())
  );

CREATE POLICY inbox_threads_delete ON public.inbox_threads
  FOR DELETE
  USING (public.inbox_user_can_access_thread(id));

DROP POLICY IF EXISTS inbox_participants_all ON public.inbox_thread_participants;
CREATE POLICY inbox_participants_select ON public.inbox_thread_participants
  FOR SELECT
  USING (public.inbox_user_can_access_thread(thread_id));

CREATE POLICY inbox_participants_mutate ON public.inbox_thread_participants
  FOR INSERT
  WITH CHECK (public.inbox_user_can_access_thread(thread_id));

CREATE POLICY inbox_participants_update ON public.inbox_thread_participants
  FOR UPDATE
  USING (public.inbox_user_can_access_thread(thread_id))
  WITH CHECK (public.inbox_user_can_access_thread(thread_id));

CREATE POLICY inbox_participants_delete ON public.inbox_thread_participants
  FOR DELETE
  USING (public.inbox_user_can_access_thread(thread_id));

DROP POLICY IF EXISTS inbox_messages_all ON public.inbox_messages;
CREATE POLICY inbox_messages_select ON public.inbox_messages
  FOR SELECT
  USING (public.inbox_user_can_access_thread(thread_id));

CREATE POLICY inbox_messages_insert ON public.inbox_messages
  FOR INSERT
  WITH CHECK (public.inbox_user_can_access_thread(thread_id));

CREATE POLICY inbox_messages_update ON public.inbox_messages
  FOR UPDATE
  USING (public.inbox_user_can_access_thread(thread_id))
  WITH CHECK (public.inbox_user_can_access_thread(thread_id));

CREATE POLICY inbox_messages_delete ON public.inbox_messages
  FOR DELETE
  USING (public.inbox_user_can_access_thread(thread_id));

-- Helper to fetch participant row for current user --------------------------------
CREATE OR REPLACE FUNCTION public.inbox_upsert_participant_user(p_thread_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_participant_id uuid;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  INSERT INTO public.inbox_thread_participants (thread_id, user_id, role)
  VALUES (p_thread_id, v_uid, 'member')
  ON CONFLICT (thread_id, user_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_participant_id;

  RETURN v_participant_id;
END;
$$;

ALTER FUNCTION public.inbox_upsert_participant_user(uuid)
OWNER TO postgres;

-- RPC: List threads --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_list_threads(
  p_limit integer DEFAULT 20,
  p_cursor timestamptz DEFAULT NULL,
  p_search text DEFAULT NULL,
  p_thread_id uuid DEFAULT NULL
)
RETURNS TABLE (
  thread_id uuid,
  social_account_id uuid,
  account_provider text,
  account_label text,
  latest_message jsonb,
  unread_count integer,
  total_messages integer,
  last_message_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_limit integer := GREATEST(COALESCE(p_limit, 20), 1);
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  RETURN QUERY
  WITH base AS (
    SELECT
      t.id,
      t.social_account_id,
      sa.provider AS account_provider,
      COALESCE(sa.account_name, lbl.name, t.subject, 'Inbox') AS account_label,
      t.last_message_at,
      participant.last_read_at,
      (
        SELECT jsonb_build_object(
          'id', m.id,
          'content', m.content,
          'author_name', m.author_name,
          'author_handle', m.author_handle,
          'author_avatar_url', m.author_avatar_url,
          'created_at', m.created_at,
          'is_read', (participant.last_read_at IS NOT NULL AND m.created_at <= participant.last_read_at),
          'provider_message_id', m.provider_message_id
        )
        FROM public.inbox_messages m
        WHERE m.thread_id = t.id
        ORDER BY m.created_at DESC
        LIMIT 1
      ) AS latest_message,
      (
        SELECT COUNT(*)
        FROM public.inbox_messages m
        WHERE m.thread_id = t.id
      ) AS total_messages,
      (
        SELECT COUNT(*)
        FROM public.inbox_messages m
        WHERE m.thread_id = t.id
          AND (participant.last_read_at IS NULL OR m.created_at > participant.last_read_at)
          AND (m.author_user_id IS NULL OR m.author_user_id <> v_uid)
      ) AS unread_count
    FROM public.inbox_threads t
    LEFT JOIN LATERAL public.inbox_get_social_account_details(t.social_account_id) sa ON TRUE
    LEFT JOIN public.labels lbl ON lbl.id = t.label_id
    LEFT JOIN public.inbox_thread_participants participant
      ON participant.thread_id = t.id AND participant.user_id = v_uid
    WHERE public.inbox_user_can_access_thread(t.id)
      AND (p_thread_id IS NULL OR t.id = p_thread_id)
      AND (p_cursor IS NULL OR (t.last_message_at IS NOT NULL AND t.last_message_at < p_cursor))
      AND (
        p_search IS NULL OR p_search = '' OR
        COALESCE(sa.account_name, lbl.name, t.subject, '') ILIKE '%' || p_search || '%'
        OR EXISTS (
          SELECT 1 FROM public.inbox_messages m
          WHERE m.thread_id = t.id AND m.content ILIKE '%' || p_search || '%'
        )
      )
  )
  SELECT
    id AS thread_id,
    social_account_id,
    account_provider,
    account_label,
    latest_message,
    unread_count,
    total_messages,
    last_message_at
  FROM base
  ORDER BY last_message_at DESC NULLS LAST, id DESC
  LIMIT CASE WHEN p_thread_id IS NOT NULL THEN 1 ELSE v_limit END;
END;
$$;

ALTER FUNCTION public.inbox_list_threads(integer, timestamptz, text, uuid)
OWNER TO postgres;

-- RPC: Fetch messages ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_get_thread_messages(
  p_thread_id uuid,
  p_limit integer DEFAULT 30,
  p_cursor timestamptz DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  thread_id uuid,
  social_account_id uuid,
  provider_message_id text,
  provider_thread_id text,
  content text,
  author_id text,
  author_name text,
  author_handle text,
  author_avatar_url text,
  created_at timestamptz,
  is_read boolean,
  requires_response boolean,
  media_urls text[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_limit integer := GREATEST(COALESCE(p_limit, 30), 1);
  v_last_read timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  PERFORM public.inbox_assert_thread_access(p_thread_id);

  SELECT last_read_at
  INTO v_last_read
  FROM public.inbox_thread_participants
  WHERE thread_id = p_thread_id AND user_id = v_uid;

  RETURN QUERY
  SELECT
    m.id,
    m.thread_id,
    m.social_account_id,
    m.provider_message_id,
    m.provider_thread_id,
    m.content,
    COALESCE(m.author_user_id::text, m.author_external_id, '') AS author_id,
    m.author_name,
    m.author_handle,
    m.author_avatar_url,
    m.created_at,
    (v_last_read IS NOT NULL AND m.created_at <= v_last_read) AS is_read,
    m.requires_response,
    m.media_urls
  FROM public.inbox_messages m
  WHERE m.thread_id = p_thread_id
    AND (p_cursor IS NULL OR m.created_at < p_cursor)
  ORDER BY m.created_at DESC, m.id DESC
  LIMIT v_limit;
END;
$$;

ALTER FUNCTION public.inbox_get_thread_messages(uuid, integer, timestamptz)
OWNER TO postgres;

-- RPC: Send message --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_send_message(
  p_thread_id uuid,
  p_content text,
  p_social_account_id uuid DEFAULT NULL,
  p_media_urls text[] DEFAULT NULL,
  p_metadata jsonb DEFAULT NULL
)
RETURNS public.inbox_messages
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_participant_id uuid;
  v_profile record;
  v_thread record;
  v_media text[] := COALESCE(p_media_urls, ARRAY[]::text[]);
  v_metadata jsonb := COALESCE(p_metadata, '{}'::jsonb);
  v_message public.inbox_messages;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  IF COALESCE(trim(p_content), '') = '' THEN
    RAISE EXCEPTION 'Message content required' USING ERRCODE = '23514';
  END IF;

  PERFORM public.inbox_assert_thread_access(p_thread_id);

  SELECT *
  INTO v_thread
  FROM public.inbox_threads
  WHERE id = p_thread_id;

  IF v_thread IS NULL THEN
    RAISE EXCEPTION 'Thread % not found', p_thread_id USING ERRCODE = 'P0002';
  END IF;

  IF p_social_account_id IS NOT NULL AND p_social_account_id <> v_thread.social_account_id THEN
    RAISE EXCEPTION 'Social account mismatch for thread %', p_thread_id USING ERRCODE = '23514';
  END IF;

  v_participant_id := public.inbox_upsert_participant_user(p_thread_id);

  SELECT p.full_name, p.username, p.avatar_url
  INTO v_profile
  FROM public.profiles p
  WHERE p.user_id = v_uid;

  INSERT INTO public.inbox_messages (
    thread_id,
    social_account_id,
    provider_thread_id,
    author_participant_id,
    author_user_id,
    author_name,
    author_handle,
    author_avatar_url,
    content,
    media_urls,
    metadata
  )
  VALUES (
    p_thread_id,
    COALESCE(p_social_account_id, v_thread.social_account_id),
    v_thread.metadata->>'provider_thread_id',
    v_participant_id,
    v_uid,
    COALESCE(v_profile.full_name, v_profile.username, 'You'),
    v_profile.username,
    v_profile.avatar_url,
    trim(p_content),
    v_media,
    v_metadata
  )
  RETURNING * INTO v_message;

  UPDATE public.inbox_thread_participants
  SET last_read_at = v_message.created_at
  WHERE id = v_participant_id;

  RETURN v_message;
END;
$$;

ALTER FUNCTION public.inbox_send_message(uuid, text, uuid, text[], jsonb)
OWNER TO postgres;

-- RPC: Mark thread read ----------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_mark_thread_read(p_thread_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_last_message timestamptz;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Authentication required' USING ERRCODE = '28000';
  END IF;

  PERFORM public.inbox_assert_thread_access(p_thread_id);

  SELECT max(created_at)
  INTO v_last_message
  FROM public.inbox_messages
  WHERE thread_id = p_thread_id;

  INSERT INTO public.inbox_thread_participants (thread_id, user_id, role, last_read_at)
  VALUES (p_thread_id, v_uid, 'member', v_last_message)
  ON CONFLICT (thread_id, user_id) DO UPDATE
  SET last_read_at = v_last_message,
      updated_at = now();
END;
$$;

ALTER FUNCTION public.inbox_mark_thread_read(uuid)
OWNER TO postgres;

-- RPC: Unread count --------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_unread_count()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total integer;
BEGIN
  IF v_uid IS NULL THEN
    RETURN 0;
  END IF;

  WITH accessible_threads AS (
    SELECT t.id
    FROM public.inbox_threads t
    WHERE public.inbox_user_can_access_thread(t.id)
  ), last_reads AS (
    SELECT thread_id, last_read_at
    FROM public.inbox_thread_participants
    WHERE user_id = v_uid
  )
  SELECT COALESCE(SUM(cnt), 0)
  INTO v_total
  FROM (
    SELECT
      t.id,
      (
        SELECT COUNT(*)
        FROM public.inbox_messages m
        WHERE m.thread_id = t.id
          AND (lr.last_read_at IS NULL OR m.created_at > lr.last_read_at)
          AND (m.author_user_id IS NULL OR m.author_user_id <> v_uid)
      ) AS cnt
    FROM accessible_threads t
    LEFT JOIN last_reads lr ON lr.thread_id = t.id
  ) AS counts;

  RETURN COALESCE(v_total, 0);
END;
$$;

ALTER FUNCTION public.inbox_unread_count()
OWNER TO postgres;

-- Realtime publication -----------------------------------------------------------
DO $$
DECLARE
  v_stmt text;
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOR v_stmt IN SELECT format('ALTER PUBLICATION supabase_realtime ADD TABLE %I.%I', schemaname, tablename)
      FROM (VALUES
        ('public', 'inbox_threads'),
        ('public', 'inbox_thread_participants'),
        ('public', 'inbox_messages')
      ) AS t(schemaname, tablename)
      WHERE NOT EXISTS (
        SELECT 1
        FROM pg_publication_tables pt
        WHERE pt.pubname = 'supabase_realtime'
          AND pt.schemaname = t.schemaname
          AND pt.tablename = t.tablename
      )
    LOOP
      EXECUTE v_stmt;
    END LOOP;
  END IF;
END
$$;

-- Trigger to fan out realtime notifications -------------------------------------
CREATE OR REPLACE FUNCTION public.inbox_broadcast_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM pg_notify(
    'realtime',
    json_build_object(
      'schema', 'public',
      'table', 'inbox_messages_events',
      'type', TG_OP,
      'record', json_build_object(
        'id', NEW.id,
        'thread_id', NEW.thread_id,
        'created_at', NEW.created_at
      )
    )::text
  );
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_inbox_messages_broadcast
AFTER INSERT ON public.inbox_messages
FOR EACH ROW
EXECUTE FUNCTION public.inbox_broadcast_message();

