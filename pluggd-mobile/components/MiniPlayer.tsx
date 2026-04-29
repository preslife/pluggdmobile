import { View, Text, Image, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';
import { usePlayback } from '../src/context/PlaybackProvider';

export default function MiniPlayer() {
  const router = useRouter();
  const {
    currentTrack,
    isPlaying,
    isBuffering,
    progress,
    togglePlayPause,
    skipToNext,
  } = usePlayback();

  // Don't render if nothing is playing
  if (!currentTrack) return null;

  const openPlayer = () => {
    router.push({
      pathname: '/player',
      params: {
        title: currentTrack.title,
        artist: currentTrack.artist,
        cover: currentTrack.artwork ?? '',
      },
    });
  };

  // Progress percentage for the bar
  const progressPercent =
    progress.duration > 0
      ? Math.min((progress.position / progress.duration) * 100, 100)
      : 0;

  return (
    <View className="absolute bottom-0 left-0 right-0 z-50 p-2">
      <Pressable
        onPress={openPlayer}
        className="bg-card-dark backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl overflow-hidden"
      >
        {/* Progress bar at top of mini player */}
        <View className="h-[2px] bg-white/10 w-full">
          <View
            className="h-full bg-primary"
            style={{ width: `${progressPercent}%` }}
          />
        </View>

        <View className="p-2.5 flex-row items-center gap-3">
          {/* Cover Art */}
          <View className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-gray-800">
            {currentTrack.artwork ? (
              <Image
                source={{ uri: currentTrack.artwork }}
                className="w-full h-full"
              />
            ) : (
              <View className="w-full h-full bg-gray-700 items-center justify-center">
                <Text className="text-white text-lg">♪</Text>
              </View>
            )}
          </View>

          {/* Track Info */}
          <View className="flex-col flex-1 min-w-0">
            <Text
              className="text-white text-sm font-bold"
              numberOfLines={1}
            >
              {currentTrack.title}
            </Text>
            <Text
              className="text-text-secondary text-xs"
              numberOfLines={1}
            >
              {currentTrack.artist}
            </Text>
          </View>

          {/* Controls */}
          <View className="flex-row items-center gap-2 pr-1">
            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                togglePlayPause();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-white text-[28px]">
                {isBuffering ? '⏳' : isPlaying ? '⏸' : '▶️'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={(e) => {
                e.stopPropagation?.();
                skipToNext();
              }}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Text className="text-white text-[22px]">⏭</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Pressable>
    </View>
  );
}
