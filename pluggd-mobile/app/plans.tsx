import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { storeProductId, storeProductPrice } from '../src/billing';
import { PurchaseLegalLinks } from '../src/components/PurchaseLegalLinks';
import { useAuth } from '../src/context/AuthProvider';
import { useBottomChromeInset } from '../src/design/useBottomChromeInset';
import { pluggdFonts } from '../src/design/typography';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import {
  type PlatformBillingCycle,
  type PlatformPlanDefinition,
  usePlatformSubscription,
} from '../src/hooks/usePlatformSubscription';

function renewalDate(value: string | null) {
  if (!value) return null;
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime())) return null;
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }).format(parsed);
}

function BillingCycleSelector({
  value,
  onChange,
  compact = false,
  theme,
}: {
  value: PlatformBillingCycle;
  onChange: (cycle: PlatformBillingCycle) => void;
  compact?: boolean;
  theme: ReturnType<typeof usePluggdTheme>;
}) {
  return (
    <View
      style={[
        styles.billingSelector,
        compact && styles.billingSelectorCompact,
        { backgroundColor: theme.colors.surface, borderColor: theme.colors.border },
      ]}
    >
      {(['monthly', 'yearly'] as const).map((cycle) => {
        const selected = value === cycle;
        return (
          <View key={cycle} style={styles.billingOptionSlot}>
            <Pressable
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={cycle === 'monthly' ? 'Show monthly plans' : 'Show yearly plans and save approximately two months'}
              onPress={() => onChange(cycle)}
              style={({ pressed }) => [
                styles.billingOption,
                compact && styles.billingOptionCompact,
                {
                  backgroundColor: selected ? theme.colors.accentSoft : 'transparent',
                  borderColor: selected ? theme.colors.accent : 'transparent',
                },
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.billingOptionText, { color: selected ? theme.colors.accent : theme.colors.textSecondary }]}>
                {cycle === 'monthly' ? 'Monthly' : 'Yearly'}
              </Text>
              {cycle === 'yearly' ? (
                <Text style={[styles.savingText, { color: theme.colors.accent }]}>
                  {compact ? 'SAVE' : 'SAVE ~2 MONTHS'}
                </Text>
              ) : null}
            </Pressable>
          </View>
        );
      })}
    </View>
  );
}

export default function PlansScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomChromeInset();
  const theme = usePluggdTheme();
  const { user } = useAuth();
  const plans = usePlatformSubscription();
  const [billingCycle, setBillingCycle] = useState<PlatformBillingCycle>('monthly');
  const [showStickyBilling, setShowStickyBilling] = useState(false);
  const productsBySku = useMemo(
    () => new Map(plans.products.map((product) => [storeProductId(product), product])),
    [plans.products],
  );
  const periodDate = renewalDate(plans.entitlement.currentPeriodEnd);

  return (
    <View style={[styles.root, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        onScroll={({ nativeEvent }) => {
          const next = nativeEvent.contentOffset.y > 430;
          setShowStickyBilling((current) => current === next ? current : next);
        }}
        scrollEventThrottle={32}
        contentContainerStyle={[
          styles.content,
          { paddingTop: Math.max(insets.top + 138, 166), paddingBottom: bottomInset + 26 },
        ]}
      >
        <View style={styles.headerRow}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.backButton,
              { borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
              pressed && styles.pressed,
            ]}
          >
            <MaterialIcons name="arrow-back" size={22} color={theme.colors.text} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>CREATOR ACCESS</Text>
            <Text style={[styles.headerTitle, { color: theme.colors.text }]}>PLUGGD Plans</Text>
          </View>
          <View style={styles.headerSpacer} />
        </View>

        <View style={[styles.hero, { backgroundColor: theme.colors.surfaceStrong, borderColor: theme.colors.border }]}>
          <View style={styles.heroTop}>
            <View style={[styles.heroIcon, { backgroundColor: theme.colors.accentSoft }]}>
              <MaterialIcons name="workspace-premium" size={25} color={theme.colors.accent} />
            </View>
            <View style={styles.heroCopy}>
              <Text style={[styles.heroKicker, { color: theme.colors.textMuted }]}>YOUR CURRENT PLAN</Text>
              <Text style={[styles.heroTitle, { color: theme.colors.text }]}>
                {plans.loading ? 'Checking access' : `${plans.entitlement.tier.slice(0, 1).toUpperCase()}${plans.entitlement.tier.slice(1)}`}
              </Text>
            </View>
            {plans.loading ? <ActivityIndicator color={theme.colors.accent} /> : (
              <View style={[styles.activePill, { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft }]}>
                <View style={[styles.activeDot, { backgroundColor: theme.colors.accent }]} />
                <Text style={[styles.activeText, { color: theme.colors.accent }]}>{plans.entitlement.status.replaceAll('_', ' ').toUpperCase()}</Text>
              </View>
            )}
          </View>
          <Text style={[styles.heroBody, { color: theme.colors.textSecondary }]}>
            Choose the creator toolkit that fits where you are now. Upgrade, restore or manage it from one clear place.
          </Text>
          {periodDate && plans.entitlement.tier !== 'free' ? (
            <Text style={[styles.periodText, { color: theme.colors.textMuted }]}>Current access runs through {periodDate}.</Text>
          ) : null}
          {!plans.loading ? (
            <Text style={[styles.periodText, { color: theme.colors.textMuted }]}>
              {plans.entitlement.billingProvider === 'apple' ? 'Billed by Apple' : plans.entitlement.billingProvider === 'stripe' ? 'Billed on the web' : plans.entitlement.source === 'access_code' || plans.entitlement.source === 'combined' ? 'Promotional access' : 'Included with PLUGGD'}
              {' · '}{plans.entitlement.commissionRate}% commission
            </Text>
          ) : null}
          {plans.entitlement.billingProvider === 'stripe' && plans.entitlement.tier !== 'free' ? (
            <View style={[styles.originNote, { backgroundColor: theme.colors.surfaceAlt, borderColor: theme.colors.border }]}>
              <MaterialIcons name="info-outline" size={17} color={theme.colors.accent} />
              <Text style={[styles.originText, { color: theme.colors.textSecondary }]}>This plan was started outside the App Store. Manage it where you originally subscribed.</Text>
            </View>
          ) : null}
        </View>

        <View style={[styles.distinction, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <MaterialIcons name="people-outline" size={19} color={theme.colors.accent} />
          <Text style={[styles.distinctionText, { color: theme.colors.textSecondary }]}>
            PLUGGD Plans power your creator tools. Creator memberships are separate and support individual artists.
          </Text>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Choose your level</Text>
          <Text style={[styles.sectionBody, { color: theme.colors.textMuted }]}>Move between plans as your workflow changes.</Text>
        </View>

        <BillingCycleSelector value={billingCycle} onChange={setBillingCycle} theme={theme} />

        <View style={styles.planStack}>
          {plans.planDefinitions.map((plan) => {
            const sku = plan.skus[billingCycle];
            const product = sku ? productsBySku.get(sku) ?? null : null;
            const isCurrentTier = plans.entitlement.tier === plan.tier;
            const isCurrent = plan.tier === 'free'
              ? isCurrentTier
              : isCurrentTier && (
                  plans.entitlement.billingProvider !== 'apple'
                  || plans.entitlement.appleProductId === sku
                );
            return (
              <PlanCard
                key={`${plan.tier}-${billingCycle}`}
                plan={plan}
                billingCycle={billingCycle}
                displayPrice={product ? storeProductPrice(product) : null}
                isCurrent={isCurrent}
                isCurrentTier={isCurrentTier}
                signedIn={Boolean(user)}
                unavailable={Boolean(sku) && !plans.loadingProducts && !product}
                busy={Boolean(sku && plans.purchasingSku === sku)}
                lockedByExternalBilling={plans.entitlement.billingProvider === 'stripe' && plans.entitlement.tier !== 'free'}
                onChoose={() => {
                  plans.clearMessage();
                  if (!user) router.push('/auth/login' as any);
                  else if (sku) void plans.subscribe(sku);
                  else router.back();
                }}
                theme={theme}
              />
            );
          })}
        </View>

        {plans.error || plans.notice ? (
          <View
            accessibilityLiveRegion="polite"
            style={[
              styles.message,
              {
                backgroundColor: plans.error ? 'rgba(180,35,24,0.10)' : theme.colors.accentSoft,
                borderColor: plans.error ? theme.colors.danger : theme.colors.borderAccent,
              },
            ]}
          >
            <MaterialIcons name={plans.error ? 'error-outline' : 'check-circle-outline'} size={19} color={plans.error ? theme.colors.danger : theme.colors.accent} />
            <Text style={[styles.messageText, { color: plans.error ? theme.colors.danger : theme.colors.textSecondary }]}>{plans.error || plans.notice}</Text>
          </View>
        ) : null}

        <View style={[styles.restoreCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
          <View style={styles.restoreCopy}>
            <Text style={[styles.restoreTitle, { color: theme.colors.text }]}>Already subscribed?</Text>
            <Text style={[styles.restoreBody, { color: theme.colors.textMuted }]}>Restore a PLUGGD plan bought with this Apple ID.</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Restore App Store purchases"
            disabled={plans.restoring}
            onPress={() => void plans.restore()}
            style={({ pressed }) => [
              styles.restoreButton,
              { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceStrong },
              pressed && styles.pressed,
            ]}
          >
            {plans.restoring ? <ActivityIndicator size="small" color={theme.colors.accent} /> : <MaterialIcons name="restore" size={18} color={theme.colors.accent} />}
            <Text style={[styles.restoreButtonText, { color: theme.colors.text }]}>{plans.restoring ? 'Restoring' : 'Restore purchases'}</Text>
          </Pressable>
        </View>

        {plans.entitlement.billingProvider === 'apple' && plans.entitlement.tier !== 'free' && plans.managementUrl ? (
          <Pressable
            accessibilityRole="link"
            accessibilityLabel="Manage App Store subscription"
            onPress={() => void Linking.openURL(plans.managementUrl!)}
            style={({ pressed }) => [styles.manageLink, pressed && styles.pressed]}
          >
            <Text style={[styles.manageLinkText, { color: theme.colors.accent }]}>Manage App Store subscription</Text>
            <MaterialIcons name="open-in-new" size={16} color={theme.colors.accent} />
          </Pressable>
        ) : null}

        <PurchaseLegalLinks note="Payment is charged to your Apple ID. Starter, Creator and Pro renew for the selected monthly or yearly period at the App Store price shown unless cancelled at least 24 hours before the current period ends. Manage or cancel in App Store subscriptions." />
      </ScrollView>
      {showStickyBilling ? (
        <View
          accessibilityLabel="Billing period selector"
          style={[
            styles.floatingBilling,
            {
              bottom: Math.max(bottomInset - 10, insets.bottom + 78),
              backgroundColor: theme.colors.surfaceStrong,
              borderColor: theme.colors.borderStrong,
              shadowColor: theme.colors.text,
            },
          ]}
        >
          <BillingCycleSelector
            value={billingCycle}
            onChange={setBillingCycle}
            compact
            theme={theme}
          />
        </View>
      ) : null}
    </View>
  );
}

function PlanCard({
  plan,
  billingCycle,
  displayPrice,
  isCurrent,
  isCurrentTier,
  signedIn,
  unavailable,
  busy,
  lockedByExternalBilling,
  onChoose,
  theme,
}: {
  plan: PlatformPlanDefinition;
  billingCycle: PlatformBillingCycle;
  displayPrice: string | null;
  isCurrent: boolean;
  isCurrentTier: boolean;
  signedIn: boolean;
  unavailable: boolean;
  busy: boolean;
  lockedByExternalBilling: boolean;
  onChoose: () => void;
  theme: ReturnType<typeof usePluggdTheme>;
}) {
  const paid = Boolean(plan.skus[billingCycle]);
  const disabled = paid
    ? isCurrent || unavailable || busy || lockedByExternalBilling
    : isCurrent;
  const buttonLabel = !paid
    ? isCurrent ? 'Current plan' : 'Continue on Free'
    : isCurrent
    ? 'Current plan'
    : lockedByExternalBilling
    ? 'Manage original plan'
    : busy
    ? 'Connecting to App Store'
    : unavailable
    ? 'Not available in App Store yet'
    : signedIn
    ? `Choose ${plan.name}`
    : 'Sign in to choose';

  return (
    <View
      style={[
        styles.planCard,
        {
          backgroundColor: plan.featured ? theme.colors.surfaceStrong : theme.colors.surface,
          borderColor: isCurrent || plan.featured ? theme.colors.borderAccent : theme.colors.border,
        },
      ]}
    >
      <View style={styles.planTop}>
        <View style={styles.planNameWrap}>
          <View style={styles.planLabelRow}>
            <Text style={[styles.planName, { color: theme.colors.text }]}>{plan.name}</Text>
            {plan.featured && !isCurrentTier ? (
              <View style={[styles.recommendedPill, { backgroundColor: theme.colors.accentSoft }]}>
                <Text style={[styles.recommendedText, { color: theme.colors.accent }]}>MOST POPULAR</Text>
              </View>
            ) : null}
            {isCurrentTier ? (
              <View style={[styles.currentPill, { borderColor: theme.colors.borderAccent }]}>
                <Text style={[styles.currentText, { color: theme.colors.accent }]}>CURRENT</Text>
              </View>
            ) : null}
          </View>
          <Text style={[styles.planSummary, { color: theme.colors.textMuted }]}>{plan.summary}</Text>
        </View>
        <View style={styles.priceWrap}>
          <Text style={[styles.price, { color: theme.colors.text }]}>{paid ? displayPrice || '—' : 'Free'}</Text>
          <Text style={[styles.pricePeriod, { color: theme.colors.textMuted }]}>{paid ? `per ${billingCycle === 'monthly' ? 'month' : 'year'}` : 'no charge'}</Text>
        </View>
      </View>

      <View style={[styles.commissionBand, { backgroundColor: theme.colors.surfaceAlt }]}>
        <MaterialIcons name="percent" size={17} color={theme.colors.accent} />
        <Text style={[styles.commissionText, { color: theme.colors.textSecondary }]}>{plan.commission}</Text>
      </View>

      <View style={styles.featureList}>
        {plan.features.map((feature) => (
          <View key={feature} style={styles.featureRow}>
            <MaterialIcons name="check-circle" size={17} color={theme.colors.accent} />
            <Text style={[styles.featureText, { color: theme.colors.textSecondary }]}>{feature}</Text>
          </View>
        ))}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel={buttonLabel}
        disabled={disabled}
        onPress={onChoose}
        style={({ pressed }) => [styles.planButton, pressed && styles.pressed]}
      >
        {busy ? <ActivityIndicator size="small" color={theme.colors.accent} /> : null}
        <Text style={[styles.planButtonText, { color: disabled ? theme.colors.textMuted : theme.colors.text }]} numberOfLines={2}>{buttonLabel}</Text>
        {!disabled ? <MaterialIcons name="arrow-forward" size={18} color={theme.colors.accent} /> : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 16 },
  headerRow: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 12 },
  backButton: { width: 46, height: 46, borderRadius: 23, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1, alignItems: 'center', gap: 1 },
  headerSpacer: { width: 46 },
  eyebrow: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, lineHeight: 12, letterSpacing: 1.35 },
  headerTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 22, lineHeight: 27 },
  hero: { borderRadius: 24, borderWidth: StyleSheet.hairlineWidth, padding: 17, gap: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  heroIcon: { width: 48, height: 48, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  heroCopy: { flex: 1, gap: 1 },
  heroKicker: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.15 },
  heroTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 25, lineHeight: 30 },
  heroBody: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 13.5, lineHeight: 19 },
  periodText: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 16 },
  activePill: { minHeight: 28, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 9, flexDirection: 'row', alignItems: 'center', gap: 6 },
  activeDot: { width: 6, height: 6, borderRadius: 3 },
  activeText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 0.8 },
  originNote: { borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, padding: 11, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  originText: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 16 },
  distinction: { borderRadius: 17, borderWidth: StyleSheet.hairlineWidth, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  distinctionText: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 18 },
  sectionHeader: { gap: 3, marginTop: 2 },
  sectionTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 23, lineHeight: 28 },
  sectionBody: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 17 },
  billingSelector: { alignSelf: 'stretch', width: '100%', minHeight: 58, borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: 4, flexDirection: 'row', alignItems: 'stretch', gap: 4 },
  billingSelectorCompact: { minHeight: 52, borderWidth: 0, borderRadius: 16, padding: 3 },
  billingOptionSlot: { flex: 1, minWidth: 0 },
  billingOption: { width: '100%', flex: 1, minHeight: 48, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, alignItems: 'center', justifyContent: 'center', gap: 1, paddingHorizontal: 8 },
  billingOptionCompact: { minHeight: 46, borderRadius: 13 },
  billingOptionText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 14.5, lineHeight: 18 },
  savingText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, lineHeight: 10.5, letterSpacing: 0.55 },
  floatingBilling: { position: 'absolute', left: 28, right: 28, zIndex: 30, borderRadius: 19, borderWidth: StyleSheet.hairlineWidth, padding: 3, shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 10 },
  planStack: { gap: 12 },
  planCard: { borderRadius: 22, borderWidth: StyleSheet.hairlineWidth, padding: 16, gap: 14 },
  planTop: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  planNameWrap: { flex: 1, gap: 5 },
  planLabelRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7 },
  planName: { fontFamily: pluggdFonts.displayBold, fontSize: 23, lineHeight: 28 },
  planSummary: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 17 },
  recommendedPill: { minHeight: 23, borderRadius: 999, paddingHorizontal: 8, justifyContent: 'center' },
  recommendedText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 0.65 },
  currentPill: { minHeight: 23, borderRadius: 999, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 8, justifyContent: 'center' },
  currentText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 0.65 },
  priceWrap: { minWidth: 82, alignItems: 'flex-end', gap: 1 },
  price: { fontFamily: pluggdFonts.displayBold, fontSize: 20, lineHeight: 25 },
  pricePeriod: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5 },
  commissionBand: { minHeight: 39, borderRadius: 12, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  commissionText: { flex: 1, fontFamily: pluggdFonts.satoshiBold, fontSize: 11.5, lineHeight: 15 },
  featureList: { gap: 9 },
  featureRow: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  featureText: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 17 },
  planButton: { minHeight: 48, paddingHorizontal: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  planButtonText: { flexShrink: 1, fontFamily: pluggdFonts.satoshiBold, fontSize: 13, lineHeight: 17, textAlign: 'center' },
  message: { borderRadius: 15, borderWidth: StyleSheet.hairlineWidth, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  messageText: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  restoreCard: { borderRadius: 20, borderWidth: StyleSheet.hairlineWidth, padding: 15, gap: 13 },
  restoreCopy: { gap: 3 },
  restoreTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 18, lineHeight: 23 },
  restoreBody: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  restoreButton: { minHeight: 48, borderRadius: 14, borderWidth: StyleSheet.hairlineWidth, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  restoreButtonText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  manageLink: { minHeight: 44, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 12 },
  manageLinkText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5, textDecorationLine: 'underline' },
  pressed: { opacity: 0.72 },
});
