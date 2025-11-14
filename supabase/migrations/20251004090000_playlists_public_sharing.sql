-- Milestone E1: Public playlists & sharing

-- Extend playlists with slug/share code metadata
ALTER TABLE public.playlists
  ADD COLUMN IF NOT EXISTS slug TEXT,
  ADD COLUMN IF NOT EXISTS share_code TEXT UNIQUE;

-- Ensure tags and cover_art defaults
ALTER TABLE public.playlists
  ALTER COLUMN tags SET DEFAULT '{}'::text[],
  ALTER COLUMN cover_art_url SET DEFAULT NULL;

-- Generate slugs/share codes for existing rows
DO $$
DECLARE
  rec RECORD;
  base_slug TEXT;
  next_slug TEXT;
  counter INTEGER;
BEGIN
  FOR rec IN SELECT id, user_id, name FROM public.playlists LOOP
    IF rec.name IS NULL OR trim(rec.name) = '' THEN
      base_slug := substring(rec.id::text FROM 1 FOR 8);
    ELSE
      base_slug := regexp_replace(lower(rec.name), '[^a-z0-9]+', '-', 'g');
      base_slug := trim(BOTH '-' FROM base_slug);
    END IF;

    IF base_slug = '' THEN
      base_slug := substring(rec.id::text FROM 1 FOR 8);
    END IF;

    next_slug := base_slug;
    counter := 1;
    WHILE EXISTS (
      SELECT 1 FROM public.playlists
      WHERE user_id = rec.user_id AND slug = next_slug AND id <> rec.id
    ) LOOP
      counter := counter + 1;
      next_slug := base_slug || '-' || counter;
    END LOOP;

    UPDATE public.playlists
    SET slug = next_slug,
        share_code = COALESCE(share_code, encode(gen_random_bytes(6), 'hex'))
    WHERE id = rec.id;
  END LOOP;
END;
$$;

-- Enforce uniqueness per user
CREATE UNIQUE INDEX IF NOT EXISTS playlists_user_slug_unique
  ON public.playlists(user_id, slug)
  WHERE slug IS NOT NULL;

-- Playlist collaborator improvements --------------------------------------
ALTER TABLE public.playlist_collaborators
  ALTER COLUMN role SET DEFAULT 'editor',
  ALTER COLUMN invited_at SET DEFAULT now();

-- Helper functions ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.generate_playlist_slug(
  p_playlist_id UUID,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_owner UUID;
  v_name TEXT;
  v_slug TEXT;
  v_counter INTEGER := 1;
  v_base TEXT;
BEGIN
  SELECT user_id, name
  INTO v_owner, v_name
  FROM public.playlists
  WHERE id = p_playlist_id;

  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'Playlist not found';
  END IF;

  IF p_user_id IS NULL OR p_user_id <> v_owner THEN
    RAISE EXCEPTION 'You do not own this playlist';
  END IF;

  v_base := regexp_replace(lower(COALESCE(NULLIF(v_name, ''), substring(p_playlist_id::text FROM 1 FOR 8))), '[^a-z0-9]+', '-', 'g');
  v_base := trim(BOTH '-' FROM v_base);
  IF v_base = '' THEN
    v_base := substring(p_playlist_id::text FROM 1 FOR 8);
  END IF;

  v_slug := v_base;
  WHILE EXISTS (
    SELECT 1 FROM public.playlists
    WHERE user_id = v_owner AND slug = v_slug AND id <> p_playlist_id
  ) LOOP
    v_counter := v_counter + 1;
    v_slug := v_base || '-' || v_counter;
  END LOOP;

  UPDATE public.playlists
  SET slug = v_slug
  WHERE id = p_playlist_id;

  RETURN v_slug;
END;
$$;

GRANT EXECUTE ON FUNCTION public.generate_playlist_slug(UUID, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.set_playlist_visibility(
  p_playlist_id UUID,
  p_visibility TEXT,
  p_user_id UUID DEFAULT auth.uid()
)
RETURNS public.playlists
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_playlist public.playlists%ROWTYPE;
  v_share_code TEXT;
BEGIN
  SELECT * INTO v_playlist FROM public.playlists WHERE id = p_playlist_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Playlist not found';
  END IF;

  IF p_user_id IS NULL OR p_user_id <> v_playlist.user_id THEN
    RAISE EXCEPTION 'You do not own this playlist';
  END IF;

  IF p_visibility NOT IN ('public', 'unlisted', 'private') THEN
    RAISE EXCEPTION 'Invalid visibility %', p_visibility;
  END IF;

  IF v_playlist.slug IS NULL THEN
    PERFORM public.generate_playlist_slug(p_playlist_id, p_user_id);
    SELECT * INTO v_playlist FROM public.playlists WHERE id = p_playlist_id;
  END IF;

  IF p_visibility = 'unlisted' THEN
    v_share_code := encode(gen_random_bytes(6), 'hex');
  ELSE
    v_share_code := NULL;
  END IF;

  UPDATE public.playlists
  SET visibility = p_visibility,
      share_code = COALESCE(v_share_code, share_code)
  WHERE id = p_playlist_id;

  RETURN (SELECT * FROM public.playlists WHERE id = p_playlist_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_playlist_visibility(UUID, TEXT, UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_playlist_for_public(
  p_slug TEXT,
  p_share_code TEXT DEFAULT NULL
)
RETURNS TABLE (
  playlist_id UUID,
  name TEXT,
  description TEXT,
  cover_art_url TEXT,
  visibility TEXT,
  collaborative BOOLEAN,
  owner_id UUID
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF p_slug IS NULL THEN
    RAISE EXCEPTION 'slug is required';
  END IF;

  RETURN QUERY
  SELECT id, name, description, cover_art_url, visibility, collaborative, user_id
  FROM public.playlists
  WHERE slug = p_slug
    AND (
      visibility = 'public'
      OR (visibility = 'unlisted' AND p_share_code IS NOT NULL AND share_code = p_share_code)
    );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_playlist_for_public(TEXT, TEXT) TO anon, authenticated;

-- Collaborator helpers ------------------------------------------------------
CREATE OR REPLACE FUNCTION public.can_edit_playlist(p_playlist_id UUID, p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  IF p_user_id IS NULL THEN
    RETURN FALSE;
  END IF;
  RETURN EXISTS (
    SELECT 1
    FROM public.playlists
    WHERE id = p_playlist_id AND user_id = p_user_id
  )
  OR EXISTS (
    SELECT 1
    FROM public.playlist_collaborators
    WHERE playlist_id = p_playlist_id AND user_id = p_user_id AND role IN ('editor', 'owner')
  );
END;
$$;

-- Ensure helper can run in RLS
GRANT EXECUTE ON FUNCTION public.can_edit_playlist(UUID, UUID) TO authenticated;

-- Update playlist items policies to rely on helper
DROP POLICY IF EXISTS "Users can manage items in their playlists" ON public.playlist_items;
DROP POLICY IF EXISTS "Playlist items viewable if playlist is accessible" ON public.playlist_items;

CREATE POLICY "Users can manage items in their playlists"
ON public.playlist_items
FOR ALL
USING (public.can_edit_playlist(playlist_id, auth.uid()));

CREATE POLICY "Playlist items viewable if playlist is accessible"
ON public.playlist_items
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.playlists p
    WHERE p.id = playlist_items.playlist_id
      AND (
        p.visibility = 'public'
        OR (p.visibility = 'unlisted' AND p.share_code IS NOT NULL)
        OR p.user_id = auth.uid()
        OR public.is_playlist_collaborator(p.id, auth.uid())
      )
  )
);
