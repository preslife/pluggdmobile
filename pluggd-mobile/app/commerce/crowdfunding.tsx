
import { View, Text, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useState } from 'react';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolIcon } from '../../components/SymbolIcon';

type RewardTier = {
  id: string;
  title: string;
  price: number;
  description: string;
  perks?: string[];
  badge?: string;
  limited?: string;
  recommended?: boolean;
};

const TABS = ['Story', 'Updates', 'Comments'];

const REWARD_TIERS: RewardTier[] = [
  {
    id: 'digital',
    title: 'Digital Download',
    price: 10,
    description: 'High-quality WAV & MP3 download of the full album + digital booklet.',
  },
  {
    id: 'vinyl',
    title: 'Signed Vinyl',
    price: 45,
    description: 'Limited edition 180g Orange Splatter Vinyl, signed by the band. Includes digital download.',
    perks: ['Signed LP', 'Digital Copy', 'Sticker Pack'],
    limited: 'Only 14 left!',
    recommended: true,
  },
  {
    id: 'vip',
    title: 'VIP Experience',
    price: 100,
    description: 'Backstage pass to any show in 2024, meet & greet, plus the signed vinyl and exclusive t-shirt.',
    limited: 'Limited to 5 backers',
  },
];

export default function Crowdfunding() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('Story');

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Floating Nav */}
      <View className="absolute top-0 left-0 right-0 z-50 flex-row items-center justify-between p-4 pt-14">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 rounded-full bg-black/20 items-center justify-center"
        >
          <SymbolIcon name="arrow_back" className="text-white" />
        </TouchableOpacity>
        <View className="flex-row gap-3">
          <TouchableOpacity className="h-10 w-10 rounded-full bg-black/20 items-center justify-center">
            <SymbolIcon name="favorite_border" className="text-white" />
          </TouchableOpacity>
          <TouchableOpacity className="h-10 w-10 rounded-full bg-black/20 items-center justify-center">
            <SymbolIcon name="share" className="text-white" />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* Hero */}
        <View style={{ height: 360 }} className="relative bg-[#2f251b]">
          <LinearGradient
            colors={['transparent', 'rgba(34,25,16,0.6)', '#221910']}
            className="absolute inset-0 z-10"
          />
          <View className="absolute bottom-0 left-0 right-0 p-5 z-20 gap-2">
            <View className="flex-row items-center gap-2 mb-1">
              <View className="px-2 py-0.5 rounded bg-primary">
                <Text className="text-[10px] font-bold text-white uppercase tracking-wider">New Drop</Text>
              </View>
              <Text className="text-gray-300 text-xs font-medium uppercase tracking-wide">
                Electronic / Synthwave
              </Text>
            </View>
            <Text className="text-3xl font-bold leading-tight text-white">
              Neon Nights: The Debut Album
            </Text>
            <View className="flex-row items-center gap-3 mt-2">
              <View className="w-8 h-8 rounded-full bg-[#2f251b] border border-white/20 items-center justify-center">
                <SymbolIcon name="person" className="text-white/60" style={{ fontSize: 16 }} />
              </View>
              <Text className="text-sm text-gray-200">
                by <Text className="font-semibold text-white">The Midnight Wave</Text>
              </Text>
            </View>
          </View>
        </View>

        {/* Stats */}
        <View className="px-5 pt-4 gap-4">
          {/* Progress Bar */}
          <View className="w-full h-3 bg-white/10 rounded-full overflow-hidden">
            <View className="h-full bg-primary rounded-full" style={{ width: '75%' }} />
          </View>

          {/* Numbers */}
          <View className="flex-row justify-between items-end">
            <View>
              <Text className="text-3xl font-bold text-primary">$15,200</Text>
              <Text className="text-sm text-gray-400">pledged of $10,000 goal</Text>
            </View>
            <View className="items-end">
              <Text className="text-xl font-bold text-white">152%</Text>
              <Text className="text-sm text-gray-400">funded</Text>
            </View>
          </View>

          {/* Secondary Stats */}
          <View className="flex-row py-3 border-t border-b border-white/5">
            <View className="flex-1 gap-1">
              <Text className="text-lg font-bold text-white">342</Text>
              <Text className="text-xs uppercase tracking-wide text-gray-500">Backers</Text>
            </View>
            <View className="flex-1 gap-1">
              <Text className="text-lg font-bold text-white">12</Text>
              <Text className="text-xs uppercase tracking-wide text-gray-500">Days to go</Text>
            </View>
          </View>
        </View>

        {/* Tabs */}
        <View className="flex-row border-b border-white/10 px-5 mt-4 gap-6">
          {TABS.map((tab) => (
            <TouchableOpacity
              key={tab}
              onPress={() => setActiveTab(tab)}
              className={`pb-3 border-b-2 ${
                activeTab === tab ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Text className={`text-sm font-medium px-1 ${
                activeTab === tab ? 'text-primary' : 'text-gray-400'
              }`}>
                {tab}
                {tab === 'Updates' && (
                  <Text className="text-[10px] bg-white/10 px-1.5 py-0.5 rounded-full text-gray-300 ml-1"> 2</Text>
                )}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Description */}
        <View className="px-5 pt-4 gap-3">
          <Text className="text-lg font-bold text-white">About the project</Text>
          <Text className="text-gray-300 leading-relaxed text-sm">
            We've spent the last two years crafting the perfect retro-future soundscape. Now, we need your help to press our debut synth-wave album on 180g splatter vinyl.
          </Text>
          <Text className="text-gray-300 leading-relaxed text-sm">
            This campaign funds the mixing, mastering, and the first pressing of "Neon Nights". Join us on this journey into the analog void.
          </Text>
        </View>

        {/* Reward Tiers */}
        <View className="px-5 pt-6 gap-4">
          <Text className="text-lg font-bold text-white">Select a Reward</Text>

          {REWARD_TIERS.map((tier) => (
            <TouchableOpacity
              key={tier.id}
              className={`bg-[#2f251b] rounded-xl p-5 gap-3 ${
                tier.recommended ? 'border-2 border-primary' : 'border border-white/5'
              }`}
              style={tier.recommended ? {
                shadowColor: '#FF5200',
                shadowOffset: { width: 0, height: 0 },
                shadowOpacity: 0.1,
                shadowRadius: 20,
              } : undefined}
            >
              {tier.recommended && (
                <View className="absolute -top-3 left-4 bg-primary px-2 py-1 rounded">
                  <Text className="text-[10px] font-bold text-white uppercase tracking-wider">Most Popular</Text>
                </View>
              )}

              <View className={`flex-row justify-between items-start ${tier.recommended ? 'mt-1' : ''}`}>
                <Text className="text-white font-bold text-lg">{tier.title}</Text>
                <Text className="text-primary font-bold text-lg">${tier.price}</Text>
              </View>

              <Text className={`text-sm ${tier.recommended ? 'text-gray-300' : 'text-gray-400'}`}>
                {tier.description}
              </Text>

              {tier.perks && (
                <View className="gap-1 my-1">
                  {tier.perks.map((perk) => (
                    <View key={perk} className="flex-row items-center gap-2">
                      <SymbolIcon name="check" className="text-primary" style={{ fontSize: 14 }} />
                      <Text className="text-sm text-gray-400">{perk}</Text>
                    </View>
                  ))}
                </View>
              )}

              {tier.limited && (
                <View className={`${tier.recommended ? 'flex-row items-center justify-between pt-3 border-t border-white/10 mt-2' : 'self-start px-2 py-1 bg-white/5 rounded mt-2'}`}>
                  <Text className={`text-xs ${tier.recommended ? 'text-primary font-medium' : 'text-gray-400'}`}>
                    {tier.limited}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Sticky Footer */}
      <View className="absolute bottom-0 left-0 right-0 p-4 pb-8 bg-background-dark/90 border-t border-white/5">
        <TouchableOpacity
          className="w-full h-12 bg-primary rounded-lg items-center justify-center gap-2 flex-row"
          style={{
            shadowColor: '#FF5200',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.2,
            shadowRadius: 8,
          }}
        >
          <Text className="text-white font-bold text-base">Back this Project</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
