
import { View, Text, TouchableOpacity } from 'react-native';
import { Stack, useRouter } from 'expo-router';

export default function BiometricUnlock() {
  const router = useRouter();

  const handleBiometric = async () => {
    // TODO: integrate expo-local-authentication
    router.replace('/');
  };

  const handlePasscode = () => {
    router.replace('/auth/login');
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark items-center justify-between px-6 py-8">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Ambient Glow */}
      <View
        className="absolute bg-primary/10 rounded-full"
        style={{
          width: 320,
          height: 320,
          top: '35%',
          left: '50%',
          marginLeft: -160,
          marginTop: -160,
          opacity: 0.5,
        }}
      />

      {/* Header: Logo */}
      <View className="z-10 w-full items-center pt-8">
        <View className="flex-row items-center gap-2 opacity-90">
          <Text className="material-symbols-outlined text-white text-2xl">graphic_eq</Text>
          <Text className="text-white font-bold text-xl tracking-wider uppercase">Pluggd</Text>
        </View>
      </View>

      {/* Center: Biometric Icon */}
      <View className="z-10 items-center justify-center gap-8">
        <View className="relative items-center justify-center">
          {/* Glow rings */}
          <View className="absolute bg-primary/20 rounded-full w-40 h-40" />
          <View className="absolute bg-primary/10 rounded-full w-56 h-56" style={{ opacity: 0.5 }} />
          {/* Main fingerprint icon */}
          <Text
            className="material-symbols-outlined text-primary z-10"
            style={{
              fontSize: 128,
              textShadowColor: 'rgba(236,127,19,0.7)',
              textShadowOffset: { width: 0, height: 0 },
              textShadowRadius: 25,
            }}
          >
            fingerprint
          </Text>
        </View>

        <View className="items-center gap-2">
          <Text className="text-slate-900 dark:text-white tracking-tight text-[32px] font-bold leading-tight">
            Unlock Pluggd
          </Text>
          <Text className="text-slate-500 dark:text-white/60 text-base">
            Scan to continue
          </Text>
        </View>
      </View>

      {/* Bottom Actions */}
      <View className="z-10 w-full gap-3 pb-8">
        <TouchableOpacity
          onPress={handleBiometric}
          className="w-full h-14 rounded-xl bg-primary flex-row items-center justify-center gap-2"
          style={{
            shadowColor: '#FF5200',
            shadowOffset: { width: 0, height: 0 },
            shadowOpacity: 0.3,
            shadowRadius: 20,
          }}
        >
          <Text className="material-symbols-outlined text-[#181411]" style={{ fontSize: 20 }}>fingerprint</Text>
          <Text className="text-[#181411] text-lg font-bold tracking-wide">Use Fingerprint</Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handlePasscode}
          className="w-full h-12 rounded-xl items-center justify-center"
        >
          <Text className="text-slate-600 dark:text-white/80 text-base font-medium">Use Passcode</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
