import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';

const DATA_ITEMS = [
  { id: 'purchases', label: 'Purchases', icon: 'receipt_long' },
  { id: 'messages', label: 'Messages', icon: 'chat' },
  { id: 'media', label: 'Posts & Media', icon: 'photo_library' },
];

export default function DataExportScreen() {
  const router = useRouter();

  return (
    <View className="flex-1 justify-between overflow-hidden bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="relative z-10 flex-row items-center justify-center border-b border-white/5 bg-background-dark/50 p-6 pt-14">
        <TouchableOpacity
          onPress={() => router.back()}
          className="absolute left-4 top-14 h-10 w-10 items-center justify-center rounded-full bg-white/5"
        >
          <Text className="material-symbols-outlined text-white" style={{ fontSize: 22 }}>
            arrow_back
          </Text>
        </TouchableOpacity>
        <Text className="text-lg font-bold tracking-tight text-white">Data Export Request</Text>
      </View>

      <View className="relative z-10 flex-1 items-center justify-center px-6 py-8">
        <View className="relative mb-12 items-center justify-center">
          <View className="absolute h-40 w-40 scale-150 rounded-full bg-primary/20 blur-3xl" />
          <View className="relative h-40 w-40 items-center justify-center rounded-full border-4 border-white/5 bg-surface-dark shadow-2xl">
            <View className="absolute inset-0 -rotate-45 rounded-full border-4 border-b-transparent border-l-transparent border-r-primary/40 border-t-primary" />
            <Text className="material-symbols-outlined text-primary" style={{ fontSize: 64 }}>
              hourglass_top
            </Text>
          </View>
          <View className="absolute -bottom-5 flex-row items-center gap-2 rounded-full border border-primary/30 bg-[#2a221a] px-5 py-2 shadow-lg">
            <View className="h-2.5 w-2.5 rounded-full bg-primary" />
            <Text className="text-xs font-bold uppercase tracking-wider text-primary">
              In Progress
            </Text>
          </View>
        </View>

        <View className="w-full gap-6">
          <View className="items-center gap-4">
            <Text className="text-center text-3xl font-extrabold tracking-tight text-white">
              Preparing Archive
            </Text>
            <Text className="px-4 text-center text-base leading-relaxed text-gray-400">
              We are currently compiling a secure archive of your personal data. This process happens in the background.
            </Text>
          </View>

          <View className="w-full rounded-2xl border border-white/5 bg-white/5 p-6 shadow-inner">
            <Text className="mb-4 border-b border-white/5 pb-2 text-xs font-bold uppercase tracking-wider text-gray-500">
              Data Included
            </Text>
            <View className="gap-4">
              {DATA_ITEMS.map((item) => (
                <View key={item.id} className="flex-row items-center justify-between">
                  <View className="flex-row items-center gap-3">
                    <View className="h-8 w-8 items-center justify-center rounded-lg bg-surface-dark">
                      <Text className="material-symbols-outlined text-primary" style={{ fontSize: 20 }}>
                        {item.icon}
                      </Text>
                    </View>
                    <Text className="text-base font-semibold text-gray-200">{item.label}</Text>
                  </View>
                  <Text className="material-symbols-outlined text-green-500" style={{ fontSize: 20 }}>
                    check
                  </Text>
                </View>
              ))}
            </View>
          </View>

          <Text className="mx-auto max-w-xs text-center text-sm text-gray-500">
            Once ready, we will email a download link to your registered email address.
          </Text>
        </View>
      </View>

      <View className="relative z-10 w-full bg-background-dark p-6 pb-8">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-14 w-full items-center justify-center rounded-xl bg-primary shadow-lg shadow-orange-900/20"
        >
          <Text className="text-lg font-bold tracking-wide text-[#181411]">Close</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
