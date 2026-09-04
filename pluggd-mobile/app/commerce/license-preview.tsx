import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  openHostedCheckout,
  reconcileHostedCheckout,
  useCommercePolicy,
} from '../../src/commerce/policy';
import { pluggdFonts } from '../../src/design/typography';
import { recommendCreditPacks } from '../../src/hooks/useCredits';
import { useWallet } from '../../src/hooks/useWallet';
import { supabase } from '../../src/lib/supabase';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

const DIGITAL_DELIVERY_CONSENT_VERSION = '2026-08-01.1';

type PreparedLicence = {
  beat: { id: string; title: string; producerName: string };
  option: {
    id: string;
    licenseType: string;
    name: string;
    amountCents: number;
    priceLabel: string;
    usageRights: string[];
    restrictions: string[];
    deliverables: string[];
    territory: string;
    term: string;
  };
  contract: { id: string; legalText: string; acceptanceRequired: boolean };
};

type PrepareBlock = 'sign_in' | 'terms_incomplete' | 'producer_authorization' | 'unavailable' | null;

async function functionErrorCode(error: unknown): Promise<string | null> {
  const context = (error as { context?: unknown } | null)?.context;
  if (!(context instanceof Response)) return null;
  try {
    const body = await context.clone().json() as { code?: unknown };
    return typeof body.code === 'string' ? body.code : null;
  } catch {
    return null;
  }
}

function list(value: unknown): string[] {
  if (Array.isArray(value)) return value.map(String).filter(Boolean);
  if (value && typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>)
      .filter(([, enabled]) => Boolean(enabled))
      .map(([label]) => label.replace(/_/g, ' '));
  }
  return [];
}

function normalizePrepared(data: unknown): PreparedLicence | null {
  if (!data || typeof data !== 'object') return null;
  const root = data as Record<string, any>;
  const beat = root.beat ?? root.item;
  const option = root.option ?? root.licenseOption ?? root.license_option;
  const contract = root.contract;
  if (!beat?.id || !option?.id || !contract?.id || !contract?.legalText && !contract?.legal_text) return null;
  const rawAmountCents = Number(
    option.amountCents ?? option.amount_cents ?? option.priceCents ?? option.price_cents ?? 0,
  );
  const amountCents = Number.isFinite(rawAmountCents) && rawAmountCents > 0
    ? Math.round(rawAmountCents)
    : 0;
  return {
    beat: {
      id: String(beat.id),
      title: String(beat.title ?? 'Untitled beat'),
      producerName: String(beat.producerName ?? beat.producer_name ?? 'Producer'),
    },
    option: {
      id: String(option.id),
      licenseType: String(option.licenseType ?? option.license_type ?? ''),
      name: String(option.name ?? option.licenseType ?? option.license_type ?? 'Professional licence'),
      amountCents,
      priceLabel: String(option.priceLabel ?? option.price_label ?? 'Price confirmed at checkout'),
      usageRights: list(option.usageRights ?? option.usage_rights),
      restrictions: list(option.restrictions),
      deliverables: list(option.deliverables ?? option.fileTypes ?? option.file_types),
      territory: String(option.territory ?? 'As defined in the licence agreement'),
      term: String(option.term ?? 'As defined in the licence agreement'),
    },
    contract: {
      id: String(contract.id),
      legalText: String(contract.legalText ?? contract.legal_text),
      acceptanceRequired: contract.acceptanceRequired !== false && contract.acceptance_required !== false,
    },
  };
}

export default function LicencePreviewScreen() {
  const theme = usePluggdTheme();
  const styles = useLicenceStyles();
  const router = useRouter();
  const wallet = useWallet();
  const { beatId, licenseOptionId } = useLocalSearchParams<{
    beatId: string;
    licenseOptionId: string;
  }>();
  const [prepared, setPrepared] = useState<PreparedLicence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [prepareBlock, setPrepareBlock] = useState<PrepareBlock>(null);
  const [legalName, setLegalName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [deliveryAccepted, setDeliveryAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const policyRequest = useMemo(() => ({
    kind: 'beat_license' as const,
    itemId: beatId,
    optionId: licenseOptionId,
    classification: 'professional_off_app' as const,
  }), [beatId, licenseOptionId]);
  const policy = useCommercePolicy(policyRequest);
  const creditsRequired = Math.max(0, Math.round(prepared?.option.amountCents ?? 0));
  const creditShortfall = Math.max(0, creditsRequired - wallet.balance.available_credits);
  const packRecommendation = useMemo(
    () => recommendCreditPacks(creditShortfall),
    [creditShortfall],
  );
  const recommendationLabel = useMemo(
    () => packRecommendation
      .map((pack) => `${pack.count > 1 ? `${pack.count} × ` : ''}${pack.label} (${pack.credits.toLocaleString()} credits)`)
      .join(' + '),
    [packRecommendation],
  );
  const creditRailAllowed = Platform.OS === 'android' && policy.permittedRail === 'credits';
  // Android digital checkout is never opened in a generic browser. A future
  // hosted choice must use the exact enrolled Play billing-program flow; until
  // that programme is standardized by server policy, this screen fails closed
  // to the globally available credit rail.
  const hostedRailAllowed = Platform.OS !== 'android' && policy.permittedRail === 'stripe_checkout';

  const prepare = useCallback(async () => {
    if (!beatId || !licenseOptionId) {
      setError('This licence selection is incomplete.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    setPrepareBlock(null);
    const { data: authData } = await supabase.auth.getUser();
    if (!authData.user) {
      setPrepareBlock('sign_in');
      setError('Sign in to review verified licence terms and continue to checkout.');
      setLoading(false);
      return;
    }
    const { data, error: requestError } = await supabase.functions.invoke('prepare-beat-license', {
      body: { beatId, licenseOptionId },
    });
    if (requestError) {
      const code = await functionErrorCode(requestError);
      if (code === 'LICENCE_TERMS_INCOMPLETE') {
        setPrepareBlock('terms_incomplete');
        setError('This producer’s licence agreement is still being finalized. This tier is not available to buy yet, and no payment has been started.');
      } else if (code === 'PRODUCER_AUTHORIZATION_REQUIRED') {
        setPrepareBlock('producer_authorization');
        setError('The producer must review and authorise this Exclusive licence before it can be offered. No payment has been started.');
      } else {
        setPrepareBlock('unavailable');
        setError('We could not load the verified licence terms right now. No payment has been started.');
      }
      setLoading(false);
      return;
    }
    const normalized = normalizePrepared(data);
    setPrepared(normalized);
    setError(normalized ? null : 'PLUGGD could not verify these licence terms.');
    setLoading(false);
  }, [beatId, licenseOptionId]);

  useEffect(() => {
    void prepare();
  }, [prepare]);

  const beginCheckout = async () => {
    if (!prepared || submitting) return;
    if (!creditRailAllowed && !hostedRailAllowed) {
      Alert.alert('Licence checkout unavailable', policy.reason);
      return;
    }
    if (!prepared.option.licenseType || creditsRequired <= 0) {
      Alert.alert('Licence checkout unavailable', 'PLUGGD could not verify this licence price and type.');
      return;
    }
    if (creditRailAllowed && creditShortfall > 0) {
      Alert.alert(
        'More credits needed',
        `You need ${creditShortfall.toLocaleString()} more credits. Add credits from the Wallet; PLUGGD will never buy multiple packs automatically.`,
      );
      return;
    }
    if (!legalName.trim()) {
      Alert.alert('Legal name required', 'Enter the name that should appear on your licence.');
      return;
    }
    if (!accepted) {
      Alert.alert('Accept the licence', 'Confirm that you have reviewed and accept the licence agreement.');
      return;
    }
    if (!deliveryAccepted) {
      Alert.alert('Choose when files arrive', 'Confirm that you want the licensed digital files supplied immediately after verified payment.');
      return;
    }

    setSubmitting(true);
    try {
      const { error: signatureError } = await supabase.functions.invoke('contract-execution', {
        body: {
          contractId: prepared.contract.id,
          signature: legalName.trim(),
          signerType: 'artist',
          digitalDeliveryConsent: {
            accepted: true,
            version: DIGITAL_DELIVERY_CONSENT_VERSION,
          },
        },
      });
      if (signatureError) throw signatureError;

      if (creditRailAllowed) {
        if (!policy.storefront || !/^[A-Z]{2}$/.test(policy.storefront)) {
          throw new Error('Google Play storefront could not be verified. No credits were spent.');
        }
        const { data, error: completionError } = await supabase.functions.invoke(
          'complete-beat-credit-license',
          {
            body: {
              beatId: prepared.beat.id,
              contractId: prepared.contract.id,
              licenseType: prepared.option.licenseType,
              commercePlatform: 'android',
              storefront: policy.storefront,
            },
          },
        );
        if (completionError) throw completionError;
        const completion = (data ?? {}) as Record<string, unknown>;
        if (completion.success !== true) {
          throw new Error(
            typeof completion.error === 'string'
              ? completion.error
              : 'PLUGGD could not grant the verified licence.',
          );
        }
        await wallet.refreshBalance();
        router.replace({
          pathname: '/commerce/success',
          params: {
            kind: 'beat_license',
            status: 'success',
            itemId: prepared.beat.id,
          },
        } as any);
        return;
      }

      const { data, error: checkoutError } = await supabase.functions.invoke('create-beat-purchase', {
        body: {
          beatId: prepared.beat.id,
          licenseOptionId: prepared.option.id,
          contractId: prepared.contract.id,
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          storefront: policy.storefront,
          platform: Platform.OS,
          returnUrl: 'pluggd://commerce/success',
        },
      });
      if (checkoutError) throw checkoutError;
      const response = (data ?? {}) as Record<string, unknown>;
      const checkoutUrl = String(response.checkoutUrl ?? response.checkout_url ?? response.url ?? '');
      const sessionId = typeof (response.sessionId ?? response.session_id) === 'string'
        ? String(response.sessionId ?? response.session_id)
        : null;
      const result = await openHostedCheckout(checkoutUrl, {
        reconcile: async () => (await reconcileHostedCheckout({
          kind: 'beat_license',
          sessionId,
          itemId: prepared.beat.id,
        })).state,
      });
      router.replace({
        pathname: '/commerce/success',
        params: {
          kind: 'beat_license',
          status: result.state,
          sessionId: sessionId ?? '',
          itemId: prepared.beat.id,
        },
      } as any);
    } catch (checkoutError) {
      Alert.alert(
        'Checkout unavailable',
        checkoutError instanceof Error ? checkoutError.message : 'Please try again.',
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <MaterialIcons name="arrow-back" size={21} color={theme.colors.text} />
        </Pressable>
        <Text style={styles.headerLabel}>LICENCE REVIEW</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading || policy.loading ? <ActivityIndicator color={theme.colors.accentFill} style={styles.loader} /> : null}
        {error ? (
          <View style={styles.unavailable}>
            <MaterialIcons name={prepareBlock === 'sign_in' ? 'lock-person' : prepareBlock === 'terms_incomplete' ? 'edit-note' : 'verified-user'} size={30} color={theme.colors.accentText} />
            <Text style={styles.title}>{prepareBlock === 'sign_in' ? 'Sign in to review the terms.' : prepareBlock === 'terms_incomplete' ? 'Licence agreement coming soon.' : prepareBlock === 'producer_authorization' ? 'Producer review required.' : 'Terms temporarily unavailable.'}</Text>
            <Text style={styles.body}>{error}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={prepareBlock === 'sign_in' ? 'Sign in to review licence' : prepareBlock === 'terms_incomplete' ? 'Go back to licence choices' : 'Try loading licence terms again'}
              style={styles.secondary}
              onPress={prepareBlock === 'sign_in' ? () => router.push('/auth/login' as any) : prepareBlock === 'terms_incomplete' ? () => router.back() : prepare}
            >
              <Text style={styles.secondaryText}>{prepareBlock === 'sign_in' ? 'Sign in' : prepareBlock === 'terms_incomplete' ? 'Back to licences' : 'Try again'}</Text>
            </Pressable>
          </View>
        ) : null}
        {prepared ? (
          <>
            <Text style={styles.kicker}>PROFESSIONAL LICENSING</Text>
            <Text style={styles.title}>{prepared.option.name}</Text>
            <Text style={styles.beat}>{prepared.beat.title} · {prepared.beat.producerName}</Text>
            <View style={styles.priceLine}>
              <Text style={styles.factLabel}>VERIFIED PRICE</Text>
              <Text style={styles.price}>
                {creditRailAllowed ? `${creditsRequired.toLocaleString()} credits` : prepared.option.priceLabel}
              </Text>
            </View>
            {creditRailAllowed ? (
              <View style={styles.creditStatus}>
                <View style={styles.creditStatusLine}>
                  <Text style={styles.factLabel}>AVAILABLE BALANCE</Text>
                  <Text style={styles.creditBalance}>{wallet.balance.available_credits.toLocaleString()} credits</Text>
                </View>
                {creditShortfall > 0 ? (
                  <>
                    <Text style={styles.shortfall}>You need exactly {creditShortfall.toLocaleString()} more credits.</Text>
                    {recommendationLabel ? (
                      <Text style={styles.recommendation}>Recommended: {recommendationLabel}. Choose each purchase yourself in Wallet.</Text>
                    ) : null}
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel={`Open Wallet to add ${creditShortfall} credits`}
                      onPress={() => router.push('/wallet' as any)}
                      style={styles.secondaryCompact}
                    >
                      <Text style={styles.secondaryText}>Add credits in Wallet</Text>
                    </Pressable>
                  </>
                ) : (
                  <Text style={styles.balanceReady}>Your current balance covers this licence.</Text>
                )}
              </View>
            ) : null}
            <Fact title="Usage rights" values={prepared.option.usageRights} empty="Defined in the licence agreement below." />
            <Fact title="Restrictions" values={prepared.option.restrictions} empty="Defined in the licence agreement below." />
            <Fact title="Deliverables" values={prepared.option.deliverables} empty="Confirmed after verified payment." />
            <View style={styles.twoCol}>
              <SmallFact label="TERRITORY" value={prepared.option.territory} />
              <SmallFact label="TERM" value={prepared.option.term} />
            </View>
            <Text style={styles.sectionTitle}>Licence agreement</Text>
            <View style={styles.legalBox}>
              <Text style={styles.legalText}>{prepared.contract.legalText}</Text>
            </View>
            <Text style={styles.inputLabel}>LEGAL NAME ON LICENCE</Text>
            <TextInput
              accessibilityLabel="Legal name on licence"
              autoCapitalize="words"
              autoComplete="name"
              value={legalName}
              onChangeText={setLegalName}
              placeholder="Enter your full legal name"
              placeholderTextColor={theme.colors.textMuted}
              style={styles.input}
            />
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: accepted }}
              accessibilityLabel="I have reviewed and accept the licence agreement"
              onPress={() => setAccepted((value) => !value)}
              style={styles.acceptRow}
            >
              <View style={[styles.checkbox, accepted && styles.checkboxOn]}>
                {accepted ? <MaterialIcons name="check" size={17} color={theme.colors.onAccent} /> : null}
              </View>
              <Text style={styles.acceptText}>I have reviewed and accept this licence agreement.</Text>
            </Pressable>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: deliveryAccepted }}
              accessibilityLabel="I request immediate access to the digital files and understand the cancellation right acknowledgement"
              accessibilityHint="This is separate from accepting the licence agreement"
              onPress={() => setDeliveryAccepted((value) => !value)}
              style={styles.deliveryRow}
            >
              <View style={[styles.checkbox, deliveryAccepted && styles.checkboxOn]}>
                {deliveryAccepted ? <MaterialIcons name="check" size={17} color={theme.colors.onAccent} /> : null}
              </View>
              <View style={styles.deliveryCopy}>
                <Text style={styles.deliveryTitle}>Immediate digital delivery</Text>
                <Text style={styles.deliveryText}>I request immediate access to the digital files and understand that, once the download begins, I lose my 14-day right to cancel to the extent permitted by law.</Text>
              </View>
            </Pressable>
            {creditRailAllowed || hostedRailAllowed ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={creditRailAllowed
                  ? `Accept licence agreement and license for ${creditsRequired} credits`
                  : `Accept licence agreement and continue to secure checkout for ${prepared.option.priceLabel}`}
                accessibilityState={{ disabled: submitting || creditShortfall > 0 || !accepted || !deliveryAccepted || !legalName.trim() }}
                disabled={submitting || creditShortfall > 0 || !accepted || !deliveryAccepted || !legalName.trim()}
                onPress={beginCheckout}
                style={[styles.primary, (submitting || creditShortfall > 0 || !accepted || !deliveryAccepted || !legalName.trim()) && styles.disabled]}
              >
                {submitting ? <ActivityIndicator color={theme.colors.onAccent} /> : <>
                  <Text style={styles.primaryText}>
                    {creditRailAllowed ? `Accept & license · ${creditsRequired.toLocaleString()} credits` : 'Accept & continue securely'}
                  </Text>
                  <MaterialIcons name="arrow-forward" size={19} color={theme.colors.onAccent} />
                </>}
              </Pressable>
            ) : (
              <View style={styles.policyBox}>
                <Text style={styles.policyTitle}>Browse only in this storefront</Text>
                <Text style={styles.policyBody}>{policy.reason}</Text>
              </View>
            )}
            <Text style={styles.footer}>Access is confirmed only after payment. You can review the price and ownership details before continuing.</Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Fact({ title, values, empty }: { title: string; values: string[]; empty: string }) {
  const theme = usePluggdTheme();
  const styles = useLicenceStyles();
  return (
    <View style={styles.fact}>
      <Text style={styles.factTitle}>{title}</Text>
      {(values.length ? values : [empty]).map((value, index) => (
        <View key={`${value}-${index}`} style={styles.factRow}>
          <MaterialIcons name={values.length ? 'check-circle' : 'info-outline'} size={16} color={theme.colors.accentText} />
          <Text style={styles.factBody}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function SmallFact({ label, value }: { label: string; value: string }) {
  const styles = useLicenceStyles();
  return <View style={styles.smallFact}><Text style={styles.factLabel}>{label}</Text><Text style={styles.smallValue}>{value}</Text></View>;
}

function useLicenceStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  header: { height: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderColor: theme.colors.divider },
  back: { width: 44, height: 44, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerLabel: { color: theme.colors.textMuted, fontSize: 10, letterSpacing: 1.5, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  content: { padding: 22, paddingBottom: 110 },
  loader: { minHeight: 260 },
  unavailable: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: theme.colors.accentText, fontSize: 10, letterSpacing: 1.8, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  title: { color: theme.colors.text, fontSize: 34, lineHeight: 39, letterSpacing: -1.2, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 7 },
  beat: { color: theme.colors.textSecondary, fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 7 },
  body: { color: theme.colors.textSecondary, fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, textAlign: 'center', marginTop: 10 },
  priceLine: { minHeight: 68, marginTop: 22, borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.divider, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  factLabel: { color: theme.colors.textMuted, fontSize: 9, letterSpacing: 1.3, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  price: { color: theme.colors.accentText, fontSize: 18, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  creditStatus: { paddingVertical: 16, borderBottomWidth: 1, borderColor: theme.colors.divider },
  creditStatusLine: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  creditBalance: { color: theme.colors.text, fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  shortfall: { color: theme.colors.danger, fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 12 },
  recommendation: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: pluggdFonts.satoshiMedium, marginTop: 5 },
  balanceReady: { color: theme.colors.success, fontSize: 12, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold, marginTop: 10 },
  fact: { paddingVertical: 18, borderBottomWidth: 1, borderColor: theme.colors.divider },
  factTitle: { color: theme.colors.text, fontSize: 17, fontFamily: pluggdFonts.displayBold, marginBottom: 10 },
  factRow: { minHeight: 28, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  factBody: { flex: 1, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiMedium },
  twoCol: { flexDirection: 'row', gap: 12, paddingVertical: 18, borderBottomWidth: 1, borderColor: theme.colors.divider },
  smallFact: { flex: 1 },
  smallValue: { color: theme.colors.text, fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold, marginTop: 6 },
  sectionTitle: { color: theme.colors.text, fontSize: 21, fontFamily: pluggdFonts.displayBold, marginTop: 24 },
  legalBox: { maxHeight: 240, padding: 15, marginTop: 12, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface },
  legalText: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: pluggdFonts.satoshiMedium },
  inputLabel: { color: theme.colors.accentText, fontSize: 9, letterSpacing: 1.3, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 22 },
  input: { minHeight: 52, marginTop: 8, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, borderRadius: 4, color: theme.colors.text, paddingHorizontal: 14, fontSize: 15, fontFamily: pluggdFonts.satoshiMedium },
  acceptRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 26, height: 26, borderRadius: 3, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  acceptText: { flex: 1, color: theme.colors.textSecondary, fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold },
  deliveryRow: { minHeight: 98, flexDirection: 'row', alignItems: 'flex-start', gap: 12, paddingVertical: 15, borderTopWidth: 1, borderColor: theme.colors.divider },
  deliveryCopy: { flex: 1 },
  deliveryTitle: { color: theme.colors.text, fontSize: 14, lineHeight: 18, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  deliveryText: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiMedium, marginTop: 4 },
  primary: { minHeight: 54, borderRadius: 5, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryText: { color: theme.colors.onAccent, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  disabled: { opacity: 0.42 },
  secondary: { minHeight: 50, minWidth: 150, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  secondaryCompact: { minHeight: 46, alignSelf: 'flex-start', paddingHorizontal: 15, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  secondaryText: { color: theme.colors.accentText, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  policyBox: { padding: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, marginTop: 4 },
  policyTitle: { color: theme.colors.text, fontSize: 15, fontFamily: pluggdFonts.displayBold },
  policyBody: { color: theme.colors.textSecondary, fontSize: 12, lineHeight: 18, fontFamily: pluggdFonts.satoshiMedium, marginTop: 5 },
  footer: { color: theme.colors.textMuted, fontSize: 10, lineHeight: 15, fontFamily: pluggdFonts.satoshiMedium, textAlign: 'center', marginTop: 16 },
  }), [theme]);
}
