
import { View, Text, TouchableOpacity, Linking } from 'react-native';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { SymbolIcon } from '../../components/SymbolIcon';

export default function MagicLinkSent() {
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || 'your email';

  const handleOpenMail = () => {
    Linking.openURL('message://');
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark items-center justify-center px-4">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Background gradient glow */}
      <View
        className="absolute top-0 left-0 right-0 bg-primary/5"
        style={{ height: '50%' }}
      />

      {/* Content */}
      <View className="w-full max-w-[480px] items-center z-10">
        {/* Status Icon */}
        <View className="relative items-center justify-center mb-8">
          {/* Outer Glow */}
          <View className="absolute w-32 h-32 rounded-full bg-primary/10" />
          {/* Middle Ring */}
          <View className="absolute w-24 h-24 rounded-full bg-primary/20" />
          {/* Icon */}
          <View
            className="relative w-16 h-16 rounded-full bg-primary items-center justify-center"
            style={{
              shadowColor: '#FF5200',
              shadowOffset: { width: 0, height: 0 },
              shadowOpacity: 0.4,
              shadowRadius: 20,
            }}
          >
            <SymbolIcon name="check" className="text-background-dark" style={{ fontSize: 32 }} />
          </View>
        </View>

        {/* Text */}
        <View className="w-full items-center px-4 gap-3">
          <Text className="text-slate-900 dark:text-white tracking-tight text-[32px] font-bold leading-tight text-center">
            Check your email
          </Text>
          <Text className="text-gray-600 dark:text-gray-400 text-base text-center leading-relaxed">
            We've sent a magic link to{' '}
            <Text className="text-slate-900 dark:text-white font-bold">{email}</Text>.
            {'\n'}Click it to log in instantly.
          </Text>
        </View>

        {/* Actions */}
        <View className="w-full mt-10 gap-3 px-2">
          {/* Primary: Open Mail */}
          <TouchableOpacity
            onPress={handleOpenMail}
            className="w-full h-14 rounded-lg bg-primary flex-row items-center justify-center gap-2"
            style={{
              shadowColor: '#FF5200',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.2,
              shadowRadius: 8,
            }}
          >
            <SymbolIcon name="mail" className="text-[#181411]" style={{ fontSize: 20 }} />
            <Text className="text-[#181411] text-base font-bold">Open Mail App</Text>
          </TouchableOpacity>

          {/* Secondary: Resend */}
          <TouchableOpacity className="w-full h-12 items-center justify-center">
            <Text className="text-gray-500 dark:text-gray-400 text-sm font-bold">
              Didn't receive it? <Text className="text-primary">Resend Link</Text>
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}
