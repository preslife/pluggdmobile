
import { View, Text, TouchableOpacity, ScrollView, TextInput, Switch } from 'react-native';
import { useState } from 'react';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SymbolIcon } from '../../components/SymbolIcon';

type LicenseTier = {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  defaultPrice: string;
  enabled: boolean;
  priceLabel: string;
};

const DEFAULT_TIERS: LicenseTier[] = [
  {
    key: 'basic',
    title: 'Basic Lease',
    subtitle: 'MP3 File',
    icon: 'music_note',
    defaultPrice: '29.99',
    enabled: true,
    priceLabel: 'Price',
  },
  {
    key: 'premium',
    title: 'Premium Lease',
    subtitle: 'WAV + Stems',
    icon: 'graphic_eq',
    defaultPrice: '79.99',
    enabled: true,
    priceLabel: 'Price',
  },
  {
    key: 'exclusive',
    title: 'Exclusive Rights',
    subtitle: 'Full Ownership',
    icon: 'verified',
    defaultPrice: '',
    enabled: false,
    priceLabel: 'Min Offer',
  },
];

export default function Licensing() {
  const router = useRouter();
  const params = useLocalSearchParams<{ beatId?: string }>();
  const [tiers, setTiers] = useState(DEFAULT_TIERS);
  const [saving, setSaving] = useState(false);

  const toggleTier = (key: string) => {
    setTiers((prev) =>
      prev.map((t) => (t.key === key ? { ...t, enabled: !t.enabled } : t))
    );
  };

  const updatePrice = (key: string, price: string) => {
    setTiers((prev) =>
      prev.map((t) => (t.key === key ? { ...t, defaultPrice: price } : t))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    // TODO: persist to Supabase
    setTimeout(() => {
      setSaving(false);
      router.back();
    }, 800);
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 pt-14 bg-background-light/95 dark:bg-background-dark/95 border-b border-gray-200 dark:border-white/5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <SymbolIcon name="arrow_back_ios_new" className="text-slate-900 dark:text-white text-2xl" />
        </TouchableOpacity>
        <Text className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
          Licensing & Pricing
        </Text>
        <TouchableOpacity onPress={handleSave} className="h-10 items-center justify-center px-2">
          <Text className="font-bold text-primary">Save</Text>
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 140 }}>
        {/* Intro text */}
        <View className="px-6 py-5">
          <Text className="text-slate-500 dark:text-[#b9ab9d] text-sm leading-relaxed">
            Configure your license types and pricing for this track. Enable the licenses you want to offer to your fans.
          </Text>
        </View>

        {/* License Cards */}
        <View className="px-4 gap-5">
          {tiers.map((tier) => {
            const isExclusive = tier.key === 'exclusive';
            const isActive = tier.enabled;

            return (
              <View
                key={tier.key}
                className="rounded-3xl bg-white dark:bg-[#2C241B] p-5"
                style={{
                  opacity: isActive ? 1 : 0.7,
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 1 },
                  shadowOpacity: 0.05,
                  shadowRadius: 2,
                  borderWidth: 1,
                  borderColor: 'rgba(255,255,255,0.05)',
                }}
              >
                {/* Card Header */}
                <View className="flex-row items-center justify-between gap-4">
                  <View className="flex-row items-center gap-4">
                    <View
                      className={`h-12 w-12 items-center justify-center rounded-2xl ${
                        isActive
                          ? 'bg-primary/10 dark:bg-[#393028]'
                          : 'bg-gray-100 dark:bg-[#393028]'
                      }`}
                    >
                      <SymbolIcon name={tier.icon} className={`${
                          isActive
                            ? 'text-primary'
                            : 'text-slate-500 dark:text-[#8a7f75]'
                        }`}
                        style={{ fontSize: 24 }} />
                    </View>
                    <View>
                      <Text className="text-base font-bold leading-tight text-slate-900 dark:text-white">
                        {tier.title}
                      </Text>
                      <Text className="text-xs font-medium text-slate-400 dark:text-[#8a7f75]">
                        {tier.subtitle}
                      </Text>
                    </View>
                  </View>

                  {/* Toggle */}
                  <Switch
                    value={isActive}
                    onValueChange={() => toggleTier(tier.key)}
                    trackColor={{ false: '#393028', true: '#FF5200' }}
                    thumbColor="#FFFFFF"
                    ios_backgroundColor="#393028"
                  />
                </View>

                {/* Price Input */}
                <View
                  className="mt-4"
                  style={{ opacity: isActive ? 1 : 0.5 }}
                  pointerEvents={isActive ? 'auto' : 'none'}
                >
                  <View className="relative">
                    <Text className="absolute left-5 top-3 z-10 text-xs font-bold uppercase tracking-wide text-slate-400 dark:text-[#8a7f75]">
                      {tier.priceLabel}
                    </Text>
                    {isActive && !isExclusive && (
                      <View className="absolute right-5 top-4 z-10">
                        <SymbolIcon name="edit" className="text-primary" style={{ fontSize: 18 }} />
                      </View>
                    )}
                    {isExclusive && !isActive ? (
                      <View className="w-full rounded-full bg-gray-50 dark:bg-[#181411] pt-8 pb-3 px-5">
                        <Text className="text-lg font-bold text-slate-900 dark:text-white">
                          Make an Offer
                        </Text>
                      </View>
                    ) : (
                      <TextInput
                        className="w-full rounded-full bg-gray-50 dark:bg-[#181411] pt-8 pb-3 px-5 text-lg font-bold text-slate-900 dark:text-white"
                        placeholder="0.00"
                        placeholderTextColor="rgba(185,171,157,0.5)"
                        keyboardType="decimal-pad"
                        value={tier.defaultPrice}
                        onChangeText={(v) => updatePrice(tier.key, v)}
                        editable={isActive}
                      />
                    )}
                  </View>
                </View>

                {/* Card Footer */}
                <View className="flex-row items-center justify-between border-t border-gray-100 dark:border-white/5 pt-4 mt-4">
                  <TouchableOpacity className="flex-row items-center gap-1.5">
                    <SymbolIcon name="article" className={`${
                        isActive
                          ? 'text-primary'
                          : 'text-slate-400 dark:text-[#8a7f75]'
                      }`}
                      style={{ fontSize: 18 }} />
                    <Text
                      className={`text-xs font-bold ${
                        isActive
                          ? 'text-primary'
                          : 'text-slate-400 dark:text-[#8a7f75]'
                      }`}
                    >
                      View Contract
                    </Text>
                  </TouchableOpacity>

                  {isActive ? (
                    <View className="rounded-full bg-primary/10 px-2 py-0.5">
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-primary">
                        Active
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-[#8a7f75]">
                      Disabled
                    </Text>
                  )}
                </View>
              </View>
            );
          })}

          {/* Pro Tip */}
          <View className="mt-2 mb-6 flex-row items-start gap-3 rounded-2xl bg-primary/10 p-4 border border-primary/20">
            <SymbolIcon name="tips_and_updates" className="text-primary" style={{ fontSize: 20 }} />
            <Text className="flex-1 text-xs text-slate-600 dark:text-[#b9ab9d] leading-normal font-medium">
              <Text className="font-bold text-primary">Pro Tip: </Text>
              Enabling "Exclusive Rights" will automatically remove this track from the marketplace once it is purchased.
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View className="absolute bottom-0 left-0 right-0 bg-background-light/95 dark:bg-background-dark/95 px-4 pb-8 pt-4 border-t border-gray-200 dark:border-white/5">
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          className="w-full rounded-full bg-primary py-4 flex-row items-center justify-center gap-2"
          style={{
            shadowColor: '#FF5200',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.25,
            shadowRadius: 16,
          }}
        >
          <Text className="text-white text-base font-bold">
            {saving ? 'Saving...' : 'Save & Publish'}
          </Text>
          {!saving && (
            <SymbolIcon name="arrow_forward" className="text-white" style={{ fontSize: 18 }} />
          )}
        </TouchableOpacity>
      </View>
    </View>
  );
}
