
import { View, Text, Image, TouchableOpacity, Dimensions } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';

export default function Player() {
    const router = useRouter();
    const params = useLocalSearchParams();
    const { width } = Dimensions.get('window');

    // Mock data or params
    const track = {
        title: params.title || 'Midnight City',
        artist: params.artist || 'M83',
        cover: params.cover || 'https://lh3.googleusercontent.com/aida-public/AB6AXuCNZoafFapekN3FiHF-ld05EORP7E8P4_aH8CXIIseSUuF1kc0jtR8iiSa-u6rIiRaFl3lINbSi12jjinPiZBX7Ng7AFW8gFWkOm2B8vyrA0NapKZAfX3VFVfH5z09hLefG5BatiseX1P5et2J_9_mWfJbSWhfWH1FGICmHb61_ElG9W5bYCQeljxt8wqjdjBy53MKQU5M4AycC-Exe-oGGP0DpD5B8DgqzNr0JFR2t7LMzklN7X-E3c-2NW5qZuOI-A991p03Kw-g',
        genre: 'Electronic'
    };

    // Fake waveform data
    const waveform = [40, 60, 80, 45, 100, 60, 30, 80, 120, 70, 40, 90, 50, 110, 60, 90, 40, 80, 50, 30, 70, 40, 20];

    return (
        <View className="flex-1 bg-background-dark">
            <StatusBar style="light" />
            <Stack.Screen
                options={{
                    headerShown: false,
                    presentation: 'modal',
                    animation: 'slide_from_bottom'
                }}
            />

            {/* Background Gradient */}
            <View className="absolute inset-0 z-0">
                <Image
                    source={{ uri: track.cover as string }}
                    className="w-full h-full opacity-30 blur-3xl"
                    resizeMode="cover"
                />
                <LinearGradient
                    colors={['rgba(5,5,5,0.8)', 'rgba(5,5,5,0.95)', '#050505']}
                    className="absolute inset-0"
                />
            </View>

            <View className="flex-1 px-6 pt-4 pb-10 z-10 justify-between">

                {/* Header */}
                <View className="flex-row items-center justify-between py-4 mt-8">
                    <TouchableOpacity onPress={() => router.back()} className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
                        <Text className="text-white text-2xl material-symbols-outlined">expand_more</Text>
                    </TouchableOpacity>
                    <Text className="text-white/90 text-sm font-semibold uppercase tracking-widest">Now Playing</Text>
                    <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
                        <Text className="text-white text-xl material-symbols-outlined">more_horiz</Text>
                    </TouchableOpacity>
                </View>

                {/* Album Art */}
                <View className="items-center justify-center my-4">
                    <View className="w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        <Image
                            source={{ uri: track.cover as string }}
                            className="w-full h-full"
                        />
                    </View>
                </View>

                {/* Track Info */}
                <View>
                    <View className="flex-row justify-between items-start mb-2">
                        <View className="flex-1 mr-4">
                            <Text className="text-white text-3xl font-bold leading-tight tracking-tight mb-1">{track.title}</Text>
                            <Text className="text-white/60 text-lg font-medium">{track.artist}</Text>
                        </View>
                        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full bg-white/10">
                            <Text className="text-white/40 text-2xl material-symbols-outlined">favorite</Text>
                        </TouchableOpacity>
                    </View>
                    <View className="items-start">
                        <View className="px-3 py-1 rounded-full bg-white/5 border border-white/10">
                            <Text className="text-xs font-medium text-white/70">{track.genre}</Text>
                        </View>
                    </View>
                </View>

                {/* Scrubber / Waveform */}
                <View className="my-4">
                    <View className="flex-row items-center justify-between h-12 gap-1">
                        {waveform.map((h, i) => (
                            <View
                                key={i}
                                className={`w-1.5 rounded-full ${i < 10 ? 'bg-primary' : 'bg-white/20'}`}
                                style={{ height: h / 2 }}
                            />
                        ))}
                    </View>
                    <View className="flex-row justify-between mt-1">
                        <Text className="text-xs font-medium text-white/40 font-mono">1:45</Text>
                        <Text className="text-xs font-medium text-white/40 font-mono">3:20</Text>
                    </View>
                </View>

                {/* Controls */}
                <View className="flex-row items-center justify-between mb-8 px-2">
                    <TouchableOpacity>
                        <Text className="text-primary text-2xl material-symbols-outlined">shuffle</Text>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Text className="text-white text-4xl material-symbols-outlined">skip_previous</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="h-20 w-20 rounded-full bg-primary items-center justify-center shadow-lg shadow-primary/40">
                        <Text className="text-white text-5xl material-symbols-outlined pl-1">play_arrow</Text>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Text className="text-white text-4xl material-symbols-outlined">skip_next</Text>
                    </TouchableOpacity>
                    <TouchableOpacity>
                        <Text className="text-white/40 text-2xl material-symbols-outlined">repeat</Text>
                    </TouchableOpacity>
                </View>

                {/* Actions */}
                <View className="flex-row gap-3">
                    <TouchableOpacity className="flex-1 py-3 rounded-xl bg-primary items-center justify-center flex-row gap-2">
                        <Text className="text-white material-symbols-outlined">monetization_on</Text>
                        <Text className="text-[10px] font-bold text-white uppercase tracking-wide">Tip Artist</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 items-center justify-center flex-row gap-2">
                        <Text className="text-white/90 material-symbols-outlined">playlist_add</Text>
                        <Text className="text-[10px] font-bold text-white/80 uppercase tracking-wide">Playlist</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 items-center justify-center flex-row gap-2">
                        <Text className="text-white/90 material-symbols-outlined">download</Text>
                        <Text className="text-[10px] font-bold text-white/80 uppercase tracking-wide">Download</Text>
                    </TouchableOpacity>
                </View>

            </View>
        </View>
    );
}
