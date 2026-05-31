import {
  MaterialIcons,
} from '@expo/vector-icons';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
} from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { PremiumEmptyState, PremiumHeroCard, PremiumScreenBackdrop } from '../../components/PluggdPrimitives';
import { supabase } from '../../src/lib/supabase';
import { usePlayback, type PluggdTrack } from '../../src/context/PlaybackProvider';
import { toggleSavedContent } from '../../src/features/culture/mobileServices';
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

function getReleaseCreditPrice(release: ReleaseDetail): number {
  if (release.credits_price && release.credits_price > 0) {
    return Math.ceil(release.credits_price);
  }

  if (release.price && release.price > 0) {
    return Math.ceil(release.price * 100);
  }

  return 0;
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
  const [saving, setSaving] = useState(false);

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
    const creditsNeeded = getReleaseCreditPrice(release);

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

  async function handleSave() {
    if (!release || saving) return;
    setSaving(true);
    const result = await toggleSavedContent('release', release.id);
    setSaving(false);
    Alert.alert(result.success ? (result.saved ? 'Saved' : 'Removed') : 'Save unavailable', result.success ? `"${release.title}" library state updated.` : result.error || 'Please try again.');
  }

  async function handleShare() {
    if (!release) return;
    await Share.share({ message: `PLUGGD release: ${release.title} by ${release.artist || 'Creator'}` });
  }

  if (loading) {
    return (
      <PremiumScreenBackdrop tone="accent" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#FF5A00" />
      </PremiumScreenBackdrop>
    );
  }

  if (!release) {
    return (
      <PremiumScreenBackdrop tone="accent" style={{ justifyContent: 'center', paddingHorizontal: 16 }}>
        <PremiumEmptyState
          icon="album"
          title="Release not found"
          body="This release is unavailable or the link no longer points to a published item."
        />
        <TouchableOpacity onPress={() => router.back()} className="mt-4 items-center">
          <Text className="text-[#FF5A00] font-bold">Go back</Text>
        </TouchableOpacity>
      </PremiumScreenBackdrop>
    );
  }

  const creditsNeeded = getReleaseCreditPrice(release);
  const isCurrentlyPlaying = currentTrack?.releaseId === release.id;
  const trackList = buildTrackList();

  return (
    <PremiumScreenBackdrop tone="accent">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingHorizontal: 16, paddingTop: 118, paddingBottom: 196 }}>
        <View className="relative">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-11 w-11 rounded-full bg-black/50 items-center justify-center mb-3"
          >
            <MaterialIcons name="chevron-left" size={26} color="#FFFFFF" />
          </TouchableOpacity>
          <PremiumHeroCard
            eyebrow={release.release_type ? release.release_type : 'Release'}
            title={release.title}
            subtitle={release.artist || 'PLUGGD creator'}
            meta={release.genre || (trackList.length ? `${trackList.length} tracks` : 'Ready to play')}
            imageUrl={release.cover_art_url}
            badge={isOwned ? 'Owned' : creditsNeeded > 0 ? `${creditsNeeded} credits` : 'Free stream'}
            ctaLabel={isCurrentlyPlaying && isPlaying ? 'Pause' : 'Play'}
            onPress={isCurrentlyPlaying ? togglePlayPause : handlePlayAll}
          />
        </View>

        {/* Info */}
        <View className="mt-5">
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
        <View className="flex-row gap-3 mt-5">
          <TouchableOpacity
            onPress={isCurrentlyPlaying ? togglePlayPause : handlePlayAll}
            className="flex-1 bg-[#FF5A00] rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
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
              className="flex-1 bg-white/10 border border-[#FF5A00]/50 rounded-2xl py-3.5 items-center flex-row justify-center gap-2"
            >
              {unlocking ? (
                <ActivityIndicator size="small" color="#FF5A00" />
              ) : (
                <>
                  <MaterialIcons name="lock-open" size={20} color="#FF5A00" />
                  <Text className="text-[#FF5A00] font-bold">
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

        <View className="flex-row flex-wrap gap-2 mt-3">
          <TouchableOpacity
            onPress={handleSave}
            disabled={saving}
            className="flex-1 min-w-[46%] bg-[#FF5A00]/10 border border-[#FF5A00]/30 rounded-full py-3 items-center flex-row justify-center gap-2"
          >
            <MaterialIcons name="bookmark-border" size={19} color="#FF5A00" />
            <Text className="text-[#FF5A00] text-xs font-black">{saving ? 'Saving' : 'Save'}</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push({ pathname: '/create-post', params: { attachmentType: 'release', releaseId: release.id, type: 'post' } } as any)}
            className="flex-1 min-w-[46%] bg-[#FF5A00]/10 border border-[#FF5A00]/30 rounded-full py-3 items-center flex-row justify-center gap-2"
          >
            <MaterialIcons name="post-add" size={19} color="#FF5A00" />
            <Text className="text-[#FF5A00] text-xs font-black">Post</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleShare}
            className="flex-1 min-w-[46%] bg-[#FF5A00]/10 border border-[#FF5A00]/30 rounded-full py-3 items-center flex-row justify-center gap-2"
          >
            <MaterialIcons name="ios-share" size={19} color="#FF5A00" />
            <Text className="text-[#FF5A00] text-xs font-black">Share</Text>
          </TouchableOpacity>
          {release.user_id ? (
            <TouchableOpacity
              onPress={() => router.push(`/user/${release.user_id}` as any)}
              className="flex-1 min-w-[46%] bg-[#FF5A00]/10 border border-[#FF5A00]/30 rounded-full py-3 items-center flex-row justify-center gap-2"
            >
              <MaterialIcons name="person" size={19} color="#FF5A00" />
              <Text className="text-[#FF5A00] text-xs font-black">Creator</Text>
            </TouchableOpacity>
          ) : null}
        </View>

        {/* Track Listing */}
        {tracks.length > 0 && (
          <View className="mt-6">
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
                    className={`w-8 text-sm ${isThisPlaying ? 'text-[#FF5A00] font-bold' : 'text-white/40'}`}
                  >
                    {isThisPlaying && isPlaying ? '♪' : track.track_number}
                  </Text>
                  <View className="flex-1">
                    <Text
                      className={`text-sm font-medium ${isThisPlaying ? 'text-[#FF5A00]' : 'text-white'}`}
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
            className="mt-6 bg-white/5 rounded-xl p-4 flex-row justify-between items-center"
          >
            <View>
              <Text className="text-white/60 text-xs">Your Balance</Text>
              <Text className="text-white text-lg font-bold">
                {balance.available_credits.toLocaleString()} credits
              </Text>
            </View>
            <Text className="text-[#FF5A00] text-sm font-semibold">
              Buy More →
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>

    </PremiumScreenBackdrop>
  );
}
