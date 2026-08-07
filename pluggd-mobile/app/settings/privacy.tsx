import { MaterialIcons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';
import { Stack, useRouter } from 'expo-router';
import { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { LEGAL_URLS, MINIMUM_AGE } from '../../src/config/environment';
import { pluggdFonts } from '../../src/design/typography';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import {
  deleteMyAccount,
  loadSafetySettings,
  updateSafetySettings,
  type AccountSafetySettings,
  type AgeBand,
} from '../../src/features/safety/accountSafety';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const [settings, setSettings] = useState<AccountSafetySettings>({
    ageBand: null,
    sensitiveContentEnabled: false,
  });
  const [loading, setLoading] = useState(true);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteText, setDeleteText] = useState('');
  const [subscriptionAcknowledged, setSubscriptionAcknowledged] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    loadSafetySettings()
      .then(setSettings)
      .catch(() => Alert.alert('Safety settings unavailable', 'Please check your connection and try again.'))
      .finally(() => setLoading(false));
  }, []);

  const save = async (next: AccountSafetySettings) => {
    const previous = settings;
    setSettings(next);
    try {
      await updateSafetySettings(next);
    } catch {
      setSettings(previous);
      Alert.alert('Could not save', 'Your safety preference was not changed.');
    }
  };

  const setAgeBand = (ageBand: AgeBand) => {
    void save({
      ageBand,
      sensitiveContentEnabled: ageBand === 'under_16' ? false : settings.sensitiveContentEnabled,
    });
  };

  const confirmDeletion = async () => {
    if (deleteText !== 'DELETE') return;
    setDeleting(true);
    try {
      await deleteMyAccount({
        confirmation: deleteText,
        acknowledgeSubscription: subscriptionAcknowledged,
      });
      setDeleteOpen(false);
      router.replace('/auth/login' as any);
      Alert.alert('Account deleted', 'Your PLUGGD account has been permanently deleted.');
    } catch (error: any) {
      Alert.alert('Account not deleted', error?.message ?? 'Please try again.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, { borderColor: theme.colors.border }]}>
          <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
        </Pressable>

        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: theme.colors.accent }]}>PRIVACY & SAFETY</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>Your music life.<Text style={styles.titleAccent}> Your terms.</Text></Text>
          <Text style={[styles.intro, { color: theme.colors.textMuted }]}>Age-aware discovery, community controls and account ownership in one place.</Text>
        </View>

        <Section title="AGE & CONTENT" borderColor={theme.colors.border} subtle={theme.colors.textSubtle}>
          {loading ? (
            <View style={styles.loadingRow}><ActivityIndicator color={theme.colors.accent} /><Text style={{ color: theme.colors.textMuted }}>Loading safety settings…</Text></View>
          ) : (
            <>
              <View style={[styles.agePicker, { borderBottomColor: theme.colors.border }]}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>Age declaration</Text>
                <Text style={[styles.rowDetail, { color: theme.colors.textMuted }]}>Required to apply appropriate discovery filters.</Text>
                <View style={styles.ageChoices}>
                  <Choice label="Under 16" selected={settings.ageBand === 'under_16'} onPress={() => setAgeBand('under_16')} colors={theme.colors} />
                  <Choice label={`${MINIMUM_AGE}+`} selected={settings.ageBand === '16_plus'} onPress={() => setAgeBand('16_plus')} colors={theme.colors} />
                  <Choice label="18+" selected={settings.ageBand === '18_plus'} onPress={() => setAgeBand('18_plus')} colors={theme.colors} />
                </View>
              </View>
              <ToggleRow
                icon="visibility"
                title="Show sensitive content"
                detail={settings.ageBand === 'under_16' ? 'Unavailable for accounts under 16.' : 'Blur potentially mature artwork and posts when off.'}
                disabled={!settings.ageBand || settings.ageBand === 'under_16'}
                value={settings.sensitiveContentEnabled}
                onValueChange={(value) => void save({ ...settings, sensitiveContentEnabled: value })}
                colors={theme.colors}
              />
            </>
          )}
        </Section>

        <Section title="COMMUNITY SAFETY" borderColor={theme.colors.border} subtle={theme.colors.textSubtle}>
          <ActionRow icon="block" title="Blocked accounts" detail="Review and unblock accounts" colors={theme.colors} onPress={() => router.push('/settings/blocked-accounts' as any)} />
          <ActionRow icon="policy" title="Community Guidelines" detail="What is and is not allowed on PLUGGD" colors={theme.colors} onPress={() => Linking.openURL(LEGAL_URLS.communityGuidelines)} />
        </Section>

        <Section title="YOUR DATA" borderColor={theme.colors.border} subtle={theme.colors.textSubtle}>
          <ActionRow icon="download" title="Download your archive" detail="Create a private, expiring copy of your data" colors={theme.colors} onPress={() => router.push('/settings/data-export')} accent />
          <ActionRow icon="delete-outline" title="Delete account" detail="Permanently remove your account and personal data" colors={theme.colors} danger onPress={() => setDeleteOpen(true)} />
        </Section>

        <View style={styles.legalLinks}>
          <Text accessibilityRole="link" onPress={() => Linking.openURL(LEGAL_URLS.privacy)} style={[styles.legalLink, { color: theme.colors.accent }]}>Privacy Policy</Text>
          <Text accessibilityRole="link" onPress={() => Linking.openURL(LEGAL_URLS.terms)} style={[styles.legalLink, { color: theme.colors.accent }]}>Terms of Service</Text>
          <Text accessibilityRole="link" onPress={() => Linking.openURL(LEGAL_URLS.support)} style={[styles.legalLink, { color: theme.colors.accent }]}>Support</Text>
        </View>
      </ScrollView>

      <Modal visible={deleteOpen} transparent animationType="fade" onRequestClose={() => setDeleteOpen(false)}>
        <View style={styles.scrim}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
            <View style={styles.dangerIcon}><MaterialIcons name="delete-forever" size={28} color="#FFFFFF" /></View>
            <Text style={[styles.modalTitle, { color: theme.colors.text }]}>Permanently delete account?</Text>
            <Text style={[styles.modalBody, { color: theme.colors.textMuted }]}>Your profile and personal content will be removed immediately. Financial, fraud-prevention and safety records may be retained where legally required. This cannot be undone.</Text>
            <Pressable accessibilityRole="link" onPress={() => Linking.openURL(LEGAL_URLS.subscriptions)} style={[styles.renewalNote, { borderColor: theme.colors.border }]}>
              <MaterialIcons name="open-in-new" size={18} color={theme.colors.accent} />
              <Text style={[styles.renewalText, { color: theme.colors.textMuted }]}>Deleting PLUGGD does not cancel subscriptions managed by Apple. Open Apple subscriptions.</Text>
            </Pressable>
            <Pressable
              accessibilityRole="checkbox"
              accessibilityState={{ checked: subscriptionAcknowledged }}
              onPress={() => setSubscriptionAcknowledged((value) => !value)}
              style={styles.ackRow}
            >
              <MaterialIcons name={subscriptionAcknowledged ? 'check-box' : 'check-box-outline-blank'} size={24} color={theme.colors.accent} />
              <Text style={[styles.ackText, { color: theme.colors.text }]}>I understand I must cancel Apple subscriptions separately.</Text>
            </Pressable>
            <TextInput
              accessibilityLabel="Type DELETE to confirm"
              value={deleteText}
              onChangeText={setDeleteText}
              autoCapitalize="characters"
              placeholder="Type DELETE"
              placeholderTextColor={theme.colors.textSubtle}
              style={[styles.deleteInput, { color: theme.colors.text, borderColor: theme.colors.border }]}
            />
            <View style={styles.modalActions}>
              <Pressable accessibilityRole="button" onPress={() => setDeleteOpen(false)} style={[styles.cancel, { borderColor: theme.colors.border }]}><Text style={{ color: theme.colors.text }}>Cancel</Text></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={deleting ? 'Deleting account' : 'Delete account permanently'} disabled={deleteText !== 'DELETE' || deleting} onPress={confirmDeletion} style={[styles.deleteButton, { opacity: deleteText === 'DELETE' && !deleting ? 1 : 0.4 }]}>
                <Text style={styles.deleteButtonText}>{deleting ? 'Deleting…' : 'Delete forever'}</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

function Section({ title, borderColor, subtle, children }: { title: string; borderColor: string; subtle: string; children: React.ReactNode }) {
  return <View style={styles.section}><Text style={[styles.sectionTitle, { color: subtle }]}>{title}</Text><View style={[styles.ledger, { borderTopColor: borderColor }]}>{children}</View></View>;
}

type ThemeColors = ReturnType<typeof usePluggdTheme>['colors'];
function Choice({ label, selected, onPress, colors }: { label: string; selected: boolean; onPress: () => void; colors: ThemeColors }) {
  return <Pressable accessibilityRole="radio" accessibilityState={{ selected }} onPress={onPress} style={[styles.choice, { borderColor: selected ? colors.accent : colors.border, backgroundColor: selected ? 'rgba(244,106,27,0.14)' : 'transparent' }]}><Text style={[styles.choiceText, { color: selected ? colors.accent : colors.textMuted }]}>{label}</Text></Pressable>;
}

function ToggleRow({ icon, title, detail, value, onValueChange, colors, disabled }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; detail: string; value: boolean; onValueChange: (value: boolean) => void; colors: ThemeColors; disabled?: boolean }) {
  return <View style={[styles.row, { borderBottomColor: colors.border, opacity: disabled ? 0.5 : 1 }]}><MaterialIcons name={icon} size={21} color={colors.accent} style={styles.rowIcon} /><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text><Text style={[styles.rowDetail, { color: colors.textMuted }]}>{detail}</Text></View><Switch disabled={disabled} accessibilityLabel={title} value={value} onValueChange={onValueChange} trackColor={{ false: colors.surfaceAlt, true: '#F46A1B' }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surfaceAlt} /></View>;
}

function ActionRow({ icon, title, detail, colors, onPress, accent, danger }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; detail: string; colors: ThemeColors; onPress: () => void; accent?: boolean; danger?: boolean }) {
  const color = danger ? '#E85D5D' : accent ? colors.accent : colors.text;
  return <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${detail}`} onPress={onPress} style={[styles.row, { borderBottomColor: colors.border }]}><MaterialIcons name={icon} size={21} color={color} style={styles.rowIcon} /><View style={styles.rowCopy}><Text style={[styles.rowTitle, { color }]}>{title}</Text><Text style={[styles.rowDetail, { color: colors.textMuted }]}>{detail}</Text></View><MaterialIcons name="arrow-forward" size={19} color={colors.textSubtle} /></Pressable>;
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 58, paddingBottom: 176 },
  back: { width: 44, height: 44, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 24, marginBottom: 34 },
  kicker: { fontFamily: pluggdFonts.satoshiBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.8, marginBottom: 9 },
  title: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 35, lineHeight: 39, letterSpacing: -0.6, maxWidth: 350 },
  titleAccent: { color: '#F46A1B', fontFamily: pluggdFonts.displayBold },
  intro: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 350 },
  section: { marginBottom: 30 },
  sectionTitle: { fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1.7, marginBottom: 10 },
  ledger: { borderTopWidth: StyleSheet.hairlineWidth },
  loadingRow: { minHeight: 74, flexDirection: 'row', alignItems: 'center', gap: 12 },
  row: { minHeight: 74, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 2 },
  rowIcon: { width: 32, textAlign: 'center' },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { fontFamily: pluggdFonts.satoshiBold, fontSize: 15, lineHeight: 19 },
  rowDetail: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  agePicker: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 15, gap: 4 },
  ageChoices: { flexDirection: 'row', gap: 8, marginTop: 10 },
  choice: { minHeight: 44, flex: 1, borderWidth: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  choiceText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  legalLinks: { flexDirection: 'row', flexWrap: 'wrap', gap: 18 },
  legalLink: { minHeight: 44, textAlignVertical: 'center', fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  scrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.72)', justifyContent: 'flex-end', padding: 12 },
  modalCard: { borderWidth: 1, borderRadius: 9, padding: 20, paddingBottom: 28, gap: 15 },
  dangerIcon: { width: 52, height: 52, borderRadius: 5, backgroundColor: '#C63D3D', alignItems: 'center', justifyContent: 'center' },
  modalTitle: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 25, lineHeight: 29 },
  modalBody: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19 },
  renewalNote: { minHeight: 58, borderWidth: 1, borderRadius: 5, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  renewalText: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  ackRow: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 10 },
  ackText: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  deleteInput: { minHeight: 50, borderWidth: 1, borderRadius: 5, paddingHorizontal: 14, fontFamily: pluggdFonts.satoshiBold, letterSpacing: 1.5 },
  modalActions: { flexDirection: 'row', gap: 9 },
  cancel: { minHeight: 48, flex: 1, borderWidth: 1, borderRadius: 5, alignItems: 'center', justifyContent: 'center' },
  deleteButton: { minHeight: 48, flex: 1.4, borderRadius: 5, backgroundColor: '#C63D3D', alignItems: 'center', justifyContent: 'center' },
  deleteButtonText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
});
