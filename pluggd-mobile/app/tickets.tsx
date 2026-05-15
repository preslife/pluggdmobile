import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { EmptyState, ScreenShell, SectionTitle } from '../components/ContentUI';
import { PluggdImage } from '../src/components/PluggdImage';
import { formatDate, PLUGGD_ORANGE } from '../src/lib/mobileContent';
import { issueTicketEntryToken, loadWalletTickets } from '../src/features/culture/mobileServices';

export default function TicketsScreen() {
  const router = useRouter();
  const tickets = useQuery({ queryKey: ['culture', 'wallet-tickets'], queryFn: loadWalletTickets });
  const [dynamicTokens, setDynamicTokens] = useState<Record<string, { payload: string; expiresAt: string | null }>>({});
  const issueToken = useMutation({
    mutationFn: issueTicketEntryToken,
    onSuccess: (result, ticketId) => {
      if (!result.success || !result.payload) {
        Alert.alert('Entry code unavailable', result.error || 'The backend could not issue a rotating ticket code.');
        return;
      }
      const payload = result.payload;
      const expiresAt = result.expiresAt ?? null;
      setDynamicTokens((current) => ({
        ...current,
        [ticketId]: { payload, expiresAt },
      }));
    },
  });

  return (
    <ScreenShell title="Tickets" subtitle="Verified tickets, RSVP status and event entry details.">
      <StatusBar style="light" />
      <Stack.Screen options={{ headerShown: false }} />
      {tickets.isLoading ? (
        <View style={styles.loading}>
          <ActivityIndicator color={PLUGGD_ORANGE} />
        </View>
      ) : null}
      {!tickets.isLoading && !tickets.data?.length ? (
        <EmptyState
          title="No tickets yet"
          body="Owned tickets will appear here when your account has verified event ticket records."
        />
      ) : null}
      {tickets.data?.length ? <SectionTitle title="Active tickets" /> : null}
      {tickets.data?.map((ticket) => {
        const dynamic = dynamicTokens[ticket.id];
        return (
          <Pressable key={`${ticket.source}-${ticket.id}`} style={styles.ticketCard} onPress={() => router.push(`/events/${ticket.event_id}` as any)}>
            <View style={styles.ticketImage}>
              {ticket.event_image_url ? <PluggdImage uri={ticket.event_image_url} style={styles.fill} /> : <MaterialIcons name="confirmation-number" size={32} color={PLUGGD_ORANGE} />}
            </View>
            <View style={styles.ticketCopy}>
              <Text style={styles.ticketTitle} numberOfLines={2}>{ticket.event_title}</Text>
              <Text style={styles.ticketMeta} numberOfLines={1}>{ticket.venue || 'Venue TBA'} · {formatDate(ticket.starts_at)}</Text>
              <Text style={styles.ticketStatus}>{ticket.ticket_type || ticket.status}</Text>
            </View>
            <MaterialIcons name="chevron-right" size={22} color="#737373" />
            {ticket.source === 'ticket_orders' ? (
              <View style={styles.qrPanel}>
                <Text style={styles.qrLabel}>{dynamic ? 'Rotating entry payload' : ticket.qr_code_data ? 'Static fallback payload' : 'Secure entry code'}</Text>
                {dynamic ? (
                  <>
                    <View style={styles.qrCodeBox}>
                      <QRCode value={dynamic.payload} size={164} color="#08080C" backgroundColor="#FFFFFF" />
                    </View>
                    <Text style={styles.qrValue} numberOfLines={1}>{dynamic.payload}</Text>
                    <Text style={styles.qrExpiry}>Expires {formatDate(dynamic.expiresAt)}</Text>
                  </>
                ) : ticket.qr_code_data ? (
                  <>
                    <View style={styles.qrCodeBox}>
                      <QRCode value={ticket.qr_code_data} size={164} color="#08080C" backgroundColor="#FFFFFF" />
                    </View>
                    <Text style={styles.qrValue} numberOfLines={1}>{ticket.qr_code_data}</Text>
                  </>
                ) : null}
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Generate rotating entry code for ${ticket.event_title}`}
                  style={styles.rotateButton}
                  onPress={(event) => {
                    event.stopPropagation();
                    issueToken.mutate(ticket.id);
                  }}
                >
                  <Text style={styles.rotateButtonText}>{issueToken.isPending ? 'GENERATING...' : dynamic ? 'ROTATE CODE' : 'GENERATE CODE'}</Text>
                </Pressable>
              </View>
            ) : null}
          </Pressable>
        );
      })}
      <EmptyState
        title="QR appears only when real"
        body="PLUGGD will not display fake ticket codes. Rotating entry payloads use the ticket token backend when available; Apple Wallet passes still require pass-signing credentials."
      />
    </ScreenShell>
  );
}

const styles = StyleSheet.create({
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  ticketCard: {
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#262626',
    backgroundColor: '#151515',
    padding: 13,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  ticketImage: { width: 64, height: 64, borderRadius: 12, overflow: 'hidden', backgroundColor: '#1F1F2E', alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  ticketCopy: { flex: 1, minWidth: 0 },
  ticketTitle: { color: '#FFFFFF', fontSize: 16, lineHeight: 21, fontWeight: '900' },
  ticketMeta: { color: '#B3B3B3', fontSize: 12.5, fontWeight: '700', marginTop: 4 },
  ticketStatus: { color: PLUGGD_ORANGE, fontSize: 12, fontWeight: '900', marginTop: 6, textTransform: 'uppercase' },
  qrPanel: { width: '100%', borderRadius: 12, borderWidth: 1, borderColor: '#262626', backgroundColor: '#08080C', padding: 10, marginTop: 4 },
  qrLabel: { color: '#737373', fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  qrCodeBox: { alignSelf: 'center', borderRadius: 18, backgroundColor: '#FFFFFF', padding: 12, marginTop: 10 },
  qrValue: { color: '#FFFFFF', fontSize: 12, fontWeight: '800', marginTop: 4 },
  qrExpiry: { color: '#B3B3B3', fontSize: 11, fontWeight: '700', marginTop: 4 },
  rotateButton: { marginTop: 10, borderRadius: 999, backgroundColor: PLUGGD_ORANGE, paddingVertical: 9, alignItems: 'center' },
  rotateButtonText: { color: '#08080C', fontSize: 11, fontWeight: '900', letterSpacing: 0.4 },
});
