
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function CollabRadar() {
    const router = useRouter();
    const [viewMode, setViewMode] = useState<'map' | 'list'>('list');

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="sticky top-0 z-50 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md pt-12 pb-2">
                <View className="flex-row items-center p-4 justify-between">
                    <View className="w-10 h-10 rounded-full border border-slate-200 dark:border-white/10 overflow-hidden bg-zinc-800">
                        {/* Avatar Placeholder */}
                    </View>
                    <Text className="text-lg font-bold text-slate-900 dark:text-white uppercase tracking-wide">Collab Radar</Text>
                    <TouchableOpacity className="relative w-10 h-10 items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-white/5">
                        <Text className="material-symbols-outlined text-2xl text-slate-900 dark:text-white">notifications</Text>
                        <View className="absolute top-2 right-2 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background-light dark:border-background-dark" />
                    </TouchableOpacity>
                </View>

                {/* Toggle */}
                <View className="px-4 py-2">
                    <View className="flex-row h-12 w-full items-center justify-center rounded-full bg-slate-200 dark:bg-surface-dark p-1 relative">
                        <TouchableOpacity
                            onPress={() => setViewMode('map')}
                            className={`flex-1 flex-row items-center justify-center rounded-full h-full gap-2 transition-all ${viewMode === 'map' ? 'bg-primary shadow-sm' : ''}`}
                        >
                            <Text className={`material-symbols-outlined text-lg ${viewMode === 'map' ? 'text-white' : 'text-slate-500'}`}>map</Text>
                            <Text className={`text-sm font-bold ${viewMode === 'map' ? 'text-white' : 'text-slate-500'}`}>Radar Map</Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                            onPress={() => setViewMode('list')}
                            className={`flex-1 flex-row items-center justify-center rounded-full h-full gap-2 transition-all ${viewMode === 'list' ? 'bg-primary shadow-sm' : ''}`}
                        >
                            <Text className={`material-symbols-outlined text-lg ${viewMode === 'list' ? 'text-white' : 'text-slate-500'}`}>list</Text>
                            <Text className={`text-sm font-bold ${viewMode === 'list' ? 'text-white' : 'text-slate-500'}`}>Briefs List</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Filters */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 8 }} className="py-2">
                    <TouchableOpacity className="h-9 px-4 rounded-full bg-primary flex-row items-center gap-2">
                        <Text className="material-symbols-outlined text-white text-base">tune</Text>
                        <Text className="text-white text-sm font-bold">Filters</Text>
                    </TouchableOpacity>
                    {['Hip-Hop', 'Over $500', 'Vocals Needed', 'Remote'].map((f) => (
                        <TouchableOpacity key={f} className="h-9 px-4 rounded-full bg-white dark:bg-surface-dark border border-slate-200 dark:border-white/10 flex-row items-center">
                            <Text className="text-slate-600 dark:text-zinc-300 text-sm font-medium">{f}</Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Main Content */}
            <ScrollView className="flex-1 p-4 gap-5 pb-24">
                {/* Map Preview (Only visible in list mode as a persistent widget) */}
                {viewMode === 'list' && (
                    <TouchableOpacity onPress={() => setViewMode('map')} className="relative w-full h-48 rounded-xl overflow-hidden border border-slate-200 dark:border-white/5 shadow-inner">
                        <View className="absolute inset-0 bg-zinc-900 opacity-80" />
                        <View className="absolute inset-0 flex items-center justify-center">
                            <View className="w-32 h-32 rounded-full border border-primary/20 relative items-center justify-center">
                                <View className="absolute inset-0 rounded-full border border-primary/20 scale-150 opacity-50" />
                                <View className="w-3 h-3 rounded-full bg-primary shadow-[0_0_10px_#f2a20d]" />
                            </View>
                        </View>
                        <View className="absolute bottom-3 left-3 bg-black/60 backdrop-blur-md px-3 py-1 rounded-full border border-white/10 flex-row items-center gap-2">
                            <View className="w-2 h-2 rounded-full bg-green-500" />
                            <Text className="text-xs font-bold text-white">12 Opportunities Nearby</Text>
                        </View>
                    </TouchableOpacity>
                )}

                <View className="flex-row items-center justify-between mt-2">
                    <Text className="text-xl font-bold text-slate-900 dark:text-white">Latest Briefs</Text>
                    <Text className="text-xs font-bold text-primary">View All</Text>
                </View>

                {/* Brief Card 1 */}
                <View className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm gap-4">
                    <View className="flex-row justify-between">
                        <View className="flex-row gap-3">
                            <View className="w-10 h-10 rounded-full bg-zinc-700 bg-cover bg-center border border-slate-100 dark:border-white/10" />
                            <View>
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-sm font-bold text-slate-900 dark:text-white">@LilProducer</Text>
                                    <Text className="material-symbols-outlined text-blue-500 text-[14px]">verified</Text>
                                </View>
                                <Text className="text-xs text-slate-500 dark:text-gray-400">2h left • 2.5 mi away</Text>
                            </View>
                        </View>
                        <Text className="material-symbols-outlined text-slate-400">bookmark_border</Text>
                    </View>
                    <View>
                        <Text className="text-lg font-bold text-slate-900 dark:text-white mb-1">Summer Single Production</Text>
                        <Text className="text-sm text-slate-500 dark:text-gray-400 leading-relaxed" numberOfLines={2}>
                            Looking for a high-energy beat with summer vibes. Need mixing and mastering included. References: Drake, Bad Bunny.
                        </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                        <View className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <Text className="text-xs font-medium text-slate-600 dark:text-gray-300">Trap/RnB</Text>
                        </View>
                        <View className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <Text className="text-xs font-medium text-slate-600 dark:text-gray-300">Vocals</Text>
                        </View>
                    </View>
                    <View className="h-px bg-slate-200 dark:bg-white/5" />
                    <View className="flex-row justify-between items-center pt-1">
                        <View>
                            <Text className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Budget</Text>
                            <Text className="text-xl font-bold text-primary">$1,500</Text>
                        </View>
                        <TouchableOpacity className="h-10 px-6 rounded-full bg-primary items-center justify-center shadow-lg shadow-primary/20">
                            <Text className="text-white font-bold text-sm">Apply Now</Text>
                        </TouchableOpacity>
                    </View>
                </View>

                {/* Brief Card 2 */}
                <View className="bg-white dark:bg-surface-dark p-5 rounded-xl border border-slate-200 dark:border-white/5 shadow-sm gap-4">
                    <View className="flex-row justify-between">
                        <View className="flex-row gap-3">
                            <View className="w-10 h-10 rounded-full bg-zinc-700 bg-cover bg-center border border-slate-100 dark:border-white/10" />
                            <View>
                                <View className="flex-row items-center gap-1">
                                    <Text className="text-sm font-bold text-slate-900 dark:text-white">@SarahKeys</Text>
                                </View>
                                <Text className="text-xs text-slate-500 dark:text-gray-400">5h left • Remote</Text>
                            </View>
                        </View>
                        <Text className="material-symbols-outlined text-slate-400">bookmark_border</Text>
                    </View>
                    <View>
                        <Text className="text-lg font-bold text-slate-900 dark:text-white mb-1">Keyboardist for Jazz Session</Text>
                        <Text className="text-sm text-slate-500 dark:text-gray-400 leading-relaxed" numberOfLines={2}>
                            Remote session work for upcoming EP. Need soulful chords and a solo section.
                        </Text>
                    </View>
                    <View className="flex-row flex-wrap gap-2">
                        <View className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <Text className="text-xs font-medium text-slate-600 dark:text-gray-300">Jazz</Text>
                        </View>
                        <View className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/5">
                            <Text className="text-xs font-medium text-slate-600 dark:text-gray-300">Session</Text>
                        </View>
                    </View>
                    <View className="h-px bg-slate-200 dark:bg-white/5" />
                    <View className="flex-row justify-between items-center pt-1">
                        <View>
                            <Text className="text-xs text-slate-400 uppercase font-semibold tracking-wider">Budget</Text>
                            <Text className="text-xl font-bold text-primary">$450</Text>
                        </View>
                        <TouchableOpacity className="h-10 px-6 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 items-center justify-center">
                            <Text className="text-slate-900 dark:text-white font-bold text-sm">Details</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>
        </View>
    );
}
