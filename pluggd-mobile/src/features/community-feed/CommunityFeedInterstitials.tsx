import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../design/typography';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import type { CommunityFeedBundle, CommunityInterstitialKind } from './communityFeedTypes';
import { LinearGradient } from 'expo-linear-gradient';

const COLORS = {
  surface: '#171310',
  surface2: '#241d15',
  border: '#2a221a',
  orange: '#ff6600',
  live: '#FF4757',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

function titleForKind(kind: CommunityInterstitialKind) {
  if (kind === 'prompt') return 'Community Prompt';
  if (kind === 'live_now') return 'Live Now';
  if (kind === 'who_to_follow') return 'Who To Follow';
  if (kind === 'trending_boards') return 'Trending Boards';
  if (kind === 'nearby_events') return 'Nearby Events';
  if (kind === 'the_plug') return 'From THE PLUG';
  return 'Community Radio';
}

function subtitleForKind(kind: CommunityInterstitialKind) {
  if (kind === 'live_now') return 'Rooms, events and creator sessions people are joining now.';
  if (kind === 'who_to_follow') return 'Creators and scene voices to add to your feed.';
  if (kind === 'trending_boards') return 'Threads and boards moving across the community.';
  if (kind === 'nearby_events') return 'Shows, meetups and sessions connected to the scene.';
  if (kind === 'community_radio') return 'Mixes and sounds being passed around.';
  if (kind === 'the_plug') return 'Interviews, reports and ideas shaping independent music.';
  return 'Start a thread, share a release, or post what you are hearing.';
}

function itemsForKind(kind: CommunityInterstitialKind, bundle: CommunityFeedBundle) {
  if (kind === 'live_now') return bundle.liveNow;
  if (kind === 'who_to_follow') return bundle.whoToFollow;
  if (kind === 'trending_boards') return bundle.boards.map((board) => ({
    id: board.id,
    title: board.name,
    subtitle: board.description || board.category || 'Board',
    eyebrow: board.joined ? 'Joined' : 'Board',
    route: board.route,
    imageUrl: null,
    metric: board.is_featured ? 'Featured' : null,
    kind: 'board',
  }));
  if (kind === 'nearby_events') return bundle.nearbyEvents;
  if (kind === 'community_radio') return bundle.radio;
  if (kind === 'the_plug') return bundle.editorials;
  return [];
}

export function CommunityFeedInterstitial({
  kind,
  bundle,
}: {
  kind: CommunityInterstitialKind;
  bundle: CommunityFeedBundle;
}) {
  const router = useRouter();
  const items = itemsForKind(kind, bundle).slice(0, 8);

  if (kind === 'prompt') {
    return (
      <Pressable accessibilityRole="button" accessibilityLabel="Open community post composer" style={styles.promptCard} onPress={() => router.push(bundle.prompt.route as any)}>
        <View style={styles.promptIcon}>
          <MaterialIcons name="bolt" size={22} color={COLORS.orange} />
        </View>
        <View style={styles.promptCopy}>
          <Text style={styles.title}>{bundle.prompt.title}</Text>
          <Text style={styles.subtitle}>{bundle.prompt.subtitle}</Text>
        </View>
        <MaterialIcons name="arrow-forward" size={20} color={COLORS.muted} />
      </Pressable>
    );
  }

  if (!items.length) return null;

  return (
    <View style={styles.wrap}>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.kicker}>{titleForKind(kind)}</Text>
          <Text style={styles.subtitle}>{subtitleForKind(kind)}</Text>
        </View>
        {kind === 'the_plug' ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open all THE PLUG stories" onPress={() => router.push('/plug' as any)} style={styles.headerAction}>
            <Text style={styles.headerActionText}>Read all</Text>
            <MaterialIcons name="arrow-forward" size={15} color={COLORS.orange} />
          </Pressable>
        ) : null}
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.rail}>
        {items.map((item) => (
          <Pressable key={`${kind}-${item.id}`} accessibilityRole="button" accessibilityLabel={`Open ${item.title}`} style={styles.card} onPress={() => item.route && router.push(item.route as any)}>
            {item.imageUrl ? (
              <PluggdImage uri={item.imageUrl} style={styles.image} resizeMode="cover" />
            ) : (
              <View style={styles.imageFallback}>
                <MaterialIcons name={kind === 'live_now' ? 'radio-button-checked' : kind === 'who_to_follow' ? 'person-add' : kind === 'nearby_events' ? 'event' : 'forum'} size={24} color={kind === 'live_now' ? COLORS.live : COLORS.orange} />
              </View>
            )}
            <LinearGradient colors={['rgba(6,5,4,0.06)', 'rgba(6,5,4,0.94)']} style={StyleSheet.absoluteFillObject} />
            <View style={styles.cardTop}><Text style={styles.cardEyebrow} numberOfLines={1}>{item.eyebrow}</Text><MaterialIcons name="north-east" size={16} color={COLORS.white} /></View>
            <View style={styles.cardCopy}><Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text><Text style={styles.cardSubtitle} numberOfLines={2}>{item.subtitle}</Text></View>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  promptCard: {
    marginHorizontal: 16,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    backgroundColor: 'rgba(18,20,32,0.42)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promptIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.06)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promptCopy: {
    flex: 1,
    minWidth: 0,
  },
  wrap: {
    gap: 10,
    paddingTop: 2,
  },
  header: {
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  headerCopy: { flex: 1, minWidth: 0 },
  headerAction: { minHeight: 44, flexDirection: 'row', alignItems: 'flex-end', gap: 4, paddingBottom: 2 },
  headerActionText: { color: COLORS.orange, fontFamily: pluggdFonts.satoshiBold, fontSize: 11.5 },
  kicker: {
    color: COLORS.orange,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: COLORS.white,
    fontSize: 15,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '500',
    marginTop: 3,
  },
  rail: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 210,
    height: 184,
    borderRadius: 6,
    backgroundColor: COLORS.surface,
    padding: 12,
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.surface2,
  },
  imageFallback: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEyebrow: {
    color: COLORS.orange,
    fontSize: 10,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardTop: { zIndex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardCopy: { zIndex: 2 },
  cardTitle: {
    color: COLORS.white,
    fontSize: 16,
    lineHeight: 20,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
  cardSubtitle: {
    color: '#D7CFC4',
    fontSize: 11,
    lineHeight: 15,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '500',
  },
});
