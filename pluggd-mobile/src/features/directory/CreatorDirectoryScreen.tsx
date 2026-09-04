import { MaterialIcons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text as NativeText,
  type TextInputProps,
  TextInput as NativeTextInput,
  type TextProps,
  useWindowDimensions,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { useAuth } from '../../context/AuthProvider';
import { selectionHaptic } from '../../design/haptics';
import { pluggdFonts } from '../../design/typography';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { formatCompact } from '../../lib/mobileContent';
import { toggleProfileFollow } from '../culture/mobileServices';
import {
  loadCreatorDirectory,
  type CreatorDirectoryEntry,
  type CreatorDirectoryTab,
} from './creatorDirectoryService';
import { DiscoveryReturnBar } from '../discovery/DiscoveryReturnBar';
import { DISCOVERY_DESTINATION_ART } from '../discovery/publicDestinations';

const DIRECTORY_KEY = ['creator-directory', 'public-identities-v3'] as const;
const ORANGE = '#FF6600';
const INK = '#FFF8EE';
const MUTED = '#AAA197';
const DIRECTORY_MAX_FONT_MULTIPLIER = 1.25;
const TABS: Array<{ id: CreatorDirectoryTab; label: string }> = [
  { id: 'creator', label: 'PLUGGD Creators' },
  { id: 'artist', label: 'Artists' },
  { id: 'industry', label: 'Industry' },
];

function Text(props: TextProps) {
  return <NativeText {...props} maxFontSizeMultiplier={DIRECTORY_MAX_FONT_MULTIPLIER} />;
}

function TextInput(props: TextInputProps) {
  return <NativeTextInput {...props} maxFontSizeMultiplier={DIRECTORY_MAX_FONT_MULTIPLIER} />;
}

function CreatorGalleryCard({
  creator,
  busy,
  currentUserId,
  onOpen,
  onFollow,
}: {
  creator: CreatorDirectoryEntry;
  busy: boolean;
  currentUserId?: string;
  onOpen: () => void;
  onFollow: () => void;
}) {
  const theme = usePluggdTheme();
  const location = [creator.city, creator.country].filter(Boolean).join(', ');
  const isSelf = currentUserId === creator.userId;
  const cover = creator.coverUrl || creator.avatarUrl;
  return (
    <View style={[styles.creatorGalleryCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${creator.displayName}, ${creator.role}`}
        onPress={onOpen}
        style={styles.creatorGalleryOpen}
      >
        <View style={styles.creatorCover}>
          {cover ? (
            <PluggdImage uri={cover} style={styles.creatorCoverImage} displayWidth={420} />
          ) : (
            <LinearGradient colors={['#5A2B15', '#17100C']} style={styles.creatorCoverImage}>
              <MaterialIcons name={creator.tab === 'industry' ? 'business-center' : 'graphic-eq'} size={34} color={theme.colors.accent} />
            </LinearGradient>
          )}
          <LinearGradient colors={['rgba(10,9,8,0.02)', 'rgba(10,9,8,0.92)']} style={StyleSheet.absoluteFillObject} />
          <View style={[styles.galleryAvatar, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.accent }]}>
            {creator.avatarUrl ? (
              <PluggdImage uri={creator.avatarUrl} style={styles.galleryAvatarImage} displayWidth={160} />
            ) : (
              <Text style={[styles.galleryInitials, { color: theme.colors.text }]}>{creator.displayName.slice(0, 2).toUpperCase()}</Text>
            )}
          </View>
          {creator.verified ? (
            <View style={[styles.galleryVerified, { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.surface }]}>
              <MaterialIcons name="verified" size={13} color={theme.colors.onAccent} />
            </View>
          ) : null}
        </View>
        <View style={styles.galleryCopy}>
          <Text style={[styles.galleryName, { color: theme.colors.text }]} numberOfLines={2}>{creator.displayName}</Text>
          {creator.username ? <Text style={[styles.galleryHandle, { color: theme.colors.textSecondary }]} numberOfLines={1}>@{creator.username}</Text> : null}
          <Text style={[styles.galleryRole, { color: theme.colors.accent }]} numberOfLines={1}>
            {[creator.role, creator.genre].filter(Boolean).join(' · ')}
          </Text>
          {creator.bio ? <Text style={[styles.galleryBio, { color: theme.colors.textMuted }]} numberOfLines={2}>{creator.bio}</Text> : <View style={styles.galleryBioSpacer} />}
          <View style={styles.galleryMetaRow}>
            {location ? <Text style={[styles.galleryMeta, { color: theme.colors.textSubtle }]} numberOfLines={1}>{location}</Text> : null}
            {creator.followerCount !== null ? <Text style={[styles.galleryMeta, { color: theme.colors.textSubtle }]}>{formatCompact(creator.followerCount)} followers</Text> : null}
          </View>
        </View>
      </Pressable>
      {isSelf ? (
        <View style={[styles.gallerySelfBadge, { borderColor: theme.colors.border }]}><Text style={[styles.selfBadgeText, { color: theme.colors.textMuted }]}>YOUR PROFILE</Text></View>
      ) : (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`${creator.following ? 'Unfollow' : 'Follow'} ${creator.displayName}`}
          accessibilityState={{ selected: creator.following, busy }}
          disabled={busy}
          onPress={onFollow}
          style={[
            styles.galleryFollowButton,
            { backgroundColor: theme.colors.accentFill },
            creator.following && styles.followButtonActive,
            creator.following && { borderColor: theme.colors.border },
            busy && styles.buttonBusy,
          ]}
        >
          {busy ? <ActivityIndicator size="small" color={creator.following ? theme.colors.text : theme.colors.onAccent} /> : (
            <Text style={[styles.followText, creator.following && styles.followTextActive, creator.following && { color: theme.colors.text }]}>{creator.following ? 'Following' : 'Follow'}</Text>
          )}
        </Pressable>
      )}
    </View>
  );
}

function FeaturedCreatorCard({ creator, width, onOpen }: { creator: CreatorDirectoryEntry; width: number; onOpen: () => void }) {
  const theme = usePluggdTheme();
  const art = creator.coverUrl || creator.avatarUrl;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open featured creator ${creator.displayName}`} onPress={onOpen} style={[styles.featuredCreatorCard, { width }]}>
      {art ? (
        <PluggdImage uri={art} style={StyleSheet.absoluteFillObject} displayWidth={640} />
      ) : (
        <LinearGradient colors={['#5A2B15', '#17100C']} style={StyleSheet.absoluteFillObject} />
      )}
      <LinearGradient colors={['rgba(8,7,6,0.05)', 'rgba(8,7,6,0.94)']} style={StyleSheet.absoluteFillObject} />
      <View style={styles.featuredCreatorCopy}>
        <Text style={styles.featuredCreatorKicker}>{creator.verified ? 'VERIFIED CREATOR' : creator.role.toUpperCase()}</Text>
        <Text style={styles.featuredCreatorName} numberOfLines={2}>{creator.displayName}</Text>
        <Text style={styles.featuredCreatorMeta} numberOfLines={1}>
          {[creator.username ? `@${creator.username}` : null, creator.genre, creator.city].filter(Boolean).join(' · ')}
        </Text>
        <View style={[styles.featuredCreatorAction, { backgroundColor: theme.colors.accentFill }]}><Text style={[styles.featuredCreatorActionText, { color: theme.colors.onAccent }]}>Open profile</Text><MaterialIcons name="north-east" size={16} color={theme.colors.onAccent} /></View>
      </View>
    </Pressable>
  );
}

export function CreatorDirectoryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const bottomInset = useBottomChromeInset();
  const theme = usePluggdTheme();
  const [tab, setTab] = useState<CreatorDirectoryTab>('creator');
  const [search, setSearch] = useState('');
  const [role, setRole] = useState('All types');
  const [country, setCountry] = useState('All countries');
  const [busyId, setBusyId] = useState<string | null>(null);
  const query = useQuery({ queryKey: DIRECTORY_KEY, queryFn: loadCreatorDirectory, staleTime: 1000 * 60 * 3 });

  const tabEntries = useMemo(() => (query.data ?? []).filter((creator) => creator.tab === tab), [query.data, tab]);
  const roles = useMemo(() => ['All types', ...Array.from(new Set(tabEntries.map((creator) => creator.role))).sort()], [tabEntries]);
  const countries = useMemo(() => ['All countries', ...Array.from(new Set(tabEntries.map((creator) => creator.country).filter(Boolean) as string[])).sort()], [tabEntries]);
  const visible = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('en-GB');
    return tabEntries.filter((creator) => {
      const roleMatches = role === 'All types' || creator.role === role;
      const countryMatches = country === 'All countries' || creator.country === country;
      const searchMatches = !needle || `${creator.displayName} ${creator.username || ''} ${creator.role} ${creator.genre || ''} ${creator.city || ''} ${creator.country || ''}`.toLocaleLowerCase('en-GB').includes(needle);
      return roleMatches && countryMatches && searchMatches;
    });
  }, [country, role, search, tabEntries]);
  const featuredCreators = useMemo(() => {
    const withArtwork = tabEntries.filter((creator) => creator.coverUrl || creator.avatarUrl);
    const withoutArtwork = tabEntries.filter((creator) => !creator.coverUrl && !creator.avatarUrl);
    return [...withArtwork, ...withoutArtwork].slice(0, 6);
  }, [tabEntries]);
  const directoryCounts = useMemo(() => {
    const entries = query.data ?? [];
    return {
      creators: entries.length,
      verified: entries.filter((entry) => entry.verified).length,
      places: new Set(entries.map((entry) => entry.city || entry.country).filter(Boolean)).size,
    };
  }, [query.data]);
  const featuredWidth = Math.min(298, Math.max(238, width - 108));

  const chooseTab = (next: CreatorDirectoryTab) => {
    selectionHaptic();
    setTab(next);
    setRole('All types');
    setCountry('All countries');
  };

  const follow = async (creator: CreatorDirectoryEntry) => {
    if (!user?.id) {
      router.push({ pathname: '/auth/login', params: { redirect: '/directory' } } as never);
      return;
    }
    setBusyId(creator.userId);
    const result = await toggleProfileFollow(creator.userId);
    if (!result.success) {
      Alert.alert('Could not update follow', result.error || 'Try again in a moment.');
      setBusyId(null);
      return;
    }
    queryClient.setQueryData<CreatorDirectoryEntry[]>(DIRECTORY_KEY, (current = []) => current.map((entry) =>
      entry.userId === creator.userId ? { ...entry, following: Boolean(result.saved) } : entry,
    ));
    setBusyId(null);
  };

  const header = (
    <View style={[styles.header, { paddingTop: Math.max(insets.top + 76, 96) }]}>
      <DiscoveryReturnBar style={styles.returnBar} />
      <View style={[styles.directoryHero, { minHeight: width < 400 ? 310 : 350 }]}>
        <Image source={DISCOVERY_DESTINATION_ART.creators} resizeMode="cover" style={StyleSheet.absoluteFillObject} />
        <LinearGradient colors={['rgba(8,7,6,0.18)', 'rgba(8,7,6,0.97)']} style={StyleSheet.absoluteFillObject} />
        <View style={styles.directoryHeroCopy}>
          <Text style={styles.heroEyebrow}>ECOSYSTEM DIRECTORY</Text>
          <Text style={styles.heroTitle}>Meet the people moving the next sound.</Text>
          <Text style={styles.heroBody}>Artists, producers, independent teams and music people shaping what comes next.</Text>
          <View style={styles.heroStats}>
            <View style={styles.heroStat}><Text style={styles.heroStatValue}>{query.isLoading ? '—' : directoryCounts.creators}</Text><Text style={styles.heroStatLabel}>PROFILES</Text></View>
            <View style={styles.heroStat}><Text style={styles.heroStatValue}>{query.isLoading ? '—' : directoryCounts.verified}</Text><Text style={styles.heroStatLabel}>VERIFIED</Text></View>
            <View style={styles.heroStat}><Text style={styles.heroStatValue}>{query.isLoading ? '—' : directoryCounts.places}</Text><Text style={styles.heroStatLabel}>PLACES</Text></View>
          </View>
        </View>
      </View>

      {featuredCreators.length ? (
        <View style={styles.featuredCreatorsSection}>
          <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>CREATORS TO KNOW NOW</Text>
          <Text style={[styles.featuredSectionTitle, { color: theme.colors.text }]}>Step into their worlds.</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} snapToInterval={featuredWidth + 12} decelerationRate="fast" contentContainerStyle={styles.featuredCreatorRail}>
            {featuredCreators.map((creator) => (
              <FeaturedCreatorCard key={creator.userId} creator={creator} width={featuredWidth} onOpen={() => { selectionHaptic(); router.push(creator.route as never); }} />
            ))}
          </ScrollView>
        </View>
      ) : null}

      <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>EXPLORE THE DIRECTORY</Text>
      <Text style={[styles.title, { color: theme.colors.text }]}>Find your next connection.</Text>
      <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Search by name, role, genre or place, then open the creator's complete public landing page.</Text>
      <View style={[styles.searchBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <MaterialIcons name="search" size={21} color={theme.colors.textMuted} />
        <TextInput
          accessibilityLabel="Search creators"
          value={search}
          onChangeText={setSearch}
          placeholder="Name, role, genre or place"
          placeholderTextColor={theme.colors.textMuted}
          autoCapitalize="none"
          returnKeyType="search"
          style={[styles.searchInput, { color: theme.colors.text }]}
        />
        {search ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Clear creator search" onPress={() => setSearch('')} style={styles.clearButton}>
            <MaterialIcons name="close" size={18} color={theme.colors.text} />
          </Pressable>
        ) : null}
      </View>
      <View style={[styles.tabs, { backgroundColor: theme.colors.surfaceAlt }]}>
        {TABS.map((item) => {
          const selected = tab === item.id;
          return (
            <Pressable
              key={item.id}
              accessible
              accessibilityRole="button"
              accessibilityLabel={`${item.label} tab`}
              accessibilityHint={`Show ${item.label} in the creator directory`}
              accessibilityState={{ selected }}
              onPress={() => chooseTab(item.id)}
              style={[styles.tab, selected && styles.tabActive, selected && { backgroundColor: theme.colors.accentFill }]}
            >
              <Text style={[styles.tabText, { color: theme.colors.textMuted }, selected && styles.tabTextActive, selected && { color: theme.colors.onAccent }]} numberOfLines={2}>{item.label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.filterLabel, { color: theme.colors.textSubtle }]}>TYPE</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {roles.map((item) => {
          const selected = role === item;
          return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { selectionHaptic(); setRole(item); }} style={[styles.filterChip, { borderColor: theme.colors.border }, selected && styles.filterChipActive, selected && { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceAlt }]}><Text style={[styles.filterChipText, { color: theme.colors.textMuted }, selected && styles.filterChipTextActive, selected && { color: theme.colors.accent }]}>{item}</Text></Pressable>;
        })}
      </ScrollView>
      <Text style={[styles.filterLabel, { color: theme.colors.textSubtle }]}>COUNTRY</Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
        {countries.map((item) => {
          const selected = country === item;
          return <Pressable key={item} accessibilityRole="button" accessibilityState={{ selected }} onPress={() => { selectionHaptic(); setCountry(item); }} style={[styles.filterChip, { borderColor: theme.colors.border }, selected && styles.filterChipActive, selected && { borderColor: theme.colors.accent, backgroundColor: theme.colors.surfaceAlt }]}><Text style={[styles.filterChipText, { color: theme.colors.textMuted }, selected && styles.filterChipTextActive, selected && { color: theme.colors.accent }]}>{item}</Text></Pressable>;
        })}
      </ScrollView>
      <View style={styles.resultLine}><Text style={[styles.resultCount, { color: theme.colors.accent }]}>{visible.length} {visible.length === 1 ? 'PROFILE' : 'PROFILES'}</Text><View style={[styles.resultRule, { backgroundColor: theme.colors.divider }]} /></View>
    </View>
  );

  const safeAreaMask = (
    <View
      pointerEvents="none"
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[styles.safeAreaMask, { height: insets.top, backgroundColor: theme.colors.background }]}
    />
  );

  if (query.isLoading) {
    return <View style={[styles.screen, { backgroundColor: theme.colors.background }]}><StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} /><Stack.Screen options={{ headerShown: false }} />{header}<View style={styles.center}><ActivityIndicator color={theme.colors.accent} size="large" /><Text style={[styles.loadingText, { color: theme.colors.textMuted }]}>Finding creators…</Text></View>{safeAreaMask}</View>;
  }

  if (query.isError) {
    return <View style={[styles.screen, { backgroundColor: theme.colors.background }]}><StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} /><Stack.Screen options={{ headerShown: false }} />{header}<View style={styles.center}><MaterialIcons name="cloud-off" size={36} color={theme.colors.accentText} /><Text style={[styles.emptyTitle, { color: theme.colors.text }]}>The directory could not load</Text><Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>Check your connection and try again.</Text><Pressable accessibilityRole="button" accessibilityLabel="Try loading the creator directory again" onPress={() => void query.refetch()} style={[styles.retry, { backgroundColor: theme.colors.accentFill }]}><Text style={[styles.retryText, { color: theme.colors.onAccent }]}>Try again</Text></Pressable></View>{safeAreaMask}</View>;
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <FlatList
        data={visible}
        keyExtractor={(item) => item.userId}
        ListHeaderComponent={header}
        contentContainerStyle={{ paddingBottom: bottomInset }}
        refreshControl={<RefreshControl tintColor={theme.colors.accent} refreshing={query.isFetching} onRefresh={() => void query.refetch()} />}
        renderItem={({ item }) => (
          <CreatorGalleryCard
            creator={item}
            busy={busyId === item.userId}
            currentUserId={user?.id}
            onOpen={() => { selectionHaptic(); router.push(item.route as never); }}
            onFollow={() => void follow(item)}
          />
        )}
        numColumns={2}
        columnWrapperStyle={styles.galleryRow}
        ItemSeparatorComponent={() => <View style={styles.gallerySeparator} />}
        ListEmptyComponent={<View style={styles.empty}><Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No matching creators</Text><Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>Try another tab, type, country or search term.</Text></View>}
      />
      {safeAreaMask}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0908' },
  safeAreaMask: { position: 'absolute', top: 0, left: 0, right: 0, zIndex: 90 },
  header: { paddingHorizontal: 20, paddingBottom: 10 },
  returnBar: { paddingHorizontal: 0, marginBottom: 12 },
  directoryHero: { overflow: 'hidden', borderRadius: 12, justifyContent: 'flex-end', marginBottom: 22 },
  directoryHeroCopy: { padding: 18, gap: 8 },
  heroEyebrow: { color: '#FFB07A', fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.7 },
  heroTitle: { maxWidth: 330, color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 37, letterSpacing: -1.15 },
  heroBody: { maxWidth: 325, color: '#D1C8BD', fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19 },
  heroStats: { flexDirection: 'row', marginTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.28)' },
  heroStat: { flex: 1, minHeight: 62, paddingTop: 10, borderRightWidth: StyleSheet.hairlineWidth, borderRightColor: 'rgba(255,255,255,0.22)' },
  heroStatValue: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 20 },
  heroStatLabel: { marginTop: 3, color: '#AFA69B', fontFamily: pluggdFonts.satoshiBlack, fontSize: 7.5, letterSpacing: 1.1 },
  featuredCreatorsSection: { gap: 8, marginBottom: 28 },
  featuredSectionTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 23, lineHeight: 27, letterSpacing: -0.55 },
  featuredCreatorRail: { gap: 12, paddingRight: 20, marginTop: 4 },
  featuredCreatorCard: { height: 286, overflow: 'hidden', borderRadius: 10, justifyContent: 'flex-end', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)' },
  featuredCreatorCopy: { padding: 15, gap: 4 },
  featuredCreatorKicker: { color: '#FF9B59', fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.3 },
  featuredCreatorName: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 25, lineHeight: 28, letterSpacing: -0.55 },
  featuredCreatorMeta: { color: '#D1C8BD', fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5 },
  featuredCreatorAction: { alignSelf: 'flex-start', minHeight: 40, marginTop: 8, borderRadius: 20, backgroundColor: ORANGE, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 5 },
  featuredCreatorActionText: { color: '#160B04', fontFamily: pluggdFonts.satoshiBlack, fontSize: 11.5 },
  eyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.8 },
  title: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 39, letterSpacing: -1.2, marginTop: 4 },
  subtitle: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 14, lineHeight: 21, maxWidth: 520, marginTop: 6 },
  searchBox: { minHeight: 50, marginTop: 18, borderRadius: 8, borderWidth: 1, borderColor: '#39322B', backgroundColor: '#12100E', flexDirection: 'row', alignItems: 'center', paddingLeft: 14 },
  searchInput: { flex: 1, minHeight: 48, color: INK, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, paddingHorizontal: 10 },
  clearButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  tabs: { flexDirection: 'row', marginTop: 14, padding: 4, gap: 4, borderRadius: 10, backgroundColor: '#171411' },
  tab: { flex: 1, minHeight: 46, borderRadius: 7, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 6 },
  tabActive: { backgroundColor: ORANGE },
  tabText: { color: MUTED, textAlign: 'center', fontFamily: pluggdFonts.satoshiBold, fontSize: 12, lineHeight: 15 },
  tabTextActive: { color: '#160B04' },
  filterLabel: { color: '#746D65', fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 1.5, marginTop: 14, marginBottom: 7 },
  filterRow: { gap: 7, paddingRight: 20 },
  filterChip: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: '#332D27', paddingHorizontal: 15, alignItems: 'center', justifyContent: 'center' },
  filterChipActive: { borderColor: ORANGE, backgroundColor: 'rgba(255,102,0,0.13)' },
  filterChipText: { color: MUTED, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  filterChipTextActive: { color: '#FF9B59' },
  resultLine: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 16 },
  resultCount: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.4 },
  resultRule: { flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: '#332D27' },
  galleryRow: { gap: 12, paddingHorizontal: 20 },
  gallerySeparator: { height: 12 },
  creatorGalleryCard: { flex: 1, maxWidth: '48.5%', minHeight: 394, overflow: 'hidden', borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: '#332D27', backgroundColor: '#12100E' },
  creatorGalleryOpen: { flex: 1 },
  creatorCover: { height: 154, overflow: 'hidden', backgroundColor: '#191512', justifyContent: 'flex-end' },
  creatorCoverImage: { width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center' },
  galleryAvatar: { position: 'absolute', left: 12, bottom: 10, width: 54, height: 54, borderRadius: 27, overflow: 'hidden', backgroundColor: '#241A13', borderWidth: 2, borderColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  galleryAvatarImage: { width: '100%', height: '100%' },
  galleryInitials: { color: INK, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  galleryVerified: { position: 'absolute', left: 53, bottom: 7, width: 22, height: 22, borderRadius: 11, backgroundColor: ORANGE, borderWidth: 2, borderColor: '#12100E', alignItems: 'center', justifyContent: 'center' },
  galleryCopy: { flex: 1, padding: 12, gap: 3 },
  galleryName: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 17, lineHeight: 20 },
  galleryHandle: { color: '#C7BEB4', fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5 },
  galleryRole: { color: '#FF9B59', fontFamily: pluggdFonts.satoshiBold, fontSize: 10, marginTop: 3 },
  galleryBio: { minHeight: 34, color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  galleryBioSpacer: { minHeight: 34 },
  galleryMetaRow: { gap: 3, marginTop: 3 },
  galleryMeta: { color: '#746D65', fontFamily: pluggdFonts.satoshiMedium, fontSize: 9.5 },
  galleryFollowButton: { minHeight: 44, margin: 10, marginTop: 0, borderRadius: 7, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center' },
  gallerySelfBadge: { minHeight: 44, margin: 10, marginTop: 0, borderRadius: 7, borderWidth: 1, borderColor: '#3A332D', alignItems: 'center', justifyContent: 'center' },
  creatorCard: { minHeight: 132, marginHorizontal: 20, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', gap: 12 },
  creatorMain: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 13 },
  avatarWrap: { width: 76, height: 76 },
  avatar: { width: 76, height: 76, borderRadius: 24, backgroundColor: '#191512' },
  avatarFallback: { width: 76, height: 76, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  verifiedBadge: { position: 'absolute', right: -2, bottom: -2, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: ORANGE, borderWidth: 3, borderColor: '#0A0908' },
  creatorCopy: { flex: 1, minWidth: 0 },
  creatorName: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 17, lineHeight: 21 },
  creatorRole: { color: '#FF9B59', fontFamily: pluggdFonts.satoshiBold, fontSize: 10.5, marginTop: 3 },
  creatorBio: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 11.5, lineHeight: 16, marginTop: 5 },
  creatorMetaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 5 },
  creatorMeta: { color: '#746D65', fontFamily: pluggdFonts.satoshiMedium, fontSize: 9.5 },
  followButton: { minWidth: 76, minHeight: 44, borderRadius: 8, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  followButtonActive: { backgroundColor: 'transparent', borderWidth: 1, borderColor: '#4A423B' },
  followText: { color: '#160B04', fontFamily: pluggdFonts.satoshiBlack, fontSize: 11.5 },
  followTextActive: { color: INK },
  buttonBusy: { opacity: 0.65 },
  selfBadge: { minWidth: 52, minHeight: 32, borderRadius: 6, borderWidth: 1, borderColor: '#3A332D', alignItems: 'center', justifyContent: 'center' },
  selfBadgeText: { color: MUTED, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.2 },
  divider: { height: StyleSheet.hairlineWidth, marginHorizontal: 20, backgroundColor: '#2A251F' },
  center: { flex: 1, minHeight: 280, paddingHorizontal: 30, alignItems: 'center', justifyContent: 'center' },
  loadingText: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, marginTop: 12 },
  empty: { minHeight: 230, marginHorizontal: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 24 },
  emptyTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 19, textAlign: 'center', marginTop: 12 },
  emptyBody: { color: MUTED, fontFamily: pluggdFonts.satoshiRegular, fontSize: 13, lineHeight: 19, textAlign: 'center', marginTop: 6 },
  retry: { minHeight: 48, marginTop: 18, borderRadius: 8, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 22 },
  retryText: { color: '#160B04', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
});
