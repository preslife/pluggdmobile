import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../components/PluggdImage';
import type { CommunityFeedBundle, CommunityInterstitialKind } from './communityFeedTypes';

const COLORS = {
  surface: '#12121A',
  surface2: '#1F1F2E',
  border: '#262637',
  orange: '#FF5A00',
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
  return 'Community Radio';
}

function subtitleForKind(kind: CommunityInterstitialKind) {
  if (kind === 'live_now') return 'Rooms, events and creator sessions people are joining now.';
  if (kind === 'who_to_follow') return 'Creators and scene voices to add to your feed.';
  if (kind === 'trending_boards') return 'Threads and boards moving across the community.';
  if (kind === 'nearby_events') return 'Shows, meetups and sessions connected to the scene.';
  if (kind === 'community_radio') return 'Mixes and sounds being passed around.';
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
        <View>
          <Text style={styles.kicker}>{titleForKind(kind)}</Text>
          <Text style={styles.subtitle}>{subtitleForKind(kind)}</Text>
        </View>
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
            <Text style={styles.cardEyebrow} numberOfLines={1}>{item.eyebrow}</Text>
            <Text style={styles.cardTitle} numberOfLines={2}>{item.title}</Text>
            <Text style={styles.cardSubtitle} numberOfLines={2}>{item.subtitle}</Text>
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
    borderColor: 'rgba(255,90,0,0.34)',
    backgroundColor: 'rgba(255,90,0,0.08)',
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  promptIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,90,0,0.14)',
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
  },
  kicker: {
    color: COLORS.orange,
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 1.2,
  },
  title: {
    color: COLORS.white,
    fontSize: 15,
    fontWeight: '900',
  },
  subtitle: {
    color: COLORS.muted,
    fontSize: 12,
    lineHeight: 17,
    fontWeight: '700',
    marginTop: 3,
  },
  rail: {
    paddingHorizontal: 16,
    gap: 10,
  },
  card: {
    width: 172,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 10,
    gap: 7,
  },
  image: {
    width: '100%',
    height: 92,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
  },
  imageFallback: {
    width: '100%',
    height: 92,
    borderRadius: 14,
    backgroundColor: COLORS.surface2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardEyebrow: {
    color: COLORS.orange,
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  cardTitle: {
    color: COLORS.white,
    fontSize: 13,
    lineHeight: 17,
    fontWeight: '900',
  },
  cardSubtitle: {
    color: COLORS.muted,
    fontSize: 11,
    lineHeight: 15,
    fontWeight: '700',
  },
});
