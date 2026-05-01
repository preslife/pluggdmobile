
import { View, Text, ScrollView, Image, TouchableOpacity, Alert, Dimensions } from 'react-native';
import { useEffect, useState, useCallback } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../../src/lib/supabase';
import { Database } from '../../src/types/supabase';
import { usePlayback, type PluggdTrack } from '../../src/context/PlaybackProvider';
import { SymbolIcon } from '../../components/SymbolIcon';

type Beat = Database['public']['Tables']['beats']['Row'];

const GENRES = ['All', 'Trap', 'R&B', 'Lo-Fi', 'Drill', 'Afrobeat', 'Soul'];
const SORT_OPTIONS = ['Trending', 'Newest', 'Price: Low', 'Price: High'];

export default function Marketplace() {
  const [beats, setBeats] = useState<Beat[]>([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [savedBeats, setSavedBeats] = useState<Set<string>>(new Set());
  const [sortBy, setSortBy] = useState('Trending');
  const [showSearch, setShowSearch] = useState(false);
  const router = useRouter();
  const { playTrack, currentTrack, isPlaying, togglePlayPause } = usePlayback();

  const screenWidth = Dimensions.get('window').width;
  const cardWidth = (screenWidth - 48) / 2; // 16px padding each side + 16px gap

  useEffect(() => {
    fetchBeats();
    fetchSavedBeats();
  }, [selectedGenre]);

  const fetchBeats = async () => {
    let query = supabase.from('beats').select('*').limit(30);
    if (selectedGenre !== 'All') {
      query = query.eq('genre', selectedGenre);
    }
    const { data } = await query.order('created_at', { ascending: false });
    if (data) setBeats(data);
  };

  const fetchSavedBeats = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    const { data } = await supabase
      .from('favorites' as any)
      .select('item_id')
      .eq('user_id', user.id)
      .eq('item_type', 'beat');
    if (data) {
      setSavedBeats(new Set(data.map((f: any) => f.item_id)));
    }
  };

  const handleSaveBeat = useCallback(async (beatId: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      Alert.alert('Sign In', 'Please sign in to save beats.');
      return;
    }

    if (savedBeats.has(beatId)) {
      await supabase
        .from('favorites' as any)
        .delete()
        .eq('user_id', user.id)
        .eq('item_id', beatId)
        .eq('item_type', 'beat');
      setSavedBeats((prev) => {
        const next = new Set(prev);
        next.delete(beatId);
        return next;
      });
    } else {
      await supabase.from('favorites' as any).insert({
        user_id: user.id,
        item_id: beatId,
        item_type: 'beat',
      });
      setSavedBeats((prev) => new Set(prev).add(beatId));
    }
  }, [savedBeats]);

  const handlePlayBeat = (beat: Beat) => {
    if (!beat.audio_url) return;

    // If already playing this beat, toggle
    if (currentTrack?.beatId === beat.id) {
      togglePlayPause();
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

  const renderBeatCard = (beat: Beat) => {
    const isThisPlaying = currentTrack?.beatId === beat.id && isPlaying;

    return (
      <View key={beat.id} style={{ width: cardWidth }} className="mb-4">
        {/* Square Image */}
        <TouchableOpacity
          onPress={() => handlePlayBeat(beat)}
          activeOpacity={0.8}
          className="relative rounded-xl overflow-hidden bg-[#121212] mb-3"
          style={{ width: cardWidth, height: cardWidth }}
        >
          {beat.image_url ? (
            <Image
              source={{ uri: beat.image_url }}
              className="w-full h-full"
              resizeMode="cover"
            />
          ) : (
            <View className="w-full h-full bg-[#121212]" />
          )}

          {/* Dark overlay */}
          <View className="absolute inset-0 bg-black/20" />

          {/* Play button — bottom right */}
          <View
            className="absolute bottom-2 right-2 h-10 w-10 rounded-full items-center justify-center border border-white/30"
            style={{ backgroundColor: isThisPlaying ? '#FF5200' : 'rgba(0,0,0,0.4)' }}
          >
            <SymbolIcon name={isThisPlaying ? 'pause' : 'play_arrow'} className="text-white text-2xl" />
          </View>

          {/* Exclusive badge — top left */}
          {beat.is_featured && (
            <View className="absolute top-2 left-2">
              <View className="px-2 py-0.5 rounded bg-primary">
                <Text className="text-[10px] font-bold text-white uppercase tracking-wider">
                  Exclusive
                </Text>
              </View>
            </View>
          )}
        </TouchableOpacity>

        {/* Beat Info */}
        <View className="gap-1.5">
          <View>
            <Text className="font-bold text-base text-slate-900 dark:text-white" numberOfLines={1}>
              {beat.title || 'Untitled'}
            </Text>
            <Text className="text-sm text-text-secondary" numberOfLines={1}>
              @{beat.producer_name || 'Unknown'}
            </Text>
          </View>

          {/* BPM / Key badges — orange tint style */}
          <View className="flex-row flex-wrap gap-2 my-0.5">
            {beat.bpm && (
              <View className="bg-primary/10 border border-primary/20 px-2 py-1 rounded">
                <Text className="text-[10px] font-bold text-primary">
                  {beat.bpm} BPM
                </Text>
              </View>
            )}
            {beat.key && (
              <View className="bg-primary/10 border border-primary/20 px-2 py-1 rounded">
                <Text className="text-[10px] font-bold text-primary">
                  {beat.key}
                </Text>
              </View>
            )}
          </View>

          {/* Price button — full width orange */}
          <TouchableOpacity
            onPress={() => router.push(`/beat/${beat.id}`)}
            className="w-full h-9 flex-row items-center justify-between px-3 bg-primary rounded-lg"
            style={{ shadowColor: '#FF5200', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
          >
            <Text className="text-white text-sm font-bold">
              ${beat.price || '—'}
            </Text>
            <SymbolIcon name="add_shopping_cart" className="text-white text-[18px]" />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Build 2-column rows
  const rows: Beat[][] = [];
  for (let i = 0; i < beats.length; i += 2) {
    rows.push(beats.slice(i, i + 2));
  }

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <StatusBar style="auto" />
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="pt-14 px-4 pb-0 bg-background-light/95 dark:bg-background-dark/95 border-b border-gray-200 dark:border-white/10">
        {/* Title + Icons row */}
        <View className="flex-row items-center justify-between mb-4">
          <Text className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
            Marketplace
          </Text>
          <View className="flex-row gap-4 items-center">
            <TouchableOpacity onPress={() => setShowSearch(!showSearch)}>
              <SymbolIcon name="search" className="text-slate-600 dark:text-white text-2xl" />
            </TouchableOpacity>
            <TouchableOpacity className="relative">
              <SymbolIcon name="shopping_cart" className="text-slate-600 dark:text-white text-2xl" />
              {/* Cart badge */}
              <View className="absolute -top-1 -right-1 h-4 w-4 rounded-full bg-primary items-center justify-center">
                <Text className="text-[10px] font-bold text-white">0</Text>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Filters bar */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ alignItems: 'center', paddingBottom: 16 }}
        >
          {/* Filter icon + label */}
          <TouchableOpacity className="flex-row items-center gap-1 pr-2">
            <SymbolIcon name="tune" className="text-slate-500 dark:text-text-secondary text-[20px]" />
            <Text className="text-slate-500 dark:text-text-secondary text-sm font-medium">
              Filters
            </Text>
          </TouchableOpacity>

          {/* Vertical separator */}
          <View className="h-6 w-[1px] bg-gray-300 dark:bg-white/10 mx-2" />

          {/* Genre pills */}
          {GENRES.filter(g => g !== 'All').map((genre) => (
            <TouchableOpacity
              key={genre}
              onPress={() => setSelectedGenre(selectedGenre === genre ? 'All' : genre)}
              className={`h-8 justify-center items-center rounded-full px-4 mr-2 ${
                selectedGenre === genre
                  ? 'bg-primary'
                  : 'bg-gray-200 dark:bg-[#262626]'
              }`}
              style={selectedGenre === genre ? { shadowColor: '#FF5200', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 } : undefined}
            >
              <Text
                className={`text-sm ${
                  selectedGenre === genre
                    ? 'text-white font-bold'
                    : 'text-slate-700 dark:text-white font-medium'
                }`}
              >
                {genre}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Main Content */}
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 24, paddingBottom: 140 }}
      >
        {/* Results count + Sort */}
        <View className="flex-row justify-between items-center mb-4">
          <Text className="text-sm font-medium text-text-secondary">
            Showing {beats.length} Results
          </Text>
          <TouchableOpacity className="flex-row items-center gap-1">
            <Text className="text-sm font-bold text-primary">
              Sort by: {sortBy}
            </Text>
            <SymbolIcon name="keyboard_arrow_down" className="text-primary text-[18px]" />
          </TouchableOpacity>
        </View>

        {/* 2-Column Grid */}
        {rows.map((row, idx) => (
          <View key={idx} className="flex-row justify-between">
            {row.map((beat) => renderBeatCard(beat))}
            {/* If odd row, add spacer */}
            {row.length === 1 && <View style={{ width: cardWidth }} />}
          </View>
        ))}

        {beats.length === 0 && (
          <View className="py-20 items-center">
            <Text className="text-text-secondary text-base">No beats found</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}
