import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../src/components/PluggdImage';
import { DiscoveryHeader } from '../src/features/discovery/DiscoveryHeader';
import { loadLibraryBundle } from '../src/features/culture/mobileServices';

const INK = '#F7F2E9';
const MUTED = '#A69F95';
const ORANGE = '#FF6600';

export default function LibraryScreen() {
  const router = useRouter();
  const library = useQuery({ queryKey: ['culture', 'library'], queryFn: loadLibraryBundle });
  const saved = library.data?.saved ?? [];
  const purchases = library.data?.purchases ?? [];
  const tickets = library.data?.tickets ?? [];
  const total = saved.length + purchases.length + tickets.length;

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <DiscoveryHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>YOUR COLLECTION</Text>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>Saved finds, music you own and tickets—kept together.</Text>
        <View style={styles.filters}>
          {['All', 'Saved', 'Owned', 'Tickets'].map((label, index) => <View key={label} style={[styles.filter, index === 0 && styles.filterActive]}><Text style={[styles.filterText, index === 0 && styles.filterTextActive]}>{label}</Text></View>)}
        </View>

        {library.isLoading ? <ActivityIndicator color={ORANGE} style={styles.loader} /> : null}
        {!library.isLoading && total === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="library-music" size={30} color={ORANGE} />
            <Text style={styles.emptyTitle}>Your next favourite belongs here.</Text>
            <Text style={styles.emptyBody}>Save a release, beat or mix and it will be waiting for you.</Text>
            <Pressable onPress={() => router.push('/discover' as any)} style={styles.discoverButton}><Text style={styles.discoverButtonText}>Start discovering</Text></Pressable>
          </View>
        ) : null}

        {saved.length ? <Section title="Saved" /> : null}
        {saved.map((item) => <LibraryRow key={`${item.source}-${item.id}`} title={item.title} subtitle={item.subtitle} image={item.imageUrl} meta={item.kind.replace('_', ' ')} onPress={() => router.push(item.route as any)} />)}
        {purchases.length ? <Section title="Owned" /> : null}
        {purchases.map((item) => <LibraryRow key={`${item.source}-${item.id}`} title={item.title} subtitle={item.subtitle} image={item.imageUrl} meta={item.kind.replace('_', ' ')} onPress={() => router.push(item.route as any)} />)}
        {tickets.length ? <Section title="Tickets" /> : null}
        {tickets.map((ticket) => <LibraryRow key={`${ticket.source}-${ticket.id}`} title={ticket.event_title} subtitle={ticket.venue || ticket.status} image={ticket.event_image_url} meta="ticket" onPress={() => router.push(`/events/${ticket.event_id}` as any)} />)}
      </ScrollView>
    </View>
  );
}

function Section({ title }: { title: string }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text></View>;
}

function LibraryRow({ title, subtitle, image, meta, onPress }: { title: string; subtitle?: string | null; image?: string | null; meta: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} onPress={onPress} style={styles.row}>
      {image ? <PluggdImage uri={image} style={styles.art} displayWidth={240} /> : <View style={[styles.art, styles.artFallback]}><MaterialIcons name="music-note" size={22} color={ORANGE} /></View>}
      <View style={styles.rowCopy}><Text style={styles.rowTitle} numberOfLines={1}>{title}</Text><Text style={styles.rowSubtitle} numberOfLines={1}>{subtitle || meta}</Text><Text style={styles.rowMeta}>{meta.toUpperCase()}</Text></View>
      <MaterialIcons name="chevron-right" size={22} color={MUTED} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0908' },
  content: { paddingHorizontal: 20, paddingBottom: 150 },
  kicker: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 1.7, marginTop: 6 },
  title: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 34, lineHeight: 39, letterSpacing: -1.2, marginTop: 4 },
  subtitle: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 14, lineHeight: 20, marginTop: 7 },
  filters: { flexDirection: 'row', gap: 8, marginTop: 20 },
  filter: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 15, borderRadius: 22, backgroundColor: '#181512' },
  filterActive: { backgroundColor: ORANGE },
  filterText: { color: '#CBC4B9', fontFamily: 'Satoshi-Bold', fontSize: 12 },
  filterTextActive: { color: '#110B07' },
  loader: { minHeight: 230 },
  empty: { marginTop: 24, minHeight: 240, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F', paddingHorizontal: 22 },
  emptyTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 18, textAlign: 'center', marginTop: 13 },
  emptyBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  discoverButton: { minHeight: 44, marginTop: 18, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: ORANGE, borderRadius: 4 },
  discoverButtonText: { color: '#100B07', fontFamily: 'Satoshi-Bold', fontSize: 12 },
  section: { minHeight: 58, justifyContent: 'flex-end', paddingBottom: 10, borderBottomWidth: 1, borderColor: '#29251F' },
  sectionTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 18 },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderColor: '#29251F' },
  art: { width: 58, height: 58, borderRadius: 3, backgroundColor: '#211C17' },
  artFallback: { alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  rowSubtitle: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 11, marginTop: 2 },
  rowMeta: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 9, letterSpacing: 1, marginTop: 4 },
});
