-- Mobile live lobby support.
-- manage-live-sessions reads/writes these fields when creating or editing rooms.

ALTER TABLE public.session_rooms
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_session_rooms_status_created
  ON public.session_rooms (status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_session_rooms_scheduled_for
  ON public.session_rooms (scheduled_for)
  WHERE scheduled_for IS NOT NULL;

DROP TRIGGER IF EXISTS trg_session_rooms_updated_at ON public.session_rooms;
CREATE TRIGGER trg_session_rooms_updated_at
BEFORE UPDATE ON public.session_rooms
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();
