import { useQuery } from '@tanstack/react-query';
import { pluggdFonts } from '../../src/design/typography';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, FlatList, RefreshControl, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMemo } from 'react';
import { MobileSocialPostCard } from '../../src/features/culture/MobileSocialPostCard';
import { loadMobileSocialFeed } from '../../src/features/culture/mobileSocial';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

export default function HashtagRoute() {
  const theme = usePluggdTheme();
  const styles = useHashtagStyles();
  const { tag } = useLocalSearchParams<{ tag: string }>();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomChromeInset();
  const cleanTag = String(tag || '').replace(/^#/, '').toLowerCase();
  const query = useQuery({
    queryKey: ['community-feed', 'hashtag', cleanTag],
    queryFn: () => loadMobileSocialFeed({ hashtag: cleanTag, mode: 'trending', limit: 40 }),
    enabled: cleanTag.length > 0,
  });

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient colors={theme.scheme === 'dark' ? ['#0A0806', '#120D08', '#0A0806'] : ['#FFF8ED', '#F4E7D2', '#FFF8ED']} style={StyleSheet.absoluteFill} />
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: Math.max(insets.top + 92, 128), paddingBottom: bottomInset, gap: 12 }}
        refreshControl={<RefreshControl tintColor={theme.colors.accentText} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
        ListHeaderComponent={<View style={styles.header}><Text style={styles.kicker}>Hashtag</Text><Text style={styles.heading}>#{cleanTag}</Text></View>}
        ListEmptyComponent={query.isLoading ? <ActivityIndicator color={theme.colors.accentText} /> : <View style={styles.empty}><Text style={styles.emptyTitle}>No posts yet</Text><Text style={styles.emptyBody}>Posts with this hashtag will appear here.</Text></View>}
        renderItem={({ item }) => <MobileSocialPostCard post={item} onMutated={() => void query.refetch()} />}
      />
    </View>
  );
}

function useHashtagStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { paddingHorizontal: 16, paddingBottom: 12 },
  kicker: { color: theme.colors.accentText, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 1.5 },
  heading: { color: theme.colors.text, fontSize: 34, lineHeight: 39, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 2 },
  empty: { marginHorizontal: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 20, gap: 8 },
  emptyTitle: { color: theme.colors.text, fontSize: 17, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  emptyBody: { color: theme.colors.textMuted, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
}), [theme]);
}
