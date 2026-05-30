import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { useUniversalSearch } from '../../src/features/culture/useCultureData';
import { contentInitials } from '../../src/lib/mobileContent';

export default function GenreDetailRoute() {
  const { genre } = useLocalSearchParams<{ genre: string }>();
  const router = useRouter();
  const label = decodeURIComponent(String(genre || 'Genre'));
  const results = useUniversalSearch(label);
  const data = results.data;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="chevron-left" size={28} color="#FFFFFF" />
        </Pressable>
        <Text style={styles.title}>{label.toUpperCase()}</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.subtitle}>Top releases, beats, mixes, videos, creators, soundboards and live/replay results backed by PLUGGD search.</Text>
        <GenreSection title="Releases" rows={(data?.tracks || []).map((item) => ({ id: item.id, title: item.title || 'Release', meta: item.artist || item.genre, image: item.cover_art_url, route: `/release/${item.id}` }))} />
        <GenreSection title="Beats" rows={(data?.beats || []).map((item) => ({ id: item.id, title: item.title || 'Beat', meta: item.producer_name || item.genre, image: item.image_url, route: `/beat/${item.id}` }))} />
        <GenreSection title="Mixes" rows={(data?.mixes || []).map((item) => ({ id: item.id, title: item.title || 'Mix', meta: item.city || item.recording_type, image: item.cover_url, route: `/mixes/${item.slug || item.id}` }))} />
        <GenreSection title="Videos" rows={(data?.videos || []).map((item) => ({ id: item.id, title: item.title || 'Video', meta: item.description, image: item.thumbnail_url, route: `/videos/${item.id}` }))} />
        <GenreSection title="Creators" rows={(data?.creators || []).map((item) => ({ id: item.user_id || item.id || item.username || item.full_name || 'creator', title: item.display_name || item.full_name || item.username || 'Creator', meta: item.username ? `@${item.username}` : item.city, image: item.avatar_url, route: item.username ? `/creator/${item.username}` : `/user/${item.user_id}` }))} />
        <GenreSection title="Soundboards" rows={(data?.communities || []).filter((item) => String(item.hub_type || '').toLowerCase().includes('soundboard')).map((item) => ({ id: item.id, title: item.title, meta: item.description, image: item.cover_image_url || item.avatar_url, route: `/backstage/${item.slug || item.id}` }))} />
      </ScrollView>
    </View>
  );
}

function GenreSection({ title, rows }: { title: string; rows: Array<{ id: string; title: string; meta?: string | null; image?: string | null; route: string }> }) {
  const router = useRouter();
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {rows.length ? rows.slice(0, 8).map((row) => (
        <Pressable key={`${title}-${row.id}`} accessibilityRole="button" accessibilityLabel={`Open ${row.title}`} style={styles.row} onPress={() => router.push(row.route as any)}>
          <View style={styles.art}>{row.image ? <PluggdImage uri={row.image} style={styles.image} /> : <Text style={styles.initial}>{contentInitials(row.title)}</Text>}</View>
          <View style={styles.copy}>
            <Text style={styles.rowTitle} numberOfLines={1}>{row.title}</Text>
            {row.meta ? <Text style={styles.rowMeta} numberOfLines={1}>{row.meta}</Text> : null}
          </View>
          <MaterialIcons name="chevron-right" size={22} color="#737373" />
        </Pressable>
      )) : <Text style={styles.empty}>No {title.toLowerCase()} found for this genre yet.</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#08080C' },
  header: { paddingHorizontal: 16, paddingTop: 42, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#1F1F2E', flexDirection: 'row', alignItems: 'center', gap: 10 },
  backButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  title: { color: '#FFFFFF', fontFamily: 'PluggdSans5-Regular', fontSize: 31, lineHeight: 35 },
  content: { padding: 16, paddingBottom: 170 },
  subtitle: { color: '#B3B3B3', fontSize: 14, lineHeight: 21, marginBottom: 18 },
  section: { marginBottom: 24, gap: 8 },
  sectionTitle: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 19 },
  row: { minHeight: 70, borderRadius: 16, borderWidth: 1, borderColor: '#262626', backgroundColor: '#12121A', padding: 10, flexDirection: 'row', alignItems: 'center', gap: 11 },
  art: { width: 50, height: 50, borderRadius: 13, backgroundColor: '#1F1F2E', overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  initial: { color: '#FFFFFF', fontFamily: 'Satoshi-Black', fontSize: 13 },
  copy: { flex: 1, minWidth: 0 },
  rowTitle: { color: '#FFFFFF', fontFamily: 'Satoshi-Bold', fontSize: 15 },
  rowMeta: { color: '#8E8E9F', fontSize: 12, marginTop: 3 },
  empty: { color: '#8E8E9F', fontSize: 13, lineHeight: 19 },
});
