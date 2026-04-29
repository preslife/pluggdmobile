
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { useState, useMemo } from 'react';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { usePlayback } from '../src/context/PlaybackProvider';
import { RepeatMode } from 'react-native-track-player';
import TipModal from '../components/TipModal';

function formatTime(seconds: number): string {
  if (!seconds || !isFinite(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

// Generate deterministic waveform bar heights from title string
function generateWaveform(seed: string, count: number): number[] {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = ((hash << 5) - hash) + seed.charCodeAt(i);
    hash |= 0;
  }
  const bars: number[] = [];
  for (let i = 0; i < count; i++) {
    hash = ((hash << 5) - hash) + i;
    hash |= 0;
    bars.push(12 + Math.abs(hash % 36)); // heights between 12-48
  }
  return bars;
}

export default function Player() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    progress,
    togglePlayPause,
    skipToNext,
    skipToPrevious,
    seekTo,
    toggleRepeat,
    toggleShuffle,
    shuffleMode,
    repeatMode,
  } = usePlayback();

  const [tipVisible, setTipVisible] = useState(false);

  const title = currentTrack?.title || params.title || 'No Track';
  const artist = currentTrack?.artist || params.artist || '';
  const cover = currentTrack?.artwork || (params.cover as string) || '';

  const progressPercent =
    progress.duration > 0
      ? Math.min((progress.position / progress.duration) * 100, 100)
      : 0;

  const screenWidth = Dimensions.get('window').width - 48; // minus padding
  const BAR_COUNT = 23;
  const waveformHeights = useMemo(() => generateWaveform(title as string, BAR_COUNT), [title]);

  const handleScrubberPress = (event: any) => {
    const { locationX } = event.nativeEvent;
    const seekPosition = (locationX / screenWidth) * progress.duration;
    if (seekPosition >= 0 && seekPosition <= progress.duration) {
      seekTo(seekPosition);
    }
  };

  // Which bar index represents current playback position
  const activeBarIndex = Math.floor((progressPercent / 100) * BAR_COUNT);

  return (
    <View className="flex-1 bg-[#050505]">
      <StatusBar style="light" />
      <Stack.Screen
        options={{
          headerShown: false,
          presentation: 'modal',
          animation: 'slide_from_bottom',
        }}
      />

      {/* Blurred background artwork */}
      <View className="absolute inset-0 z-0 overflow-hidden">
        {cover ? (
          <Image
            source={{ uri: cover as string }}
            className="w-full h-full"
            resizeMode="cover"
            blurRadius={80}
            style={{ opacity: 0.3, transform: [{ scale: 1.1 }] }}
          />
        ) : null}
        <LinearGradient
          colors={['rgba(5,5,5,0.8)', 'rgba(5,5,5,0.95)', '#050505']}
          className="absolute inset-0"
        />
      </View>

      <View className="flex-1 px-6 pt-2 pb-6 z-10 justify-between">
        {/* Header — expand_more + Now Playing + more_horiz */}
        <View className="flex-row items-center justify-between py-4 mt-10">
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full"
          >
            <Text className="material-symbols-outlined text-white" style={{ fontSize: 28 }}>
              expand_more
            </Text>
          </TouchableOpacity>
          <Text className="text-white/90 text-sm font-semibold uppercase tracking-widest">
            Now Playing
          </Text>
          <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full">
            <Text className="material-symbols-outlined text-white" style={{ fontSize: 24 }}>
              more_horiz
            </Text>
          </TouchableOpacity>
        </View>

        {/* Album Art — large square with shadow + ring */}
        <View className="items-center justify-center my-4">
          <View
            className="w-full aspect-square rounded-2xl overflow-hidden border border-white/10"
            style={{
              maxHeight: 380,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 20 },
              shadowOpacity: 0.9,
              shadowRadius: 50,
              elevation: 20,
            }}
          >
            {cover ? (
              <Image source={{ uri: cover as string }} className="w-full h-full" resizeMode="cover" />
            ) : (
              <View className="w-full h-full bg-[#121212] items-center justify-center">
                <Text className="material-symbols-outlined text-white/20" style={{ fontSize: 80 }}>
                  music_note
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Track Info + Favorite + Genre badge */}
        <View className="w-full mb-6">
          <View className="flex-row justify-between items-start w-full">
            <View className="flex-1 mr-4">
              <Text className="text-white text-3xl font-bold leading-tight tracking-tight mb-1">
                {title}
              </Text>
              <Text className="text-white/60 text-lg font-medium">
                {artist}
              </Text>
            </View>
            <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full mt-1">
              <Text className="material-symbols-outlined text-white/40" style={{ fontSize: 24 }}>
                favorite
              </Text>
            </TouchableOpacity>
          </View>
          {/* Genre badge */}
          {currentTrack?.type && (
            <View className="mt-3">
              <View className="self-start px-3 py-1 rounded-full bg-white/5 border border-white/10">
                <Text className="text-xs font-medium text-white/70 capitalize">
                  {currentTrack.type === 'beat' ? 'Beat' : currentTrack.type === 'release' ? 'Release' : 'Track'}
                </Text>
              </View>
            </View>
          )}
        </View>

        {/* Waveform Scrubber */}
        <View className="w-full mb-2">
          <TouchableOpacity
            activeOpacity={1}
            onPress={handleScrubberPress}
            className="flex-row items-center justify-between h-12 px-1"
          >
            {waveformHeights.map((h, i) => (
              <View
                key={i}
                className="rounded-full"
                style={{
                  width: 6,
                  height: h,
                  backgroundColor:
                    i < activeBarIndex
                      ? '#FF5500'
                      : i === activeBarIndex
                        ? '#FF5500'
                        : 'rgba(255,255,255,0.2)',
                  opacity: i < activeBarIndex ? (0.4 + (i / activeBarIndex) * 0.6) : 1,
                }}
              />
            ))}
          </TouchableOpacity>
          <View className="flex-row justify-between mt-1">
            <Text className="text-xs font-medium text-white/40" style={{ fontFamily: 'Courier' }}>
              {formatTime(progress.position)}
            </Text>
            <Text className="text-xs font-medium text-white/40" style={{ fontFamily: 'Courier' }}>
              {formatTime(progress.duration)}
            </Text>
          </View>
        </View>

        {/* Playback Controls — shuffle, prev, play/pause, next, repeat */}
        <View className="flex-row items-center justify-between mb-8 px-2">
          <TouchableOpacity onPress={toggleShuffle} className="p-2 relative">
            <Text
              className={`material-symbols-outlined ${shuffleMode === 'on' ? 'text-primary' : 'text-white/40'}`}
              style={{ fontSize: 24 }}
            >
              shuffle
            </Text>
            {shuffleMode === 'on' && (
              <View className="absolute -bottom-1 left-1/2 w-1 h-1 bg-primary rounded-full" style={{ marginLeft: -2 }} />
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={skipToPrevious} className="p-2">
            <Text
              className="material-symbols-outlined text-white"
              style={{ fontSize: 40 }}
            >
              skip_previous
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={togglePlayPause}
            className="h-20 w-20 rounded-full bg-primary items-center justify-center"
            style={{
              shadowColor: '#FF5500',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.6,
              shadowRadius: 40,
              elevation: 15,
            }}
          >
            <Text
              className="material-symbols-outlined text-white"
              style={{ fontSize: 48 }}
            >
              {isBuffering ? 'hourglass_empty' : isPlaying ? 'pause' : 'play_arrow'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={skipToNext} className="p-2">
            <Text
              className="material-symbols-outlined text-white"
              style={{ fontSize: 40 }}
            >
              skip_next
            </Text>
          </TouchableOpacity>

          <TouchableOpacity onPress={toggleRepeat} className="p-2">
            <Text
              className={`material-symbols-outlined ${repeatMode !== RepeatMode.Off ? 'text-primary' : 'text-white/40'}`}
              style={{ fontSize: 24 }}
            >
              {repeatMode === RepeatMode.Track ? 'repeat_one' : 'repeat'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action buttons — 3-column grid matching Stitch */}
        <View className="flex-row gap-3 w-full mb-6">
          <TouchableOpacity
            onPress={() => setTipVisible(true)}
            className="flex-1 items-center justify-center gap-1.5 p-3 rounded-xl bg-primary border border-primary/50"
            style={{ shadowColor: '#FF5500', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8 }}
          >
            <Text className="material-symbols-outlined text-white" style={{ fontSize: 24 }}>
              monetization_on
            </Text>
            <Text className="text-[10px] font-bold text-white uppercase tracking-wide">
              Tip Artist
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 items-center justify-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
            <Text className="material-symbols-outlined text-white/90" style={{ fontSize: 24 }}>
              playlist_add
            </Text>
            <Text className="text-[10px] font-semibold text-white/80 uppercase tracking-wide">
              Playlist
            </Text>
          </TouchableOpacity>

          <TouchableOpacity className="flex-1 items-center justify-center gap-1.5 p-3 rounded-xl bg-white/5 border border-white/5">
            <Text className="material-symbols-outlined text-white/90" style={{ fontSize: 24 }}>
              download
            </Text>
            <Text className="text-[10px] font-semibold text-white/80 uppercase tracking-wide">
              Download
            </Text>
          </TouchableOpacity>
        </View>

        {/* Credits & Lyrics hint */}
        <View className="items-center pt-2 pb-1" style={{ opacity: 0.6 }}>
          <View className="w-12 h-1 bg-white/30 rounded-full mb-2" />
          <Text className="text-xs font-medium text-white tracking-wider uppercase">
            Credits & Lyrics
          </Text>
        </View>

        {/* Tip Modal */}
        <TipModal
          visible={tipVisible}
          onClose={() => setTipVisible(false)}
          artistName={artist as string}
          artistId={currentTrack?.releaseId || ''}
        />
      </View>
    </View>
  );
}
