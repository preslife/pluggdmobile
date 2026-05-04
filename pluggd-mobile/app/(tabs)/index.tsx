import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { supabase } from '../../src/lib/supabase';

const PLUGGD_ORANGE = '#FF5200';

type ReleaseRow = {
  id: string;
  title: string;
  artist?: string | null;
  cover_art_url?: string | null;
  price?: number | null;
  download_price?: number | null;
  minimum_price?: number | null;
  created_at?: string | null;
};

type BeatRow = {
  id: string;
  title: string;
  producer_name?: string | null;
  image_url?: string | null;
  price?: number | null;
  created_at?: string | null;
};

type LiveRoomRow = {
  id: string;
  title: string;
  status?: string | null;
  created_at?: string | null;
};

type EventRow = {
  id: string;
  title: string;
  location?: string | null;
  starts_at?: string | null;
  cover_image_url?: string | null;
};

type DropCardItem = {
  id: string;
  title: string;
  creator: string;
  imageUrl?: string | null;
  tag: string;
  tagType: 'paid' | 'free';
  route: string;
  color: string;
};

const FALLBACK_LIVE_ROOMS = [
  { id: 'dj_neptune', title: 'DJ Neptune', viewers: '8.2K', color: '#FF5200' },
  { id: 'selecta_nia', title: 'Selecta Nia', viewers: '5.1K', color: '#8B5CF6' },
  { id: 'ola', title: 'Ola', viewers: '3.7K', color: '#22C55E' },
  { id: 'kairo_beats', title: 'Kairo Beats', viewers: '2.4K', color: '#F97316' },
];

const FALLBACK_DROPS: DropCardItem[] = [
  {
    id: 'midnight_motion',
    title: 'Midnight Motion',
    creator: 'Maya Sol',
    tag: '£2.99',
    tagType: 'paid',
    route: '/music',
    color: '#B45309',
  },
  {
    id: 'club_signal',
    title: 'Club Signal',
    creator: 'Kairo Beats',
    tag: 'Free',
    tagType: 'free',
    route: '/music',
    color: '#15803D',
  },
  {
    id: 'after_hours',
    title: 'After Hours',
    creator: 'Selecta Nia',
    tag: '£1.99',
    tagType: 'paid',
    route: '/music',
    color: '#6D28D9',
  },
];

const FALLBACK_EVENT: EventRow = {
  id: 'afrobeats-night',
  title: 'Afrobeats Night',
  location: 'The Camden Loft, London',
  starts_at: '2026-05-24T20:00:00.000Z',
};

function formatGBP(value: number | null | undefined) {
  if (!value || value <= 0) return 'Free';
  return `£${value.toFixed(2)}`;
}

function initials(name: string) {
  return name
    .split(' ')
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export default function Home() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const [releases, setReleases] = useState<ReleaseRow[]>([]);
  const [beats, setBeats] = useState<BeatRow[]>([]);
  const [liveRooms, setLiveRooms] = useState<LiveRoomRow[]>([]);
  const [events, setEvents] = useState<EventRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadFeed = async () => {
      setLoading(true);

      try {
        const [releaseResult, beatResult, liveResult, eventResult] = await Promise.all([
          supabase
            .from('releases')
            .select('id,title,artist,cover_art_url,price,download_price,minimum_price,created_at')
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('beats')
            .select('id,title,producer_name,image_url,price,created_at')
            .eq('is_published', true)
            .order('created_at', { ascending: false })
            .limit(6),
          (supabase as any)
            .from('session_rooms')
            .select('id,title,status,created_at')
            .eq('status', 'live')
            .order('created_at', { ascending: false })
            .limit(8),
          supabase
            .from('events')
            .select('id,title,location,starts_at,cover_image_url')
            .gte('starts_at', new Date().toISOString())
            .order('starts_at', { ascending: true })
            .limit(3),
        ]);

        if (!mounted) return;

        setReleases((releaseResult.data ?? []) as ReleaseRow[]);
        setBeats((beatResult.data ?? []) as BeatRow[]);
        setLiveRooms(Array.isArray(liveResult.data) ? (liveResult.data as LiveRoomRow[]) : []);
        setEvents((eventResult.data ?? []) as EventRow[]);
      } catch (error) {
        console.warn('Home feed unavailable:', error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    loadFeed();

    return () => {
      mounted = false;
    };
  }, []);

  const featured = releases[0];
  const featuredName = featured?.artist || 'Maya Sol';
  const featuredTitle = featured?.title || 'New release, live room tonight, and fresh updates.';

  const drops = useMemo<DropCardItem[]>(() => {
    const releaseDrops = releases.slice(0, 3).map((release, index) => {
      const price = release.price ?? release.download_price ?? release.minimum_price ?? 0;
      const tag = formatGBP(price);

      return {
        id: release.id,
        title: release.title,
        creator: release.artist || 'Pluggd Creator',
        imageUrl: release.cover_art_url,
        tag,
        tagType: tag === 'Free' ? 'free' as const : 'paid' as const,
        route: `/release/${release.id}`,
        color: ['#B45309', '#15803D', '#6D28D9'][index % 3],
      };
    });

    if (releaseDrops.length > 0) return releaseDrops;

    return FALLBACK_DROPS;
  }, [releases]);

  const liveItems = liveRooms.length > 0
    ? liveRooms.slice(0, 4).map((room, index) => ({
        id: room.id,
        title: room.title || 'Live room',
        viewers: `${Math.max(1, index + 2)}.${index + 1}K`,
        color: ['#FF5200', '#8B5CF6', '#22C55E', '#F97316'][index % 4],
      }))
    : FALLBACK_LIVE_ROOMS;

  const event = events[0] ?? FALLBACK_EVENT;
  const eventDate = event.starts_at ? new Date(event.starts_at) : new Date(FALLBACK_EVENT.starts_at!);
  const eventLocationParts = (event.location || FALLBACK_EVENT.location || '').split(',');
  const eventVenue = eventLocationParts[0]?.trim() || 'Venue TBA';
  const eventCity = eventLocationParts.slice(1).join(',').trim() || 'London';
  const screenGradient =
    theme.scheme === 'dark'
      ? (['#080808', '#0C0C0C', '#080808'] as const)
      : (['#FAFAF8', '#FFFFFF', '#F4F2EE'] as const);
  const artworkGradient =
    theme.scheme === 'dark'
      ? (['rgba(255,82,0,0.18)', 'rgba(255,82,0,0.02)'] as const)
      : (['rgba(255,82,0,0.18)', 'rgba(255,255,255,0.12)'] as const);

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <LinearGradient colors={screenGradient} style={StyleSheet.absoluteFill} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>Today on Pluggd</Text>
            <Text style={[styles.headerSubtitle, { color: theme.colors.textMuted }]}>Music, mixes, scenes, events, market updates and live activity.</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={PLUGGD_ORANGE} />
            <Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Loading your feed...</Text>
          </View>
        ) : null}

        <Pressable
          style={[
            styles.featuredCreatorCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
          onPress={() => {
            if (featured?.id) router.push(`/release/${featured.id}` as any);
          }}
        >
          <LinearGradient
            colors={theme.scheme === 'dark' ? ['rgba(255,82,0,0.11)', 'rgba(255,82,0,0)'] : ['rgba(255,82,0,0.08)', 'rgba(255,255,255,0)']}
            start={{ x: 1, y: 0 }}
            end={{ x: 0, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.featuredText}>
            <View style={styles.badgeRow}>
              <MaterialIcons name="stars" size={16} color={PLUGGD_ORANGE} />
              <Text style={styles.badgeText}>Featured creator</Text>
            </View>

            <Text style={[styles.creatorName, { color: theme.colors.text }]}>{featuredName}</Text>
            <Text style={[styles.creatorRole, { color: theme.colors.textMuted }]}>Artist</Text>
            <Text style={[styles.creatorDescription, { color: theme.colors.textMuted }]} numberOfLines={3}>
              {featured ? featuredTitle : 'New release, live room tonight, and fresh updates.'}
            </Text>

            <View style={styles.creatorActions}>
              <Pressable style={styles.supportButton}>
                <MaterialIcons name="favorite" size={16} color="#FFFFFF" />
                <Text style={styles.supportButtonText}>Support</Text>
              </Pressable>

              <Pressable style={styles.followButton}>
                <Text style={[styles.followButtonText, { color: theme.colors.text }]}>Follow</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.creatorImageWrap}>
            <View style={[styles.creatorImageGlow, { backgroundColor: PLUGGD_ORANGE }]} />
            <View
              style={[
                styles.creatorImage,
                {
                  backgroundColor: theme.colors.artworkBase,
                  borderColor: theme.colors.borderAccent,
                },
              ]}
            >
              <LinearGradient colors={artworkGradient} style={StyleSheet.absoluteFill} />
              {featured?.cover_art_url ? (
                <Image source={{ uri: featured.cover_art_url }} style={styles.creatorImageMedia} />
              ) : (
                <Text style={[styles.creatorInitials, { color: theme.colors.text }]}>{initials(featuredName)}</Text>
              )}
            </View>
            <View
              style={[
                styles.newReleaseBadge,
                {
                  backgroundColor: theme.colors.surfaceAlt,
                  borderColor: theme.colors.border,
                },
              ]}
            >
              <MaterialIcons name="music-note" size={13} color={PLUGGD_ORANGE} />
              <Text style={[styles.newReleaseText, { color: theme.colors.text }]}>New release</Text>
            </View>
          </View>
        </Pressable>

        <SectionHeader title="Live now" onPress={() => router.push('/live' as any)} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.liveList}
        >
          {liveItems.map((room) => (
            <Pressable
              key={room.id}
              style={styles.liveAvatarItem}
              onPress={() => router.push('/live' as any)}
            >
              <View style={[styles.liveAvatarRing, { borderColor: room.color }]}>
                <View style={[styles.liveAvatar, { backgroundColor: room.color }]}>
                  <Text style={styles.liveAvatarText}>{initials(room.title)}</Text>
                </View>

                <View style={styles.liveBadge}>
                  <Text style={styles.liveBadgeText}>LIVE</Text>
                </View>
              </View>

              <Text style={[styles.liveName, { color: theme.colors.text }]} numberOfLines={1}>
                {room.title}
              </Text>
              <Text style={[styles.liveViewers, { color: theme.colors.textSubtle }]}>{room.viewers} watching</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="New music" onPress={() => router.push('/music' as any)} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dropList}
        >
          {drops.map((drop) => (
            <Pressable
              key={drop.id}
              style={[
                styles.dropCard,
                {
                  backgroundColor: theme.colors.surface,
                  borderColor: theme.colors.border,
                  shadowColor: theme.colors.shadow,
                },
              ]}
              onPress={() => router.push(drop.route as any)}
            >
              <View style={[styles.dropArtwork, { backgroundColor: drop.color }]}>
                {drop.imageUrl ? (
                  <Image source={{ uri: drop.imageUrl }} style={styles.dropArtworkImage} />
                ) : (
                  <MaterialIcons name="play-arrow" size={24} color="#FFFFFF" />
                )}
                <View style={styles.playBadge}>
                  <MaterialIcons name="play-arrow" size={16} color="#FFFFFF" />
                </View>
              </View>

              <Text style={[styles.dropTitle, { color: theme.colors.text }]} numberOfLines={1}>
                {drop.title}
              </Text>
              <Text style={[styles.dropCreator, { color: theme.colors.textMuted }]} numberOfLines={1}>
                {drop.creator}
              </Text>

              <View style={[styles.dropTag, drop.tagType === 'free' && styles.dropTagFree]}>
                <Text style={[styles.dropTagText, drop.tagType === 'free' && styles.dropTagFreeText]}>
                  {drop.tag}
                </Text>
              </View>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="Events near you" onPress={() => router.push('/events' as any)} />

        <Pressable
          style={[
            styles.eventCard,
            {
              backgroundColor: theme.colors.surface,
              borderColor: theme.colors.border,
              shadowColor: theme.colors.shadow,
            },
          ]}
          onPress={() => router.push(`/events/${event.id}` as any)}
        >
          <View
            style={[
              styles.eventDateBox,
              {
                backgroundColor: theme.colors.surfaceStrong,
                borderColor: theme.colors.borderAccent,
              },
            ]}
          >
            <Text style={styles.eventDay}>
              {eventDate.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}
            </Text>
            <Text style={[styles.eventDate, { color: theme.colors.text }]}>{eventDate.getDate()}</Text>
            <Text style={[styles.eventMonth, { color: theme.colors.textMuted }]}>
              {eventDate.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
            </Text>
          </View>

          <View style={[styles.eventImage, { backgroundColor: theme.colors.surfaceAlt }]}>
            {event.cover_image_url ? (
              <Image source={{ uri: event.cover_image_url }} style={styles.eventImageMedia} />
            ) : (
              <MaterialIcons name="celebration" size={26} color={PLUGGD_ORANGE} />
            )}
          </View>

          <View style={styles.eventInfo}>
            <Text style={[styles.eventTitle, { color: theme.colors.text }]} numberOfLines={1}>
              {event.title}
            </Text>
            <Text style={[styles.eventVenue, { color: theme.colors.textMuted }]} numberOfLines={1}>
              {eventVenue}
            </Text>

            <View style={styles.eventLocationRow}>
              <MaterialIcons name="location-on" size={15} color={theme.colors.textSubtle} />
              <Text style={[styles.eventCity, { color: theme.colors.textSubtle }]} numberOfLines={1}>
                {eventCity}
              </Text>
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={25} color={theme.colors.textSubtle} />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.sectionHeader}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      <Pressable style={styles.seeAll} onPress={onPress}>
        <Text style={styles.seeAllText}>See all</Text>
        <MaterialIcons name="chevron-right" size={20} color={PLUGGD_ORANGE} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#080808',
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 54,
    paddingBottom: 146,
  },
  header: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  headerTitle: {
    fontSize: 19,
    lineHeight: 24,
    fontWeight: '700',
  },
  headerSubtitle: {
    color: '#AFAFAF',
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '600',
    marginTop: 5,
  },
  loadingBlock: {
    minHeight: 92,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    color: '#9B9B9B',
    fontSize: 13,
    fontWeight: '700',
    marginTop: 8,
  },
  featuredCreatorCard: {
    minHeight: 128,
    backgroundColor: '#151515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
    padding: 10,
    flexDirection: 'row',
    marginBottom: 12,
    shadowOpacity: 0.12,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
  featuredText: {
    flex: 1,
    paddingRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 7,
  },
  badgeText: {
    color: PLUGGD_ORANGE,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  creatorName: {
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '700',
  },
  creatorRole: {
    color: '#BEBEBE',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  creatorDescription: {
    color: '#B8B8B8',
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 8,
  },
  creatorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 11,
  },
  supportButton: {
    height: 32,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 13,
    gap: 5,
  },
  supportButtonText: {
    color: '#FFFFFF',
    fontSize: 12.5,
    fontWeight: '700',
  },
  followButton: {
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4A4A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  creatorImageWrap: {
    width: 88,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  creatorImageGlow: {
    position: 'absolute',
    width: 78,
    height: 78,
    borderRadius: 39,
    backgroundColor: '#58210B',
    opacity: 0.28,
  },
  creatorImage: {
    width: 78,
    height: 98,
    borderRadius: 8,
    backgroundColor: '#2A1711',
    borderWidth: 1,
    borderColor: '#3A2A24',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  creatorImageMedia: {
    width: '100%',
    height: '100%',
  },
  creatorInitials: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
  },
  newReleaseBadge: {
    position: 'absolute',
    top: 7,
    right: 0,
    borderRadius: 999,
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#3A3A3A',
    paddingHorizontal: 8,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  newReleaseText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 7,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: PLUGGD_ORANGE,
    fontSize: 13,
    fontWeight: '700',
  },
  liveList: {
    paddingRight: 14,
    gap: 10,
    marginBottom: 12,
  },
  liveAvatarItem: {
    width: 68,
    alignItems: 'center',
  },
  liveAvatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  liveAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveAvatarText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  liveBadge: {
    position: 'absolute',
    bottom: -5,
    backgroundColor: PLUGGD_ORANGE,
    borderRadius: 5,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveBadgeText: {
    color: '#FFFFFF',
    fontSize: 9,
    fontWeight: '700',
  },
  liveName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 8,
    maxWidth: 82,
  },
  liveViewers: {
    color: '#8D8D8D',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
    maxWidth: 86,
  },
  dropList: {
    paddingRight: 14,
    gap: 9,
    marginBottom: 12,
  },
  dropCard: {
    width: 108,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 7,
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  dropArtwork: {
    height: 78,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  dropArtworkImage: {
    width: '100%',
    height: '100%',
  },
  playBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(0,0,0,0.55)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dropTitle: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
  },
  dropCreator: {
    color: '#A4A4A4',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  dropTag: {
    alignSelf: 'flex-start',
    backgroundColor: '#25150E',
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 5,
    marginTop: 8,
  },
  dropTagFree: {
    backgroundColor: '#102316',
  },
  dropTagText: {
    color: PLUGGD_ORANGE,
    fontSize: 11,
    fontWeight: '700',
  },
  dropTagFreeText: {
    color: '#41D17D',
  },
  eventCard: {
    minHeight: 80,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 9,
    flexDirection: 'row',
    alignItems: 'center',
    shadowOpacity: 0.1,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 8 },
  },
  eventDateBox: {
    width: 48,
    height: 58,
    borderRadius: 8,
    backgroundColor: '#20130E',
    borderWidth: 1,
    borderColor: '#3B261A',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 10,
  },
  eventDay: {
    color: PLUGGD_ORANGE,
    fontSize: 11,
    fontWeight: '700',
  },
  eventDate: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '700',
    lineHeight: 28,
  },
  eventMonth: {
    color: '#BDBDBD',
    fontSize: 11,
    fontWeight: '700',
  },
  eventImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: '#202020',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 11,
    overflow: 'hidden',
  },
  eventImageMedia: {
    width: '100%',
    height: '100%',
  },
  eventInfo: {
    flex: 1,
    minWidth: 0,
  },
  eventTitle: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '700',
  },
  eventVenue: {
    color: '#AFAFAF',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 3,
  },
  eventLocationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    marginTop: 5,
  },
  eventCity: {
    color: '#9B9B9B',
    fontSize: 13,
    fontWeight: '700',
  },
});
