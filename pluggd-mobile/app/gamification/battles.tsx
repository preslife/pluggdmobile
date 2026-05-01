
import { View, Text, TouchableOpacity, ScrollView, Image, Dimensions } from 'react-native';
import { useState, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';
import { SymbolIcon } from '../../components/SymbolIcon';

type LeaderboardEntry = {
  id: string;
  rank: number;
  name: string;
  avatar: string;
  trackName: string;
  votes: number;
};

const MOCK_LEADERBOARD: LeaderboardEntry[] = [
  { id: '1', rank: 1, name: 'Lil Apex', avatar: '', trackName: 'Night Drive', votes: 4500 },
  { id: '2', rank: 2, name: 'Sarah Beat', avatar: '', trackName: 'Heartless', votes: 4200 },
  { id: '3', rank: 3, name: 'The Prodigy', avatar: '', trackName: 'Bassline', votes: 3800 },
];

export default function Battles() {
  const router = useRouter();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(MOCK_LEADERBOARD);

  const formatVotes = (n: number) => {
    if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
    return String(n);
  };

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 pt-14 bg-background-light/95 dark:bg-background-dark/95 border-b border-gray-200 dark:border-white/10">
        <View className="w-10" />
        <Text className="text-xl font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
          Battles
        </Text>
        <TouchableOpacity className="h-10 w-10 items-center justify-center rounded-full">
          <SymbolIcon name="notifications" className="text-slate-900 dark:text-white" />
        </TouchableOpacity>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Hero: Weekly Beat Battle */}
        <View className="mx-4 mt-4 rounded-2xl overflow-hidden" style={{ minHeight: 240 }}>
          <View className="absolute inset-0 bg-[#1E1E1E]" />
          <LinearGradient
            colors={['transparent', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.9)']}
            className="absolute inset-0"
          />
          <View className="relative p-5 justify-between" style={{ minHeight: 240 }}>
            {/* Top badges */}
            <View className="flex-row justify-between items-start">
              <View className="flex-row items-center gap-2 bg-black/60 px-3 py-1 rounded-full border border-white/10">
                <View className="w-2.5 h-2.5 rounded-full bg-primary" />
                <Text className="text-xs font-bold text-white uppercase tracking-wide">Live Now</Text>
              </View>
              <View className="bg-black/60 px-3 py-1 rounded-full border border-white/10">
                <Text className="text-xs font-medium text-gray-300">Ends in 2h 15m</Text>
              </View>
            </View>

            {/* Bottom content */}
            <View className="gap-3 mt-auto">
              <View>
                <Text className="text-2xl font-bold text-white leading-tight mb-1">
                  Weekly Beat Battle
                </Text>
                <Text className="text-gray-300 text-sm font-medium">
                  Current Prize Pool: <Text className="text-primary font-bold">$500</Text>
                </Text>
              </View>
              <TouchableOpacity
                className="w-full bg-primary py-3 rounded-xl flex-row items-center justify-center gap-2"
                style={{
                  shadowColor: '#FF5200',
                  shadowOffset: { width: 0, height: 0 },
                  shadowOpacity: 0.4,
                  shadowRadius: 15,
                }}
              >
                <SymbolIcon name="mic" className="text-white" style={{ fontSize: 20 }} />
                <Text className="text-white font-bold text-base">Submit Your Track</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Tournament Bracket */}
        <View className="mt-6 px-4">
          <View className="flex-row items-center justify-between mb-3 px-1">
            <Text className="text-lg font-bold text-white tracking-tight">Tournament Bracket</Text>
            <TouchableOpacity>
              <Text className="text-xs font-bold text-primary">View Full</Text>
            </TouchableOpacity>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {/* Matchup Card 1 - Active */}
            <View className="bg-[#1E1E1E] border border-white/5 rounded-xl p-4 mr-4 relative overflow-hidden" style={{ width: 280 }}>
              <View className="absolute top-0 left-0 w-1 h-full bg-primary" />
              <View className="flex-row justify-between items-center mb-4 opacity-60">
                <Text className="text-xs font-bold uppercase tracking-wider text-white">Semi-Finals</Text>
                <SymbolIcon name="trophy" className="text-white text-sm" />
              </View>
              <View className="flex-row items-center justify-between">
                {/* Player 1 */}
                <View className="items-center gap-2" style={{ width: 80 }}>
                  <View className="w-14 h-14 rounded-full border-2 border-primary bg-[#2a2a2a] items-center justify-center">
                    <SymbolIcon name="person" className="text-white/40" />
                  </View>
                  <Text className="text-xs font-bold text-white text-center" numberOfLines={1}>DJ Kicks</Text>
                </View>
                {/* VS */}
                <Text className="text-2xl font-black text-white/20 italic">VS</Text>
                {/* Player 2 */}
                <View className="items-center gap-2" style={{ width: 80 }}>
                  <View className="w-14 h-14 rounded-full border-2 border-white/10 bg-[#2a2a2a] items-center justify-center">
                    <SymbolIcon name="person" className="text-white/40" />
                  </View>
                  <Text className="text-xs font-bold text-white text-center" numberOfLines={1}>MC Flow</Text>
                </View>
              </View>
            </View>

            {/* Matchup Card 2 - Upcoming */}
            <View className="bg-[#1E1E1E] border border-white/5 rounded-xl p-4 mr-4" style={{ width: 280, opacity: 0.6 }}>
              <View className="flex-row justify-between items-center mb-4 opacity-60">
                <Text className="text-xs font-bold uppercase tracking-wider text-white">Semi-Finals</Text>
              </View>
              <View className="flex-row items-center justify-between">
                <View className="items-center gap-2" style={{ width: 80 }}>
                  <View className="w-14 h-14 rounded-full bg-white/5 items-center justify-center">
                    <Text className="text-xs text-white/40">?</Text>
                  </View>
                  <Text className="text-xs font-bold text-white/40 text-center">TBD</Text>
                </View>
                <Text className="text-2xl font-black text-white/10 italic">VS</Text>
                <View className="items-center gap-2" style={{ width: 80 }}>
                  <View className="w-14 h-14 rounded-full border-2 border-white/10 bg-[#2a2a2a] items-center justify-center">
                    <SymbolIcon name="person" className="text-white/40" />
                  </View>
                  <Text className="text-xs font-bold text-white text-center" numberOfLines={1}>Apex</Text>
                </View>
              </View>
            </View>
          </ScrollView>
        </View>

        {/* Live Leaderboard */}
        <View className="mt-6 px-4 gap-4">
          <View className="flex-row items-end justify-between px-1 pt-2">
            <View>
              <Text className="text-lg font-bold text-white tracking-tight">Live Leaderboard</Text>
              <Text className="text-xs text-gray-400">Voting ends in 2h</Text>
            </View>
            <View className="flex-row items-center gap-1 bg-primary/10 px-2 py-1 rounded-lg">
              <SymbolIcon name="sensors" className="text-primary" style={{ fontSize: 14 }} />
              <Text className="text-primary text-xs font-bold">Live Voting</Text>
            </View>
          </View>

          {/* Entries */}
          <View className="gap-3">
            {leaderboard.map((entry) => {
              const isFirst = entry.rank === 1;
              return (
                <View
                  key={entry.id}
                  className={`flex-row items-center gap-3 bg-[#1E1E1E] p-3 rounded-xl relative overflow-hidden ${
                    isFirst ? 'border border-primary/30' : 'border border-white/5'
                  }`}
                  style={isFirst ? {
                    shadowColor: '#FF5200',
                    shadowOffset: { width: 0, height: 0 },
                    shadowOpacity: 0.1,
                    shadowRadius: 10,
                  } : undefined}
                >
                  {/* Progress bar bg */}
                  <View
                    className={`absolute left-0 top-0 bottom-0 ${isFirst ? 'bg-primary/5' : 'bg-white/5'}`}
                    style={{ width: `${Math.min((entry.votes / 5000) * 100, 100)}%` }}
                  />

                  {/* Rank */}
                  <Text
                    className={`text-2xl font-black italic z-10 ${
                      isFirst ? 'text-primary' : 'text-white/50'
                    }`}
                    style={{ width: 32, textAlign: 'center' }}
                  >
                    {entry.rank}
                  </Text>

                  {/* Avatar */}
                  <View className="relative z-10">
                    <View className="h-12 w-12 rounded-full bg-[#2a2a2a] border-2 border-[#1E1E1E] items-center justify-center">
                      <SymbolIcon name="person" className="text-white/40" />
                    </View>
                    <View className={`absolute -bottom-1 -right-1 ${isFirst ? 'bg-primary' : 'bg-[#2a2a2a] border border-white/10'} px-1 rounded-sm`}>
                      <Text className={`text-[10px] font-bold ${isFirst ? 'text-black' : 'text-white'}`}>
                        {formatVotes(entry.votes)}
                      </Text>
                    </View>
                  </View>

                  {/* Info */}
                  <View className="flex-1 min-w-0 z-10">
                    <Text className="text-white font-bold text-sm" numberOfLines={1}>{entry.name}</Text>
                    <View className="flex-row items-center gap-1">
                      <SymbolIcon name="music_note" className="text-gray-400" style={{ fontSize: 12 }} />
                      <Text className="text-gray-400 text-xs" numberOfLines={1}>{entry.trackName}</Text>
                    </View>
                  </View>

                  {/* Vote button */}
                  <TouchableOpacity
                    className={`z-10 h-10 w-10 rounded-full items-center justify-center ${
                      isFirst ? 'bg-primary' : 'bg-[#2a2a2a] border border-white/10'
                    }`}
                  >
                    <SymbolIcon name="local_fire_department" className={`${isFirst ? 'text-white' : 'text-gray-400'}`}
                      style={{ fontSize: 20 }} />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>

          <TouchableOpacity className="w-full py-3 items-center">
            <Text className="text-gray-400 text-sm font-medium">View All 124 Entries</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}
