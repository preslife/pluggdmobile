import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { BrandLogo } from '../../components/BrandLogo';
import { PluggdGlassSurface } from '../../components/PluggdPrimitives';
import { usePluggdTheme, usePluggdThemeMode, type PluggdThemeMode } from '../../src/design/usePluggdTheme';
import { PLUGGD_ORANGE } from '../../src/lib/mobileContent';
import { supabase } from '../../src/lib/supabase';

export default function Login() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const { mode, setMode } = usePluggdThemeMode();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const screenGradient =
    theme.scheme === 'dark'
      ? (['#050505', '#090909', '#0F0A07'] as const)
      : (['#FFFFFF', '#FAFAF8', '#FFF1E8'] as const);

  const handleLogin = async () => {
    setLoading(true);
    setError('');
    const { error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (loginError) {
      setError(loginError.message);
    } else {
      router.replace('/');
    }
  };
  const cycleThemeMode = () => {
    const nextMode: PluggdThemeMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(nextMode);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <LinearGradient colors={screenGradient} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
              style={[styles.topButton, { backgroundColor: theme.colors.glassFallback, borderColor: theme.colors.border }]}
              onPress={() => router.replace('/' as any)}
            >
              <MaterialIcons name="home" size={21} color={theme.colors.text} />
              <Text style={[styles.topButtonText, { color: theme.colors.text }]}>Home</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch appearance"
              style={[styles.modeButton, { backgroundColor: theme.colors.glassFallback, borderColor: theme.colors.border }]}
              onPress={cycleThemeMode}
            >
              <MaterialIcons
                name={mode === 'dark' ? 'dark-mode' : mode === 'light' ? 'light-mode' : 'contrast'}
                size={18}
                color={theme.colors.accent}
              />
              <Text style={[styles.modeText, { color: theme.colors.textMuted }]}>
                {mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.brandBlock}>
            <BrandLogo variant="auto" width={116} height={47} />
            <Text style={[styles.kicker, { color: theme.colors.accent }]}>PLUGGD MOBILE</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>Sign in to your music ecosystem.</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              Access your feed, creator tools, wallet, live sessions and saved content.
            </Text>
          </View>

          <PluggdGlassSurface
            glassEffectStyle="regular"
            borderColor={theme.colors.border}
            fallbackColor={theme.colors.glassFallback}
            style={styles.formCard}
          >
            <InputRow
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputRow
              label="Password"
              icon="lock-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPassword}
              rightAction={
                <Pressable accessibilityRole="button" onPress={() => setShowPassword((value) => !value)}>
                  <MaterialIcons
                    name={showPassword ? 'visibility' : 'visibility-off'}
                    size={22}
                    color={theme.colors.textMuted}
                  />
                </Pressable>
              }
            />

            {error ? (
              <View style={[styles.errorBox, { backgroundColor: 'rgba(255,92,92,0.1)', borderColor: theme.colors.danger }]}>
                <MaterialIcons name="error-outline" size={18} color={theme.colors.danger} />
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <View style={styles.formMetaRow}>
              <Pressable onPress={() => router.push('/auth/magic-link' as any)}>
                <Text style={[styles.linkText, { color: theme.colors.textMuted }]}>Use magic link</Text>
              </Pressable>
              <Pressable>
                <Text style={[styles.linkText, { color: theme.colors.accent }]}>Forgot password?</Text>
              </Pressable>
            </View>

            <Pressable
              onPress={handleLogin}
              disabled={loading}
              style={[styles.loginButton, { opacity: loading ? 0.62 : 1 }]}
            >
              {loading ? <ActivityIndicator color="#FFFFFF" /> : <Text style={styles.loginButtonText}>Log in</Text>}
            </Pressable>
          </PluggdGlassSurface>

          <View style={styles.dividerRow}>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
            <Text style={[styles.dividerText, { color: theme.colors.textSubtle }]}>or continue with</Text>
            <View style={[styles.divider, { backgroundColor: theme.colors.border }]} />
          </View>

          <View style={styles.socialRow}>
            <SocialButton label="Apple" icon="apple" />
            <SocialButton label="Google" icon="g-translate" />
          </View>

          <Text style={[styles.signupText, { color: theme.colors.textMuted }]}>
            Don't have an account?{' '}
            <Link href="/auth/signup" style={[styles.signupLink, { color: theme.colors.accent }]}>
              Sign up
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputRow({
  label,
  icon,
  rightAction,
  ...inputProps
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  rightAction?: ReactNode;
} & ComponentProps<typeof TextInput>) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <View
        style={[
          styles.inputShell,
          {
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
      >
        <MaterialIcons name={icon} size={21} color={theme.colors.accent} />
        <TextInput
          {...inputProps}
          placeholderTextColor={theme.colors.textSubtle}
          style={[styles.input, { color: theme.colors.text }]}
        />
        {rightAction}
      </View>
    </View>
  );
}

function SocialButton({
  label,
  icon,
}: {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
}) {
  const theme = usePluggdTheme();
  return (
    <Pressable
      style={[
        styles.socialButton,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
      ]}
    >
      <MaterialIcons name={icon} size={22} color={theme.colors.text} />
      <Text style={[styles.socialText, { color: theme.colors.text }]}>{label}</Text>
    </Pressable>
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
    minHeight: '100%',
    paddingHorizontal: 18,
    paddingTop: 6,
    paddingBottom: 38,
    justifyContent: 'flex-start',
  },
  topRow: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  topButton: {
    minWidth: 82,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
  },
  topButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modeButton: {
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '700',
  },
  brandBlock: {
    marginBottom: 16,
  },
  kicker: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 8,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '700',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  formCard: {
    borderRadius: 14,
    padding: 12,
  },
  inputGroup: {
    marginBottom: 13,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  inputShell: {
    minHeight: 50,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    paddingVertical: 0,
  },
  errorBox: {
    minHeight: 42,
    borderRadius: 8,
    borderWidth: 1,
    paddingHorizontal: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 12,
    fontWeight: '700',
  },
  formMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 13,
  },
  linkText: {
    fontSize: 13,
    fontWeight: '700',
  },
  loginButton: {
    minHeight: 50,
    borderRadius: 8,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: PLUGGD_ORANGE,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  loginButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  dividerRow: {
    marginTop: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  divider: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  dividerText: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  socialRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 15,
  },
  socialButton: {
    flex: 1,
    minHeight: 46,
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '700',
  },
  signupText: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '700',
  },
  signupLink: {
    fontWeight: '700',
  },
});
