import { MaterialIcons } from '@expo/vector-icons';
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
import { supabase } from '../../src/lib/supabase';

const PLUGGD_ORANGE = '#FF5200';
const TABS = ['For You', 'Drops', 'Events', 'Live'];

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
    route: '/marketplace',
    color: '#B45309',
  },
  {
    id: 'club_signal',
    title: 'Club Signal',
    creator: 'Kairo Beats',
    tag: 'Free',
    tagType: 'free',
    route: '/marketplace',
    color: '#15803D',
  },
  {
    id: 'after_hours',
    title: 'After Hours',
    creator: 'Selecta Nia',
    tag: '£1.99',
    tagType: 'paid',
    route: '/marketplace',
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

function PluggdWordmark() {
  return (
    <View style={styles.logoTextRow}>
      <Text style={styles.logoText}>PL</Text>
      <Text style={[styles.logoText, styles.logoAccent]}>U</Text>
      <Text style={styles.logoText}>GGD</Text>
    </View>
  );
}

export default function Home() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('For You');
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

    const beatDrops = beats.slice(0, 3).map((beat, index) => {
      const tag = formatGBP(beat.price ?? 0);

      return {
        id: beat.id,
        title: beat.title,
        creator: beat.producer_name || 'Producer',
        imageUrl: beat.image_url,
        tag,
        tagType: tag === 'Free' ? 'free' as const : 'paid' as const,
        route: '/marketplace',
        color: ['#B45309', '#15803D', '#6D28D9'][index % 3],
      };
    });

    return beatDrops.length > 0 ? beatDrops : FALLBACK_DROPS;
  }, [beats, releases]);

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

  const handleTabPress = (tab: string) => {
    setActiveTab(tab);
    if (tab === 'Live') router.push('/live' as any);
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.header}>
          <View style={styles.headerTitleWrap}>
            <Text style={styles.headerTitle}>Today on Pluggd</Text>
            <PluggdWordmark />
          </View>

          <View style={styles.headerActions}>
            <Pressable style={styles.iconButton} onPress={() => router.push('/explore' as any)}>
              <MaterialIcons name="search" size={23} color="#FFFFFF" />
            </Pressable>

            <Pressable
              style={styles.iconButton}
              onPress={() => router.push('/social/notifications' as any)}
            >
              <MaterialIcons name="notifications-none" size={23} color="#FFFFFF" />
              <View style={styles.notificationDot} />
            </Pressable>
          </View>
        </View>

        <View style={styles.segmentTabs}>
          {TABS.map((tab) => {
            const selected = activeTab === tab;

            return (
              <Pressable
                key={tab}
                onPress={() => handleTabPress(tab)}
                style={[styles.segmentTab, selected && styles.segmentTabActive]}
              >
                <Text style={[styles.segmentTabText, selected && styles.segmentTabTextActive]}>
                  {tab}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {loading ? (
          <View style={styles.loadingBlock}>
            <ActivityIndicator color={PLUGGD_ORANGE} />
            <Text style={styles.loadingText}>Loading your feed...</Text>
          </View>
        ) : null}

        <Pressable
          style={styles.featuredCreatorCard}
          onPress={() => {
            if (featured?.id) router.push(`/release/${featured.id}` as any);
          }}
        >
          <View style={styles.featuredText}>
            <View style={styles.badgeRow}>
              <MaterialIcons name="stars" size={16} color={PLUGGD_ORANGE} />
              <Text style={styles.badgeText}>Featured creator</Text>
            </View>

            <Text style={styles.creatorName}>{featuredName}</Text>
            <Text style={styles.creatorRole}>Artist</Text>
            <Text style={styles.creatorDescription} numberOfLines={3}>
              {featured ? featuredTitle : 'New release, live room tonight, and fresh updates.'}
            </Text>

            <View style={styles.creatorActions}>
              <Pressable style={styles.supportButton}>
                <MaterialIcons name="favorite" size={16} color="#FFFFFF" />
                <Text style={styles.supportButtonText}>Support</Text>
              </Pressable>

              <Pressable style={styles.followButton}>
                <Text style={styles.followButtonText}>Follow</Text>
              </Pressable>
            </View>
          </View>

          <View style={styles.creatorImageWrap}>
            <View style={styles.creatorImageGlow} />
            <View style={styles.creatorImage}>
              {featured?.cover_art_url ? (
                <Image source={{ uri: featured.cover_art_url }} style={styles.creatorImageMedia} />
              ) : (
                <Text style={styles.creatorInitials}>{initials(featuredName)}</Text>
              )}
            </View>
            <View style={styles.newReleaseBadge}>
              <MaterialIcons name="music-note" size={13} color={PLUGGD_ORANGE} />
              <Text style={styles.newReleaseText}>New release</Text>
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

              <Text style={styles.liveName} numberOfLines={1}>
                {room.title}
              </Text>
              <Text style={styles.liveViewers}>{room.viewers} watching</Text>
            </Pressable>
          ))}
        </ScrollView>

        <SectionHeader title="New drops" onPress={() => router.push('/marketplace' as any)} />

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dropList}
        >
          {drops.map((drop) => (
            <Pressable
              key={drop.id}
              style={styles.dropCard}
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

              <Text style={styles.dropTitle} numberOfLines={1}>
                {drop.title}
              </Text>
              <Text style={styles.dropCreator} numberOfLines={1}>
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

        <SectionHeader title="Events near you" />

        <Pressable style={styles.eventCard}>
          <View style={styles.eventDateBox}>
            <Text style={styles.eventDay}>
              {eventDate.toLocaleDateString('en-GB', { weekday: 'short' }).toUpperCase()}
            </Text>
            <Text style={styles.eventDate}>{eventDate.getDate()}</Text>
            <Text style={styles.eventMonth}>
              {eventDate.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase()}
            </Text>
          </View>

          <View style={styles.eventImage}>
            {event.cover_image_url ? (
              <Image source={{ uri: event.cover_image_url }} style={styles.eventImageMedia} />
            ) : (
              <MaterialIcons name="celebration" size={26} color={PLUGGD_ORANGE} />
            )}
          </View>

          <View style={styles.eventInfo}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {event.title}
            </Text>
            <Text style={styles.eventVenue} numberOfLines={1}>
              {eventVenue}
            </Text>

            <View style={styles.eventLocationRow}>
              <MaterialIcons name="location-on" size={15} color="#9B9B9B" />
              <Text style={styles.eventCity} numberOfLines={1}>
                {eventCity}
              </Text>
            </View>
          </View>

          <MaterialIcons name="chevron-right" size={25} color="#777777" />
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

function SectionHeader({ title, onPress }: { title: string; onPress?: () => void }) {
  return (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionTitle}>{title}</Text>
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
    paddingTop: 8,
    paddingBottom: 180,
  },
  header: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  headerTitleWrap: {
    flex: 1,
    paddingRight: 10,
  },
  headerTitle: {
    color: '#FFFFFF',
    fontSize: 28,
    fontWeight: '900',
  },
  logoTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '900',
    letterSpacing: 1,
  },
  logoAccent: {
    color: PLUGGD_ORANGE,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 9,
    paddingTop: 2,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationDot: {
    position: 'absolute',
    top: 9,
    right: 10,
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: PLUGGD_ORANGE,
  },
  segmentTabs: {
    flexDirection: 'row',
    backgroundColor: '#111111',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 4,
    marginBottom: 14,
  },
  segmentTab: {
    flex: 1,
    height: 36,
    borderRadius: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },
  segmentTabActive: {
    backgroundColor: '#23140E',
    borderWidth: 1,
    borderColor: PLUGGD_ORANGE,
  },
  segmentTabText: {
    color: '#AFAFAF',
    fontSize: 14,
    fontWeight: '800',
  },
  segmentTabTextActive: {
    color: PLUGGD_ORANGE,
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
    minHeight: 176,
    backgroundColor: '#151515',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#262626',
    overflow: 'hidden',
    padding: 14,
    flexDirection: 'row',
    marginBottom: 18,
  },
  featuredText: {
    flex: 1,
    paddingRight: 10,
  },
  badgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginBottom: 9,
  },
  badgeText: {
    color: PLUGGD_ORANGE,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  creatorName: {
    color: '#FFFFFF',
    fontSize: 29,
    fontWeight: '900',
  },
  creatorRole: {
    color: '#BEBEBE',
    fontSize: 15,
    fontWeight: '700',
    marginTop: 2,
  },
  creatorDescription: {
    color: '#B8B8B8',
    fontSize: 14,
    lineHeight: 19,
    marginTop: 10,
  },
  creatorActions: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 13,
  },
  supportButton: {
    height: 38,
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
    fontSize: 14,
    fontWeight: '900',
  },
  followButton: {
    height: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#4A4A4A',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  followButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  creatorImageWrap: {
    width: 118,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  creatorImageGlow: {
    position: 'absolute',
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#58210B',
    opacity: 0.55,
  },
  creatorImage: {
    width: 102,
    height: 128,
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
    fontWeight: '900',
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
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 11,
  },
  sectionTitle: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  seeAll: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  seeAllText: {
    color: PLUGGD_ORANGE,
    fontSize: 14,
    fontWeight: '900',
  },
  liveList: {
    paddingRight: 14,
    gap: 14,
    marginBottom: 20,
  },
  liveAvatarItem: {
    width: 86,
    alignItems: 'center',
  },
  liveAvatarRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  liveAvatar: {
    width: 58,
    height: 58,
    borderRadius: 29,
    alignItems: 'center',
    justifyContent: 'center',
  },
  liveAvatarText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
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
    fontWeight: '900',
  },
  liveName: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    marginTop: 9,
    maxWidth: 82,
  },
  liveViewers: {
    color: '#8D8D8D',
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
    maxWidth: 86,
  },
  dropList: {
    paddingRight: 14,
    gap: 12,
    marginBottom: 20,
  },
  dropCard: {
    width: 126,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 9,
  },
  dropArtwork: {
    height: 94,
    borderRadius: 8,
    marginBottom: 9,
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
    fontSize: 15,
    fontWeight: '900',
  },
  dropCreator: {
    color: '#A4A4A4',
    fontSize: 13,
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
    fontSize: 12,
    fontWeight: '900',
  },
  dropTagFreeText: {
    color: '#41D17D',
  },
  eventCard: {
    minHeight: 92,
    backgroundColor: '#151515',
    borderWidth: 1,
    borderColor: '#262626',
    borderRadius: 8,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
  },
  eventDateBox: {
    width: 54,
    height: 68,
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
    fontWeight: '900',
  },
  eventDate: {
    color: '#FFFFFF',
    fontSize: 24,
    fontWeight: '900',
    lineHeight: 28,
  },
  eventMonth: {
    color: '#BDBDBD',
    fontSize: 11,
    fontWeight: '800',
  },
  eventImage: {
    width: 56,
    height: 56,
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
    fontSize: 17,
    fontWeight: '900',
  },
  eventVenue: {
    color: '#AFAFAF',
    fontSize: 14,
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
