import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
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
import { useAuth } from '../../src/context/AuthProvider';
import { selectionHaptic } from '../../src/design/haptics';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { PurchaseLegalLinks } from '../../src/components/PurchaseLegalLinks';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
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

function tierAccent(label: string) {
  return TIER_COLORS[label] ?? '#ff6600';
}

function formatDate(value: string | null) {
  if (!value) return 'date pending';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MyMembershipsScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const theme = usePluggdTheme();
  const { user } = useAuth();
  const {
    activeMemberships,
    restoreSubscriptions,
    refreshMemberships,
    restoring,
    loading,
    error,
    clearError,
    storeName,
    subscriptionManagementUrl,
  } = useSubscription();
  const [refreshing, setRefreshing] = useState(false);
  const bottomInset = useBottomChromeInset();

  const handleBack = () => {
    if (router.canGoBack()) router.back();
    else router.replace('/profile' as any);
  };

  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await refreshMemberships();
    } finally {
      setRefreshing(false);
    }
  };

  const openSubscriptionSettings = () => {
    if (subscriptionManagementUrl) void Linking.openURL(subscriptionManagementUrl);
  };

  const handleRestore = () => {
    Alert.alert('Restore purchases', `Restore memberships linked to this ${storeName} account.`, [
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
      <View style={[styles.screen, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.signedOutTop}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={[styles.iconButton, { borderColor: theme.colors.border }]} onPress={handleBack}>
            <MaterialIcons name="arrow-back-ios-new" size={19} color={theme.colors.text} />
          </Pressable>
        </View>
        <View style={styles.signedOut}>
          <View style={[styles.memberMark, { borderColor: theme.colors.border }]}>
            <MaterialIcons name="workspace-premium" size={42} color={theme.colors.accent} />
            <Text style={[styles.memberMarkText, { color: theme.colors.textSubtle }]}>CREATOR ACCESS</Text>
          </View>
          <Text style={[styles.kicker, { color: theme.colors.accent }]}>MEMBERSHIPS</Text>
          <Text style={[styles.signedOutTitle, { color: theme.colors.text }]}>Back the artists shaping your world.</Text>
          <Text style={[styles.signedOutBody, { color: theme.colors.textMuted }]}>
            Join creator tiers for direct support, early releases and member-only moments. Billing stays protected by {storeName}.
          </Text>
          <View style={[styles.benefitRail, { borderTopColor: theme.colors.border, borderBottomColor: theme.colors.border }]}>
            {[
              ['01', 'EARLY DROPS'],
              ['02', 'MEMBER MOMENTS'],
              ['03', 'DIRECT SUPPORT'],
            ].map(([number, label]) => (
              <View key={number} style={styles.benefit}>
                <Text style={[styles.benefitNumber, { color: theme.colors.accent }]}>{number}</Text>
                <Text style={[styles.benefitLabel, { color: theme.colors.text }]}>{label}</Text>
              </View>
            ))}
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Sign in for memberships"
            style={[styles.primaryButton, styles.signedOutButton, { backgroundColor: theme.colors.accentFill }]}
            onPress={() => go('/auth/login')}
          >
            <Text style={[styles.primaryButtonText, { color: theme.colors.onAccent }]}>SIGN IN TO CONTINUE</Text>
            <MaterialIcons name="arrow-forward" size={19} color="#0a0806" />
          </Pressable>
          <Pressable accessibilityRole="button" style={[styles.signedOutSecondary, { borderColor: theme.colors.border }]} onPress={() => go('/discover')}>
            <Text style={[styles.signedOutSecondaryText, { color: theme.colors.text }]}>EXPLORE CREATORS</Text>
          </Pressable>
          <View style={styles.appleLine}>
            <MaterialIcons name="verified-user" size={16} color={theme.colors.textSubtle} />
            <Text style={[styles.appleLineText, { color: theme.colors.textSubtle }]}>Subscriptions managed securely through {storeName}</Text>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={theme.colors.accent} />}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: bottomInset }]}
      >
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.iconButton} onPress={handleBack}>
            <MaterialIcons name="arrow-back-ios-new" size={19} color={theme.colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel={`Manage ${storeName} subscriptions`} style={styles.iconButton} onPress={openSubscriptionSettings}>
            <MaterialIcons name="settings" size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        <View style={[styles.hero, { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surface }]}>
          <View style={styles.heroKickerRow}>
            <MaterialIcons name="workspace-premium" size={16} color={theme.colors.accent} />
            <Text style={[styles.kicker, { color: theme.colors.accent }]}>Memberships</Text>
          </View>
          <Text maxFontSizeMultiplier={1.35} style={[styles.heroTitle, { color: theme.colors.text }]}>Creator access, billed through {storeName}.</Text>
          <Text maxFontSizeMultiplier={1.6} style={[styles.heroBody, { color: theme.colors.textSecondary }]}>
            Subscribe to creators, restore purchases, and manage active memberships without leaving your account hub.
          </Text>
          <View style={styles.heroStats}>
            <StatPill label="Active" value={`${activeMemberships.length}`} />
            <StatPill label="Billing" value={storeName} />
          </View>
        </View>

        {error ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Dismiss membership error" style={[styles.errorCard, { borderColor: theme.colors.danger }]} onPress={clearError}>
            <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
          </Pressable>
        ) : null}

        <View style={styles.actionRow}>
          <Pressable accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.colors.accentFill }]} onPress={() => go('/discover')}>
            <Text style={[styles.primaryButtonText, { color: theme.colors.onAccent }]}>Find creators</Text>
          </Pressable>
          <Pressable accessibilityRole="button" disabled={restoring} style={[styles.secondaryButton, { borderColor: theme.colors.border }]} onPress={handleRestore}>
            {restoring ? <ActivityIndicator color={theme.colors.text} /> : <Text style={[styles.secondaryButtonText, { color: theme.colors.text }]}>Restore</Text>}
          </Pressable>
        </View>
        <PurchaseLegalLinks note={`Memberships renew for the period and price shown until cancelled. Manage or cancel any time in your ${storeName} subscription settings.`} />

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

        <View style={[styles.reviewCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <MaterialIcons name="verified-user" size={22} color={theme.colors.accent} />
          <View style={styles.reviewCopy}>
            <Text style={[styles.reviewTitle, { color: theme.colors.text }]}>{storeName} manages billing</Text>
            <Text style={[styles.reviewBody, { color: theme.colors.textMuted }]}>
              Membership purchases, renewal, restore, and cancellation use {storeName} subscription controls.
            </Text>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

function StatPill({ label, value }: { label: string; value: string }) {
  const theme = usePluggdTheme();
  return (
    <View style={[styles.statPill, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
      <Text maxFontSizeMultiplier={1.5} style={[styles.statValue, { color: theme.colors.text }]}>{value}</Text>
      <Text maxFontSizeMultiplier={1.5} style={[styles.statLabel, { color: theme.colors.textMuted }]}>{label}</Text>
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
      <View style={[StyleSheet.absoluteFill, { backgroundColor: `${accent}10` }]} />
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 18 },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.03)' },
  signedOutTop: { paddingHorizontal: 16, paddingTop: 12 },
  signedOut: { flex: 1, minHeight: 650, justifyContent: 'center', paddingHorizontal: 18, paddingBottom: 94 },
  memberMark: { width: 116, height: 116, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 22 },
  memberMarkText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 8, letterSpacing: 1.3 },
  signedOutTitle: { fontSize: 35, lineHeight: 39, fontFamily: pluggdFonts.displayExtraBold, maxWidth: 355 },
  signedOutBody: { fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, marginTop: 10, maxWidth: 350 },
  benefitRail: { flexDirection: 'row', borderTopWidth: StyleSheet.hairlineWidth, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 13, marginTop: 24, marginBottom: 16 },
  benefit: { flex: 1, gap: 4, paddingRight: 5 },
  benefitNumber: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 10 },
  benefitLabel: { fontFamily: pluggdFonts.satoshiBold, fontSize: 9.5, lineHeight: 13 },
  hero: { borderRadius: 5, borderWidth: 1, padding: 16, gap: 9, overflow: 'hidden' },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kicker: { fontSize: 11, lineHeight: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0 },
  heroTitle: { fontSize: 28, fontFamily: pluggdFonts.displayExtraBold, letterSpacing: -0.5 },
  heroBody: { fontSize: 13.5, lineHeight: 19, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', maxWidth: 338 },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 1 },
  statPill: { minWidth: 100, borderRadius: 5, borderWidth: 1, paddingVertical: 8, paddingHorizontal: 10 },
  statValue: { fontSize: 20, lineHeight: 23, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  statLabel: { marginTop: 1, fontSize: 11, lineHeight: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase' },
  errorCard: { borderWidth: 1, borderRadius: 5, padding: 12 },
  errorText: { fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800' },
  actionRow: { flexDirection: 'row', gap: 10 },
  primaryButton: { flex: 1, minHeight: 50, borderRadius: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  signedOutButton: { flex: 0, width: '100%', height: 52, flexDirection: 'row', gap: 8, marginTop: 0 },
  primaryButtonText: { color: '#0a0806', fontSize: 12, letterSpacing: 0.8, fontFamily: pluggdFonts.satoshiBlack },
  signedOutSecondary: { width: '100%', minHeight: 48, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  signedOutSecondaryText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12, letterSpacing: 0.7 },
  appleLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, marginTop: 14 },
  appleLineText: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5 },
  secondaryButton: { minWidth: 118, minHeight: 50, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18 },
  secondaryButtonText: { fontSize: 15, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  section: { gap: 11 },
  sectionHead: { gap: 4 },
  sectionTitle: { fontSize: 23, lineHeight: 27, fontFamily: pluggdFonts.displayBold },
  sectionSubtitle: { fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  loadingCard: { minHeight: 120, alignItems: 'center', justifyContent: 'center' },
  stack: { gap: 10 },
  emptyCard: { borderWidth: 1, borderRadius: 5, padding: 18, gap: 9, alignItems: 'flex-start' },
  emptyTitle: { fontSize: 19, lineHeight: 23, fontFamily: pluggdFonts.displayBold },
  emptyBody: { fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  membershipCard: { minHeight: 104, borderRadius: 5, borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  membershipBadge: { width: 58, height: 58, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  membershipCopy: { flex: 1, minWidth: 0, gap: 5 },
  membershipTitle: { fontSize: 17, lineHeight: 21, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  membershipMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  tierBadge: { overflow: 'hidden', borderRadius: 999, borderWidth: 1, paddingHorizontal: 8, paddingVertical: 3, fontSize: 10, lineHeight: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase' },
  statusDot: { width: 7, height: 7, borderRadius: 999 },
  membershipStatus: { fontSize: 11, lineHeight: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', textTransform: 'capitalize' },
  membershipRenewal: { fontSize: 12, lineHeight: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  reviewCard: { borderWidth: 1, borderRadius: 5, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  reviewCopy: { flex: 1, gap: 4 },
  reviewTitle: { fontSize: 15, lineHeight: 18, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  reviewBody: { fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
});
