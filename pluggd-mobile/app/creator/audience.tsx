
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState } from 'react';
import { Stack, useRouter } from 'expo-router';
import { SymbolIcon } from '../../components/SymbolIcon';

const TIME_RANGES = ['Last 7 Days', 'Last 28 Days', 'All Time'];

const AGE_DATA = [
  { label: '13-17', percent: 40, dominant: false },
  { label: '18-24', percent: 85, dominant: true },
  { label: '25-34', percent: 55, dominant: false },
  { label: '35-44', percent: 30, dominant: false },
  { label: '45+', percent: 15, dominant: false },
];

const GENDER_DATA = [
  { label: 'Female', percent: 55, color: '#FF5200' },
  { label: 'Male', percent: 35, color: '#374151' },
  { label: 'Other', percent: 10, color: '#1f2937' },
];

const TOP_TRACKS = [
  { title: 'Midnight Sun', streams: '12.4k' },
  { title: 'Neon Dreams', streams: '8.5k' },
  { title: 'Echoes in Void', streams: '5.1k' },
];

export default function AudienceInsights() {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState('Last 7 Days');

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 pt-14 bg-background-light/95 dark:bg-background-dark/95">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-10 w-10 items-center justify-center rounded-full"
        >
          <SymbolIcon name="arrow_back" className="text-slate-900 dark:text-white" />
        </TouchableOpacity>
        <Text className="flex-1 text-center text-lg font-bold leading-tight text-slate-900 dark:text-white">
          Audience Insights
        </Text>
        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full">
          <SymbolIcon name="ios_share" className="text-slate-900 dark:text-white" />
        </TouchableOpacity>
      </View>

      {/* Time Range Filters */}
      <View className="px-4 pt-2 pb-4">
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-2">
          <View className="flex-row gap-2">
            {TIME_RANGES.map((range) => (
              <TouchableOpacity
                key={range}
                onPress={() => setTimeRange(range)}
                className={`rounded-full px-5 py-2.5 ${
                  timeRange === range
                    ? 'bg-primary'
                    : 'bg-white dark:bg-[#161616]'
                }`}
                style={timeRange === range ? {
                  shadowColor: '#FF5200',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                } : undefined}
              >
                <Text className={`text-sm font-semibold ${
                  timeRange === range ? 'text-white' : 'text-slate-600 dark:text-slate-400'
                }`}>
                  {range}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      <ScrollView className="flex-1 px-4" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero Stats */}
        <View className="py-2 gap-1">
          <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Listeners</Text>
          <View className="flex-row items-baseline gap-3">
            <Text className="text-5xl font-bold tracking-tight text-slate-900 dark:text-white">24.5k</Text>
            <View className="flex-row items-center gap-0.5 rounded-full bg-primary/10 px-2 py-1">
              <SymbolIcon name="trending_up" className="text-primary" style={{ fontSize: 16 }} />
              <Text className="text-sm font-bold text-primary">12%</Text>
            </View>
          </View>
        </View>

        {/* Demographics */}
        <View className="mt-6 gap-4">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Demographics</Text>

          {/* Age Distribution */}
          <View className="rounded-xl bg-white dark:bg-[#161616] p-5">
            <View className="flex-row items-center justify-between mb-6">
              <Text className="text-base font-semibold text-slate-900 dark:text-white">Age Distribution</Text>
              <SymbolIcon name="info" className="text-slate-400" />
            </View>

            <View className="flex-row items-end justify-between" style={{ height: 180 }}>
              {AGE_DATA.map((bar) => (
                <View key={bar.label} className="items-center gap-2 flex-1">
                  <View className="w-full flex-1 justify-end px-1">
                    <View
                      className={`w-full rounded-t-full ${bar.dominant ? 'bg-primary' : 'bg-gray-200 dark:bg-white/10'}`}
                      style={{
                        height: `${bar.percent}%`,
                        ...(bar.dominant ? {
                          shadowColor: '#FF5200',
                          shadowOffset: { width: 0, height: 0 },
                          shadowOpacity: 0.5,
                          shadowRadius: 15,
                        } : {}),
                      }}
                    />
                  </View>
                  <Text className={`text-xs font-medium ${bar.dominant ? 'text-white font-bold' : 'text-slate-500'}`}>
                    {bar.label}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Gender Split */}
          <View className="rounded-xl bg-white dark:bg-[#161616] p-5">
            <Text className="text-base font-semibold text-slate-900 dark:text-white mb-4">Gender Split</Text>

            <View className="flex-row h-4 w-full overflow-hidden rounded-full">
              {GENDER_DATA.map((g) => (
                <View key={g.label} className="h-full" style={{ width: `${g.percent}%`, backgroundColor: g.color }} />
              ))}
            </View>

            <View className="flex-row justify-between mt-4 gap-2">
              {GENDER_DATA.map((g) => (
                <View key={g.label} className="flex-row items-center gap-2">
                  <View className="h-2 w-2 rounded-full" style={{ backgroundColor: g.color }} />
                  <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">{g.label}</Text>
                  <Text className="text-sm font-bold text-slate-900 dark:text-white">{g.percent}%</Text>
                </View>
              ))}
            </View>
          </View>
        </View>

        {/* Listener Loyalty */}
        <View className="mt-6 gap-4">
          <Text className="text-lg font-bold text-slate-900 dark:text-white">Listener Loyalty</Text>

          <View className="flex-row gap-4">
            {/* Returning */}
            <View className="flex-1 rounded-xl bg-white dark:bg-[#161616] p-5 gap-3">
              <View className="h-10 w-10 rounded-full bg-primary/10 items-center justify-center">
                <SymbolIcon name="replay" className="text-primary" />
              </View>
              <View>
                <Text className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Returning</Text>
                <Text className="text-2xl font-bold text-slate-900 dark:text-white">62%</Text>
              </View>
              <View className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                <View className="h-full w-[62%] rounded-full bg-primary" />
              </View>
            </View>

            {/* New Fans */}
            <View className="flex-1 rounded-xl bg-white dark:bg-[#161616] p-5 gap-3">
              <View className="h-10 w-10 rounded-full bg-gray-100 dark:bg-white/10 items-center justify-center">
                <SymbolIcon name="person_add" className="text-slate-900 dark:text-white" />
              </View>
              <View>
                <Text className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">New Fans</Text>
                <Text className="text-2xl font-bold text-slate-900 dark:text-white">38%</Text>
              </View>
              <View className="h-1.5 w-full rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
                <View className="h-full w-[38%] rounded-full bg-slate-400 dark:bg-slate-600" />
              </View>
            </View>
          </View>
        </View>

        {/* Top Tracks */}
        <View className="mt-6 gap-4">
          <View className="flex-row items-center justify-between">
            <Text className="text-lg font-bold text-slate-900 dark:text-white">Top Tracks</Text>
            <TouchableOpacity>
              <Text className="text-sm font-bold text-primary">View All</Text>
            </TouchableOpacity>
          </View>

          <View className="gap-3">
            {TOP_TRACKS.map((track) => (
              <TouchableOpacity
                key={track.title}
                className="flex-row items-center gap-4 rounded-xl bg-white dark:bg-[#161616] p-3"
              >
                <View className="h-14 w-14 rounded-lg bg-[#121212] items-center justify-center">
                  <SymbolIcon name="music_note" className="text-white/20" style={{ fontSize: 24 }} />
                </View>
                <View className="flex-1">
                  <Text className="font-bold text-slate-900 dark:text-white" numberOfLines={1}>{track.title}</Text>
                  <Text className="text-sm font-medium text-slate-500 dark:text-slate-400">{track.streams} streams</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

      {/* Export FAB */}
      <View className="absolute bottom-6 left-0 right-0 items-center">
        <TouchableOpacity
          className="flex-row items-center gap-2 rounded-full bg-primary px-6 py-3.5"
          style={{
            shadowColor: '#FF5200',
            shadowOffset: { width: 0, height: 8 },
            shadowOpacity: 0.3,
            shadowRadius: 16,
          }}
        >
          <SymbolIcon name="analytics" className="text-white" />
          <Text className="text-white font-bold">Export Report</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}
