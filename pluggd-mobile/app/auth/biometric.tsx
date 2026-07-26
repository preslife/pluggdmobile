import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
import { pluggdFonts } from '../../src/design/typography';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

export default function BiometricUnlock() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const continueToLogin = () => router.replace('/auth/login');

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <BrandLogo variant="auto" width={116} height={47} />
      <View style={styles.content}>
        <View style={[styles.identityMark, { borderColor: theme.colors.border }]}>
          <MaterialIcons name="fingerprint" size={67} color={theme.colors.accent} />
          <View style={styles.scanLine} />
        </View>
        <Text style={[styles.kicker, { color: theme.colors.accent }]}>SECURE ACCESS</Text>
        <Text style={[styles.title, { color: theme.colors.text }]}>Your PLUGGD,<Text style={styles.titleAccent}> protected.</Text></Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>Continue to account sign-in. Biometric unlock becomes available after you enable it on this device.</Text>
      </View>
      <View style={[styles.actions, { borderTopColor: theme.colors.border }]}>
        <Pressable accessibilityRole="button" onPress={continueToLogin} style={styles.primary}>
          <Text style={styles.primaryText}>CONTINUE TO LOGIN</Text>
          <MaterialIcons name="arrow-forward" size={19} color="#120B06" />
        </Pressable>
        <Pressable accessibilityRole="button" onPress={continueToLogin} style={styles.textAction}>
          <Text style={[styles.textActionLabel, { color: theme.colors.textMuted }]}>Use account password</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, paddingHorizontal: 18, paddingTop: 58, paddingBottom: 32 },
  content: { flex: 1, justifyContent: 'center' },
  identityMark: { width: 142, height: 142, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', marginBottom: 27 },
  scanLine: { position: 'absolute', left: 20, right: 20, bottom: 35, height: 2, backgroundColor: '#F46A1B', opacity: 0.78 },
  kicker: { fontFamily: pluggdFonts.satoshiBold, fontSize: 11, letterSpacing: 1.8, marginBottom: 9 },
  title: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 36, lineHeight: 40, letterSpacing: -0.7, maxWidth: 350 },
  titleAccent: { color: '#F46A1B', fontFamily: pluggdFonts.displayBold },
  body: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, marginTop: 11, maxWidth: 350 },
  actions: { borderTopWidth: StyleSheet.hairlineWidth, paddingTop: 16, gap: 8 },
  primary: { minHeight: 52, borderRadius: 5, backgroundColor: '#F46A1B', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 17 },
  primaryText: { color: '#120B06', fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, letterSpacing: 0.8 },
  textAction: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  textActionLabel: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
});
