import { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Switch } from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { SymbolIcon } from '../../components/SymbolIcon';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const [privateProfile, setPrivateProfile] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

  return (
    <View className="flex-1 bg-background-light dark:bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      <View className="flex-row items-center justify-between border-b border-transparent bg-background-light p-4 pb-2 pt-14 dark:border-white/5 dark:bg-background-dark">
        <TouchableOpacity
          onPress={() => router.back()}
          className="h-12 w-12 items-center justify-start"
        >
          <SymbolIcon name="arrow_back" className="text-slate-900 dark:text-white" style={{ fontSize: 24 }} />
        </TouchableOpacity>
        <Text className="flex-1 pr-12 text-center text-lg font-bold leading-tight tracking-tight text-slate-900 dark:text-white">
          Privacy & GDPR
        </Text>
      </View>

      <ScrollView className="flex-1" contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        <View className="gap-6">
          <View className="gap-2">
            <Text className="mb-1 pl-2 text-xs font-bold uppercase tracking-wider text-[#b9ab9d]">
              Account Privacy
            </Text>
            <View className="overflow-hidden rounded-xl border border-white/5 bg-surface-dark/50 dark:bg-[#221910]">
              <View className="flex-row items-center justify-between border-b border-white/5 p-4">
                <View className="flex-1 gap-1 pr-4">
                  <Text className="text-base font-medium text-slate-900 dark:text-white">
                    Private Profile
                  </Text>
                  <Text className="text-sm text-[#b9ab9d]">
                    Only approved followers can see your tracks and playlists.
                  </Text>
                </View>
                <Switch
                  value={privateProfile}
                  onValueChange={setPrivateProfile}
                  trackColor={{ false: '#374151', true: '#FF5200' }}
                  thumbColor="#fff"
                />
              </View>
              <View className="flex-row items-center justify-between p-4">
                <View className="flex-1 gap-1 pr-4">
                  <Text className="text-base font-medium text-slate-900 dark:text-white">
                    Show Online Status
                  </Text>
                  <Text className="text-sm text-[#b9ab9d]">
                    Allow others to see when you are active on Pluggd.
                  </Text>
                </View>
                <Switch
                  value={showOnlineStatus}
                  onValueChange={setShowOnlineStatus}
                  trackColor={{ false: '#374151', true: '#FF5200' }}
                  thumbColor="#fff"
                />
              </View>
            </View>
          </View>

          <View className="gap-2">
            <Text className="mb-1 pl-2 text-xs font-bold uppercase tracking-wider text-[#b9ab9d]">
              Safety
            </Text>
            <View className="overflow-hidden rounded-xl border border-white/5 bg-surface-dark/50 dark:bg-[#221910]">
              <SettingsRow icon="block" label="Blocked Users" />
              <View className="h-px bg-white/5" />
              <SettingsRow icon="filter_list" label="Content Filters" />
            </View>
          </View>

          <View className="gap-2">
            <Text className="mb-1 pl-2 text-xs font-bold uppercase tracking-wider text-[#b9ab9d]">
              Data & GDPR
            </Text>
            <View className="gap-5 rounded-xl border border-white/5 bg-surface-dark/50 p-5 dark:bg-[#221910]">
              <View>
                <View className="mb-2 flex-row items-center gap-2">
                  <SymbolIcon name="database" className="text-primary" />
                  <Text className="text-base font-bold text-slate-900 dark:text-white">
                    Your Data
                  </Text>
                </View>
                <Text className="text-sm leading-relaxed text-[#b9ab9d]">
                  Request a copy of your personal data, including your listening history, uploaded tracks, and account interactions.
                </Text>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/settings/data-export')}
                className="h-12 w-full flex-row items-center justify-center rounded-lg bg-primary px-4 shadow-lg shadow-orange-900/20"
              >
                <SymbolIcon name="download" className="mr-2 text-[#181411]" style={{ fontSize: 20 }} />
                <Text className="text-base font-bold tracking-wide text-[#181411]">
                  Request Data Export
                </Text>
              </TouchableOpacity>

              <View className="h-px w-full bg-white/5" />

              <View className="flex-row items-center justify-between pt-1">
                <View className="gap-1">
                  <Text className="text-sm font-medium text-slate-900 dark:text-white">
                    Delete Account
                  </Text>
                  <Text className="text-xs text-[#b9ab9d]">
                    Permanently remove your account and data
                  </Text>
                </View>
                <TouchableOpacity className="rounded-lg px-3 py-2">
                  <Text className="text-sm font-bold text-red-500">Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          <View className="px-2 pb-8">
            <Text className="text-center text-xs text-[#b9ab9d]/60">
              Review our Privacy Policy and Terms of Service for more information regarding your data rights.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function SettingsRow({ icon, label }: { icon: string; label: string }) {
  return (
    <TouchableOpacity className="flex-row items-center justify-between p-4">
      <View className="flex-row items-center gap-3">
        <View className="h-8 w-8 items-center justify-center rounded-full bg-[#393028]">
          <SymbolIcon name={icon} className="text-[#b9ab9d]" style={{ fontSize: 20 }} />
        </View>
        <Text className="text-base font-medium text-slate-900 dark:text-white">{label}</Text>
      </View>
      <SymbolIcon name="chevron_right" className="text-[#b9ab9d]" />
    </TouchableOpacity>
  );
}
