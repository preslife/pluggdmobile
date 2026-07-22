import { MaterialIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import { usePlayback } from '../../context/PlaybackProvider';
import { selectionHaptic } from '../../design/haptics';
import { useHomeFeed } from '../culture/useCultureData';
import { buildDiscoveryItems, buildDiscoveryScenes, type DiscoveryItem } from './discoveryModel';
import { DiscoveryHeader } from './DiscoveryHeader';

const INK = '#F7F2E9';
const MUTED = '#A69F95';
const ORANGE = '#FF6600';
const FILTERS = ['All', 'Scenes', 'Genres', 'Cities', 'Charts'] as const;

export function MusicDiscoveryDiscover() {
  const router = useRouter();
  const params = useLocalSearchParams<{ scene?: string }>();
  const feed = useHomeFeed();
  const { playQueue } = usePlayback();
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>(params.scene ? 'Scenes' : 'All');
  const allItems = buildDiscoveryItems(feed.data);
  const scenes = buildDiscoveryScenes(feed.data);
  const items = useMemo(() => {
    if (filter === 'All' || filter === 'Charts') return allItems;
    if (filter === 'Cities') return allItems.filter((item) => item.discoveryReason.startsWith('Moving in'));
    if (filter === 'Genres') return allItems.filter((item) => item.discoveryReason.includes('New in') || item.discoveryReason.includes('Selected for'));
    return allItems.filter((item) => item.kind === 'mix');
  }, [allItems, filter]);

  const play = async (item: DiscoveryItem) => {
    selectionHaptic();
    await playQueue(allItems.map((entry) => entry.track), Math.max(0, allItems.findIndex((entry) => entry.id === item.id)));
  };

  return (
    <View style={styles.screen}>
      <DiscoveryHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>FOLLOW THE SIGNAL</Text>
        <Text style={styles.title}>Discover</Text>
        <Text style={styles.subtitle}>Explore independent music through scenes, places and the people moving them.</Text>

        <Pressable accessibilityRole="button" accessibilityLabel="Search music and scenes" onPress={() => router.push('/search' as any)} style={styles.search}>
          <MaterialIcons name="search" size={21} color={MUTED} />
          <Text style={styles.searchText}>Artists, tracks, scenes, cities</Text>
        </Pressable>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {FILTERS.map((item) => (
            <Pressable key={item} onPress={() => setFilter(item)} style={[styles.filter, filter === item && styles.filterActive]}>
              <Text style={[styles.filterText, filter === item && styles.filterTextActive]}>{item}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {params.scene ? <Text style={styles.context}>Scene focus · {params.scene}</Text> : null}
        {feed.isLoading ? <ActivityIndicator color={ORANGE} style={styles.loader} /> : null}
        {!feed.isLoading && items.length === 0 ? (
          <View style={styles.empty}><Text style={styles.emptyTitle}>No playable signals yet.</Text><Text style={styles.emptyBody}>Try another lens or return when creators publish more music.</Text></View>
        ) : null}

        {items.length ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>{filter === 'All' ? 'Fresh signals' : filter}</Text>
              <Text style={styles.sectionCount}>{items.length} PLAYABLE</Text>
            </View>
            {items.slice(0, 10).map((item, index) => (
              <Pressable
                key={item.id}
                accessibilityRole="button"
                accessibilityLabel={`Play ${item.title} by ${item.creator}. ${item.discoveryReason}`}
                onPress={() => play(item)}
                onLongPress={() => router.push(item.destinationRoute as any)}
                style={styles.row}
              >
                <Text style={styles.rank}>{String(index + 1).padStart(2, '0')}</Text>
                {item.artwork ? <PluggdImage uri={item.artwork} style={styles.art} displayWidth={240} /> : <View style={[styles.art, styles.artFallback]}><MaterialIcons name="graphic-eq" size={22} color={ORANGE} /></View>}
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle} numberOfLines={1}>{item.title}</Text>
                  <Text style={styles.rowCreator} numberOfLines={1}>{item.creator}</Text>
                  <Text style={styles.reason} numberOfLines={1}>{item.discoveryReason}</Text>
                </View>
                <View style={styles.play}><MaterialIcons name="play-arrow" size={20} color={INK} /></View>
              </Pressable>
            ))}
          </>
        ) : null}

        {scenes.length ? (
          <>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>Scene directory</Text></View>
            <View style={styles.sceneGrid}>
              {scenes.slice(0, 6).map((scene) => (
                <Pressable key={scene.label} onPress={() => setFilter(scene.detail === 'City signal' ? 'Cities' : 'Genres')} style={styles.scene}>
                  {scene.image ? <PluggdImage uri={scene.image} style={styles.sceneImage} displayWidth={360} /> : <View style={[StyleSheet.absoluteFill, styles.artFallback]} />}
                  <View style={styles.sceneShade} />
                  <Text style={styles.sceneLabel}>{scene.label}</Text>
                  <Text style={styles.sceneDetail}>{scene.detail}</Text>
                </Pressable>
              ))}
            </View>
          </>
        ) : null}

        <View style={styles.links}>
          <Pressable onPress={() => router.push('/events' as any)} style={styles.link}><Text style={styles.linkText}>Events near the signal</Text><MaterialIcons name="arrow-forward" size={20} color={ORANGE} /></Pressable>
          <Pressable onPress={() => router.push('/market' as any)} style={styles.link}><Text style={styles.linkText}>Beats and creator market</Text><MaterialIcons name="arrow-forward" size={20} color={ORANGE} /></Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0908' },
  content: { paddingHorizontal: 20, paddingBottom: 184 },
  kicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1.7, marginTop: 6 },
  title: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 34, lineHeight: 39, letterSpacing: -1.3, marginTop: 4 },
  subtitle: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 14, lineHeight: 20, maxWidth: 330, marginTop: 7 },
  search: { minHeight: 48, marginTop: 20, borderWidth: 1, borderColor: '#39332C', borderRadius: 5, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14 },
  searchText: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 13 },
  filters: { gap: 8, paddingVertical: 14 },
  filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 22, backgroundColor: '#181512' },
  filterActive: { backgroundColor: ORANGE },
  filterText: { color: '#CBC4B9', fontFamily: 'Satoshi-Bold', fontSize: 12 },
  filterTextActive: { color: '#110B07' },
  context: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 12, marginBottom: 4 },
  loader: { minHeight: 220 },
  empty: { minHeight: 190, justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F' },
  emptyTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 18 },
  emptyBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 13, marginTop: 6 },
  sectionHeader: { minHeight: 52, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderColor: '#29251F' },
  sectionTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17 },
  sectionCount: { color: MUTED, fontFamily: 'Satoshi-Bold', fontSize: 9, letterSpacing: 1.1 },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: '#29251F', gap: 10 },
  rank: { width: 19, color: '#756E64', fontFamily: 'Satoshi-Bold', fontSize: 9 },
  art: { width: 58, height: 58, borderRadius: 3, backgroundColor: '#211C17' },
  artFallback: { alignItems: 'center', justifyContent: 'center', backgroundColor: '#211C17' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 13, lineHeight: 17 },
  rowCreator: { color: '#C2BBB1', fontFamily: 'Satoshi-Medium', fontSize: 11, marginTop: 1 },
  reason: { color: ORANGE, fontFamily: 'Satoshi-Medium', fontSize: 9.5, marginTop: 4 },
  play: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#4B443B' },
  sceneGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 10 },
  scene: { width: '48.5%', height: 122, borderRadius: 5, overflow: 'hidden', padding: 11, justifyContent: 'flex-end' },
  sceneImage: { ...StyleSheet.absoluteFillObject },
  sceneShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(4,3,2,0.48)' },
  sceneLabel: { color: INK, fontFamily: 'Sora-Bold', fontSize: 15 },
  sceneDetail: { color: '#D5CEC3', fontFamily: 'Satoshi-Medium', fontSize: 10, marginTop: 2 },
  links: { marginTop: 24, borderTopWidth: 1, borderColor: '#29251F' },
  link: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#29251F' },
  linkText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  pressed: { opacity: 0.78 },
});
