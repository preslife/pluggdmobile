import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker, { type DateTimePickerEvent } from '@react-native-community/datetimepicker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useAuth } from '../../src/context/AuthProvider';
import { MINIMUM_AGE } from '../../src/config/environment';
import { pluggdFonts } from '../../src/design/typography';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { birthDateForStorage, latestSignupBirthDate, privateDateOfBirth } from '../../src/features/auth/private-date-of-birth';

export default function PrivateDateOfBirthScreen() {
  const theme = usePluggdTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ continueTo?: string }>();
  const { user, session, loading: authLoading } = useAuth();
  const [date, setDate] = useState<Date | null>(null);
  const [draft, setDraft] = useState(latestSignupBirthDate);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState<{ hasDateOfBirth: boolean; adult: boolean | null } | null>(null);
  const [error, setError] = useState('');
  const request = useRef(0);
  const actor = useRef({ id: user?.id, token: session?.access_token });
  actor.current = { id: user?.id, token: session?.access_token };

  const load = async () => {
    const ticket = ++request.current;
    const owner = { ...actor.current };
    const current = () => ticket === request.current && owner.id === actor.current.id && owner.token === actor.current.token;
    setDate(null); setDraft(latestSignupBirthDate()); setPickerOpen(false); setSaving(false); setSaved(null); setError(''); setLoading(true);
    try {
      if (!owner.id) return;
      const resumed = await privateDateOfBirth.resumeSignup(owner.id, current);
      const value = resumed ?? await privateDateOfBirth.load(owner.id, current);
      if (current()) setSaved(value);
    } catch (cause) { if (current()) setError(cause instanceof Error ? cause.message : 'Your private details could not load. Please try again.'); }
    finally { if (current()) setLoading(false); }
  };
  useEffect(() => {
    if (!authLoading) void load();
    return () => { request.current++; };
  }, [authLoading, user?.id, session?.access_token]);

  const finish = () => {
    if (params.continueTo === 'role') router.replace('/auth/role');
    else if (router.canGoBack()) router.back();
    else router.replace('/');
  };
  const save = async () => {
    if (!date || saving || !user?.id || !saved || saved.hasDateOfBirth) return;
    const ticket = ++request.current;
    const owner = { ...actor.current };
    const current = () => ticket === request.current && owner.id === actor.current.id && owner.token === actor.current.token;
    setSaving(true); setError('');
    try {
      const value = await privateDateOfBirth.saveMissing(user.id, birthDateForStorage(date), current);
      if (current()) { setSaved(value); setDate(null); setPickerOpen(false); }
    } catch (cause) { if (current()) setError(cause instanceof Error ? cause.message : 'Your date of birth could not save. Please try again.'); }
    finally { if (current()) setSaving(false); }
  };
  const change = (event: DateTimePickerEvent, selected?: Date) => {
    if (Platform.OS !== 'ios') setPickerOpen(false);
    if (event.type === 'dismissed' || !selected) return;
    setDraft(selected);
    if (Platform.OS !== 'ios') setDate(selected);
  };
  const dateLabel = date ? new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date) : 'Choose your date of birth';

  return <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
    <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
    <Stack.Screen options={{ headerShown: false }} />
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.canGoBack() ? router.back() : router.replace('/')} style={styles.back}>
        <MaterialIcons name="chevron-left" size={26} color={theme.colors.text} /><Text style={[styles.body, { color: theme.colors.text }]}>Back</Text>
      </Pressable>
      <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
        <MaterialIcons name="lock-outline" size={32} color={theme.colors.accentText} />
        <Text accessibilityRole="header" maxFontSizeMultiplier={1.4} style={[styles.title, { color: theme.colors.text }]}>Your private date of birth</Text>
        <Text maxFontSizeMultiplier={1.5} style={[styles.body, { color: theme.colors.textMuted }]}>We use your date of birth to check age requirements. Explicit music is for listeners aged 18 and over. Your full date is kept private.</Text>
        {authLoading || loading ? <ActivityIndicator accessibilityLabel="Checking your private details" color={theme.colors.accentText} /> : !user ? <>
          <Text style={[styles.body, { color: theme.colors.textMuted }]}>Sign in to add your date of birth.</Text>
          <Pressable accessibilityRole="button" onPress={() => router.push('/auth/login')} style={[styles.action, { backgroundColor: theme.colors.accentFill }]}><Text style={[styles.actionText, { color: theme.colors.onAccent }]}>Sign in</Text></Pressable>
        </> : saved?.hasDateOfBirth ? <>
          <Text accessibilityLiveRegion="polite" style={[styles.body, { color: theme.colors.text }]}>{saved.adult === false ? 'Your date of birth is saved. Explicit music is only available to listeners aged 18 and over.' : 'Your date of birth is already saved. Return to the music and try again.'}</Text>
          <Pressable accessibilityRole="button" onPress={finish} style={[styles.action, { backgroundColor: theme.colors.accentFill }]}><Text style={[styles.actionText, { color: theme.colors.onAccent }]}>Continue</Text></Pressable>
        </> : saved ? <>
          <Pressable accessibilityRole="button" accessibilityLabel={dateLabel} disabled={saving} onPress={() => { setDraft(date ?? latestSignupBirthDate()); setPickerOpen(true); }} style={[styles.dateButton, { borderColor: theme.colors.border }]}>
            <MaterialIcons name="calendar-today" size={21} color={theme.colors.accentText} /><Text maxFontSizeMultiplier={1.5} style={[styles.dateLabel, { color: theme.colors.text }]}>{dateLabel}</Text>
          </Pressable>
          <Text style={[styles.caption, { color: theme.colors.textSubtle }]}>You must be at least {MINIMUM_AGE} to use PLUGGD.</Text>
          {pickerOpen ? <View>
            <DateTimePicker value={draft} mode="date" display={Platform.OS === 'ios' ? 'spinner' : 'default'} minimumDate={new Date(1900, 0, 1, 12)} maximumDate={latestSignupBirthDate()} onChange={change} themeVariant={theme.scheme} />
            {Platform.OS === 'ios' ? <View style={styles.pickerActions}>
              <Pressable accessibilityRole="button" disabled={saving} onPress={() => setPickerOpen(false)} style={styles.back}><Text style={[styles.actionText, { color: theme.colors.textMuted }]}>Cancel</Text></Pressable>
              <Pressable accessibilityRole="button" disabled={saving} accessibilityLabel="Confirm date of birth" onPress={() => { setDate(draft); setPickerOpen(false); }} style={styles.back}><Text style={[styles.actionText, { color: theme.colors.accentText }]}>Done</Text></Pressable>
            </View> : null}
          </View> : null}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: !date || saving, busy: saving }} disabled={!date || saving} onPress={() => void save()} style={[styles.action, { backgroundColor: theme.colors.accentFill, opacity: !date || saving ? 0.5 : 1 }]}>
            {saving ? <ActivityIndicator color={theme.colors.onAccent} /> : <Text style={[styles.actionText, { color: theme.colors.onAccent }]}>Save private date of birth</Text>}
          </Pressable>
        </> : null}
        {error ? <View accessibilityLiveRegion="polite" style={styles.error}>
          <Text style={[styles.body, { color: theme.colors.danger }]}>{error}</Text>
          {!saved ? <Pressable accessibilityRole="button" onPress={() => void load()} style={styles.back}><Text style={[styles.actionText, { color: theme.colors.accentText }]}>Try again</Text></Pressable> : null}
        </View> : null}
      </View>
    </ScrollView>
  </SafeAreaView>;
}
const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { padding: 20, paddingBottom: 140, gap: 20 },
  back: { minHeight: 48, minWidth: 48, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 8, gap: 4 },
  card: { borderWidth: 1, borderRadius: 8, padding: 20, gap: 18 },
  title: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 26, lineHeight: 33 },
  body: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 15, lineHeight: 23 },
  caption: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 18 },
  action: { minHeight: 50, borderRadius: 5, alignItems: 'center', justifyContent: 'center', padding: 12 },
  actionText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  dateButton: { minHeight: 56, borderWidth: 1, borderRadius: 5, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateLabel: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 15 },
  pickerActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 16 }, error: { gap: 8 },
});
