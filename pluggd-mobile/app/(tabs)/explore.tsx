/**
 * Explore / Search — Discovery screen for Pluggd.
 *
 * Route: /(tabs)/explore  (can also be accessed from Home search bar)
 *
 * Sections:
 *  1. Search bar with live results (artists, beats, releases)
 *  2. Browse by genre tags
 *  3. Featured / trending artists
 *  4. Recently added releases & beats
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  ActivityIndicator,
  FlatList,
  Keyboard,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../src/lib/supabase';
import { usePlayback, type PluggdTrack } from '../../src/context/PlaybackProvider';
import { SymbolIcon } from '../../components/SymbolIcon';

// ─── Types ───────────────────────────────────────────────────────────
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

type SearchTab = 'all' | 'artists' | 'beats' | 'releases';

// ─── Genre tags ──────────────────────────────────────────────────────
const GENRES = [
  'Hip Hop',
  'R&B',
  'Trap',
  'Drill',
  'Afrobeats',
  'Lo-fi',
  'Pop',
  'Dancehall',
  'Grime',
  'Soul',
  'Jazz',
  'Electronic',
];

export default function ExploreScreen() {
  const router = useRouter();
  const { playTrack } = usePlayback();
  const searchInputRef = useRef<TextInput>(null);

  const [query, setQuery] = useState('');
  const [activeTab, setActiveTab] = useState<SearchTab>('all');
  const [searching, setSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  // Search results
  const [artists, setArtists] = useState<ArtistResult[]>([]);
  const [beats, setBeats] = useState<BeatResult[]>([]);
  const [releases, setReleases] = useState<ReleaseResult[]>([]);

  // Browse data
  const [trendingArtists, setTrendingArtists] = useState<ArtistResult[]>([]);
  const [recentReleases, setRecentReleases] = useState<ReleaseResult[]>([]);
  const [recentBeats, setRecentBeats] = useState<BeatResult[]>([]);
  const [browseLoading, setBrowseLoading] = useState(true);

  // ── Load browse data on mount ──
  useEffect(() => {
    loadBrowseData();
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

  // ── Search with debounce ──
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleSearch = useCallback(
    (text: string) => {
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
    },
    []
  );

  const handleGenrePress = (genre: string) => {
    setQuery(genre);
    handleSearch(genre);
    setActiveTab('all');
  };

  const handlePlayRelease = (release: ReleaseResult) => {
    if (!release.audio_url) return;
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
    if (!beat.audio_url) return;
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

  // ── Filter results by active tab ──
  const showArtists = activeTab === 'all' || activeTab === 'artists';
  const showBeats = activeTab === 'all' || activeTab === 'beats';
  const showReleases = activeTab === 'all' || activeTab === 'releases';
  const totalResults = artists.length + beats.length + releases.length;

  return (
    <View className="flex-1 bg-background-dark">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* ── Search Header ── */}
      <View className="pt-14 px-4 pb-3 bg-background-dark/95 border-b border-white/5 z-10">
        <View className="flex-row items-center gap-3">
          <View className="flex-1 flex-row items-center bg-zinc-900 rounded-xl h-12 px-4 border border-white/10">
            <SymbolIcon name="search" className="text-primary text-xl" />
            <TextInput
              ref={searchInputRef}
              className="flex-1 ml-2 text-base text-white"
              placeholder="Search artists, beats, releases..."
              placeholderTextColor="#71717a"
              value={query}
              onChangeText={handleSearch}
              returnKeyType="search"
              autoCapitalize="none"
              autoCorrect={false}
            />
            {query.length > 0 && (
              <TouchableOpacity
                onPress={() => {
                  setQuery('');
                  setHasSearched(false);
                  setArtists([]);
                  setBeats([]);
                  setReleases([]);
                }}
              >
                <SymbolIcon name="close" className="text-zinc-500 text-xl" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Search tabs — only show when searching */}
        {hasSearched && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="mt-3"
            contentContainerStyle={{ gap: 8 }}
          >
            {(['all', 'artists', 'beats', 'releases'] as SearchTab[]).map((tab) => (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-full ${
                  activeTab === tab
                    ? 'bg-primary'
                    : 'bg-zinc-900 border border-white/10'
                }`}
              >
                <Text
                  className={`text-sm font-semibold capitalize ${
                    activeTab === tab ? 'text-white' : 'text-zinc-400'
                  }`}
                >
                  {tab}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 120 }}
        keyboardShouldPersistTaps="handled"
        onScrollBeginDrag={Keyboard.dismiss}
      >
        {/* ═══════════════════════════════════════════════════════════
            SEARCH RESULTS
        ═══════════════════════════════════════════════════════════ */}
        {hasSearched ? (
          <View className="px-4 pt-4">
            {searching && (
              <View className="items-center py-8">
                <ActivityIndicator size="small" color="#FF5200" />
              </View>
            )}

            {!searching && totalResults === 0 && (
              <View className="items-center py-16">
                <SymbolIcon name="search_off" className="text-zinc-700 text-5xl mb-3" />
                <Text className="text-zinc-500 text-base">
                  No results for "{query}"
                </Text>
                <Text className="text-zinc-600 text-sm mt-1">
                  Try a different search term
                </Text>
              </View>
            )}

            {/* Artists */}
            {showArtists && artists.length > 0 && (
              <View className="mb-6">
                <Text className="text-white font-bold text-lg mb-3">Artists</Text>
                <View className="gap-2">
                  {artists.map((artist) => (
                    <TouchableOpacity
                      key={artist.id}
                      onPress={() => router.push(`/membership/${artist.id}`)}
                      className="flex-row items-center gap-3 p-3 rounded-xl bg-zinc-900/50"
                    >
                      <View className="w-12 h-12 rounded-full overflow-hidden bg-zinc-800">
                        {artist.avatar_url ? (
                          <Image source={{ uri: artist.avatar_url }} className="w-full h-full" />
                        ) : (
                          <View className="w-full h-full items-center justify-center">
                            <SymbolIcon name="person" className="text-zinc-600" />
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <View className="flex-row items-center gap-1.5">
                          <Text className="text-white font-bold text-base">
                            {artist.display_name ?? artist.full_name ?? artist.username ?? 'Unknown'}
                          </Text>
                          {artist.is_verified && (
                            <SymbolIcon name="verified" className="text-primary text-sm" />
                          )}
                        </View>
                        <Text className="text-zinc-500 text-sm capitalize">
                          {artist.user_type ?? 'Artist'}
                          {artist.primary_genre ? ` · ${artist.primary_genre}` : ''}
                        </Text>
                      </View>
                      <SymbolIcon name="chevron_right" className="text-zinc-600" />
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Releases */}
            {showReleases && releases.length > 0 && (
              <View className="mb-6">
                <Text className="text-white font-bold text-lg mb-3">Releases</Text>
                <View className="gap-2">
                  {releases.map((release) => (
                    <TouchableOpacity
                      key={release.id}
                      onPress={() => handlePlayRelease(release)}
                      onLongPress={() => router.push(`/release/${release.id}`)}
                      className="flex-row items-center gap-3 p-3 rounded-xl bg-zinc-900/50"
                    >
                      <View className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800">
                        {release.cover_art_url ? (
                          <Image source={{ uri: release.cover_art_url }} className="w-full h-full" />
                        ) : (
                          <View className="w-full h-full items-center justify-center">
                            <SymbolIcon name="album" className="text-zinc-600" />
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-bold text-base" numberOfLines={1}>
                          {release.title ?? 'Untitled'}
                        </Text>
                        <Text className="text-zinc-500 text-sm" numberOfLines={1}>
                          {release.artist ?? 'Unknown'}
                          {release.genre ? ` · ${release.genre}` : ''}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handlePlayRelease(release)}
                        className="w-10 h-10 rounded-full bg-primary/10 items-center justify-center"
                      >
                        <SymbolIcon name="play_arrow" className="text-primary text-xl" />
                      </TouchableOpacity>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

            {/* Beats */}
            {showBeats && beats.length > 0 && (
              <View className="mb-6">
                <Text className="text-white font-bold text-lg mb-3">Beats</Text>
                <View className="gap-2">
                  {beats.map((beat) => (
                    <TouchableOpacity
                      key={beat.id}
                      onPress={() => handlePlayBeat(beat)}
                      className="flex-row items-center gap-3 p-3 rounded-xl bg-zinc-900/50"
                    >
                      <View className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800">
                        {beat.image_url ? (
                          <Image source={{ uri: beat.image_url }} className="w-full h-full" />
                        ) : (
                          <View className="w-full h-full items-center justify-center">
                            <SymbolIcon name="music_note" className="text-zinc-600" />
                          </View>
                        )}
                      </View>
                      <View className="flex-1">
                        <Text className="text-white font-bold text-base" numberOfLines={1}>
                          {beat.title ?? 'Untitled'}
                        </Text>
                        <Text className="text-zinc-500 text-sm" numberOfLines={1}>
                          {beat.producer_name ?? 'Unknown'}
                          {beat.bpm ? ` · ${beat.bpm} BPM` : ''}
                        </Text>
                      </View>
                      <View className="items-end gap-1">
                        {beat.price != null && (
                          <View className="bg-primary/10 px-2 py-0.5 rounded-md">
                            <Text className="text-primary font-bold text-sm">
                              ${beat.price}
                            </Text>
                          </View>
                        )}
                        <TouchableOpacity
                          onPress={() => handlePlayBeat(beat)}
                          className="w-8 h-8 rounded-full bg-zinc-800 items-center justify-center"
                        >
                          <SymbolIcon name="play_arrow" className="text-white text-lg" />
                        </TouchableOpacity>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}
          </View>
        ) : (
          /* ═══════════════════════════════════════════════════════════
              BROWSE MODE (no search active)
          ═══════════════════════════════════════════════════════════ */
          <>
            {/* Genre Tags */}
            <View className="pt-4">
              <Text className="text-white font-bold text-lg px-4 mb-3">Browse by Genre</Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }}
              >
                {GENRES.map((genre) => (
                  <TouchableOpacity
                    key={genre}
                    onPress={() => handleGenrePress(genre)}
                    className="px-5 py-2.5 rounded-full bg-zinc-900 border border-white/10"
                  >
                    <Text className="text-zinc-300 font-medium text-sm">{genre}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            {browseLoading ? (
              <View className="items-center py-20">
                <ActivityIndicator size="large" color="#FF5200" />
              </View>
            ) : (
              <>
                {/* Trending Artists */}
                {trendingArtists.length > 0 && (
                  <View className="mt-8">
                    <Text className="text-white font-bold text-lg px-4 mb-3">
                      Featured Artists
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 16 }}
                    >
                      {trendingArtists.map((artist) => (
                        <TouchableOpacity
                          key={artist.id}
                          onPress={() => router.push(`/membership/${artist.id}`)}
                          className="mr-4 w-[100px] items-center"
                        >
                          <View className="w-20 h-20 rounded-full overflow-hidden bg-zinc-800 mb-2 border-2 border-white/10">
                            {artist.avatar_url ? (
                              <Image
                                source={{ uri: artist.avatar_url }}
                                className="w-full h-full"
                              />
                            ) : (
                              <View className="w-full h-full items-center justify-center">
                                <SymbolIcon name="person" className="text-zinc-600 text-3xl" />
                              </View>
                            )}
                          </View>
                          <Text
                            className="text-white text-xs font-bold text-center"
                            numberOfLines={1}
                          >
                            {artist.display_name ?? artist.full_name ?? artist.username ?? 'Unknown'}
                          </Text>
                          <Text
                            className="text-zinc-500 text-[10px] capitalize text-center"
                            numberOfLines={1}
                          >
                            {artist.primary_genre ?? artist.user_type ?? 'Artist'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Recent Releases */}
                {recentReleases.length > 0 && (
                  <View className="mt-8">
                    <View className="flex-row items-center justify-between px-4 mb-3">
                      <Text className="text-white font-bold text-lg">New Releases</Text>
                      <Text className="text-primary text-sm font-semibold">See all</Text>
                    </View>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={{ paddingHorizontal: 16 }}
                    >
                      {recentReleases.map((release) => (
                        <TouchableOpacity
                          key={release.id}
                          onPress={() => handlePlayRelease(release)}
                          onLongPress={() => router.push(`/release/${release.id}`)}
                          className="mr-4 w-[140px]"
                        >
                          <View className="aspect-square rounded-2xl overflow-hidden bg-zinc-800 mb-2">
                            {release.cover_art_url ? (
                              <Image
                                source={{ uri: release.cover_art_url }}
                                className="w-full h-full"
                              />
                            ) : (
                              <View className="w-full h-full items-center justify-center">
                                <SymbolIcon name="album" className="text-zinc-700 text-4xl" />
                              </View>
                            )}
                          </View>
                          <Text
                            className="text-white font-bold text-sm"
                            numberOfLines={1}
                          >
                            {release.title ?? 'Untitled'}
                          </Text>
                          <Text
                            className="text-zinc-500 text-xs"
                            numberOfLines={1}
                          >
                            {release.artist ?? 'Unknown'}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}

                {/* Recent Beats */}
                {recentBeats.length > 0 && (
                  <View className="mt-8 px-4">
                    <View className="flex-row items-center justify-between mb-3">
                      <Text className="text-white font-bold text-lg">Fresh Beats</Text>
                      <TouchableOpacity onPress={() => router.push('/(tabs)/marketplace')}>
                        <Text className="text-primary text-sm font-semibold">Marketplace</Text>
                      </TouchableOpacity>
                    </View>
                    <View className="gap-2">
                      {recentBeats.slice(0, 5).map((beat) => (
                        <TouchableOpacity
                          key={beat.id}
                          onPress={() => handlePlayBeat(beat)}
                          className="flex-row items-center gap-3 p-3 rounded-xl bg-zinc-900/50 border border-white/5"
                        >
                          <View className="w-12 h-12 rounded-lg overflow-hidden bg-zinc-800">
                            {beat.image_url ? (
                              <Image
                                source={{ uri: beat.image_url }}
                                className="w-full h-full"
                              />
                            ) : (
                              <View className="w-full h-full items-center justify-center">
                                <SymbolIcon name="music_note" className="text-zinc-600" />
                              </View>
                            )}
                          </View>
                          <View className="flex-1">
                            <Text className="text-white font-bold text-sm" numberOfLines={1}>
                              {beat.title ?? 'Untitled'}
                            </Text>
                            <Text className="text-zinc-500 text-xs" numberOfLines={1}>
                              {beat.producer_name ?? 'Unknown'}
                              {beat.bpm ? ` · ${beat.bpm} BPM` : ''}
                            </Text>
                          </View>
                          {beat.price != null && (
                            <View className="bg-primary/10 px-2 py-0.5 rounded-md">
                              <Text className="text-primary font-bold text-xs">
                                ${beat.price}
                              </Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                )}

                {/* Empty browse state */}
                {trendingArtists.length === 0 &&
                  recentReleases.length === 0 &&
                  recentBeats.length === 0 && (
                    <View className="items-center py-20 px-6">
                      <SymbolIcon name="explore" className="text-zinc-700 text-6xl mb-4" />
                      <Text className="text-white text-lg font-bold mb-2">
                        Start exploring
                      </Text>
                      <Text className="text-zinc-500 text-center text-sm">
                        Search for your favourite artists, discover new beats, and find
                        fresh releases.
                      </Text>
                    </View>
                  )}
              </>
            )}
          </>
        )}
      </ScrollView>
    </View>
  );
}
