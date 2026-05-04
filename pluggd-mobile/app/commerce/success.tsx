
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SymbolIcon } from '../../components/SymbolIcon';

export default function OrderSuccess() {
  const router = useRouter();
  const params = useLocalSearchParams<{
    orderId?: string;
    title?: string;
    artist?: string;
    price?: string;
    cover?: string;
  }>();

  const price = Number(params.price ?? 29.99);
  const tax = Math.round(price * 0.08 * 100) / 100;
  const total = price + tax;

  return (
    <View className="flex-1 bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 pt-14 pb-2 bg-background-dark/90">
        <TouchableOpacity
          onPress={() => router.replace('/')}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <SymbolIcon name="close" className="text-white text-2xl" />
        </TouchableOpacity>
        <Text className="text-lg font-bold text-white">Confirmation</Text>
        <Text className="text-text-secondary text-sm font-bold">Help</Text>
      </View>

      <ScrollView className="flex-1 px-4 pb-8">
        {/* Success Hero */}
        <View className="items-center justify-center pt-8 pb-10 gap-6">
          {/* Glowing check icon */}
          <View className="relative items-center justify-center">
            <View
              className="absolute w-24 h-24 rounded-full bg-primary/20"
            />
            <View
              className="relative w-20 h-20 bg-primary rounded-full items-center justify-center"
              style={{
                shadowColor: '#FF5200',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.4,
                shadowRadius: 20,
              }}
            >
              <SymbolIcon name="check" className="text-background-dark" style={{ fontSize: 40, fontWeight: '700' }} />
            </View>
          </View>

          <View className="items-center gap-2 max-w-[320px]">
            <Text className="text-2xl font-bold text-white tracking-tight">Order Successful!</Text>
            <Text className="text-text-secondary text-base text-center leading-relaxed">
              Thank you for your purchase. A receipt has been sent to your email.
            </Text>
            <Text className="text-text-secondary text-xs opacity-70 mt-1">
              Order #{params.orderId || '402-9382'}
            </Text>
          </View>
        </View>

        {/* Action Buttons — 2-column */}
        <View className="flex-row gap-3 mb-8">
          <TouchableOpacity className="flex-1 items-center justify-center gap-2 h-24 bg-primary rounded-xl p-3">
            <SymbolIcon name="download" className="text-background-dark" style={{ fontSize: 28 }} />
            <Text className="text-background-dark text-sm font-bold text-center leading-tight">
              Download Stems
            </Text>
          </TouchableOpacity>
          <TouchableOpacity className="flex-1 items-center justify-center gap-2 h-24 bg-[#27211b] border border-white/10 rounded-xl p-3">
            <SymbolIcon name="description" className="text-primary" style={{ fontSize: 28 }} />
            <Text className="text-white text-sm font-bold text-center leading-tight">
              View License PDF
            </Text>
          </TouchableOpacity>
        </View>

        {/* Order Summary */}
        <View className="gap-4">
          <Text className="text-lg font-bold text-white tracking-tight px-1">Order Summary</Text>

          {/* Item Card */}
          <View className="flex-row items-center gap-4 p-4 rounded-xl bg-[#27211b] border border-white/5">
            <View className="w-16 h-16 rounded-lg overflow-hidden bg-gray-800">
              {params.cover ? (
                <Image source={{ uri: params.cover }} className="w-full h-full" />
              ) : (
                <View className="w-full h-full bg-primary/20 items-center justify-center">
                  <SymbolIcon name="music_note" className="text-primary text-2xl" />
                </View>
              )}
            </View>
            <View className="flex-1 min-w-0 gap-1">
              <Text className="text-white text-base font-bold leading-tight" numberOfLines={1}>
                {params.title || 'Beat'} (WAV + Stems)
              </Text>
              <View className="flex-row items-center gap-1.5">
                <SymbolIcon name="verified" className="text-primary text-[14px]" />
                <Text className="text-text-secondary text-sm font-medium" numberOfLines={1}>
                  @{params.artist || 'Unknown'}
                </Text>
              </View>
            </View>
            <Text className="text-white font-bold text-base">${price.toFixed(2)}</Text>
          </View>

          {/* Payment Details */}
          <View className="gap-3 p-4 rounded-xl bg-[#27211b] border border-white/5">
            <View className="flex-row justify-between items-center">
              <Text className="text-text-secondary text-sm">Subtotal</Text>
              <Text className="text-white text-sm font-medium">${price.toFixed(2)}</Text>
            </View>
            <View className="flex-row justify-between items-center">
              <Text className="text-text-secondary text-sm">Tax</Text>
              <Text className="text-white text-sm font-medium">${tax.toFixed(2)}</Text>
            </View>
            <View className="h-[1px] bg-white/10 my-1" />
            <View className="flex-row justify-between items-center">
              <Text className="text-white text-base font-bold">Total Paid</Text>
              <Text className="text-primary text-lg font-bold">${total.toFixed(2)}</Text>
            </View>
            <View className="flex-row items-center gap-2 bg-white/5 p-2 rounded mt-2 self-start">
              <SymbolIcon name="credit_card" className="text-text-secondary text-sm" />
              <Text className="text-text-secondary text-xs">Paid with Apple Pay</Text>
            </View>
          </View>
        </View>

        <View className="h-24" />
      </ScrollView>

      {/* Bottom CTA */}
      <View className="absolute bottom-0 left-0 right-0 bg-background-dark/95 border-t border-white/5 p-4 pb-10">
        <TouchableOpacity
          onPress={() => router.replace('/market')}
          className="w-full h-12 rounded-full bg-white flex-row items-center justify-center gap-2"
        >
          <Text className="text-black font-bold text-base">Continue Shopping</Text>
          <SymbolIcon name="arrow_forward" className="text-black text-[20px]" />
        </TouchableOpacity>
      </View>
    </View>
  );
}
