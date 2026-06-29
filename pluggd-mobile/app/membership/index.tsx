import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumScreenBackdrop } from '../../components/PluggdPrimitives';
import { useAuth } from '../../src/context/AuthProvider';
import { selectionHaptic } from '../../src/design/haptics';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import {
  SUBSCRIPTION_SKUS,
  useSubscription,
  type ActiveMembership,
  type SubscriptionTier,
} from '../../src/hooks/useSubscription';

const TIER_COLORS: Record<string, string> = {
  Bronze: '#CD7F32',
  Silver: '#C0C0C0',
  Gold: '#FFD700',
  Platinum: '#E5E4E2',
  Diamond: '#B9F2FF',
};

function tierAccent(label: string) {
  return TIER_COLORS[label] ?? '#FF5A00';
}

function tierCaption(label: string) {
  const captions: Record<string, string> = {
    Bronze: 'Starter creator support',
    Silver: 'Core creator support',
    Gold: 'Premium creator access',
    Platinum: 'Top-tier fan access',
    Diamond: 'Highest supporter tier',
  };
  return captions[label] ?? 'Monthly creator membership';
}

function formatDate(value: string | null) {
  if (!value) return 'Renews through Apple';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyMembershipsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = usePluggdTheme();
  const { user } = useAuth();
  const {
    tiers,
    activeMemberships,
    restoreSubscriptions,
    refreshMemberships,
    restoring,
    loading,
    error,
    clearError,
  } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);

  const visibleTiers = tiers.length
    ? tiers
    : SUBSCRIPTION_SKUS.map((sku, index) => ({
        sku,
        label: ['Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'][index] ?? 'Membership',
        price: ['£2.99/mo', '£4.99/mo', '£9.99/mo', '£19.99/mo', '£49.99/mo'][index] ?? 'Apple subscription',
        localizedPrice: ['£2.99/mo', '£4.99/mo', '£9.99/mo', '£19.99/mo', '£49.99/mo'][index] ?? 'Apple subscription',
        product: null,
      }));

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMemberships();
    } finally {
      setRefreshing(false);
    }
  };

  const openSubscriptionSettings = () => {
    void Linking.openURL('https://apps.apple.com/account/subscriptions');
  };

  const handleRestore = () => {
    Alert.alert('Restore purchases', 'Restore Apple memberships linked to this Apple ID.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Restore', onPress: restoreSubscriptions },
    ]);
  };

  const go = (route: string) => {
    selectionHaptic();
    router.push(route as any);
  };

  if (!user) {
    return (
      <PremiumScreenBackdrop tone="accent" style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.signedOut}>
          <MaterialIcons name="workspace-premium" size={36} color={theme.colors.accent} />
          <Text style={[styles.signedOutTitle, { color: theme.colors.text }]}>Sign in for memberships</Text>
          <Text style={[styles.signedOutBody, { color: theme.colors.textMuted }]}>
            Follow creators, subscribe with Apple, and keep active memberships in one place.
          </Text>
          <Pressable style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]} onPress={() => go('/auth/login')}>
            <Text style={styles.primaryButtonText}>Sign in</Text>
          </Pressable>
        </View>
      </PremiumScreenBackdrop>
    );
  }

  return (
    <PremiumScreenBackdrop tone="accent" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 150 }]}
      >
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.iconButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back-ios-new" size={19} color={theme.colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Manage Apple subscriptions" style={styles.iconButton} onPress={openSubscriptionSettings}>
            <MaterialIcons name="settings" size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        <LinearGradient
          colors={['rgba(255,90,0,0.24)', 'rgba(255,255,255,0.08)', 'rgba(8,8,12,0.96)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderColor: theme.colors.borderAccent }]}
        >
          <View style={styles.heroKickerRow}>
            <MaterialIcons name="workspace-premium" size={16} color={theme.colors.accent} />
            <Text style={[styles.kicker, { color: theme.colors.accent }]}>Memberships</Text>
          </View>
          <Text style={[styles.heroTitle, { color: theme.colors.text }]}>Creator access, billed through Apple.</Text>
          <Text style={[styles.heroBody, { color: theme.colors.textSecondary }]}>
            Subscribe to creators, restore purchases, and manage active memberships without leaving your account hub.
          </Text>
          <View style={styles.heroStats}>
            <StatPill label="Active" value={`${activeMemberships.length}`} />
            <StatPill label="Apple tiers" value={`${visibleTiers.length}`} />
          </View>
        </LinearGradient>

        {error ? (
          <Pressable style={[styles.errorCard, { borderColor: theme.colors.danger }]} onPress={clearError}>
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          </Pressable>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]} onPress={() => go('/discover')}>
            <Text style={styles.primaryButtonText}>Find creators</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={restoring} style={[styles.secondaryButton, { borderColor: theme.colors.border }]} onPress={handleRestore}>
            {restoring ? <ActivityIndicator color={theme.colors.text} /> : <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Restore</Text>}
          </Pressable>
        </View>

        <View style={styles.section}>
          <SectionHead title="Your memberships" subtitle="Creators you currently support." />
          {loading ? (
            <View style={styles.loadingCard}>
              <ActivityIndicator color={theme.colors.accent} />
            </View>
          ) : activeMemberships.length ? (
            <View style={styles.stack}>
              {activeMemberships.map((membership) => (
                <MembershipCard key={membership.id} membership={membership} onPress={() => go(`/membership/${membership.creator_id}`)} />
              ))}
            </View>
          ) : (
            <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <MaterialIcons name="favorite-border" size={28} color={theme.colors.accent} />
              <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No active memberships</Text>
              <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>
                When you join a creator tier, the membership card and renewal status will appear here.
              </Text>
            </View>
          )}
        </View>

        <View style={styles.section}>
          <SectionHead title="Apple subscription tiers" subtitle="The products available for creator memberships on iOS." />
          <View style={styles.tierGrid}>
            {visibleTiers.map((tier) => (
              <TierCard key={tier.sku} tier={tier} />
            ))}
          </View>
        </View>

        <View style={[styles.reviewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <MaterialIcons name="verified-user" size={22} color={theme.colors.accent} />
          <View style={styles.reviewCopy}>
            <Text style={[styles.reviewTitle, { color: theme.colors.text }]}>Apple manages billing</Text>
            <Text style={[styles.reviewBody, { color: theme.colors.textMuted }]}>
              Membership purchases, renewal, restore, and cancellation use Apple subscription controls.
            </Text>
          </View>
        </View>
      </ScrollView>
    </PremiumScreenBackdrop>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.statPill, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
      <Text style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: theme.colors.textMuted }]}>{label}</Text>
    </View>
  );
}

function SectionHead({ title, subtitle }: { title: string; subtitle: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.sectionHead}>
      <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[styles.sectionSubtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
    </View>
  );
}

function MembershipCard({ membership, onPress }: { membership: ActiveMembership; onPress: () => void }) {
  const theme = usePluggdTheme();
  const accent = tierAccent(membership.tier_name);
  const isActive = membership.status === 'active';
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.membershipCard, { borderColor: theme.colors.border }, pressed && { opacity: 0.82 }]}>
      <LinearGradient colors={[`${accent}33`, 'rgba(255,255,255,0.06)', 'rgba(8,8,12,0.96)']} style={StyleSheet.absoluteFill} />
      <View style={[styles.membershipBadge, { backgroundColor: `${accent}24`, borderColor: `${accent}66` }]}>
        <MaterialIcons name="workspace-premium" size={24} color={accent} />
      </View>
      <View style={styles.membershipCopy}>
        <Text style={[styles.membershipTitle, { color: theme.colors.text }]} numberOfLines={1}>{membership.creator_name}</Text>
        <View style={styles.membershipMetaRow}>
          <Text style={[styles.tierBadge, { color: accent, borderColor: `${accent}66`, backgroundColor: `${accent}18` }]}>{membership.tier_name}</Text>
          <View style={[styles.statusDot, { backgroundColor: isActive ? theme.colors.success : '#FBBF24' }]} />
          <Text style={[styles.membershipStatus, { color: theme.colors.textMuted }]}>{membership.status}</Text>
        </View>
        <Text style={[styles.membershipRenewal, { color: theme.colors.textSecondary }]}>
          {isActive ? 'Renews' : 'Ends'} {formatDate(membership.current_period_end)}
        </Text>
      </View>
      <MaterialIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
    </Pressable>
  );
}

function TierCard({ tier }: { tier: SubscriptionTier }) {
  const theme = usePluggdTheme();
  const accent = tierAccent(tier.label);
  return (
    <View style={[styles.tierCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
      <View style={[styles.tierIcon, { backgroundColor: `${accent}20`, borderColor: `${accent}55` }]}>
        <MaterialIcons name="star" size={20} color={accent} />
      </View>
      <Text style={[styles.tierTitle, { color: theme.colors.text }]}>{tier.label}</Text>
      <Text style={[styles.tierPrice, { color: theme.colors.accent }]}>{tier.localizedPrice || tier.price}</Text>
      <Text style={[styles.tierCaption, { color: theme.colors.textMuted }]} numberOfLines={2}>{tierCaption(tier.label)}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 18 },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  signedOut: { flex: 1, minHeight: 560, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 26, gap: 12 },
  signedOutTitle: { fontSize: 24, lineHeight: 29, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textAlign: 'center' },
  signedOutBody: { fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', textAlign: 'center' },
  hero: { borderRadius: 28, borderWidth: 1, padding: 18, gap: 13, overflow: 'hidden' },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kicker: { fontSize: 11, lineHeight: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0 },
  heroTitle: { fontSize: 34, lineHeight: 37, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', letterSpacing: 0 },
  heroBody: { fontSize: 15, lineHeight: 21, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 2 },
  statPill: { minWidth: 108, borderRadius: 18, borderWidth: 1, paddingVertical: 10, paddingHorizontal: 12 },
  statValue: { fontSize: 22, lineHeight: 25, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  statLabel: { marginTop: 1, fontSize: 11, lineHeight: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase' },
  errorCard: { borderWidth: 1, borderRadius: 18, padding: 12 },
  errorText: { fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { flex: 1, minHeight: 50, borderRadius: 999, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  primaryButtonText: { color: '#08080C', fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  secondaryButton: { minWidth: 118, minHeight: 50, borderRadius: 999, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryButtonText: { fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  section: { gap: 11 },
  sectionHead: { gap: 4 },
  sectionTitle: { fontSize: 23, lineHeight: 27, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  sectionSubtitle: { fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  loadingCard: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  stack: { gap: 10 },
  emptyCard: { borderWidth: 1, borderRadius: 22, padding: 18, gap: 9, alignItems: 'flex-start' },
  emptyTitle: { fontSize: 19, lineHeight: 23, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  emptyBody: { fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  membershipCard: { minHeight: 104, borderRadius: 22, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  membershipBadge: { width: 58, height: 58, borderRadius: 19, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  membershipCopy: { flex: 1, minWidth: 0, gap: 5 },
  membershipTitle: { fontSize: 17, lineHeight: 21, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  membershipMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tierBadge: { overflow: 'hidden', borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, lineHeight: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase' },
  statusDot: { width: 7, height: 7, borderRadius: 999 },
  membershipStatus: { fontSize: 11, lineHeight: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', textTransform: 'capitalize' },
  membershipRenewal: { fontSize: 12, lineHeight: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  tierGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  tierCard: { width: '48.4%', minHeight: 136, borderRadius: 20, borderWidth: 1, padding: 13, gap: 7 },
  tierIcon: { width: 42, height: 42, borderRadius: 14, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  tierTitle: { fontSize: 17, lineHeight: 20, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  tierPrice: { fontSize: 14, lineHeight: 17, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  tierCaption: { fontSize: 11, lineHeight: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  reviewCard: { borderWidth: 1, borderRadius: 20, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  reviewCopy: { flex: 1, gap: 4 },
  reviewTitle: { fontSize: 15, lineHeight: 18, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  reviewBody: { fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
});
