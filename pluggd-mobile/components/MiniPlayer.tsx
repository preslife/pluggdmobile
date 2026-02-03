
import { View, Text, Image, TouchableOpacity, Pressable } from 'react-native';
import { useRouter } from 'expo-router';

export default function MiniPlayer() {
    const router = useRouter();

    const openPlayer = () => {
        router.push({
            pathname: '/player',
            params: {
                title: 'Night Rider',
                artist: '@ProducerX',
                cover: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0Tueq6W_11Vnpi5Oqh_2lbkgQ6KiEAa4fdpDpz3ff9UFOA2vJktc6iuNkmUs1SDSmaxl6QA2fG_gvyw15eUpvUDU6OkXfszZtx7y2-_wPTqZQsE39ZZL8JX3f-v8Kd7NyDVdROix2P0IilSKRlhBVuRUJuVV7rDHvlDJLSyZmDUpV5MlibbP2qWqtW8j5fBioTGEwajFFbosNLu0uCZLsGGirNPPZqzxZ4TR5TTAkn56UldylQg6dOsXcF0bN90mOqZ6wl-ubsJE'
            }
        });
    };

    return (
        <View className="absolute bottom-0 left-0 right-0 z-50 p-2">
            <Pressable onPress={openPlayer} className="bg-surface-dark/95 bg-card-dark backdrop-blur-xl border border-white/5 shadow-2xl rounded-2xl p-2.5 flex-row items-center gap-3">
                {/* Cover Art */}
                <View className="relative h-12 w-12 shrink-0 rounded-lg overflow-hidden bg-gray-800">
                    <Image
                        source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC0Tueq6W_11Vnpi5Oqh_2lbkgQ6KiEAa4fdpDpz3ff9UFOA2vJktc6iuNkmUs1SDSmaxl6QA2fG_gvyw15eUpvUDU6OkXfszZtx7y2-_wPTqZQsE39ZZL8JX3f-v8Kd7NyDVdROix2P0IilSKRlhBVuRUJuVV7rDHvlDJLSyZmDUpV5MlibbP2qWqtW8j5fBioTGEwajFFbosNLu0uCZLsGGirNPPZqzxZ4TR5TTAkn56UldylQg6dOsXcF0bN90mOqZ6wl-ubsJE' }}
                        className="w-full h-full"
                    />
                </View>

                {/* Track Info */}
                <View className="flex-col flex-1 min-w-0">
                    <Text className="text-white text-sm font-bold truncate">Night Rider</Text>
                    <Text className="text-text-secondary text-xs truncate">@ProducerX</Text>
                    {/* Fake Waveform */}
                    <View className="flex-row items-end gap-0.5 h-3 mt-1 w-full opacity-60">
                        {[40, 70, 100, 60, 80, 40, 90, 50, 30, 60].map((h, i) => (
                            <View key={i} className="w-1 bg-primary rounded-t-sm" style={{ height: `${h}%` }} />
                        ))}
                    </View>
                </View>

                {/* Controls */}
                <View className="flex-row items-center gap-3 pr-2">
                    <TouchableOpacity onPress={(e) => e.stopPropagation()}>
                        <Text className="text-white text-[32px]">⏸</Text>
                    </TouchableOpacity>
                </View>
            </Pressable>
        </View>
    );
}
