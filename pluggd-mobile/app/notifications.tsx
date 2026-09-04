import { MaterialIcons } from '@expo/vector-icons';
import * as Notifications from 'expo-notifications';
import { pluggdFonts } from '../src/design/typography';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ScreenShell, SectionTitle } from '../components/ContentUI';
import { formatDate, PLUGGD_ORANGE } from '../src/lib/mobileContent';
import { loadMobileNotifications, markMobileNotificationRead } from '../src/features/culture/mobileServices';
import type { MobileNotification } from '../src/features/culture/mobileTypes';
import { registerMobilePushToken } from '../src/lib/localNotifications';
import { usePluggdTheme } from '../src/design/usePluggdTheme';

export default function NotificationsRoute() {
  const theme = usePluggdTheme();
  const styles = useNotificationStyles();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<MobileNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);
  const [pushPermission, setPushPermission] = useState<'loading' | 'granted' | 'denied'>('loading');
  const [canAskForPush, setCanAskForPush] = useState(true);
  const [enablingPush, setEnablingPush] = useState(false);

  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await loadMobileNotifications(40));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const refreshPushPermission = useCallback(async () => {
    const permission = await Notifications.getPermissionsAsync();
    setPushPermission(permission.granted ? 'granted' : 'denied');
    setCanAskForPush(permission.canAskAgain !== false);
  }, []);

  useEffect(() => {
    void refreshPushPermission();
    const subscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') void refreshPushPermission();
    });
    return () => subscription.remove();
  }, [refreshPushPermission]);

  const enablePush = async () => {
    if (!canAskForPush) {
      await Linking.openSettings();
      return;
    }

    setEnablingPush(true);
    await registerMobilePushToken({ requestPermission: true });
    await refreshPushPermission();
    setEnablingPush(false);
  };

  const markRead = async (item: MobileNotification) => {
    if (!item.read_at) {
      setItems((current) => current.map((row) => (row.id === item.id ? { ...row, read_at: new Date().toISOString() } : row)));
      await markMobileNotificationRead(item.id);
      void queryClient.invalidateQueries({ queryKey: ['culture', 'notifications', 'unread'] });
    }
    if (item.route) router.push(item.route as any);
  };

  const markAllRead = async () => {
    setMarkingAll(true);
    setItems((current) => current.map((item) => ({ ...item, read_at: item.read_at || new Date().toISOString() })));
    await Promise.all(items.filter((item) => !item.read_at).slice(0, 40).map((item) => markMobileNotificationRead(item.id)));
    void queryClient.invalidateQueries({ queryKey: ['culture', 'notifications', 'unread'] });
    setMarkingAll(false);
  };

  return (
    <ScreenShell
      title="Activity"
      subtitle="Likes, comments, follows, tickets, unlocks and community updates."
      action={
        unreadCount > 0 ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Mark all notifications as read" style={styles.markAllButton} onPress={markAllRead} disabled={markingAll}>
            <Text style={styles.markAllText}>{markingAll ? 'Marking...' : 'Mark all read'}</Text>
          </Pressable>
        ) : null
      }
    >
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      {pushPermission === 'denied' ? (
        <View style={styles.pushCard}>
          <View style={styles.pushIcon}>
            <MaterialIcons name="notifications-active" size={22} color={theme.colors.accentText} />
          </View>
          <View style={styles.pushCopy}>
            <Text style={styles.pushTitle}>Stay in the loop</Text>
            <Text style={styles.pushBody}>Enable alerts for replies, follows, purchases, events and live sessions.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={canAskForPush ? 'Enable notifications' : 'Open notification settings'}
            style={styles.pushButton}
            onPress={enablePush}
            disabled={enablingPush}
          >
            <Text style={styles.pushButtonText}>{enablingPush ? 'Enabling…' : canAskForPush ? 'Enable' : 'Settings'}</Text>
          </Pressable>
        </View>
      ) : null}
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={theme.colors.accentText} />
        </View>
      ) : null}
      {!loading && items.length === 0 ? (
        <EmptyState
          title="No activity yet"
          body="Likes, comments, follows, unlocks, tickets and community updates will appear here."
        />
      ) : null}
      {items.length > 0 ? <SectionTitle title={unreadCount > 0 ? `${unreadCount} unread` : 'Recent activity'} /> : null}
      {items.map((item) => (
        <Pressable accessibilityRole="button" accessibilityLabel={`Open notification: ${item.title || 'PLUGGD update'}`} key={item.id} style={styles.card} onPress={() => markRead(item)}>
          <View style={[styles.iconWrap, !item.read_at && styles.iconWrapUnread]}>
            <MaterialIcons name={iconForType(item.type)} size={22} color={!item.read_at ? theme.colors.onAccent : theme.colors.text} />
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{item.title || 'Activity'}</Text>
            {!item.read_at ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text style={styles.message} numberOfLines={2}>{item.body || 'Open this notification for details.'}</Text>
            <Text style={styles.meta}>{formatDate(item.created_at)}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color={theme.colors.textSubtle} />
        </Pressable>
      ))}
    </ScreenShell>
  );
}

function iconForType(type?: string | null): keyof typeof MaterialIcons.glyphMap {
  const normalized = String(type || '').toLowerCase();
  if (normalized.includes('comment') || normalized.includes('reply')) return 'chat-bubble-outline';
  if (normalized.includes('follow')) return 'person-add-alt';
  if (normalized.includes('ticket') || normalized.includes('event')) return 'confirmation-number';
  if (normalized.includes('purchase') || normalized.includes('unlock')) return 'shopping-bag';
  if (normalized.includes('live')) return 'settings-input-antenna';
  if (normalized.includes('like')) return 'favorite-border';
  return 'notifications-none';
}

const baseStyles = StyleSheet.create({
  pushCard: {
    minHeight: 86,
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.35)',
    backgroundColor: 'rgba(255,102,0,0.07)',
    padding: 12,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  pushIcon: {
    width: 38,
    height: 38,
    borderRadius: 5,
    backgroundColor: 'rgba(255,102,0,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushCopy: { flex: 1, minWidth: 0 },
  pushTitle: { color: '#FFFFFF', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  pushBody: { color: '#A3A3A3', fontSize: 12, lineHeight: 16, fontFamily: pluggdFonts.satoshiMedium, marginTop: 3 },
  pushButton: {
    minHeight: 38,
    borderRadius: 5,
    backgroundColor: PLUGGD_ORANGE,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pushButtonText: { color: '#0A0806', fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  markAllButton: {
    minHeight: 36,
    borderRadius: 5,
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,102,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  markAllText: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: {
    minHeight: 88,
    borderRadius: 0,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: '#262626',
    backgroundColor: 'transparent',
    paddingVertical: 13,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 5,
    backgroundColor: '#1B1B1F',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: { backgroundColor: PLUGGD_ORANGE },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: PLUGGD_ORANGE },
  message: { color: '#B3B3B3', fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600', marginTop: 4 },
  meta: { color: '#737373', fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 6 },
});

function useNotificationStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => ({
    ...baseStyles,
    pushCard: [baseStyles.pushCard, { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft }],
    pushIcon: [baseStyles.pushIcon, { backgroundColor: theme.colors.accentSoft }],
    pushTitle: [baseStyles.pushTitle, { color: theme.colors.text }],
    pushBody: [baseStyles.pushBody, { color: theme.colors.textMuted }],
    pushButton: [baseStyles.pushButton, { minHeight: 44, backgroundColor: theme.colors.accentFill }],
    pushButtonText: [baseStyles.pushButtonText, { color: theme.colors.onAccent }],
    markAllButton: [baseStyles.markAllButton, { minHeight: 44, borderColor: theme.colors.borderAccent }],
    markAllText: [baseStyles.markAllText, { color: theme.colors.accentText }],
    card: [baseStyles.card, { borderColor: theme.colors.border }],
    iconWrap: [baseStyles.iconWrap, { backgroundColor: theme.colors.surfaceAlt }],
    iconWrapUnread: [baseStyles.iconWrapUnread, { backgroundColor: theme.colors.accentFill }],
    title: [baseStyles.title, { color: theme.colors.text }],
    unreadDot: [baseStyles.unreadDot, { backgroundColor: theme.colors.accentFill }],
    message: [baseStyles.message, { color: theme.colors.textSecondary }],
    meta: [baseStyles.meta, { color: theme.colors.textSubtle }],
  }), [theme]);
}
