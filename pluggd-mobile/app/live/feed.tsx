import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import {
  Alert,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { impactHaptic, selectionHaptic } from '../../src/design/haptics';
import { contentInitials, formatCompact } from '../../src/lib/mobileContent';
import { loadLiveRoomMessagePreview } from '../../src/features/culture/mobileServices';
import { useLiveRooms, type LiveRoomItem } from '../../src/features/culture/useCultureData';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

const COLORS = {
  canvas: '#0a0806',
  surface: '#171310',
  surface2: '#241d15',
  orange: '#ff6600',
  coral: '#FF4757',
  white: '#FFFFFF',
  soft: '#E4E4E9',
  muted: '#8E8E9F',
};

function isJoinableLive(room: LiveRoomItem) {
  return room.status === 'live' && (room.source === 'session_room' || !room.source);
}

function roomTitle(room: LiveRoomItem) {
  return room.title?.trim() || room.description?.trim() || 'Live room';
}

function roomHost(room: LiveRoomItem) {
  return room.creator_name?.trim() || room.category?.trim() || 'PLUGGD Live';
}

function roomImage(room: LiveRoomItem) {
  return room.thumbnail_url || room.creator_avatar_url || null;
}

export default function LiveFeedScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useLiveFeedStyles();
  const { height } = useWindowDimensions();
  const roomsQuery = useLiveRooms();
  const [index, setIndex] = useState(0);
  const liveRooms = useMemo(() => (roomsQuery.data ?? []).filter(isJoinableLive), [roomsQuery.data]);
  const activeRoom = liveRooms[index] ?? liveRooms[0] ?? null;
  const previewsQuery = useQuery({
    queryKey: ['live', 'message-preview', liveRooms.map((room) => room.id).join(',')],
    queryFn: () => loadLiveRoomMessagePreview(liveRooms.map((room) => room.id)),
    enabled: liveRooms.length > 0,
    staleTime: 1000 * 20,
  });
  const activeImage = activeRoom ? roomImage(activeRoom) : null;

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) => Math.abs(gesture.dy) > 28 && Math.abs(gesture.dy) > Math.abs(gesture.dx),
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dy < -48) {
          impactHaptic();
          setIndex((current) => Math.min(current + 1, Math.max(liveRooms.length - 1, 0)));
        } else if (gesture.dy > 48) {
          selectionHaptic();
          router.back();
        }
      },
    }),
  ).current;

  const openRoom = (room: LiveRoomItem) => {
    selectionHaptic();
    router.push({ pathname: '/live/session', params: { roomId: room.id } } as any);
  };

  const openCreator = (room: LiveRoomItem) => {
    selectionHaptic();
    if (room.creator_username) router.push(`/creator/${room.creator_username}` as any);
    else Alert.alert('Creator profile unavailable', 'This live room is not linked to a public creator username yet.');
  };

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={activeRoom || theme.scheme === 'dark' ? 'light' : 'dark'} />
      {!activeRoom ? (
        <View style={styles.empty}>
          <View style={styles.emptyMark}><MaterialIcons name="sensors" size={31} color={theme.colors.onAccent} /></View>
          <Text style={styles.emptyKicker}>LIVE SIGNAL</Text>
          <Text style={styles.emptyTitle}>The room opens when the culture moves.</Text>
          <Text style={styles.emptyBody}>There are no verified live sessions right now. PLUGGD will never fabricate a room, audience or live status to fill this feed.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.back()} style={styles.emptyAction}>
            <Text style={styles.emptyActionText}>Return to Live</Text>
            <MaterialIcons name="arrow-forward" size={18} color={theme.colors.onAccent} />
          </Pressable>
        </View>
      ) : (
        <View style={[styles.card, { minHeight: height }]} {...panResponder.panHandlers}>
          {activeImage ? <PluggdImage uri={activeImage} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          {!activeImage ? (
            <LinearGradient colors={['#182B33', '#171310', '#0a0806']} style={StyleSheet.absoluteFill}>
              <Text style={styles.initials}>{contentInitials(roomTitle(activeRoom))}</Text>
            </LinearGradient>
          ) : null}
          <LinearGradient colors={['rgba(10,8,6,0.08)', 'rgba(10,8,6,0.38)', 'rgba(10,8,6,0.96)']} locations={[0, 0.45, 1]} style={StyleSheet.absoluteFill} />

          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Close live feed" onPress={() => router.back()} style={styles.iconButton}>
              <MaterialIcons name="keyboard-arrow-down" size={30} color={COLORS.white} />
            </Pressable>
            <Text style={styles.position}>{index + 1} / {liveRooms.length}</Text>
          </View>

          <View style={styles.sideRail}>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${roomHost(activeRoom)}`} onPress={() => openCreator(activeRoom)} style={styles.creatorButton}>
              {activeRoom.creator_avatar_url ? <PluggdImage uri={activeRoom.creator_avatar_url} style={styles.creatorImage} /> : <Text style={styles.creatorInitials}>{contentInitials(roomHost(activeRoom))}</Text>}
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="React in live room" onPress={() => openRoom(activeRoom)} style={styles.sideButton}>
              <MaterialIcons name="bolt" size={24} color={COLORS.white} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Request stage in live room" onPress={() => openRoom(activeRoom)} style={styles.sideButton}>
              <MaterialIcons name="mic" size={24} color={COLORS.white} />
            </Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Support this live room" onPress={() => openRoom(activeRoom)} style={styles.sideButton}>
              <MaterialIcons name="card-giftcard" size={23} color={COLORS.white} />
            </Pressable>
          </View>

          <View style={styles.bottomContent}>
            <View style={styles.liveBadge}>
              <View style={styles.liveDot} />
              <Text style={styles.liveBadgeText}>LIVE</Text>
            </View>
            <Text style={styles.title} numberOfLines={2}>{roomTitle(activeRoom)}</Text>
            <Text style={styles.host} numberOfLines={1}>{roomHost(activeRoom)}</Text>
            {activeRoom.viewer_count ? <Text style={styles.meta}>{formatCompact(activeRoom.viewer_count)} tuned in</Text> : null}
            <View style={styles.chatPreview}>
              <MaterialIcons name="chat-bubble-outline" size={17} color={COLORS.muted} />
              <Text style={styles.chatText} numberOfLines={2}>
                {previewsQuery.data?.get(activeRoom.id) || 'No chat messages yet. Join the room to start the conversation.'}
              </Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Join ${roomTitle(activeRoom)}`} onPress={() => openRoom(activeRoom)} style={styles.joinButton}>
              <Text style={styles.joinText}>Join Live Room</Text>
            </Pressable>
          </View>
        </View>
      )}
    </View>
  );
}

function useLiveFeedStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  card: { flex: 1, backgroundColor: COLORS.canvas },
  initials: { fontFamily: pluggdFonts.satoshiBlack, marginTop: 220, textAlign: 'center', color: COLORS.white, fontSize: 54, fontWeight: '900' },
  topBar: { position: 'absolute', left: 16, right: 16, top: 52, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,16,0.62)' },
  position: { color: COLORS.white, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  sideRail: { position: 'absolute', right: 16, bottom: 170, alignItems: 'center', gap: 16 },
  creatorButton: { width: 54, height: 54, borderRadius: 27, borderWidth: 2, borderColor: COLORS.coral, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: COLORS.surface },
  creatorImage: { width: '100%', height: '100%' },
  creatorInitials: { color: COLORS.white, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  sideButton: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(23,19,16,0.7)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.18)' },
  bottomContent: { position: 'absolute', left: 16, right: 84, bottom: 42 },
  liveBadge: { alignSelf: 'flex-start', height: 28, borderRadius: 10, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 7, backgroundColor: COLORS.coral },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: COLORS.white },
  liveBadgeText: { color: COLORS.white, fontFamily: pluggdFonts.satoshiBold, fontSize: 11 },
  title: { marginTop: 12, color: COLORS.white, fontFamily: pluggdFonts.displayExtraBold, fontSize: 31, lineHeight: 34, textTransform: 'uppercase' },
  host: { marginTop: 6, color: COLORS.soft, fontFamily: pluggdFonts.satoshiBold, fontSize: 16 },
  meta: { fontFamily: pluggdFonts.satoshiBold, marginTop: 5, color: COLORS.muted, fontSize: 12, fontWeight: '800' },
  chatPreview: { marginTop: 14, minHeight: 56, borderRadius: 16, padding: 12, flexDirection: 'row', gap: 8, backgroundColor: 'rgba(23,19,16,0.72)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.13)' },
  chatText: { fontFamily: pluggdFonts.satoshiMedium, flex: 1, color: COLORS.soft, fontSize: 13, lineHeight: 18, fontWeight: '600' },
  joinButton: { marginTop: 14, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill },
  joinText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  empty: { flex: 1, alignItems: 'flex-start', justifyContent: 'center', paddingHorizontal: 26 },
  emptyMark: { width: 58, height: 58, borderRadius: 5, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  emptyKicker: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', fontSize: 11, letterSpacing: 1.8 },
  emptyTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', fontSize: 36, lineHeight: 40, letterSpacing: -1.2, maxWidth: 345, marginTop: 8 },
  emptyBody: { marginTop: 14, color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', fontSize: 14, lineHeight: 21, maxWidth: 340 },
  emptyAction: { marginTop: 24, minHeight: 52, borderRadius: 5, flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20, backgroundColor: theme.colors.accentFill },
  emptyActionText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', fontSize: 14 },
}), [theme]);
}
