import {
  MaterialIcons,
} from '@expo/vector-icons';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';
import { usePlayback, type PluggdTrack } from '../../src/context/PlaybackProvider';
import { useWallet } from '../../src/hooks/useWallet';
import { releasePlayableUrl } from '../../src/lib/mobileContent';

interface ReleaseDetail {
  id: string;
  title: string;
  artist: string;
  cover_art_url: string | null;
  description: string | null;
  release_type: string | null;
  genre: string | null;
  price: number | null;
  credits_price: number | null;
  audio_url?: string | null;
  preview_url: string | null;
  download_url: string | null;
  user_id: string | null;
  available_at: string | null;
}

interface ReleaseTrack {
  id: string;
  title: string;
  track_number: number;
  duration: number | null;
  audio_url: string | null;
  preview_url?: string | null;
}

function formatDuration(seconds: number | null): string {
  if (!seconds) return '--:--';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function ReleaseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { playTrack, playQueue, currentTrack, isPlaying, togglePlayPause } = usePlayback();
  const { balance, spendCredits } = useWallet();

  const [release, setRelease] = useState<ReleaseDetail | null>(null);
  const [tracks, setTracks] = useState<ReleaseTrack[]>([]);
  const [isOwned, setIsOwned] = useState(false);
  const [loading, setLoading] = useState(true);
  const [unlocking, setUnlocking] = useState(false);

  useEffect(() => {
    if (id) fetchRelease();
  }, [id]);

  async function fetchRelease() {
    setLoading(true);
    try {
      // Fetch release
      const { data: releaseData, error: relError } = await supabase
        .from('releases')
        .select('*')
        .eq('id', id)
        .single();

      if (relError || !releaseData) {
        console.error('[ReleaseDetail] fetch error:', relError);
        setLoading(false);
        return;
      }
      setRelease(releaseData as any);

      // Fetch tracks for this release
      const { data: tracksData } = await supabase
        .from('tracks' as any)
        .select('*')
        .eq('release_id', id)
        .order('track_number', { ascending: true });

      if (tracksData) setTracks(tracksData as any);

      // Check ownership
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: purchase } = await supabase
          .from('release_purchases' as any)
          .select('id')
          .eq('user_id', user.id)
          .eq('release_id', id)
          .eq('status', 'completed')
          .maybeSingle();

        setIsOwned(!!purchase);
      }
    } catch (err) {
      console.error('[ReleaseDetail] error:', err);
    } finally {
      setLoading(false);
    }
  }

  function buildTrackList(): PluggdTrack[] {
    if (!release) return [];

    // If release has individual tracks, use those
    if (tracks.length > 0) {
      return tracks
        .filter((t) => t.audio_url)
        .map((t) => ({
          id: t.id,
          url: t.audio_url!,
          title: t.title,
          artist: release.artist || 'Unknown',
          artwork: release.cover_art_url || undefined,
          releaseId: release.id,
          type: 'release' as const,
        }));
    }

    // Single-track release
    const releaseUrl = releasePlayableUrl(release);
    if (releaseUrl) {
      return [
        {
          id: release.id,
          url: releaseUrl,
          title: release.title,
          artist: release.artist || 'Unknown',
          artwork: release.cover_art_url || undefined,
          releaseId: release.id,
          type: 'release' as const,
        },
      ];
    }

    return [];
  }

  function handlePlayAll() {
    const queue = buildTrackList();
    if (queue.length > 0) playQueue(queue, 0);
  }

  function handlePlayTrack(index: number) {
    const queue = buildTrackList();
    if (queue.length > 0) playQueue(queue, index);
  }

  async function handleUnlock() {
    if (!release) return;
    const creditsNeeded = release.credits_price || release.price || 0;

    if (creditsNeeded <= 0) {
      Alert.alert('Free Release', 'This release is free to stream.');
      return;
    }

    if (balance.available_credits < creditsNeeded) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${creditsNeeded} credits but have ${balance.available_credits}. Would you like to buy more?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Buy Credits', onPress: () => router.push('/wallet') },
        ],
      );
      return;
    }

    Alert.alert(
      'Unlock Release',
      `Unlock "${release.title}" for ${creditsNeeded} credits?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            setUnlocking(true);
            const result = await spendCredits(
              creditsNeeded,
              'spend_unlock',
              'release',
              release.id,
              release.user_id || undefined,
            );
            setUnlocking(false);

            if (result.success) {
              setIsOwned(true);
              Alert.alert('Unlocked!', `"${release.title}" is now in your library.`);
            } else {
              Alert.alert('Error', result.error || 'Failed to unlock release.');
            }
          },
        },
      ],
    );
  }

  if (loading) {
    return (
      <View className="flex-1 bg-[#080808] items-center justify-center">
        <ActivityIndicator size="large" color="#FF5200" />
      </View>
    );
  }

  if (!release) {
    return (
      <View className="flex-1 bg-[#080808] items-center justify-center">
        <Text className="text-white text-lg">Release not found</Text>
        <TouchableOpacity onPress={() => router.back()} className="mt-4">
          <Text className="text-[#FF5200]">Go back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const creditsNeeded = release.credits_price || release.price || 0;
  const isCurrentlyPlaying = currentTrack?.releaseId === release.id;
  const trackList = buildTrackList();

  return (
    <View className="flex-1 bg-[#080808]">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingTop: 118, paddingBottom: 196 }}>
        {/* Hero */}
        <View className="relative">
          <View className="w-full aspect-square">
            {release.cover_art_url ? (
              <Image
                source={{ uri: release.cover_art_url }}
                className="w-full h-full"
              />
            ) : (
              <View className="w-full h-full bg-gray-800 items-center justify-center">
                <Text className="text-white text-6xl">♪</Text>
              </View>
            )}
          </View>
          <LinearGradient
            colors={['transparent', 'rgba(8,8,8,0.82)', '#080808']}
            className="absolute bottom-0 left-0 right-0 h-40"
          />

          {/* Back button */}
          <TouchableOpacity
            onPress={() => router.back()}
            className="absolute top-14 left-4 h-10 w-10 rounded-full bg-black/50 items-center justify-center"
          >
            <MaterialIcons name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
        </View>

        {/* Info */}
        <View className="px-4 -mt-10">
          <Text className="text-white text-3xl font-bold">{release.title}</Text>
          <Text className="text-white/60 text-lg mt-1">{release.artist}</Text>

          <View className="flex-row items-center gap-3 mt-2">
            {release.release_type && (
              <View className="bg-white/10 rounded-full px-3 py-1">
                <Text className="text-white/70 text-xs capitalize">
                  {release.release_type}
                </Text>
              </View>
            )}
            {release.genre && (
              <View className="bg-white/10 rounded-full px-3 py-1">
                <Text className="text-white/70 text-xs">{release.genre}</Text>
              </View>
            )}
          </View>

          {release.description && (
            <Text className="text-white/50 text-sm mt-3 leading-5">
              {release.description}
            </Text>
          )}
        </View>

        {/* Action Buttons */}
        <View className="flex-row gap-3 px-4 mt-5">
          <TouchableOpacity
            onPress={isCurrentlyPlaying ? togglePlayPause : handlePlayAll}
            className="flex-1 bg-[#FF5200] rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
          >
            <MaterialIcons name={isCurrentlyPlaying && isPlaying ? 'pause' : 'play-arrow'} size={22} color="#FFFFFF" />
            <Text className="text-white font-bold">
              {isCurrentlyPlaying && isPlaying ? 'Pause' : 'Play All'}
            </Text>
          </TouchableOpacity>

          {!isOwned && creditsNeeded > 0 && (
            <TouchableOpacity
              onPress={handleUnlock}
              disabled={unlocking}
              className="flex-1 bg-white/10 border border-[#FF5200]/50 rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
            >
              {unlocking ? (
                <ActivityIndicator size="small" color="#FF5200" />
              ) : (
                <>
                  <MaterialIcons name="lock-open" size={20} color="#FF5200" />
                  <Text className="text-[#FF5200] font-bold">
                    {creditsNeeded} Credits
                  </Text>
                </>
              )}
            </TouchableOpacity>
          )}

          {isOwned && (
            <View className="flex-1 bg-green-500/20 border border-green-500/50 rounded-2xl py-3.5 items-center flex-row justify-center gap-2">
              <MaterialIcons name="check-circle" size={20} color="#4ADE80" />
              <Text className="text-green-400 font-bold">Owned</Text>
            </View>
          )}
        </View>

        {/* Track Listing */}
        {tracks.length > 0 && (
          <View className="px-4 mt-6">
            <Text className="text-white text-lg font-bold mb-3">Tracks</Text>
            {tracks.map((track, index) => {
              const isThisPlaying = currentTrack?.id === track.id;
              return (
                <TouchableOpacity
                  key={track.id}
                  onPress={() => handlePlayTrack(index)}
                  className={`flex-row items-center py-3 border-b border-white/5 ${isThisPlaying ? 'bg-white/5 -mx-2 px-2 rounded-lg' : ''}`}
                >
                  <Text
                    className={`w-8 text-sm ${isThisPlaying ? 'text-[#FF5200] font-bold' : 'text-white/40'}`}
                  >
                    {isThisPlaying && isPlaying ? '♪' : track.track_number}
                  </Text>
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-medium ${isThisPlaying ? 'text-[#FF5200]' : 'text-white'}`}
                      numberOfLines={1}
                    >
                      {track.title}
                    </Text>
                  </View>
                  <Text className="text-white/40 text-xs">
                    {formatDuration(track.duration)}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {/* Balance indicator */}
        {!isOwned && creditsNeeded > 0 && (
          <TouchableOpacity
            onPress={() => router.push('/wallet')}
            className="mx-4 mt-6 bg-white/5 rounded-xl p-4 flex-row justify-between items-center"
          >
            <View>
              <Text className="text-white/60 text-xs">Your Balance</Text>
              <Text className="text-white text-lg font-bold">
                {balance.available_credits.toLocaleString()} credits
              </Text>
            </View>
            <Text className="text-[#FF5200] text-sm font-semibold">
              Buy More →
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

    </View>
  );
}
