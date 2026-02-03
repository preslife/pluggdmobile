
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';

export default function Payouts() {
    const router = useRouter();

    return (
        <View className="flex-1 bg-background-dark">
            {/* Header */}
            <View className="z-10 bg-background-dark/50 backdrop-blur-sm border-b border-white/5 p-6 pt-12 items-center justify-center relative">
                <TouchableOpacity onPress={() => router.back()} className="absolute left-4 top-12 p-2">
                    <Text className="material-symbols-outlined text-white text-2xl">arrow_back</Text>
                </TouchableOpacity>
                <Text className="text-lg font-bold tracking-tight text-white">Data Export Request</Text>
            </View>

            <View className="flex-1 items-center justify-center px-6 py-8">
                <View className="mb-12 items-center justify-center relative">
                    <View className="absolute h-40 w-40 rounded-full bg-primary/20 blur-3xl scale-150" />
                    <View className="h-40 w-40 rounded-full bg-surface-dark border-4 border-white/5 shadow-2xl items-center justify-center relative">
                        <Text className="material-symbols-outlined text-primary text-6xl">hourglass_top</Text>
                    </View>
                    <View className="absolute -bottom-5 flex-row items-center gap-2 bg-[#2a221a] border border-primary/30 rounded-full px-5 py-2 shadow-lg">
                        <View className="h-2.5 w-2.5 bg-primary rounded-full" />
                        <Text className="text-xs font-bold uppercase tracking-wider text-primary">In Progress</Text>
                    </View>
                </View>

                <View className="w-full space-y-6">
                    <Text className="text-3xl font-extrabold tracking-tight text-white text-center">Preparing Archive</Text>
                    <Text className="text-gray-400 text-base leading-relaxed px-4 text-center">We are currently compiling a secure archive of your personal data. This process happens in the background.</Text>

                    <View className="bg-white/5 rounded-2xl p-6 border border-white/5 w-full">
                        <Text className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4 border-b border-white/5 pb-2">Data Included</Text>
                        <View className="gap-4">
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center gap-3">
                                    <View className="h-8 w-8 rounded-lg bg-surface-dark items-center justify-center">
                                        <Text className="material-symbols-outlined text-primary text-xl">receipt_long</Text>
                                    </View>
                                    <Text className="text-base font-semibold text-gray-200">Purchases</Text>
                                </View>
                                <Text className="material-symbols-outlined text-green-500 text-xl">check</Text>
                            </View>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center gap-3">
                                    <View className="h-8 w-8 rounded-lg bg-surface-dark items-center justify-center">
                                        <Text className="material-symbols-outlined text-primary text-xl">chat</Text>
                                    </View>
                                    <Text className="text-base font-semibold text-gray-200">Messages</Text>
                                </View>
                                <Text className="material-symbols-outlined text-green-500 text-xl">check</Text>
                            </View>
                            <View className="flex-row items-center justify-between">
                                <View className="flex-row items-center gap-3">
                                    <View className="h-8 w-8 rounded-lg bg-surface-dark items-center justify-center">
                                        <Text className="material-symbols-outlined text-primary text-xl">photo_library</Text>
                                    </View>
                                    <Text className="text-base font-semibold text-gray-200">Posts & Media</Text>
                                </View>
                                <Text className="material-symbols-outlined text-green-500 text-xl">check</Text>
                            </View>
                        </View>
                    </View>
                    <Text className="text-sm text-gray-500 text-center mx-auto max-w-xs">Once ready, we will email a download link to your registered email address.</Text>
                </View>
            </View>

            <View className="w-full p-6 pb-8 bg-background-dark">
                <TouchableOpacity onPress={() => router.back()} className="w-full h-14 bg-primary rounded-xl items-center justify-center shadow-lg shadow-orange-900/20">
                    <Text className="text-[#181411] text-lg font-bold tracking-wide">Close</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}
