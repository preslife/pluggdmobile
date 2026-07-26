import { useQuery } from '@tanstack/react-query';
import { pluggdFonts } from '../../src/design/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MobileSocialPostCard } from '../../src/features/culture/MobileSocialPostCard';
import { loadMobileSocialFeed } from '../../src/features/culture/mobileSocial';

const COLORS = {
  canvas: '#0a0806',
  surface: '#171310',
  border: '#2a221a',
  orange: '#ff6600',
  white: '#FFFFFF',
  muted: '#8E8E9F',
};

export default function HashtagRoute() {
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const insets = useSafeAreaInsets();
  const cleanTag = String(tag || '').replace(/^#/, '').toLowerCase();
  const query = useQuery({
    queryKey: ['community-feed', 'hashtag', cleanTag],
    queryFn: () => loadMobileSocialFeed({ hashtag: cleanTag, mode: 'trending', limit: 40 }),
    enabled: cleanTag.length > 0,
  });

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={[COLORS.canvas, '#120d08', COLORS.canvas]} style={StyleSheet.absoluteFill} />
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 92, 128), paddingBottom: insets.bottom + 120, gap: 12 }}
        refreshControl={<RefreshControl tintColor={COLORS.orange} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
        ListHeaderComponent={<View style={styles.header}><Text style={styles.kicker}>Hashtag</Text><Text style={styles.heading}>#{cleanTag}</Text></View>}
        ListEmptyComponent={query.isLoading ? <ActivityIndicator color={COLORS.orange} /> : <View style={styles.empty}><Text style={styles.emptyTitle}>No posts yet</Text><Text style={styles.emptyBody}>Posts with this hashtag will appear here.</Text></View>}
        renderItem={({ item }) => <MobileSocialPostCard post={item} onMutated={() => void query.refetch()} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: COLORS.canvas },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  kicker: { color: COLORS.orange, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
  heading: { color: COLORS.white, fontSize: 34, lineHeight: 39, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 2 },
  empty: { marginHorizontal: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: COLORS.border, paddingVertical: 20, gap: 8 },
  emptyTitle: { color: COLORS.white, fontSize: 17, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  emptyBody: { color: COLORS.muted, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
});
