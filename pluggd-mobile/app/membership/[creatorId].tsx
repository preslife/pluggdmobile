/**
 * Creator Membership Tiers — Fan-facing screen.
 *
 * Shows a creator's membership tiers so a fan can subscribe.
 * Route: /membership/[creatorId]
 *
 * Loads tiers from `membership_tiers` table (owner_type='profile', owner_id=creatorId),
 * maps each to its unique creator-tier App Store product, and purchases via StoreKit.
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
  StyleSheet,
} from 'react-native';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { SymbolIcon } from '../../components/SymbolIcon';
import { pluggdFonts } from '../../src/design/typography';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { supabase } from '../../src/lib/supabase';
import { useAuth } from '../../src/context/AuthProvider';
import { useSubscription } from '../../src/hooks/useSubscription';
import { resolveCommercePolicy } from '../../src/commerce/policy';

// Product identity is loaded by useSubscription from membership_iap_products;
// the creator and tier are never inferred from a shared price-point SKU.

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
  user_id: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  cover_image_url: string | null;
  bio: string | null;
}

export default function CreatorMembershipScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const { creatorId } = useLocalSearchParams<{ creatorId: string }>();
  const { user } = useAuth();
  const [creatorUserId, setCreatorUserId] = useState<string | null>(null);
  const {
    tiers: appleTiers,
    activeMemberships,
    subscribe,
    purchasing,
    error: subscriptionError,
    clearError,
  } = useSubscription({ creatorId: creatorUserId ?? '__creator_pending__' });

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  // Check if fan already subscribes to this creator
  const existingMembership = activeMemberships.find(
    (m) => m.creator_id === creatorUserId
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
        .select('id, user_id, full_name, username, avatar_url, cover_image_url, bio')
        .or(`id.eq.${creatorId},user_id.eq.${creatorId}`)
        .maybeSingle();

      if (profileData) {
        setCreator(profileData);
        setCreatorUserId(profileData.user_id ?? creatorId);
      }

      // Fetch published membership tiers for this creator
      const { data: tiersData, error: tiersErr } = await supabase
        .from('membership_tiers' as any)
        .select('id, name, slug, description, tier_order, price_monthly, price_yearly, features, color, emoji, image_url, current_members, max_members')
        .eq('owner_type', 'profile')
        .eq('owner_id', profileData?.id ?? creatorId)
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

      const appleProduct = appleTiers.find((product) => product.tierId === tier.id);
      if (!appleProduct?.provisioned || !appleProduct.localizedPrice) {
        Alert.alert('Available soon', 'You can browse this tier, but its Apple subscription is not provisioned yet.');
        return;
      }

      const policy = await resolveCommercePolicy({
        kind: 'creator_membership',
        itemId: creatorUserId ?? creatorId,
        optionId: tier.id,
        classification: 'digital',
      });
      if (policy.permittedRail !== 'apple_subscription') {
        Alert.alert('Subscription unavailable', policy.reason);
        return;
      }

      const priceLabel = appleProduct.localizedPrice;

      Alert.alert(
        `Subscribe to ${tier.name}`,
        `You'll be charged ${priceLabel} monthly through Apple. You can cancel anytime in Settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Subscribe',
            onPress: () => subscribe(appleProduct.sku),
          },
        ]
      );
    },
    [user, creatorId, creatorUserId, existingMembership, appleTiers, subscribe]
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
      <View style={[styles.screen, { backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center' }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <ActivityIndicator size="large" color="#ff6600" />
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
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
              className="size-11 items-center justify-center rounded-md bg-black/40 backdrop-blur-md"
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
              <Text className="text-white text-xl font-bold" style={styles.creatorName}>
                {creator?.full_name ?? creator?.username ?? 'Creator'}
              </Text>
              <Text className="text-white/60 text-sm" style={styles.meta}>Membership tiers</Text>
            </View>
          </View>
        </View>

        {/* ── Already subscribed banner ── */}
        {existingMembership && (
          <View className="mx-4 mt-4 py-4 border-y border-primary/20 flex-row items-center gap-3">
            <SymbolIcon name="verified" className="text-primary text-2xl" />
            <View className="flex-1">
              <Text className="text-white font-bold" style={styles.rowTitle}>
                You're a {existingMembership.tier_name} member
              </Text>
              <Text className="text-white/50 text-sm" style={styles.meta}>
                Subscribed to {existingMembership.creator_name}
              </Text>
            </View>
          </View>
        )}

        {/* ── Bio section ── */}
        {creator?.bio ? (
          <View className="px-4 mt-4">
            <Text className="text-zinc-400 text-sm leading-relaxed" style={styles.body}>{creator.bio}</Text>
          </View>
        ) : null}

        {/* ── Tier Cards ── */}
        <View className="px-4 mt-6">
          <Text className="text-white text-lg font-bold mb-4" style={styles.sectionTitle}>Choose your tier</Text>

          {tiers.length === 0 && (
            <View className="items-center py-12">
              <SymbolIcon name="loyalty" className="text-zinc-600 text-5xl mb-3" />
              <Text className="text-zinc-500 text-base" style={styles.body}>
                This creator hasn't set up membership tiers yet.
              </Text>
            </View>
          )}

          <View className="gap-4">
            {tiers.map((tier) => {
              const accentColor = TIER_COLORS[tier.name] ?? tier.color ?? '#ff6600';
              const icon = TIER_ICONS[tier.name] ?? 'star';
              const appleProduct = appleTiers.find((product) => product.tierId === tier.id) ?? null;
              const priceLabel = appleProduct?.localizedPrice ?? 'Not yet on sale';
              const isSelected = selectedTier === tier.id;
              const isFull =
                tier.max_members !== null &&
                tier.current_members >= tier.max_members;

              return (
                <TouchableOpacity
                  key={tier.id}
                  onPress={() => setSelectedTier(isSelected ? null : tier.id)}
                  activeOpacity={0.85}
                  className={`overflow-hidden border-y ${
                    isSelected ? 'border-primary' : 'border-white/10'
                  }`}
                >
                  {/* Tier header */}
                  <View
                    className="p-4 flex-row items-center justify-between"
                    style={{ borderBottomWidth: 1, borderBottomColor: 'rgba(255,255,255,0.06)' }}
                  >
                    <View className="flex-row items-center gap-3">
                      <View
                        className="size-12 rounded-md items-center justify-center"
                        style={{ backgroundColor: `${accentColor}20` }}
                      >
                        <SymbolIcon name={icon} className="text-2xl"
                          style={{ color: accentColor }} />
                      </View>
                      <View>
                        <Text className="text-white font-bold text-base" style={styles.rowTitle}>{tier.name}</Text>
                        {tier.current_members > 0 && (
                          <Text className="text-zinc-500 text-xs" style={styles.meta}>
                            {tier.current_members} member{tier.current_members !== 1 ? 's' : ''}
                          </Text>
                        )}
                      </View>
                    </View>
                    <View className="items-end">
                      <Text className="text-white font-bold text-lg" style={styles.price}>{priceLabel}</Text>
                    </View>
                  </View>

                  {/* Expanded content */}
                  {isSelected && (
                    <View className="p-4">
                      {tier.description && (
                        <Text className="text-zinc-400 text-sm mb-3 leading-relaxed" style={styles.body}>
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
                              <Text className="text-zinc-300 text-sm flex-1" style={styles.body}>{feature}</Text>
                            </View>
                          ))}
                        </View>
                      )}

                      {/* Subscribe button */}
                      {!existingMembership && !isFull && appleProduct?.provisioned && (
                        <TouchableOpacity
                          onPress={() => handleSubscribe(tier)}
                          disabled={purchasing}
                        className="w-full h-12 rounded-md items-center justify-center flex-row gap-2"
                          style={{ backgroundColor: accentColor }}
                        >
                          {purchasing ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <SymbolIcon name="loyalty" className="text-white text-xl" />
                              <Text className="text-white font-bold text-base" style={styles.buttonText}>
                                Subscribe — {priceLabel}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}

                      {!existingMembership && !isFull && !appleProduct?.provisioned && (
                        <View className="w-full min-h-12 px-4 rounded-md justify-center border border-white/10 bg-zinc-900">
                          <Text className="text-white font-bold" style={styles.buttonText}>Browse only</Text>
                          <Text className="text-zinc-500 text-xs mt-1" style={styles.meta}>
                            This creator tier is not yet provisioned in the App Store.
                          </Text>
                        </View>
                      )}

                      {isFull && (
                        <View className="w-full h-12 rounded-md items-center justify-center bg-zinc-800">
                          <Text className="text-zinc-500 font-medium" style={styles.buttonText}>Tier full</Text>
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
          <Text className="text-zinc-600 text-xs text-center leading-relaxed" style={styles.legal}>
            Subscriptions are billed monthly through Apple. You can manage or cancel
            anytime in your iPhone Settings → Subscriptions.
          </Text>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  creatorName: { fontFamily: pluggdFonts.displayBold, letterSpacing: -0.3 },
  sectionTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 22, lineHeight: 27 },
  rowTitle: { fontFamily: pluggdFonts.satoshiBold },
  price: { fontFamily: pluggdFonts.displayBold },
  meta: { fontFamily: pluggdFonts.satoshiMedium },
  body: { fontFamily: pluggdFonts.satoshiMedium, lineHeight: 20 },
  buttonText: { fontFamily: pluggdFonts.satoshiBlack, letterSpacing: 0.2 },
  legal: { fontFamily: pluggdFonts.satoshiMedium, lineHeight: 18 },
});
