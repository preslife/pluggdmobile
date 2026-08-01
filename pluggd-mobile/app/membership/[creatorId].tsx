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
  Pressable,
  Image,
  ActivityIndicator,
  Alert,
  Platform,
  StyleSheet,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useRouter, useLocalSearchParams, Stack } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
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
  currency: string | null;
  features: string[];
  color: string | null;
  emoji: string | null;
  image_url: string | null;
  current_members: number;
  max_members: number | null;
}

const formatTierPrice = (priceInMinorUnits: number | null, currency: string | null) => {
  if (priceInMinorUnits == null || !Number.isFinite(Number(priceInMinorUnits))) return null;

  const currencyCode = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currencyCode,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(priceInMinorUnits) / 100);
  } catch {
    return `$${(Number(priceInMinorUnits) / 100).toFixed(2)}`;
  }
};

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
  const insets = useSafeAreaInsets();
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
        .select('id, name, slug, description, tier_order, price_monthly, price_yearly, currency, features, color, emoji, image_url, current_members, max_members')
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
      setSelectedTier((current) => current ?? parsed[0]?.id ?? null);
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

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: insets.bottom + 72 }}
      >
        <View style={styles.hero}>
          {creator?.cover_image_url ? (
            <Image
              source={{ uri: creator.cover_image_url }}
              style={StyleSheet.absoluteFillObject}
              resizeMode="cover"
            />
          ) : (
            <LinearGradient
              colors={['#2b1608', '#120d08', '#070605']}
              style={StyleSheet.absoluteFillObject}
            />
          )}
          <LinearGradient
            colors={['rgba(7,6,5,0.12)', 'rgba(7,6,5,0.45)', '#070605']}
            locations={[0, 0.48, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={[styles.heroTop, { paddingTop: insets.top + 10 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => router.back()}
              style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
            >
              <SymbolIcon name="arrow_back" style={styles.backIcon} />
            </Pressable>
            <Text style={styles.heroEdition}>CREATOR MEMBERSHIP</Text>
            <View style={styles.topSpacer} />
          </View>

          <View style={styles.heroContent}>
            <View style={styles.avatar}>
              {creator?.avatar_url ? (
                <Image source={{ uri: creator.avatar_url }} style={styles.avatarImage} />
              ) : (
                <Text style={styles.avatarLetter}>
                  {(creator?.full_name ?? creator?.username ?? 'C').charAt(0).toUpperCase()}
                </Text>
              )}
            </View>
            <View style={styles.heroCopy}>
              <Text style={styles.creatorName}>
                {creator?.full_name ?? creator?.username ?? 'Creator'}
              </Text>
              <Text style={styles.heroSubline}>BACK THE WORK. GET CLOSER.</Text>
            </View>
          </View>
        </View>

        <View style={styles.content}>
          {creator?.bio ? (
            <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
              {creator.bio}
            </Text>
          ) : (
            <Text style={[styles.bio, { color: theme.colors.textSecondary }]}>
              Join the inner circle for direct support and members-only creator updates.
            </Text>
          )}

          <View style={[styles.signalRow, { borderColor: theme.colors.border }]}>
            <View style={styles.signalCell}>
              <Text style={[styles.signalValue, { color: theme.colors.text }]}>
                {tiers.reduce((total, tier) => total + tier.current_members, 0)}
              </Text>
              <Text style={[styles.signalLabel, { color: theme.colors.textSubtle }]}>
                SUPPORTERS
              </Text>
            </View>
            <View style={[styles.signalRule, { backgroundColor: theme.colors.border }]} />
            <View style={styles.signalCell}>
              <Text style={[styles.signalValue, { color: theme.colors.text }]}>APPLE</Text>
              <Text style={[styles.signalLabel, { color: theme.colors.textSubtle }]}>
                SECURE BILLING
              </Text>
            </View>
          </View>

        {existingMembership && (
            <View style={[styles.memberBanner, { borderColor: theme.colors.borderAccent }]}>
              <SymbolIcon name="verified" style={styles.verifiedIcon} />
              <View style={styles.flex}>
                <Text style={[styles.memberTitle, { color: theme.colors.text }]}>
                You're a {existingMembership.tier_name} member
              </Text>
                <Text style={[styles.memberMeta, { color: theme.colors.textMuted }]}>
                Subscribed to {existingMembership.creator_name}
              </Text>
            </View>
          </View>
        )}

          <View style={styles.sectionHeader}>
            <View>
              <Text style={styles.eyebrow}>CHOOSE YOUR ACCESS</Text>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>
                Membership tiers
              </Text>
            </View>
            <Text style={[styles.sectionCount, { color: theme.colors.textSubtle }]}>
              {String(tiers.length).padStart(2, '0')}
            </Text>
          </View>

          {tiers.length === 0 && (
            <View style={[styles.emptyCard, { borderColor: theme.colors.border }]}>
              <SymbolIcon name="loyalty" style={styles.emptyIcon} />
              <Text style={[styles.emptyText, { color: theme.colors.textMuted }]}>
                This creator hasn't set up membership tiers yet.
              </Text>
            </View>
          )}

          <View style={styles.tierStack}>
            {tiers.map((tier) => {
              const accentColor = TIER_COLORS[tier.name] ?? tier.color ?? '#ff6600';
              const icon = TIER_ICONS[tier.name] ?? 'star';
              const appleProduct = appleTiers.find((product) => product.tierId === tier.id) ?? null;
              const fallbackPrice = formatTierPrice(tier.price_monthly, tier.currency);
              const priceLabel = appleProduct?.localizedPrice ?? fallbackPrice ?? 'Coming soon';
              const isSelected = selectedTier === tier.id;
              const isFull =
                tier.max_members !== null &&
                tier.current_members >= tier.max_members;

              return (
                <Pressable
                  key={tier.id}
                  onPress={() => setSelectedTier(isSelected ? null : tier.id)}
                  accessibilityRole="button"
                  accessibilityLabel={`${tier.name}, ${priceLabel} per month`}
                  accessibilityState={{ expanded: isSelected }}
                  style={({ pressed }) => [
                    styles.tierCard,
                    {
                      borderColor: isSelected ? accentColor : theme.colors.border,
                      backgroundColor: theme.colors.surface,
                    },
                    pressed && styles.pressed,
                  ]}
                >
                  <LinearGradient
                    colors={[`${accentColor}24`, 'rgba(10,8,6,0)']}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 0.8, y: 1 }}
                    style={StyleSheet.absoluteFillObject}
                  />
                  <View style={styles.tierHeader}>
                    <View style={styles.tierIdentity}>
                      <View
                        style={[styles.tierIcon, { backgroundColor: `${accentColor}1f` }]}
                      >
                        <SymbolIcon name={icon} style={[styles.tierIconGlyph, { color: accentColor }]} />
                      </View>
                      <View>
                        <Text style={[styles.tierName, { color: theme.colors.text }]}>{tier.name}</Text>
                        <Text style={[styles.tierSupporters, { color: theme.colors.textSubtle }]}>
                          {tier.current_members} supporter{tier.current_members !== 1 ? 's' : ''}
                        </Text>
                      </View>
                    </View>
                    <View style={styles.priceBlock}>
                      <Text style={[styles.price, { color: theme.colors.text }]}>{priceLabel}</Text>
                      <Text style={[styles.priceTerm, { color: theme.colors.textSubtle }]}>PER MONTH</Text>
                    </View>
                  </View>

                  {isSelected && (
                    <View style={[styles.tierBody, { borderTopColor: theme.colors.border }]}>
                      {tier.description && (
                        <Text style={[styles.tierDescription, { color: theme.colors.textSecondary }]}>
                          {tier.description}
                        </Text>
                      )}

                      <View style={styles.featureStack}>
                        {(tier.features.length
                          ? tier.features
                          : ['Members-only creator updates', 'Directly support independent work']
                        ).map((feature, i) => (
                            <View key={`${tier.id}-${i}`} style={styles.featureRow}>
                              <View style={[styles.featureDot, { backgroundColor: accentColor }]} />
                              <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>
                                {feature}
                              </Text>
                            </View>
                        ))}
                      </View>

                      {!existingMembership && !isFull && appleProduct?.provisioned && (
                        <Pressable
                          onPress={() => handleSubscribe(tier)}
                          disabled={purchasing}
                          accessibilityRole="button"
                          accessibilityLabel={`Join ${tier.name} for ${priceLabel} per month`}
                          style={({ pressed }) => [
                            styles.joinButton,
                            { backgroundColor: accentColor },
                            pressed && styles.pressed,
                          ]}
                        >
                          {purchasing ? (
                            <ActivityIndicator color="#fff" size="small" />
                          ) : (
                            <>
                              <Text style={styles.joinButtonText}>JOIN {tier.name.toUpperCase()}</Text>
                              <SymbolIcon name="arrow_forward" style={styles.joinButtonIcon} />
                            </>
                          )}
                        </Pressable>
                      )}

                      {!existingMembership && !isFull && !appleProduct?.provisioned && (
                        <View style={[styles.pendingCard, { borderColor: theme.colors.border }]}>
                          <View style={styles.pendingTop}>
                            <Text style={[styles.pendingTitle, { color: theme.colors.text }]}>
                              App Store release pending
                            </Text>
                            <SymbolIcon name="schedule" style={styles.pendingIcon} />
                          </View>
                          <Text style={[styles.pendingText, { color: theme.colors.textMuted }]}>
                            Explore the tier now. Apple subscription access will appear here when approved.
                          </Text>
                        </View>
                      )}

                      {isFull && (
                        <View style={[styles.pendingCard, { borderColor: theme.colors.border }]}>
                          <Text style={[styles.pendingTitle, { color: theme.colors.textMuted }]}>Tier full</Text>
                        </View>
                      )}
                    </View>
                  )}
                </Pressable>
              );
            })}
          </View>

          <View style={[styles.appleNote, { borderTopColor: theme.colors.border }]}>
            <SymbolIcon name="verified_user" style={styles.appleNoteIcon} />
            <Text style={[styles.legal, { color: theme.colors.textSubtle }]}>
              Subscriptions are billed monthly through Apple. Manage or cancel anytime
              in iPhone Settings.
          </Text>
        </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  hero: { height: 330, overflow: 'hidden' },
  heroTop: {
    position: 'absolute',
    left: 18,
    right: 18,
    top: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(10,8,6,0.58)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  backIcon: { color: '#fff', fontSize: 22 },
  heroEdition: {
    color: 'rgba(255,255,255,0.72)',
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 10,
    letterSpacing: 2.1,
  },
  topSpacer: { width: 44 },
  heroContent: {
    position: 'absolute',
    left: 20,
    right: 20,
    bottom: 24,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
  },
  avatar: {
    width: 68,
    height: 68,
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: '#ff6600',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.22)',
  },
  avatarImage: { width: '100%', height: '100%' },
  avatarLetter: {
    color: '#0a0806',
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 34,
  },
  heroCopy: { flex: 1, paddingBottom: 2 },
  creatorName: {
    color: '#fff',
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 34,
    lineHeight: 38,
    letterSpacing: -1.1,
  },
  heroSubline: {
    marginTop: 5,
    color: '#ff6600',
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 10,
    letterSpacing: 1.45,
  },
  content: { paddingHorizontal: 18 },
  bio: {
    marginTop: 18,
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 15,
    lineHeight: 22,
  },
  signalRow: {
    flexDirection: 'row',
    marginTop: 22,
    paddingVertical: 17,
    borderTopWidth: 1,
    borderBottomWidth: 1,
  },
  signalCell: { flex: 1 },
  signalRule: { width: StyleSheet.hairlineWidth, marginHorizontal: 18 },
  signalValue: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 17,
    lineHeight: 21,
  },
  signalLabel: {
    marginTop: 3,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 9,
    letterSpacing: 1.2,
  },
  memberBanner: {
    marginTop: 18,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1,
    borderRadius: 14,
  },
  verifiedIcon: { color: '#ff6600', fontSize: 24 },
  memberTitle: { fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  memberMeta: { marginTop: 2, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12 },
  sectionHeader: {
    marginTop: 30,
    marginBottom: 14,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#ff6600',
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 9,
    letterSpacing: 1.65,
    marginBottom: 6,
  },
  sectionTitle: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 24,
    lineHeight: 29,
    letterSpacing: -0.5,
  },
  sectionCount: {
    fontFamily: pluggdFonts.displaySemiBold,
    fontSize: 13,
    letterSpacing: 1,
    paddingBottom: 3,
  },
  emptyCard: {
    minHeight: 150,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    borderWidth: 1,
    borderRadius: 18,
  },
  emptyIcon: { color: '#ff6600', fontSize: 38, marginBottom: 12 },
  emptyText: {
    maxWidth: 270,
    textAlign: 'center',
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 14,
    lineHeight: 20,
  },
  tierStack: { gap: 14 },
  tierCard: {
    position: 'relative',
    overflow: 'hidden',
    borderWidth: 1,
    borderRadius: 18,
  },
  tierHeader: {
    minHeight: 88,
    paddingHorizontal: 15,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  tierIdentity: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12 },
  tierIcon: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierIconGlyph: { fontSize: 24 },
  tierName: { fontFamily: pluggdFonts.displaySemiBold, fontSize: 16, lineHeight: 20 },
  tierSupporters: { marginTop: 4, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11 },
  priceBlock: { alignItems: 'flex-end' },
  price: { fontFamily: pluggdFonts.displayBold, fontSize: 18, lineHeight: 22 },
  priceTerm: {
    marginTop: 3,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 8,
    letterSpacing: 1.05,
  },
  tierBody: {
    padding: 16,
    borderTopWidth: 1,
  },
  tierDescription: {
    marginBottom: 14,
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 14,
    lineHeight: 20,
  },
  featureStack: { gap: 9, marginBottom: 17 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  featureDot: { width: 6, height: 6, borderRadius: 3 },
  featureText: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 18 },
  joinButton: {
    minHeight: 52,
    borderRadius: 14,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  joinButtonText: {
    color: '#0a0806',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 12,
    letterSpacing: 0.9,
  },
  joinButtonIcon: { color: '#0a0806', fontSize: 20 },
  pendingCard: {
    minHeight: 70,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: 'rgba(7,6,5,0.34)',
  },
  pendingTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  pendingTitle: { fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  pendingIcon: { color: '#ff6600', fontSize: 18 },
  pendingText: {
    marginTop: 5,
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 12,
    lineHeight: 17,
  },
  appleNote: {
    marginTop: 28,
    paddingTop: 18,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    borderTopWidth: 1,
  },
  appleNoteIcon: { color: '#ff6600', fontSize: 18 },
  legal: { fontFamily: pluggdFonts.satoshiMedium, lineHeight: 18 },
  pressed: { opacity: 0.74, transform: [{ scale: 0.992 }] },
});
