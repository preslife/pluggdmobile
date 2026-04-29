/**
 * My Memberships — Fan-facing screen showing all active subscriptions.
 *
 * Route: /membership
 *
 * Lists all creators the user subscribes to, with tier info and
 * quick actions (view creator, manage in iOS Settings).
 */
import { useEffect, useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Alert,
} from 'react-native';
import { useRouter, Stack } from 'expo-router';
import { useAuth } from '../../src/context/AuthProvider';
import {
  useSubscription,
  type ActiveMembership,
} from '../../src/hooks/useSubscription';

const TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
  Diamond: '#B9F2FF',
};

const TIER_ICONS: Record<string, string> = {
  Bronze: 'military_tech',
  Silver: 'workspace_premium',
  Gold: 'emoji_events',
  Platinum: 'diamond',
  Diamond: 'auto_awesome',
};

export default function MyMembershipsScreen() {
  const router = useRouter();
  const { user } = useAuth();
  const {
    activeMemberships,
    restoreSubscriptions,
    refreshMemberships,
    restoring,
    loading,
  } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = async () => {
    setRefreshing(true);
    await refreshMemberships();
    setRefreshing(false);
  };

  const openSubscriptionSettings = () => {
    // Deep-link to iOS subscription management
    Linking.openURL('https://apps.apple.com/account/subscriptions');
  };

  const handleRestore = async () => {
    Alert.alert(
      'Restore Purchases',
      'This will check Apple for any existing subscriptions linked to your Apple ID.',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Restore', onPress: restoreSubscriptions },
      ]
    );
  };

  if (!user) {
    return (
      <View className="flex-1 bg-background-dark items-center justify-center px-6">
        <Stack.Screen options={{ headerShown: false }} />
        <Text className="material-symbols-outlined text-zinc-600 text-6xl mb-4">lock</Text>
        <Text className="text-white text-xl font-bold mb-2">Sign in required</Text>
        <Text className="text-zinc-500 text-center mb-6">
          Log in to view your memberships and subscriptions.
        </Text>
        <TouchableOpacity
          onPress={() => router.push('/auth/login')}
          className="bg-primary px-8 py-3 rounded-full"
        >
          <Text className="text-white font-bold text-base">Log In</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View className="flex-1 bg-background-dark">
      <Stack.Screen options={{ headerShown: false }} />

      {/* Header */}
      <View className="pt-14 pb-4 px-4 flex-row items-center justify-between border-b border-white/5">
        <TouchableOpacity
          onPress={() => router.back()}
          className="size-10 items-center justify-center rounded-full bg-white/5"
        >
          <Text className="material-symbols-outlined text-white text-xl">arrow_back</Text>
        </TouchableOpacity>
        <Text className="text-white text-lg font-bold">My Memberships</Text>
        <TouchableOpacity
          onPress={openSubscriptionSettings}
          className="size-10 items-center justify-center rounded-full bg-white/5"
        >
          <Text className="material-symbols-outlined text-white text-xl">settings</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: 100 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#FF5200"
          />
        }
      >
        {loading ? (
          <View className="items-center justify-center py-20">
            <ActivityIndicator size="large" color="#FF5200" />
          </View>
        ) : activeMemberships.length === 0 ? (
          /* Empty state */
          <View className="items-center px-6 pt-16">
            <View className="size-24 rounded-full bg-zinc-900 items-center justify-center mb-6">
              <Text className="material-symbols-outlined text-zinc-600 text-5xl">loyalty</Text>
            </View>
            <Text className="text-white text-xl font-bold mb-2">No memberships yet</Text>
            <Text className="text-zinc-500 text-center text-sm mb-8 leading-relaxed">
              Subscribe to your favourite creators to unlock exclusive content,
              early access, and more.
            </Text>

            <TouchableOpacity
              onPress={handleRestore}
              disabled={restoring}
              className="flex-row items-center gap-2 px-6 py-3 rounded-full border border-white/10"
            >
              {restoring ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Text className="material-symbols-outlined text-white text-lg">restore</Text>
                  <Text className="text-white font-medium">Restore Purchases</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        ) : (
          /* Membership list */
          <View className="px-4 pt-4 gap-3">
            {activeMemberships.map((membership) => (
              <MembershipCard
                key={membership.id}
                membership={membership}
                onPress={() =>
                  router.push(`/membership/${membership.creator_id}`)
                }
              />
            ))}

            {/* Manage & restore actions */}
            <View className="mt-6 gap-3">
              <TouchableOpacity
                onPress={openSubscriptionSettings}
                className="flex-row items-center justify-center gap-2 py-3 rounded-xl border border-white/10"
              >
                <Text className="material-symbols-outlined text-zinc-400 text-lg">
                  open_in_new
                </Text>
                <Text className="text-zinc-400 font-medium text-sm">
                  Manage in iOS Settings
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={handleRestore}
                disabled={restoring}
                className="flex-row items-center justify-center gap-2 py-3"
              >
                {restoring ? (
                  <ActivityIndicator size="small" color="#71717a" />
                ) : (
                  <Text className="text-zinc-600 text-sm">Restore Purchases</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

// ─── Membership Card Component ───────────────────────────────────────
function MembershipCard({
  membership,
  onPress,
}: {
  membership: ActiveMembership;
  onPress: () => void;
}) {
  const accentColor = TIER_COLORS[membership.tier_name] ?? '#FF5200';
  const icon = TIER_ICONS[membership.tier_name] ?? 'star';
  const isActive = membership.status === 'active';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.85}
      className="rounded-2xl overflow-hidden border border-white/10 bg-zinc-900/80"
    >
      <View className="p-4 flex-row items-center gap-3">
        {/* Tier badge */}
        <View
          className="size-14 rounded-full items-center justify-center"
          style={{ backgroundColor: `${accentColor}20` }}
        >
          <Text
            className="material-symbols-outlined text-2xl"
            style={{ color: accentColor }}
          >
            {icon}
          </Text>
        </View>

        {/* Info */}
        <View className="flex-1">
          <Text className="text-white font-bold text-base">
            {membership.creator_name}
          </Text>
          <View className="flex-row items-center gap-2 mt-0.5">
            <View
              className="px-2 py-0.5 rounded-full"
              style={{ backgroundColor: `${accentColor}20` }}
            >
              <Text
                className="text-xs font-bold"
                style={{ color: accentColor }}
              >
                {membership.tier_name}
              </Text>
            </View>
            <View
              className={`size-2 rounded-full ${
                isActive ? 'bg-green-500' : 'bg-yellow-500'
              }`}
            />
            <Text className="text-zinc-500 text-xs capitalize">
              {membership.status}
            </Text>
          </View>
        </View>

        {/* Arrow */}
        <Text className="material-symbols-outlined text-zinc-600 text-xl">
          chevron_right
        </Text>
      </View>

      {/* Period end info */}
      {membership.current_period_end && (
        <View className="px-4 pb-3 -mt-1">
          <Text className="text-zinc-600 text-xs">
            {isActive ? 'Renews' : 'Expires'}{' '}
            {new Date(membership.current_period_end).toLocaleDateString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
}
