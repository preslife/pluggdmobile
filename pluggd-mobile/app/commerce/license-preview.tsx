import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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
import { supabase } from '../../src/lib/supabase';

const ORANGE = '#FF6600';

type PreparedLicence = {
  beat: { id: string; title: string; producerName: string };
  option: {
    id: string;
    name: string;
    priceLabel: string;
    usageRights: string[];
    restrictions: string[];
    deliverables: string[];
    territory: string;
    term: string;
  };
  contract: { id: string; legalText: string; acceptanceRequired: boolean };
};

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
  return {
    beat: {
      id: String(beat.id),
      title: String(beat.title ?? 'Untitled beat'),
      producerName: String(beat.producerName ?? beat.producer_name ?? 'Producer'),
    },
    option: {
      id: String(option.id),
      name: String(option.name ?? option.licenseType ?? option.license_type ?? 'Professional licence'),
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
  const router = useRouter();
  const { beatId, licenseOptionId } = useLocalSearchParams<{
    beatId: string;
    licenseOptionId: string;
  }>();
  const [prepared, setPrepared] = useState<PreparedLicence | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [legalName, setLegalName] = useState('');
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const policyRequest = useMemo(() => ({
    kind: 'beat_license' as const,
    itemId: beatId,
    optionId: licenseOptionId,
    classification: 'professional_off_app' as const,
  }), [beatId, licenseOptionId]);
  const policy = useCommercePolicy(policyRequest);

  const prepare = useCallback(async () => {
    if (!beatId || !licenseOptionId) {
      setError('This licence selection is incomplete.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: requestError } = await supabase.functions.invoke('prepare-beat-license', {
      body: { beatId, licenseOptionId },
    });
    if (requestError) {
      setError(requestError.message || 'Licence details are unavailable.');
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
    if (policy.permittedRail !== 'stripe_checkout') {
      Alert.alert('Licence checkout unavailable', policy.reason);
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

    setSubmitting(true);
    try {
      const { error: signatureError } = await supabase.functions.invoke('contract-execution', {
        body: {
          contractId: prepared.contract.id,
          signature: legalName.trim(),
          signerType: 'artist',
        },
      });
      if (signatureError) throw signatureError;

      const { data, error: checkoutError } = await supabase.functions.invoke('create-beat-purchase', {
        body: {
          beatId: prepared.beat.id,
          licenseOptionId: prepared.option.id,
          contractId: prepared.contract.id,
          requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          storefront: policy.storefront,
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
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}>
          <MaterialIcons name="arrow-back" size={21} color="#FFF" />
        </Pressable>
        <Text style={styles.headerLabel}>LICENCE REVIEW</Text>
      </View>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        {loading || policy.loading ? <ActivityIndicator color={ORANGE} style={styles.loader} /> : null}
        {error ? (
          <View style={styles.unavailable}>
            <MaterialIcons name="verified-user" size={30} color={ORANGE} />
            <Text style={styles.title}>Terms not available.</Text>
            <Text style={styles.body}>{error}</Text>
            <Pressable accessibilityRole="button" style={styles.secondary} onPress={prepare}>
              <Text style={styles.secondaryText}>Try again</Text>
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
              <Text style={styles.price}>{prepared.option.priceLabel}</Text>
            </View>
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
              placeholderTextColor="#6F6862"
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
                {accepted ? <MaterialIcons name="check" size={17} color="#0A0806" /> : null}
              </View>
              <Text style={styles.acceptText}>I have reviewed and accept this licence agreement.</Text>
            </Pressable>
            {policy.permittedRail === 'stripe_checkout' ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Accept licence agreement and continue to secure checkout for ${prepared.option.priceLabel}`}
                accessibilityState={{ disabled: submitting || !accepted || !legalName.trim() }}
                disabled={submitting || !accepted || !legalName.trim()}
                onPress={beginCheckout}
                style={[styles.primary, (submitting || !accepted || !legalName.trim()) && styles.disabled]}
              >
                {submitting ? <ActivityIndicator color="#0A0806" /> : <>
                  <Text style={styles.primaryText}>Accept & continue securely</Text>
                  <MaterialIcons name="arrow-forward" size={19} color="#0A0806" />
                </>}
              </Pressable>
            ) : (
              <View style={styles.policyBox}>
                <Text style={styles.policyTitle}>Browse only in this storefront</Text>
                <Text style={styles.policyBody}>{policy.reason}</Text>
              </View>
            )}
            <Text style={styles.footer}>PLUGGD creates access only after verified payment confirmation. Prices and ownership are resolved on the server.</Text>
          </>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function Fact({ title, values, empty }: { title: string; values: string[]; empty: string }) {
  return (
    <View style={styles.fact}>
      <Text style={styles.factTitle}>{title}</Text>
      {(values.length ? values : [empty]).map((value, index) => (
        <View key={`${value}-${index}`} style={styles.factRow}>
          <MaterialIcons name={values.length ? 'check-circle' : 'info-outline'} size={16} color={ORANGE} />
          <Text style={styles.factBody}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function SmallFact({ label, value }: { label: string; value: string }) {
  return <View style={styles.smallFact}><Text style={styles.factLabel}>{label}</Text><Text style={styles.smallValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0806' },
  header: { height: 64, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderColor: '#24201D' },
  back: { width: 44, height: 44, borderRadius: 5, borderWidth: 1, borderColor: '#37302B', alignItems: 'center', justifyContent: 'center' },
  headerLabel: { color: '#8D8681', fontSize: 10, letterSpacing: 1.5, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  content: { padding: 22, paddingBottom: 110 },
  loader: { minHeight: 260 },
  unavailable: { minHeight: 420, alignItems: 'center', justifyContent: 'center' },
  kicker: { color: ORANGE, fontSize: 10, letterSpacing: 1.8, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  title: { color: '#FFF', fontSize: 34, lineHeight: 39, letterSpacing: -1.2, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 7 },
  beat: { color: '#A39C97', fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 7 },
  body: { color: '#A39C97', fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiMedium, textAlign: 'center', marginTop: 10 },
  priceLine: { minHeight: 68, marginTop: 22, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#302A26', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  factLabel: { color: '#817A75', fontSize: 9, letterSpacing: 1.3, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  price: { color: ORANGE, fontSize: 18, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  fact: { paddingVertical: 18, borderBottomWidth: 1, borderColor: '#302A26' },
  factTitle: { color: '#FFF', fontSize: 17, fontFamily: pluggdFonts.displayBold, marginBottom: 10 },
  factRow: { minHeight: 28, flexDirection: 'row', alignItems: 'flex-start', gap: 9 },
  factBody: { flex: 1, color: '#B6AFA9', fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiMedium },
  twoCol: { flexDirection: 'row', gap: 12, paddingVertical: 18, borderBottomWidth: 1, borderColor: '#302A26' },
  smallFact: { flex: 1 },
  smallValue: { color: '#FFF', fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold, marginTop: 6 },
  sectionTitle: { color: '#FFF', fontSize: 21, fontFamily: pluggdFonts.displayBold, marginTop: 24 },
  legalBox: { maxHeight: 240, padding: 15, marginTop: 12, borderWidth: 1, borderColor: '#38312C', backgroundColor: '#12100E' },
  legalText: { color: '#B8B0AA', fontSize: 12, lineHeight: 18, fontFamily: pluggdFonts.satoshiMedium },
  inputLabel: { color: ORANGE, fontSize: 9, letterSpacing: 1.3, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 22 },
  input: { minHeight: 52, marginTop: 8, borderWidth: 1, borderColor: '#3B342F', borderRadius: 4, color: '#FFF', paddingHorizontal: 14, fontSize: 15, fontFamily: pluggdFonts.satoshiMedium },
  acceptRow: { minHeight: 62, flexDirection: 'row', alignItems: 'center', gap: 12 },
  checkbox: { width: 26, height: 26, borderRadius: 3, borderWidth: 1, borderColor: '#70665E', alignItems: 'center', justifyContent: 'center' },
  checkboxOn: { backgroundColor: ORANGE, borderColor: ORANGE },
  acceptText: { flex: 1, color: '#D5CEC8', fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold },
  primary: { minHeight: 54, borderRadius: 5, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9 },
  primaryText: { color: '#0A0806', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  disabled: { opacity: 0.42 },
  secondary: { minHeight: 50, minWidth: 150, borderWidth: 1, borderColor: ORANGE, borderRadius: 5, alignItems: 'center', justifyContent: 'center', marginTop: 20 },
  secondaryText: { color: ORANGE, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  policyBox: { padding: 16, borderWidth: 1, borderColor: '#44382F', marginTop: 4 },
  policyTitle: { color: '#FFF', fontSize: 15, fontFamily: pluggdFonts.displayBold },
  policyBody: { color: '#A39C97', fontSize: 12, lineHeight: 18, fontFamily: pluggdFonts.satoshiMedium, marginTop: 5 },
  footer: { color: '#706963', fontSize: 10, lineHeight: 15, fontFamily: pluggdFonts.satoshiMedium, textAlign: 'center', marginTop: 16 },
});
