import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
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
  const [filter, setFilter] = useState<'All' | 'Saved' | 'Owned' | 'Tickets'>('All');

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <DiscoveryHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>YOUR COLLECTION</Text>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>Saved finds, music you own and tickets—kept together.</Text>
        <View style={styles.summaryRow}>
          <View><Text style={styles.summaryNumber}>{saved.length}</Text><Text style={styles.summaryLabel}>SAVED</Text></View>
          <View><Text style={styles.summaryNumber}>{purchases.length}</Text><Text style={styles.summaryLabel}>OWNED</Text></View>
          <View><Text style={styles.summaryNumber}>{tickets.length}</Text><Text style={styles.summaryLabel}>TICKETS</Text></View>
        </View>
        <View style={styles.filters}>
          {(['All', 'Saved', 'Owned', 'Tickets'] as const).map((label) => <Pressable key={label} accessibilityRole="tab" accessibilityState={{ selected: filter === label }} onPress={() => setFilter(label)} style={[styles.filter, filter === label && styles.filterActive]}><Text style={[styles.filterText, filter === label && styles.filterTextActive]}>{label}</Text></Pressable>)}
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

        {(filter === 'All' || filter === 'Saved') && saved.length ? <Section title="Saved" count={saved.length} /> : null}
        {(filter === 'All' || filter === 'Saved') ? saved.map((item, index) => <LibraryRow key={`${item.source}-${item.id}`} index={index + 1} title={item.title} subtitle={item.subtitle} image={item.imageUrl} meta={item.kind.replace('_', ' ')} onPress={() => router.push(item.route as any)} />) : null}
        {(filter === 'All' || filter === 'Owned') && purchases.length ? <Section title="Owned" count={purchases.length} /> : null}
        {(filter === 'All' || filter === 'Owned') ? purchases.map((item, index) => <LibraryRow key={`${item.source}-${item.id}`} index={index + 1} title={item.title} subtitle={item.subtitle} image={item.imageUrl} meta={item.kind.replace('_', ' ')} onPress={() => router.push(item.route as any)} />) : null}
        {(filter === 'All' || filter === 'Tickets') && tickets.length ? <Section title="Tickets" count={tickets.length} /> : null}
        {(filter === 'All' || filter === 'Tickets') ? tickets.map((ticket, index) => <LibraryRow key={`${ticket.source}-${ticket.id}`} index={index + 1} title={ticket.event_title} subtitle={ticket.venue || ticket.status} image={ticket.event_image_url} meta="ticket" onPress={() => router.push(`/events/${ticket.event_id}` as any)} />) : null}
      </ScrollView>
    </View>
  );
}

function Section({ title, count }: { title: string; count: number }) {
  return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text><Text style={styles.sectionCount}>{String(count).padStart(2, '0')}</Text></View>;
}

function LibraryRow({ index, title, subtitle, image, meta, onPress }: { index: number; title: string; subtitle?: string | null; image?: string | null; meta: string; onPress: () => void }) {
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${title}`} onPress={onPress} style={styles.row}>
      <Text style={styles.rowIndex}>{String(index).padStart(2, '0')}</Text>
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
  summaryRow: { minHeight: 78, marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-around' },
  summaryNumber: { color: INK, fontFamily: 'Sora-ExtraBold', fontSize: 20, textAlign: 'center' },
  summaryLabel: { color: MUTED, fontFamily: 'Satoshi-Bold', fontSize: 8, letterSpacing: 1.1, marginTop: 3, textAlign: 'center' },
  filters: { flexDirection: 'row', gap: 22, marginTop: 16, borderBottomWidth: 1, borderColor: '#29251F' },
  filter: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  filterActive: { borderColor: ORANGE },
  filterText: { color: '#CBC4B9', fontFamily: 'Satoshi-Bold', fontSize: 12 },
  filterTextActive: { color: INK },
  loader: { minHeight: 230 },
  empty: { marginTop: 24, minHeight: 240, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F', paddingHorizontal: 22 },
  emptyTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 18, textAlign: 'center', marginTop: 13 },
  emptyBody: { color: MUTED, fontFamily: 'Satoshi-Regular', fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  discoverButton: { minHeight: 44, marginTop: 18, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: ORANGE, borderRadius: 4 },
  discoverButtonText: { color: '#100B07', fontFamily: 'Satoshi-Bold', fontSize: 12 },
  section: { minHeight: 58, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderColor: '#29251F' },
  sectionTitle: { color: INK, fontFamily: 'Sora-Bold', fontSize: 18 },
  sectionCount: { color: ORANGE, fontFamily: 'Satoshi-Black', fontSize: 9, letterSpacing: 1.1 },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderColor: '#29251F' },
  rowIndex: { width: 20, color: '#756E64', fontFamily: 'Satoshi-Black', fontSize: 9 },
  art: { width: 58, height: 58, borderRadius: 3, backgroundColor: '#211C17' },
  artFallback: { alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: INK, fontFamily: 'Satoshi-Bold', fontSize: 13 },
  rowSubtitle: { color: MUTED, fontFamily: 'Satoshi-Medium', fontSize: 11, marginTop: 2 },
  rowMeta: { color: ORANGE, fontFamily: 'Satoshi-Bold', fontSize: 9, letterSpacing: 1, marginTop: 4 },
});
