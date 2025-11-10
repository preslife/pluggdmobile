-- Release access cache to track recent gating decisions
CREATE TABLE IF NOT EXISTS public.release_access_cache (
  user_id UUID NOT NULL,
  release_id UUID NOT NULL,
  has_access BOOLEAN NOT NULL DEFAULT false,
  has_purchased BOOLEAN NOT NULL DEFAULT false,
  latest_purchase_id UUID,
  latest_purchase_available_at TIMESTAMPTZ,
  latest_purchase_is_preorder BOOLEAN NOT NULL DEFAULT false,
  needs_purchase BOOLEAN NOT NULL DEFAULT true,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_scheduled BOOLEAN NOT NULL DEFAULT false,
  is_published BOOLEAN NOT NULL DEFAULT false,
  preorder_pending BOOLEAN NOT NULL DEFAULT false,
  available_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT release_access_cache_pkey PRIMARY KEY (user_id, release_id)
);

CREATE INDEX IF NOT EXISTS release_access_cache_updated_at_idx
  ON public.release_access_cache(updated_at DESC);

CREATE OR REPLACE FUNCTION public.touch_release_access_cache_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS release_access_cache_set_updated_at ON public.release_access_cache;
CREATE TRIGGER release_access_cache_set_updated_at
  BEFORE UPDATE ON public.release_access_cache
  FOR EACH ROW
  EXECUTE FUNCTION public.touch_release_access_cache_updated_at();

-- System log entries whenever split documents are uploaded
CREATE OR REPLACE FUNCTION public.log_release_split_document_insert()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.system_logs(level, message, component, action, user_id, metadata)
  VALUES (
    1,
    'Release split document uploaded',
    'moderation.releases',
    'release_split_document_uploaded',
    NEW.uploaded_by,
    jsonb_strip_nulls(jsonb_build_object(
      'release_id', NEW.release_id,
      'document_id', NEW.id,
      'file_name', NEW.file_name,
      'notes_present', NEW.notes IS NOT NULL,
      'storage_path', NEW.storage_path
    ))
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS release_split_documents_audit_insert ON public.release_split_documents;
CREATE TRIGGER release_split_documents_audit_insert
  AFTER INSERT ON public.release_split_documents
  FOR EACH ROW
  EXECUTE FUNCTION public.log_release_split_document_insert();
