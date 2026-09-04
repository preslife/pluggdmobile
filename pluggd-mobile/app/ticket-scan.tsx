import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../src/design/typography';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useMutation } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState, ScreenShell, SectionTitle } from '../components/ContentUI';
import { CreatorAccessGate } from '../components/CreatorAccessGate';
import { useAuth } from '../src/context/AuthProvider';
import type { PluggdTheme } from '../src/design/tokens';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import { verifyTicketEntryToken } from '../src/features/culture/mobileServices';
import { formatDate, formatGBP } from '../src/lib/mobileContent';
import { supabase } from '../src/lib/supabase';

type TicketScanResult = {
  id: string;
  event_id: string;
  user_id: string;
  tier_id?: string | null;
  quantity: number | null;
  total_cents: number | null;
  status: string | null;
  qr_code_data: string | null;
  checked_in_at: string | null;
  created_at: string;
  event_title?: string | null;
  event_location?: string | null;
  event_starts_at?: string | null;
};

async function lookupTicket(code: string): Promise<TicketScanResult | null> {
  const trimmed = code.trim();
  if (!trimmed) throw new Error('Enter a ticket payload first.');
  if (!trimmed.startsWith('pluggd-ticket-v1:')) {
    throw new Error('Use the rotating QR code shown in the attendee ticket wallet.');
  }

  const dynamic = await verifyTicketEntryToken(trimmed);
  if (!dynamic.success) throw new Error(dynamic.error || 'Ticket verification failed.');
  if (!dynamic.valid) throw new Error(dynamic.reason || 'This ticket is not valid for entry.');

  const verified = dynamic.ticket as any;
  const orderId = verified?.ticket_order_id as string | undefined;
  const eventId = verified?.event_id as string | undefined;
  const ticketUserId = verified?.ticket_user_id as string | undefined;
  const checkedInAt = (verified?.checked_in_at as string | null | undefined) ?? new Date().toISOString();

  const event = eventId
    ? await supabase
        .from('events')
        .select('id,title,location,starts_at')
        .eq('id', eventId)
        .maybeSingle()
    : { data: null };

  return {
    id: orderId || 'dynamic-ticket',
    event_id: eventId || '',
    user_id: ticketUserId || '',
    quantity: 1,
    total_cents: null,
    status: 'checked_in',
    qr_code_data: trimmed,
    checked_in_at: checkedInAt,
    created_at: checkedInAt,
    event_title: event.data?.title ?? null,
    event_location: event.data?.location ?? null,
    event_starts_at: event.data?.starts_at ?? null,
  };
}

export default function TicketScanScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const { user, loading } = useAuth();
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [code, setCode] = useState('');
  const [result, setResult] = useState<TicketScanResult | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [scannerActive, setScannerActive] = useState(true);

  const lookup = useMutation({
    mutationFn: (payload?: string) => lookupTicket(payload ?? code),
    onSuccess: (ticket) => {
      setResult(ticket);
      setNotFound(!ticket);
      setScannerActive(false);
    },
    onError: (error) => {
      setScannerActive(false);
      Alert.alert('Lookup failed', error instanceof Error ? error.message : String(error));
    },
  });

  if (loading) {
    return (
      <ScreenShell title="Scan Tickets" subtitle="Promoter ticket verification.">
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loading}><ActivityIndicator color={theme.colors.accentText} /></View>
      </ScreenShell>
    );
  }

  if (!user) {
    return (
      <ScreenShell title="Scan Tickets" subtitle="Promoter ticket verification.">
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState title="Sign in required" body="Promoter and venue accounts can verify tickets after signing in." />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Sign in to scan tickets"
          style={styles.primaryButton}
          onPress={() => router.push('/auth/login' as any)}
        >
          <Text style={styles.primaryButtonText}>SIGN IN TO SCAN</Text>
          <MaterialIcons name="arrow-forward" size={18} color={theme.colors.onAccent} />
        </Pressable>
      </ScreenShell>
    );
  }

  const handleBarcodeScanned = (event: BarcodeScanningResult) => {
    const payload = event.data?.trim();
    if (!payload || lookup.isPending || !scannerActive) return;
    setScannerActive(false);
    setCode(payload);
    setNotFound(false);
    lookup.mutate(payload);
  };

  const resetScanner = () => {
    setResult(null);
    setNotFound(false);
    setScannerActive(true);
  };

  return (
    <CreatorAccessGate
      requiredRoles={['promoter', 'venue']}
      title="Event access required"
      body="Ticket scanning is available to promoter and venue accounts assigned to event operations."
    >
      <ScreenShell title="Scan Tickets" subtitle="Camera QR verification for promoter and venue teams.">
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />

      <SectionTitle title="Camera scanner" />
      <View style={styles.cameraCard}>
        {cameraPermission?.granted ? (
          <View style={styles.cameraFrame}>
            <CameraView
              style={styles.camera}
              facing="back"
              barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
              onBarcodeScanned={scannerActive ? handleBarcodeScanned : undefined}
            />
            <View style={styles.scanOverlay}>
              <View style={styles.cornerTopLeft} />
              <View style={styles.cornerTopRight} />
              <View style={styles.cornerBottomLeft} />
              <View style={styles.cornerBottomRight} />
              <Text style={styles.scanHint}>
                {lookup.isPending ? 'Verifying ticket...' : scannerActive ? 'Align ticket QR inside the frame' : 'Scanner paused'}
              </Text>
            </View>
          </View>
        ) : (
          <View style={styles.permissionCard}>
            <MaterialIcons name="qr-code-scanner" size={34} color={theme.colors.accentText} />
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionText}>
              Promoter and venue accounts can scan PLUGGD ticket QR payloads after camera permission is enabled.
            </Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Enable camera"
              style={styles.permissionButton}
              onPress={() => requestCameraPermission()}
            >
              <Text style={styles.permissionButtonText}>Enable Camera</Text>
            </Pressable>
          </View>
        )}
        {!scannerActive ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Scan another ticket"
            style={styles.secondaryButton}
            onPress={resetScanner}
          >
            <Text style={styles.secondaryButtonText}>Scan Another Ticket</Text>
          </Pressable>
        ) : null}
      </View>

      <SectionTitle title="Manual fallback" />
      <View style={styles.scanCard}>
        <TextInput
          value={code}
          onChangeText={(value) => {
            setCode(value);
            setNotFound(false);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Paste rotating ticket payload"
          placeholderTextColor={theme.colors.textMuted}
          style={styles.input}
        />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Verify ticket payload"
          accessibilityState={{ disabled: lookup.isPending }}
          style={styles.lookupButton}
          onPress={() => lookup.mutate(undefined)}
          disabled={lookup.isPending}
        >
          {lookup.isPending ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={styles.lookupText}>Verify</Text>}
        </Pressable>
      </View>

      {notFound ? (
        <EmptyState title="Ticket not found" body="No visible ticket order matched this QR payload for the current account permissions." />
      ) : null}

      {result ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={[styles.statusIcon, result.status === 'checked_in' && styles.statusIconChecked]}>
              <MaterialIcons name={result.status === 'checked_in' ? 'check' : 'confirmation-number'} size={24} color={result.status === 'checked_in' ? theme.colors.onAccent : theme.colors.text} />
            </View>
            <View style={styles.resultCopy}>
              <Text style={styles.resultTitle}>{result.event_title || 'Verified ticket order'}</Text>
              <Text style={styles.resultMeta}>{result.event_location || 'Venue TBA'} · {formatDate(result.event_starts_at || result.created_at)}</Text>
            </View>
          </View>
          <View style={styles.detailGrid}>
            <Detail label="Status" value={result.status || 'pending'} />
            <Detail label="Quantity" value={String(result.quantity ?? 1)} />
            <Detail label="Total" value={formatGBP(result.total_cents, { cents: true })} />
          </View>
          <Text style={styles.payload} numberOfLines={2}>{result.qr_code_data}</Text>
          <View accessibilityRole="summary" accessibilityLabel="Entry confirmed" style={styles.confirmedBanner}>
            <View style={styles.confirmedIcon}><MaterialIcons name="check" size={20} color={theme.colors.onAccent} /></View>
            <View style={styles.confirmedCopy}>
              <Text style={styles.confirmedTitle}>Entry confirmed</Text>
              <Text style={styles.confirmedText}>This rotating code is now used and cannot be replayed.</Text>
            </View>
          </View>
        </View>
      ) : null}

        <EmptyState title="Ticket security" body="Rotating entry codes help protect supported tickets during door checks." />
      </ScreenShell>
    </CreatorAccessGate>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function createStyles(theme: PluggdTheme) {
  return StyleSheet.create({
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  cameraCard: { borderRadius: 5, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 10, gap: 10, overflow: 'hidden' },
  cameraFrame: { height: 280, borderRadius: 4, overflow: 'hidden', backgroundColor: '#0a0806' },
  camera: { ...StyleSheet.absoluteFillObject },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  scanHint: { position: 'absolute', bottom: 18, color: '#FFFFFF', fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
  cornerTopLeft: { position: 'absolute', top: 58, left: 52, width: 42, height: 42, borderLeftWidth: 3, borderTopWidth: 3, borderColor: theme.colors.accentFill, borderTopLeftRadius: 4 },
  cornerTopRight: { position: 'absolute', top: 58, right: 52, width: 42, height: 42, borderRightWidth: 3, borderTopWidth: 3, borderColor: theme.colors.accentFill, borderTopRightRadius: 4 },
  cornerBottomLeft: { position: 'absolute', bottom: 58, left: 52, width: 42, height: 42, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: theme.colors.accentFill, borderBottomLeftRadius: 4 },
  cornerBottomRight: { position: 'absolute', bottom: 58, right: 52, width: 42, height: 42, borderRightWidth: 3, borderBottomWidth: 3, borderColor: theme.colors.accentFill, borderBottomRightRadius: 4 },
  permissionCard: { minHeight: 240, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, alignItems: 'flex-start', justifyContent: 'center', padding: 22 },
  permissionTitle: { color: theme.colors.text, fontSize: 20, fontFamily: pluggdFonts.displayBold, marginTop: 12 },
  permissionText: { color: theme.colors.textSecondary, fontSize: 13, fontFamily: pluggdFonts.satoshiMedium, textAlign: 'left', lineHeight: 19, marginTop: 8 },
  permissionButton: { minHeight: 44, borderRadius: 4, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 16 },
  permissionButtonText: { color: theme.colors.onAccent, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  secondaryButton: { minHeight: 44, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { color: theme.colors.text, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  scanCard: { borderRadius: 5, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 12, gap: 10 },
  input: { minHeight: 54, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, paddingHorizontal: 12, fontSize: 14, fontFamily: pluggdFonts.satoshiMedium },
  lookupButton: { height: 48, borderRadius: 4, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center' },
  lookupText: { color: theme.colors.onAccent, fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  resultCard: { marginTop: 16, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surface, padding: 14, gap: 13 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
  statusIconChecked: { backgroundColor: theme.colors.accentFill },
  resultCopy: { flex: 1, minWidth: 0 },
  resultTitle: { color: theme.colors.text, fontSize: 18, fontFamily: pluggdFonts.displayBold },
  resultMeta: { color: theme.colors.textSecondary, fontSize: 12, fontFamily: pluggdFonts.satoshiMedium, marginTop: 4 },
  detailGrid: { flexDirection: 'row', gap: 8 },
  detail: { flex: 1, borderRadius: 4, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised, padding: 10 },
  detailLabel: { color: theme.colors.textMuted, fontSize: 10, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: theme.colors.text, fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 5, textTransform: 'capitalize' },
  payload: { color: theme.colors.textMuted, fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', lineHeight: 16 },
  confirmedBanner: { minHeight: 68, borderRadius: 5, borderWidth: 1, borderColor: theme.colors.success, backgroundColor: theme.colors.surfaceRaised, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 12 },
  confirmedIcon: { width: 38, height: 38, borderRadius: 19, backgroundColor: theme.colors.success, alignItems: 'center', justifyContent: 'center' },
  confirmedCopy: { flex: 1, minWidth: 0 },
  confirmedTitle: { color: theme.colors.text, fontSize: 14, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  confirmedText: { color: theme.colors.textSecondary, fontSize: 11, lineHeight: 16, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 2 },
  primaryButton: { minHeight: 50, borderRadius: 5, backgroundColor: theme.colors.accentFill, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 12, flexDirection: 'row', gap: 9 },
  primaryButtonText: { color: theme.colors.onAccent, fontSize: 12, letterSpacing: 0.8, fontFamily: pluggdFonts.satoshiBlack },
  });
}
