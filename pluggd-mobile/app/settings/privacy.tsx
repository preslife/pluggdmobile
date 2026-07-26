import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { pluggdFonts } from '../../src/design/typography';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

export default function PrivacySettingsScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const [privateProfile, setPrivateProfile] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);

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
          <Text style={[styles.intro, { color: theme.colors.textMuted }]}>Control who can find you, what the community can see, and how your PLUGGD data is handled.</Text>
        </View>

        <Section title="VISIBILITY" borderColor={theme.colors.border} subtle={theme.colors.textSubtle}>
          <ToggleRow
            icon="lock-outline"
            title="Private profile"
            detail="Only approved followers can see your tracks and playlists."
            value={privateProfile}
            onValueChange={setPrivateProfile}
            colors={theme.colors}
          />
          <ToggleRow
            icon="sensors"
            title="Show online status"
            detail="Let others see when you are active on PLUGGD."
            value={showOnlineStatus}
            onValueChange={setShowOnlineStatus}
            colors={theme.colors}
          />
        </Section>

        <Section title="COMMUNITY SAFETY" borderColor={theme.colors.border} subtle={theme.colors.textSubtle}>
          <ActionRow icon="block" title="Blocked accounts" detail="Review people you have blocked" colors={theme.colors} onPress={() => Alert.alert('Blocked accounts', 'Your blocked-account controls will appear here when mobile moderation preferences are enabled.')} />
          <ActionRow icon="tune" title="Content filters" detail="Manage sensitive-content preferences" colors={theme.colors} onPress={() => Alert.alert('Content filters', 'Content filtering is not yet configurable in the mobile app.')} />
        </Section>

        <Section title="YOUR DATA" borderColor={theme.colors.border} subtle={theme.colors.textSubtle}>
          <ActionRow icon="download" title="Download your archive" detail="Purchases, messages, posts and account activity" colors={theme.colors} onPress={() => router.push('/settings/data-export')} accent />
          <ActionRow icon="delete-outline" title="Delete account" detail="Permanently remove your account and data" colors={theme.colors} danger onPress={() => Alert.alert('Delete account', 'For your protection, account deletion currently requires confirmation through PLUGGD support or web account settings.')} />
        </Section>

        <Text style={[styles.legal, { color: theme.colors.textSubtle }]}>PLUGGD processes account data in line with its Privacy Policy and Terms of Service. Export and deletion requests require identity verification.</Text>
      </ScrollView>
    </View>
  );
}

function Section({ title, borderColor, subtle, children }: { title: string; borderColor: string; subtle: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={[styles.sectionTitle, { color: subtle }]}>{title}</Text>
      <View style={[styles.ledger, { borderTopColor: borderColor }]}>{children}</View>
    </View>
  );
}

type ThemeColors = ReturnType<typeof usePluggdTheme>['colors'];

function ToggleRow({ icon, title, detail, value, onValueChange, colors }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; detail: string; value: boolean; onValueChange: (value: boolean) => void; colors: ThemeColors }) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.border }]}>
      <MaterialIcons name={icon} size={21} color={colors.accent} style={styles.rowIcon} />
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color: colors.text }]}>{title}</Text>
        <Text style={[styles.rowDetail, { color: colors.textMuted }]}>{detail}</Text>
      </View>
      <Switch accessibilityLabel={title} value={value} onValueChange={onValueChange} trackColor={{ false: colors.surfaceAlt, true: '#F46A1B' }} thumbColor="#FFFFFF" ios_backgroundColor={colors.surfaceAlt} />
    </View>
  );
}

function ActionRow({ icon, title, detail, colors, onPress, accent, danger }: { icon: keyof typeof MaterialIcons.glyphMap; title: string; detail: string; colors: ThemeColors; onPress: () => void; accent?: boolean; danger?: boolean }) {
  const color = danger ? '#E85D5D' : accent ? colors.accent : colors.text;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${title}. ${detail}`} onPress={onPress} style={[styles.row, { borderBottomColor: colors.border }]}>
      <MaterialIcons name={icon} size={21} color={color} style={styles.rowIcon} />
      <View style={styles.rowCopy}>
        <Text style={[styles.rowTitle, { color }]}>{title}</Text>
        <Text style={[styles.rowDetail, { color: colors.textMuted }]}>{detail}</Text>
      </View>
      <MaterialIcons name="arrow-forward" size={19} color={colors.textSubtle} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 58, paddingBottom: 176 },
  back: { width: 42, height: 42, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 24, marginBottom: 34 },
  kicker: { fontFamily: pluggdFonts.satoshiBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.8, marginBottom: 9 },
  title: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 35, lineHeight: 39, letterSpacing: -0.6, maxWidth: 350 },
  titleAccent: { color: '#F46A1B', fontFamily: pluggdFonts.displayBold },
  intro: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, marginTop: 10, maxWidth: 350 },
  section: { marginBottom: 30 },
  sectionTitle: { fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1.7, marginBottom: 10 },
  ledger: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { minHeight: 74, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 11, paddingHorizontal: 2 },
  rowIcon: { width: 32, textAlign: 'center' },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { fontFamily: pluggdFonts.satoshiBold, fontSize: 15, lineHeight: 19 },
  rowDetail: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  legal: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, lineHeight: 16, paddingBottom: 10 },
});
