import { MaterialIcons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { ScreenShell } from '../components/ContentUI';
import { useAuth } from '../src/context/AuthProvider';
import { pluggdFonts } from '../src/design/typography';
import { loadLibraryBundle } from '../src/features/culture/mobileServices';
import { PLUGGD_ORANGE } from '../src/lib/mobileContent';
import { usePluggdTheme } from '../src/design/usePluggdTheme';

export default function FollowingScreen() {
  const theme = usePluggdTheme();
  const styles = useFollowingStyles();
  const router = useRouter();
  const { user, loading } = useAuth();
  const query = useQuery({
    queryKey: ['culture', 'following'],
    queryFn: loadLibraryBundle,
    enabled: Boolean(user),
  });
  const creators = (query.data?.saved || []).filter((item) => item.kind === 'profile');

  return (
    <ScreenShell title="Following" subtitle="The creators and voices you chose to keep close.">
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <Stack.Screen options={{ headerShown: false }} />

      {!loading && !user ? (
        <View>
          <View style={styles.heroMark}><MaterialIcons name="graphic-eq" size={30} color={theme.colors.onAccent} /></View>
          <Text style={styles.kicker}>YOUR SIGNAL</Text>
          <Text style={styles.heroTitle}>Follow artists, not an algorithm.</Text>
          <Text style={styles.heroBody}>Build a direct line to releases, mixes, events and community posts from creators you care about.</Text>
          <View style={styles.ledger}>
            <PromiseRow index="01" title="Direct releases" body="New music stays attached to its creator and context." />
            <PromiseRow index="02" title="Scene movement" body="See events, mixes and community moments in one place." />
            <PromiseRow index="03" title="No invented activity" body="This view only shows creators you actually follow." last />
          </View>
          <Pressable accessibilityRole="button" style={styles.primary} onPress={() => router.push('/auth/login' as any)}><Text style={styles.primaryText}>Sign in to see your signal</Text></Pressable>
          <Pressable accessibilityRole="button" style={styles.secondary} onPress={() => router.push('/discover' as any)}><Text style={styles.secondaryText}>Discover creators</Text><MaterialIcons name="arrow-forward" size={18} color={theme.colors.text} /></Pressable>
        </View>
      ) : null}

      {user && !query.isLoading && creators.length === 0 ? (
        <View>
          <Text style={styles.kicker}>0 CREATORS</Text>
          <Text style={styles.heroTitle}>Your signal is ready to take shape.</Text>
          <Text style={styles.heroBody}>Follow creators from Discover or their profile. Their real movement will collect here—nothing padded, nothing fabricated.</Text>
          <Pressable accessibilityRole="button" style={styles.primary} onPress={() => router.push('/discover' as any)}><Text style={styles.primaryText}>Find your first creator</Text></Pressable>
        </View>
      ) : null}

      {creators.length ? (
        <View style={styles.creatorLedger}>
          <View style={styles.ledgerHeader}><Text style={styles.kicker}>{creators.length} FOLLOWING</Text><Text style={styles.order}>RECENTLY ADDED</Text></View>
          {creators.map((creator, index) => (
            <Pressable key={creator.id} accessibilityRole="button" accessibilityLabel={`Open ${creator.title}`} style={styles.creatorRow} onPress={() => router.push(creator.route as any)}>
              <Text style={styles.creatorIndex}>{String(index + 1).padStart(2, '0')}</Text>
              {creator.imageUrl ? <Image source={{ uri: creator.imageUrl }} style={styles.avatar} resizeMode="cover" /> : <View style={styles.avatarFallback}><Text style={styles.avatarText}>{creator.title.slice(0, 1).toUpperCase()}</Text></View>}
              <View style={styles.copy}><Text style={styles.creatorTitle} numberOfLines={1}>{creator.title}</Text><Text style={styles.creatorMeta} numberOfLines={1}>{creator.subtitle}</Text></View>
              <MaterialIcons name="north-east" size={19} color={theme.colors.textMuted} />
            </Pressable>
          ))}
        </View>
      ) : null}
    </ScreenShell>
  );
}

function PromiseRow({ index, title, body, last = false }: { index: string; title: string; body: string; last?: boolean }) {
  const styles = useFollowingStyles();
  return <View style={[styles.promiseRow, last && styles.last]}><Text style={styles.index}>{index}</Text><View style={styles.copy}><Text style={styles.promiseTitle}>{title}</Text><Text style={styles.promiseBody}>{body}</Text></View></View>;
}

const baseStyles = StyleSheet.create({
  heroMark: { width: 58, height: 58, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center', marginTop: 8, marginBottom: 23 },
  kicker: { color: PLUGGD_ORANGE, fontSize: 11, letterSpacing: 1.7, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  heroTitle: { color: '#FFF', fontSize: 35, lineHeight: 39, letterSpacing: -1.2, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', maxWidth: 350, marginTop: 8 },
  heroBody: { color: '#A49E99', fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 12, marginBottom: 24, maxWidth: 340 },
  ledger: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#302A26' },
  promiseRow: { minHeight: 77, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: '#302A26', paddingVertical: 12 },
  last: { borderBottomWidth: 0 },
  index: { width: 28, color: PLUGGD_ORANGE, fontSize: 11, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  copy: { flex: 1, minWidth: 0 },
  promiseTitle: { color: '#FFF', fontSize: 15, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  promiseBody: { color: '#8F8883', fontSize: 12.5, lineHeight: 18, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 3 },
  primary: { minHeight: 52, borderRadius: 5, backgroundColor: PLUGGD_ORANGE, alignItems: 'center', justifyContent: 'center', marginTop: 18 },
  primaryText: { color: '#0A0806', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  secondary: { minHeight: 52, borderRadius: 5, borderWidth: 1, borderColor: '#3A332E', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: '#FFF', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  creatorLedger: { marginTop: 6, borderTopWidth: 1, borderColor: '#302A26' },
  ledgerHeader: { minHeight: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#302A26' },
  order: { color: '#746D68', fontSize: 9.5, letterSpacing: 1, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  creatorRow: { minHeight: 82, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: 1, borderBottomColor: '#28231F' },
  creatorIndex: { width: 22, color: '#746D68', fontSize: 10.5, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  avatar: { width: 52, height: 52, borderRadius: 4, backgroundColor: '#191512' },
  avatarFallback: { width: 52, height: 52, borderRadius: 4, backgroundColor: '#211A16', alignItems: 'center', justifyContent: 'center' },
  avatarText: { color: PLUGGD_ORANGE, fontSize: 20, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800' },
  creatorTitle: { color: '#FFF', fontSize: 15, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  creatorMeta: { color: '#918A85', fontSize: 12, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 3 },
});

function useFollowingStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => ({
    ...baseStyles,
    heroMark: [baseStyles.heroMark, { backgroundColor: theme.colors.accentFill }],
    kicker: [baseStyles.kicker, { color: theme.colors.accentText }],
    heroTitle: [baseStyles.heroTitle, { color: theme.colors.text }],
    heroBody: [baseStyles.heroBody, { color: theme.colors.textMuted }],
    ledger: [baseStyles.ledger, { borderColor: theme.colors.border }],
    promiseRow: [baseStyles.promiseRow, { borderBottomColor: theme.colors.border }],
    index: [baseStyles.index, { color: theme.colors.accentText }],
    promiseTitle: [baseStyles.promiseTitle, { color: theme.colors.text }],
    promiseBody: [baseStyles.promiseBody, { color: theme.colors.textMuted }],
    primary: [baseStyles.primary, { backgroundColor: theme.colors.accentFill }],
    primaryText: [baseStyles.primaryText, { color: theme.colors.onAccent }],
    secondary: [baseStyles.secondary, { borderColor: theme.colors.border }],
    secondaryText: [baseStyles.secondaryText, { color: theme.colors.text }],
    creatorLedger: [baseStyles.creatorLedger, { borderColor: theme.colors.border }],
    ledgerHeader: [baseStyles.ledgerHeader, { borderBottomColor: theme.colors.border }],
    order: [baseStyles.order, { color: theme.colors.textSubtle }],
    creatorRow: [baseStyles.creatorRow, { borderBottomColor: theme.colors.border }],
    creatorIndex: [baseStyles.creatorIndex, { color: theme.colors.textSubtle }],
    avatar: [baseStyles.avatar, { backgroundColor: theme.colors.artworkBase }],
    avatarFallback: [baseStyles.avatarFallback, { backgroundColor: theme.colors.surfaceAlt }],
    avatarText: [baseStyles.avatarText, { color: theme.colors.accentText }],
    creatorTitle: [baseStyles.creatorTitle, { color: theme.colors.text }],
    creatorMeta: [baseStyles.creatorMeta, { color: theme.colors.textMuted }],
  }), [theme]);
}
