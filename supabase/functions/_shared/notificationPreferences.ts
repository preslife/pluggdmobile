export type NotificationPreferenceKey =
  | 'notify_push'
  | 'notify_contest_reminders'
  | 'notify_live_sessions'
  | 'notify_purchases'
  | 'notify_supporters'
  | 'notify_follows'
  | 'notify_session_feedback'
  | 'notify_email_marketing';

export type NotificationPreferenceValues = Record<NotificationPreferenceKey, boolean>;

type SupabaseLikeClient = {
  rpc: (
    fn: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: Record<string, unknown> | null; error: { message: string } | null }>;
};

const PREFERENCE_KEYS: NotificationPreferenceKey[] = [
  'notify_push',
  'notify_contest_reminders',
  'notify_live_sessions',
  'notify_purchases',
  'notify_supporters',
  'notify_follows',
  'notify_session_feedback',
  'notify_email_marketing',
];

const DEFAULT_PREFERENCES: NotificationPreferenceValues = {
  notify_push: true,
  notify_contest_reminders: true,
  notify_live_sessions: true,
  notify_purchases: true,
  notify_supporters: true,
  notify_follows: true,
  notify_session_feedback: true,
  notify_email_marketing: true,
};

export type NotificationPreferenceCache = Map<string, NotificationPreferenceValues>;

export const createPreferenceCache = (): NotificationPreferenceCache => new Map();

export const mergePreferences = (
  values: Partial<Record<NotificationPreferenceKey, boolean>> | null | undefined,
): NotificationPreferenceValues => {
  const merged: NotificationPreferenceValues = { ...DEFAULT_PREFERENCES };

  if (!values) {
    return merged;
  }

  for (const key of PREFERENCE_KEYS) {
    const nextValue = values[key];
    if (typeof nextValue === 'boolean') {
      merged[key] = nextValue;
    }
  }

  return merged;
};

export const fetchPreferencesForUser = async (
  client: SupabaseLikeClient,
  cache: NotificationPreferenceCache,
  userId: string,
): Promise<NotificationPreferenceValues> => {
  if (cache.has(userId)) {
    return cache.get(userId)!;
  }

  try {
    const { data, error } = await client.rpc('get_notification_prefs', { p_user_id: userId });

    if (error) {
      console.error(`[notificationPreferences] Failed to fetch preferences for user ${userId}`, error);
      cache.set(userId, DEFAULT_PREFERENCES);
      return DEFAULT_PREFERENCES;
    }

    const merged = mergePreferences(data as Partial<NotificationPreferenceValues> | null | undefined);
    cache.set(userId, merged);
    return merged;
  } catch (err) {
    console.error(`[notificationPreferences] Unexpected error loading preferences for ${userId}`, err);
    cache.set(userId, DEFAULT_PREFERENCES);
    return DEFAULT_PREFERENCES;
  }
};

export const shouldSendNotification = async (
  client: SupabaseLikeClient,
  cache: NotificationPreferenceCache,
  userId: string,
  key: NotificationPreferenceKey,
): Promise<boolean> => {
  const preferences = await fetchPreferencesForUser(client, cache, userId);
  return preferences[key] !== false;
};

export const executeWithNotificationPreference = async <T>(
  client: SupabaseLikeClient,
  cache: NotificationPreferenceCache,
  userId: string,
  key: NotificationPreferenceKey,
  action: () => Promise<T>,
): Promise<{ skipped: boolean; result?: T }> => {
  const enabled = await shouldSendNotification(client, cache, userId, key);
  if (!enabled) {
    return { skipped: true };
  }

  const result = await action();
  return { skipped: false, result };
};
