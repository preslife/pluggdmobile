-- PLUGGD iOS mobile gap contracts.
-- Adds backend primitives needed by the consumer-first mobile app without
-- replacing existing favorites, event RSVP, ticket, StoreKit, wallet, or live
-- session contracts.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

CREATE OR REPLACE FUNCTION public.pluggd_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Generic saved content for the surfaces that are not beat/release favorites:
-- videos, mixes, events, communities, creators, live rooms, posts, packs, etc.
CREATE TABLE IF NOT EXISTS public.saved_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content_type text NOT NULL,
  content_id uuid NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT saved_content_content_type_check CHECK (
    content_type IN (
      'release',
      'beat',
      'mix',
      'playlist',
      'video',
      'event',
      'community',
      'profile',
      'live_room',
      'post',
      'sample_pack',
      'soundboard'
    )
  )
);

ALTER TABLE public.saved_content ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS saved_content_user_content_idx
  ON public.saved_content (user_id, content_type, content_id);
CREATE INDEX IF NOT EXISTS saved_content_user_created_idx
  ON public.saved_content (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS saved_content_content_idx
  ON public.saved_content (content_type, content_id);

DROP TRIGGER IF EXISTS saved_content_set_updated_at ON public.saved_content;
CREATE TRIGGER saved_content_set_updated_at
  BEFORE UPDATE ON public.saved_content
  FOR EACH ROW
  EXECUTE FUNCTION public.pluggd_set_updated_at();

DROP POLICY IF EXISTS "saved_content_select_own" ON public.saved_content;
CREATE POLICY "saved_content_select_own"
  ON public.saved_content FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "saved_content_insert_own" ON public.saved_content;
CREATE POLICY "saved_content_insert_own"
  ON public.saved_content FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "saved_content_update_own" ON public.saved_content;
CREATE POLICY "saved_content_update_own"
  ON public.saved_content FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "saved_content_delete_own" ON public.saved_content;
CREATE POLICY "saved_content_delete_own"
  ON public.saved_content FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.saved_content TO authenticated;

CREATE OR REPLACE FUNCTION public.toggle_saved_content(
  p_content_type text,
  p_content_id uuid,
  p_saved boolean DEFAULT NULL,
  p_metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS TABLE(saved boolean, saved_id uuid)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_existing_id uuid;
  v_saved boolean;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_content_type NOT IN (
    'release',
    'beat',
    'mix',
    'playlist',
    'video',
    'event',
    'community',
    'profile',
    'live_room',
    'post',
    'sample_pack',
    'soundboard'
  ) THEN
    RAISE EXCEPTION 'Unsupported saved content type %', p_content_type;
  END IF;

  SELECT sc.id
  INTO v_existing_id
  FROM public.saved_content sc
  WHERE sc.user_id = v_user
    AND sc.content_type = p_content_type
    AND sc.content_id = p_content_id
  LIMIT 1;

  v_saved := COALESCE(p_saved, v_existing_id IS NULL);

  IF v_saved THEN
    INSERT INTO public.saved_content (user_id, content_type, content_id, metadata)
    VALUES (v_user, p_content_type, p_content_id, COALESCE(p_metadata, '{}'::jsonb))
    ON CONFLICT (user_id, content_type, content_id)
    DO UPDATE SET
      metadata = public.saved_content.metadata || EXCLUDED.metadata,
      updated_at = now()
    RETURNING id INTO v_existing_id;
  ELSE
    DELETE FROM public.saved_content
    WHERE user_id = v_user
      AND content_type = p_content_type
      AND content_id = p_content_id;
    v_existing_id := NULL;
  END IF;

  RETURN QUERY SELECT v_saved, v_existing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.toggle_saved_content(text, uuid, boolean, jsonb) TO authenticated;

-- The web/live stack already writes session-scoped reminders. Mobile also
-- routes through session_rooms, so reminders need an optional room_id target.
CREATE TABLE IF NOT EXISTS public.live_session_reminders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid,
  room_id uuid,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reminder_type text NOT NULL DEFAULT 'push',
  send_at timestamptz NOT NULL,
  ics_url text,
  title text,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.live_session_reminders
  ADD COLUMN IF NOT EXISTS room_id uuid,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

ALTER TABLE public.live_session_reminders
  ALTER COLUMN session_id DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'live_session_reminders_target_check'
  ) THEN
    ALTER TABLE public.live_session_reminders
      ADD CONSTRAINT live_session_reminders_target_check
      CHECK (session_id IS NOT NULL OR room_id IS NOT NULL) NOT VALID;
  END IF;

  IF to_regclass('public.sessions') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'live_session_reminders_session_id_fkey'
    ) THEN
    ALTER TABLE public.live_session_reminders
      ADD CONSTRAINT live_session_reminders_session_id_fkey
      FOREIGN KEY (session_id) REFERENCES public.sessions(id) ON DELETE CASCADE;
  END IF;

  IF to_regclass('public.session_rooms') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'live_session_reminders_room_id_fkey'
    ) THEN
    ALTER TABLE public.live_session_reminders
      ADD CONSTRAINT live_session_reminders_room_id_fkey
      FOREIGN KEY (room_id) REFERENCES public.session_rooms(id) ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE public.live_session_reminders ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS live_session_reminders_user_session_idx
  ON public.live_session_reminders (user_id, session_id)
  WHERE session_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS live_session_reminders_user_room_idx
  ON public.live_session_reminders (user_id, room_id)
  WHERE room_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS live_session_reminders_send_at_idx
  ON public.live_session_reminders (status, send_at);

DROP TRIGGER IF EXISTS live_session_reminders_set_updated_at ON public.live_session_reminders;
CREATE TRIGGER live_session_reminders_set_updated_at
  BEFORE UPDATE ON public.live_session_reminders
  FOR EACH ROW
  EXECUTE FUNCTION public.pluggd_set_updated_at();

DROP POLICY IF EXISTS "live_session_reminders_select_own" ON public.live_session_reminders;
CREATE POLICY "live_session_reminders_select_own"
  ON public.live_session_reminders FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "live_session_reminders_insert_own" ON public.live_session_reminders;
CREATE POLICY "live_session_reminders_insert_own"
  ON public.live_session_reminders FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "live_session_reminders_update_own" ON public.live_session_reminders;
CREATE POLICY "live_session_reminders_update_own"
  ON public.live_session_reminders FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "live_session_reminders_delete_own" ON public.live_session_reminders;
CREATE POLICY "live_session_reminders_delete_own"
  ON public.live_session_reminders FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.live_session_reminders TO authenticated;

CREATE OR REPLACE FUNCTION public.set_live_room_reminder(
  p_room_id uuid,
  p_enabled boolean,
  p_send_at timestamptz DEFAULT NULL,
  p_title text DEFAULT NULL
)
RETURNS TABLE(reminded boolean, reminder_id uuid)
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_existing_id uuid;
  v_send_at timestamptz := COALESCE(p_send_at, now() + interval '1 hour');
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  SELECT lsr.id
  INTO v_existing_id
  FROM public.live_session_reminders lsr
  WHERE lsr.user_id = v_user
    AND lsr.room_id = p_room_id
  LIMIT 1;

  IF NOT p_enabled THEN
    IF v_existing_id IS NOT NULL THEN
      UPDATE public.live_session_reminders
      SET status = 'cancelled'
      WHERE id = v_existing_id;
    END IF;

    RETURN QUERY SELECT false, v_existing_id;
    RETURN;
  END IF;

  IF v_existing_id IS NULL THEN
    INSERT INTO public.live_session_reminders (
      user_id,
      room_id,
      reminder_type,
      send_at,
      status,
      title
    )
    VALUES (
      v_user,
      p_room_id,
      'push',
      v_send_at,
      'active',
      COALESCE(p_title, 'PLUGGD live room')
    )
    RETURNING id INTO v_existing_id;
  ELSE
    UPDATE public.live_session_reminders
    SET
      send_at = v_send_at,
      status = 'active',
      title = COALESCE(p_title, title)
    WHERE id = v_existing_id;
  END IF;

  RETURN QUERY SELECT true, v_existing_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_live_room_reminder(uuid, boolean, timestamptz, text) TO authenticated;

-- Native mobile push tokens. Existing web_push_subscriptions remain for web.
CREATE TABLE IF NOT EXISTS public.mobile_push_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  platform text NOT NULL,
  expo_push_token text NOT NULL,
  device_id text,
  app_version text,
  environment text NOT NULL DEFAULT 'production',
  is_active boolean NOT NULL DEFAULT true,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mobile_push_tokens_platform_check CHECK (platform IN ('ios', 'android'))
);

ALTER TABLE public.mobile_push_tokens ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'mobile_push_tokens_user_platform_token_key'
  ) THEN
    ALTER TABLE public.mobile_push_tokens
      ADD CONSTRAINT mobile_push_tokens_user_platform_token_key
      UNIQUE (user_id, platform, expo_push_token);
  END IF;
END;
$$;

CREATE INDEX IF NOT EXISTS mobile_push_tokens_user_active_idx
  ON public.mobile_push_tokens (user_id, is_active, last_seen_at DESC);

DROP TRIGGER IF EXISTS mobile_push_tokens_set_updated_at ON public.mobile_push_tokens;
CREATE TRIGGER mobile_push_tokens_set_updated_at
  BEFORE UPDATE ON public.mobile_push_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.pluggd_set_updated_at();

DROP POLICY IF EXISTS "mobile_push_tokens_select_own" ON public.mobile_push_tokens;
CREATE POLICY "mobile_push_tokens_select_own"
  ON public.mobile_push_tokens FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "mobile_push_tokens_insert_own" ON public.mobile_push_tokens;
CREATE POLICY "mobile_push_tokens_insert_own"
  ON public.mobile_push_tokens FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "mobile_push_tokens_update_own" ON public.mobile_push_tokens;
CREATE POLICY "mobile_push_tokens_update_own"
  ON public.mobile_push_tokens FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "mobile_push_tokens_delete_own" ON public.mobile_push_tokens;
CREATE POLICY "mobile_push_tokens_delete_own"
  ON public.mobile_push_tokens FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.mobile_push_tokens TO authenticated;

CREATE OR REPLACE FUNCTION public.upsert_mobile_push_token(
  p_expo_push_token text,
  p_platform text,
  p_device_id text DEFAULT NULL,
  p_app_version text DEFAULT NULL,
  p_environment text DEFAULT 'production'
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_platform NOT IN ('ios', 'android') THEN
    RAISE EXCEPTION 'Unsupported push platform %', p_platform;
  END IF;

  INSERT INTO public.mobile_push_tokens (
    user_id,
    platform,
    expo_push_token,
    device_id,
    app_version,
    environment,
    is_active,
    last_seen_at
  )
  VALUES (
    v_user,
    p_platform,
    p_expo_push_token,
    p_device_id,
    p_app_version,
    COALESCE(p_environment, 'production'),
    true,
    now()
  )
  ON CONFLICT (user_id, platform, expo_push_token)
  DO UPDATE SET
    device_id = EXCLUDED.device_id,
    app_version = EXCLUDED.app_version,
    environment = EXCLUDED.environment,
    is_active = true,
    last_seen_at = now(),
    updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.upsert_mobile_push_token(text, text, text, text, text) TO authenticated;

-- Short-form mobile clip upload metadata. Storage objects are stored in the
-- mobile-clips bucket under a user-id folder and the table controls visibility.
INSERT INTO storage.buckets (id, name, public)
VALUES ('mobile-clips', 'mobile-clips', true)
ON CONFLICT (id) DO UPDATE SET public = EXCLUDED.public;

CREATE TABLE IF NOT EXISTS public.mobile_clips (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  community_id uuid,
  event_id uuid,
  room_id uuid,
  storage_bucket text NOT NULL DEFAULT 'mobile-clips',
  storage_path text NOT NULL,
  thumbnail_path text,
  caption text,
  duration_seconds integer,
  status text NOT NULL DEFAULT 'pending',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT mobile_clips_status_check CHECK (status IN ('pending', 'published', 'removed'))
);

DO $$
BEGIN
  IF to_regclass('public.communities') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'mobile_clips_community_id_fkey'
    ) THEN
    ALTER TABLE public.mobile_clips
      ADD CONSTRAINT mobile_clips_community_id_fkey
      FOREIGN KEY (community_id) REFERENCES public.communities(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.events') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'mobile_clips_event_id_fkey'
    ) THEN
    ALTER TABLE public.mobile_clips
      ADD CONSTRAINT mobile_clips_event_id_fkey
      FOREIGN KEY (event_id) REFERENCES public.events(id) ON DELETE SET NULL;
  END IF;

  IF to_regclass('public.session_rooms') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'mobile_clips_room_id_fkey'
    ) THEN
    ALTER TABLE public.mobile_clips
      ADD CONSTRAINT mobile_clips_room_id_fkey
      FOREIGN KEY (room_id) REFERENCES public.session_rooms(id) ON DELETE SET NULL;
  END IF;
END;
$$;

ALTER TABLE public.mobile_clips ENABLE ROW LEVEL SECURITY;

CREATE UNIQUE INDEX IF NOT EXISTS mobile_clips_storage_path_idx
  ON public.mobile_clips (storage_bucket, storage_path);
CREATE INDEX IF NOT EXISTS mobile_clips_user_created_idx
  ON public.mobile_clips (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS mobile_clips_published_created_idx
  ON public.mobile_clips (status, created_at DESC)
  WHERE status = 'published';

DROP TRIGGER IF EXISTS mobile_clips_set_updated_at ON public.mobile_clips;
CREATE TRIGGER mobile_clips_set_updated_at
  BEFORE UPDATE ON public.mobile_clips
  FOR EACH ROW
  EXECUTE FUNCTION public.pluggd_set_updated_at();

DROP POLICY IF EXISTS "mobile_clips_public_published" ON public.mobile_clips;
CREATE POLICY "mobile_clips_public_published"
  ON public.mobile_clips FOR SELECT
  TO anon, authenticated
  USING (status = 'published' OR (SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "mobile_clips_insert_own" ON public.mobile_clips;
CREATE POLICY "mobile_clips_insert_own"
  ON public.mobile_clips FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "mobile_clips_update_own" ON public.mobile_clips;
CREATE POLICY "mobile_clips_update_own"
  ON public.mobile_clips FOR UPDATE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id)
  WITH CHECK ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "mobile_clips_delete_own" ON public.mobile_clips;
CREATE POLICY "mobile_clips_delete_own"
  ON public.mobile_clips FOR DELETE
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

GRANT SELECT ON public.mobile_clips TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.mobile_clips TO authenticated;

DROP POLICY IF EXISTS "mobile_clips_storage_public_read" ON storage.objects;
CREATE POLICY "mobile_clips_storage_public_read"
  ON storage.objects FOR SELECT
  TO anon, authenticated
  USING (bucket_id = 'mobile-clips');

DROP POLICY IF EXISTS "mobile_clips_storage_insert_own_folder" ON storage.objects;
CREATE POLICY "mobile_clips_storage_insert_own_folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'mobile-clips'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "mobile_clips_storage_update_own_folder" ON storage.objects;
CREATE POLICY "mobile_clips_storage_update_own_folder"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (
    bucket_id = 'mobile-clips'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "mobile_clips_storage_delete_own_folder" ON storage.objects;
CREATE POLICY "mobile_clips_storage_delete_own_folder"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'mobile-clips'
    AND (SELECT auth.uid())::text = (storage.foldername(name))[1]
  );

CREATE OR REPLACE FUNCTION public.create_mobile_clip_record(
  p_storage_path text,
  p_caption text DEFAULT NULL,
  p_community_id uuid DEFAULT NULL,
  p_event_id uuid DEFAULT NULL,
  p_room_id uuid DEFAULT NULL,
  p_thumbnail_path text DEFAULT NULL,
  p_duration_seconds integer DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SET search_path = public, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_id uuid;
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF p_storage_path IS NULL OR length(trim(p_storage_path)) = 0 THEN
    RAISE EXCEPTION 'Storage path is required';
  END IF;

  IF split_part(p_storage_path, '/', 1) <> v_user::text THEN
    RAISE EXCEPTION 'Clip path must live under the signed-in user folder';
  END IF;

  INSERT INTO public.mobile_clips (
    user_id,
    community_id,
    event_id,
    room_id,
    storage_path,
    thumbnail_path,
    caption,
    duration_seconds,
    status
  )
  VALUES (
    v_user,
    p_community_id,
    p_event_id,
    p_room_id,
    p_storage_path,
    p_thumbnail_path,
    p_caption,
    p_duration_seconds,
    'pending'
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.create_mobile_clip_record(text, text, uuid, uuid, uuid, text, integer) TO authenticated;

-- Dynamic entry tokens for tickets. Existing qr_code_data remains supported as
-- a static fallback; this adds short-lived opaque tokens that can rotate.
CREATE TABLE IF NOT EXISTS public.ticket_entry_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_order_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb
);

DO $$
BEGIN
  IF to_regclass('public.ticket_orders') IS NOT NULL
    AND NOT EXISTS (
      SELECT 1 FROM pg_constraint WHERE conname = 'ticket_entry_tokens_ticket_order_id_fkey'
    ) THEN
    ALTER TABLE public.ticket_entry_tokens
      ADD CONSTRAINT ticket_entry_tokens_ticket_order_id_fkey
      FOREIGN KEY (ticket_order_id) REFERENCES public.ticket_orders(id) ON DELETE CASCADE;
  END IF;
END;
$$;

ALTER TABLE public.ticket_entry_tokens ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS ticket_entry_tokens_order_created_idx
  ON public.ticket_entry_tokens (ticket_order_id, created_at DESC);
CREATE INDEX IF NOT EXISTS ticket_entry_tokens_user_expires_idx
  ON public.ticket_entry_tokens (user_id, expires_at DESC);

DROP POLICY IF EXISTS "ticket_entry_tokens_select_own" ON public.ticket_entry_tokens;
CREATE POLICY "ticket_entry_tokens_select_own"
  ON public.ticket_entry_tokens FOR SELECT
  TO authenticated
  USING ((SELECT auth.uid()) = user_id);

DROP POLICY IF EXISTS "ticket_entry_tokens_insert_own" ON public.ticket_entry_tokens;
CREATE POLICY "ticket_entry_tokens_insert_own"
  ON public.ticket_entry_tokens FOR INSERT
  TO authenticated
  WITH CHECK ((SELECT auth.uid()) = user_id);

GRANT SELECT, INSERT, UPDATE ON public.ticket_entry_tokens TO authenticated;

CREATE OR REPLACE FUNCTION public.issue_ticket_entry_token(p_ticket_order_id uuid)
RETURNS TABLE(payload text, expires_at timestamptz)
LANGUAGE plpgsql
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_user uuid := auth.uid();
  v_order_user uuid;
  v_token text;
  v_hash text;
  v_expires timestamptz := now() + interval '15 seconds';
BEGIN
  IF v_user IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF to_regclass('public.ticket_orders') IS NULL THEN
    RAISE EXCEPTION 'ticket_orders table is not available';
  END IF;

  EXECUTE 'SELECT user_id FROM public.ticket_orders WHERE id = $1'
  INTO v_order_user
  USING p_ticket_order_id;

  IF v_order_user IS NULL OR v_order_user <> v_user THEN
    RAISE EXCEPTION 'Ticket order is not available for this account';
  END IF;

  v_token := encode(extensions.gen_random_bytes(32), 'hex');
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  INSERT INTO public.ticket_entry_tokens (
    ticket_order_id,
    user_id,
    token_hash,
    expires_at
  )
  VALUES (
    p_ticket_order_id,
    v_user,
    v_hash,
    v_expires
  );

  RETURN QUERY SELECT 'pluggd-ticket-v1:' || p_ticket_order_id::text || ':' || v_token, v_expires;
END;
$$;

GRANT EXECUTE ON FUNCTION public.issue_ticket_entry_token(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.verify_ticket_entry_token(p_payload text)
RETURNS TABLE(
  ticket_order_id uuid,
  event_id uuid,
  ticket_user_id uuid,
  ticket_status text,
  checked_in_at timestamptz,
  valid boolean,
  reason text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  v_scanner uuid := auth.uid();
  v_parts text[];
  v_order_id uuid;
  v_token text;
  v_hash text;
  v_token_row public.ticket_entry_tokens%ROWTYPE;
  v_event_creator uuid;
  v_is_privileged boolean := false;
BEGIN
  IF v_scanner IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;

  IF to_regclass('public.ticket_orders') IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::timestamptz, false, 'ticket_orders table is not available';
    RETURN;
  END IF;

  v_parts := string_to_array(COALESCE(p_payload, ''), ':');
  IF array_length(v_parts, 1) <> 3 OR v_parts[1] <> 'pluggd-ticket-v1' THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::timestamptz, false, 'Invalid dynamic ticket payload';
    RETURN;
  END IF;

  BEGIN
    v_order_id := v_parts[2]::uuid;
  EXCEPTION WHEN others THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, NULL::text, NULL::timestamptz, false, 'Invalid ticket order id';
    RETURN;
  END;

  v_token := v_parts[3];
  v_hash := encode(extensions.digest(v_token, 'sha256'), 'hex');

  SELECT *
  INTO v_token_row
  FROM public.ticket_entry_tokens
  WHERE ticket_order_id = v_order_id
    AND token_hash = v_hash
  LIMIT 1;

  IF v_token_row.id IS NULL THEN
    RETURN QUERY SELECT v_order_id, NULL::uuid, NULL::uuid, NULL::text, NULL::timestamptz, false, 'Ticket token not found';
    RETURN;
  END IF;

  IF v_token_row.expires_at < now() THEN
    RETURN QUERY SELECT v_order_id, NULL::uuid, v_token_row.user_id, NULL::text, NULL::timestamptz, false, 'Ticket token expired';
    RETURN;
  END IF;

  EXECUTE 'SELECT event_id, user_id, status, checked_in_at FROM public.ticket_orders WHERE id = $1'
  INTO event_id, ticket_user_id, ticket_status, checked_in_at
  USING v_order_id;

  IF event_id IS NULL THEN
    RETURN QUERY SELECT v_order_id, NULL::uuid, v_token_row.user_id, NULL::text, NULL::timestamptz, false, 'Ticket order not found';
    RETURN;
  END IF;

  IF to_regclass('public.events') IS NOT NULL THEN
    BEGIN
      EXECUTE 'SELECT created_by FROM public.events WHERE id = $1'
      INTO v_event_creator
      USING event_id;
    EXCEPTION WHEN undefined_column THEN
      v_event_creator := NULL;
    END;
  END IF;

  IF to_regclass('public.user_roles') IS NOT NULL THEN
    BEGIN
      EXECUTE 'SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = $1 AND role::text IN (''admin'', ''promoter'', ''venue''))'
      INTO v_is_privileged
      USING v_scanner;
    EXCEPTION WHEN others THEN
      v_is_privileged := false;
    END;
  END IF;

  IF v_scanner <> ticket_user_id
    AND COALESCE(v_event_creator, '00000000-0000-0000-0000-000000000000'::uuid) <> v_scanner
    AND NOT v_is_privileged THEN
    RETURN QUERY SELECT v_order_id, event_id, ticket_user_id, ticket_status, checked_in_at, false, 'Scanner is not authorized for this ticket';
    RETURN;
  END IF;

  BEGIN
    EXECUTE 'UPDATE public.ticket_orders SET checked_in_at = COALESCE(checked_in_at, now()) WHERE id = $1 RETURNING checked_in_at'
    INTO checked_in_at
    USING v_order_id;
  EXCEPTION WHEN undefined_column THEN
    checked_in_at := NULL;
  END;

  UPDATE public.ticket_entry_tokens
  SET used_at = COALESCE(used_at, now())
  WHERE id = v_token_row.id;

  RETURN QUERY SELECT v_order_id, event_id, ticket_user_id, ticket_status, checked_in_at, true, 'Ticket verified';
END;
$$;

GRANT EXECUTE ON FUNCTION public.verify_ticket_entry_token(text) TO authenticated;
