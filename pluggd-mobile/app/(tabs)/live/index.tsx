import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { BrandLogo } from '../../../components/BrandLogo';
import { supabase } from '../../../src/lib/supabase';

type SessionRoom = {
  id: string;
  title: string;
  description: string | null;
  host_id: string;
  status: string;
  is_public: boolean | null;
  created_at: string;
  scheduled_for?: string | null;
  agora_live_started_at?: string | null;
  participant_count?: number | null;
  live_mode?: string | null;
  allow_stage_requests?: boolean | null;
  max_stage_participants?: number | null;
  profiles?: {
    full_name: string | null;
    username: string | null;
    profile_type?: string | null;
    user_type?: string | null;
    is_creator?: boolean | null;
  } | null;
};

const PLUGGD_ORANGE = '#FF5200';
const ACCENTS = ['#FF5200', '#B45309', '#7C3AED', '#22C55E', '#F97316'];

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

function roleLabel(profile?: SessionRoom['profiles']) {
  const raw = profile?.profile_type ?? profile?.user_type ?? null;
  if (raw === 'dj') return 'DJ';
  if (raw === 'producer') return 'Producer';
  if (raw === 'artist') return 'Artist';
  if (raw === 'promoter') return 'Promoter';
  if (raw === 'venue') return 'Venue';
  if (raw === 'curator') return 'Curator';
  if (raw === 'service_provider') return 'Service';
  if (raw === 'manager') return 'Manager';
  if (profile?.is_creator) return 'Creator';
  return 'Host';
}

function modeLabel(mode?: string | null) {
  if (mode === 'collab_live') return 'Collab';
  if (mode === 'class_live') return 'Class';
  if (mode === 'audio_room') return 'Audio';
  return 'Creator';
}

function hostName(room: SessionRoom) {
  return room.profiles?.full_name ?? room.profiles?.username ?? 'Pluggd host';
}

function formatCount(value: number) {
  if (value >= 1000000) return `${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `${(value / 1000).toFixed(1)}K`;
  return String(value);
}

function formatRoomTime(room: SessionRoom) {
  const value = room.scheduled_for ?? room.agora_live_started_at ?? room.created_at;
  const date = new Date(value);
  const today = new Date();
  const tomorrow = new Date();
  tomorrow.setDate(today.getDate() + 1);
  const sameDay = date.toDateString() === today.toDateString();
  const nextDay = date.toDateString() === tomorrow.toDateString();

  return {
    time: date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    date: sameDay ? 'Today' : nextDay ? 'Tomorrow' : date.toLocaleDateString('en-GB', { weekday: 'short' }),
  };
}

function PluggdWordmark() {
  return <BrandLogo variant="dark" width={104} height={30} />;
}

function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>

      <Pressable style={styles.seeAllButton} onPress={onPress}>
        <Text style={styles.seeAllText}>See all</Text>
        <MaterialIcons name="chevron-right" size={20} color={PLUGGD_ORANGE} />
      </Pressable>
    </View>
  );
}

function LiveRoomCard({
  room,
  accent,
  onJoin,
}: {
  room: SessionRoom;
  accent: string;
  onJoin: (room: SessionRoom, role: 'host' | 'audience') => void;
}) {
  const host = hostName(room);
  const role = roleLabel(room.profiles);
  const viewerCount = Math.max(Number(room.participant_count ?? 0), 1);

  return (
    <Pressable style={styles.liveCard} onPress={() => onJoin(room, 'audience')}>
      <View style={[styles.liveThumbnail, { backgroundColor: accent }]}>
        <View style={styles.liveBadge}>
          <Text style={styles.liveBadgeText}>LIVE</Text>
        </View>

        <MaterialIcons name="graphic-eq" size={34} color="#FFFFFF" />
      </View>

      <View style={styles.liveInfo}>
        <Text style={styles.liveTitle} numberOfLines={1}>
          {room.title}
        </Text>

        <View style={styles.hostRow}>
          <View style={[styles.hostAvatar, { borderColor: accent }]}>
            <Text style={styles.hostAvatarText}>{initials(host)}</Text>
          </View>

          <View style={styles.hostTextWrap}>
            <Text style={styles.hostName} numberOfLines={1}>
              {host}
            </Text>

            <View style={styles.metaRow}>
              <View style={styles.roleBadge}>
                <Text style={styles.roleBadgeText}>{role}</Text>
              </View>

              <View style={styles.modeBadge}>
                <Text style={styles.modeBadgeText}>{modeLabel(room.live_mode)}</Text>
              </View>

              <View style={styles.viewerRow}>
                <MaterialIcons name="groups" size={14} color="#9A9A9A" />
                <Text style={styles.viewerText}>{formatCount(viewerCount)} watching</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <Pressable style={styles.joinButton} onPress={() => onJoin(room, 'audience')}>
        <Text style={styles.joinButtonText}>Join</Text>
      </Pressable>
    </Pressable>
  );
}

function UpcomingRoomCard({
  room,
  accent,
  onJoin,
}: {
  room: SessionRoom;
  accent: string;
  onJoin: (room: SessionRoom, role: 'host' | 'audience') => void;
}) {
  const time = formatRoomTime(room);
  const host = hostName(room);

  return (
    <Pressable style={styles.upcomingCard} onPress={() => onJoin(room, 'audience')}>
      <View style={styles.timeBox}>
        <Text style={styles.timeText}>{time.time}</Text>
        <Text style={styles.dateText}>{time.date}</Text>
        <MaterialIcons name="calendar-month" size={16} color={PLUGGD_ORANGE} style={styles.timeIcon} />
      </View>

      <View style={[styles.upcomingAvatar, { borderColor: accent }]}>
        <Text style={styles.upcomingAvatarText}>{initials(host)}</Text>
      </View>

      <View style={styles.upcomingInfo}>
        <Text style={styles.upcomingTitle} numberOfLines={1}>
          {room.title}
        </Text>
        <Text style={styles.upcomingHost} numberOfLines={1}>
          Hosted by {host}
        </Text>
      </View>

      <Pressable
        style={styles.reminderButton}
        onPress={() => Alert.alert('Reminder saved', 'We will use this for live-room reminders once notifications are enabled.')}
      >
        <MaterialIcons name="notifications-none" size={17} color={PLUGGD_ORANGE} />
        <Text style={styles.reminderText}>Reminder</Text>
      </Pressable>
    </Pressable>
  );
}

export default function LiveLobby() {
  const router = useRouter();
  const [rooms, setRooms] = useState<SessionRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const liveRooms = useMemo(
    () => rooms.filter((room) => room.status === 'live'),
    [rooms],
  );
  const upcomingRooms = useMemo(
    () => rooms.filter((room) => room.status !== 'live'),
    [rooms],
  );

  const loadRooms = useCallback(async () => {
    try {
      let roomsResult = await (supabase as any)
        .from('session_rooms')
        .select(`
          id,
          title,
          description,
          host_id,
          status,
          is_public,
          created_at,
          scheduled_for,
          agora_live_started_at,
          participant_count,
          live_mode,
          allow_stage_requests,
          max_stage_participants,
          profiles!session_rooms_host_id_fkey(full_name, username, profile_type, user_type, is_creator)
        `)
        .in('status', ['idle', 'live'])
        .order('created_at', { ascending: false })
        .limit(30);

      if (roomsResult.error && /column|live_mode|scheduled_for|participant_count|allow_stage_requests|max_stage_participants/i.test(roomsResult.error.message ?? '')) {
        roomsResult = await (supabase as any)
          .from('session_rooms')
          .select(`
            id,
            title,
            description,
            host_id,
            status,
            is_public,
            created_at,
            agora_live_started_at,
            profiles!session_rooms_host_id_fkey(full_name, username, profile_type, user_type, is_creator)
          `)
          .in('status', ['idle', 'live'])
          .order('created_at', { ascending: false })
          .limit(30);
      }

      if (roomsResult.error) throw roomsResult.error;
      setRooms(((roomsResult.data ?? []) as SessionRoom[]).map((room) => ({
        ...room,
        live_mode: room.live_mode ?? 'creator_live',
        allow_stage_requests: room.allow_stage_requests ?? false,
        max_stage_participants: room.max_stage_participants ?? 1,
        participant_count: room.participant_count ?? 0,
      })));
    } catch (error) {
      console.error('Failed to load live rooms:', error);
      Alert.alert('Live unavailable', 'We could not load live rooms.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadRooms();
  }, [loadRooms]);

  const openCreateRoom = () => {
    router.push('/live/create' as any);
  };

  const joinRoom = async (room: SessionRoom, role: 'host' | 'audience') => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      router.push('/auth/login');
      return;
    }

    const resolvedRole = room.host_id === user.id ? 'host' : role === 'host' ? 'audience' : role;
    router.push({
      pathname: '/live/session',
      params: { roomId: room.id, role: resolvedRole },
    });
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={PLUGGD_ORANGE} />
        }
      >
        <View style={styles.topBar}>
          <View>
            <PluggdWordmark />
            <Text style={styles.pageTitle}>Live</Text>
          </View>

          <Pressable style={styles.createRoomButton} onPress={openCreateRoom}>
            <MaterialIcons name="add" size={19} color={PLUGGD_ORANGE} />
            <Text style={styles.createRoomText}>Create room</Text>
          </Pressable>
        </View>

        <SectionHeader title="Live now" />

        {loading ? (
          <ActivityIndicator color={PLUGGD_ORANGE} style={styles.loader} />
        ) : liveRooms.length > 0 ? (
          <View style={styles.liveList}>
            {liveRooms.map((room, index) => (
              <LiveRoomCard
                key={room.id}
                room={room}
                accent={ACCENTS[index % ACCENTS.length]}
                onJoin={joinRoom}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <MaterialIcons name="settings-input-antenna" size={38} color="#FFFFFF33" />
            <Text style={styles.emptyTitle}>No rooms are live yet</Text>
            <Text style={styles.emptyBody}>Start one or check upcoming rooms below.</Text>
          </View>
        )}

        <SectionHeader title="Upcoming rooms" />

        {upcomingRooms.length > 0 ? (
          <View style={styles.upcomingList}>
            {upcomingRooms.map((room, index) => (
              <UpcomingRoomCard
                key={room.id}
                room={room}
                accent={ACCENTS[(index + 1) % ACCENTS.length]}
                onJoin={joinRoom}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <MaterialIcons name="event" size={34} color="#FFFFFF33" />
            <Text style={styles.emptyTitle}>No upcoming rooms</Text>
            <Text style={styles.emptyBody}>Create a room when you are ready to go live.</Text>
          </View>
        )}
      </ScrollView>

      <View style={styles.bottomArea}>
        <Pressable style={styles.startRoomButton} onPress={openCreateRoom}>
          <MaterialIcons name="settings-input-antenna" size={21} color="#FFFFFF" />
          <Text style={styles.startRoomText}>Start a room</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 100,
    paddingBottom: 150,
  },
  topBar: {
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 24,
    lineHeight: 30,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logoAccent: {
    color: PLUGGD_ORANGE,
  },
  pageTitle: {
    color: '#FFFFFF',
    fontSize: 36,
    fontWeight: '900',
  },
  createRoomButton: {
    minWidth: 40,
    height: 40,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#2E2E2E',
    backgroundColor: '#151515',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 10,
    gap: 4,
    marginTop: 4,
  },
  createRoomText: {
    color: PLUGGD_ORANGE,
    fontSize: 13,
    fontWeight: '900',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 23,
    fontWeight: '900',
  },
  seeAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: PLUGGD_ORANGE,
    fontSize: 14,
    fontWeight: '900',
  },
  loader: {
    paddingVertical: 28,
  },
  liveList: {
    gap: 10,
    marginBottom: 20,
  },
  liveCard: {
    minHeight: 112,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  liveThumbnail: {
    width: 92,
    height: 92,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
    position: 'relative',
    overflow: 'hidden',
  },
  liveBadge: {
    position: 'absolute',
    top: 7,
    left: 7,
    backgroundColor: PLUGGD_ORANGE,
    borderRadius: 5,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '900',
  },
  liveInfo: {
    flex: 1,
    minWidth: 0,
  },
  liveTitle: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
    marginBottom: 10,
  },
  hostRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hostAvatar: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1.5,
    backgroundColor: '#222222',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  hostAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  hostTextWrap: {
    flex: 1,
    minWidth: 0,
  },
  hostName: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 4,
  },
  roleBadge: {
    borderRadius: 999,
    backgroundColor: '#21130E',
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  roleBadgeText: {
    color: PLUGGD_ORANGE,
    fontSize: 10,
    fontWeight: '900',
  },
  modeBadge: {
    borderRadius: 999,
    backgroundColor: '#101010',
    borderWidth: 1,
    borderColor: '#343434',
    paddingHorizontal: 7,
    paddingVertical: 3,
  },
  modeBadgeText: {
    color: '#D8D8D8',
    fontSize: 10,
    fontWeight: '900',
  },
  viewerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  viewerText: {
    color: '#9A9A9A',
    fontSize: 12,
    fontWeight: '700',
  },
  joinButton: {
    height: 39,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    marginLeft: 8,
  },
  joinButtonText: {
    color: PLUGGD_ORANGE,
    fontSize: 14,
    fontWeight: '900',
  },
  upcomingList: {
    gap: 9,
  },
  upcomingCard: {
    minHeight: 78,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeBox: {
    width: 64,
    height: 56,
    borderRadius: 8,
    backgroundColor: '#20130E',
    borderWidth: 1,
    borderColor: '#3B261A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  timeText: {
    color: PLUGGD_ORANGE,
    fontSize: 13,
    fontWeight: '900',
  },
  dateText: {
    color: '#BDBDBD',
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  timeIcon: {
    marginTop: 3,
  },
  upcomingAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#242424',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  upcomingAvatarText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  upcomingInfo: {
    flex: 1,
    minWidth: 0,
  },
  upcomingTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  upcomingHost: {
    color: '#9E9E9E',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
  },
  reminderButton: {
    height: 36,
    borderRadius: 8,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#343434',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    gap: 4,
    marginLeft: 8,
  },
  reminderText: {
    color: PLUGGD_ORANGE,
    fontSize: 12,
    fontWeight: '900',
  },
  emptyCard: {
    minHeight: 120,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 18,
    marginBottom: 20,
  },
  emptyTitle: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
    marginTop: 10,
  },
  emptyBody: {
    color: '#9A9A9A',
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 4,
  },
  bottomArea: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 84,
    backgroundColor: 'rgba(8,8,8,0.97)',
    borderTopWidth: 1,
    borderTopColor: '#171717',
    paddingTop: 10,
    paddingHorizontal: 10,
    paddingBottom: 10,
  },
  startRoomButton: {
    height: 54,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  startRoomText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '900',
  },
});
