import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { Alert, Linking, Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
import { pluggdFonts } from '../../src/design/typography';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { supabase } from '../../src/lib/supabase';

export default function MagicLinkSent() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = params.email || 'your email address';

  const handleResend = async () => {
    if (!params.email) return router.replace('/auth/login');
    const { error } = await supabase.auth.signInWithOtp({ email: params.email });
    Alert.alert(error ? 'Magic link failed' : 'Link sent again', error?.message || `Check ${params.email} for a fresh magic link.`);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.top}><BrandLogo variant="auto" width={116} height={47} /></View>
      <View style={styles.content}>
        <View style={[styles.mailMark, { borderColor: theme.colors.border }]}>
          <MaterialIcons name="outgoing-mail" size={39} color={theme.colors.accent} />
          <Text style={[styles.markLabel, { color: theme.colors.textSubtle }]}>MAGIC LINK SENT</Text>
        </View>
        <Text style={[styles.kicker, { color: theme.colors.accent }]}>ONE-TAP SIGN IN</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>Check your inbox.</Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>We sent a secure sign-in link to <Text style={[styles.email, { color: theme.colors.text }]}>{email}</Text>. The link opens PLUGGD and signs you in.</Text>
      </View>
      <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
        <Pressable accessibilityRole="button" onPress={() => Linking.openURL('message://')} style={styles.primary}>
          <Text style={styles.primaryText}>OPEN MAIL</Text>
          <MaterialIcons name="arrow-forward" size={19} color="#120B06" />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={handleResend} style={[styles.secondary, { borderColor: theme.colors.border }]}>
          <Text style={[styles.secondaryText, { color: theme.colors.text }]}>RESEND LINK</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/auth/login')} style={styles.textAction}>
          <Text style={[styles.textActionLabel, { color: theme.colors.textMuted }]}>Use password instead</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 18, paddingTop: 58, paddingBottom: 32 },
  top: { alignItems: 'flex-start' },
  content: { flex: 1, justifyContent: 'center' },
  mailMark: { width: 122, height: 122, borderWidth: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 27 },
  markLabel: { fontFamily: pluggdFonts.satoshiBold, fontSize: 8.5, letterSpacing: 1.4 },
  kicker: { fontFamily: pluggdFonts.satoshiBold, fontSize: 11, letterSpacing: 1.8, marginBottom: 9 },
  title: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 36, lineHeight: 40, letterSpacing: -0.7 },
  body: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, marginTop: 11, maxWidth: 350 },
  email: { fontFamily: pluggdFonts.satoshiBold },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 10 },
  primary: { minHeight: 52, borderRadius: 5, backgroundColor: '#F46A1B', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  primaryText: { color: '#120B06', fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, letterSpacing: 0.8 },
  secondary: { minHeight: 48, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12, letterSpacing: 0.7 },
  textAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textActionLabel: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
});
