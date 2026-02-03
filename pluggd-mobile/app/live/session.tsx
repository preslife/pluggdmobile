
import { View, Text, TouchableOpacity, ScrollView, TextInput, Image } from 'react-native';
import { useRouter } from 'expo-router';

export default function LiveSession() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-background-dark h-full">
            {/* Video Area */}
            <View className="relative w-full aspect-[4/3] bg-zinc-900">
                {/* Video Placeholder */}
                <View className="absolute inset-0 items-center justify-center">
                    <Text className="material-symbols-outlined text-white/20 text-6xl">videocam</Text>
                </View>
                <View className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/80 pointer-events-none" />

                {/* Top Bar */}
                <View className="absolute top-0 left-0 right-0 p-4 pt-12 flex-row items-center justify-between z-20">
                    <TouchableOpacity onPress={() => router.back()} className="size-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md">
                        <Text className="material-symbols-outlined text-white">arrow_back</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="size-10 items-center justify-center rounded-full bg-black/30 backdrop-blur-md">
                        <Text className="material-symbols-outlined text-white">more_horiz</Text>
                    </TouchableOpacity>
                </View>

                {/* Status Chips */}
                <View className="absolute bottom-4 left-4 flex-row gap-2 z-20">
                    <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/90 backdrop-blur-sm shadow-lg shadow-primary/20">
                        <View className="size-2 rounded-full bg-white opacity-100" />
                        <Text className="text-xs font-bold tracking-wider text-white">LIVE</Text>
                    </View>
                    <View className="flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur-sm border border-white/10">
                        <Text className="material-symbols-outlined text-white/80 text-[16px]">visibility</Text>
                        <Text className="text-xs font-medium text-white">12.5k</Text>
                    </View>
                </View>
            </View>

            {/* Content Area */}
            <View className="flex-1 bg-background-dark relative">
                {/* Tabs */}
                <View className="flex-row border-b border-white/10 px-6">
                    <TouchableOpacity className="flex-1 pb-3 pt-4 border-b-2 border-primary">
                        <Text className="text-white font-semibold text-sm tracking-wide text-center">Chat</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="flex-1 pb-3 pt-4 border-b-2 border-transparent">
                        <Text className="text-zinc-500 font-medium text-sm tracking-wide text-center">Q&A</Text>
                    </TouchableOpacity>
                </View>

                {/* Chat Stream */}
                <ScrollView className="flex-1 p-4" contentContainerStyle={{ gap: 16, paddingBottom: 100 }}>
                    {/* Message 1 */}
                    <View className="flex-row gap-3 items-start">
                        <View className="size-8 rounded-full bg-zinc-700" />
                        <View className="flex-1">
                            <View className="flex-row items-baseline gap-2">
                                <Text className="text-sm font-bold text-zinc-300">Marcus_ Beats</Text>
                                <Text className="text-[10px] text-zinc-600">2m</Text>
                            </View>
                            <Text className="text-sm text-zinc-200 leading-snug">The mix on those drums is crisp! 🔥 What plugin is that?</Text>
                        </View>
                    </View>

                    {/* Message 2 */}
                    <View className="flex-row gap-3 items-start">
                        <View className="size-8 rounded-full bg-zinc-700" />
                        <View className="flex-1">
                            <View className="flex-row items-baseline gap-2">
                                <Text className="text-sm font-bold text-zinc-300">SarahJ</Text>
                                <Text className="text-[10px] text-zinc-600">1m</Text>
                            </View>
                            <Text className="text-sm text-zinc-200 leading-snug">Can you play the unreleased track? Pls! 🙏</Text>
                        </View>
                    </View>

                    {/* Message 3 (Host) */}
                    <View className="flex-row gap-3 items-start bg-primary/10 -mx-4 px-4 py-2 border-l-2 border-primary">
                        <View className="size-8 rounded-full bg-zinc-700 border-2 border-primary" />
                        <View className="flex-1">
                            <View className="flex-row items-center gap-2">
                                <Text className="text-sm font-bold text-primary">ProdByAlex</Text>
                                <View className="bg-primary px-1.5 py-0.5 rounded">
                                    <Text className="text-white text-[9px] font-bold uppercase">Host</Text>
                                </View>
                            </View>
                            <Text className="text-sm text-white font-medium leading-snug">Thanks everyone for tuning in! Dropping that track next. 🎹</Text>
                        </View>
                    </View>

                    {/* Message 4 */}
                    <View className="flex-row gap-3 items-start">
                        <View className="size-8 rounded-full bg-zinc-700" />
                        <View className="flex-1">
                            <View className="flex-row items-baseline gap-2">
                                <Text className="text-sm font-bold text-zinc-300">TechnoKing</Text>
                                <Text className="text-[10px] text-zinc-600">Just now</Text>
                            </View>
                            <Text className="text-sm text-zinc-200 leading-snug">Let's gooooo 🚀🚀🚀</Text>
                        </View>
                    </View>
                </ScrollView>

                {/* Floating Reactions */}
                <View className="absolute right-4 bottom-24 items-center gap-4 z-20">
                    <TouchableOpacity className="size-12 rounded-full bg-surface-dark/80 items-center justify-center border border-white/5 shadow-lg">
                        <Text className="material-symbols-outlined text-orange-500 text-2xl">local_fire_department</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="size-12 rounded-full bg-surface-dark/80 items-center justify-center border border-white/5 shadow-lg">
                        <Text className="material-symbols-outlined text-red-500 text-2xl">favorite</Text>
                    </TouchableOpacity>
                </View>

                {/* Input Area */}
                <View className="w-full bg-surface-dark border-t border-white/10 p-4 pb-8 z-30">
                    <View className="flex-row items-center gap-3">
                        <View className="flex-1 relative">
                            <TextInput
                                placeholder="Say something..."
                                placeholderTextColor="#71717a"
                                className="w-full bg-black/50 border border-white/10 rounded-full py-3 pl-4 pr-10 text-white text-sm"
                            />
                            <TouchableOpacity className="absolute right-2 top-1/2 -translate-y-1/2 p-1">
                                <Text className="material-symbols-outlined text-zinc-400 text-xl">sentiment_satisfied</Text>
                            </TouchableOpacity>
                        </View>
                        <TouchableOpacity className="bg-primary rounded-full p-3 pr-5 pl-4 flex-row items-center gap-2 shadow-lg shadow-primary/20">
                            <Text className="material-symbols-outlined text-white text-xl">help</Text>
                            <Text className="text-white font-bold text-sm">Ask Q&A</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </View>
    );
}
