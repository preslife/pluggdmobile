
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';

export default function Quests() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="sticky top-0 z-50 bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-md border-b border-zinc-200 dark:border-white/5 p-4 pt-12 pb-2 flex-row justify-between items-center">
                <Text className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Quests</Text>
                <View className="flex-row items-center gap-3">
                    <View className="flex-row items-center gap-1.5 rounded-full bg-surface-dark dark:bg-white/10 px-3 py-1">
                        <Text className="material-symbols-outlined text-primary text-lg">bolt</Text>
                        <Text className="text-sm font-bold text-white">Lvl 12</Text>
                    </View>
                    <View className="h-10 w-10 rounded-full border-2 border-primary overflow-hidden bg-zinc-800">
                        {/* Avatar Placeholder */}
                    </View>
                </View>
            </View>

            <ScrollView className="flex-1 pb-24" showsVerticalScrollIndicator={false}>
                {/* Streak Hero Card */}
                <View className="px-4 pt-6 pb-2">
                    <View className="relative overflow-hidden rounded-2xl bg-surface-dark dark:bg-[#111] p-6 shadow-lg border border-white/5">
                        <View className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-primary/20 blur-3xl"></View>
                        <View className="relative z-10 flex-row items-center justify-between">
                            <View className="gap-2">
                                <View className="self-start rounded-full bg-primary/20 px-2.5 py-0.5">
                                    <Text className="text-xs font-bold uppercase tracking-wider text-primary">Daily Streak</Text>
                                </View>
                                <Text className="text-4xl font-extrabold tracking-tight text-white">12 Days</Text>
                                <Text className="text-sm font-medium text-zinc-400">You are on fire! Keep it up.</Text>
                            </View>
                            <View className="h-20 w-20 items-center justify-center rounded-full bg-primary shadow-lg shadow-orange-500/30">
                                <Text className="material-symbols-outlined text-white text-5xl">local_fire_department</Text>
                            </View>
                        </View>

                        {/* Weekly Tracker */}
                        <View className="mt-6 flex-row justify-between gap-1">
                            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((d, i) => (
                                <View key={i} className="items-center gap-2">
                                    <Text className={`text-[10px] font-medium ${i === 4 ? 'text-white font-bold' : 'text-zinc-500'}`}>{d}</Text>
                                    <View className={`h-8 w-2 rounded-full ${i < 4 ? 'bg-primary' : i === 4 ? 'bg-white' : 'bg-white/10'}`} />
                                </View>
                            ))}
                        </View>
                    </View>
                </View>

                {/* Daily Quests */}
                <View className="mt-4 px-4">
                    <View className="flex-row items-center justify-between py-2 mb-2">
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">Daily Quests</Text>
                        <Text className="text-xs font-medium text-zinc-400">Resets in 4h 12m</Text>
                    </View>
                    <View className="gap-3">
                        {/* Quest 1 */}
                        <View className="rounded-xl bg-white dark:bg-[#111] p-4 border border-zinc-200 dark:border-white/5">
                            <View className="flex-row justify-between items-start">
                                <View className="flex-row items-center gap-3">
                                    <View className="h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-surface-dark border border-zinc-200 dark:border-white/10">
                                        <Text className="material-symbols-outlined text-primary text-xl">headphones</Text>
                                    </View>
                                    <View>
                                        <Text className="text-base font-bold text-slate-900 dark:text-white">Listen to 5 Beats</Text>
                                        <Text className="text-xs text-zinc-500 dark:text-zinc-400">+50 XP Reward</Text>
                                    </View>
                                </View>
                                <Text className="text-sm font-bold text-slate-900 dark:text-white">3/5</Text>
                            </View>
                            <View className="mt-4 h-2 w-full bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <View className="h-full bg-primary w-[60%]" />
                            </View>
                        </View>

                        {/* Quest 2 */}
                        <View className="rounded-xl bg-white dark:bg-[#111] p-4 border border-zinc-200 dark:border-white/5">
                            <View className="flex-row justify-between items-start">
                                <View className="flex-row items-center gap-3">
                                    <View className="h-10 w-10 items-center justify-center rounded-full bg-zinc-100 dark:bg-surface-dark border border-zinc-200 dark:border-white/10">
                                        <Text className="material-symbols-outlined text-primary text-xl">forum</Text>
                                    </View>
                                    <View>
                                        <Text className="text-base font-bold text-slate-900 dark:text-white">Post in Hub</Text>
                                        <Text className="text-xs text-zinc-500 dark:text-zinc-400">+100 XP Reward</Text>
                                    </View>
                                </View>
                                <TouchableOpacity className="h-8 px-4 rounded-full bg-zinc-100 dark:bg-white/10 items-center justify-center">
                                    <Text className="text-xs font-bold text-slate-900 dark:text-white">Go</Text>
                                </TouchableOpacity>
                            </View>
                            <View className="mt-4 h-2 w-full bg-zinc-100 dark:bg-white/10 rounded-full overflow-hidden">
                                <View className="h-full bg-primary w-0" />
                            </View>
                        </View>
                    </View>
                </View>

                {/* Achievements */}
                <View className="mt-8 px-4 pb-8">
                    <View className="flex-row items-center justify-between mb-4">
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">Trophies</Text>
                        <Text className="text-sm font-medium text-primary">View All</Text>
                    </View>
                    <View className="flex-row flex-wrap justify-between gap-y-3">
                        <View className="w-[48%] items-center justify-center rounded-xl bg-white dark:bg-[#111] p-4 border border-primary/20 shadow-sm">
                            <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-primary/10 border border-primary/30">
                                <Text className="material-symbols-outlined text-primary text-3xl">rocket_launch</Text>
                            </View>
                            <Text className="text-sm font-bold text-slate-900 dark:text-white text-center">Early Adopter</Text>
                            <Text className="text-[10px] text-zinc-400 mt-1 text-center">Joined in 2023</Text>
                        </View>

                        <View className="w-[48%] items-center justify-center rounded-xl bg-white dark:bg-[#111] p-4 border border-zinc-200 dark:border-white/5 opacity-70">
                            <View className="absolute top-2 right-2 h-6 w-6 items-center justify-center rounded-full bg-black/10 dark:bg-black/40">
                                <Text className="material-symbols-outlined text-xs text-zinc-500">lock</Text>
                            </View>
                            <View className="mb-3 h-16 w-16 items-center justify-center rounded-full bg-zinc-100 dark:bg-white/5 border border-zinc-200 dark:border-white/10">
                                <Text className="material-symbols-outlined text-zinc-400 text-3xl">piano</Text>
                            </View>
                            <Text className="text-sm font-bold text-zinc-400 text-center">Beat Maker</Text>
                            <Text className="text-[10px] text-zinc-400 mt-1 text-center">Upload 10 beats</Text>
                        </View>
                    </View>
                </View>
            </ScrollView>

            {/* Bottom Nav (Mock) */}
            <View className="absolute bottom-0 left-0 w-full bg-surface-light dark:bg-[#050505] border-t border-zinc-200 dark:border-white/5 pt-2 pb-8 px-6 flex-row justify-between items-center z-50">
                <TouchableOpacity onPress={() => router.push('/')} className="items-center gap-1">
                    <Text className="material-symbols-outlined text-2xl text-zinc-400">home</Text>
                    <Text className="text-[10px] font-medium text-zinc-400">Home</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/gamification/courses')} className="items-center gap-1">
                    <Text className="material-symbols-outlined text-2xl text-zinc-400">school</Text>
                    <Text className="text-[10px] font-medium text-zinc-400">Academy</Text>
                </TouchableOpacity>
                <TouchableOpacity className="items-center gap-1">
                    <Text className="material-symbols-outlined text-2xl text-primary">trophy</Text>
                    <Text className="text-[10px] font-medium text-primary">Quests</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => router.push('/profile')} className="items-center gap-1">
                    <Text className="material-symbols-outlined text-2xl text-zinc-400">person</Text>
                    <Text className="text-[10px] font-medium text-zinc-400">Profile</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
