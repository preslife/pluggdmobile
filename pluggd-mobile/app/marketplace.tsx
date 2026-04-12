
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { Database } from '../src/types/supabase';
import MiniPlayer from '../components/MiniPlayer';
import { BottomTabs } from '../components/BottomTabs';

type Beat = Database['public']['Tables']['beats']['Row'];

export default function Marketplace() {
    const [beats, setBeats] = useState<Beat[]>([]);
    const router = useRouter();

    useEffect(() => {
        fetchBeats();
    }, []);

    const fetchBeats = async () => {
        const { data } = await supabase.from('beats').select('*').limit(20);
        if (data) setBeats(data);
    };

    const genres = ['Trap', 'R&B', 'Lo-Fi', 'Drill', 'Afrobeat', 'Soul'];

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            <StatusBar style="auto" />
            <Stack.Screen options={{ headerShown: false }} />

            {/* Header */}
            <View className="pt-14 px-4 pb-4 border-b border-gray-200 dark:border-white/10 bg-background-light/95 dark:bg-background-dark/95">
                <View className="flex-row items-center justify-between mb-4">
                    <Text className="text-2xl font-bold text-slate-900 dark:text-white">Marketplace</Text>
                    <View className="flex-row gap-4">
                        <TouchableOpacity>
                            <Text className="text-slate-600 dark:text-white text-2xl material-symbols-outlined">search</Text>
                        </TouchableOpacity>
                        <TouchableOpacity>
                            <Text className="text-slate-600 dark:text-white text-2xl material-symbols-outlined">shopping_cart</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row items-center">
                    <TouchableOpacity className="flex-row items-center gap-1 pr-2 mr-2">
                        <Text className="text-slate-500 dark:text-text-secondary text-base material-symbols-outlined">tune</Text>
                        <Text className="text-slate-500 dark:text-text-secondary text-sm font-medium">Filters</Text>
                    </TouchableOpacity>
                    <View className="h-6 w-[1px] bg-gray-300 dark:bg-white/10 mx-1 mr-3" />
                    <TouchableOpacity className="h-8 justify-center items-center rounded-full bg-primary px-4 mr-2">
                        <Text className="text-white text-sm font-bold">All</Text>
                    </TouchableOpacity>
                    {genres.map((genre) => (
                        <TouchableOpacity key={genre} className="h-8 justify-center items-center rounded-full bg-gray-200 dark:bg-card-dark px-4 mr-2">
                            <Text className="text-slate-700 dark:text-white text-sm font-medium">{genre}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            <ScrollView className="flex-1 px-4 py-4" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Sort Bar */}
                <View className="flex-row justify-between items-center mb-4">
                    <Text className="text-sm font-medium text-text-secondary">Showing {beats.length} Results</Text>
                    <TouchableOpacity className="flex-row items-center gap-1">
                        <Text className="text-sm font-bold text-primary">Sort by: Trending</Text>
                    </TouchableOpacity>
                </View>

                {/* Grid */}
                <View className="flex-row flex-wrap justify-between">
                    {beats.map((beat) => (
                        <View key={beat.id} className="w-[48%] mb-4">
                            <View className="aspect-square w-full rounded-xl overflow-hidden bg-card-dark mb-2 relative">
                                {beat.image_url ? (
                                    <Image source={{ uri: beat.image_url }} className="w-full h-full" />
                                ) : (
                                    <View className="w-full h-full bg-gray-800" />
                                )}
                                <View className="absolute top-2 left-2">
                                    {beat.is_featured && (
                                        <View className="px-2 py-0.5 rounded bg-primary shadow-lg">
                                            <Text className="text-[10px] font-bold text-white uppercase tracking-wider">Exclusive</Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity className="absolute bottom-2 right-2 h-10 w-10 bg-black/40 rounded-full justify-center items-center border border-white/30">
                                    <Text className="text-white text-xl">▶</Text>
                                </TouchableOpacity>
                            </View>

                            <View>
                                <Text className="font-bold text-base text-slate-900 dark:text-white truncate">{beat.title}</Text>
                                <Text className="text-sm text-text-secondary truncate">{beat.producer_name || 'Unknown'}</Text>
                                <View className="flex-row flex-wrap gap-2 my-1">
                                    {beat.bpm && (
                                        <View className="px-2 py-1 rounded border border-primary/20 bg-primary/10">
                                            <Text className="text-[10px] font-bold text-primary">{beat.bpm} BPM</Text>
                                        </View>
                                    )}
                                    {beat.key && (
                                        <View className="px-2 py-1 rounded border border-primary/20 bg-primary/10">
                                            <Text className="text-[10px] font-bold text-primary">{beat.key}</Text>
                                        </View>
                                    )}
                                </View>
                                <TouchableOpacity
                                    onPress={() =>
                                        router.push({
                                            pathname: "/commerce/checkout",
                                            params: {
                                                beatId: beat.id,
                                                price: beat.price ?? 0,
                                                title: beat.title,
                                                artist: beat.producer_name || "Unknown",
                                            },
                                        })
                                    }
                                    className="w-full h-9 flex-row items-center justify-between px-3 bg-primary rounded-lg mt-1"
                                >
                                    <Text className="text-white font-bold text-sm">${beat.price || '0.00'}</Text>
                                    <Text className="text-white text-sm material-symbols-outlined">shopping_cart</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    ))}
                </View>
            </ScrollView>

            <MiniPlayer />
            <BottomTabs />
        </View>
    );
}
