-- Create notification preferences table to store per-user opt outs
CREATE TABLE IF NOT EXISTS public.notification_prefs (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  notify_push BOOLEAN DEFAULT TRUE,
  notify_contest_reminders BOOLEAN DEFAULT TRUE,
  notify_live_sessions BOOLEAN DEFAULT TRUE,
  notify_purchases BOOLEAN DEFAULT TRUE,
  notify_supporters BOOLEAN DEFAULT TRUE,
  notify_follows BOOLEAN DEFAULT TRUE,
  notify_session_feedback BOOLEAN DEFAULT TRUE,
  notify_email_marketing BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notification_prefs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own notification preferences" ON public.notification_prefs
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own notification preferences" ON public.notification_prefs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own notification preferences" ON public.notification_prefs
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own notification preferences" ON public.notification_prefs
  FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER update_notification_prefs_updated_at
  BEFORE UPDATE ON public.notification_prefs
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

COMMENT ON TABLE public.notification_prefs IS 'Per-user notification preferences controlling notification delivery.';
