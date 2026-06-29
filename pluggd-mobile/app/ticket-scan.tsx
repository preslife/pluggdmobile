import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../src/design/typography';
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from 'expo-camera';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { EmptyState, ScreenShell, SectionTitle } from '../components/ContentUI';
import { useAuth } from '../src/context/AuthProvider';
import { verifyTicketEntryToken } from '../src/features/culture/mobileServices';
import { formatDate, formatGBP } from '../src/lib/mobileContent';
import { supabase } from '../src/lib/supabase';

const PLUGGD_ORANGE = '#FF5A00';

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

  if (trimmed.startsWith('pluggd-ticket-v1:')) {
    const dynamic = await verifyTicketEntryToken(trimmed);
    if (!dynamic.success) throw new Error(dynamic.error || 'Dynamic ticket verification failed.');
    if (!dynamic.valid) throw new Error(dynamic.reason || 'Dynamic ticket payload is not valid.');

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
      status: checkedInAt ? 'checked_in' : ((verified?.ticket_status as string | null | undefined) ?? 'verified'),
      qr_code_data: trimmed,
      checked_in_at: checkedInAt,
      created_at: checkedInAt,
      event_title: event.data?.title ?? null,
      event_location: event.data?.location ?? null,
      event_starts_at: event.data?.starts_at ?? null,
    };
  }

  const { data, error } = await (supabase as any)
    .from('ticket_orders')
    .select('id,event_id,user_id,tier_id,quantity,total_cents,status,qr_code_data,checked_in_at,created_at')
    .eq('qr_code_data', trimmed)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const order = data as TicketScanResult;
  const event = await supabase
    .from('events')
    .select('id,title,location,starts_at')
    .eq('id', order.event_id)
    .maybeSingle();

  return {
    ...order,
    event_title: event.data?.title ?? null,
    event_location: event.data?.location ?? null,
    event_starts_at: event.data?.starts_at ?? null,
  };
}

async function checkInTicket(orderId: string) {
  const { error } = await (supabase as any)
    .from('ticket_orders')
    .update({ status: 'checked_in', checked_in_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', orderId);
  if (error) throw error;
}

export default function TicketScanScreen() {
  const router = useRouter();
  const queryClient = useQueryClient();
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

  const checkIn = useMutation({
    mutationFn: () => {
      if (!result?.id) throw new Error('Look up a valid ticket first.');
      return checkInTicket(result.id);
    },
    onSuccess: () => {
      const checkedIn = new Date().toISOString();
      setResult((current) => current ? { ...current, status: 'checked_in', checked_in_at: checkedIn } : current);
      void queryClient.invalidateQueries({ queryKey: ['culture', 'wallet-tickets'] });
      Alert.alert('Ticket checked in', 'The ticket order was marked as checked in.');
    },
    onError: (error) => {
      Alert.alert(
        'Check-in unavailable',
        error instanceof Error
          ? error.message
          : 'This account cannot check in that ticket.',
      );
    },
  });

  if (loading) {
    return (
      <ScreenShell title="Scan Tickets" subtitle="Promoter ticket verification.">
        <StatusBar style="light" />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.loading}><ActivityIndicator color={PLUGGD_ORANGE} /></View>
      </ScreenShell>
    );
  }

  if (!user) {
    return (
      <ScreenShell title="Scan Tickets" subtitle="Promoter ticket verification.">
        <StatusBar style="light" />
        <Stack.Screen options={{ headerShown: false }} />
        <EmptyState title="Sign in required" body="Promoter and venue accounts can verify tickets after signing in." />
        <Pressable style={styles.primaryButton} onPress={() => router.push('/auth/login' as any)}>
          <Text style={styles.primaryButtonText}>Sign In</Text>
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
    <ScreenShell title="Scan Tickets" subtitle="Camera QR verification for promoter and venue roles, backed by real ticket orders.">
      <StatusBar style="light" />
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
            <MaterialIcons name="qr-code-scanner" size={34} color={PLUGGD_ORANGE} />
            <Text style={styles.permissionTitle}>Camera access needed</Text>
            <Text style={styles.permissionText}>
              Promoter and venue accounts can scan PLUGGD ticket QR payloads after camera permission is enabled.
            </Text>
            <Pressable style={styles.permissionButton} onPress={() => requestCameraPermission()}>
              <Text style={styles.permissionButtonText}>Enable Camera</Text>
            </Pressable>
          </View>
        )}
        {!scannerActive ? (
          <Pressable style={styles.secondaryButton} onPress={resetScanner}>
            <Text style={styles.secondaryButtonText}>Scan Another Ticket</Text>
          </Pressable>
        ) : null}
      </View>

      <SectionTitle title="Ticket payload" />
      <View style={styles.scanCard}>
        <TextInput
          value={code}
          onChangeText={(value) => {
            setCode(value);
            setNotFound(false);
          }}
          autoCapitalize="none"
          autoCorrect={false}
          placeholder="Paste QR payload as fallback"
          placeholderTextColor="#737373"
          style={styles.input}
        />
        <Pressable style={styles.lookupButton} onPress={() => lookup.mutate(undefined)} disabled={lookup.isPending}>
          {lookup.isPending ? <ActivityIndicator color="#08080C" /> : <Text style={styles.lookupText}>Verify</Text>}
        </Pressable>
      </View>

      {notFound ? (
        <EmptyState title="Ticket not found" body="No visible ticket order matched this QR payload for the current account permissions." />
      ) : null}

      {result ? (
        <View style={styles.resultCard}>
          <View style={styles.resultHeader}>
            <View style={[styles.statusIcon, result.status === 'checked_in' && styles.statusIconChecked]}>
              <MaterialIcons name={result.status === 'checked_in' ? 'check' : 'confirmation-number'} size={24} color={result.status === 'checked_in' ? '#08080C' : '#FFFFFF'} />
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
          <Pressable
            style={[styles.primaryButton, result.status === 'checked_in' && styles.disabledButton]}
            onPress={() => checkIn.mutate()}
            disabled={checkIn.isPending || result.status === 'checked_in'}
          >
            <Text style={styles.primaryButtonText}>
              {checkIn.isPending ? 'Checking In...' : result.status === 'checked_in' ? 'Already Checked In' : 'Check In Ticket'}
            </Text>
          </Pressable>
        </View>
      ) : null}

      <EmptyState title="Ticket security" body="Rotating entry codes help protect eligible tickets during door checks. Apple Wallet passes are not available until pass signing is connected." />
    </ScreenShell>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detail}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  cameraCard: { borderRadius: 18, borderWidth: 1, borderColor: '#262626', backgroundColor: '#12121A', padding: 10, gap: 10, overflow: 'hidden' },
  cameraFrame: { height: 280, borderRadius: 16, overflow: 'hidden', backgroundColor: '#08080C' },
  camera: { ...StyleSheet.absoluteFillObject },
  scanOverlay: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(0,0,0,0.18)' },
  scanHint: { position: 'absolute', bottom: 18, color: '#FFFFFF', fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', letterSpacing: 0.4, textTransform: 'uppercase' },
  cornerTopLeft: { position: 'absolute', top: 58, left: 52, width: 42, height: 42, borderLeftWidth: 3, borderTopWidth: 3, borderColor: PLUGGD_ORANGE, borderTopLeftRadius: 12 },
  cornerTopRight: { position: 'absolute', top: 58, right: 52, width: 42, height: 42, borderRightWidth: 3, borderTopWidth: 3, borderColor: PLUGGD_ORANGE, borderTopRightRadius: 12 },
  cornerBottomLeft: { position: 'absolute', bottom: 58, left: 52, width: 42, height: 42, borderLeftWidth: 3, borderBottomWidth: 3, borderColor: PLUGGD_ORANGE, borderBottomLeftRadius: 12 },
  cornerBottomRight: { position: 'absolute', bottom: 58, right: 52, width: 42, height: 42, borderRightWidth: 3, borderBottomWidth: 3, borderColor: PLUGGD_ORANGE, borderBottomRightRadius: 12 },
  permissionCard: { minHeight: 240, borderRadius: 16, borderWidth: 1, borderColor: '#262626', backgroundColor: '#08080C', alignItems: 'center', justifyContent: 'center', padding: 22 },
  permissionTitle: { color: '#FFFFFF', fontSize: 18, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 12 },
  permissionText: { color: '#B3B3B3', fontSize: 13, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', textAlign: 'center', lineHeight: 19, marginTop: 8 },
  permissionButton: { height: 44, borderRadius: 22, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, marginTop: 16 },
  permissionButtonText: { color: '#08080C', fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  secondaryButton: { minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: '#3A3A44', backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  secondaryButtonText: { color: '#FFFFFF', fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  scanCard: { borderRadius: 16, borderWidth: 1, borderColor: '#262626', backgroundColor: '#151515', padding: 12, gap: 10 },
  input: { minHeight: 54, borderRadius: 12, borderWidth: 1, borderColor: '#262626', backgroundColor: '#08080C', color: '#FFFFFF', paddingHorizontal: 12, fontSize: 14, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  lookupButton: { height: 48, borderRadius: 24, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center' },
  lookupText: { color: '#08080C', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  resultCard: { marginTop: 16, borderRadius: 18, borderWidth: 1, borderColor: '#3B281D', backgroundColor: '#151515', padding: 14, gap: 13 },
  resultHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusIcon: { width: 48, height: 48, borderRadius: 24, backgroundColor: '#262626', alignItems: 'center', justifyContent: 'center' },
  statusIconChecked: { backgroundColor: PLUGGD_ORANGE },
  resultCopy: { flex: 1, minWidth: 0 },
  resultTitle: { color: '#FFFFFF', fontSize: 17, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  resultMeta: { color: '#B3B3B3', fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 4 },
  detailGrid: { flexDirection: 'row', gap: 8 },
  detail: { flex: 1, borderRadius: 12, borderWidth: 1, borderColor: '#262626', backgroundColor: '#08080C', padding: 10 },
  detailLabel: { color: '#737373', fontSize: 10, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase' },
  detailValue: { color: '#FFFFFF', fontSize: 13, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 5, textTransform: 'capitalize' },
  payload: { color: '#8E8E9F', fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', lineHeight: 16 },
  primaryButton: { minHeight: 50, borderRadius: 25, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16, marginTop: 12 },
  primaryButtonText: { color: '#08080C', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  disabledButton: { opacity: 0.6 },
});
