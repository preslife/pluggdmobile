import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import {
  ContextRail,
  EmptyState,
  ListCard,
  PosterCard,
  ScreenShell,
  SectionTitle,
} from '../../components/ContentUI';
import { PluggdGlassSurface, PluggdSurface } from '../../components/PluggdPrimitives';
import { usePlayback, type PluggdTrack } from '../../src/context/PlaybackProvider';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { PLUGGD_ORANGE, formatGBP } from '../../src/lib/mobileContent';
import { supabase } from '../../src/lib/supabase';

interface ArtistResult {
  id: string;
  display_name: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  user_type: string | null;
  is_verified: boolean;
  primary_genre: string | null;
}

interface BeatResult {
  id: string;
  title: string | null;
  producer_name: string | null;
  image_url: string | null;
  audio_url: string | null;
  bpm: number | null;
  price: number | null;
  genre: string | null;
}

interface ReleaseResult {
  id: string;
  title: string | null;
  artist: string | null;
  cover_art_url: string | null;
  audio_url: string | null;
  genre: string | null;
}

type SearchTab = 'all' | 'creators' | 'beats' | 'music';
type DiscoverTab = 'All' | 'Music' | 'Mixes' | 'Creators' | 'Soundboards' | 'Trending' | 'New';

const DISCOVER_TABS: DiscoverTab[] = ['All', 'Music', 'Mixes', 'Creators', 'Soundboards', 'Trending', 'New'];
const SEARCH_TABS: SearchTab[] = ['all', 'creators', 'beats', 'music'];
const GENRES = ['Hip Hop', 'R&B', 'Trap', 'Drill', 'Afrobeats', 'Lo-fi', 'Pop', 'Dancehall', 'Grime', 'Soul', 'Jazz', 'Electronic'];
const ECOSYSTEM_CARDS = [
  ['Music', '/music', 'album', 'Singles, EPs, albums and tracks'],
  ['Market', '/market', 'storefront', 'Beats, samples, services and licenses'],
  ['Mixes', '/mixes', 'headphones', 'DJ sets, tracklists and curator rooms'],
  ['Events', '/events', 'event', 'Venues, promoters, tickets and RSVPs'],
  ['Community', '/community', 'forum', 'Feed, map, battles and collabs'],
  ['Soundboards', '/soundboards', 'dashboard-customize', 'Creator boards and audio ideas'],
] as const;

export default function ExploreScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const { playTrack } = usePlayback();
  const searchInputRef = useRef<TextInput>(null);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [discoverTab, setDiscoverTab] = useState<DiscoverTab>('All');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [artists, setArtists] = useState<ArtistResult[]>([]);
  const [beats, setBeats] = useState<BeatResult[]>([]);
  const [releases, setReleases] = useState<ReleaseResult[]>([]);
  const [trendingArtists, setTrendingArtists] = useState<ArtistResult[]>([]);
  const [recentReleases, setRecentReleases] = useState<ReleaseResult[]>([]);
  const [recentBeats, setRecentBeats] = useState<BeatResult[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);

  useEffect(() => {
    loadBrowseData();
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, []);

  const loadBrowseData = async () => {
    try {
      const [artistsRes, releasesRes, beatsRes] = await Promise.all([
        supabase
          .from('profiles')
          .select('id, display_name, full_name, username, avatar_url, user_type, is_verified, primary_genre')
          .in('user_type', ['artist', 'producer'])
          .eq('is_verified', true)
          .limit(12),
        supabase
          .from('releases')
          .select('id, title, artist, cover_art_url, audio_url, genre')
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('beats')
          .select('id, title, producer_name, image_url, audio_url, bpm, price, genre')
          .order('created_at', { ascending: false })
          .limit(10),
      ]);

      if (artistsRes.data) setTrendingArtists(artistsRes.data as any[]);
      if (releasesRes.data) setRecentReleases(releasesRes.data as any[]);
      if (beatsRes.data) setRecentBeats(beatsRes.data as any[]);
    } catch (err) {
      console.error('[Explore] browse data error:', err);
    } finally {
      setBrowseLoading(false);
    }
  };

  const handleSearch = useCallback((text: string) => {
    setQuery(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);

    if (!text.trim()) {
      setHasSearched(false);
      setArtists([]);
      setBeats([]);
      setReleases([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      setHasSearched(true);
      const searchTerm = `%${text.trim()}%`;

      try {
        const [artistsRes, beatsRes, releasesRes] = await Promise.all([
          supabase
            .from('profiles')
            .select('id, display_name, full_name, username, avatar_url, user_type, is_verified, primary_genre')
            .or(`display_name.ilike.${searchTerm},full_name.ilike.${searchTerm},username.ilike.${searchTerm}`)
            .limit(10),
          supabase
            .from('beats')
            .select('id, title, producer_name, image_url, audio_url, bpm, price, genre')
            .or(`title.ilike.${searchTerm},producer_name.ilike.${searchTerm}`)
            .limit(10),
          supabase
            .from('releases')
            .select('id, title, artist, cover_art_url, audio_url, genre')
            .or(`title.ilike.${searchTerm},artist.ilike.${searchTerm}`)
            .limit(10),
        ]);

        if (artistsRes.data) setArtists(artistsRes.data as any[]);
        if (beatsRes.data) setBeats(beatsRes.data as any[]);
        if (releasesRes.data) setReleases(releasesRes.data as any[]);
      } catch (err) {
        console.error('[Explore] search error:', err);
      } finally {
        setSearching(false);
      }
    }, 350);
  }, []);

  const handleGenrePress = (genre: string) => {
    setActiveTab('all');
    setDiscoverTab('All');
    handleSearch(genre);
  };

  const handlePlayRelease = (release: ReleaseResult) => {
    if (!release.audio_url) {
      router.push(`/release/${release.id}` as any);
      return;
    }
    const track: PluggdTrack = {
      id: release.id,
      url: release.audio_url,
      title: release.title || 'Untitled',
      artist: release.artist || 'Unknown',
      artwork: release.cover_art_url || undefined,
      releaseId: release.id,
      type: 'release',
    };
    playTrack(track);
  };

  const handlePlayBeat = (beat: BeatResult) => {
    if (!beat.audio_url) {
      router.push(`/beat/${beat.id}` as any);
      return;
    }
    const track: PluggdTrack = {
      id: beat.id,
      url: beat.audio_url,
      title: beat.title || 'Untitled',
      artist: beat.producer_name || 'Unknown',
      artwork: beat.image_url || undefined,
      beatId: beat.id,
      type: 'beat',
    };
    playTrack(track);
  };

  const showArtists = activeTab === 'all' || activeTab === 'creators';
  const showBeats = activeTab === 'all' || activeTab === 'beats';
  const showReleases = activeTab === 'all' || activeTab === 'music';
  const totalResults = artists.length + beats.length + releases.length;

  return (
    <ScreenShell
      title="Discover"
      subtitle="Search and browse music, mixes, creators, soundboards and market activity."
    >
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />

      <PluggdGlassSurface
        interactive
        glassEffectStyle="regular"
        borderColor={theme.colors.border}
        fallbackColor={theme.colors.glassFallback}
        style={styles.searchWrap}
      >
        <MaterialIcons name="search" size={21} color={theme.colors.accent} />
        <TextInput
          ref={searchInputRef}
          value={query}
          onChangeText={handleSearch}
          placeholder="Search music, beats, mixes, events, creators"
          placeholderTextColor={theme.colors.textSubtle}
          returnKeyType="search"
          autoCapitalize="none"
          autoCorrect={false}
          onSubmitEditing={Keyboard.dismiss}
          style={[styles.searchInput, { color: theme.colors.text }]}
        />
        {query.length > 0 ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear search"
            onPress={() => {
              setQuery('');
              setHasSearched(false);
              setArtists([]);
              setBeats([]);
              setReleases([]);
            }}
          >
            <MaterialIcons name="close" size={20} color={theme.colors.textMuted} />
          </Pressable>
        ) : null}
      </PluggdGlassSurface>

      <ContextRail
        tabs={DISCOVER_TABS}
        active={discoverTab}
        onChange={(tab) => {
          const selected = tab as DiscoverTab;
          setDiscoverTab(selected);
          if (selected === 'Music') setActiveTab('music');
          if (selected === 'Creators') setActiveTab('creators');
        }}
      />

      {hasSearched ? (
        <ContextRail
          tabs={SEARCH_TABS.map((tab) => (tab === 'creators' ? 'Creators' : tab === 'music' ? 'Music' : tab === 'all' ? 'All' : 'Beats'))}
          active={activeTab === 'all' ? 'All' : activeTab === 'creators' ? 'Creators' : activeTab === 'music' ? 'Music' : 'Beats'}
          onChange={(tab) => setActiveTab(tab === 'Creators' ? 'creators' : tab === 'Music' ? 'music' : tab === 'Beats' ? 'beats' : 'all')}
        />
      ) : null}

      {hasSearched ? (
        <>
          {searching ? (
            <View style={styles.loading}>
              <ActivityIndicator color={PLUGGD_ORANGE} />
            </View>
          ) : null}

          {!searching && totalResults === 0 ? (
            <EmptyState title={`No results for "${query}"`} body="Try another spelling, genre, creator name or scene." />
          ) : null}

          {!searching && showArtists && artists.length > 0 ? (
            <>
              <SectionTitle title="Creators" />
              {artists.map((artist) => (
                <CreatorRow key={artist.id} artist={artist} onPress={() => router.push(`/membership/${artist.id}` as any)} />
              ))}
            </>
          ) : null}

          {!searching && showReleases && releases.length > 0 ? (
            <>
              <SectionTitle title="Music" />
              {releases.map((release) => (
                <ListCard
                  key={release.id}
                  title={release.title ?? 'Untitled'}
                  subtitle={`${release.artist ?? 'Unknown'}${release.genre ? ` · ${release.genre}` : ''}`}
                  imageUrl={release.cover_art_url}
                  onPress={() => router.push(`/release/${release.id}` as any)}
                  onPlay={() => handlePlayRelease(release)}
                />
              ))}
            </>
          ) : null}

          {!searching && showBeats && beats.length > 0 ? (
            <>
              <SectionTitle title="Beats" />
              {beats.map((beat) => (
                <ListCard
                  key={beat.id}
                  title={beat.title ?? 'Untitled'}
                  subtitle={`${beat.producer_name ?? 'Unknown'}${beat.bpm ? ` · ${beat.bpm} BPM` : ''}`}
                  meta={beat.price != null ? formatGBP(beat.price) : undefined}
                  imageUrl={beat.image_url}
                  onPress={() => router.push(`/beat/${beat.id}` as any)}
                  onPlay={() => handlePlayBeat(beat)}
                />
              ))}
            </>
          ) : null}
        </>
      ) : (
        <>
          <SectionTitle title="Explore Pluggd" />
          <View style={styles.ecosystemGrid}>
            {ECOSYSTEM_CARDS.map(([label, route, icon, body]) => (
              <Pressable key={label} style={styles.ecosystemPressable} onPress={() => router.push(route as any)}>
                <PluggdSurface style={styles.ecosystemCard}>
                  <View style={[styles.ecosystemIcon, { backgroundColor: theme.colors.surfaceStrong }]}>
                    <MaterialIcons name={icon as any} size={22} color={theme.colors.accent} />
                  </View>
                  <Text style={[styles.ecosystemTitle, { color: theme.colors.text }]}>{label}</Text>
                  <Text style={[styles.ecosystemBody, { color: theme.colors.textMuted }]} numberOfLines={2}>
                    {body}
                  </Text>
                </PluggdSurface>
              </Pressable>
            ))}
          </View>

          <SectionTitle title="Browse by genre" />
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.genreRail}>
            {GENRES.map((genre) => (
              <Pressable key={genre} onPress={() => handleGenrePress(genre)}>
                <PluggdGlassSurface interactive glassEffectStyle="clear" style={styles.genreChip}>
                  <Text style={[styles.genreText, { color: theme.colors.textMuted }]}>{genre}</Text>
                </PluggdGlassSurface>
              </Pressable>
            ))}
          </ScrollView>

          {browseLoading ? (
            <View style={styles.loading}>
              <ActivityIndicator color={PLUGGD_ORANGE} />
            </View>
          ) : (
            <>
              {['All', 'Creators', 'Trending'].includes(discoverTab) && trendingArtists.length > 0 ? (
                <>
                  <SectionTitle title="Featured creators" />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.creatorRail}>
                    {trendingArtists.map((artist) => (
                      <CreatorAvatar key={artist.id} artist={artist} onPress={() => router.push(`/membership/${artist.id}` as any)} />
                    ))}
                  </ScrollView>
                </>
              ) : null}

              {['All', 'Music', 'New'].includes(discoverTab) && recentReleases.length > 0 ? (
                <>
                  <SectionTitle title="New music" actionLabel="See all" onAction={() => router.push('/music' as any)} />
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.posterRail}>
                    {recentReleases.map((release) => (
                      <PosterCard
                        key={release.id}
                        title={release.title ?? 'Untitled'}
                        subtitle={release.artist ?? 'Unknown'}
                        imageUrl={release.cover_art_url}
                        onPress={() => router.push(`/release/${release.id}` as any)}
                        onPlay={() => handlePlayRelease(release)}
                      />
                    ))}
                  </ScrollView>
                </>
              ) : null}

              {['All', 'Trending'].includes(discoverTab) && recentBeats.length > 0 ? (
                <>
                  <SectionTitle title="Fresh beats" actionLabel="Market" onAction={() => router.push('/market' as any)} />
                  {recentBeats.slice(0, 5).map((beat) => (
                    <ListCard
                      key={beat.id}
                      title={beat.title ?? 'Untitled'}
                      subtitle={`${beat.producer_name ?? 'Unknown'}${beat.bpm ? ` · ${beat.bpm} BPM` : ''}`}
                      meta={beat.price != null ? formatGBP(beat.price) : undefined}
                      imageUrl={beat.image_url}
                      onPress={() => router.push(`/beat/${beat.id}` as any)}
                      onPlay={() => handlePlayBeat(beat)}
                    />
                  ))}
                </>
              ) : null}

              {trendingArtists.length === 0 && recentReleases.length === 0 && recentBeats.length === 0 ? (
                <EmptyState title="Start exploring" body="Search creators, music, beats and scenes to shape your Pluggd experience." />
              ) : null}
            </>
          )}
        </>
      )}
    </ScreenShell>
  );
}

function CreatorRow({ artist, onPress }: { artist: ArtistResult; onPress: () => void }) {
  const theme = usePluggdTheme();
  return (
    <Pressable
      style={[
        styles.creatorRow,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.creatorThumb, { backgroundColor: theme.colors.surfaceAlt }]}>
        {artist.avatar_url ? <Image source={{ uri: artist.avatar_url }} style={styles.imageFill} /> : <MaterialIcons name="person" size={22} color={theme.colors.textSubtle} />}
      </View>
      <View style={styles.creatorInfo}>
        <View style={styles.creatorNameRow}>
          <Text style={[styles.creatorName, { color: theme.colors.text }]} numberOfLines={1}>
            {artist.display_name ?? artist.full_name ?? artist.username ?? 'Unknown'}
          </Text>
          {artist.is_verified ? <MaterialIcons name="verified" size={16} color={theme.colors.accent} /> : null}
        </View>
        <Text style={[styles.creatorMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
          {artist.user_type ?? 'Artist'}{artist.primary_genre ? ` · ${artist.primary_genre}` : ''}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={theme.colors.textSubtle} />
    </Pressable>
  );
}

function CreatorAvatar({ artist, onPress }: { artist: ArtistResult; onPress: () => void }) {
  const theme = usePluggdTheme();
  return (
    <Pressable style={styles.creatorAvatarItem} onPress={onPress}>
      <View style={[styles.creatorAvatar, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.borderAccent }]}>
        {artist.avatar_url ? <Image source={{ uri: artist.avatar_url }} style={styles.imageFill} /> : <MaterialIcons name="person" size={30} color={theme.colors.textSubtle} />}
      </View>
      <Text style={[styles.creatorAvatarName, { color: theme.colors.text }]} numberOfLines={1}>
        {artist.display_name ?? artist.full_name ?? artist.username ?? 'Unknown'}
      </Text>
      <Text style={[styles.creatorAvatarMeta, { color: theme.colors.textMuted }]} numberOfLines={1}>
        {artist.primary_genre ?? artist.user_type ?? 'Artist'}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  searchWrap: {
    minHeight: 48,
    borderRadius: 8,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    paddingVertical: 0,
  },
  loading: {
    minHeight: 140,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ecosystemGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 20,
  },
  ecosystemPressable: {
    width: '48.4%',
  },
  ecosystemCard: {
    minHeight: 108,
    padding: 12,
    justifyContent: 'space-between',
  },
  ecosystemIcon: {
    width: 38,
    height: 38,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ecosystemTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginTop: 10,
  },
  ecosystemBody: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '600',
    marginTop: 4,
  },
  genreRail: {
    gap: 8,
    paddingRight: 8,
    marginBottom: 22,
  },
  genreChip: {
    minHeight: 40,
    borderRadius: 999,
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  genreText: {
    fontSize: 14,
    fontWeight: '700',
  },
  creatorRail: {
    gap: 15,
    paddingRight: 10,
    marginBottom: 22,
  },
  creatorAvatarItem: {
    width: 92,
    alignItems: 'center',
  },
  creatorAvatar: {
    width: 74,
    height: 74,
    borderRadius: 37,
    borderWidth: 1.5,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  creatorAvatarName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  creatorAvatarMeta: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    marginTop: 2,
  },
  posterRail: {
    paddingBottom: 20,
  },
  creatorRow: {
    minHeight: 74,
    borderRadius: 8,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  creatorThumb: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  creatorInfo: {
    flex: 1,
    minWidth: 0,
  },
  creatorNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  creatorName: {
    flexShrink: 1,
    fontSize: 16,
    fontWeight: '700',
  },
  creatorMeta: {
    fontSize: 12,
    fontWeight: '700',
    marginTop: 4,
    textTransform: 'capitalize',
  },
  imageFill: {
    width: '100%',
    height: '100%',
  },
});
