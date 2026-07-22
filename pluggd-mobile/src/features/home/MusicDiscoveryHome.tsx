import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePlayback } from '../../context/PlaybackProvider';
import { selectionHaptic } from '../../design/haptics';
import { PluggdImage } from '../../components/PluggdImage';
import { useHomeFeed } from '../culture/useCultureData';
import { buildDiscoveryItems, buildDiscoveryScenes, type DiscoveryItem } from '../discovery/discoveryModel';
import { DiscoveryHeader } from '../discovery/DiscoveryHeader';

const INK = '#F7F2E9';
const MUTED = '#A69F95';
const ORANGE = '#FF6600';

export function MusicDiscoveryHome() {
  const router = useRouter();
  const feed = useHomeFeed();
  const { playQueue } = usePlayback();
  const items = buildDiscoveryItems(feed.data);
  const scenes = buildDiscoveryScenes(feed.data);
  const featured = items[0];
  const picks = items.slice(1, 5);

  const play = async (item: DiscoveryItem) => {
    selectionHaptic();
    const queue = items.map((entry) => entry.track);
    await playQueue(queue, Math.max(0, items.findIndex((entry) => entry.id === item.id)));
  };

  return (
    <View style={styles.screen}>
      <DiscoveryHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.titleRow}>
          <View>
            <Text style={styles.eyebrow}>{new Intl.DateTimeFormat('en-GB', { weekday: 'long', day: '2-digit', month: 'long' }).format(new Date()).toUpperCase().replace(',', ' ·')}</Text>
            <Text style={styles.title}>The Daily Plug</Text>
          </View>
          <Text style={styles.editorNote}>Selected by{`\n`}PLUGGD editors</Text>
        </View>

        {feed.isLoading ? <ActivityIndicator color={ORANGE} style={styles.loader} /> : null}
        {!feed.isLoading && !featured ? (
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>The signal is quiet.</Text>
            <Text style={styles.emptyBody}>Fresh playable music will appear here as creators publish it.</Text>
          </View>
        ) : null}
        {featured ? (
          <View style={styles.featured}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Play ${featured.title} by ${featured.creator}`}
              onPress={() => play(featured)}
              style={styles.featuredArtWrap}
            >
              <Artwork item={featured} style={styles.featuredArt} iconSize={34} />
              <View style={styles.kindFlag}><Text style={styles.kindFlagText}>{featured.kind.toUpperCase()}</Text></View>
              <View style={styles.featuredPlayBadge}><MaterialIcons name="play-arrow" size={25} color="#100B07" /></View>
            </Pressable>
            <View style={styles.featuredCopy}>
              <Text style={styles.reason}>{featured.discoveryReason.toUpperCase()}</Text>
              <Text style={styles.featuredTitle} numberOfLines={2}>{featured.title}</Text>
              <Text style={styles.featuredCreator} numberOfLines={1}>{featured.creator}</Text>
              <View style={styles.featuredActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Support ${featured.creator}`}
                  onPress={() => router.push((featured.supportRoute || featured.destinationRoute) as any)}
                  style={styles.supportButton}
                >
                  <Text style={styles.supportText}>Support this release</Text>
                </Pressable>
              </View>
            </View>
          </View>
        ) : null}

        {picks.length ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Four worth your time</Text>
              <Pressable accessibilityRole="button" accessibilityLabel="Open Discover" onPress={() => router.push('/discover' as any)}>
                <Text style={styles.seeAll}>See all</Text>
              </Pressable>
            </View>
            <View style={styles.pickGrid}>
              {[picks.slice(0, 2), picks.slice(2, 4)].map((row, rowIndex) => (
                <View key={`pick-row-${rowIndex}`} style={styles.pickRow}>
                  {row.map((item) => (
                    <Pressable
                      key={item.id}
                      accessibilityRole="button"
                      accessibilityLabel={`Play ${item.title} by ${item.creator}`}
                      onPress={() => play(item)}
                      style={styles.pick}
                    >
                      <Artwork item={item} style={styles.pickArt} iconSize={24} />
                      <View style={styles.pickCopy}>
                        <Text style={styles.pickTitle} numberOfLines={1}>{item.title}</Text>
                        <Text style={styles.pickCreator} numberOfLines={1}>{item.creator}</Text>
                      </View>
                      <View style={styles.smallPlay}><MaterialIcons name="play-arrow" size={18} color={INK} /></View>
                    </Pressable>
                  ))}
                </View>
              ))}
            </View>
          </>
        ) : null}

        {scenes.length ? (
          <>
            <View style={styles.sectionHeader}><Text style={styles.sectionTitle}>From the scenes</Text></View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.sceneRow}>
              {scenes.map((scene) => (
                <Pressable key={scene.label} onPress={() => router.push(scene.route as any)} style={styles.scene}>
                  {scene.image ? <PluggdImage uri={scene.image} style={styles.sceneImage} displayWidth={360} /> : <View style={styles.sceneFallback} />}
                  <View style={styles.sceneShade} />
                  <Text style={styles.sceneLabel}>{scene.label}</Text>
                  <Text style={styles.sceneDetail}>{scene.detail}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </>
        ) : null}

        <Pressable onPress={() => router.push('/events' as any)} style={styles.contextRow}>
          <View><Text style={styles.contextKicker}>WHAT'S HAPPENING</Text><Text style={styles.contextTitle}>Live rooms and events</Text></View>
          <MaterialIcons name="arrow-forward" size={22} color={ORANGE} />
        </Pressable>
        <Pressable onPress={() => router.push('/auth/register' as any)} style={styles.joinPrompt}>
          <Text style={styles.joinTitle}>Make the signal yours.</Text>
          <Text style={styles.joinBody}>Join to save finds and follow independent creators.</Text>
        </Pressable>
      </ScrollView>
    </View>
  );
}

function Artwork({ item, style, iconSize }: { item: DiscoveryItem; style: any; iconSize: number }) {
  return item.artwork ? (
    <PluggdImage uri={item.artwork} style={style} resizeMode="cover" displayWidth={520} />
  ) : (
    <View style={[style, styles.artFallback]}><MaterialIcons name="graphic-eq" size={iconSize} color={ORANGE} /></View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0908' },
  content: { paddingHorizontal: 20, paddingBottom: 184 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 4, marginBottom: 18 },
  eyebrow: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1.6, marginBottom: 5 },
  title: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 30, lineHeight: 34, letterSpacing: -1.1 },
  editorNote: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 10, lineHeight: 14, textAlign: 'right' },
  loader: { minHeight: 210 },
  empty: { minHeight: 210, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F', justifyContent: 'center' },
  emptyTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 20 },
  emptyBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 14, lineHeight: 20, marginTop: 8, maxWidth: 280 },
  featured: { minHeight: 194, flexDirection: 'row', gap: 17, paddingVertical: 14, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F' },
  featuredArtWrap: { width: 146, position: 'relative' },
  featuredArt: { width: 146, height: 164, borderRadius: 3, backgroundColor: '#211C17' },
  kindFlag: { position: 'absolute', left: 8, top: 8, paddingHorizontal: 7, paddingVertical: 4, backgroundColor: 'rgba(10,9,8,0.82)' },
  kindFlagText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 8, letterSpacing: 1.1 },
  featuredPlayBadge: { position: 'absolute', right: 9, bottom: 9, width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  featuredCopy: { flex: 1, paddingVertical: 2, justifyContent: 'center' },
  reason: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 9, lineHeight: 12, letterSpacing: 1.1, marginBottom: 7 },
  featuredTitle: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 19, lineHeight: 22, letterSpacing: -0.45 },
  featuredCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 13, marginTop: 5 },
  featuredActions: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  supportButton: { minHeight: 44, flexShrink: 0, justifyContent: 'center', borderBottomWidth: 1, borderColor: '#756E64' },
  supportText: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  sectionHeader: { minHeight: 54, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10 },
  sectionTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17, letterSpacing: -0.35 },
  seeAll: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 12 },
  pickGrid: { gap: 10 },
  pickRow: { flexDirection: 'row', gap: 10 },
  pick: { flex: 1, minWidth: 0, minHeight: 70, flexDirection: 'row', alignItems: 'center', backgroundColor: '#171411', padding: 6, gap: 8, borderRadius: 5 },
  pickArt: { width: 58, height: 58, borderRadius: 3, backgroundColor: '#211C17' },
  pickCopy: { flex: 1, minWidth: 0 },
  pickTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 11, lineHeight: 14 },
  pickCreator: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 9.5, lineHeight: 13, marginTop: 2 },
  smallPlay: { position: 'absolute', right: 5, bottom: 5, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(10,9,8,0.72)' },
  sceneRow: { gap: 10, paddingRight: 20 },
  scene: { width: 132, height: 112, borderRadius: 5, overflow: 'hidden', justifyContent: 'flex-end', padding: 10 },
  sceneImage: { ...StyleSheet.absoluteFillObject },
  sceneFallback: { ...StyleSheet.absoluteFillObject, backgroundColor: '#26170F' },
  sceneShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(5,4,3,0.45)' },
  sceneLabel: { color: INK, fontFamily: 'Sora-Bold', fontSize: 15 },
  sceneDetail: { color: '#D5CEC3', fontFamily: 'Satoshi-Medium', fontSize: 10, marginTop: 2 },
  contextRow: { minHeight: 76, marginTop: 24, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  contextKicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 9, letterSpacing: 1.2 },
  contextTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 16, marginTop: 3 },
  joinPrompt: { paddingVertical: 24 },
  joinTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 17 },
  joinBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 13, marginTop: 5 },
  artFallback: { alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.78, transform: [{ scale: 0.985 }] },
});
