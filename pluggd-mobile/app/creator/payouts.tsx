
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useState, useEffect } from 'react';
import { Stack, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../src/lib/supabase';
import { SymbolIcon } from '../../components/SymbolIcon';

type Transaction = {
  id: string;
  title: string;
  date: string;
  amount: string;
  isPositive: boolean;
  icon: string;
  iconBg: string;
};

const MOCK_TRANSACTIONS: Transaction[] = [
  { id: '1', title: "Beat Sale - 'Night Drive'", date: 'Oct 24', amount: '+$250.00', isPositive: true, icon: 'music_note', iconBg: 'bg-[#393028]' },
  { id: '2', title: 'Tip from @User123', date: 'Oct 23', amount: '+$10.00', isPositive: true, icon: 'favorite', iconBg: 'bg-[#393028]' },
  { id: '3', title: 'Withdrawal to Bank ****4455', date: 'Oct 20', amount: '-$1,500.00', isPositive: false, icon: 'account_balance', iconBg: 'bg-gray-700/50' },
  { id: '4', title: "Commission - 'Summer Vibe'", date: 'Oct 18', amount: '+$75.00', isPositive: true, icon: 'percent', iconBg: 'bg-[#393028]' },
  { id: '5', title: "Beat Sale - 'Dark Mode'", date: 'Oct 15', amount: '+$150.00', isPositive: true, icon: 'music_note', iconBg: 'bg-[#393028]' },
];

export default function Payouts() {
  const router = useRouter();
  const [transactions] = useState(MOCK_TRANSACTIONS);

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 pt-14 bg-background-light dark:bg-background-dark">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-start"
        >
          <SymbolIcon name="arrow_back" className="text-slate-900 dark:text-white" style={{ fontSize: 24 }} />
        </TouchableOpacity>
        <Text className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white flex-1 text-center pr-12">
          Payouts
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 80 }}>
        {/* Balance Card */}
        <View className="px-4 pt-2">
          <View className="rounded-xl overflow-hidden relative" style={{ minHeight: 200 }}>
            <View className="absolute inset-0 bg-[#221910]" />
            <LinearGradient
              colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)']}
              className="absolute inset-0"
            />
            <View className="relative z-10 p-6 gap-6">
              <View className="items-center gap-1">
                <Text className="text-gray-300 text-sm font-medium uppercase tracking-wider">
                  Available Balance
                </Text>
                <Text className="text-primary text-5xl font-extrabold tracking-tighter leading-tight">
                  $3,450.00
                </Text>
                <Text className="text-white/80 text-sm font-medium mt-1">
                  Next payout: Nov 14
                </Text>
              </View>
              <TouchableOpacity className="w-full h-12 bg-primary rounded-lg items-center justify-center">
                <Text className="text-[#181411] text-base font-bold">Withdraw Funds</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Stripe Status */}
        <View className="px-4 py-2">
          <View className="flex-row items-center justify-between bg-[#2a221a] border border-white/5 rounded-lg p-4">
            <View className="flex-row items-center gap-3">
              <SymbolIcon name="check_circle" className="text-green-500" style={{ fontSize: 24 }} />
              <View>
                <Text className="text-white text-sm font-semibold">Stripe Connect Status</Text>
                <Text className="text-green-500 text-xs font-medium">Connected</Text>
              </View>
            </View>
            <TouchableOpacity className="flex-row items-center">
              <Text className="text-primary text-sm font-bold">Manage Account</Text>
              <SymbolIcon name="open_in_new" className="text-primary ml-1" style={{ fontSize: 16 }} />
            </TouchableOpacity>
          </View>
        </View>

        <View className="h-4" />

        {/* Recent Activity Header */}
        <View className="flex-row items-center justify-between px-4 pb-2">
          <Text className="text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
            Recent Activity
          </Text>
          <TouchableOpacity>
            <Text className="text-gray-400 text-sm font-medium">View All</Text>
          </TouchableOpacity>
        </View>

        {/* Transaction Ledger */}
        <View>
          {transactions.map((tx) => (
            <View
              key={tx.id}
              className="flex-row items-center gap-4 px-4 py-4 justify-between border-b border-white/5"
            >
              <View className="flex-row items-center gap-4 flex-1">
                <View className={`h-12 w-12 rounded-lg ${tx.iconBg} items-center justify-center`}>
                  <SymbolIcon name={tx.icon} className="text-white"
                    style={{
                      fontSize: 24,
                    }} />
                </View>
                <View className="flex-1">
                  <Text className="text-slate-900 dark:text-white text-base font-semibold" numberOfLines={1}>
                    {tx.title}
                  </Text>
                  <Text className="text-[#b9ab9d] text-sm">{tx.date}</Text>
                </View>
              </View>
              <Text className={`text-base font-bold ${tx.isPositive ? 'text-primary' : 'text-white'}`}>
                {tx.amount}
              </Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}
