import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import {
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

function getPasswordStrength(password: string): { level: number; label: string; color: string } {
  if (!password) return { level: 0, label: '', color: '' };
  let score = 0;
  if (password.length >= 6) score += 1;
  if (password.length >= 10) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;
  if (score <= 1) return { level: 1, label: 'Weak', color: '#EF4444' };
  if (score <= 3) return { level: 2, label: 'Good', color: PLUGGD_ORANGE };
  return { level: 4, label: 'Strong', color: '#22C55E' };
}

export default function SignUp() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const { mode, setMode } = usePluggdThemeMode();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const strength = getPasswordStrength(password);
  const gradient =
    theme.scheme === 'dark'
      ? (['#050505', '#090909', '#0F0A07'] as const)
      : (['#FFFFFF', '#FAFAF8', '#FFF1E8'] as const);

  const handleSignUp = async () => {
    setLoading(true);
    setError('');

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
      },
    });

    setLoading(false);

    if (signUpError) setError(signUpError.message);
    else router.replace('/auth/role' as any);
  };
  const cycleThemeMode = () => {
    const nextMode: PluggdThemeMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(nextMode);
  };

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <LinearGradient colors={gradient} style={StyleSheet.absoluteFill} />

      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.keyboard}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={styles.content}
        >
          <View style={styles.topRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              style={[styles.topButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.glassFallback }]}
              onPress={() => router.back()}
            >
              <MaterialIcons name="chevron-left" size={22} color={theme.colors.text} />
              <Text style={[styles.topButtonText, { color: theme.colors.text }]}>Back</Text>
            </Pressable>
            <View style={styles.progressTrack}>
              <View style={styles.progressActive} />
              <View style={[styles.progressDot, { backgroundColor: theme.colors.border }]} />
              <View style={[styles.progressDot, { backgroundColor: theme.colors.border }]} />
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Switch appearance"
              style={[styles.modeButton, { borderColor: theme.colors.border, backgroundColor: theme.colors.glassFallback }]}
              onPress={cycleThemeMode}
            >
              <MaterialIcons
                name={mode === 'dark' ? 'dark-mode' : mode === 'light' ? 'light-mode' : 'contrast'}
                size={19}
                color={theme.colors.accent}
              />
              <Text style={[styles.modeText, { color: theme.colors.textMuted }]}>
                {mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.brandBlock}>
            <BrandLogo variant="auto" width={116} height={47} />
            <Text style={[styles.kicker, { color: theme.colors.accent }]}>CREATE ACCOUNT</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>Start building your Pluggd identity.</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              Set up your account first, then choose every role that applies to you.
            </Text>
          </View>

          <PluggdGlassSurface
            glassEffectStyle="regular"
            borderColor={theme.colors.border}
            fallbackColor={theme.colors.glassFallback}
            style={styles.formCard}
          >
            <InputField
              label="Full name"
              icon="person-outline"
              value={fullName}
              onChangeText={setFullName}
              placeholder="Enter your full name"
              autoCapitalize="words"
            />
            <InputField
              label="Email"
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              placeholder="name@example.com"
              keyboardType="email-address"
              autoCapitalize="none"
            />
            <InputField
              label="Password"
              icon="lock-outline"
              value={password}
              onChangeText={setPassword}
              placeholder="Password"
              secureTextEntry={!showPassword}
              rightAction={
                <Pressable accessibilityRole="button" onPress={() => setShowPassword((value) => !value)}>
                  <MaterialIcons name={showPassword ? 'visibility' : 'visibility-off'} size={21} color={theme.colors.textMuted} />
                </Pressable>
              }
            />

            {password.length > 0 ? (
              <View style={styles.strengthWrap}>
                <View style={styles.strengthBars}>
                  {[1, 2, 3, 4].map((item) => (
                    <View
                      key={item}
                      style={[
                        styles.strengthBar,
                        { backgroundColor: item <= strength.level ? strength.color : theme.colors.border },
                      ]}
                    />
                  ))}
                </View>
                <Text style={[styles.strengthText, { color: strength.color }]}>Password strength: {strength.label}</Text>
              </View>
            ) : null}

            {error ? (
              <View style={[styles.errorBox, { borderColor: theme.colors.danger, backgroundColor: 'rgba(255,92,92,0.1)' }]}>
                <MaterialIcons name="error-outline" size={18} color={theme.colors.danger} />
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>{error}</Text>
              </View>
            ) : null}

            <Pressable
              onPress={handleSignUp}
              disabled={loading}
              style={[styles.cta, { opacity: loading ? 0.62 : 1 }]}
            >
              <Text style={styles.ctaText}>{loading ? 'Creating...' : 'Create account'}</Text>
              {!loading ? <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" /> : null}
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

          <Text style={[styles.footerText, { color: theme.colors.textMuted }]}>
            Already have an account?{' '}
            <Link href="/auth/login" style={[styles.footerLink, { color: theme.colors.accent }]}>
              Log in
            </Link>
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function InputField({
  label,
  icon,
  rightAction,
  ...inputProps
}: ComponentProps<typeof TextInput> & {
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  rightAction?: ReactNode;
}) {
  const theme = usePluggdTheme();
  return (
    <View style={styles.inputGroup}>
      <Text style={[styles.inputLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <View style={[styles.inputShell, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <MaterialIcons name={icon} size={20} color={theme.colors.accent} />
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

function SocialButton({ label, icon }: { label: string; icon: keyof typeof MaterialIcons.glyphMap }) {
  const theme = usePluggdTheme();
  return (
    <Pressable style={[styles.socialButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
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
    paddingTop: 10,
    paddingBottom: 34,
  },
  topRow: {
    height: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  topButton: {
    minWidth: 78,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
  },
  topButtonText: {
    fontSize: 12,
    fontWeight: '800',
  },
  modeButton: {
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
  },
  modeText: {
    fontSize: 12,
    fontWeight: '800',
  },
  progressTrack: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  progressActive: {
    width: 34,
    height: 3,
    borderRadius: 999,
    backgroundColor: PLUGGD_ORANGE,
  },
  progressDot: {
    width: 10,
    height: 3,
    borderRadius: 999,
  },
  brandBlock: {
    marginBottom: 16,
  },
  kicker: {
    marginTop: 14,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 8,
    fontSize: 26,
    lineHeight: 32,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  formCard: {
    borderRadius: 16,
    padding: 13,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  inputShell: {
    minHeight: 50,
    borderRadius: 13,
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
  strengthWrap: {
    marginBottom: 12,
  },
  strengthBars: {
    flexDirection: 'row',
    gap: 7,
  },
  strengthBar: {
    flex: 1,
    height: 3,
    borderRadius: 999,
  },
  strengthText: {
    fontSize: 11,
    fontWeight: '700',
    marginTop: 7,
  },
  errorBox: {
    minHeight: 42,
    borderRadius: 12,
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
  cta: {
    minHeight: 50,
    borderRadius: 16,
    backgroundColor: PLUGGD_ORANGE,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
    shadowColor: PLUGGD_ORANGE,
    shadowOpacity: 0.28,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '800',
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
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  socialText: {
    fontSize: 14,
    fontWeight: '800',
  },
  footerText: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 14,
    fontWeight: '600',
  },
  footerLink: {
    fontWeight: '800',
  },
});
