import { MaterialIcons } from '@expo/vector-icons';
import { useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ScreenShell, SectionTitle } from '../components/ContentUI';
import { formatDate, PLUGGD_ORANGE } from '../src/lib/mobileContent';
import { loadMobileNotifications, markMobileNotificationRead } from '../src/features/culture/mobileServices';
import type { MobileNotification } from '../src/features/culture/mobileTypes';

export default function NotificationsRoute() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [items, setItems] = useState<MobileNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [markingAll, setMarkingAll] = useState(false);

  const unreadCount = useMemo(() => items.filter((item) => !item.read_at).length, [items]);

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await loadMobileNotifications(40));
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

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
          <Pressable style={styles.markAllButton} onPress={markAllRead} disabled={markingAll}>
            <Text style={styles.markAllText}>{markingAll ? 'Marking...' : 'Mark all read'}</Text>
          </Pressable>
        ) : null
      }
    >
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {loading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
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
        <Pressable key={item.id} style={styles.card} onPress={() => markRead(item)}>
          <View style={[styles.iconWrap, !item.read_at && styles.iconWrapUnread]}>
            <MaterialIcons name={iconForType(item.type)} size={22} color={!item.read_at ? '#08080C' : '#FFFFFF'} />
          </View>
          <View style={styles.copy}>
            <View style={styles.titleRow}>
            <Text style={styles.title} numberOfLines={1}>{item.title || 'Activity'}</Text>
            {!item.read_at ? <View style={styles.unreadDot} /> : null}
            </View>
            <Text style={styles.message} numberOfLines={2}>{item.body || 'Open this notification for details.'}</Text>
            <Text style={styles.meta}>{formatDate(item.created_at)}</Text>
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#737373" />
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

const styles = StyleSheet.create({
  markAllButton: {
    minHeight: 36,
    borderRadius: 18,
    backgroundColor: '#21130E',
    borderWidth: 1,
    borderColor: 'rgba(255,82,0,0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
  },
  markAllText: { color: PLUGGD_ORANGE, fontSize: 12, fontWeight: '900' },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  card: {
    minHeight: 88,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  iconWrap: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrapUnread: { backgroundColor: PLUGGD_ORANGE },
  copy: { flex: 1, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  title: { flex: 1, color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  unreadDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: PLUGGD_ORANGE },
  message: { color: '#B3B3B3', fontSize: 13, lineHeight: 18, fontWeight: '600', marginTop: 4 },
  meta: { color: '#737373', fontSize: 11, fontWeight: '800', marginTop: 6 },
});
