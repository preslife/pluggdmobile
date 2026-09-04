import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { pluggdFonts } from '../../src/design/typography';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import type { ComponentProps, ReactNode } from 'react';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BrandLogo } from '../../components/BrandLogo';
import { AppleSignInButton } from '../../components/AppleSignInButton';
import { GoogleSignInButton } from '../../components/GoogleSignInButton';
import { useAuth } from '../../src/context/AuthProvider';
import { usePluggdTheme, usePluggdThemeMode, type PluggdThemeMode } from '../../src/design/usePluggdTheme';
import { storePendingAccessCode, validateAccessCode } from '../../src/features/auth/launch-access';
import { LAUNCH_ACCESS_REQUIRED, MINIMUM_AGE } from '../../src/config/environment';
import { PLUGGD_ORANGE } from '../../src/lib/mobileContent';
import { supabase } from '../../src/lib/supabase';
import {
  isAppleSignInCancellation,
  signInWithApple,
} from '../../src/features/auth/apple-sign-in';
import {
  isGoogleSignInCancellation,
  signInWithGoogle,
} from '../../src/features/auth/google-sign-in';

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

function latestEligibleBirthDate() {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setFullYear(date.getFullYear() - MINIMUM_AGE);
  return date;
}

function formatBirthDateForStorage(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatBirthDateForDisplay(date: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(date);
}

export default function SignUp() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const { mode, setMode } = usePluggdThemeMode();
  const { launchAccessNotice, clearLaunchAccessNotice } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [accessCode, setAccessCode] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [dateDraft, setDateDraft] = useState(latestEligibleBirthDate);
  const [datePickerVisible, setDatePickerVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const strength = getPasswordStrength(password);
  const maximumBirthDate = latestEligibleBirthDate();
  const minimumBirthDate = new Date(1900, 0, 1, 12);
  const ageConfirmed = Boolean(dateOfBirth && dateOfBirth <= maximumBirthDate);
  const gradient =
    theme.scheme === 'dark'
      ? (['#050505', '#090909', '#0F0A07'] as const)
      : (['#FFFFFF', '#FAFAF8', '#FFF1E8'] as const);

  const handleSignUp = async () => {
    setLoading(true);
    setError('');
    await clearLaunchAccessNotice();

    try {
      const normalizedEmail = email.trim();
      const code = accessCode.trim();

      if (!dateOfBirth) {
        setError('Choose your date of birth to create an account.');
        setLoading(false);
        return;
      }

      if (!ageConfirmed) {
        setError(`You must be at least ${MINIMUM_AGE} to create an account.`);
        setLoading(false);
        return;
      }

      if (LAUNCH_ACCESS_REQUIRED && !code) {
        setError('Access code required for new accounts during early access.');
        setLoading(false);
        return;
      }

      const validation = LAUNCH_ACCESS_REQUIRED
        ? await validateAccessCode(code, normalizedEmail)
        : { valid: true, code: '' };
      if (!validation.valid) {
        setError('message' in validation ? validation.message : 'That access code is not valid.');
        setLoading(false);
        return;
      }
      if (LAUNCH_ACCESS_REQUIRED) await storePendingAccessCode(validation.code);

      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password,
        options: {
          data: {
            full_name: fullName,
            access_code: LAUNCH_ACCESS_REQUIRED ? validation.code : undefined,
            age_band: '16_plus',
            minimum_age_confirmed: true,
            date_of_birth: formatBirthDateForStorage(dateOfBirth),
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
      } else {
        if (signUpData.user) {
          await (supabase as any).from('profiles').update({ date_of_birth: formatBirthDateForStorage(dateOfBirth), updated_at: new Date().toISOString() }).eq('user_id', signUpData.user.id);
        }
        router.replace('/auth/role' as any);
      }
    } catch (authError: any) {
      setError(authError?.message ?? 'Unable to create account.');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignUp = async () => {
    setError('');
    if (!dateOfBirth) {
      setError('Choose your date of birth to create an account.');
      return;
    }
    if (!ageConfirmed) {
      setError(`You must be at least ${MINIMUM_AGE} to create an account.`);
      return;
    }

    setLoading(true);
    await clearLaunchAccessNotice();
    try {
      await signInWithApple({ minimumAgeConfirmed: true });
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        await (supabase as any).from('profiles').update({ date_of_birth: formatBirthDateForStorage(dateOfBirth), updated_at: new Date().toISOString() }).eq('user_id', authData.user.id);
      }
      router.replace('/auth/role' as any);
    } catch (authError: any) {
      if (!isAppleSignInCancellation(authError)) {
        setError(authError?.message ?? 'Unable to sign up with Apple.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignUp = async () => {
    setError('');
    if (!dateOfBirth) {
      setError('Choose your date of birth to create an account.');
      return;
    }
    if (!ageConfirmed) {
      setError(`You must be at least ${MINIMUM_AGE} to create an account.`);
      return;
    }

    setLoading(true);
    await clearLaunchAccessNotice();
    try {
      await signInWithGoogle({ minimumAgeConfirmed: true });
      const { data: authData } = await supabase.auth.getUser();
      if (authData.user) {
        await (supabase as any).from('profiles').update({ date_of_birth: formatBirthDateForStorage(dateOfBirth), updated_at: new Date().toISOString() }).eq('user_id', authData.user.id);
      }
      router.replace('/auth/role' as any);
    } catch (authError: any) {
      if (!isGoogleSignInCancellation(authError)) {
        setError(authError?.message ?? 'Unable to sign up with Google.');
      }
    } finally {
      setLoading(false);
    }
  };
  const cycleThemeMode = () => {
    const nextMode: PluggdThemeMode = mode === 'system' ? 'light' : mode === 'light' ? 'dark' : 'system';
    setMode(nextMode);
  };

  const openDatePicker = () => {
    setDateDraft(dateOfBirth ?? maximumBirthDate);
    setDatePickerVisible(true);
  };

  const onDateChange = (event: DateTimePickerEvent, selectedDate?: Date) => {
    if (Platform.OS !== 'ios') setDatePickerVisible(false);
    if (event.type === 'dismissed' || !selectedDate) return;
    setDateDraft(selectedDate);
    if (Platform.OS !== 'ios') setDateOfBirth(selectedDate);
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
              <Text maxFontSizeMultiplier={1.4} style={[styles.topButtonText, { color: theme.colors.text }]}>Back</Text>
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
              <Text maxFontSizeMultiplier={1.4} style={[styles.modeText, { color: theme.colors.textMuted }]}>
                {mode === 'system' ? 'System' : mode === 'light' ? 'Light' : 'Dark'}
              </Text>
            </Pressable>
          </View>

          <View style={styles.brandBlock}>
            <BrandLogo variant="auto" width={116} height={47} />
            <Text maxFontSizeMultiplier={1.4} style={[styles.kicker, { color: theme.colors.accent }]}>CREATE ACCOUNT</Text>
            <Text maxFontSizeMultiplier={1.35} style={[styles.title, { color: theme.colors.text }]}>Start building your PLUGGD identity.</Text>
            <Text maxFontSizeMultiplier={1.6} style={[styles.subtitle, { color: theme.colors.textMuted }]}>
              Set up your account first, then choose every role that applies to you.
            </Text>
          </View>

          <View style={[styles.formCard, { borderColor: theme.colors.border }]}>
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
            {LAUNCH_ACCESS_REQUIRED ? (
              <InputField
                label="Access code"
                icon="confirmation-number"
                value={accessCode}
                onChangeText={setAccessCode}
                placeholder="Required during early access"
                autoCapitalize="characters"
              />
            ) : null}

            <View style={styles.inputGroup}>
              <Text maxFontSizeMultiplier={1.5} style={[styles.inputLabel, { color: theme.colors.textMuted }]}>Date of birth</Text>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={dateOfBirth ? `Date of birth, ${formatBirthDateForDisplay(dateOfBirth)}` : 'Choose date of birth'}
                accessibilityHint="Opens the date selector"
                onPress={openDatePicker}
                style={[styles.dateButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              >
                <MaterialIcons name="calendar-month" size={20} color={theme.colors.accent} />
                <Text style={[styles.dateButtonText, { color: dateOfBirth ? theme.colors.text : theme.colors.textSubtle }]}>
                  {dateOfBirth ? formatBirthDateForDisplay(dateOfBirth) : 'Choose your date'}
                </Text>
                <MaterialIcons name="expand-more" size={22} color={theme.colors.textMuted} />
              </Pressable>
              <Text style={[styles.dateHelp, { color: theme.colors.textSubtle }]}>You must be at least {MINIMUM_AGE}. Your full date is kept private.</Text>
              {datePickerVisible ? (
                <View style={[styles.datePickerPanel, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                  <DateTimePicker
                    value={dateDraft}
                    mode="date"
                    display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                    minimumDate={minimumBirthDate}
                    maximumDate={maximumBirthDate}
                    onChange={onDateChange}
                    themeVariant={theme.scheme}
                  />
                  {Platform.OS === 'ios' ? (
                    <View style={styles.datePickerActions}>
                      <Pressable accessibilityRole="button" accessibilityLabel="Cancel date selection" style={styles.datePickerAction} onPress={() => setDatePickerVisible(false)}>
                        <Text style={[styles.datePickerActionText, { color: theme.colors.textMuted }]}>Cancel</Text>
                      </Pressable>
                      <Pressable accessibilityRole="button" accessibilityLabel="Confirm date of birth" style={[styles.datePickerAction, styles.datePickerDone]} onPress={() => { setDateOfBirth(dateDraft); setDatePickerVisible(false); }}>
                        <Text style={styles.datePickerDoneText}>Done</Text>
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              ) : null}
            </View>

            <Text style={[styles.legalText, { color: theme.colors.textSubtle }]}>
              By creating an account you agree to the{' '}
              <Text accessibilityRole="link" style={{ color: theme.colors.accent }} onPress={() => router.push('/legal/terms' as any)}>Terms</Text>
              {' '}and acknowledge the{' '}
              <Text accessibilityRole="link" style={{ color: theme.colors.accent }} onPress={() => router.push('/legal/privacy' as any)}>Privacy Policy</Text>.
            </Text>

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

            {launchAccessNotice || error ? (
              <View style={[styles.errorBox, { borderColor: theme.colors.danger, backgroundColor: 'rgba(255,92,92,0.1)' }]}>
                <MaterialIcons name="error-outline" size={18} color={theme.colors.danger} />
                <Text style={[styles.errorText, { color: theme.colors.danger }]}>
                  {error || launchAccessNotice}
                </Text>
              </View>
            ) : null}

            <Pressable
              accessibilityRole="button"
              accessibilityLabel={loading ? 'Creating account' : 'Create account'}
              onPress={handleSignUp}
              disabled={loading}
              style={[styles.cta, { opacity: loading ? 0.62 : 1 }]}
            >
              <Text style={styles.ctaText}>{loading ? 'Creating...' : 'Create account'}</Text>
              {!loading ? <MaterialIcons name="arrow-forward" size={18} color="#FFFFFF" /> : null}
            </Pressable>

            {!LAUNCH_ACCESS_REQUIRED ? (
              <>
                <View style={styles.authDivider}>
                  <View style={[styles.authDividerLine, { backgroundColor: theme.colors.border }]} />
                  <Text style={[styles.authDividerText, { color: theme.colors.textSubtle }]}>OR</Text>
                  <View style={[styles.authDividerLine, { backgroundColor: theme.colors.border }]} />
                </View>
                <AppleSignInButton
                  mode="sign-up"
                  onPress={() => void handleAppleSignUp()}
                  light={theme.scheme === 'light'}
                  disabled={loading}
                />
                <GoogleSignInButton
                  mode="sign-up"
                  onPress={() => void handleGoogleSignUp()}
                  disabled={loading}
                />
              </>
            ) : null}
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
      <Text maxFontSizeMultiplier={1.5} style={[styles.inputLabel, { color: theme.colors.textMuted }]}>{label}</Text>
      <View style={[styles.inputShell, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <MaterialIcons name={icon} size={20} color={theme.colors.accent} />
        <TextInput
          {...inputProps}
          maxFontSizeMultiplier={1.5}
          placeholderTextColor={theme.colors.textSubtle}
          style={[styles.input, { color: theme.colors.text }]}
        />
        {rightAction}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  authDivider: {
    marginVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  authDividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },
  authDividerText: {
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBold,
    fontWeight: '800',
    letterSpacing: 1.4,
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
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 18,
  },
  topButton: {
    minWidth: 78,
    minHeight: 44,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 5,
    paddingHorizontal: 11,
  },
  topButtonText: {
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
  modeButton: {
    minHeight: 44,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 11,
  },
  modeText: {
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
    letterSpacing: 1.1,
  },
  title: {
    marginTop: 8,
    fontSize: 32,
    letterSpacing: -0.5,
    fontFamily: pluggdFonts.displayExtraBold,
  },
  subtitle: {
    marginTop: 8,
    fontSize: 13,
    lineHeight: 19,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600',
  },
  formCard: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingVertical: 18,
  },
  inputGroup: {
    marginBottom: 12,
  },
  inputLabel: {
    fontSize: 12,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
    textTransform: 'uppercase',
    marginBottom: 7,
  },
  inputShell: {
    minHeight: 50,
    borderRadius: 5,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 13,
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600',
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
    marginTop: 7,
  },
  errorBox: {
    minHeight: 42,
    borderRadius: 5,
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
  },
  cta: {
    minHeight: 50,
    borderRadius: 5,
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
    color: '#120B06',
    fontSize: 13,
    letterSpacing: 0.8,
    fontFamily: pluggdFonts.satoshiBlack,
  },
  dateButton: { minHeight: 54, borderRadius: 5, borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 13 },
  dateButtonText: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 15, fontWeight: '600' },
  dateHelp: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, lineHeight: 15, marginTop: 6 },
  datePickerPanel: { borderRadius: 8, borderWidth: 1, overflow: 'hidden', marginTop: 8, paddingBottom: 10 },
  datePickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, paddingHorizontal: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(128,128,128,0.24)', paddingTop: 10 },
  datePickerAction: { minWidth: 72, minHeight: 42, borderRadius: 5, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  datePickerActionText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12, fontWeight: '800' },
  datePickerDone: { backgroundColor: PLUGGD_ORANGE },
  datePickerDoneText: { color: '#120B06', fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  legalText: {
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 11.5,
    lineHeight: 17,
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '700',
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
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
  footerText: {
    marginTop: 22,
    textAlign: 'center',
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600',
  },
  footerLink: {
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
});
