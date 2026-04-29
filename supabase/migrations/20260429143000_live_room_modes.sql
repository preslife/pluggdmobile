-- Live room modes for mobile creation and stage controls.

ALTER TABLE public.session_rooms
  ADD COLUMN IF NOT EXISTS live_mode text NOT NULL DEFAULT 'creator_live',
  ADD COLUMN IF NOT EXISTS mode_config jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS allow_stage_requests boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS max_stage_participants integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS participant_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS captions_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS recording_enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS recording_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS restream_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS restream_status text NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS restream_last_error text,
  ADD COLUMN IF NOT EXISTS restream_targets jsonb NOT NULL DEFAULT '[]'::jsonb;

UPDATE public.session_rooms
SET live_mode = 'creator_live'
WHERE live_mode IS NULL OR live_mode = '';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'session_rooms_live_mode_check'
  ) THEN
    ALTER TABLE public.session_rooms
      ADD CONSTRAINT session_rooms_live_mode_check
      CHECK (live_mode IN ('creator_live', 'collab_live', 'class_live', 'audio_room'));
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'session_rooms_max_stage_participants_check'
  ) THEN
    ALTER TABLE public.session_rooms
      ADD CONSTRAINT session_rooms_max_stage_participants_check
      CHECK (max_stage_participants BETWEEN 1 AND 16);
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'session_rooms_participant_count_check'
  ) THEN
    ALTER TABLE public.session_rooms
      ADD CONSTRAINT session_rooms_participant_count_check
      CHECK (participant_count >= 0);
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_session_rooms_mode_status
  ON public.session_rooms (live_mode, status, created_at DESC);
