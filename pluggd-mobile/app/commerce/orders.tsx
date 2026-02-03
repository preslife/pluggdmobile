
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';

export default function Orders() {
    const router = useRouter();
    const [filter, setFilter] = useState('All');

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="sticky top-0 z-30 flex-row items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pt-12 pb-2 justify-between border-b border-zinc-200 dark:border-white/5">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10">
                    <Text className="material-symbols-outlined text-2xl text-slate-900 dark:text-white">arrow_back_ios_new</Text>
                </TouchableOpacity>
                <Text className="text-slate-900 dark:text-white text-lg font-bold">Purchase History</Text>
                <View className="w-10 h-10 items-center justify-center">
                    <Text className="material-symbols-outlined text-2xl text-slate-900 dark:text-white">tune</Text>
                </View>
            </View>

            {/* Filter Chips */}
            <View className="pt-2 pb-4 px-4 flex-row gap-3">
                {['All', 'Beats', 'Tickets', 'Tips'].map((f) => (
                    <TouchableOpacity
                        key={f}
                        onPress={() => setFilter(f)}
                        className={`h-9 px-5 rounded-full items-center justify-center ${filter === f ? 'bg-primary' : 'bg-stone-200 dark:bg-white/10'}`}
                    >
                        <Text className={`text-sm font-bold ${filter === f ? 'text-white' : 'text-slate-700 dark:text-white'}`}>{f}</Text>
                    </TouchableOpacity>
                ))}
            </View>

            <ScrollView className="flex-1 px-4 gap-4 pb-32">
                {/* Order Item 1 */}
                <TouchableOpacity className="bg-white dark:bg-white/5 p-4 rounded-xl border border-zinc-100 dark:border-white/5 flex-row gap-3">
                    <View className="h-[70px] w-[70px] rounded-lg bg-zinc-800 bg-center bg-cover overflow-hidden relative">
                        {/* Placeholder art */}
                        <View className="absolute inset-0 bg-indigo-900/50 items-center justify-center">
                            <Text className="material-symbols-outlined text-white/50 text-3xl">album</Text>
                        </View>
                    </View>
                    <View className="flex-1 justify-center">
                        <View className="flex-row justify-between items-start">
                            <View className="flex-1 mr-2">
                                <Text className="text-slate-900 dark:text-white text-base font-bold truncate">Trap Soul Vol. 1</Text>
                                <Text className="text-slate-500 dark:text-zinc-400 text-xs font-medium mt-1">Prod. by Metro X • Nov 12, 2023</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-primary text-lg font-extrabold">$29.99</Text>
                                <View className="bg-stone-100 dark:bg-white/10 px-1.5 py-0.5 rounded mt-1">
                                    <Text className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase">Beat</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity className="flex-row items-center gap-1 mt-2">
                            <Text className="material-symbols-outlined text-primary text-base">download</Text>
                            <Text className="text-primary text-xs font-bold uppercase tracking-wide">Download Receipt</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>

                {/* Order Item 2 */}
                <TouchableOpacity className="bg-white dark:bg-white/5 p-4 rounded-xl border border-zinc-100 dark:border-white/5 flex-row gap-3">
                    <View className="h-[70px] w-[70px] rounded-lg bg-zinc-800 bg-center bg-cover overflow-hidden relative">
                        {/* Placeholder art */}
                        <View className="absolute inset-0 bg-red-900/50 items-center justify-center">
                            <Text className="material-symbols-outlined text-white/50 text-3xl">event</Text>
                        </View>
                    </View>
                    <View className="flex-1 justify-center">
                        <View className="flex-row justify-between items-start">
                            <View className="flex-1 mr-2">
                                <Text className="text-slate-900 dark:text-white text-base font-bold truncate">Live at the Roxy</Text>
                                <Text className="text-slate-500 dark:text-zinc-400 text-xs font-medium mt-1">Artist Y • Oct 20, 2023</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-primary text-lg font-extrabold">$45.00</Text>
                                <View className="bg-stone-100 dark:bg-white/10 px-1.5 py-0.5 rounded mt-1">
                                    <Text className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase">Ticket</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity className="flex-row items-center gap-1 mt-2">
                            <Text className="material-symbols-outlined text-primary text-base">download</Text>
                            <Text className="text-primary text-xs font-bold uppercase tracking-wide">Download Receipt</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>

                {/* Order Item 3 */}
                <TouchableOpacity className="bg-white dark:bg-white/5 p-4 rounded-xl border border-zinc-100 dark:border-white/5 flex-row gap-3">
                    <View className="h-[70px] w-[70px] rounded-lg bg-stone-100 dark:bg-white/10 items-center justify-center">
                        <Text className="material-symbols-outlined text-stone-400 dark:text-white/40 text-3xl">coffee</Text>
                    </View>
                    <View className="flex-1 justify-center">
                        <View className="flex-row justify-between items-start">
                            <View className="flex-1 mr-2">
                                <Text className="text-slate-900 dark:text-white text-base font-bold truncate">Coffee Support</Text>
                                <Text className="text-slate-500 dark:text-zinc-400 text-xs font-medium mt-1">To Artist Z • Oct 15, 2023</Text>
                            </View>
                            <View className="items-end">
                                <Text className="text-primary text-lg font-extrabold">$5.00</Text>
                                <View className="bg-stone-100 dark:bg-white/10 px-1.5 py-0.5 rounded mt-1">
                                    <Text className="text-[10px] font-bold text-slate-400 dark:text-white/30 uppercase">Tip</Text>
                                </View>
                            </View>
                        </View>
                        <TouchableOpacity className="flex-row items-center gap-1 mt-2">
                            <Text className="material-symbols-outlined text-primary text-base">download</Text>
                            <Text className="text-primary text-xs font-bold uppercase tracking-wide">Download Receipt</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </ScrollView>
        </View>
    );
}
