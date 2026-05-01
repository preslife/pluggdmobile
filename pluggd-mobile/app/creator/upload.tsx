
import { View, Text, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { SymbolIcon } from '../../components/SymbolIcon';

export default function Upload() {
    const router = useRouter();
    const [fileSelected, setFileSelected] = useState(false);

    return (
        <View className="flex-1 bg-background-light dark:bg-background-dark">
            {/* Header */}
            <View className="sticky top-0 z-20 flex-row items-center bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md p-4 pt-12 justify-between border-b border-zinc-800">
                <TouchableOpacity onPress={() => router.back()} className="p-2 -ml-2 rounded-full">
                    <SymbolIcon name="close" className="text-2xl text-zinc-400" />
                </TouchableOpacity>
                <Text className="text-slate-900 dark:text-white text-lg font-bold">New Upload</Text>
                <TouchableOpacity>
                    <Text className="text-primary font-bold text-base">Post</Text>
                </TouchableOpacity>
            </View>

            <ScrollView className="flex-1 p-4 gap-6">
                {/* File Selector */}
                {!fileSelected ? (
                    <TouchableOpacity
                        onPress={() => setFileSelected(true)}
                        className="flex-col items-center justify-center gap-4 rounded-xl border-2 border-dashed border-zinc-700 bg-surface-dark/30 px-6 py-10"
                    >
                        <View className="h-12 w-12 rounded-full bg-zinc-800 items-center justify-center">
                            <SymbolIcon name="cloud_upload" className="text-zinc-400 text-2xl" />
                        </View>
                        <View className="items-center gap-1">
                            <Text className="text-slate-900 dark:text-white text-base font-bold text-center">Tap to select audio file</Text>
                            <Text className="text-zinc-500 text-xs text-center font-medium">WAV, MP3, AIFF up to 50MB</Text>
                        </View>
                    </TouchableOpacity>
                ) : (
                    /* Waveform Processing */
                    <View className="flex-col gap-2">
                        <View className="flex-row items-center justify-between px-1">
                            <Text className="text-slate-900 dark:text-white text-sm font-bold uppercase tracking-wider opacity-80">Processing Audio</Text>
                            <View className="bg-primary/10 px-2 py-0.5 rounded-full">
                                <Text className="text-primary text-xs font-bold">Creating Waveform</Text>
                            </View>
                        </View>
                        <View className="relative w-full h-32 bg-surface-dark rounded-xl border border-zinc-800 overflow-hidden items-center justify-center px-4">
                            {/* Fake Waveform Bars */}
                            <View className="flex-row items-center justify-center gap-[2px] w-full h-16">
                                {[40, 60, 30, 80, 100, 60, 90, 120, 70, 40, 90, 130, 100, 70, 30, 90, 50, 30].map((h, i) => (
                                    <View key={i} className="w-1 bg-primary rounded-full" style={{ height: `${h}%`, opacity: 0.8 }} />
                                ))}
                            </View>
                        </View>
                        <View className="gap-2 mt-1">
                            <View className="flex-row justify-between items-end">
                                <Text className="text-zinc-400 text-xs font-medium">Analyzing frequencies...</Text>
                                <Text className="text-primary text-sm font-bold">78%</Text>
                            </View>
                            <View className="h-1.5 w-full bg-zinc-800 rounded-full overflow-hidden">
                                <View className="h-full bg-primary rounded-full w-[78%]" />
                            </View>
                        </View>
                    </View>
                )}

                {/* Metadata Form */}
                <View className="gap-5 pt-2 mb-24">
                    <View className="gap-2">
                        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider ml-1">Track Title</Text>
                        <View className="relative">
                            <TextInput
                                className="w-full bg-surface-dark border border-zinc-700 rounded-lg h-12 px-4 text-white placeholder-zinc-600 text-sm font-medium"
                                placeholder="e.g. Midnight City (Remix)"
                                placeholderTextColor="#52525b"
                            />
                            <View className="absolute right-4 top-0 bottom-0 justify-center pointer-events-none">
                                <SymbolIcon name="music_note" className="text-zinc-500 text-xl" />
                            </View>
                        </View>
                    </View>

                    <View className="gap-2">
                        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider ml-1">Primary Genre</Text>
                        <View className="relative">
                            <View className="w-full bg-surface-dark border border-zinc-700 rounded-lg h-12 px-4 justify-center">
                                <Text className="text-zinc-400 text-sm font-medium">Select a genre</Text>
                            </View>
                            <View className="absolute right-4 top-0 bottom-0 justify-center pointer-events-none">
                                <SymbolIcon name="expand_more" className="text-zinc-500 text-xl" />
                            </View>
                        </View>
                    </View>

                    <View className="gap-2">
                        <Text className="text-zinc-400 text-xs font-bold uppercase tracking-wider ml-1">Description</Text>
                        <TextInput
                            className="w-full bg-surface-dark border border-zinc-700 rounded-lg h-32 p-4 text-white placeholder-zinc-600 text-sm font-medium"
                            placeholder="Tell fans about your track..."
                            placeholderTextColor="#52525b"
                            multiline
                            textAlignVertical="top"
                        />
                    </View>
                </View>
            </ScrollView>

            {/* Sticky Bottom Action */}
            <View className="absolute bottom-0 left-0 w-full p-4 bg-background-light/95 dark:bg-background-dark/95 backdrop-blur-md border-t border-zinc-800 pb-8">
                <TouchableOpacity className="w-full bg-primary h-12 rounded-lg items-center justify-center flex-row gap-2 shadow-lg shadow-primary/30">
                    <Text className="text-white font-bold text-base">Publish Track</Text>
                    <SymbolIcon name="arrow_forward" className="text-white text-xl" />
                </TouchableOpacity>
            </View>
        </View>
    );
}
