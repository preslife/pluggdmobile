
-- Phase 1: Harden fan_subscriptions and add notifications

-- 1) Ensure RLS is enabled
ALTER TABLE public.fan_subscriptions ENABLE ROW LEVEL SECURITY;

-- 2) Drop any overly-permissive system policy if it exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'fan_subscriptions'
      AND policyname = 'system_manage_fan_subs'
  ) THEN
    EXECUTE 'DROP POLICY "system_manage_fan_subs" ON public.fan_subscriptions';
  END IF;
END$$;

-- 3) Create precise policies (idempotently)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fan_subscriptions'
      AND policyname = 'fan or creator can view subscriptions'
  ) THEN
    CREATE POLICY "fan or creator can view subscriptions"
      ON public.fan_subscriptions
      FOR SELECT
      USING (auth.uid() = fan_id OR auth.uid() = creator_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fan_subscriptions'
      AND policyname = 'fan can insert own subscription'
  ) THEN
    CREATE POLICY "fan can insert own subscription"
      ON public.fan_subscriptions
      FOR INSERT
      WITH CHECK (auth.uid() = fan_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fan_subscriptions'
      AND policyname = 'fan can update own subscription'
  ) THEN
    CREATE POLICY "fan can update own subscription"
      ON public.fan_subscriptions
      FOR UPDATE
      USING (auth.uid() = fan_id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'fan_subscriptions'
      AND policyname = 'fan can delete own subscription'
  ) THEN
    CREATE POLICY "fan can delete own subscription"
      ON public.fan_subscriptions
      FOR DELETE
      USING (auth.uid() = fan_id);
  END IF;
END$$;

-- 4) Keep updated_at in sync
DROP TRIGGER IF EXISTS trg_fan_subscriptions_updated_at ON public.fan_subscriptions;
CREATE TRIGGER trg_fan_subscriptions_updated_at
BEFORE UPDATE ON public.fan_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) Notification on activation
CREATE OR REPLACE FUNCTION public.create_support_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Notify creator on new/activated subscription
  IF NEW.status = 'active' AND (TG_OP = 'INSERT' OR (OLD.status IS DISTINCT FROM NEW.status)) THEN
    INSERT INTO public.notifications (user_id, type, title, message, data)
    VALUES (
      NEW.creator_id,
      'support',
      'New supporter!',
      'You have a new supporter',
      jsonb_build_object('fan_id', NEW.fan_id, 'subscription_id', NEW.id)
    );
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_fan_subscriptions_notify ON public.fan_subscriptions;
CREATE TRIGGER trg_fan_subscriptions_notify
AFTER INSERT OR UPDATE ON public.fan_subscriptions
FOR EACH ROW EXECUTE FUNCTION public.create_support_notification();

-- 6) Helpful indexes
CREATE INDEX IF NOT EXISTS idx_fan_subscriptions_fan_creator
  ON public.fan_subscriptions (fan_id, creator_id);

CREATE INDEX IF NOT EXISTS idx_fan_subscriptions_creator_status
  ON public.fan_subscriptions (creator_id, status);
