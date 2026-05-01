
import { View, Text, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useState } from 'react';
import { Stack, useRouter, useLocalSearchParams } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { SymbolIcon } from '../../components/SymbolIcon';

type Question = {
  id: string;
  user: string;
  role?: string;
  text: string;
  votes: number;
  timeAgo: string;
  isSpotlight?: boolean;
};

const MOCK_QUESTIONS: Question[] = [
  {
    id: 'spotlight',
    user: 'Sarah M.',
    role: 'Super Fan',
    text: '"What inspired the bassline on track 3? It sounds totally different from your usual style."',
    votes: 0,
    timeAgo: '04:20',
    isSpotlight: true,
  },
  { id: '1', user: 'Marcus J.', text: 'Will you be touring in Europe this year? Specifically Berlin?', votes: 452, timeAgo: '2m ago' },
  { id: '2', user: 'Elena R.', text: 'Can you show us your pedalboard setup?', votes: 289, timeAgo: '5m ago' },
  { id: '3', user: 'Tyrell', text: 'Any collabs coming up with The Weeknd?', votes: 142, timeAgo: '8m ago' },
  { id: '4', user: 'Jordan', text: 'Play "Midnight City" please!!!', votes: 89, timeAgo: '12m ago' },
];

export default function LiveQA() {
  const router = useRouter();
  const [questions] = useState(MOCK_QUESTIONS);
  const [newQuestion, setNewQuestion] = useState('');
  const [filter, setFilter] = useState<'Top' | 'Newest'>('Top');

  const spotlight = questions.find((q) => q.isSpotlight);
  const regularQuestions = questions.filter((q) => !q.isSpotlight);

  return (
    <View className="flex-1 bg-[#181411]">
      <Stack.Screen options={{ headerShown: false, presentation: 'modal' }} />

      {/* Background */}
      <View className="absolute inset-0">
        <LinearGradient
          colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.95)']}
          className="absolute inset-0 z-10"
        />
      </View>

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} className="flex-1">
        {/* Top Bar */}
        <View className="flex-row items-center justify-between px-5 pt-14 pb-2 z-20">
          <View>
            <View className="flex-row items-center gap-2">
              <View className="w-2 h-2 rounded-full bg-primary" />
              <Text className="text-xl font-bold tracking-tight text-white">Live Q&A</Text>
            </View>
            <Text className="text-white/60 text-xs font-medium pl-4">1.2k listening</Text>
          </View>
          <TouchableOpacity
            onPress={() => router.back()}
            className="h-10 w-10 items-center justify-center rounded-full bg-white/10"
          >
            <SymbolIcon name="close" className="text-white" style={{ fontSize: 20 }} />
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1 px-4 z-20" contentContainerStyle={{ paddingBottom: 100 }}>
          {/* Spotlight: Current Question */}
          {spotlight && (
            <View className="mb-8 mt-2">
              <View
                className="rounded-2xl bg-primary p-5 relative overflow-hidden"
                style={{
                  shadowColor: '#FF5200',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.2,
                  shadowRadius: 8,
                }}
              >
                {/* Decorative glow */}
                <View className="absolute -right-10 -top-10 w-32 h-32 rounded-full bg-white/20" />

                <View className="z-10">
                  <View className="flex-row items-center justify-between mb-3">
                    <View className="flex-row items-center bg-black/20 px-2.5 py-1 rounded-full">
                      <SymbolIcon name="mic" className="text-white mr-1" style={{ fontSize: 12 }} />
                      <Text className="text-[10px] font-bold uppercase tracking-wider text-white">Now Answering</Text>
                    </View>
                    <Text className="text-xs font-medium text-white/80">{spotlight.timeAgo}</Text>
                  </View>

                  <Text className="mb-4 text-lg font-bold leading-tight tracking-tight text-white">
                    {spotlight.text}
                  </Text>

                  <View className="flex-row items-center gap-3">
                    <View className="h-8 w-8 rounded-full bg-white/20 items-center justify-center">
                      <SymbolIcon name="person" className="text-white" style={{ fontSize: 16 }} />
                    </View>
                    <View>
                      <Text className="text-xs font-bold text-white">{spotlight.user}</Text>
                      {spotlight.role && (
                        <Text className="text-[10px] text-white/70">{spotlight.role}</Text>
                      )}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          )}

          {/* Filters */}
          <View className="flex-row items-center justify-between py-2 px-2 mb-4 rounded-xl border border-white/5 bg-black/20">
            <View className="flex-row gap-1">
              {(['Top', 'Newest'] as const).map((f) => (
                <TouchableOpacity
                  key={f}
                  onPress={() => setFilter(f)}
                  className={`rounded-full px-4 py-1.5 ${
                    filter === f ? 'bg-white' : ''
                  }`}
                >
                  <Text className={`text-xs font-bold ${
                    filter === f ? 'text-black' : 'text-white/60'
                  }`}>{f}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity className="p-1">
              <SymbolIcon name="sort" className="text-white/60" style={{ fontSize: 20 }} />
            </TouchableOpacity>
          </View>

          {/* Questions List */}
          <View className="gap-3">
            {regularQuestions.map((q) => (
              <View
                key={q.id}
                className="flex-row gap-3 rounded-xl bg-[#181411]/80 p-4 border border-white/5"
              >
                {/* Avatar */}
                <View className="h-10 w-10 rounded-full bg-[#2a2a2a] items-center justify-center">
                  <SymbolIcon name="person" className="text-white/40" style={{ fontSize: 18 }} />
                </View>

                {/* Content */}
                <View className="flex-1">
                  <View className="flex-row items-center gap-2">
                    <Text className="text-sm font-bold text-white">{q.user}</Text>
                    <Text className="text-xs text-white/40">{q.timeAgo}</Text>
                  </View>
                  <Text className="mt-1 text-sm text-white/90 leading-relaxed">{q.text}</Text>
                </View>

                {/* Vote */}
                <TouchableOpacity className="items-center gap-0.5 pt-1 pl-2">
                  <SymbolIcon name="expand_less" className="text-white/40" />
                  <Text className={`text-xs font-bold ${q.votes > 300 ? 'text-primary' : 'text-white/40'}`}>
                    {q.votes}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Input Footer */}
        <View className="border-t border-white/10 bg-black/80 p-4 pb-8 z-20">
          <View className="flex-row items-center gap-3">
            <TextInput
              className="flex-1 rounded-full bg-white/10 px-5 py-3.5 text-sm font-medium text-white"
              placeholder="Ask a question..."
              placeholderTextColor="rgba(255,255,255,0.4)"
              value={newQuestion}
              onChangeText={setNewQuestion}
            />
            <TouchableOpacity
              className="h-11 w-11 rounded-full bg-primary items-center justify-center"
              style={{
                shadowColor: '#FF5200',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
              }}
            >
              <SymbolIcon name="send" className="text-white" style={{ fontSize: 20 }} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}
