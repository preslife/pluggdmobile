import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useQuery } from '@tanstack/react-query';
import { ActivityIndicator, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useMemo, useState } from 'react';
import { PluggdImage } from '../src/components/PluggdImage';
import { pluggdFonts } from '../src/design/typography';
import { useBottomChromeInset } from '../src/design/useBottomChromeInset';
import { DiscoveryHeader } from '../src/features/discovery/DiscoveryHeader';
import { loadLibraryBundle } from '../src/features/culture/mobileServices';
import { DISCOVERY_DESTINATION_ART } from '../src/features/discovery/publicDestinations';
import { usePluggdTheme } from '../src/design/usePluggdTheme';

const INK = '#F7F2E9';
const MUTED = '#A69F95';
const ORANGE = '#FF6600';
type LibraryFilter = 'All' | 'Music' | 'Playlists' | 'Events' | 'Access';
const MUSIC_KINDS = new Set(['release', 'beat', 'mix', 'sample_pack', 'soundboard', 'video']);

type LibraryShelfEntry = {
  key: string;
  title: string;
  subtitle?: string | null;
  image?: string | null;
  meta: string;
  onPress: () => void;
};

function LibraryShelf({ title, entries }: { title: string; entries: LibraryShelfEntry[] }) {
  const styles = useLibraryStyles();
  if (!entries.length) return null;
  return (
    <View style={styles.shelf}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.sectionCount}>{String(entries.length).padStart(2, '0')}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={188} decelerationRate="fast" contentContainerStyle={styles.shelfRail}>
        {entries.map((entry) => (
          <Pressable key={entry.key} accessibilityRole="button" accessibilityLabel={`Open ${entry.title}`} onPress={entry.onPress} style={styles.shelfCard}>
            <View style={styles.shelfArtWrap}>
              {entry.image ? (
                <PluggdImage uri={entry.image} style={styles.shelfArt} displayWidth={420} />
              ) : (
                <LinearGradient colors={['#3A2012', '#16100C']} style={[styles.shelfArt, styles.artFallback]}>
                  <MaterialIcons name="music-note" size={28} color={ORANGE} />
                </LinearGradient>
              )}
              <View style={styles.shelfMetaPill}><Text style={styles.shelfMeta}>{entry.meta.toUpperCase()}</Text></View>
            </View>
            <Text style={styles.shelfTitle} numberOfLines={2}>{entry.title}</Text>
            <Text style={styles.shelfSubtitle} numberOfLines={1}>{entry.subtitle || entry.meta}</Text>
          </Pressable>
        ))}
      </ScrollView>
    </View>
  );
}

export default function LibraryScreen() {
  const theme = usePluggdTheme();
  const styles = useLibraryStyles();
  const router = useRouter();
  const bottomInset = useBottomChromeInset();
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
  const toShelfEntry = (item: (typeof saved)[number]): LibraryShelfEntry => ({
    key: `${item.source}-${item.id}`,
    title: item.title,
    subtitle: item.subtitle,
    image: item.imageUrl,
    meta: item.kind.replace('_', ' '),
    onPress: () => router.push(item.route as any),
  });
  const musicEntries = music.map(toShelfEntry);
  const playlistEntries = playlists.map(toShelfEntry);
  const eventEntries: LibraryShelfEntry[] = [
    ...savedEvents.map(toShelfEntry),
    ...tickets.map((ticket) => ({
      key: `${ticket.source}-${ticket.id}`,
      title: ticket.event_title,
      subtitle: ticket.venue || ticket.status,
      image: ticket.event_image_url,
      meta: 'ticket',
      onPress: () => router.push(`/events/${ticket.event_id}` as any),
    })),
  ];
  const purchaseEntries = purchases.map(toShelfEntry);
  const otherEntries = otherSaved.map(toShelfEntry);

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <DiscoveryHeader backToDiscovery />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <View style={styles.libraryHero}>
          <Image source={DISCOVERY_DESTINATION_ART.library} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
          <LinearGradient colors={['rgba(8,7,6,0.10)', 'rgba(8,7,6,0.98)']} style={StyleSheet.absoluteFillObject} />
          <View style={styles.libraryHeroCopy}>
            <Text style={styles.kicker}>YOUR COLLECTION</Text>
            <Text style={styles.heroTitle}>Keep the culture that keeps you coming back.</Text>
            <Text style={styles.heroBody}>Saved music, playlists, tickets and everything you have unlocked—one artwork-led home.</Text>
            <View style={styles.heroActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Continue discovering" onPress={() => router.push('/discover' as any)} style={styles.discoverButton}><Text style={styles.discoverButtonText}>Continue discovering</Text><MaterialIcons name="arrow-forward" size={17} color="#100B07" /></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Browse Market" onPress={() => router.push('/market' as any)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Browse Market</Text></Pressable>
            </View>
            <View style={styles.summaryRow}>
              <Summary value={music.length} label="MUSIC" />
              <Summary value={playlists.length} label="PLAYLISTS" />
              <Summary value={eventCount} label="EVENTS" />
              <Summary value={accessCount} label="ACCESS" />
            </View>
          </View>
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

        {library.isLoading ? <ActivityIndicator color={theme.colors.accentText} style={styles.loader} /> : null}
        {library.isError ? (
          <View style={styles.errorState}>
            <MaterialIcons name="cloud-off" size={31} color={theme.colors.accentText} />
            <Text style={styles.emptyTitle}>Your Library could not load.</Text>
            <Text style={styles.emptyBody}>Check your connection and try the collection again.</Text>
            <Pressable accessibilityRole="button" accessibilityLabel="Retry Library" onPress={() => void library.refetch()} style={styles.discoverButton}><Text style={styles.discoverButtonText}>Try again</Text></Pressable>
          </View>
        ) : null}
        {!library.isLoading && !library.isError && total === 0 ? (
          <View style={styles.empty}>
            <MaterialIcons name="library-music" size={30} color={theme.colors.accentText} />
            <Text style={styles.emptyTitle}>Build a library that brings you back.</Text>
            <Text style={styles.emptyBody}>Save music, make a playlist, follow an event or unlock something directly from a creator.</Text>
            <View style={styles.emptyActions}>
              <Pressable accessibilityRole="button" accessibilityLabel="Start discovering" onPress={() => router.push('/discover' as any)} style={styles.discoverButton}><Text style={styles.discoverButtonText}>Start discovering</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Create a playlist" onPress={() => router.push('/playlists/new' as any)} style={styles.secondaryButton}><Text style={styles.secondaryButtonText}>Create playlist</Text></Pressable>
            </View>
          </View>
        ) : null}

        {(filter === 'All' || filter === 'Music') ? <LibraryShelf title="Saved music" entries={musicEntries} /> : null}

        {(filter === 'All' || filter === 'Playlists') ? (
          <View style={styles.playlistHeader}>
            <View style={styles.playlistHeading}>
              <Text style={styles.sectionTitle}>Playlists</Text>
              <Text style={styles.sectionCount}>{String(playlists.length).padStart(2, '0')}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Create a new playlist" onPress={() => router.push('/playlists/new' as any)} style={styles.sectionAction}>
              <MaterialIcons name="add" size={18} color={theme.colors.accentText} />
              <Text style={styles.sectionActionText}>New playlist</Text>
            </Pressable>
          </View>
        ) : null}
        {(filter === 'All' || filter === 'Playlists') ? <LibraryShelf title="Your playlists" entries={playlistEntries} /> : null}

        {(filter === 'All' || filter === 'Events') ? <LibraryShelf title="Events & tickets" entries={eventEntries} /> : null}

        {(filter === 'All' || filter === 'Access') ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Open purchases and access" onPress={() => router.push('/purchases' as any)} style={styles.accessGateway}>
            <View style={styles.accessIcon}><MaterialIcons name="verified-user" size={23} color={theme.colors.accentText} /></View>
            <View style={styles.accessCopy}>
              <Text style={styles.accessKicker}>ACCESS & PURCHASES</Text>
              <Text style={styles.accessTitle}>{accessCount ? `${accessCount} verified item${accessCount === 1 ? '' : 's'}` : 'Your ownership vault'}</Text>
              <Text style={styles.accessBody}>Unlocks, licences, memberships, orders, downloads and receipts.</Text>
            </View>
            <MaterialIcons name="arrow-forward" size={20} color={theme.colors.text} />
          </Pressable>
        ) : null}
        {(filter === 'All' || filter === 'Access') ? <LibraryShelf title="Owned & unlocked" entries={purchaseEntries} /> : null}

        {filter === 'All' ? <LibraryShelf title="Saved from your scene" entries={otherEntries} /> : null}

        {(filter === 'All' || filter === 'Music') ? (
          <View style={styles.djBridge}>
            <View style={styles.djBridgeIcon}><MaterialIcons name="graphic-eq" size={26} color={theme.colors.accentText} /></View>
            <View style={styles.djBridgeCopy}>
              <Text style={styles.accessKicker}>PLUGGD DJ</Text>
              <Text style={styles.djBridgeTitle}>Take your owned sound to the decks.</Text>
              <Text style={styles.accessBody}>Releases, beats and sample packs you own stay connected to the PLUGGD DJ workflow.</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Open PLUGGD DJ" onPress={() => router.push('/dj' as any)} style={styles.djBridgeAction}><MaterialIcons name="arrow-forward" size={20} color="#100B07" /></Pressable>
          </View>
        ) : null}
      </ScrollView>
    </View>
  );
}

function Summary({ value, label }: { value: number; label: string }) {
  const styles = useLibraryStyles();
  return <View style={styles.summaryItem}><Text style={styles.summaryNumber}>{value}</Text><Text style={styles.summaryLabel}>{label}</Text></View>;
}

const baseStyles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0908' },
  content: { paddingHorizontal: 20, paddingBottom: 150 },
  libraryHero: { minHeight: 510, marginTop: 4, overflow: 'hidden', borderRadius: 12, justifyContent: 'flex-end' },
  libraryHeroCopy: { padding: 18 },
  kicker: { color: ORANGE, fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1.7, marginTop: 6 },
  heroTitle: { maxWidth: 330, color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 37, letterSpacing: -1.15, marginTop: 7 },
  heroBody: { maxWidth: 325, color: '#D0C7BD', fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19, marginTop: 8 },
  heroActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 },
  title: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 39, letterSpacing: -1.2, marginTop: 4 },
  subtitle: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 20, marginTop: 7 },
  summaryRow: { minHeight: 78, marginTop: 18, borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,255,255,0.25)', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  summaryItem: { flex: 1 },
  summaryNumber: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 20, textAlign: 'center' },
  summaryLabel: { color: MUTED, fontFamily: pluggdFonts.satoshiBold, fontSize: 8, letterSpacing: 1.1, marginTop: 3, textAlign: 'center' },
  filters: { flexDirection: 'row', gap: 22, marginTop: 16, paddingRight: 22, borderBottomWidth: 1, borderColor: '#29251F' },
  filter: { minHeight: 48, justifyContent: 'center', borderBottomWidth: 2, borderColor: 'transparent' },
  filterActive: { borderColor: ORANGE },
  filterText: { color: '#CBC4B9', fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  filterTextActive: { color: INK },
  loader: { minHeight: 230 },
  errorState: { marginTop: 24, minHeight: 250, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#352C25', borderRadius: 10, backgroundColor: '#14110E', paddingHorizontal: 22 },
  empty: { marginTop: 24, minHeight: 240, alignItems: 'center', justifyContent: 'center', borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#29251F', paddingHorizontal: 22 },
  emptyTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 18, textAlign: 'center', marginTop: 13 },
  emptyBody: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 7 },
  emptyActions: { flexDirection: 'row', gap: 9, marginTop: 18 },
  discoverButton: { minHeight: 44, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, backgroundColor: ORANGE, borderRadius: 22 },
  discoverButtonText: { color: '#100B07', fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  secondaryButton: { minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#67594D', borderRadius: 22, backgroundColor: 'rgba(8,7,6,0.48)' },
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
  shelf: { gap: 12, marginTop: 10 },
  shelfRail: { gap: 12, paddingRight: 20 },
  shelfCard: { width: 176 },
  shelfArtWrap: { width: 176, height: 176, overflow: 'hidden', borderRadius: 8, backgroundColor: '#211C17' },
  shelfArt: { width: '100%', height: '100%' },
  shelfMetaPill: { position: 'absolute', left: 9, bottom: 9, minHeight: 25, borderRadius: 13, backgroundColor: 'rgba(8,7,6,0.82)', paddingHorizontal: 8, alignItems: 'center', justifyContent: 'center' },
  shelfMeta: { color: '#FFC094', fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 0.9 },
  shelfTitle: { minHeight: 40, color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 16, lineHeight: 19, marginTop: 7 },
  shelfSubtitle: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, marginTop: 2 },
  djBridge: { minHeight: 154, marginTop: 28, paddingVertical: 18, borderTopWidth: 3, borderTopColor: ORANGE, borderBottomWidth: 1, borderBottomColor: '#392F27', flexDirection: 'row', alignItems: 'center', gap: 12 },
  djBridgeIcon: { width: 48, height: 48, borderRadius: 8, borderWidth: 1, borderColor: '#40352C', backgroundColor: '#19130F', alignItems: 'center', justifyContent: 'center' },
  djBridgeCopy: { flex: 1, minWidth: 0 },
  djBridgeTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 16.5, lineHeight: 20, marginTop: 4 },
  djBridgeAction: { width: 44, height: 44, borderRadius: 22, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  row: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 11, borderBottomWidth: 1, borderColor: '#29251F' },
  rowIndex: { width: 20, color: '#756E64', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9 },
  art: { width: 58, height: 58, borderRadius: 3, backgroundColor: '#211C17' },
  artFallback: { alignItems: 'center', justifyContent: 'center' },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: INK, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  rowSubtitle: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, marginTop: 2 },
  rowMeta: { color: ORANGE, fontFamily: pluggdFonts.satoshiBold, fontSize: 9, letterSpacing: 1, marginTop: 4 },
});

function useLibraryStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => ({
    ...baseStyles,
    screen: [baseStyles.screen, { backgroundColor: theme.colors.background }],
    filters: [baseStyles.filters, { borderColor: theme.colors.border }],
    filterActive: [baseStyles.filterActive, { borderColor: theme.colors.accentFill }],
    filterText: [baseStyles.filterText, { color: theme.colors.textSecondary }],
    filterTextActive: [baseStyles.filterTextActive, { color: theme.colors.text }],
    errorState: [baseStyles.errorState, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }],
    empty: [baseStyles.empty, { borderColor: theme.colors.border }],
    emptyTitle: [baseStyles.emptyTitle, { color: theme.colors.text }],
    emptyBody: [baseStyles.emptyBody, { color: theme.colors.textMuted }],
    discoverButton: [baseStyles.discoverButton, { backgroundColor: theme.colors.accentFill }],
    discoverButtonText: [baseStyles.discoverButtonText, { color: theme.colors.onAccent }],
    playlistHeader: [baseStyles.playlistHeader, { borderColor: theme.colors.border }],
    sectionActionText: [baseStyles.sectionActionText, { color: theme.colors.accentText }],
    accessGateway: [baseStyles.accessGateway, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }],
    accessIcon: [baseStyles.accessIcon, { backgroundColor: theme.colors.accentSoft }],
    accessKicker: [baseStyles.accessKicker, { color: theme.colors.accentText }],
    accessTitle: [baseStyles.accessTitle, { color: theme.colors.text }],
    accessBody: [baseStyles.accessBody, { color: theme.colors.textMuted }],
    section: [baseStyles.section, { borderColor: theme.colors.border }],
    sectionTitle: [baseStyles.sectionTitle, { color: theme.colors.text }],
    sectionCount: [baseStyles.sectionCount, { color: theme.colors.accentText }],
    shelfArtWrap: [baseStyles.shelfArtWrap, { backgroundColor: theme.colors.artworkBase }],
    shelfTitle: [baseStyles.shelfTitle, { color: theme.colors.text }],
    shelfSubtitle: [baseStyles.shelfSubtitle, { color: theme.colors.textMuted }],
    djBridge: [baseStyles.djBridge, { borderTopColor: theme.colors.accentFill, borderBottomColor: theme.colors.border }],
    djBridgeIcon: [baseStyles.djBridgeIcon, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }],
    djBridgeTitle: [baseStyles.djBridgeTitle, { color: theme.colors.text }],
    djBridgeAction: [baseStyles.djBridgeAction, { backgroundColor: theme.colors.accentFill }],
    row: [baseStyles.row, { borderColor: theme.colors.border }],
    rowIndex: [baseStyles.rowIndex, { color: theme.colors.textSubtle }],
    art: [baseStyles.art, { backgroundColor: theme.colors.artworkBase }],
    rowTitle: [baseStyles.rowTitle, { color: theme.colors.text }],
    rowSubtitle: [baseStyles.rowSubtitle, { color: theme.colors.textMuted }],
    rowMeta: [baseStyles.rowMeta, { color: theme.colors.accentText }],
  }), [theme]);
}
