import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../src/design/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { EmptyState, ScreenShell, SectionTitle } from '../components/ContentUI';
import { useAuth } from '../src/context/AuthProvider';
import { loadFanIdentitySummary } from '../src/features/culture/mobileServices';
import { PLUGGD_ORANGE, formatDate } from '../src/lib/mobileContent';
import { usePluggdTheme } from '../src/design/usePluggdTheme';

export default function BadgesScreen() {
  const theme = usePluggdTheme();
  const styles = useBadgeStyles();
  const router = useRouter();
  const { user } = useAuth();
  const query = useQuery({
    queryKey: ['culture', 'fan-identity'],
    queryFn: () => loadFanIdentitySummary(),
  });
  const identity = query.data;

  return (
    <ScreenShell title="Badges / Rewards" subtitle="Your PLUGGD identity across communities, events and challenges.">
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />
      {!query.isLoading && !identity ? (
        <View style={styles.identityGate}>
          <View style={styles.gateMark}><MaterialIcons name="fingerprint" size={32} color={theme.colors.onAccent} /></View>
          <Text style={[styles.heroEyebrow, styles.gateEyebrow]}>FAN IDENTITY</Text>
          <Text style={styles.gateTitle}>Your presence should mean something.</Text>
          <Text style={[styles.heroBody, styles.gateBody]}>Communities joined, events attended and genuine rewards become a portable PLUGGD identity—only when the account has real signals.</Text>
          <Pressable accessibilityRole="button" style={styles.gateButton} onPress={() => router.push((user ? '/community' : '/auth/login') as any)}><Text style={styles.gateButtonText}>{user ? 'Find a community' : 'Sign in to see your identity'}</Text></Pressable>
        </View>
      ) : null}

      {identity ? (
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.content}>
          <LinearGradient colors={['#2C160A', '#17100C', '#0A0806']} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={styles.passport}>
            <View style={styles.passportTopline}>
              <View style={styles.passportMark}><MaterialIcons name="fingerprint" size={26} color="#0A0806" /></View>
              <Text style={styles.passportSerial}>PLUGGD ID · {identity.user_id.slice(0, 6).toUpperCase()}</Text>
            </View>
            <Text style={styles.heroEyebrow}>YOUR FAN PASSPORT</Text>
            <Text style={styles.heroTitle}>Every room leaves a signal.</Text>
            <Text style={styles.heroBody}>Communities, tickets and genuine participation build a portable history of how you show up for music.</Text>
            <View style={styles.signalGrid}>
              <SignalStat value={identity.joinedCommunities.length} label="Communities" />
              <SignalStat value={identity.attendedEvents.length} label="Events" />
              <SignalStat value={identity.challengeVotes.length} label="Votes" />
              <SignalStat value={identity.badges.length + identity.rewards.length} label="Recognition" />
            </View>
          </LinearGradient>

          <View style={styles.nextMovesHeader}>
            <View>
              <Text style={styles.heroEyebrow}>NEXT SIGNALS</Text>
              <Text style={styles.nextMovesTitle}>Keep your passport moving</Text>
            </View>
          </View>
          <View style={styles.nextMoves}>
            <JourneyCard icon="groups" eyebrow="COMMUNITY" title="Find your people" onPress={() => router.push('/community' as any)} />
            <JourneyCard icon="confirmation-number" eyebrow="EVENTS" title="Be in the room" onPress={() => router.push('/events' as any)} />
          </View>

          <SectionTitle title="Joined communities" />
          {identity.joinedCommunities.length ? identity.joinedCommunities.map((community) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${community.title || 'community'}`} key={community.id} onPress={() => router.push(`/backstage/${community.slug || community.id}` as any)}>
              <IdentityRow icon="groups" title={community.title} subtitle={community.member_count ? `${community.member_count} members` : 'Community'} />
            </Pressable>
          )) : <EmptyState title="No joined communities" body="Join creator communities to build your PLUGGD fan identity." />}

          <SectionTitle title="Attended events" />
          {identity.attendedEvents.length ? identity.attendedEvents.map((event) => (
            <Pressable accessibilityRole="button" accessibilityLabel={`Open ${event.title || 'event'}`} key={event.id} onPress={() => router.push(`/events/${event.id}` as any)}>
              <IdentityRow icon="confirmation-number" title={event.title || 'Event'} subtitle={`${formatDate(event.starts_at)} · ${event.location || 'Location TBA'}`} />
            </Pressable>
          )) : <EmptyState title="No event history yet" body="Purchased or attended events will appear here." />}

          <SectionTitle title="Recognition" />
          {identity.badges.length ? identity.badges.map((badge) => (
            <IdentityRow key={badge.id} icon="workspace-premium" title={badge.title} subtitle={badge.awarded_at ? `Awarded ${formatDate(badge.awarded_at)}` : 'Badge'} />
          )) : null}
          {identity.rewards.length ? identity.rewards.map((reward) => (
            <IdentityRow key={reward.id} icon="redeem" title={reward.title} subtitle={reward.description || reward.status || 'Reward'} />
          )) : null}
          {!identity.badges.length && !identity.rewards.length ? (
            <View style={styles.recognitionEmpty}>
              <View style={styles.recognitionIcon}><MaterialIcons name="workspace-premium" size={24} color={theme.colors.accentText} /></View>
              <View style={styles.copy}>
                <Text style={styles.title}>Recognition comes from real participation</Text>
                <Text style={styles.subtitle}>When PLUGGD awards or creator rewards are active, they will appear here—never as fabricated progress.</Text>
              </View>
            </View>
          ) : null}
        </ScrollView>
      ) : null}
    </ScreenShell>
  );
}

function SignalStat({ value, label }: { value: number; label: string }) {
  const styles = useBadgeStyles();
  return (
    <View style={styles.signalStat}>
      <Text style={styles.signalValue}>{String(value).padStart(2, '0')}</Text>
      <Text style={styles.signalLabel}>{label}</Text>
    </View>
  );
}

function JourneyCard({ icon, eyebrow, title, onPress }: { icon: keyof typeof MaterialIcons.glyphMap; eyebrow: string; title: string; onPress: () => void }) {
  const theme = usePluggdTheme();
  const styles = useBadgeStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}, ${eyebrow.toLowerCase()}`} onPress={onPress} style={styles.journeyCard}>
      <View style={styles.journeyIcon}><MaterialIcons name={icon} size={23} color={theme.colors.accentText} /></View>
      <Text style={styles.journeyEyebrow}>{eyebrow}</Text>
      <Text style={styles.journeyTitle}>{title}</Text>
      <MaterialIcons name="arrow-forward" size={20} color={theme.colors.text} />
    </Pressable>
  );
}

function IdentityRow({ icon, title, subtitle }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; subtitle: string }) {
  const theme = usePluggdTheme();
  const styles = useBadgeStyles();
  return (
    <View style={styles.row}>
      <View style={styles.iconWrap}>
        <MaterialIcons name={icon} size={21} color={theme.colors.accentText} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title} numberOfLines={1}>{title}</Text>
        <Text style={styles.subtitle} numberOfLines={2}>{subtitle}</Text>
      </View>
    </View>
  );
}

const baseStyles = StyleSheet.create({
  content: { paddingBottom: 180 },
  identityGate: { paddingTop: 8 },
  gateMark: { width: 58, height: 58, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  gateTitle: { color: '#FFFFFF', fontSize: 35, lineHeight: 39, letterSpacing: -1.2, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 8 },
  gateButton: { minHeight: 52, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center', marginTop: 24 },
  gateButtonText: { color: '#0A0806', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  passport: { borderRadius: 8, borderWidth: 1, borderColor: '#54301C', padding: 20, marginBottom: 24, overflow: 'hidden' },
  passportTopline: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 },
  passportMark: { width: 48, height: 48, borderRadius: 24, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center' },
  passportSerial: { color: '#8F8177', fontSize: 10, letterSpacing: 1.2, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  heroEyebrow: { color: PLUGGD_ORANGE, fontSize: 11, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', letterSpacing: 1 },
  heroTitle: { color: '#FFFFFF', fontSize: 30, lineHeight: 34, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', marginTop: 5 },
  heroBody: { color: '#B3B3B3', fontSize: 14, lineHeight: 20, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 8 },
  signalGrid: { flexDirection: 'row', marginTop: 22, borderTopWidth: 1, borderColor: '#4A3325', paddingTop: 16 },
  signalStat: { flex: 1, minWidth: 0 },
  signalValue: { color: '#FFFFFF', fontSize: 22, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800' },
  signalLabel: { color: '#8F8177', fontSize: 9, letterSpacing: 0.2, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900', marginTop: 2 },
  nextMovesHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 12 },
  nextMovesTitle: { color: '#FFFFFF', fontSize: 22, lineHeight: 26, fontFamily: pluggdFonts.displayBold, fontWeight: '700', marginTop: 4 },
  nextMoves: { flexDirection: 'row', gap: 10, marginBottom: 24 },
  journeyCard: { flex: 1, minHeight: 154, borderRadius: 6, borderWidth: 1, borderColor: '#302A26', backgroundColor: '#171310', padding: 14, alignItems: 'flex-start' },
  journeyIcon: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,102,0,0.12)', alignItems: 'center', justifyContent: 'center', marginBottom: 18 },
  journeyEyebrow: { color: PLUGGD_ORANGE, fontSize: 9, letterSpacing: 1, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  journeyTitle: { color: '#FFFFFF', fontSize: 17, lineHeight: 20, fontFamily: pluggdFonts.displayBold, fontWeight: '700', marginTop: 5, marginBottom: 12 },
  row: { minHeight: 74, borderBottomWidth: 1, borderColor: '#302A26', paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: { width: 42, height: 42, borderRadius: 4, backgroundColor: 'rgba(255,102,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 },
  title: { color: '#FFFFFF', fontSize: 15, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  subtitle: { color: '#B3B3B3', fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 3 },
  recognitionEmpty: { borderRadius: 6, borderWidth: 1, borderColor: '#302A26', backgroundColor: '#171310', padding: 16, flexDirection: 'row', alignItems: 'center', gap: 12 },
  recognitionIcon: { width: 46, height: 46, borderRadius: 23, backgroundColor: 'rgba(255,102,0,0.12)', alignItems: 'center', justifyContent: 'center' },
});

function useBadgeStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => ({
    ...baseStyles,
    gateMark: [baseStyles.gateMark, { backgroundColor: theme.colors.accentFill }],
    gateEyebrow: { color: theme.colors.accentText },
    gateTitle: [baseStyles.gateTitle, { color: theme.colors.text }],
    gateBody: { color: theme.colors.textMuted },
    gateButton: [baseStyles.gateButton, { backgroundColor: theme.colors.accentFill }],
    gateButtonText: [baseStyles.gateButtonText, { color: theme.colors.onAccent }],
    nextMovesTitle: [baseStyles.nextMovesTitle, { color: theme.colors.text }],
    journeyCard: [baseStyles.journeyCard, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }],
    journeyIcon: [baseStyles.journeyIcon, { backgroundColor: theme.colors.accentSoft }],
    journeyEyebrow: [baseStyles.journeyEyebrow, { color: theme.colors.accentText }],
    journeyTitle: [baseStyles.journeyTitle, { color: theme.colors.text }],
    row: [baseStyles.row, { borderColor: theme.colors.border }],
    iconWrap: [baseStyles.iconWrap, { backgroundColor: theme.colors.accentSoft }],
    title: [baseStyles.title, { color: theme.colors.text }],
    subtitle: [baseStyles.subtitle, { color: theme.colors.textMuted }],
    recognitionEmpty: [baseStyles.recognitionEmpty, { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }],
    recognitionIcon: [baseStyles.recognitionIcon, { backgroundColor: theme.colors.accentSoft }],
  }), [theme]);
}
