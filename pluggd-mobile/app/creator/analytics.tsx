
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function Analytics() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Top App Bar */}
            <View className="sticky top-0 z-50 flex-row items-center justify-between bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md px-4 py-3 pt-12">
                <TouchableOpacity onPress={() => router.back()} className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                    <Text className="material-symbols-outlined text-2xl text-slate-900 dark:text-white">arrow_back</Text>
                </TouchableOpacity>
                <Text className="text-lg font-bold tracking-tight text-slate-900 dark:text-white">Analytics</Text>
                <TouchableOpacity className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                    <Text className="material-symbols-outlined text-2xl text-slate-900 dark:text-white">more_horiz</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 pb-24">
                {/* Period Filter */}
                <View className="px-4 py-2 mb-2">
                    <TouchableOpacity className="flex-row items-center gap-x-2 rounded-full bg-stone-200 dark:bg-surface-dark border border-transparent dark:border-white/5 px-4 h-9 self-start">
                        <Text className="text-sm font-medium text-slate-900 dark:text-white">Last 28 Days</Text>
                        <Text className="material-symbols-outlined text-sm text-slate-900 dark:text-white">expand_more</Text>
                    </TouchableOpacity>
                </View>

                {/* Stats Grid */}
                <View className="px-4 mb-6">
                    <View className="flex-row flex-wrap gap-3">
                        {/* Main Stat: Total Streams */}
                        <View className="w-full p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-transparent dark:border-white/5 shadow-sm">
                            <View className="flex-row justify-between items-start mb-2">
                                <Text className="text-stone-500 dark:text-stone-400 font-medium text-sm">Total Streams</Text>
                                <View className="flex-row items-center gap-1 bg-primary/10 px-2 py-0.5 rounded-full">
                                    <Text className="material-symbols-outlined text-sm font-bold text-primary">trending_up</Text>
                                    <Text className="text-xs font-bold text-primary">+5.4%</Text>
                                </View>
                            </View>
                            <Text className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">1.2M</Text>
                            <Text className="text-xs text-stone-400">vs. previous 28 days</Text>
                        </View>

                        <View className="flex-row w-full gap-3">
                            {/* Secondary Stat: Revenue */}
                            <View className="flex-1 p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-transparent dark:border-white/5 shadow-sm justify-between h-32">
                                <Text className="text-stone-500 dark:text-stone-400 font-medium text-sm">Revenue</Text>
                                <View>
                                    <Text className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">$4,250</Text>
                                    <View className="flex-row items-center gap-1">
                                        <Text className="material-symbols-outlined text-base text-primary">trending_up</Text>
                                        <Text className="text-sm font-bold text-primary">+12%</Text>
                                    </View>
                                </View>
                            </View>

                            {/* Secondary Stat: Fan Growth */}
                            <View className="flex-1 p-5 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-transparent dark:border-white/5 shadow-sm justify-between h-32">
                                <Text className="text-stone-500 dark:text-stone-400 font-medium text-sm">Fan Growth</Text>
                                <View>
                                    <Text className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white mb-1">+850</Text>
                                    <View className="flex-row items-center gap-1">
                                        <Text className="material-symbols-outlined text-base text-primary">trending_up</Text>
                                        <Text className="text-sm font-bold text-primary">+2.1%</Text>
                                    </View>
                                </View>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Chart Section (Simplified for Mobile) */}
                <View className="px-4 mb-8">
                    <View className="p-6 rounded-[2rem] bg-surface-light dark:bg-surface-dark border border-transparent dark:border-white/5 shadow-sm">
                        <View className="flex-row justify-between items-end mb-6">
                            <View>
                                <Text className="text-stone-500 dark:text-stone-400 text-sm font-medium mb-1">Streaming Trends</Text>
                                <Text className="text-2xl font-bold text-slate-900 dark:text-white">Daily Activity</Text>
                            </View>
                            <View className="w-8 h-8 rounded-full bg-primary items-center justify-center">
                                <Text className="material-symbols-outlined text-lg text-white">show_chart</Text>
                            </View>
                        </View>

                        {/* Mock Chart Bars */}
                        <View className="h-[180px] flex-row items-end justify-between px-2">
                            {[30, 45, 60, 40, 80, 55, 70].map((h, i) => (
                                <View key={i} className="flex-col items-center gap-2">
                                    <View className="w-2 rounded-full bg-primary" style={{ height: `${h}%` }} />
                                </View>
                            ))}
                        </View>
                        <View className="flex-row justify-between mt-4 px-2">
                            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                                <Text key={i} className="text-[11px] font-bold text-stone-500 uppercase tracking-wider">{d}</Text>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Top Locations */}
                <View className="px-4">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-xl font-bold tracking-tight text-slate-900 dark:text-white">Top Locations</Text>
                        <Text className="text-primary text-sm font-medium">View All</Text>
                    </View>
                    <View className="gap-4">
                        {[
                            { country: 'United States', flag: '🇺🇸', pct: '45%' },
                            { country: 'United Kingdom', flag: '🇬🇧', pct: '20%' },
                            { country: 'Germany', flag: '🇩🇪', pct: '10%' },
                            { country: 'Brazil', flag: '🇧🇷', pct: '8%' },
                        ].map((loc, i) => (
                            <View key={i}>
                                <View className="flex-row justify-between items-center mb-2">
                                    <View className="flex-row items-center gap-3">
                                        <View className="w-8 h-8 rounded-full bg-stone-200 dark:bg-stone-800 items-center justify-center">
                                            <Text className="text-lg">{loc.flag}</Text>
                                        </View>
                                        <Text className="font-medium text-slate-900 dark:text-white">{loc.country}</Text>
                                    </View>
                                    <Text className="font-bold text-slate-900 dark:text-white">{loc.pct}</Text>
                                </View>
                                <View className="h-2 w-full bg-stone-200 dark:bg-stone-800 rounded-full overflow-hidden">
                                    <View className="h-full bg-primary rounded-full" style={{ width: loc.pct as any }} />
                                </View>
                            </View>
                        ))}
                    </View>
                </View>
                <View className="h-20" />
            </ScrollView>

            {/* Bottom Nav (Mock) */}
            <View className="absolute bottom-0 left-0 w-full bg-surface-light dark:bg-[#1a130c] border-t border-stone-200 dark:border-white/5 pt-2 pb-8 px-6 flex-row justify-between items-center z-50">
                <TouchableOpacity onPress={() => router.push('/')} className="items-center gap-1 w-16">
                    <Text className="material-symbols-outlined text-2xl text-stone-400 dark:text-stone-500">home</Text>
                    <Text className="text-[10px] font-medium text-stone-400 dark:text-stone-500">Home</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/creator/upload')} className="items-center gap-1 w-16">
                    <Text className="material-symbols-outlined text-2xl text-stone-400 dark:text-stone-500">upload</Text>
                    <Text className="text-[10px] font-medium text-stone-400 dark:text-stone-500">Upload</Text>
                </TouchableOpacity>
                <TouchableOpacity className="items-center gap-1 w-16">
                    <Text className="material-symbols-outlined text-2xl text-primary">analytics</Text>
                    <Text className="text-[10px] font-medium text-primary">Analytics</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/profile')} className="items-center gap-1 w-16">
                    <Text className="material-symbols-outlined text-2xl text-stone-400 dark:text-stone-500">person</Text>
                    <Text className="text-[10px] font-medium text-stone-400 dark:text-stone-500">Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
