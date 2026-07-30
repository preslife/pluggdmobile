import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useState } from 'react';
import { PluggdImage } from '../src/components/PluggdImage';
import { pluggdFonts } from '../src/design/typography';
import { DiscoveryHeader } from '../src/features/discovery/DiscoveryHeader';
import { loadLibraryBundle } from '../src/features/culture/mobileServices';

const INK = '#F7F2E9';
const MUTED = '#A69F95';
const ORANGE = '#FF6600';
type LibraryFilter = 'All' | 'Music' | 'Playlists' | 'Events' | 'Access';
const MUSIC_KINDS = new Set(['release', 'beat', 'mix', 'sample_pack', 'soundboard', 'video']);

export default function LibraryScreen() {
  const router = useRouter();
  const library = useQuery({ queryKey: ['culture', 'library'], queryFn: loadLibraryBundle });
  const saved = library.data?.saved ?? [];
  const purchases = library.data?.purchases ?? [];
  const tickets = library.data?.tickets ?? [];
  const entitlements = library.data?.entitlements ?? [];
  const music = saved.filter((item) => MUSIC_KINDS.has(item.kind));
  const playlists = saved.filter((item) => item.kind === 'playlist');
  const savedEvents = saved.filter((item) => item.kind === 'event');
  const otherSaved = saved.filter((item) => !MUSIC_KINDS.has(item.kind) && item.kind !== 'playlist' && item.kind !== 'event');
  const eventCount = savedEvents.length + tickets.length;
  const accessCount = purchases.length + entitlements.length;
  const total = saved.length + accessCount + tickets.length;
  const [filter, setFilter] = useState<LibraryFilter>('All');

  return (
    <View style={styles.screen}>
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <DiscoveryHeader />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text style={styles.kicker}>YOUR COLLECTION</Text>
        <Text style={styles.title}>Library</Text>
        <Text style={styles.subtitle}>Music, playlists, events and everything you have unlocked—kept together.</Text>
        <View style={styles.summaryRow}>
          <Summary value={music.length} label="MUSIC" />
          <Summary value={playlists.length} label="PLAYLISTS" />
          <Summary value={eventCount} label="EVENTS" />
          <Summary value={accessCount} label="ACCESS" />
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
          {(['All', 'Music', 'Playlists', 'Events', 'Access'] as const).map((label) => (
            <Pressable
              key={label}
              accessibilityRole="tab"
              accessibilityLabel={`${label} library`}
              accessibilityState={{ selected: filter === label }}
              onPress={() => setFilter(label)}
              style={[styles.filter, filter === label && styles.filterActive]}
            >
              <Text style={[styles.filterText, filter === label && styles.filterTextActive]}>{label}</Text>
            </Pressable>
          ))}
        </ScrollView>

        {library.isLoading ? <ActivityIndicator color={ORANGE} style={styles.loader} /> : null}
        {!library.isLoading && total === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="library-music" size={30} color={ORANGE} />
            <Text style={styles.emptyTitle}>Build a library that brings you back.</Text>
            <Text style={styles.emptyBody}>Save music, make a playlist, follow an event or unlock something directly from a creator.</Text>
            <View style={styles.emptyActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Start discovering" onPress={() => router.push('/discover' as any)} style={styles.discoverButton}><Text style={styles.discoverButtonText}>Start discovering</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Create a playlist" onPress={() => router.push('/playlists/new' as any)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Create playlist</Text></Pressable>
            </View>
          </View>
        ) : null}

        {(filter === 'All' || filter === 'Music') && music.length ? <Section title="Saved music" count={music.length} /> : null}
        {(filter === 'All' || filter === 'Music') ? music.map((item, index) => <LibraryRow key={`${item.source}-${item.id}`} index={index + 1} title={item.title} subtitle={item.subtitle} image={item.imageUrl} meta={item.kind.replace('_', ' ')} onPress={() => router.push(item.route as any)} />) : null}

        {(filter === 'All' || filter === 'Playlists') ? (
          <View style={styles.playlistHeader}>
            <View style={styles.playlistHeading}>
              <Text style={styles.sectionTitle}>Playlists</Text>
              <Text style={styles.sectionCount}>{String(playlists.length).padStart(2, '0')}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Create a new playlist" onPress={() => router.push('/playlists/new' as any)} style={styles.sectionAction}>
              <MaterialIcons name="add" size={18} color={ORANGE} />
              <Text style={styles.sectionActionText}>New playlist</Text>
            </Pressable>
          </View>
        ) : null}
        {(filter === 'All' || filter === 'Playlists') ? playlists.map((item, index) => <LibraryRow key={`${item.source}-${item.id}`} index={index + 1} title={item.title} subtitle={item.subtitle} image={item.imageUrl} meta="playlist" onPress={() => router.push(item.route as any)} />) : null}

        {(filter === 'All' || filter === 'Events') && eventCount ? <Section title="Events & tickets" count={eventCount} /> : null}
        {(filter === 'All' || filter === 'Events') ? savedEvents.map((item, index) => <LibraryRow key={`${item.source}-${item.id}`} index={index + 1} title={item.title} subtitle={item.subtitle} image={item.imageUrl} meta="saved event" onPress={() => router.push(item.route as any)} />) : null}
        {(filter === 'All' || filter === 'Events') ? tickets.map((ticket, index) => <LibraryRow key={`${ticket.source}-${ticket.id}`} index={savedEvents.length + index + 1} title={ticket.event_title} subtitle={ticket.venue || ticket.status} image={ticket.event_image_url} meta="ticket" onPress={() => router.push(`/events/${ticket.event_id}` as any)} />) : null}

        {(filter === 'All' || filter === 'Access') ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open purchases and access" onPress={() => router.push('/purchases' as any)} style={styles.accessGateway}>
            <View style={styles.accessIcon}><MaterialIcons name="verified-user" size={23} color={ORANGE} /></View>
            <View style={styles.accessCopy}>
              <Text style={styles.accessKicker}>ACCESS & PURCHASES</Text>
              <Text style={styles.accessTitle}>{accessCount ? `${accessCount} verified item${accessCount === 1 ? '' : 's'}` : 'Your ownership vault'}</Text>
              <Text style={styles.accessBody}>Unlocks, licences, memberships, orders, downloads and receipts.</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color={INK} />
          </Pressable>
        ) : null}
        {(filter === 'All' || filter === 'Access') ? purchases.map((item, index) => <LibraryRow key={`${item.source}-${item.id}`} index={index + 1} title={item.title} subtitle={item.subtitle} image={item.imageUrl} meta={item.kind.replace('_', ' ')} onPress={() => router.push(item.route as any)} />) : null}

        {filter === 'All' && otherSaved.length ? <Section title="Saved from your scene" count={otherSaved.length} /> : null}
        {filter === 'All' ? otherSaved.map((item, index) => <LibraryRow key={`${item.source}-${item.id}`} index={index + 1} title={item.title} subtitle={item.subtitle} image={item.imageUrl} meta={item.kind.replace('_', ' ')} onPress={() => router.push(item.route as any)} />) : null}
      </ScrollView>
    </View>
  );
}

function Summary({ value, label }: { value: number; label: string }) {
  return <View style={styles.summaryItem}><Text style={styles.summaryNumber}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
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
  kicker: { color: ORANGE, fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1.7, marginTop: 6 },
  title: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 39, letterSpacing: -1.2, marginTop: 4 },
  subtitle: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 20, marginTop: 7 },
  summaryRow: { minHeight: 78, marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryItem: { flex: 1 },
  summaryNumber: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 20, textAlign: 'center' },
  summaryLabel: { color: MUTED, fontFamily: pluggdFonts.satoshiBold, fontSize: 8, letterSpacing: 1.1, marginTop: 3, textAlign: 'center' },
  filters: { flexDirection: 'row', gap: 22, marginTop: 16, paddingRight: 22, borderBottomWidth: 1, borderColor: '#29251F' },
  filter: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  filterActive: { borderColor: ORANGE },
  filterText: { color: '#CBC4B9', fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  filterTextActive: { color: INK },
  loader: { minHeight: 230 },
  empty: { marginTop: 24, minHeight: 240, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F', paddingHorizontal: 22 },
  emptyTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 18, textAlign: 'center', marginTop: 13 },
  emptyBody: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  emptyActions: { flexDirection: 'row', gap: 9, marginTop: 18 },
  discoverButton: { minHeight: 44, paddingHorizontal: 18, justifyContent: 'center', backgroundColor: ORANGE, borderRadius: 4 },
  discoverButtonText: { color: '#100B07', fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  secondaryButton: { minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', borderWidth: 1, borderColor: '#403830', borderRadius: 4 },
  secondaryButtonText: { color: INK, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  playlistHeader: { minHeight: 58, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderBottomWidth: 1, borderColor: '#29251F' },
  playlistHeading: { minHeight: 58, flexDirection: 'row', alignItems: 'flex-end', gap: 8, paddingBottom: 10 },
  sectionAction: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 4 },
  sectionActionText: { color: ORANGE, fontFamily: pluggdFonts.satoshiBold, fontSize: 11 },
  accessGateway: { minHeight: 112, marginTop: 22, marginBottom: 8, padding: 15, borderWidth: 1, borderColor: '#3D3128', borderRadius: 6, backgroundColor: '#171310', flexDirection: 'row', alignItems: 'center', gap: 12 },
  accessIcon: { width: 46, height: 46, borderRadius: 5, backgroundColor: '#24170F', alignItems: 'center', justifyContent: 'center' },
  accessCopy: { flex: 1, minWidth: 0 },
  accessKicker: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.2 },
  accessTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 17, marginTop: 4 },
  accessBody: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, lineHeight: 16, marginTop: 4 },
  section: { minHeight: 58, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', paddingBottom: 10, borderBottomWidth: 1, borderColor: '#29251F' },
  sectionTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 18 },
  sectionCount: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.1 },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderColor: '#29251F' },
  rowIndex: { width: 20, color: '#756E64', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9 },
  art: { width: 58, height: 58, borderRadius: 3, backgroundColor: '#211C17' },
  artFallback: { alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: INK, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  rowSubtitle: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, marginTop: 2 },
  rowMeta: { color: ORANGE, fontFamily: pluggdFonts.satoshiBold, fontSize: 9, letterSpacing: 1, marginTop: 4 },
});
