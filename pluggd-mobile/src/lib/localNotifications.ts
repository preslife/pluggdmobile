import AsyncStorage from '@react-native-async-storage/async-storage';
import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Linking, Platform } from 'react-native';
import { supabase } from './supabase';

const STORAGE_PREFIX = 'pluggd.localReminder';
const PUSH_TOKEN_STORAGE_KEY = 'pluggd.mobilePushToken.v1';
const MIN_SCHEDULE_LEAD_MS = 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

export type LocalReminderResult =
  | { success: true; scheduled: true; notificationId: string; scheduledFor: string }
  | { success: true; scheduled: false; reason: string }
  | { success: false; scheduled: false; error: string };

let notificationHandlerConfigured = false;

function storageKey(kind: 'event' | 'live-session', id: string) {
  return `${STORAGE_PREFIX}.${kind}.${id}`;
}

function parseFutureDate(startsAt?: string | null) {
  if (!startsAt) return null;
  const date = new Date(startsAt);
  if (!Number.isFinite(date.getTime())) return null;
  return date;
}

function reminderDateFor(startsAt?: string | null) {
  const start = parseFutureDate(startsAt);
  if (!start) return null;

  const now = Date.now();
  const startMs = start.getTime();
  if (startMs - now < MIN_SCHEDULE_LEAD_MS) return null;

  const hourBefore = startMs - ONE_HOUR_MS;
  if (hourBefore - now >= MIN_SCHEDULE_LEAD_MS) return new Date(hourBefore);

  return new Date(now + MIN_SCHEDULE_LEAD_MS);
}

async function ensureNotificationPermission() {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;

  const requested = await Notifications.requestPermissionsAsync();
  return requested.granted;
}

function expoProjectId() {
  return (
    (Constants as any).easConfig?.projectId ||
    (Constants.expoConfig?.extra as any)?.eas?.projectId ||
    (Constants.expoConfig?.extra as any)?.projectId ||
    null
  );
}

export async function registerMobilePushToken(options: { requestPermission?: boolean } = {}) {
  if (Platform.OS !== 'ios' && Platform.OS !== 'android') {
    return { success: true, registered: false, reason: 'Push notifications require a device build.' };
  }

  const existingPermission = await Notifications.getPermissionsAsync();
  let granted = existingPermission.granted;
  if (!granted && options.requestPermission) {
    const requested = await Notifications.requestPermissionsAsync();
    granted = requested.granted;
  }
  if (!granted) {
    return { success: true, registered: false, reason: 'Notification permission has not been granted.' };
  }

  const projectId = expoProjectId();
  if (!projectId) {
    return { success: false, registered: false, error: 'Expo project id is not configured for push delivery.' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.id) {
    return { success: true, registered: false, reason: 'Sign in before registering push delivery.' };
  }

  const tokenResponse = await Notifications.getExpoPushTokenAsync({ projectId });
  const expoPushToken = tokenResponse.data;
  if (!expoPushToken) {
    return { success: false, registered: false, error: 'Expo push token was not returned.' };
  }

  const { error } = await (supabase as any).rpc('upsert_mobile_push_token', {
    p_expo_push_token: expoPushToken,
    p_platform: Platform.OS,
    p_device_id: Constants.sessionId ?? null,
    p_app_version: Constants.expoConfig?.version ?? null,
    p_environment: __DEV__ ? 'development' : 'production',
  });
  if (error) {
    return { success: false, registered: false, error: error.message };
  }

  await AsyncStorage.setItem(PUSH_TOKEN_STORAGE_KEY, expoPushToken);
  return { success: true, registered: true, expoPushToken };
}

export function configureLocalNotificationHandler() {
  if (notificationHandlerConfigured) return;
  notificationHandlerConfigured = true;

  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: false,
      shouldSetBadge: false,
    }),
  });

  if (Platform.OS === 'android') {
    void Notifications.setNotificationChannelAsync('pluggd-reminders', {
      name: 'PLUGGD reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
      vibrationPattern: [0, 180, 80, 180],
      lightColor: '#FF5A00',
    });
  }
}

export function addLocalNotificationResponseListener() {
  const subscription = Notifications.addNotificationResponseReceivedListener((response) => {
    const url = response.notification.request.content.data?.url;
    if (typeof url === 'string' && url.length > 0) {
      void Linking.openURL(url);
    }
  });

  return () => subscription.remove();
}

export async function cancelLocalReminder(kind: 'event' | 'live-session', id: string) {
  const key = storageKey(kind, id);
  const notificationId = await AsyncStorage.getItem(key);
  if (notificationId) {
    await Notifications.cancelScheduledNotificationAsync(notificationId);
    await AsyncStorage.removeItem(key);
  }
}

async function scheduleLocalReminder(input: {
  kind: 'event' | 'live-session';
  id: string;
  title: string;
  body: string;
  startsAt?: string | null;
  url: string;
}): Promise<LocalReminderResult> {
  const scheduledFor = reminderDateFor(input.startsAt);
  if (!scheduledFor) {
    return { success: true, scheduled: false, reason: 'No future reminder time is available.' };
  }

  const granted = await ensureNotificationPermission();
  if (!granted) {
    return { success: false, scheduled: false, error: 'Notification permission was not granted.' };
  }
  void registerMobilePushToken({ requestPermission: false });

  await cancelLocalReminder(input.kind, input.id);

  const notificationId = await Notifications.scheduleNotificationAsync({
    content: {
      title: input.title,
      body: input.body,
      data: { url: input.url, reminderKind: input.kind, reminderId: input.id },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DATE,
      date: scheduledFor,
      channelId: Platform.OS === 'android' ? 'pluggd-reminders' : undefined,
    },
  });

  await AsyncStorage.setItem(storageKey(input.kind, input.id), notificationId);
  return { success: true, scheduled: true, notificationId, scheduledFor: scheduledFor.toISOString() };
}

export async function scheduleEventLocalReminder(input: {
  eventId: string;
  title?: string | null;
  startsAt?: string | null;
}) {
  return scheduleLocalReminder({
    kind: 'event',
    id: input.eventId,
    title: input.title || 'PLUGGD event reminder',
    body: 'Your saved PLUGGD event is coming up.',
    startsAt: input.startsAt,
    url: `pluggd://events/${input.eventId}`,
  });
}

export async function cancelEventLocalReminder(eventId: string) {
  return cancelLocalReminder('event', eventId);
}

export async function scheduleLiveSessionLocalReminder(input: {
  sessionId: string;
  title?: string | null;
  startsAt?: string | null;
}) {
  return scheduleLocalReminder({
    kind: 'live-session',
    id: input.sessionId,
    title: input.title || 'PLUGGD live reminder',
    body: 'A scheduled PLUGGD live session is about to start.',
    startsAt: input.startsAt,
    url: 'pluggd://live',
  });
}

export async function cancelLiveSessionLocalReminder(sessionId: string) {
  return cancelLocalReminder('live-session', sessionId);
}
