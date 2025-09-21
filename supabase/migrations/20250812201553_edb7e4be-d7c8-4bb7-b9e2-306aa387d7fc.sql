
-- 1) Extend profiles with social links for Creator Pages
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS instagram_url text,
  ADD COLUMN IF NOT EXISTS twitter_url text,
  ADD COLUMN IF NOT EXISTS youtube_url text,
  ADD COLUMN IF NOT EXISTS soundcloud_url text,
  ADD COLUMN IF NOT EXISTS website_url text,
  ADD COLUMN IF NOT EXISTS tiktok_url text,
  ADD COLUMN IF NOT EXISTS merch_url text;

-- Optional: keep the updated_at column fresh on change if not already handled by a trigger
-- Create update trigger only if it doesn't exist. Supabase does not support conditional trigger creation easily,
-- but creating it again with same name will error. If this trigger already exists, this statement will fail.
-- If you know it's already present for profiles, you can skip this section.
-- DO NOTE: If it errors due to duplicate trigger, it will not affect subsequent statements.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_profiles_updated_at'
  ) THEN
    CREATE TRIGGER update_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;


-- 2) Feedback notifications: notify the session host on new feedback
-- Create a function to insert a notification when feedback is added
CREATE OR REPLACE FUNCTION public.create_session_feedback_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_host uuid;
  v_title text;
  v_message text;
BEGIN
  -- Find the host for the session
  SELECT host_id INTO v_host
  FROM public.sessions
  WHERE id = NEW.session_id;

  -- Only notify the host if the author of the feedback is not the host
  IF v_host IS NOT NULL AND v_host <> NEW.user_id THEN
    v_title := 'New Feedback on Your Session';
    v_message := COALESCE(LEFT(NEW.content, 120), 'New timestamped feedback received');

    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      v_host,
      'session_feedback',
      v_title,
      v_message,
      jsonb_build_object(
        'session_id', NEW.session_id,
        'feedback_id', NEW.id,
        'timecode_seconds', NEW.timecode_seconds,
        'author_id', NEW.user_id
      )
    );
  END IF;

  RETURN NEW;
END;
$function$;

-- Attach trigger to session_feedback inserts
DROP TRIGGER IF EXISTS trg_session_feedback_notify ON public.session_feedback;
CREATE TRIGGER trg_session_feedback_notify
AFTER INSERT ON public.session_feedback
FOR EACH ROW
EXECUTE FUNCTION public.create_session_feedback_notification();


-- 3) Fan subscriptions (creator-specific subscriptions scaffolding for Phase 3)
CREATE TABLE IF NOT EXISTS public.fan_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fan_id uuid NOT NULL,
  creator_id uuid NOT NULL,
  stripe_customer_id text,
  stripe_subscription_id text,
  status text NOT NULL DEFAULT 'active', -- e.g., 'active', 'canceled', 'past_due'
  price_cents integer NOT NULL,
  currency text NOT NULL DEFAULT 'usd',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable Row-Level Security
ALTER TABLE public.fan_subscriptions ENABLE ROW LEVEL SECURITY;

-- Indexes for efficient lookups
CREATE INDEX IF NOT EXISTS idx_fan_subscriptions_fan ON public.fan_subscriptions (fan_id);
CREATE INDEX IF NOT EXISTS idx_fan_subscriptions_creator ON public.fan_subscriptions (creator_id);
CREATE INDEX IF NOT EXISTS idx_fan_subscriptions_status ON public.fan_subscriptions (status);

-- RLS policies:
-- 3a) Users can view subscriptions where they are the fan or the creator
CREATE POLICY IF NOT EXISTS "select_fan_or_creator_subs"
  ON public.fan_subscriptions
  FOR SELECT
  USING (auth.uid() = fan_id OR auth.uid() = creator_id);

-- 3b) Fans can create their own subscription record (optional; edge functions with service role can also insert)
CREATE POLICY IF NOT EXISTS "fan_can_insert_own_sub"
  ON public.fan_subscriptions
  FOR INSERT
  WITH CHECK (auth.uid() = fan_id);

-- 3c) System can manage fan subscriptions (edge functions use service role and bypass RLS anyway; this mirrors existing patterns)
CREATE POLICY IF NOT EXISTS "system_manage_fan_subs"
  ON public.fan_subscriptions
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- updated_at trigger for fan_subscriptions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'update_fan_subscriptions_updated_at'
  ) THEN
    CREATE TRIGGER update_fan_subscriptions_updated_at
    BEFORE UPDATE ON public.fan_subscriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_updated_at_column();
  END IF;
END;
$$;

