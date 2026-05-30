/**
 * Creator Membership Tiers — Fan-facing screen.
 *
 * Shows a creator's membership tiers so a fan can subscribe.
 * Route: /membership/[creatorId]
 *
 * Loads tiers from `membership_tiers` table (owner_type='profile', owner_id=creatorId),
 * maps each to the matching Apple IAP SKU, and lets the fan purchase via StoreKit.
 */
import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SymbolIcon } from '../../components/SymbolIcon';
import { PremiumScreenBackdrop } from '../../components/PluggdPrimitives';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthProvider';
import {
  useSubscription,
  SUBSCRIPTION_SKUS,
  type SubscriptionSKU,
} from '../../src/hooks/useSubscription';

// ─── Tier colour accents (matching the tier names) ──────────────────
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

// Map tier_order → Apple SKU index
const TIER_ORDER_TO_SKU: Record<number, SubscriptionSKU> = {
  0: 'pluggd_tier_299',
  1: 'pluggd_tier_499',
  2: 'pluggd_tier_999',
  3: 'pluggd_tier_1999',
  4: 'pluggd_tier_4999',
};

interface MembershipTier {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  tier_order: number;
  price_monthly: number | null;
  price_yearly: number | null;
  features: string[];
  color: string | null;
  emoji: string | null;
  image_url: string | null;
  current_members: number;
  max_members: number | null;
}

interface CreatorProfile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
}

export default function CreatorMembershipScreen() {
  const router = useRouter();
  const { creatorId } = useLocalSearchParams<{ creatorId: string }>();
  const { user } = useAuth();
  const {
    tiers: appleTiers,
    activeMemberships,
    subscribe,
    purchasing,
    error: subscriptionError,
    clearError,
  } = useSubscription();

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  // Check if fan already subscribes to this creator
  const existingMembership = activeMemberships.find(
    (m) => m.creator_id === creatorId
  );

  useEffect(() => {
    if (!creatorId) return;
    loadCreatorAndTiers();
  }, [creatorId]);

  const loadCreatorAndTiers = async () => {
    try {
      // Fetch creator profile
      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, full_name, username, avatar_url, cover_image_url, bio')
        .eq('id', creatorId)
        .single();

      if (profileData) setCreator(profileData);

      // Fetch published membership tiers for this creator
      const { data: tiersData, error: tiersErr } = await supabase
        .from('membership_tiers' as any)
        .select('id, name, slug, description, tier_order, price_monthly, price_yearly, features, color, emoji, image_url, current_members, max_members')
        .eq('owner_type', 'profile')
        .eq('owner_id', creatorId)
        .eq('status', 'active')
        .order('tier_order', { ascending: true });

      if (tiersErr) {
        console.error('[Membership] tiers fetch error:', tiersErr);
      }

      const parsed: MembershipTier[] = (tiersData ?? []).map((t: any) => ({
        ...t,
        features: Array.isArray(t.features) ? t.features : [],
      }));

      setTiers(parsed);
    } catch (err) {
      console.error('[Membership] load error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = useCallback(
    async (tier: MembershipTier) => {
      if (!user) {
        Alert.alert('Sign in required', 'Please log in to subscribe.', [
          { text: 'Go to Login', onPress: () => router.push('/auth/login') },
          { text: 'Cancel', style: 'cancel' },
        ]);
        return;
      }

      if (existingMembership) {
        Alert.alert(
          'Already subscribed',
          `You're already a ${existingMembership.tier_name} member of this creator.`
        );
        return;
      }

      if (Platform.OS !== 'ios') {
        Alert.alert('iOS only', 'Subscriptions are currently available on iOS only.');
        return;
      }

      // Map tier_order to the corresponding Apple SKU
      const sku = TIER_ORDER_TO_SKU[tier.tier_order];
      if (!sku) {
        Alert.alert('Error', 'This tier is not available for purchase right now.');
        return;
      }

      // Find matching Apple product to show real price
      const appleProduct = appleTiers.find((t) => t.sku === sku);
      const priceLabel = appleProduct?.localizedPrice ?? `£${((tier.price_monthly ?? 0) / 100).toFixed(2)}/mo`;

      Alert.alert(
        `Subscribe to ${tier.name}`,
        `You'll be charged ${priceLabel} monthly through Apple. You can cancel anytime in Settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Subscribe',
            onPress: () => subscribe(sku, creatorId!),
          },
        ]
      );
    },
    [user, creatorId, existingMembership, appleTiers, subscribe]
  );

  // Show subscription error
  useEffect(() => {
    if (subscriptionError) {
      Alert.alert('Subscription Error', subscriptionError, [
        { text: 'OK', onPress: clearError },
      ]);
    }
  }, [subscriptionError]);

  if (loading) {
    return (
      <PremiumScreenBackdrop tone="accent" style={{ alignItems: 'center', justifyContent: 'center' }}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#FF5A00" />
      </PremiumScreenBackdrop>
    );
  }

  return (
    <PremiumScreenBackdrop tone="accent">
      <Stack.Screen options={{ headerShown: false }} />

      <ScrollView className="flex-1" contentContainerStyle={{ paddingBottom: 120 }}>
        {/* ── Hero Banner ── */}
        <View className="relative w-full h-56 bg-zinc-900">
          {creator?.cover_image_url ? (
            <Image
              source={{ uri: creator.cover_image_url }}
              className="w-full h-full opacity-70"
            />
          ) : (
            <View className="w-full h-full bg-gradient-to-b from-primary/30 to-zinc-900" />
          )}
          <View className="absolute inset-0 bg-black/40" />

          {/* Back button */}
          <View className="absolute top-0 left-0 right-0 pt-14 px-4 flex-row items-center justify-between z-20">
            <TouchableOpacity
              onPress={() => router.back()}
              className="size-10 items-center justify-center rounded-full bg-black/40 backdrop-blur-md"
            >
              <SymbolIcon name="arrow_back" className="text-white text-xl" />
            </TouchableOpacity>
            <View className="size-10" />
          </View>

          {/* Creator info overlay */}
          <View className="absolute bottom-4 left-4 right-4 flex-row items-end gap-3 z-10">
            <View className="size-16 rounded-full border-2 border-white/20 overflow-hidden bg-zinc-800">
              {creator?.avatar_url ? (
                <Image source={{ uri: creator.avatar_url }} className="w-full h-full" />
              ) : (
                <View className="w-full h-full items-center justify-center">
                  <SymbolIcon name="person" className="text-white/50 text-3xl" />
                </View>
              )}
            </View>
            <View className="flex-1 mb-1">
              <Text className="text-white text-xl font-bold">
                {creator?.full_name ?? creator?.username ?? 'Creator'}
              </Text>
              <Text className="text-white/60 text-sm">Membership Tiers</Text>
            </View>
          </View>
        </View>

        {/* ── Already subscribed banner ── */}
        {existingMembership && (
          <View className="mx-4 mt-4 p-4 rounded-2xl bg-primary/10 border border-primary/20 flex-row items-center gap-3">
            <SymbolIcon name="verified" className="text-primary text-2xl" />
            <View className="flex-1">
              <Text className="text-white font-bold">
                You're a {existingMembership.tier_name} member
              </Text>
              <Text className="text-white/50 text-sm">
                Subscribed to {existingMembership.creator_name}
              </Text>
            </View>
          </View>
        )}

        {/* ── Bio section ── */}
        {creator?.bio ? (
          <View className="px-4 mt-4">
            <Text className="text-zinc-400 text-sm leading-relaxed">{creator.bio}</Text>
          </View>
        ) : null}

        {/* ── Tier Cards ── */}
        <View className="px-4 mt-6">
          <Text className="text-white text-lg font-bold mb-4">Choose your tier</Text>

          {tiers.length === 0 && (
            <View className="items-center py-12">
              <SymbolIcon name="loyalty" className="text-zinc-600 text-5xl mb-3" />
              <Text className="text-zinc-500 text-base">
                This creator hasn't set up membership tiers yet.
              </Text>
            </View>
          )}

          <View className="gap-4">
            {tiers.map((tier) => {
              const accentColor = TIER_COLORS[tier.name] ?? tier.color ?? '#FF5A00';
              const icon = TIER_ICONS[tier.name] ?? 'star';
              const sku = TIER_ORDER_TO_SKU[tier.tier_order];
              const appleProduct = sku
                ? appleTiers.find((t) => t.sku === sku)
                : null;
              const priceLabel =
                appleProduct?.localizedPrice ??
                (tier.price_monthly
                  ? `£${(tier.price_monthly / 100).toFixed(2)}/mo`
                  : 'Free');
              const isSelected = selectedTier === tier.id;
              const isFull =
                tier.max_members !== null &&
                tier.current_members >= tier.max_members;

              return (
                <TouchableOpacity
                  key={tier.id}
                  onPress={() => setSelectedTier(isSelected ? null : tier.id)}
                  activeOpacity={0.85}
                  className={`rounded-2xl overflow-hidden border ${
                    isSelected ? 'border-primary' : 'border-white/10'
                  } bg-zinc-900/80`}
                >
                  {/* Tier header */}
                  <View
                    className="p-4 flex-row items-center justify-between"
                    style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="size-12 rounded-full items-center justify-center"
                        style={{ backgroundColor: `${accentColor}20` }}
                      >
                        <SymbolIcon name={icon} className="text-2xl"
                          style={{ color: accentColor }} />
                      </View>
                      <View>
                        <Text className="text-white font-bold text-base">{tier.name}</Text>
                        {tier.current_members > 0 && (
                          <Text className="text-zinc-500 text-xs">
                            {tier.current_members} member{tier.current_members !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-white font-bold text-lg">{priceLabel}</Text>
                    </View>
                  </View>

                  {/* Expanded content */}
                  {isSelected && (
                    <View className="p-4">
                      {tier.description && (
                        <Text className="text-zinc-400 text-sm mb-3 leading-relaxed">
                          {tier.description}
                        </Text>
                      )}

                      {/* Features list */}
                      {tier.features.length > 0 && (
                        <View className="gap-2 mb-4">
                          {tier.features.map((feature, i) => (
                            <View key={i} className="flex-row items-start gap-2">
                              <SymbolIcon name="check_circle" className="text-sm mt-0.5"
                                style={{ color: accentColor }} />
                              <Text className="text-zinc-300 text-sm flex-1">{feature}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Subscribe button */}
                      {!existingMembership && !isFull && (
                        <TouchableOpacity
                          onPress={() => handleSubscribe(tier)}
                          disabled={purchasing}
                          className="w-full h-12 rounded-full items-center justify-center flex-row gap-2"
                          style={{ backgroundColor: accentColor }}
                        >
                          {purchasing ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <SymbolIcon name="loyalty" className="text-white text-xl" />
                              <Text className="text-white font-bold text-base">
                                Subscribe — {priceLabel}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {isFull && (
                        <View className="w-full h-12 rounded-full items-center justify-center bg-zinc-800">
                          <Text className="text-zinc-500 font-medium">Tier Full</Text>
                        </View>
                      )}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── Footer note ── */}
        <View className="px-4 mt-8 items-center">
          <Text className="text-zinc-600 text-xs text-center leading-relaxed">
            Subscriptions are billed monthly through Apple. You can manage or cancel
            anytime in your iPhone Settings → Subscriptions.
          </Text>
        </View>
      </ScrollView>
    </PremiumScreenBackdrop>
  );
}
