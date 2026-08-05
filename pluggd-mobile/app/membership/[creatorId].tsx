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
import { PurchaseLegalLinks } from '../../src/components/PurchaseLegalLinks';
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
    loading: subscriptionLoading,
    error: subscriptionError,
    clearError,
  } = useSubscription({ creatorId: creatorUserId ?? '__creator_pending__' });

  const [creator, setCreator] = useState<CreatorProfile | null>(null);
  const [tiers, setTiers] = useState<MembershipTier[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedTier, setSelectedTier] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (router.canGoBack()) {
      router.back();
      return;
    }

    const username = creator?.username?.trim();
    if (username) {
      router.replace(`/creator/${encodeURIComponent(username)}` as any);
      return;
    }

    router.replace(`/user/${creatorUserId ?? creatorId}` as any);
  }, [creator?.username, creatorId, creatorUserId, router]);

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

      const isChangingTier = Boolean(existingMembership);
      Alert.alert(
        isChangingTier ? `Switch to ${tier.name}?` : `Join ${tier.name}?`,
        isChangingTier
          ? `Apple will show the timing and any price adjustment before you confirm the change to ${priceLabel} per month.`
          : `You'll be charged ${priceLabel} monthly through Apple. You can cancel anytime in Settings.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: isChangingTier ? 'Continue' : 'Subscribe',
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
          <LinearGradient
            colors={['#301505', '#130b07', '#070605']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFillObject}
          />
          {(creator?.cover_image_url || creator?.avatar_url) ? (
            <Image
              source={{ uri: creator.cover_image_url ?? creator.avatar_url ?? '' }}
              style={[
                StyleSheet.absoluteFillObject,
                !creator.cover_image_url && styles.heroAvatarBackdrop,
              ]}
              resizeMode="cover"
              blurRadius={creator.cover_image_url ? 0 : 18}
            />
          ) : null}
          <View pointerEvents="none" style={styles.heroGlow} />
          <LinearGradient
            colors={['rgba(7,6,5,0.16)', 'rgba(7,6,5,0.32)', '#070605']}
            locations={[0, 0.42, 1]}
            style={StyleSheet.absoluteFillObject}
          />

          <View style={[styles.heroTop, { paddingTop: insets.top + 10 }]}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={handleBack}
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
              const isCurrentTier = existingMembership?.tier_id === tier.id ||
                existingMembership?.apple_sku === appleProduct?.sku;
              const isFull =
                tier.max_members !== null &&
                tier.current_members >= tier.max_members;

              return (
                <View
                  key={tier.id}
                  style={[
                    styles.tierCard,
                    {
                      borderColor: isSelected ? `${accentColor}8f` : theme.colors.border,
                      backgroundColor: isSelected ? `${accentColor}0d` : theme.colors.surface,
                    },
                  ]}
                >
                  {isSelected && (
                    <View pointerEvents="none" style={[styles.selectedRail, { backgroundColor: accentColor }]} />
                  )}
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={`${tier.name}, ${priceLabel} per month`}
                    accessibilityHint={isSelected ? 'Collapses membership details' : 'Shows membership details'}
                    accessibilityState={{ selected: isSelected, disabled: isFull }}
                    disabled={isFull}
                    onPress={() => setSelectedTier(isSelected ? null : tier.id)}
                    style={({ pressed }) => [styles.tierHeader, pressed && styles.pressed]}
                  >
                      <View style={styles.tierIdentity}>
                        <View
                          style={[styles.tierIcon, { backgroundColor: `${accentColor}1f` }]}
                        >
                          <SymbolIcon name={icon} style={[styles.tierIconGlyph, { color: accentColor }]} />
                        </View>
                        <View style={styles.tierCopy}>
                          <Text
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.2}
                            style={[styles.tierName, { color: theme.colors.text }]}
                          >
                            {tier.name}
                          </Text>
                          <Text
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.2}
                            style={[styles.tierSupporters, { color: theme.colors.textSubtle }]}
                          >
                            {tier.current_members} supporter{tier.current_members !== 1 ? 's' : ''}
                          </Text>
                        </View>
                      </View>
                      <View style={styles.tierHeaderEnd}>
                        <View style={styles.priceBlock}>
                          <Text
                            numberOfLines={1}
                            adjustsFontSizeToFit
                            maxFontSizeMultiplier={1.15}
                            style={[styles.price, { color: theme.colors.text }]}
                          >
                            {priceLabel}
                          </Text>
                          <Text
                            numberOfLines={1}
                            maxFontSizeMultiplier={1.1}
                            style={[styles.priceTerm, { color: theme.colors.textSubtle }]}
                          >
                            PER MONTH
                          </Text>
                        </View>
                        <SymbolIcon
                          name={isSelected ? 'expand_less' : 'expand_more'}
                          style={[styles.expandIcon, { color: theme.colors.textMuted }]}
                        />
                      </View>
                  </Pressable>

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
                              <Text maxFontSizeMultiplier={1.35} style={[styles.featureText, { color: theme.colors.textSecondary }]}>
                                {feature
                                  .replace(/monthy/gi, 'Monthly')
                                  .replace(/Q\s*&\s*A/gi, 'Q&A')
                                  .replace(/^\w/, (letter) => letter.toUpperCase())}
                              </Text>
                            </View>
                        ))}
                      </View>

                      {!isFull && appleProduct?.provisioned && !isCurrentTier && (
                        <Pressable
                          accessibilityRole="button"
                          accessibilityLabel={`${existingMembership ? 'Switch to' : 'Join'} ${tier.name} for ${priceLabel} per month`}
                          accessibilityState={{ disabled: purchasing }}
                          onPress={() => handleSubscribe(tier)}
                          disabled={purchasing}
                          style={({ pressed }) => [
                            styles.joinButton,
                            pressed && styles.pressed,
                          ]}
                        >
                          <View pointerEvents="none" style={styles.joinButtonSurface} />
                          {purchasing ? (
                            <ActivityIndicator color="#0a0806" size="small" />
                          ) : (
                            <View pointerEvents="none" style={styles.joinButtonContent}>
                              <Text
                                numberOfLines={1}
                                maxFontSizeMultiplier={1.15}
                                style={styles.joinButtonText}
                              >
                                {existingMembership ? 'SWITCH TO' : 'JOIN'} {tier.name.toUpperCase()}
                              </Text>
                              <SymbolIcon name="arrow_forward" style={styles.joinButtonIcon} />
                            </View>
                          )}
                        </Pressable>
                      )}

                      {!isFull && subscriptionLoading && !appleProduct?.provisioned && (
                        <View style={[styles.storeStatusButton, { borderColor: theme.colors.border }]}>
                          <ActivityIndicator color="#ff6600" size="small" />
                          <Text style={[styles.storeStatusLabel, { color: theme.colors.text }]}>
                            CONNECTING TO APP STORE
                          </Text>
                        </View>
                      )}

                      {!isFull && !subscriptionLoading && !appleProduct?.provisioned && (
                        <View>
                          <View
                            accessibilityRole="button"
                            accessibilityState={{ disabled: true }}
                            accessibilityLabel={`${tier.name} membership is coming soon`}
                            style={[styles.storeStatusButton, styles.storeStatusUnavailable, { borderColor: `${accentColor}66` }]}
                          >
                            <Text style={[styles.storeStatusLabel, { color: theme.colors.text }]}>JOINING OPENS SOON</Text>
                            <SymbolIcon name="schedule" style={styles.storeStatusIcon} />
                          </View>
                          <Text style={[styles.pendingText, { color: theme.colors.textMuted }]}>
                            This tier is ready to explore. Apple billing will appear here as soon as availability is confirmed.
                          </Text>
                        </View>
                      )}

                      {isFull && (
                        <View style={[styles.storeStatusButton, { borderColor: theme.colors.border }]}>
                          <Text style={[styles.storeStatusLabel, { color: theme.colors.textMuted }]}>TIER CURRENTLY FULL</Text>
                          <SymbolIcon name="group" style={[styles.storeStatusIcon, { color: theme.colors.textMuted }]} />
                        </View>
                      )}

                      {isCurrentTier && (
                        <View style={[styles.currentTierButton, { borderColor: `${accentColor}66` }]}>
                          <SymbolIcon name="check_circle" style={[styles.currentTierIcon, { color: accentColor }]} />
                          <Text maxFontSizeMultiplier={1.2} style={[styles.storeStatusLabel, { color: theme.colors.text }]}>
                            CURRENT MEMBERSHIP
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </View>
              );
            })}
          </View>

          <View style={[styles.appleNote, { borderTopColor: theme.colors.border }]}>
            <SymbolIcon name="verified_user" style={styles.appleNoteIcon} />
            <Text style={[styles.legal, { color: theme.colors.textSubtle }]}>
              Subscriptions are billed monthly through Apple and renew automatically
              until cancelled. Manage or cancel anytime in iPhone Settings.
          </Text>
        </View>

          <PurchaseLegalLinks />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  flex: { flex: 1 },
  hero: { height: 220, overflow: 'hidden' },
  heroAvatarBackdrop: {
    opacity: 0.56,
    transform: [{ scale: 1.16 }],
  },
  heroGlow: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    right: -74,
    bottom: -88,
    backgroundColor: 'rgba(255,102,0,0.16)',
  },
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
    bottom: 20,
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
    borderRadius: 20,
  },
  selectedRail: {
    position: 'absolute',
    zIndex: 2,
    left: 0,
    top: 18,
    bottom: 18,
    width: 3,
    borderTopRightRadius: 3,
    borderBottomRightRadius: 3,
  },
  tierHeader: {
    position: 'relative',
    zIndex: 1,
    minHeight: 78,
    paddingLeft: 14,
    paddingRight: 116,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  tierIdentity: { flexGrow: 1, flexShrink: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 11 },
  tierCopy: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
  tierIcon: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tierIconGlyph: { fontSize: 22 },
  tierName: { fontFamily: pluggdFonts.displaySemiBold, fontSize: 16, lineHeight: 20 },
  tierSupporters: { marginTop: 2, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11 },
  tierHeaderEnd: {
    position: 'absolute',
    right: 12,
    top: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  priceBlock: { width: 74, alignItems: 'flex-end' },
  price: { fontFamily: pluggdFonts.displayBold, fontSize: 17, lineHeight: 21 },
  priceTerm: {
    marginTop: 1,
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 7,
    letterSpacing: 0.95,
  },
  expandIcon: { fontSize: 19 },
  tierBody: {
    position: 'relative',
    zIndex: 1,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 16,
    borderTopWidth: 1,
  },
  tierDescription: {
    marginBottom: 12,
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 13,
    lineHeight: 18,
  },
  featureStack: { gap: 8, marginBottom: 15 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  featureDot: { width: 5, height: 5, borderRadius: 3 },
  featureText: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  joinButton: {
    position: 'relative',
    overflow: 'hidden',
    minHeight: 54,
    borderRadius: 14,
    borderWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#ff6600',
    shadowOpacity: 0.24,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 4,
  },
  joinButtonSurface: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ff6600',
  },
  joinButtonContent: {
    position: 'relative',
    zIndex: 1,
    width: '100%',
    minHeight: 54,
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
  storeStatusButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(7,6,5,0.48)',
  },
  storeStatusUnavailable: { justifyContent: 'space-between' },
  storeStatusLabel: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 11,
    letterSpacing: 0.85,
  },
  storeStatusIcon: { color: '#ff6600', fontSize: 19 },
  currentTierButton: {
    minHeight: 52,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 9,
    backgroundColor: 'rgba(255,102,0,0.08)',
  },
  currentTierIcon: { fontSize: 19 },
  pendingText: {
    marginTop: 8,
    paddingHorizontal: 2,
    fontFamily: pluggdFonts.satoshiRegular,
    fontSize: 11,
    lineHeight: 16,
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
