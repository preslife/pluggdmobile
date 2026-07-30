import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../src/design/typography';
import { useMutation, useQuery } from '@tanstack/react-query';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import { ActivityIndicator, Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import QRCode from 'react-native-qrcode-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PremiumScreenBackdrop } from '../components/PluggdPrimitives';
import { PluggdImage } from '../src/components/PluggdImage';
import { selectionHaptic } from '../src/design/haptics';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import { formatDate, PLUGGD_ORANGE } from '../src/lib/mobileContent';
import { issueTicketEntryToken, loadWalletTickets } from '../src/features/culture/mobileServices';

export default function TicketsScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const insets = useSafeAreaInsets();
  const tickets = useQuery({ queryKey: ['culture', 'wallet-tickets'], queryFn: loadWalletTickets });
  const [dynamicTokens, setDynamicTokens] = useState<Record<string, { payload: string; expiresAt: string | null }>>({});
  const issueToken = useMutation({
    mutationFn: issueTicketEntryToken,
    onSuccess: (result, ticketId) => {
      if (!result.success || !result.payload) {
        Alert.alert('Entry code unavailable', result.error || 'This ticket cannot generate an entry code right now.');
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
    <PremiumScreenBackdrop tone="accent" style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingTop: insets.top + 14, paddingBottom: insets.bottom + 150 }]}
      >
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" accessibilityLabel="Go back" style={styles.iconButton} onPress={() => router.back()}>
            <MaterialIcons name="arrow-back-ios-new" size={19} color={theme.colors.text} />
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Find events" style={styles.iconButton} onPress={() => router.push('/events' as any)}>
            <MaterialIcons name="event" size={22} color={theme.colors.text} />
          </Pressable>
        </View>

        <LinearGradient
          colors={['rgba(255,102,0,0.24)', 'rgba(255,255,255,0.08)', 'rgba(10,8,6,0.96)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.hero, { borderColor: theme.colors.borderAccent }]}
        >
          <View style={styles.heroKickerRow}>
            <MaterialIcons name="confirmation-number" size={16} color={theme.colors.accent} />
            <Text style={[styles.kicker, { color: theme.colors.accent }]}>Tickets</Text>
          </View>
          <Text maxFontSizeMultiplier={1.35} style={[styles.heroTitle, { color: theme.colors.text }]}>Event entry, RSVP status, and ticket codes.</Text>
          <Text maxFontSizeMultiplier={1.6} style={[styles.heroBody, { color: theme.colors.textSecondary }]}>
            Keep verified event access close, open event details, and generate entry codes when a real ticket supports it.
          </Text>
          <View style={styles.heroStats}>
            <StatPill label="Active" value={`${tickets.data?.length ?? 0}`} />
            <StatPill label="Entry" value="Secure" />
          </View>
        </LinearGradient>

        {tickets.isLoading ? (
          <View style={styles.loading}>
            <ActivityIndicator color={PLUGGD_ORANGE} />
          </View>
        ) : null}

        {!tickets.isLoading && !tickets.data?.length ? (
          <View style={[styles.emptyCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <MaterialIcons name="confirmation-number" size={30} color={theme.colors.accent} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No active tickets</Text>
            <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>
              Tickets and RSVPs will appear here after an event purchase, invite, or verified RSVP is linked to your account.
            </Text>
            <Pressable accessibilityRole="button" style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]} onPress={() => router.push('/events' as any)}>
              <Text style={styles.primaryButtonText}>Browse events</Text>
            </Pressable>
          </View>
        ) : null}

        {tickets.data?.length ? (
          <View style={styles.section}>
            <SectionHead title="Active tickets" subtitle="Tap a ticket to open the event." />
            {tickets.data.map((ticket) => {
              const dynamic = dynamicTokens[ticket.id];
              return (
                <Pressable
                  key={`${ticket.source}-${ticket.id}`}
                  style={({ pressed }) => [styles.ticketCard, { borderColor: theme.colors.border }, pressed && { opacity: 0.82 }]}
                  onPress={() => {
                    selectionHaptic();
                    router.push(`/events/${ticket.event_id}` as any);
                  }}
                >
                  <LinearGradient colors={['rgba(255,102,0,0.18)', 'rgba(255,255,255,0.06)', 'rgba(10,8,6,0.96)']} style={StyleSheet.absoluteFill} />
                  <View style={[styles.ticketImage, { backgroundColor: theme.colors.surfaceAlt }]}>
                    {ticket.event_image_url ? <PluggdImage uri={ticket.event_image_url} style={styles.fill} /> : <MaterialIcons name="confirmation-number" size={32} color={PLUGGD_ORANGE} />}
                  </View>
                  <View style={styles.ticketCopy}>
                    <Text style={[styles.ticketTitle, { color: theme.colors.text }]} numberOfLines={2}>{ticket.event_title}</Text>
                    <Text style={[styles.ticketMeta, { color: theme.colors.textSecondary }]} numberOfLines={1}>{ticket.venue || 'Venue TBA'} · {formatDate(ticket.starts_at)}</Text>
                    <Text style={styles.ticketStatus}>{ticket.ticket_type || ticket.status}</Text>
                  </View>
                  <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
                  {ticket.source === 'ticket_orders' ? (
                    <View style={[styles.qrPanel, { backgroundColor: theme.colors.backgroundElevated, borderColor: theme.colors.border }]}>
                      <Text style={[styles.qrLabel, { color: theme.colors.textMuted }]}>{dynamic ? 'Rotating entry code' : ticket.qr_code_data ? 'Saved entry code' : 'Entry code available'}</Text>
                      {dynamic ? (
                        <>
                          <View style={styles.qrCodeBox}>
                            <QRCode value={dynamic.payload} size={164} color="#0a0806" backgroundColor="#FFFFFF" />
                          </View>
                          <Text style={[styles.qrValue, { color: theme.colors.text }]} numberOfLines={1}>{dynamic.payload}</Text>
                          <Text style={[styles.qrExpiry, { color: theme.colors.textSecondary }]}>Expires {formatDate(dynamic.expiresAt)}</Text>
                        </>
                      ) : ticket.qr_code_data ? (
                        <>
                          <View style={styles.qrCodeBox}>
                            <QRCode value={ticket.qr_code_data} size={164} color="#0a0806" backgroundColor="#FFFFFF" />
                          </View>
                          <Text style={[styles.qrValue, { color: theme.colors.text }]} numberOfLines={1}>{ticket.qr_code_data}</Text>
                        </>
                      ) : null}
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Generate entry code for ${ticket.event_title}`}
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
          </View>
        ) : null}

        <View style={[styles.infoCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <MaterialIcons name="verified-user" size={22} color={theme.colors.accent} />
          <View style={styles.infoCopy}>
            <Text style={[styles.infoTitle, { color: theme.colors.text }]}>Entry codes appear only for eligible tickets</Text>
            <Text style={[styles.infoBody, { color: theme.colors.textMuted }]}>
              Other event records keep RSVP status, venue, and schedule details visible until a secure code is issued.
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

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, gap: 18 },
  topBar: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 5, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.06)' },
  hero: { borderRadius: 6, borderWidth: 1, padding: 16, gap: 9, overflow: 'hidden' },
  heroKickerRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  kicker: { fontSize: 11, lineHeight: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase', letterSpacing: 0 },
  heroTitle: { fontSize: 28, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', letterSpacing: -0.65 },
  heroBody: { fontSize: 13.5, lineHeight: 19, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', maxWidth: 338 },
  heroStats: { flexDirection: 'row', gap: 10, marginTop: 1 },
  statPill: { minWidth: 96, borderTopWidth: 1, paddingVertical: 8, paddingHorizontal: 2, marginRight: 12 },
  statValue: { fontSize: 20, lineHeight: 23, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  statLabel: { marginTop: 1, fontSize: 11, lineHeight: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase' },
  loading: { minHeight: 220, alignItems: 'center', justifyContent: 'center' },
  section: { gap: 11 },
  sectionHead: { gap: 4 },
  sectionTitle: { fontSize: 23, lineHeight: 27, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  sectionSubtitle: { fontSize: 13, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  emptyCard: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 20, gap: 10, alignItems: 'flex-start' },
  emptyTitle: { fontSize: 20, lineHeight: 24, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  emptyBody: { fontSize: 13, lineHeight: 19, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
  primaryButton: { minHeight: 48, borderRadius: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 18, alignSelf: 'flex-start' },
  primaryButtonText: { color: '#0a0806', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  ticketCard: {
    borderTopWidth: 1,
    borderBottomWidth: 1,
    paddingVertical: 14,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
    overflow: 'hidden',
  },
  ticketImage: { width: 70, height: 70, borderRadius: 5, overflow: 'hidden', alignItems: 'center', justifyContent: 'center' },
  fill: { width: '100%', height: '100%' },
  ticketCopy: { flex: 1, minWidth: 0 },
  ticketTitle: { fontSize: 16, lineHeight: 21, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  ticketMeta: { fontSize: 12.5, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 4 },
  ticketStatus: { color: PLUGGD_ORANGE, fontSize: 12, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 6, textTransform: 'uppercase' },
  qrPanel: { width: '100%', borderTopWidth: 1, paddingTop: 12, marginTop: 4 },
  qrLabel: { fontSize: 10, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', textTransform: 'uppercase' },
  qrCodeBox: { alignSelf: 'center', borderRadius: 18, backgroundColor: '#FFFFFF', padding: 12, marginTop: 10 },
  qrValue: { fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '800', marginTop: 4 },
  qrExpiry: { fontSize: 11, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 4 },
  rotateButton: { minHeight: 44, marginTop: 10, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center' },
  rotateButtonText: { color: '#0a0806', fontSize: 11, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', letterSpacing: 0.4 },
  infoCard: { borderTopWidth: 1, borderBottomWidth: 1, paddingVertical: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  infoCopy: { flex: 1, gap: 4 },
  infoTitle: { fontSize: 15, lineHeight: 18, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  infoBody: { fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700' },
});
