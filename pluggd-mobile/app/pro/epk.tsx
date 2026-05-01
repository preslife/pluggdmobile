
import { View, Text, TouchableOpacity, ScrollView, Image, Switch } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SymbolIcon } from '../../components/SymbolIcon';

export default function EPKBuilder() {
    const router = useRouter();
    const [showAnalytics, setShowAnalytics] = useState(true);

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="sticky top-0 z-50 flex-row items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pt-12 pb-2 justify-between border-b border-zinc-200 dark:border-white/5">
                <TouchableOpacity onPress={() => router.back()} className="w-10 h-10 items-center justify-center">
                    <SymbolIcon name="arrow_back_ios_new" className="text-2xl text-slate-900 dark:text-white" />
                </TouchableOpacity>
                <Text className="text-slate-900 dark:text-white text-lg font-bold">Edit Press Kit</Text>
                <TouchableOpacity className="items-center justify-center">
                    <Text className="text-primary text-base font-bold">Preview</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 px-4 pt-6 gap-6 pb-24">
                {/* Context Hint */}
                <View className="flex-row items-center justify-between px-1">
                    <Text className="text-slate-500 dark:text-zinc-500 text-xs font-bold uppercase tracking-wider">Drag to reorder sections</Text>
                    <SymbolIcon name="info" className="text-slate-400 text-sm" />
                </View>

                {/* Card 1: Press Photos */}
                <View className="relative bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                    {/* Header */}
                    <View className="pl-6 pr-4 pt-4 pb-2 flex-row justify-between items-center">
                        <Text className="text-slate-900 dark:text-white text-sm font-extrabold uppercase tracking-wider">Press Photos</Text>
                        <TouchableOpacity className="size-8 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
                            <SymbolIcon name="edit" className="text-primary text-lg" />
                        </TouchableOpacity>
                    </View>

                    {/* Content */}
                    <View className="pl-6 pr-4 pb-4">
                        <View className="flex-row flex-wrap gap-2">
                            {/* Photo 1 */}
                            <View className="w-[48%] aspect-square bg-zinc-800 rounded-lg overflow-hidden relative">
                                {/* Placeholder */}
                                <View className="absolute inset-0 bg-orange-900/40 items-center justify-center">
                                    <SymbolIcon name="image" className="text-white/50 text-2xl" />
                                </View>
                            </View>
                            {/* Photo 2 */}
                            <View className="w-[48%] aspect-square bg-zinc-800 rounded-lg overflow-hidden relative">
                                {/* Placeholder */}
                                <View className="absolute inset-0 bg-blue-900/40 items-center justify-center">
                                    <SymbolIcon name="image" className="text-white/50 text-2xl" />
                                </View>
                            </View>
                            {/* Add Photo */}
                            <TouchableOpacity className="w-[48%] aspect-square bg-slate-50 dark:bg-white/5 rounded-lg border border-dashed border-slate-300 dark:border-white/20 items-center justify-center gap-1">
                                <SymbolIcon name="add_circle" className="text-primary text-2xl" />
                                <Text className="text-[10px] text-slate-500 dark:text-zinc-500 font-bold uppercase">Add Photo</Text>
                            </TouchableOpacity>
                        </View>
                        <View className="flex-row items-center gap-1 mt-3">
                            <SymbolIcon name="check_circle" className="text-primary text-sm" />
                            <Text className="text-xs text-slate-500 dark:text-zinc-400 font-medium">3 Photos Selected</Text>
                        </View>
                    </View>

                    {/* Drag Handle (Visual) */}
                    <View className="absolute left-0 top-1/2 -translate-y-1/2 p-2 opacity-30">
                        <SymbolIcon name="drag_indicator" className="text-slate-400" />
                    </View>
                </View>

                {/* Card 2: Biography */}
                <View className="relative bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                    <View className="pl-6 pr-4 pt-4 pb-2 flex-row justify-between items-center">
                        <Text className="text-slate-900 dark:text-white text-sm font-extrabold uppercase tracking-wider">Biography</Text>
                        <TouchableOpacity className="size-8 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
                            <SymbolIcon name="edit" className="text-primary text-lg" />
                        </TouchableOpacity>
                    </View>
                    <View className="pl-6 pr-4 pb-4">
                        <View className="p-3 rounded-lg bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                            <Text className="text-slate-600 dark:text-zinc-300 text-sm leading-relaxed" numberOfLines={3}>
                                Rising from the underground scene of Atlanta, Pluggd artist 'Neon V' blends synthetic wave beats with gritty trap soul. His latest EP redefines the genre boundaries...
                            </Text>
                        </View>
                    </View>
                    <View className="absolute left-0 top-1/2 -translate-y-1/2 p-2 opacity-30">
                        <SymbolIcon name="drag_indicator" className="text-slate-400" />
                    </View>
                </View>

                {/* Card 3: Notable Press */}
                <View className="relative bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
                    <View className="pl-6 pr-4 pt-4 pb-2 flex-row justify-between items-center">
                        <Text className="text-slate-900 dark:text-white text-sm font-extrabold uppercase tracking-wider">Notable Press</Text>
                        <TouchableOpacity className="size-8 items-center justify-center rounded-full bg-slate-100 dark:bg-white/10">
                            <SymbolIcon name="edit" className="text-primary text-lg" />
                        </TouchableOpacity>
                    </View>
                    <View className="pl-6 pr-4 pb-4 gap-2">
                        <TouchableOpacity className="flex-row items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                            <View className="flex-row items-center gap-3">
                                <View className="size-8 rounded bg-white items-center justify-center shadow-sm">
                                    <Text className="font-bold text-xs text-black">P</Text>
                                </View>
                                <Text className="text-sm font-medium text-slate-700 dark:text-zinc-200">Pitchfork Review</Text>
                            </View>
                            <SymbolIcon name="open_in_new" className="text-slate-400 text-lg" />
                        </TouchableOpacity>
                        <TouchableOpacity className="flex-row items-center justify-between p-3 rounded-xl bg-slate-50 dark:bg-black/20 border border-slate-100 dark:border-white/5">
                            <View className="flex-row items-center gap-3">
                                <View className="size-8 rounded bg-white items-center justify-center shadow-sm">
                                    <Text className="font-bold text-xs text-black">C</Text>
                                </View>
                                <Text className="text-sm font-medium text-slate-700 dark:text-zinc-200">Complex Magazine</Text>
                            </View>
                            <SymbolIcon name="open_in_new" className="text-slate-400 text-lg" />
                        </TouchableOpacity>
                    </View>
                    <View className="absolute left-0 top-1/2 -translate-y-1/2 p-2 opacity-30">
                        <SymbolIcon name="drag_indicator" className="text-slate-400" />
                    </View>
                </View>

                {/* Analytics Toggle */}
                <View className="flex-row items-center justify-between p-4 rounded-2xl bg-gradient-to-r from-primary/10 to-transparent border border-primary/20 shadow-sm mb-4">
                    <View className="flex-row items-start gap-3">
                        <View className="p-2 rounded-full bg-primary/20">
                            <SymbolIcon name="analytics" className="text-primary" />
                        </View>
                        <View>
                            <Text className="text-slate-900 dark:text-white font-bold text-sm">Show Analytics</Text>
                            <Text className="text-slate-500 dark:text-zinc-400 text-xs mt-0.5">Include stream counts in your kit</Text>
                        </View>
                    </View>
                    <Switch
                        value={showAnalytics}
                        onValueChange={setShowAnalytics}
                        trackColor={{ false: '#767577', true: '#ec7f13' }}
                        thumbColor={'#fff'}
                    />
                </View>
            </ScrollView>

            {/* Footer Action */}
            <View className="absolute bottom-0 w-full bg-background-light/90 dark:bg-background-dark/90 backdrop-blur-xl border-t border-slate-200 dark:border-white/5 p-4 pb-8 z-40">
                <TouchableOpacity className="w-full bg-primary h-14 rounded-2xl flex-row items-center justify-center gap-2 shadow-lg shadow-primary/20">
                    <Text className="text-white font-bold text-lg">Generate Shareable Link</Text>
                    <SymbolIcon name="link" className="text-white text-xl" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
