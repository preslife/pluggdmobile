import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import { usePlayback } from '../../context/PlaybackProvider';
import { selectionHaptic } from '../../design/haptics';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { useHomeFeed, useLiveRooms } from '../culture/useCultureData';
import { buildDiscoveryItems, buildDiscoveryScenes, type DiscoveryItem } from './discoveryModel';
import { DiscoveryHeader } from './DiscoveryHeader';

const INK = '#F7F2E9';
const MUTED = '#A69F95';
const ORANGE = '#FF6600';
const FILTERS = ['For you', 'Scenes', 'Genres', 'Cities', 'Charts'] as const;

export function MusicDiscoveryDiscover() {
  const router = useRouter();
  const bottomInset = useBottomChromeInset();
  const params = useLocalSearchParams<{ scene?: string }>();
  const selectedScene = typeof params.scene === 'string' ? decodeURIComponent(params.scene).trim() : '';
  const feed = useHomeFeed();
  const live = useLiveRooms();
  const { playQueue } = usePlayback();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(params.scene ? 'Scenes' : 'For you');
  const allItems = buildDiscoveryItems(feed.data);
  const scenes = buildDiscoveryScenes(feed.data);
  const items = useMemo(() => {
    if (filter === 'For you' || filter === 'Charts') return allItems;
    if (filter === 'Cities') return allItems.filter((item) => item.city);
    if (filter === 'Genres') return allItems.filter((item) => item.genre);
    if (selectedScene) {
      const target = selectedScene.toLowerCase();
      const targetRoot = target.split(',')[0]?.trim() || target;
      return allItems.filter((item) => {
        const city = item.city?.trim().toLowerCase() || '';
        const genre = item.genre?.trim().toLowerCase() || '';
        return (
          (Boolean(city) && (
            city === target ||
            city === targetRoot ||
            target.includes(city) ||
            city.includes(targetRoot)
          )) ||
          (Boolean(genre) && (genre === target || genre === targetRoot))
        );
      });
    }
    return allItems.filter((item) => item.kind === 'mix');
  }, [allItems, filter, selectedScene]);
  const hasSelectedSceneMatches = filter === 'Scenes' && Boolean(selectedScene) && items.length > 0;
  const visible = filter === 'Scenes' && selectedScene
    ? (hasSelectedSceneMatches ? items : allItems)
    : (items.length ? items : allItems);
  const liveRoom = live.data?.find((room) => room.status === 'live') ?? live.data?.[0];
  const worlds = useMemo(() => [
    { title: 'Mixes', meta: `${feed.data?.mixes.length || 0} selector worlds`, route: '/mixes', image: feed.data?.mixes.find((item) => item.cover_url)?.cover_url || null, icon: 'album' as const, index: '01' },
    { title: 'Soundboards', meta: `${feed.data?.soundboards.length || 0} ideas in progress`, route: '/soundboards', image: feed.data?.soundboards.find((item) => item.cover_image_url)?.cover_image_url || null, icon: 'dashboard-customize' as const, index: '02' },
    { title: 'Releases', meta: `${feed.data?.releases.length || 0} fresh pressings`, route: '/releases', image: feed.data?.releases.find((item) => item.cover_art_url)?.cover_art_url || null, icon: 'music-note' as const, index: '03' },
    { title: 'Live', meta: liveRoom?.status === 'live' ? 'Creators broadcasting now' : 'Rooms, parties and replays', route: '/live', image: liveRoom?.thumbnail_url || liveRoom?.creator_avatar_url || null, icon: 'sensors' as const, index: '04' },
    { title: 'THE PLUG', meta: 'Interviews, editorials and scene reports', route: '/plug', image: null, icon: 'auto-stories' as const, index: '05', wide: true },
  ], [feed.data, liveRoom?.creator_avatar_url, liveRoom?.status, liveRoom?.thumbnail_url]);

  const play = async (item: DiscoveryItem) => {
    selectionHaptic();
    await playQueue(allItems.map((entry) => entry.track), Math.max(0, allItems.findIndex((entry) => entry.id === item.id)));
  };

  return (
    <View style={styles.screen}>
      <DiscoveryHeader />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <View style={styles.headingRow}>
          <View style={styles.headingCopy}><Text style={styles.kicker}>FOLLOW THE SIGNAL</Text><Text style={styles.title}>Discover</Text><Text style={styles.subtitle}>Find the next sound through scenes, cities and independent tastemakers.</Text></View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open PLUGGD Live"
            onPress={() => {
              selectionHaptic();
              router.push('/live' as any);
            }}
            style={({ pressed }) => [styles.signalMark, pressed && styles.signalMarkPressed]}
          >
            <View style={styles.signalLiveDot} />
            <MaterialIcons name="graphic-eq" size={24} color={ORANGE} />
          </Pressable>
        </View>

        <Pressable accessibilityRole="button" accessibilityLabel="Search music and scenes" onPress={() => router.push('/search' as any)} style={styles.search}>
          <MaterialIcons name="search" size={21} color={MUTED} /><Text style={styles.searchText}>Artists, tracks, scenes, cities</Text><Text style={styles.searchHint}>⌘K</Text>
        </Pressable>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => <Pressable accessibilityRole="button" accessibilityState={{ selected: filter === item }} key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}><Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text></Pressable>)}
        </ScrollView>

        <View style={styles.worldsGrid}>
          {worlds.map((world) => <WorldGateway key={world.title} world={world} onPress={() => router.push(world.route as any)} />)}
        </View>

        {feed.isLoading ? <ActivityIndicator color={ORANGE} style={styles.loader} /> : null}
        {!feed.isLoading && !visible.length ? <View style={styles.empty}><Text style={styles.emptyTitle}>No playable signals yet.</Text><Text style={styles.emptyBody}>Try another lens or return when creators publish more music.</Text></View> : null}

        {visible.length ? (
          <>
            <View style={styles.sectionHeader}>
              <View>
                <Text style={styles.sectionEyebrow}>{filter === 'For you' ? 'YOUR FREQUENCY' : filter.toUpperCase()}</Text>
                <Text style={styles.sectionTitle}>
                  {filter === 'For you'
                    ? 'Start somewhere unexpected'
                    : hasSelectedSceneMatches
                      ? `Inside ${selectedScene}`
                      : selectedScene && filter === 'Scenes'
                        ? 'More signals to explore'
                        : `Inside ${filter.toLowerCase()}`}
                </Text>
              </View>
              <Text style={styles.liveCount}>{visible.length} PLAYABLE</Text>
            </View>
            <View style={styles.mosaic}>
              {visible[0] ? <SignalTile item={visible[0]} variant="lead" onPlay={() => play(visible[0])} /> : null}
              <View style={styles.mosaicStack}>
                {visible.slice(1, 3).map((item) => <SignalTile key={item.id} item={item} variant="small" onPlay={() => play(item)} />)}
              </View>
            </View>
            <View style={styles.whyRow}><View style={styles.whyLine} /><Text style={styles.whyText}>{visible[0]?.discoveryReason}. Chosen from live creator and scene signals—not popularity alone.</Text></View>
          </>
        ) : null}

        {scenes.length ? (
          <>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>SCENE DIAL</Text><Text style={styles.sectionTitle}>Tune into a world</Text></View><Pressable accessibilityRole="button" onPress={() => setFilter('Scenes')}><Text style={styles.seeAll}>Browse all</Text></Pressable></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRail}>
              {scenes.map((scene, index) => (
                <Pressable accessibilityRole="button" accessibilityLabel={`Open ${scene.label}`} key={scene.label} onPress={() => router.push(scene.route as any)} style={[styles.sceneCard, index % 2 === 1 && styles.sceneCardTall]}>
                  {scene.image ? <PluggdImage uri={scene.image} style={styles.fill} displayWidth={480} /> : <View style={[styles.fill, styles.fallback]} />}
                  <View style={styles.sceneShade} /><Text style={styles.sceneNumber}>0{index + 1}</Text><View><Text style={styles.sceneLabel}>{scene.label}</Text><Text style={styles.sceneDetail}>{scene.detail} · enter</Text></View>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        {allItems.length > 3 ? (
          <>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>RELEASE RADAR</Text><Text style={styles.sectionTitle}>New on the platform</Text></View><Pressable accessibilityRole="button" onPress={() => router.push('/releases' as any)}><Text style={styles.seeAll}>View all</Text></Pressable></View>
            <View style={styles.radarGrid}>
              {allItems.slice(3, 7).map((item) => (
                <Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.title} by ${item.creator}`} key={item.id} onPress={() => play(item)} style={styles.radarCard}>
                  {item.artwork ? <PluggdImage uri={item.artwork} style={styles.radarArt} displayWidth={420} /> : <View style={[styles.radarArt, styles.fallback]}><MaterialIcons name="graphic-eq" size={30} color={ORANGE} /></View>}
                  <View style={styles.radarPlay}><MaterialIcons name="play-arrow" size={18} color="#100B07" /></View>
                  <Text style={styles.radarTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.radarMeta} numberOfLines={1}>{item.creator} · {item.kind}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        {allItems.length > 7 ? (
          <>
            <View style={styles.sectionHeader}><View><Text style={styles.sectionEyebrow}>PLUGGD CHART</Text><Text style={styles.sectionTitle}>Moving without the machine</Text></View></View>
            {allItems.slice(0, 6).map((item, index) => (
              <Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.title} by ${item.creator}`} key={`chart-${item.id}`} onPress={() => play(item)} style={styles.chartRow}>
                <Text style={styles.chartRank}>{String(index + 1).padStart(2, '0')}</Text>
                {item.artwork ? <PluggdImage uri={item.artwork} style={styles.chartArt} displayWidth={180} /> : <View style={[styles.chartArt, styles.fallback]} />}
                <View style={styles.chartCopy}><Text style={styles.chartTitle} numberOfLines={1}>{item.title}</Text><Text style={styles.chartMeta} numberOfLines={1}>{item.creator} · {item.discoveryReason}</Text></View>
                <MaterialIcons name="north-east" size={18} color={index < 3 ? ORANGE : MUTED} />
              </Pressable>
            ))}
          </>
        ) : null}

        <View style={styles.contextGrid}>
          <Pressable accessibilityRole="button" onPress={() => router.push('/live' as any)} style={styles.contextCard}><Text style={styles.contextKicker}>LIVE</Text><MaterialIcons name="sensors" size={27} color={ORANGE} /><Text style={styles.contextTitle}>Enter the room</Text><Text style={styles.contextMeta}>Broadcasts, parties and replays</Text></Pressable>
          <Pressable accessibilityRole="button" onPress={() => router.push('/market' as any)} style={styles.contextCard}><Text style={styles.contextKicker}>SUPPORT</Text><MaterialIcons name="storefront" size={27} color={ORANGE} /><Text style={styles.contextTitle}>Creator market</Text><Text style={styles.contextMeta}>Beats, packs and releases</Text></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

function WorldGateway({ world, onPress }: { world: { title: string; meta: string; image: string | null; icon: keyof typeof MaterialIcons.glyphMap; index: string; wide?: boolean }; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Explore ${world.title}`} onPress={onPress} style={[styles.worldLink, world.wide && styles.worldLinkWide]}>
      {world.image ? <PluggdImage uri={world.image} style={styles.worldImage} displayWidth={520} /> : <View style={[styles.worldImage, styles.worldFallback]}><MaterialIcons name={world.icon} size={30} color={ORANGE} /></View>}
      <LinearGradient colors={['rgba(6,5,4,0.08)', 'rgba(6,5,4,0.92)']} locations={[0.05, 1]} style={StyleSheet.absoluteFillObject} />
      <View style={styles.worldTop}><Text style={styles.worldIndex}>{world.index}</Text><MaterialIcons name="north-east" size={17} color={INK} /></View>
      <View style={styles.worldCopy}><Text style={styles.worldLinkTitle}>{world.title}</Text><Text style={styles.worldLinkMeta}>{world.meta}</Text></View>
    </Pressable>
  );
}

function SignalTile({ item, variant, onPlay }: { item: DiscoveryItem; variant: 'lead' | 'small'; onPlay: () => void }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={`Play ${item.title} by ${item.creator}. ${item.discoveryReason}`} onPress={onPlay} style={variant === 'lead' ? styles.leadTile : styles.smallTile}>
    {item.artwork ? <PluggdImage uri={item.artwork} style={styles.fill} displayWidth={720} /> : <View style={[styles.fill, styles.fallback]}><MaterialIcons name="graphic-eq" size={34} color={ORANGE} /></View>}
    <View style={styles.tileShade} /><View style={variant === 'lead' ? styles.tilePlayLead : styles.tilePlaySmall}><MaterialIcons name="play-arrow" size={variant === 'lead' ? 24 : 18} color="#100B07" /></View>
    <View style={styles.tileCopy}><Text style={styles.tileKind}>{item.kind.toUpperCase()} · {item.genre || item.city || 'INDEPENDENT'}</Text><Text style={variant === 'lead' ? styles.leadTitle : styles.smallTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.tileCreator} numberOfLines={1}>{item.creator}</Text></View>
  </Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0908' }, content: { paddingHorizontal: 20, paddingBottom: 184 },
  headingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 12, marginTop: 5 }, headingCopy: { flex: 1 },
  kicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1.7 }, title: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 34, lineHeight: 39, letterSpacing: -1.3, marginTop: 3 },
  subtitle: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 13, lineHeight: 19, maxWidth: 310, marginTop: 6 },
  signalMark: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: '#5B3B25', backgroundColor: '#18120E', alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  signalMarkPressed: { transform: [{ scale: 0.96 }], opacity: 0.88 },
  signalLiveDot: { position: 'absolute', right: 5, top: 5, width: 7, height: 7, borderRadius: 4, backgroundColor: '#FF4757', borderWidth: 1, borderColor: '#0A0908' },
  search: { minHeight: 48, marginTop: 18, borderWidth: 1, borderColor: '#39332C', borderRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchText: { flex: 1, color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 13 }, searchHint: { color: '#756E64', fontFamily: 'Satoshi-Bold', fontSize: 10 },
  filters: { gap: 8, paddingVertical: 14 }, filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#181512' }, filterActive: { backgroundColor: ORANGE }, filterText: { color: '#CBC4B9', fontFamily: 'Satoshi-Bold', fontSize: 12 }, filterTextActive: { color: '#110B07' },
  worldsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 4 },
  worldLink: { width: '48.8%', height: 112, borderRadius: 5, overflow: 'hidden', justifyContent: 'space-between', padding: 10, backgroundColor: '#151310' },
  worldLinkWide: { width: '100%', height: 94 },
  worldImage: { ...StyleSheet.absoluteFillObject },
  worldFallback: { backgroundColor: '#211C17', alignItems: 'center', justifyContent: 'center' },
  worldTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', zIndex: 2 },
  worldIndex: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 8.5, letterSpacing: 1 },
  worldCopy: { zIndex: 2 },
  worldLinkTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 15.5, letterSpacing: -0.3 },
  worldLinkMeta: { color: '#D7CFC4', fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 2 },
  loader: { minHeight: 220 }, empty: { minHeight: 190, justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F' }, emptyTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 18 }, emptyBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 13, marginTop: 6 },
  sectionHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10 }, sectionEyebrow: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1.3, marginBottom: 3 }, sectionTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17, letterSpacing: -0.35 }, liveCount: { color: MUTED, fontFamily: 'Satoshi-Bold', fontSize: 8.5, letterSpacing: 1 }, seeAll: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 11 },
  mosaic: { height: 238, flexDirection: 'row', gap: 8 }, leadTile: { flex: 1.72, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', padding: 13 }, mosaicStack: { flex: 1, gap: 8 }, smallTile: { flex: 1, borderRadius: 6, overflow: 'hidden', justifyContent: 'flex-end', padding: 9 },
  fill: { ...StyleSheet.absoluteFillObject }, fallback: { backgroundColor: '#211C17', alignItems: 'center', justifyContent: 'center' }, tileShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,4,3,0.36)' },
  tileCopy: { zIndex: 2 }, tileKind: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 7.5, letterSpacing: 0.8, marginBottom: 3 }, leadTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 20, lineHeight: 23 }, smallTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 11.5, lineHeight: 14 }, tileCreator: { color: '#E0D8CD', fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  tilePlayLead: { position: 'absolute', right: 12, top: 12, width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', zIndex: 3 }, tilePlaySmall: { position: 'absolute', right: 7, top: 7, width: 29, height: 29, borderRadius: 15, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', zIndex: 3 },
  whyRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 10, borderBottomWidth: 1, borderColor: '#29251F' }, whyLine: { width: 24, height: 2, backgroundColor: ORANGE }, whyText: { flex: 1, color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 10, lineHeight: 14 },
  sceneRail: { gap: 10, paddingRight: 20, alignItems: 'flex-start' }, sceneCard: { width: 166, height: 138, borderRadius: 6, overflow: 'hidden', justifyContent: 'space-between', padding: 11 }, sceneCardTall: { height: 166 }, sceneShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,3,2,0.43)' }, sceneNumber: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1 }, sceneLabel: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17 }, sceneDetail: { color: '#D7CFC4', fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  radarGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 }, radarCard: { width: '48.5%', position: 'relative', marginBottom: 6 }, radarArt: { width: '100%', aspectRatio: 1, borderRadius: 5, backgroundColor: '#211C17' }, radarPlay: { position: 'absolute', right: 8, top: 118, width: 34, height: 34, borderRadius: 17, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' }, radarTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12.5, marginTop: 7 }, radarMeta: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 2, textTransform: 'capitalize' },
  chartRow: { minHeight: 72, flexDirection: 'row', alignItems: 'center', gap: 10, borderTopWidth: 1, borderColor: '#29251F' }, chartRank: { width: 20, color: '#756E64', fontFamily: 'Satoshi-Bold', fontSize: 9 }, chartArt: { width: 48, height: 48, borderRadius: 3, backgroundColor: '#211C17' }, chartCopy: { flex: 1, minWidth: 0 }, chartTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12.5 }, chartMeta: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 3 },
  contextGrid: { flexDirection: 'row', gap: 10, marginTop: 26 }, contextCard: { flex: 1, minHeight: 148, backgroundColor: '#171411', borderRadius: 6, padding: 14, justifyContent: 'space-between' }, contextKicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 8, letterSpacing: 1.3 }, contextTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 15, lineHeight: 18 }, contextMeta: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 10 },
});
