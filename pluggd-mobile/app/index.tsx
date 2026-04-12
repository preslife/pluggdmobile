
import { View, Text, ScrollView, Image, TouchableOpacity, TextInput } from 'react-native';
import { useEffect, useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { supabase } from '../src/lib/supabase';
import { Database } from '../src/types/supabase';
import { BottomTabs } from '../components/BottomTabs';

type Release = Database['public']['Tables']['releases']['Row'];
type Beat = Database['public']['Tables']['beats']['Row'];
type Playlist = Database['public']['Tables']['playlists']['Row'];

export default function Home() {
    const [releases, setReleases] = useState<Release[]>([]);
    const [beats, setBeats] = useState<Beat[]>([]);
    const [playlists, setPlaylists] = useState<Playlist[]>([]);
    const router = useRouter();

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        const { data: releasesData } = await supabase.from('releases').select('*').limit(5);
        if (releasesData) setReleases(releasesData);

        const { data: beatsData } = await supabase.from('beats').select('*').limit(5);
        if (beatsData) setBeats(beatsData);

        const { data: playlistsData } = await supabase.from('playlists').select('*').limit(5);
        if (playlistsData) setPlaylists(playlistsData);
    };

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            <StatusBar style="auto" />
            <Stack.Screen options={{ headerShown: false }} />

            <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
                {/* Header / Search */}
                <View className="pt-14 px-4 pb-2 bg-background-light/90 dark:bg-background-dark/90">
                    <View className="flex-row items-center gap-3 mb-4">
                        <View className="flex-1 flex-row items-center bg-gray-100 dark:bg-card-dark rounded-xl h-12 px-4 border border-transparent">
                            <Text className="text-primary material-symbols-outlined text-2xl">search</Text>
                            <TextInput
                                className="flex-1 ml-2 text-base text-slate-900 dark:text-white"
                                placeholder="Find beats, artists, or tracks"
                                placeholderTextColor="#9da4b9"
                            />
                        </View>
                        <TouchableOpacity onPress={() => router.push('/profile')} className="w-12 h-12 rounded-full overflow-hidden border border-white/10 bg-gray-200">
                            <Image
                                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuA8oXxKMsVTrh_klN_vSP4Ar-LyFVj3x2nA3Oq0C2MpmyCBkc2zY8wkCM0_zkIwmK69CTF6udHEAlGfFaujg4IQPNKYl0p9sbmTT11_z_YkmPpEQry-WDgxyKUNh0DxE6D0sNHqH1-XjjixYHuFmohsbxN0ESzpru45NU7jwq3HzFCaDBxzXamyGuD4BeFBsnPISBr4foqwd-Ju2RJnlFIbbOl7DgyGZWzOyvovkY5ROD2eVguSBD4byatzORza2SULP4mFXwIYqFk' }}
                                className="w-full h-full"
                            />
                        </TouchableOpacity>
                    </View>

                    {/* Social Nav (Temporary Quick Links) */}
                    <View className="flex-row justify-around py-4 border-b border-white/5 bg-black/20">
                        <TouchableOpacity onPress={() => router.push('/social/hub')} className="items-center gap-1">
                            <Text className="material-symbols-outlined text-white text-2xl">groups</Text>
                            <Text className="text-xs text-white/60">Hub</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/social/inbox')} className="items-center gap-1">
                            <Text className="material-symbols-outlined text-white text-2xl">chat_bubble</Text>
                            <Text className="text-xs text-white/60">Inbox</Text>
                        </TouchableOpacity>
                        <TouchableOpacity onPress={() => router.push('/social/notifications')} className="items-center gap-1">
                            <Text className="material-symbols-outlined text-white text-2xl">notifications</Text>
                            <Text className="text-xs text-white/60">Alerts</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Tags */}
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} className="flex-row gap-3 pb-2">
                        <TouchableOpacity className="h-9 px-5 justify-center items-center rounded-full bg-primary mr-3">
                            <Text className="text-white font-semibold text-sm">All</Text>
                        </TouchableOpacity>
                        {['Hip Hop', 'Lo-fi', 'R&B', 'Trap', 'Drill'].map((tag) => (
                            <TouchableOpacity key={tag} className="h-9 px-5 justify-center items-center rounded-full bg-white dark:bg-card-dark border border-slate-200 dark:border-white/5 mr-3">
                                <Text className="text-slate-600 dark:text-white font-medium text-sm">{tag}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* New Releases */}
                <View className="mt-8">
                    <View className="flex-row justify-between items-center px-4 mb-4">
                        <Text className="text-xl font-bold text-slate-900 dark:text-primary">New Releases</Text>
                        <Text className="text-primary text-sm font-semibold">See all</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        {releases.map((release) => (
                            <TouchableOpacity key={release.id} className="mr-4 w-[160px]">
                                <View className="aspect-square rounded-2xl overflow-hidden shadow-lg bg-card-dark mb-3">
                                    {release.cover_art_url ? (
                                        <Image source={{ uri: release.cover_art_url }} className="w-full h-full" />
                                    ) : (
                                        <View className="w-full h-full bg-gray-800" />
                                    )}
                                </View>
                                <Text className="text-base font-bold text-slate-900 dark:text-white truncate">{release.title}</Text>
                                <Text className="text-sm text-text-secondary truncate">{release.artist}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Hot Beats */}
                <View className="mt-8">
                    <View className="flex-row justify-between items-center px-4 mb-4">
                        <View>
                            <Text className="text-xl font-bold text-slate-900 dark:text-primary">Hot Beats</Text>
                            <Text className="text-xs text-text-secondary font-medium">Trending in Marketplace</Text>
                        </View>
                        <TouchableOpacity onPress={() => router.push('/marketplace')}>
                            <Text className="text-primary text-sm font-semibold">See all</Text>
                        </TouchableOpacity>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16 }}>
                        {beats.map((beat) => (
                            <TouchableOpacity key={beat.id} className="mr-4 w-[200px]">
                                <View className="aspect-[4/3] rounded-2xl overflow-hidden shadow-lg bg-card-dark mb-3 relative">
                                    {beat.image_url ? (
                                        <Image source={{ uri: beat.image_url }} className="w-full h-full" />
                                    ) : (
                                        <View className="w-full h-full bg-gray-800" />
                                    )}
                                    {beat.bpm && (
                                        <View className="absolute top-2 right-2 bg-black/60 px-2 py-1 rounded-md">
                                            <Text className="text-xs font-bold text-white">{beat.bpm} BPM</Text>
                                        </View>
                                    )}
                                </View>
                                <View className="flex-row justify-between items-start">
                                    <View className="flex-1 mr-2">
                                        <Text className="text-base font-bold text-slate-900 dark:text-white truncate">{beat.title}</Text>
                                        <Text className="text-sm text-text-secondary truncate">{beat.producer_name || 'Unknown'}</Text>
                                    </View>
                                    <View className="bg-primary/10 px-2 py-1 rounded-md">
                                        <Text className="text-primary font-bold text-sm">${beat.price}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>

                {/* Curated */}
                <View className="mt-8 px-4">
                    <View className="flex-row justify-between items-center mb-4">
                        <Text className="text-xl font-bold text-slate-900 dark:text-primary">Curated for You</Text>
                        <Text className="text-primary text-sm font-semibold">See all</Text>
                    </View>
                    <View className="gap-3">
                        {playlists.map((playlist) => (
                            <TouchableOpacity key={playlist.id} className="flex-row items-center gap-4 p-2 rounded-xl bg-white dark:bg-card-dark/50">
                                <View className="w-16 h-16 rounded-lg overflow-hidden shrink-0">
                                    {playlist.cover_art_url ? (
                                        <Image source={{ uri: playlist.cover_art_url }} className="w-full h-full" />
                                    ) : (
                                        <View className="w-full h-full bg-gray-800" />
                                    )}
                                </View>
                                <View className="flex-1">
                                    <Text className="text-base font-bold text-slate-900 dark:text-white truncate">{playlist.name}</Text>
                                    <Text className="text-sm text-text-secondary truncate">Curated Playlist</Text>
                                </View>
                                <View className="w-8 h-8 justify-center items-center rounded-full border border-slate-200 dark:border-white/10">
                                    <Text className="text-slate-400 dark:text-white">▶</Text>
                                </View>
                            </TouchableOpacity>
                        ))}
                        {playlists.length === 0 && (
                            <Text className="text-text-secondary text-center py-4">No playlists found</Text>
                        )}
                    </View>
                </View>

            </ScrollView>
            <BottomTabs />
        </View>
    );
}
