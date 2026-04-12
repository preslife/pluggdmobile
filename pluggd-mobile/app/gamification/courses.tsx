
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { BottomTabs } from '../../components/BottomTabs';

export default function Courses() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="sticky top-0 z-50 flex-row items-center bg-background-light dark:bg-background-dark p-4 pt-12 pb-2 justify-between border-b border-zinc-200 dark:border-[#29221c]">
                <View className="flex-row items-center gap-3">
                    <View className="items-center justify-center w-8 h-8 rounded-full bg-primary">
                        <Text className="material-symbols-outlined text-lg text-white">bolt</Text>
                    </View>
                    <Text className="text-slate-900 dark:text-white text-lg font-bold">Pluggd Academy</Text>
                </View>
                <View className="flex-row items-center gap-3">
                    <TouchableOpacity className="w-10 h-10 items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-[#29221c]">
                        <Text className="material-symbols-outlined text-2xl text-slate-900 dark:text-white">search</Text>
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView className="flex-1 pb-24" showsVerticalScrollIndicator={false}>
                {/* Greeting */}
                <View className="px-4 pt-6 pb-2">
                    <Text className="text-slate-900 dark:text-white text-[28px] font-bold">Welcome back, Jay</Text>
                    <Text className="text-[#9d8b7c] text-sm font-medium pt-1">You're on a 3-day streak! 🔥</Text>
                </View>

                {/* Continue Learning */}
                <View className="py-4 gap-3">
                    <View className="flex-row justify-between items-center px-4">
                        <Text className="text-slate-900 dark:text-white text-lg font-bold">Continue Learning</Text>
                        <Text className="text-primary text-sm font-bold">See All</Text>
                    </View>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 16 }}>
                        {/* Card 1 */}
                        <TouchableOpacity className="w-[240px] gap-3">
                            <View className="relative w-full aspect-video rounded-xl bg-zinc-800 overflow-hidden">
                                {/* Placeholder */}
                                <View className="absolute inset-0 bg-blue-900/40 items-center justify-center">
                                    <Text className="material-symbols-outlined text-white/50 text-4xl">graphic_eq</Text>
                                </View>
                                <View className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-1 flex-row items-center gap-1">
                                    <Text className="material-symbols-outlined text-primary text-[14px]">timer</Text>
                                    <Text className="text-white text-[10px] font-bold">12m left</Text>
                                </View>
                            </View>
                            <View className="gap-1">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-slate-900 dark:text-white text-base font-bold truncate">Mixing Trap Beats</Text>
                                    <Text className="text-primary text-xs font-bold">75%</Text>
                                </View>
                                <View className="w-full bg-zinc-200 dark:bg-[#29221c] rounded-full h-1.5">
                                    <View className="bg-primary h-1.5 rounded-full w-[75%]" />
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Card 2 */}
                        <TouchableOpacity className="w-[240px] gap-3">
                            <View className="relative w-full aspect-video rounded-xl bg-zinc-800 overflow-hidden">
                                {/* Placeholder */}
                                <View className="absolute inset-0 bg-purple-900/40 items-center justify-center">
                                    <Text className="material-symbols-outlined text-white/50 text-4xl">gavel</Text>
                                </View>
                                <View className="absolute top-2 right-2 bg-black/60 rounded-full px-2 py-1 flex-row items-center gap-1">
                                    <Text className="material-symbols-outlined text-primary text-[14px]">timer</Text>
                                    <Text className="text-white text-[10px] font-bold">45m left</Text>
                                </View>
                            </View>
                            <View className="gap-1">
                                <View className="flex-row justify-between items-center">
                                    <Text className="text-slate-900 dark:text-white text-base font-bold truncate">Music Law 101</Text>
                                    <Text className="text-primary text-xs font-bold">20%</Text>
                                </View>
                                <View className="w-full bg-zinc-200 dark:bg-[#29221c] rounded-full h-1.5">
                                    <View className="bg-primary h-1.5 rounded-full w-[20%]" />
                                </View>
                            </View>
                        </TouchableOpacity>
                    </ScrollView>
                </View>

                {/* Catalog */}
                <View className="px-4 gap-4">
                    <Text className="text-slate-900 dark:text-white text-lg font-bold">Browse Catalog</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }} className="pb-2">
                        {['All', 'Beats', 'Mixing', 'Marketing', 'Theory'].map((cat, i) => (
                            <TouchableOpacity
                                key={cat}
                                className={`h-8 px-4 rounded-full items-center justify-center ${i === 0 ? 'bg-primary' : 'bg-zinc-200 dark:bg-[#29221c]'}`}
                            >
                                <Text className={`text-sm font-bold ${i === 0 ? 'text-white' : 'text-slate-600 dark:text-[#9d8b7c]'}`}>{cat}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>

                    <View className="gap-4">
                        {/* Catalog Item 1 */}
                        <TouchableOpacity className="bg-white dark:bg-[#221910] p-3 rounded-2xl flex-row gap-4 shadow-sm border border-transparent dark:border-[#29221c]">
                            <View className="w-24 h-24 rounded-xl bg-zinc-800 relative overflow-hidden">
                                <View className="absolute inset-0 bg-orange-900/40 items-center justify-center">
                                    <Text className="material-symbols-outlined text-white/50 text-3xl">mic_external_on</Text>
                                </View>
                                <View className="absolute top-2 left-2 bg-primary px-2 py-0.5 rounded-full">
                                    <Text className="text-white text-[10px] font-bold">PRO</Text>
                                </View>
                            </View>
                            <View className="flex-1 justify-center gap-1">
                                <Text className="text-slate-900 dark:text-white text-lg font-bold">Mastering with Metro</Text>
                                <Text className="text-[#9d8b7c] text-sm" numberOfLines={2}>Learn the secrets of industry standard mastering from the legend himself.</Text>
                                <View className="flex-row gap-4 mt-2">
                                    <View className="flex-row items-center gap-1">
                                        <Text className="material-symbols-outlined text-[#9d8b7c] text-xs">library_books</Text>
                                        <Text className="text-[#9d8b7c] text-xs font-medium">12 Lessons</Text>
                                    </View>
                                    <View className="flex-row items-center gap-1">
                                        <Text className="material-symbols-outlined text-[#9d8b7c] text-xs">schedule</Text>
                                        <Text className="text-[#9d8b7c] text-xs font-medium">2h 15m</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>

                        {/* Catalog Item 2 */}
                        <TouchableOpacity className="bg-white dark:bg-[#221910] p-3 rounded-2xl flex-row gap-4 shadow-sm border border-transparent dark:border-[#29221c]">
                            <View className="w-24 h-24 rounded-xl bg-zinc-800 relative overflow-hidden">
                                <View className="absolute inset-0 bg-green-900/40 items-center justify-center">
                                    <Text className="material-symbols-outlined text-white/50 text-3xl">groups</Text>
                                </View>
                                <View className="absolute top-2 left-2 bg-white px-2 py-0.5 rounded-full">
                                    <Text className="text-black text-[10px] font-bold">FREE</Text>
                                </View>
                            </View>
                            <View className="flex-1 justify-center gap-1">
                                <Text className="text-slate-900 dark:text-white text-lg font-bold">Building Your Fanbase</Text>
                                <Text className="text-[#9d8b7c] text-sm" numberOfLines={2}>Essential marketing strategies for independent artists.</Text>
                                <View className="flex-row gap-4 mt-2">
                                    <View className="flex-row items-center gap-1">
                                        <Text className="material-symbols-outlined text-[#9d8b7c] text-xs">library_books</Text>
                                        <Text className="text-[#9d8b7c] text-xs font-medium">5 Lessons</Text>
                                    </View>
                                    <View className="flex-row items-center gap-1">
                                        <Text className="material-symbols-outlined text-[#9d8b7c] text-xs">schedule</Text>
                                        <Text className="text-[#9d8b7c] text-xs font-medium">45m</Text>
                                    </View>
                                </View>
                            </View>
                        </TouchableOpacity>
                    </View>
                </View>
            </ScrollView>

            <BottomTabs />
        </View>
    );
}
