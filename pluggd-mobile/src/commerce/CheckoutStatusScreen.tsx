import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pluggdFonts } from '../design/typography';
import {
  reconcileHostedCheckout,
  useCheckoutReconciliation,
  type HostedCheckoutState,
} from './policy';

const ORANGE = '#FF6600';

type CheckoutKind = 'beat_license' | 'event_ticket' | 'release_unlock' | 'physical_merch';

function asKind(value?: string): CheckoutKind {
  if (value === 'event_ticket' || value === 'release_unlock' || value === 'physical_merch') return value;
  return 'beat_license';
}

function asState(value?: string, fallback: HostedCheckoutState = 'pending'): HostedCheckoutState {
  if (value === 'success' || value === 'cancelled' || value === 'failed' || value === 'pending') return value;
  return fallback;
}

const COPY: Record<HostedCheckoutState, { kicker: string; title: string; body: string; icon: keyof typeof MaterialIcons.glyphMap }> = {
  success: {
    kicker: 'VERIFIED',
    title: 'Purchase confirmed.',
    body: 'Your order and access are now linked to your PLUGGD account.',
    icon: 'verified',
  },
  pending: {
    kicker: 'CONFIRMING',
    title: 'Payment is being verified.',
    body: 'You can safely leave this screen. Access appears only after the payment provider confirms the order.',
    icon: 'schedule',
  },
  cancelled: {
    kicker: 'NOT CHARGED',
    title: 'Checkout cancelled.',
    body: 'No access was created. Your selection is still available if you want to return later.',
    icon: 'close',
  },
  failed: {
    kicker: 'ACTION NEEDED',
    title: 'Payment could not be confirmed.',
    body: 'No access was created. Review the purchase record before attempting another checkout.',
    icon: 'error-outline',
  },
};

export function CheckoutStatusScreen({ defaultState = 'pending' }: { defaultState?: HostedCheckoutState }) {
  const router = useRouter();
  const params = useLocalSearchParams<{
    kind?: string;
    status?: string;
    sessionId?: string;
    itemId?: string;
  }>();
  const kind = asKind(params.kind);
  // A return-link status is navigation context, never payment evidence.
  // Successful access is shown only after the server reconciliation below.
  const returnState = asState(params.status, defaultState);
  const [state, setState] = useState<HostedCheckoutState>(
    returnState === 'success' ? 'pending' : returnState,
  );
  const [checking, setChecking] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const reconcile = useCallback(async () => {
    if (!params.sessionId || state === 'cancelled' || state === 'success') return;
    setChecking(true);
    const result = await reconcileHostedCheckout({
      kind,
      sessionId: params.sessionId,
      itemId: params.itemId,
    });
    setState(result.state);
    setMessage(result.message);
    setChecking(false);
  }, [kind, params.itemId, params.sessionId, state]);

  useEffect(() => {
    void reconcile();
  }, [reconcile]);
  useCheckoutReconciliation(reconcile, Boolean(params.sessionId) && state === 'pending');

  const copy = COPY[state];
  const destination =
    kind === 'event_ticket'
      ? '/tickets'
      : kind === 'beat_license'
        ? '/purchases'
        : kind === 'physical_merch'
          ? '/purchases'
          : '/library';

  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Text style={styles.headerLabel}>SECURE PURCHASE</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.icon}>
          {checking && state === 'pending'
            ? <ActivityIndicator color="#0A0806" />
            : <MaterialIcons name={copy.icon} size={31} color="#0A0806" />}
        </View>
        <Text style={styles.kicker}>{copy.kicker}</Text>
        <Text accessibilityRole="header" style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{message || copy.body}</Text>
        <View style={styles.rule} />
        <StatusRow label="PAYMENT" value={state === 'success' ? 'Verified' : state === 'pending' ? 'Awaiting verification' : state} />
        <StatusRow label="ACCESS" value={state === 'success' ? 'Available' : 'Not issued'} />
        <StatusRow label="RECORD" value={params.sessionId ? 'Linked securely' : 'No checkout reference'} />
        {state === 'pending' ? (
          <Pressable accessibilityRole="button" accessibilityState={{ busy: checking }} disabled={checking} style={styles.primary} onPress={reconcile}>
            {checking ? <ActivityIndicator color="#0A0806" /> : <>
              <Text style={styles.primaryText}>Check again</Text>
              <MaterialIcons name="refresh" size={19} color="#0A0806" />
            </>}
          </Pressable>
        ) : (
          <Pressable accessibilityRole="button" style={styles.primary} onPress={() => router.replace(destination as any)}>
            <Text style={styles.primaryText}>{state === 'success' ? 'Open purchase record' : 'Done'}</Text>
            <MaterialIcons name="arrow-forward" size={19} color="#0A0806" />
          </Pressable>
        )}
        <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => router.replace('/discover' as any)}>
          <Text style={styles.secondaryText}>Return to Discover</Text>
        </Pressable>
        <Text style={styles.footer}>PLUGGD does not grant access from a browser redirect alone. Verified provider confirmation is required.</Text>
      </View>
    </SafeAreaView>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return <View style={styles.statusRow}><Text style={styles.statusLabel}>{label}</Text><Text style={styles.statusValue}>{value}</Text></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0806' },
  header: { height: 64, paddingHorizontal: 24, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#24201D' },
  headerLabel: { color: '#8D8681', fontSize: 10, letterSpacing: 1.5, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  icon: { width: 58, height: 58, borderRadius: 5, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  kicker: { color: ORANGE, fontSize: 10, letterSpacing: 1.8, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  title: { color: '#FFF', fontSize: 37, lineHeight: 41, letterSpacing: -1.4, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', maxWidth: 350, marginTop: 8 },
  body: { color: '#A39C97', fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 14, maxWidth: 350 },
  rule: { height: 1, backgroundColor: '#302A26', marginTop: 30 },
  statusRow: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#302A26' },
  statusLabel: { color: '#817A75', fontSize: 10, letterSpacing: 1.3, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  statusValue: { color: '#FFF', fontSize: 13, textTransform: 'capitalize', fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  primary: { minHeight: 54, borderRadius: 5, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 24 },
  primaryText: { color: '#0A0806', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  secondary: { minHeight: 50, borderRadius: 5, borderWidth: 1, borderColor: '#39322D', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: '#FFF', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  footer: { color: '#746D67', fontSize: 10, lineHeight: 15, fontFamily: pluggdFonts.satoshiMedium, textAlign: 'center', marginTop: 16 },
});
