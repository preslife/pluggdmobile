import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter } from 'expo-router';
import { useMemo, useRef } from 'react';
import {
  Animated as RNAnimated,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { LiveTicker } from '../../../components/LiveTicker';
import { PluggdImage } from '../../components/PluggdImage';
import { PremiumSkeleton } from '../../components/PremiumSkeleton';
import { ReleaseArtwork } from '../../components/ReleaseArtwork';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback } from '../../context/PlaybackProvider';
import { selectionHaptic } from '../../design/haptics';
import { useReducedMotion } from '../../design/useReducedMotion';
import { useBackstage, useHomeFeed, useLiveRooms } from '../culture/useCultureData';
import {
  buildBalancedHomePicks,
  buildDiscoveryItems,
  buildDiscoveryScenes,
  selectDailyFeature,
  type DiscoveryItem,
} from '../discovery/discoveryModel';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';
import { EdPressable, Enter } from '../editorial/EditorialBits';
import {
  buildHomeSignals,
  buildNextWaveItems,
  loadHomeEditorialStories,
  loadHomeMarketSignals,
  loadHomeRecentlyPlayed,
  type HomeNextWaveItem,
} from './homeDiscoveryData';

const INK = '#F7F2E9';
const MUTED = '#A69F95';
const ORANGE = '#FF6600';
const LINE = '#29251F';

function featuredActionLabel(item: DiscoveryItem) {
  if (item.kind === 'release') return 'Support release';
  if (item.kind === 'beat') return 'View licences';
  if (item.kind === 'mix') return 'Open mix';
  return 'Open soundboard';
}

function eventActionLabel(price?: number | null) {
  if (Number(price ?? 0) > 0) return 'Tickets';
  if (price === 0) return 'RSVP';
  return 'Details';
}

function roomMeta(room: { creator_name?: string | null; category?: string | null; scheduled_for?: string | null; status?: string | null; viewer_count?: number | null }) {
  const identity = room.creator_name || (room.category && !room.category.includes('_') ? room.category : null) || 'PLUGGD Live';
  if (room.status === 'live') return `${identity} · ${room.viewer_count || 0} listening`;
  if (room.scheduled_for) {
    const date = new Date(room.scheduled_for);
    if (!Number.isNaN(date.getTime())) {
      return `${identity} · ${date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}, ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`;
    }
  }
  return identity;
}

function sectionLabelForRecent(count: number) {
  return count === 1 ? 'Resume your last find.' : 'Resume music you recently played.';
}

export function MusicDiscoveryHome() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const feed = useHomeFeed();
  const live = useLiveRooms();
  const backstage = useBackstage();
  const { playQueue, playTrack } = usePlayback();
  const reducedMotion = useReducedMotion();
  const scrollY = useRef(new RNAnimated.Value(0)).current;

  const items = useMemo(() => buildDiscoveryItems(feed.data), [feed.data]);
  const scenes = useMemo(() => buildDiscoveryScenes(feed.data), [feed.data]);
  const featured = useMemo(() => selectDailyFeature(items), [items]);
  const picks = useMemo(() => buildBalancedHomePicks(items, featured?.id), [featured?.id, items]);
  const newReleases = feed.data?.releases.slice(0, 6) ?? [];
  const mixes = feed.data?.mixes.slice(0, 5) ?? [];
  const liveRooms = live.data?.slice(0, 4) ?? [];
  const communities = backstage.data?.communities ?? [];
  const releaseIds = useMemo(() => feed.data?.releases.map((release) => release.id) ?? [], [feed.data?.releases]);

  const editorial = useQuery({
    queryKey: ['culture', 'home', 'editorial'],
    queryFn: () => loadHomeEditorialStories(2),
    staleTime: 1000 * 60 * 5,
  });
  const marketSignals = useQuery({
    queryKey: ['culture', 'home', 'market-signals', releaseIds],
    enabled: releaseIds.length > 0,
    queryFn: () => loadHomeMarketSignals(releaseIds),
    staleTime: 1000 * 60 * 3,
  });
  const recent = useQuery({
    queryKey: ['culture', 'home', 'recent', user?.id],
    enabled: Boolean(user?.id),
    queryFn: () => loadHomeRecentlyPlayed(6),
    staleTime: 1000 * 60 * 2,
  });

  const signals = useMemo(
    () => buildHomeSignals(feed.data, liveRooms, communities),
    [communities, feed.data, liveRooms],
  );
  const nextWave = useMemo(
    () => buildNextWaveItems(feed.data, communities, marketSignals.data ?? new Map()),
    [communities, feed.data, marketSignals.data],
  );
  const featuredEvent = useMemo(
    () => feed.data?.events.find((event) => Boolean(event.cover_image_url)) ?? feed.data?.events[0],
    [feed.data?.events],
  );
  const featuredRoom = useMemo(
    () => liveRooms.find((room) => room.status === 'live') ?? liveRooms[0],
    [liveRooms],
  );
  const beatGateway = feed.data?.beats.find((beat) => Boolean(beat.image_url));
  const packGateway = feed.data?.samplePacks.find((pack) => Boolean(pack.cover_art_url));
  const story = editorial.data?.[0];
  const refreshing =
    feed.isRefetching ||
    live.isRefetching ||
    backstage.isRefetching ||
    editorial.isRefetching ||
    marketSignals.isRefetching ||
    recent.isRefetching;

  const refresh = () => {
    void feed.refetch();
    void live.refetch();
    void backstage.refetch();
    void editorial.refetch();
    if (releaseIds.length) void marketSignals.refetch();
    if (user?.id) void recent.refetch();
  };

  const play = async (item: DiscoveryItem) => {
    selectionHaptic();
    const queue = items.map((entry) => entry.track);
    await playQueue(queue, Math.max(0, items.findIndex((entry) => entry.id === item.id)));
  };

  const featuredParallax = reducedMotion
    ? undefined
    : {
        transform: [
          {
            translateY: scrollY.interpolate({
              inputRange: [0, 220],
              outputRange: [0, 12],
              extrapolate: 'clamp',
            }),
          },
          {
            scale: scrollY.interpolate({
              inputRange: [0, 220],
              outputRange: [1, 1.025],
              extrapolate: 'clamp',
            }),
          },
        ],
      };

  return (
    <View style={styles.screen}>
      <DiscoveryHeader />
      <RNAnimated.ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={ORANGE} />}
        onScroll={RNAnimated.event([{ nativeEvent: { contentOffset: { y: scrollY } } }], { useNativeDriver: true })}
        scrollEventThrottle={16}
      >
        <Enter delay={0}>
          <View style={styles.titleRow}>
            <View>
              <Text style={styles.eyebrow}>
                {new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'long' })
                  .format(new Date())
                  .toUpperCase()
                  .replace(',', ' ·')}
              </Text>
              <Text style={styles.title}>The Daily Plug</Text>
            </View>
            <Text style={styles.editorNote}>
              {featured?.isEditorialPick ? 'Featured by' : 'Your daily'}{`\n`}
              {featured?.isEditorialPick ? 'PLUGGD editors' : 'PLUGGD selection'}
            </Text>
          </View>
        </Enter>

        {signals.length ? <LiveTicker items={signals.map((signal) => signal.label)} variant="home" speed={34} /> : null}

        {feed.isLoading ? <HomeLoading /> : null}
        {!feed.isLoading && !featured ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>The signal is quiet.</Text>
            <Text style={styles.emptyBody}>Fresh playable music will appear here as creators publish it.</Text>
          </View>
        ) : null}

        {featured ? (
          <Enter delay={60}>
            <View style={styles.featured}>
              <View style={styles.featuredArtFrame}>
                <RNAnimated.View style={[styles.featuredArtMotion, featuredParallax]}>
                  <EdPressable
                    haptic={false}
                    accessibilityRole="button"
                    accessibilityLabel={`Play ${featured.title} by ${featured.creator}`}
                    onPress={() => void play(featured)}
                    style={styles.featuredArtWrap}
                  >
                    <Artwork item={featured} style={styles.featuredArt} iconSize={34} />
                    <View style={styles.kindFlag}><Text style={styles.kindFlagText}>{featured.kind.toUpperCase()}</Text></View>
                    <View style={styles.featuredPlayBadge}>
                      <MaterialIcons name="play-arrow" size={25} color="#100B07" />
                    </View>
                  </EdPressable>
                </RNAnimated.View>
              </View>
              <View style={styles.featuredCopy}>
                <Text style={styles.reason}>{featured.discoveryReason.toUpperCase()}</Text>
                <Text style={styles.featuredTitle} numberOfLines={2}>{featured.title}</Text>
                <Text style={styles.featuredCreator} numberOfLines={1}>{featured.creator}</Text>
                <Text style={styles.featuredDescription} numberOfLines={3}>{featured.description}</Text>
                <EdPressable
                  accessibilityRole="button"
                  accessibilityLabel={`${featuredActionLabel(featured)} by ${featured.creator}`}
                  onPress={() => router.push((featured.supportRoute || featured.destinationRoute) as any)}
                  style={styles.supportButton}
                >
                  <View style={styles.supportButtonInner}>
                    <Text style={styles.supportText}>{featuredActionLabel(featured)}</Text>
                    <MaterialIcons name="arrow-forward" size={15} color={INK} />
                  </View>
                </EdPressable>
              </View>
            </View>
          </Enter>
        ) : null}

        {picks.length ? (
          <Enter delay={120}>
            <SectionHeader
              title="Four worth your time"
              action="See all"
              onAction={() => router.push('/discover' as any)}
            />
            <View style={styles.pickGrid}>
              {[picks.slice(0, 2), picks.slice(2, 4)].map((row, rowIndex) => (
                <View key={`pick-row-${rowIndex}`} style={styles.pickRow}>
                  {row.map((item) => (
                    <View key={item.id} style={styles.pick}>
                      <EdPressable
                        haptic={false}
                        accessibilityRole="button"
                        accessibilityLabel={`Play ${item.title} by ${item.creator}`}
                        onPress={() => void play(item)}
                        style={styles.pickArtSurface}
                      >
                        <Artwork item={item} style={styles.pickArt} iconSize={24} />
                        <View style={styles.pickKind}>
                          <Text style={styles.pickKindText}>{item.kind.toUpperCase()}</Text>
                        </View>
                        <View style={styles.smallPlay}>
                          <MaterialIcons name="play-arrow" size={20} color="#100B07" />
                        </View>
                      </EdPressable>
                      <EdPressable
                        accessibilityRole="button"
                        accessibilityLabel={`Open ${item.title} by ${item.creator}`}
                        onPress={() => router.push(item.destinationRoute as any)}
                        style={styles.pickCopy}
                      >
                        <View style={styles.pickCopyText}>
                          <Text style={styles.pickTitle} numberOfLines={1}>{item.title}</Text>
                          <Text style={styles.pickCreator} numberOfLines={1}>{item.creator}</Text>
                        </View>
                      </EdPressable>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </Enter>
        ) : null}

        {user && recent.data?.length ? (
          <>
            <SectionHeader
              title="Pick up where you left off"
              subtitle={sectionLabelForRecent(recent.data.length)}
              action="Library"
              onAction={() => router.push('/library' as any)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.recentRail}>
              {recent.data.map((item) => (
                <View key={item.id} style={styles.recentCard}>
                  <EdPressable
                    haptic={false}
                    accessibilityRole="button"
                    accessibilityLabel={`Resume ${item.title} by ${item.creator}`}
                    onPress={() => {
                      selectionHaptic();
                      void playTrack(item.track);
                    }}
                    style={styles.recentSurface}
                  >
                    {item.imageUrl ? (
                      <ReleaseArtwork uri={item.imageUrl} style={styles.recentArt} displayWidth={240} />
                    ) : (
                      <View style={[styles.recentArt, styles.artFallback]}><MaterialIcons name="album" size={24} color={ORANGE} /></View>
                    )}
                    <View style={styles.recentCopy}>
                      <Text style={styles.recentKicker}>CONTINUE LISTENING</Text>
                      <Text style={styles.recentTitle} numberOfLines={1}>{item.title}</Text>
                      <Text style={styles.recentCreator} numberOfLines={1}>{item.creator}</Text>
                    </View>
                    <View style={styles.recentPlay}>
                      <MaterialIcons name="play-arrow" size={21} color="#100B07" />
                    </View>
                  </EdPressable>
                  <EdPressable
                    accessibilityRole="button"
                    accessibilityLabel={`Open ${item.title}`}
                    onPress={() => router.push(item.route as any)}
                    style={styles.recentOpen}
                  >
                    <MaterialIcons name="north-east" size={17} color={INK} />
                  </EdPressable>
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {scenes.length ? (
          <>
            <SectionHeader title="From the scenes" subtitle="Cities and sounds moving right now." />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRow}>
              {scenes.map((scene) => (
                <View key={scene.label} style={styles.sceneFrame}>
                  {scene.image ? <PluggdImage uri={scene.image} style={styles.sceneImage} resizeMode="cover" displayWidth={360} /> : <View style={styles.sceneFallback} />}
                  <LinearGradient colors={['rgba(5,4,3,0.05)', 'rgba(5,4,3,0.82)']} style={StyleSheet.absoluteFillObject} />
                  <View style={styles.sceneCopy}>
                    <Text style={styles.sceneLabel}>{scene.label}</Text>
                    <Text style={styles.sceneDetail}>{scene.detail}</Text>
                  </View>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Explore ${scene.label}`}
                    onPress={() => {
                      selectionHaptic();
                      router.push(scene.route as any);
                    }}
                    style={styles.sceneHit}
                  />
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {mixes.length ? (
          <>
            <SectionHeader
              title="Mixes in rotation"
              subtitle="Full journeys from selectors and scenes."
              action="Enter Mixes"
              onAction={() => router.push('/mixes' as any)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.mixRail}>
              {mixes.map((mix, index) => {
                const playable = items.find((item) => item.kind === 'mix' && item.track.mixId === mix.id);
                const route = `/mixes/${mix.slug || mix.id}`;
                return (
                  <View key={mix.id} style={[styles.mixCard, index === 0 && styles.mixCardLead]}>
                    <View style={styles.mixSurfaceFrame}>
                      {mix.cover_url ? (
                        <PluggdImage uri={mix.cover_url} style={styles.mixArt} resizeMode="cover" displayWidth={640} />
                      ) : (
                        <View style={[styles.mixArt, styles.artFallback]}><MaterialIcons name="album" size={34} color={ORANGE} /></View>
                      )}
                      <LinearGradient colors={['rgba(5,4,3,0.02)', 'rgba(5,4,3,0.78)']} style={StyleSheet.absoluteFillObject} />
                      <Text style={styles.mixNumber}>{String(index + 1).padStart(2, '0')}</Text>
                      <View style={styles.mixCopy}>
                        <Text style={styles.mixKicker}>{mix.city || mix.genre_tags?.[0] || 'SELECTOR MIX'}</Text>
                        <Text style={styles.mixTitle} numberOfLines={2}>{mix.title || 'Untitled mix'}</Text>
                        <Text style={styles.mixCreator} numberOfLines={1}>{mix.event_name || mix.city || 'PLUGGD selector'}</Text>
                      </View>
                      <View style={styles.mixPlay}>
                        <MaterialIcons name={playable ? 'play-arrow' : 'arrow-forward'} size={20} color="#100B07" />
                      </View>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`${playable ? 'Play' : 'Open'} mix ${mix.title || 'Untitled mix'}`}
                        onPress={() => {
                          if (playable) void play(playable);
                          else {
                            selectionHaptic();
                            router.push(route as any);
                          }
                        }}
                        style={styles.mixSurfaceHit}
                      />
                    </View>
                    <EdPressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open details for ${mix.title || 'mix'}`}
                      onPress={() => router.push(route as any)}
                      style={styles.mixOpen}
                    >
                      <Text style={styles.mixOpenText}>Open mix</Text>
                      <MaterialIcons name="arrow-forward" size={14} color={ORANGE} />
                    </EdPressable>
                  </View>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {newReleases.length ? (
          <>
            <SectionHeader
              title="New releases"
              subtitle="Independent music, newly landed."
              action="View all"
              onAction={() => router.push('/releases' as any)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.releaseRail}>
              {newReleases.map((release) => {
                const playable = items.find((entry) => entry.kind === 'release' && entry.track.releaseId === release.id);
                return (
                  <View key={release.id} style={styles.releaseCard}>
                    <EdPressable
                      haptic={false}
                      accessibilityRole="button"
                      accessibilityLabel={`${playable ? 'Play' : 'Open'} ${release.title || 'release'}`}
                      onPress={() => playable ? void play(playable) : router.push(`/release/${release.id}` as any)}
                      style={styles.releaseArtSurface}
                    >
                      {release.cover_art_url ? (
                        <ReleaseArtwork uri={release.cover_art_url} style={styles.releaseArt} displayWidth={420} />
                      ) : (
                        <View style={[styles.releaseArt, styles.artFallback]}><MaterialIcons name="album" size={28} color={ORANGE} /></View>
                      )}
                      <View style={styles.releasePlay}>
                        <MaterialIcons name={playable ? 'play-arrow' : 'arrow-forward'} size={19} color="#100B07" />
                      </View>
                    </EdPressable>
                    <EdPressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open ${release.title || 'release'}`}
                      onPress={() => router.push(`/release/${release.id}` as any)}
                      style={styles.releaseCopy}
                    >
                      <View style={styles.releaseCopyText}>
                        <Text style={styles.releaseTitle} numberOfLines={1}>{release.title || 'Untitled release'}</Text>
                        <Text style={styles.releaseCreator} numberOfLines={1}>{release.artist || release.genre || 'PLUGGD creator'}</Text>
                      </View>
                    </EdPressable>
                  </View>
                );
              })}
            </ScrollView>
          </>
        ) : null}

        {story?.featured_image_url ? (
          <>
            <SectionHeader title="From THE PLUG" subtitle="Dispatches from inside the scene." />
            <EdPressable
              accessibilityRole="button"
              accessibilityLabel={`Read ${story.title || 'PLUGGD story'}`}
              onPress={() => router.push(`/plug/${story.id}` as any)}
              style={styles.storyCard}
            >
              <PluggdImage uri={story.featured_image_url} style={styles.storyImage} resizeMode="cover" displayWidth={900} />
              <LinearGradient colors={['rgba(5,4,3,0.04)', 'rgba(5,4,3,0.94)']} style={StyleSheet.absoluteFillObject} />
              <View style={styles.storyCopy}>
                <Text style={styles.storyKicker}>{story.tags?.[0]?.toUpperCase() || 'FEATURED STORY'}</Text>
                <Text style={styles.storyTitle} numberOfLines={2}>{story.title || 'PLUGGD story'}</Text>
                {story.excerpt ? <Text style={styles.storyExcerpt} numberOfLines={2}>{story.excerpt}</Text> : null}
                <View style={styles.storyAction}>
                  <Text style={styles.storyActionText}>Read story</Text>
                  <MaterialIcons name="arrow-forward" size={16} color={INK} />
                </View>
              </View>
            </EdPressable>
          </>
        ) : null}

        {nextWave.length ? <NextWave items={nextWave} onOpen={(route) => router.push(route as any)} /> : null}

        {feed.data?.soundboards.length ? (
          <>
            <SectionHeader
              title="Soundboards"
              subtitle="Ideas, demos and worlds in progress."
              action="Open all"
              onAction={() => router.push('/soundboards' as any)}
            />
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.soundboardRail}>
              {feed.data.soundboards.slice(0, 5).map((board) => (
                <View key={board.id} style={styles.soundboardFrame}>
                  {board.cover_image_url ? (
                    <PluggdImage uri={board.cover_image_url} style={styles.soundboardImage} resizeMode="cover" displayWidth={520} />
                  ) : (
                    <View style={[styles.soundboardImage, styles.artFallback]}><MaterialIcons name="dashboard-customize" size={32} color={ORANGE} /></View>
                  )}
                  <LinearGradient colors={['rgba(5,4,3,0.03)', 'rgba(5,4,3,0.88)']} style={StyleSheet.absoluteFillObject} />
                  <View style={styles.soundboardCopy}>
                    <Text style={styles.soundboardKicker}>
                      {board.item_count || 0} PIECES · {board.comment_count || 0} COMMENTS
                    </Text>
                    <Text style={styles.soundboardTitle} numberOfLines={2}>{board.title || 'Untitled soundboard'}</Text>
                    <Text style={styles.soundboardAction}>Open board <MaterialIcons name="arrow-forward" size={12} color={ORANGE} /></Text>
                  </View>
                  <EdPressable
                    haptic={false}
                    accessibilityRole="button"
                    accessibilityLabel={`Open soundboard ${board.title || 'Untitled soundboard'}`}
                    onPress={() => router.push(`/soundboards/${board.slug || board.id}` as any)}
                    style={styles.soundboardHit}
                  />
                </View>
              ))}
            </ScrollView>
          </>
        ) : null}

        {featuredEvent || featuredRoom ? (
          <>
            <SectionHeader
              title="Happening now"
              subtitle="Events and rooms moving through the scene."
              action="All events"
              onAction={() => router.push('/events' as any)}
            />
            {featuredEvent ? (
              <View style={[styles.eventFrame, !featuredEvent.cover_image_url && styles.eventFrameCompact]}>
                {featuredEvent.cover_image_url ? (
                  <View style={styles.eventMedia}>
                    <PluggdImage uri={featuredEvent.cover_image_url} style={styles.eventImage} resizeMode="cover" displayWidth={900} />
                    <LinearGradient colors={['rgba(5,4,3,0.02)', 'rgba(5,4,3,0.38)']} style={StyleSheet.absoluteFillObject} />
                    <EventDate value={featuredEvent.starts_at} />
                  </View>
                ) : null}
                <View style={[styles.eventCopy, !featuredEvent.cover_image_url && styles.eventCopyCompact]}>
                  {!featuredEvent.cover_image_url ? <EventDate value={featuredEvent.starts_at} /> : null}
                  <Text style={styles.eventTitle} numberOfLines={2}>{featuredEvent.title || 'PLUGGD event'}</Text>
                  <Text style={styles.eventMeta} numberOfLines={1}>
                    {featuredEvent.location || 'Location TBA'} · {featuredEvent.rsvp_count || 0} going
                  </Text>
                  <View style={styles.eventCta}>
                    <Text style={styles.eventCtaText}>{eventActionLabel(featuredEvent.price_cents)}</Text>
                    <MaterialIcons name="arrow-forward" size={15} color="#100B07" />
                  </View>
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Open event ${featuredEvent.title || 'PLUGGD event'}`}
                  onPress={() => {
                    selectionHaptic();
                    router.push(`/events/${featuredEvent.id}` as any);
                  }}
                  style={({ pressed }) => [styles.eventHit, pressed && styles.pressed]}
                />
              </View>
            ) : null}
            {featuredRoom ? (
              <View style={styles.signalFrame}>
                <View style={styles.liveDot} />
                {featuredRoom.thumbnail_url ? (
                  <PluggdImage uri={featuredRoom.thumbnail_url} style={styles.signalThumb} resizeMode="cover" displayWidth={180} />
                ) : (
                  <View style={[styles.signalThumb, styles.artFallback]}><MaterialIcons name="mic" size={20} color={ORANGE} /></View>
                )}
                <View style={styles.signalCopy}>
                  <Text style={styles.signalKicker}>{featuredRoom.status === 'live' ? 'LIVE NOW' : 'UPCOMING ROOM'}</Text>
                  <Text style={styles.signalTitle} numberOfLines={1}>{featuredRoom.title || 'Live room'}</Text>
                  <Text style={styles.signalMeta} numberOfLines={1}>{roomMeta(featuredRoom)}</Text>
                </View>
                <View style={styles.joinRoomAction}>
                  <Text style={styles.joinRoomText}>Join</Text>
                  <MaterialIcons name="arrow-forward" size={18} color={ORANGE} />
                </View>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Join ${featuredRoom.title || 'PLUGGD room'}`}
                  onPress={() => {
                    selectionHaptic();
                    router.push({ pathname: '/live/session', params: { roomId: featuredRoom.id } } as any);
                  }}
                  style={({ pressed }) => [styles.signalHit, pressed && styles.pressed]}
                />
              </View>
            ) : null}
          </>
        ) : null}

        {beatGateway || packGateway ? (
          <>
            <SectionHeader
              title="Drops & tools"
              subtitle="Beats, packs and work made to move."
              action="Open Market"
              onAction={() => router.push('/market' as any)}
            />
            <View style={[styles.contextGrid, (!beatGateway?.image_url || !packGateway?.cover_art_url) && styles.contextGridSingle]}>
              {beatGateway?.image_url ? (
                <MarketGateway
                  index="01"
                  title="BeatPlug"
                  meta={`${feed.data?.beats.length || 0} producer signals`}
                  action="Browse beats"
                  image={beatGateway.image_url}
                  wide={!packGateway?.cover_art_url}
                  onPress={() => router.push('/market/beats' as any)}
                />
              ) : null}
              {packGateway?.cover_art_url ? (
                <MarketGateway
                  index="02"
                  title="Sample packs"
                  meta={`${feed.data?.samplePacks.length || 0} creative tools`}
                  action="Browse packs"
                  image={packGateway.cover_art_url}
                  wide={!beatGateway?.image_url}
                  onPress={() => router.push('/sample-packs' as any)}
                />
              ) : null}
            </View>
          </>
        ) : null}

        {!authLoading && !user ? (
          <View style={styles.joinPrompt}>
            <Text style={styles.joinKicker}>MAKE IT YOURS</Text>
            <Text style={styles.joinTitle}>Follow the sound before it breaks.</Text>
            <Text style={styles.joinBody}>Save finds, follow creators and keep your scenes close.</Text>
            <View style={styles.joinActions}>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  selectionHaptic();
                  router.push('/auth/signup' as any);
                }}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.joinPrimary}>
                  <Text style={styles.joinPrimaryText}>Join PLUGGD</Text>
                </View>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                onPress={() => {
                  selectionHaptic();
                  router.push('/auth/login' as any);
                }}
                style={({ pressed }) => pressed && styles.pressed}
              >
                <View style={styles.joinSecondary}>
                  <Text style={styles.joinSecondaryText}>Sign in</Text>
                </View>
              </Pressable>
            </View>
          </View>
        ) : null}
      </RNAnimated.ScrollView>
    </View>
  );
}

function SectionHeader({
  title,
  subtitle,
  action,
  onAction,
}: {
  title: string;
  subtitle?: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeading}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {action && onAction ? (
        <EdPressable accessibilityRole="button" accessibilityLabel={action} onPress={onAction} style={styles.seeAllButton}>
          <Text style={styles.seeAll}>{action}</Text>
        </EdPressable>
      ) : null}
    </View>
  );
}

function EventDate({ value }: { value?: string | null }) {
  return (
    <View style={styles.eventDate}>
      <Text style={styles.eventDateText}>
        {value
          ? new Date(value).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }).toUpperCase()
          : 'SOON'}
      </Text>
    </View>
  );
}

function HomeLoading() {
  return (
    <View style={styles.loadingStack}>
      <PremiumSkeleton label="Loading the Daily Plug" style={styles.heroSkeleton} />
      <View style={styles.loadingRow}>
        <PremiumSkeleton compact label="Loading music" style={styles.gridSkeleton} />
        <PremiumSkeleton compact label="Loading music" style={styles.gridSkeleton} />
      </View>
    </View>
  );
}

function NextWave({ items, onOpen }: { items: HomeNextWaveItem[]; onOpen: (route: string) => void }) {
  const lead = items[0];
  const stack = items.slice(1, 3);
  const foot = items.slice(3, 5);
  if (!lead) return null;
  return (
    <>
      <SectionHeader title="The next wave" subtitle="People, rooms and releases earning real attention." />
      <View style={styles.waveMosaic}>
        <WaveCard item={lead} onPress={() => onOpen(lead.route)} style={styles.waveLead} lead />
        {stack.length ? (
          <View style={styles.waveStack}>
            {stack.map((item) => (
              <WaveCard key={item.id} item={item} onPress={() => onOpen(item.route)} style={styles.waveSmall} />
            ))}
          </View>
        ) : null}
      </View>
      {foot.length ? (
        <View style={styles.waveFoot}>
          {foot.map((item) => (
            <WaveCard key={item.id} item={item} onPress={() => onOpen(item.route)} style={styles.waveFootCard} />
          ))}
        </View>
      ) : null}
    </>
  );
}

function WaveCard({
  item,
  onPress,
  style,
  lead = false,
}: {
  item: HomeNextWaveItem;
  onPress: () => void;
  style: StyleProp<ViewStyle>;
  lead?: boolean;
}) {
  return (
    <View style={[styles.waveFrame, style]}>
      <PluggdImage uri={item.imageUrl} style={styles.waveImage} resizeMode="cover" displayWidth={lead ? 620 : 360} />
      <LinearGradient colors={['rgba(5,4,3,0.04)', 'rgba(5,4,3,0.92)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.waveCopy}>
        <Text style={styles.waveLabel}>{item.label}</Text>
        <Text style={[styles.waveTitle, lead && styles.waveTitleLead]} numberOfLines={1}>{item.title}</Text>
        <Text style={styles.waveSubtitle} numberOfLines={lead ? 2 : 1}>{item.subtitle}</Text>
      </View>
      <EdPressable
        haptic={false}
        accessibilityRole="button"
        accessibilityLabel={`Open ${item.title}, ${item.label.toLowerCase()}`}
        onPress={onPress}
        style={styles.waveHit}
      />
    </View>
  );
}

function MarketGateway({
  index,
  title,
  meta,
  action,
  image,
  wide = false,
  onPress,
}: {
  index: string;
  title: string;
  meta: string;
  action: string;
  image: string;
  wide?: boolean;
  onPress: () => void;
}) {
  return (
    <View style={[styles.worldFrame, { width: wide ? '100%' : '48.5%' }]}>
      <PluggdImage uri={image} style={styles.worldImage} resizeMode="cover" displayWidth={480} />
      <LinearGradient colors={['rgba(5,4,3,0.08)', 'rgba(5,4,3,0.94)']} style={StyleSheet.absoluteFillObject} />
      <Text style={styles.worldIndex}>{index}</Text>
      <View>
        <Text style={styles.worldTitle}>{title}</Text>
        <Text style={styles.worldMeta}>{meta}</Text>
        <View style={styles.worldAction}>
          <Text style={styles.worldActionText}>{action}</Text>
          <MaterialIcons name="arrow-forward" size={14} color={ORANGE} />
        </View>
      </View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={action}
        onPress={() => {
          selectionHaptic();
          onPress();
        }}
        style={({ pressed }) => [styles.worldHit, pressed && styles.pressed]}
      />
    </View>
  );
}

function Artwork({ item, style, iconSize }: { item: DiscoveryItem; style: any; iconSize: number }) {
  if (item.kind === 'release' && item.artwork) {
    return <ReleaseArtwork uri={item.artwork} style={style} displayWidth={520} />;
  }
  return item.artwork ? (
    <PluggdImage uri={item.artwork} style={style} resizeMode="cover" displayWidth={520} />
  ) : (
    <View style={[style, styles.artFallback]}><MaterialIcons name="graphic-eq" size={iconSize} color={ORANGE} /></View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0908' },
  content: { paddingHorizontal: 20, paddingBottom: 190 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4, marginBottom: 18 },
  eyebrow: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1.6, marginBottom: 5 },
  title: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 30, lineHeight: 34, letterSpacing: -1.1 },
  editorNote: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10, lineHeight: 14, textAlign: 'right' },
  loadingStack: { gap: 12, paddingBottom: 12 },
  heroSkeleton: { minHeight: 174, borderRadius: 5 },
  loadingRow: { flexDirection: 'row', gap: 10 },
  gridSkeleton: { flex: 1, minHeight: 84, borderRadius: 5 },
  empty: { minHeight: 210, borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE, justifyContent: 'center' },
  emptyTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 20 },
  emptyBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 14, lineHeight: 20, marginTop: 8, maxWidth: 280 },
  featured: { minHeight: 180, flexDirection: 'row', gap: 17, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE },
  featuredArtFrame: { width: 146, height: 146, alignSelf: 'center', position: 'relative', overflow: 'visible' },
  featuredArtMotion: { width: 146, height: 146 },
  featuredArtWrap: { width: 146, height: 146, position: 'relative', overflow: 'hidden', borderRadius: 4 },
  featuredArt: { width: 146, height: 146, borderRadius: 4, backgroundColor: '#211C17' },
  kindFlag: { position: 'absolute', left: 8, top: 8, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: 'rgba(10,9,8,0.82)' },
  kindFlagText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 8, letterSpacing: 1.1 },
  featuredPlayBadge: { position: 'absolute', zIndex: 5, elevation: 5, right: 8, bottom: 8, width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  featuredCopy: { flex: 1, paddingVertical: 2, justifyContent: 'center' },
  reason: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 9, lineHeight: 12, letterSpacing: 1.1, marginBottom: 7 },
  featuredTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 19, lineHeight: 22, letterSpacing: -0.45 },
  featuredCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 13, marginTop: 5 },
  featuredDescription: { color: '#C5BDB2', fontFamily: 'Satoshi-Regular', fontSize: 10.5, lineHeight: 14, marginTop: 8 },
  supportButton: { alignSelf: 'flex-start' },
  supportButtonInner: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 5, borderBottomWidth: 1, borderColor: '#756E64' },
  supportText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 11.5 },
  sectionHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 11, gap: 10 },
  sectionHeading: { flex: 1, minWidth: 0 },
  sectionTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17, lineHeight: 21, letterSpacing: -0.35 },
  sectionSubtitle: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 10.5, lineHeight: 14, marginTop: 3 },
  seeAllButton: { minHeight: 44, justifyContent: 'flex-end', paddingBottom: 1 },
  seeAll: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  pickGrid: { gap: 10 },
  pickRow: { flexDirection: 'row', gap: 10 },
  pick: { flex: 1, minWidth: 0, minHeight: 178 },
  pickArtSurface: { height: 128, position: 'relative' },
  pickArt: { width: '100%', height: 128, borderRadius: 4, backgroundColor: '#211C17' },
  pickKind: { position: 'absolute', left: 7, top: 7, borderRadius: 3, backgroundColor: 'rgba(9,7,5,0.76)', paddingHorizontal: 6, paddingVertical: 3 },
  pickKindText: { color: '#E8E0D5', fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 0.9 },
  pickCopy: { minHeight: 46, justifyContent: 'center', paddingTop: 5 },
  pickCopyText: { flex: 1, minWidth: 0 },
  pickTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12, lineHeight: 15 },
  pickCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  smallPlay: { position: 'absolute', right: 7, bottom: 7, width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: ORANGE },
  recentRail: { gap: 11, paddingRight: 20 },
  recentCard: { width: 246, height: 82, borderRadius: 5, backgroundColor: '#171411', position: 'relative', overflow: 'hidden' },
  recentSurface: { flex: 1, flexDirection: 'row', alignItems: 'center', padding: 8 },
  recentArt: { width: 66, height: 66, borderRadius: 4, backgroundColor: '#211C17' },
  recentCopy: { flex: 1, minWidth: 0, marginLeft: 10 },
  recentKicker: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 0.9 },
  recentTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12.5, marginTop: 4 },
  recentCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10, marginTop: 2 },
  recentPlay: { width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  recentOpen: { width: 44, height: 82, borderLeftWidth: 1, borderLeftColor: '#312B25', alignItems: 'center', justifyContent: 'center' },
  sceneRow: { gap: 12, paddingRight: 20 },
  sceneFrame: {
    width: 176,
    minWidth: 176,
    maxWidth: 176,
    height: 136,
    minHeight: 136,
    maxHeight: 136,
    flexShrink: 0,
    borderRadius: 6,
    overflow: 'hidden',
  },
  sceneCopy: { position: 'absolute', zIndex: 2, left: 12, right: 12, bottom: 12 },
  sceneHit: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  sceneImage: { ...StyleSheet.absoluteFillObject },
  sceneFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#26170F' },
  sceneLabel: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17, lineHeight: 21 },
  sceneDetail: { color: '#D5CEC3', fontFamily: 'Satoshi-Bold', fontSize: 10.5, lineHeight: 14, marginTop: 3 },
  mixRail: { gap: 12, paddingRight: 20, alignItems: 'flex-start' },
  mixCard: {
    width: 208,
    minWidth: 208,
    maxWidth: 208,
    height: 224,
    minHeight: 224,
    maxHeight: 224,
    flexShrink: 0,
    borderRadius: 6,
    overflow: 'hidden',
    backgroundColor: '#171411',
  },
  mixCardLead: { width: 252, minWidth: 252, maxWidth: 252 },
  mixSurfaceFrame: {
    width: '100%',
    height: 176,
    minHeight: 176,
    maxHeight: 176,
    flexShrink: 0,
    overflow: 'hidden',
  },
  mixSurfaceHit: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  mixArt: { ...StyleSheet.absoluteFillObject, backgroundColor: '#211C17' },
  mixNumber: { position: 'absolute', left: 12, top: 12, zIndex: 2, color: INK, fontFamily: 'Satoshi-Black', fontSize: 10, letterSpacing: 1.2 },
  mixPlay: { position: 'absolute', right: 10, top: 10, width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  mixOpen: { height: 48, minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 12 },
  mixOpenText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 10.5 },
  mixCopy: { position: 'absolute', zIndex: 2, left: 12, right: 12, bottom: 12 },
  mixKicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1.1, textTransform: 'uppercase' },
  mixTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 18, lineHeight: 21, marginTop: 4 },
  mixCreator: { color: '#DED7CC', fontFamily: 'Satoshi-Medium', fontSize: 10.5, marginTop: 4 },
  releaseRail: { gap: 12, paddingRight: 20 },
  releaseCard: { width: 126, position: 'relative' },
  releaseArtSurface: { width: 126, height: 126, position: 'relative' },
  releaseArt: { width: 126, height: 126, borderRadius: 4, backgroundColor: '#211C17' },
  releasePlay: { position: 'absolute', bottom: 6, right: 6, width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  releaseCopy: { minHeight: 48, justifyContent: 'center' },
  releaseCopyText: { flex: 1, minWidth: 0 },
  releaseTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  releaseCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10, marginTop: 2 },
  storyCard: { minHeight: 238, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end' },
  storyImage: { ...StyleSheet.absoluteFillObject, backgroundColor: '#211C17' },
  storyCopy: { padding: 16, maxWidth: 326 },
  storyKicker: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1.15 },
  storyTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 22, lineHeight: 26, letterSpacing: -0.55, marginTop: 6 },
  storyExcerpt: { color: '#D6CFC5', fontFamily: 'Satoshi-Regular', fontSize: 11.5, lineHeight: 16, marginTop: 7 },
  storyAction: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 5 },
  storyActionText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  waveMosaic: { height: 224, minHeight: 224, maxHeight: 224, flexDirection: 'row', gap: 8 },
  waveStack: { flex: 0.78, height: 224, minHeight: 224, maxHeight: 224, gap: 8 },
  waveFrame: { position: 'relative', borderRadius: 5, overflow: 'hidden' },
  waveLead: { flex: 1.22, height: 224, minHeight: 224, maxHeight: 224 },
  waveSmall: { flex: 1, height: 108, minHeight: 108, maxHeight: 108 },
  waveFoot: { flexDirection: 'row', gap: 8, marginTop: 8 },
  waveFootCard: { flex: 1, height: 132, minHeight: 132, maxHeight: 132 },
  waveImage: { ...StyleSheet.absoluteFillObject, backgroundColor: '#211C17' },
  waveCopy: { position: 'absolute', zIndex: 2, left: 10, right: 10, bottom: 10 },
  waveHit: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  waveLabel: { alignSelf: 'flex-start', color: '#100B07', backgroundColor: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 0.8, paddingHorizontal: 6, paddingVertical: 4, borderRadius: 2, overflow: 'hidden' },
  waveTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 12.5, lineHeight: 16, marginTop: 6 },
  waveTitleLead: { fontSize: 17, lineHeight: 21 },
  waveSubtitle: { color: '#D6CFC5', fontFamily: 'Satoshi-Medium', fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  soundboardRail: { gap: 12, paddingRight: 20, alignItems: 'flex-start' },
  soundboardFrame: { width: 224, minWidth: 224, maxWidth: 224, height: 158, minHeight: 158, maxHeight: 158, flexShrink: 0, position: 'relative', borderRadius: 5, overflow: 'hidden' },
  soundboardImage: { ...StyleSheet.absoluteFillObject, backgroundColor: '#211C17' },
  soundboardCopy: { position: 'absolute', zIndex: 2, left: 13, right: 13, bottom: 13 },
  soundboardHit: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  soundboardKicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1 },
  soundboardTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17, lineHeight: 21, marginTop: 4 },
  soundboardAction: { color: '#E8E0D5', fontFamily: 'Satoshi-Bold', fontSize: 10, lineHeight: 16, marginTop: 4 },
  eventFrame: { height: 244, minHeight: 244, maxHeight: 244, position: 'relative', borderRadius: 5, overflow: 'hidden', backgroundColor: '#171411', borderWidth: 1, borderColor: '#302A24' },
  eventFrameCompact: { height: 150, minHeight: 150, maxHeight: 150, borderColor: '#332D26' },
  eventHit: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  eventMedia: { height: 134, overflow: 'hidden' },
  eventImage: { ...StyleSheet.absoluteFillObject, backgroundColor: '#211C17' },
  eventDate: { position: 'absolute', left: 12, top: 12, backgroundColor: ORANGE, paddingHorizontal: 9, paddingVertical: 6, borderRadius: 3 },
  eventDateText: { color: '#100B07', fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1 },
  eventCopy: { minHeight: 110, padding: 14, backgroundColor: '#171411' },
  eventCopyCompact: { minHeight: 150, paddingTop: 58 },
  eventTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 18, lineHeight: 22 },
  eventMeta: { color: '#E2DBD1', fontFamily: 'Satoshi-Medium', fontSize: 11, marginTop: 5 },
  eventCta: { minHeight: 44, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: ORANGE, borderRadius: 22, paddingHorizontal: 14, marginTop: 10 },
  eventCtaText: { color: '#100B07', fontFamily: 'Satoshi-Black', fontSize: 11 },
  signalFrame: { height: 88, minHeight: 88, maxHeight: 88, position: 'relative', flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 10, paddingHorizontal: 11, paddingVertical: 10, borderWidth: 1, borderColor: '#302A24', borderRadius: 5, backgroundColor: '#12100E' },
  signalHit: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  liveDot: { position: 'absolute', left: -1, top: 18, width: 3, height: 28, borderTopRightRadius: 3, borderBottomRightRadius: 3, backgroundColor: ORANGE },
  signalThumb: { width: 52, height: 52, borderRadius: 4, backgroundColor: '#211C17' },
  signalCopy: { flex: 1, minWidth: 0 },
  signalKicker: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 7.5, letterSpacing: 0.9, marginBottom: 3 },
  signalTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12.5 },
  signalMeta: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  joinRoomText: { color: INK, fontFamily: 'Satoshi-Black', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.7 },
  joinRoomAction: { minWidth: 54, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'flex-end', gap: 3 },
  contextGrid: { width: '100%', flexDirection: 'row', alignItems: 'stretch', gap: 10 },
  contextGridSingle: { flexDirection: 'column' },
  worldFrame: { height: 180, minHeight: 180, maxHeight: 180, position: 'relative', flexShrink: 0, borderRadius: 5, padding: 13, justifyContent: 'space-between', overflow: 'hidden', backgroundColor: '#171411' },
  worldHit: { ...StyleSheet.absoluteFillObject, zIndex: 5 },
  worldImage: { ...StyleSheet.absoluteFillObject, backgroundColor: '#211C17' },
  worldIndex: { color: '#DED7CC', fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1 },
  worldTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 16 },
  worldMeta: { color: '#D0C8BD', fontFamily: 'Satoshi-Medium', fontSize: 10, marginTop: 2 },
  worldAction: { minHeight: 38, flexDirection: 'row', alignItems: 'flex-end', gap: 5 },
  worldActionText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 10.5 },
  joinPrompt: { marginTop: 28, paddingVertical: 26, borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE },
  joinKicker: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1.2 },
  joinTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 21, lineHeight: 26, marginTop: 6 },
  joinBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 13, lineHeight: 18, marginTop: 7, maxWidth: 300 },
  joinActions: { flexDirection: 'row', gap: 10, marginTop: 16 },
  joinPrimary: { minHeight: 44, borderRadius: 22, backgroundColor: ORANGE, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  joinPrimaryText: { color: '#100B07', fontFamily: 'Satoshi-Black', fontSize: 12 },
  joinSecondary: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: '#4B443B', paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center' },
  joinSecondaryText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  artFallback: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.82, transform: [{ scale: 0.96 }] },
});
