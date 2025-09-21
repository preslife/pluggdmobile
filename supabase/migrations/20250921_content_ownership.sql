-- Add content ownership fields to support publishing as personal or label
-- This allows creators to choose whether content is published under their personal brand or label

-- Add ownership columns to tracks table
ALTER TABLE public.tracks
ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'profile'
  CHECK (owner_type IN ('profile', 'label')),
ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Migrate existing data - set owner_id to profile_id for existing tracks
UPDATE public.tracks
SET owner_id = profile_id
WHERE owner_id IS NULL;

-- Add index for owner lookups
CREATE INDEX IF NOT EXISTS idx_tracks_owner
ON public.tracks(owner_type, owner_id);

-- Add ownership columns to releases table
ALTER TABLE public.releases
ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'profile'
  CHECK (owner_type IN ('profile', 'label')),
ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Migrate existing data for releases
UPDATE public.releases
SET owner_id = profile_id
WHERE owner_id IS NULL;

-- Add index for owner lookups
CREATE INDEX IF NOT EXISTS idx_releases_owner
ON public.releases(owner_type, owner_id);

-- Add ownership columns to posts table
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS owner_type text DEFAULT 'profile'
  CHECK (owner_type IN ('profile', 'label')),
ADD COLUMN IF NOT EXISTS owner_id uuid;

-- Migrate existing data for posts
UPDATE public.posts
SET owner_id = profile_id
WHERE owner_id IS NULL;

-- Add index for owner lookups
CREATE INDEX IF NOT EXISTS idx_posts_owner
ON public.posts(owner_type, owner_id);

-- Function to get content by owner
CREATE OR REPLACE FUNCTION public.get_content_by_owner(
  p_owner_type text,
  p_owner_id uuid,
  p_content_type text DEFAULT NULL,
  p_limit integer DEFAULT 50,
  p_offset integer DEFAULT 0
)
RETURNS TABLE (
  content_type text,
  content_id uuid,
  title text,
  created_at timestamptz,
  is_gated boolean,
  stats jsonb
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF p_content_type IS NULL OR p_content_type = 'tracks' THEN
    RETURN QUERY
    SELECT
      'track'::text as content_type,
      t.id as content_id,
      t.title,
      t.created_at,
      EXISTS (
        SELECT 1 FROM public.gated_content gc
        WHERE gc.content_type = 'track'
        AND gc.content_id = t.id
      ) as is_gated,
      jsonb_build_object(
        'plays', COALESCE(t.play_count, 0),
        'likes', COALESCE(t.like_count, 0)
      ) as stats
    FROM public.tracks t
    WHERE t.owner_type = p_owner_type
      AND t.owner_id = p_owner_id
      AND t.visibility = 'public'
    ORDER BY t.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;

  IF p_content_type IS NULL OR p_content_type = 'releases' THEN
    RETURN QUERY
    SELECT
      'release'::text as content_type,
      r.id as content_id,
      r.title,
      r.created_at,
      EXISTS (
        SELECT 1 FROM public.gated_content gc
        WHERE gc.content_type = 'release'
        AND gc.content_id = r.id
      ) as is_gated,
      jsonb_build_object(
        'tracks', (
          SELECT COUNT(*) FROM public.release_tracks
          WHERE release_id = r.id
        )
      ) as stats
    FROM public.releases r
    WHERE r.owner_type = p_owner_type
      AND r.owner_id = p_owner_id
      AND r.status = 'published'
    ORDER BY r.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;

  IF p_content_type IS NULL OR p_content_type = 'posts' THEN
    RETURN QUERY
    SELECT
      'post'::text as content_type,
      p.id as content_id,
      p.title,
      p.created_at,
      EXISTS (
        SELECT 1 FROM public.gated_content gc
        WHERE gc.content_type = 'post'
        AND gc.content_id = p.id
      ) as is_gated,
      jsonb_build_object(
        'likes', COALESCE(p.like_count, 0),
        'comments', COALESCE(p.comment_count, 0)
      ) as stats
    FROM public.posts p
    WHERE p.owner_type = p_owner_type
      AND p.owner_id = p_owner_id
      AND p.published = true
    ORDER BY p.created_at DESC
    LIMIT p_limit
    OFFSET p_offset;
  END IF;
END;
$$;

-- Function to transfer content ownership
CREATE OR REPLACE FUNCTION public.transfer_content_ownership(
  p_content_type text,
  p_content_id uuid,
  p_new_owner_type text,
  p_new_owner_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_can_transfer boolean := false;
BEGIN
  -- Check permissions
  IF p_new_owner_type = 'profile' THEN
    -- Transferring to profile - must be the user's profile
    SELECT EXISTS (
      SELECT 1 FROM public.profiles
      WHERE id = p_new_owner_id
      AND user_id = v_user_id
    ) INTO v_can_transfer;
  ELSE
    -- Transferring to label - must be owner/admin
    SELECT EXISTS (
      SELECT 1 FROM public.label_members
      WHERE label_id = p_new_owner_id
      AND user_id = v_user_id
      AND role IN ('owner', 'admin')
    ) INTO v_can_transfer;
  END IF;

  IF NOT v_can_transfer THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  -- Transfer ownership based on content type
  CASE p_content_type
    WHEN 'track' THEN
      UPDATE public.tracks
      SET owner_type = p_new_owner_type,
          owner_id = p_new_owner_id
      WHERE id = p_content_id;

    WHEN 'release' THEN
      UPDATE public.releases
      SET owner_type = p_new_owner_type,
          owner_id = p_new_owner_id
      WHERE id = p_content_id;

    WHEN 'post' THEN
      UPDATE public.posts
      SET owner_type = p_new_owner_type,
          owner_id = p_new_owner_id
      WHERE id = p_content_id;

    ELSE
      RAISE EXCEPTION 'invalid_content_type';
  END CASE;

  -- Update gated content owner if it exists
  UPDATE public.gated_content
  SET owner_type = p_new_owner_type,
      owner_id = p_new_owner_id
  WHERE content_type = p_content_type
    AND content_id = p_content_id;

  RETURN true;
END;
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_content_by_owner TO authenticated;
GRANT EXECUTE ON FUNCTION public.transfer_content_ownership TO authenticated;