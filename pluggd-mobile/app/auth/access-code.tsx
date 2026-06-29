import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { storePendingAccessCode, validateAccessCode } from '../../src/features/auth/launch-access';

const PLUGGD_ORANGE = '#FF5A00';

export default function AccessCodeScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const [code, setCode] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [valid, setValid] = useState(false);

  const validate = async () => {
    setLoading(true);
    setMessage(null);
    setValid(false);

    try {
      const result = await validateAccessCode(code, email.trim() || null);
      setMessage(result.message);
      setValid(result.valid);
      if (result.valid) {
        await storePendingAccessCode(result.code);
      }
    } catch (error: any) {
      setMessage(error?.message ?? 'Unable to validate access code.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={theme.scheme === 'dark' ? ['#050505', '#090909', '#0F0A07'] : ['#FFFFFF', '#FAFAF8', '#FFF1E8']}
        style={StyleSheet.absoluteFill}
      />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <View style={styles.content}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: theme.colors.glassFallback, borderColor: theme.colors.border }]}
          >
            <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
          </Pressable>

          <View style={styles.copyBlock}>
            <Text style={styles.kicker}>EARLY ACCESS</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>Unlock PLUGGD mobile.</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              Enter your launch access code before signing in or creating an account.
            </Text>
          </View>

          <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <Input label="Access code" value={code} onChangeText={setCode} placeholder="PLUGGD-XXXX" autoCapitalize="characters" />
            <Input label="Email" value={email} onChangeText={setEmail} placeholder="name@example.com" keyboardType="email-address" autoCapitalize="none" />

            {message ? (
              <View style={[styles.message, { borderColor: valid ? theme.colors.success : theme.colors.danger }]}>
                <MaterialIcons name={valid ? 'check-circle' : 'error-outline'} size={18} color={valid ? theme.colors.success : theme.colors.danger} />
                <Text style={[styles.messageText, { color: valid ? theme.colors.success : theme.colors.danger }]}>{message}</Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              disabled={loading || code.trim().length === 0}
              onPress={validate}
              style={[styles.primaryButton, { opacity: loading || code.trim().length === 0 ? 0.55 : 1 }]}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.primaryText}>Validate code</Text>}
            </Pressable>

            {valid ? (
              <View style={styles.actionRow}>
                <Pressable onPress={() => router.replace('/auth/signup' as any)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Create account</Text>
                </Pressable>
                <Pressable onPress={() => router.replace('/auth/login' as any)} style={styles.secondaryButton}>
                  <Text style={styles.secondaryText}>Log in</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function Input(props: React.ComponentProps<typeof TextInput> & { label: string }) {
  const theme = usePluggdTheme();
  const { label, ...inputProps } = props;
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <TextInput
        {...inputProps}
        placeholderTextColor={theme.colors.textSubtle}
        style={[styles.input, { color: theme.colors.text, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceAlt }]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  keyboard: {
    flex: 1,
  },
  content: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 12,
    justifyContent: 'center',
  },
  backButton: {
    position: 'absolute',
    left: 18,
    top: 58,
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copyBlock: {
    marginBottom: 22,
  },
  kicker: {
    color: PLUGGD_ORANGE,
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
    letterSpacing: 1,
  },
  title: {
    marginTop: 8,
    fontSize: 33,
    lineHeight: 39,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
  subtitle: {
    marginTop: 9,
    fontSize: 15,
    lineHeight: 22,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600',
  },
  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
    gap: 13,
  },
  inputGroup: {
    gap: 7,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
    textTransform: 'uppercase',
  },
  input: {
    minHeight: 50,
    borderWidth: 1,
    borderRadius: 13,
    paddingHorizontal: 13,
    fontSize: 16,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  message: {
    borderWidth: 1,
    borderRadius: 13,
    padding: 11,
    flexDirection: 'row',
    gap: 8,
  },
  messageText: {
    flex: 1,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  primaryButton: {
    minHeight: 52,
    borderRadius: 15,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
  },
  secondaryButton: {
    flex: 1,
    minHeight: 48,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  secondaryText: {
    color: '#080808',
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
});
