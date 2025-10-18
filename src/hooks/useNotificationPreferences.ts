import { useCallback, useEffect, useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';

export type NotificationPreferenceKey =
  | 'notify_push'
  | 'notify_contest_reminders'
  | 'notify_live_sessions'
  | 'notify_purchases'
  | 'notify_supporters'
  | 'notify_follows'
  | 'notify_session_feedback'
  | 'notify_email_marketing';

export type NotificationPreferencesState = Record<NotificationPreferenceKey, boolean>;

const DEFAULT_PREFERENCES: NotificationPreferencesState = {
  notify_push: true,
  notify_contest_reminders: true,
  notify_live_sessions: true,
  notify_purchases: true,
  notify_supporters: true,
  notify_follows: true,
  notify_session_feedback: true,
  notify_email_marketing: true,
};

interface UseNotificationPreferencesResult {
  preferences: NotificationPreferencesState | null;
  loading: boolean;
  error: string | null;
  updating: Set<NotificationPreferenceKey>;
  updatePreference: (key: NotificationPreferenceKey, value: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

export const useNotificationPreferences = (): UseNotificationPreferencesResult => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [preferences, setPreferences] = useState<NotificationPreferencesState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updating, setUpdating] = useState<Set<NotificationPreferenceKey>>(new Set());

  const mergeWithDefaults = useCallback(
    (values: Partial<NotificationPreferencesState> | null | undefined): NotificationPreferencesState => ({
      ...DEFAULT_PREFERENCES,
      ...values,
    }),
    [],
  );

  const fetchPreferences = useCallback(async () => {
    if (!user) {
      setPreferences(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: fetchError } = await supabase
        .from('notification_prefs')
        .select(
          'notify_push, notify_contest_reminders, notify_live_sessions, notify_purchases, notify_supporters, notify_follows, notify_session_feedback, notify_email_marketing',
        )
        .eq('user_id', user.id)
        .maybeSingle();

      if (fetchError) {
        throw fetchError;
      }

      if (!data) {
        const { data: inserted, error: insertError } = await supabase
          .from('notification_prefs')
          .insert({ user_id: user.id })
          .select(
            'notify_push, notify_contest_reminders, notify_live_sessions, notify_purchases, notify_supporters, notify_follows, notify_session_feedback, notify_email_marketing',
          )
          .single();

        if (insertError) {
          throw insertError;
        }

        setPreferences(mergeWithDefaults(inserted));
      } else {
        setPreferences(mergeWithDefaults(data));
      }
    } catch (fetchErr: any) {
      console.error('Failed to load notification preferences:', fetchErr);
      setError(fetchErr?.message ?? 'Unable to load notification preferences');
      setPreferences(mergeWithDefaults(null));
    } finally {
      setLoading(false);
    }
  }, [mergeWithDefaults, user]);

  useEffect(() => {
    void fetchPreferences();
  }, [fetchPreferences]);

  const updatePreference = useCallback(
    async (key: NotificationPreferenceKey, value: boolean) => {
      if (!user) {
        return;
      }

      setUpdating((prev) => new Set(prev).add(key));

      const previous = preferences;
      setPreferences((current) => (current ? { ...current, [key]: value } : current));

      const { error: updateError } = await supabase
        .from('notification_prefs')
        .update({ [key]: value })
        .eq('user_id', user.id);

      if (updateError) {
        console.error('Failed to update notification preference', updateError);
        if (previous) {
          setPreferences(previous);
        }
        toast({
          variant: 'destructive',
          title: 'Update failed',
          description: 'We could not save your notification preference. Please try again.',
        });
      }

      setUpdating((prev) => {
        const next = new Set(prev);
        next.delete(key);
        return next;
      });
    },
    [preferences, toast, user],
  );

  const refresh = useCallback(async () => {
    await fetchPreferences();
  }, [fetchPreferences]);

  const memoizedUpdating = useMemo(() => new Set(updating), [updating]);

  return {
    preferences,
    loading,
    error,
    updating: memoizedUpdating,
    updatePreference,
    refresh,
  };
};
