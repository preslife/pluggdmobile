import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useAccountMenuIdentity } from '../../components/AccountMenuButton';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

const SETTINGS = [
  {
    title: 'YOUR PLUGGD',
    items: [
      { id: 'profile', label: 'Public profile', detail: 'Identity, bio and links', route: '/profile', icon: 'person' },
      { id: 'wallet', label: 'Wallet', detail: 'Balance, support and payouts', route: '/wallet', icon: 'account-balance-wallet' },
      { id: 'purchases', label: 'Purchases', detail: 'Music, beats and receipts', route: '/purchases', icon: 'inventory-2' },
      { id: 'memberships', label: 'Memberships', detail: 'Creators you support', route: '/membership', icon: 'card-membership' },
      { id: 'tickets', label: 'Tickets', detail: 'Your upcoming events', route: '/tickets', icon: 'confirmation-number' },
    ],
  },
  {
    title: 'CONTROL',
    items: [
      { id: 'notifications', label: 'Notifications', detail: 'Choose what reaches you', route: '/notifications', icon: 'notifications' },
      { id: 'privacy', label: 'Privacy & safety', detail: 'Visibility, blocks and data', route: '/settings/privacy', icon: 'lock' },
      { id: 'data-export', label: 'Data export', detail: 'Request your PLUGGD archive', route: '/settings/data-export', icon: 'download' },
    ],
  },
] as const;

export default function SettingsIndex() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const account = useAccountMenuIdentity();
  const settingsSections = [
    ...SETTINGS,
    {
      title: 'CREATOR & SUPPORT',
      items: [
        account.creatorAccess
          ? { id: 'creator-tools', label: 'Creator Studio', detail: 'Open your creator workspace', route: '/studio', icon: 'space-dashboard' as const }
          : { id: 'creator-tools', label: 'Become a creator', detail: 'Add a creator role when you are ready', route: '/auth/role', icon: 'auto-awesome' as const },
        { id: 'restore-purchases', label: 'Restore purchases', detail: 'Recover eligible store access', route: '/wallet', icon: 'restore' as const },
      ],
    },
  ] as const;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.backButton, { borderColor: theme.colors.border }]}
          >
            <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
          </Pressable>
          <View>
            <Text style={[styles.eyebrow, { color: theme.colors.accent }]}>ACCOUNT CONTROL</Text>
            <Text style={[styles.title, { color: theme.colors.text }]}>Everything yours,<Text style={styles.titleAccent}> in one place.</Text></Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Manage your identity, purchases, privacy and creator access.</Text>
          </View>
        </View>

        {settingsSections.map((section) => (
          <View key={section.title} style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textSubtle }]}>{section.title}</Text>
            <View style={[styles.list, { borderTopColor: theme.colors.border }]}>
              {section.items.map((item) => (
                <Pressable
                  key={item.id}
                  accessibilityRole="button"
                  accessibilityLabel={`${item.label}. ${item.detail}`}
                  onPress={() => router.push(item.route as any)}
                  style={[styles.row, { borderBottomColor: theme.colors.border }]}
                >
                  <View style={styles.icon}>
                    <MaterialIcons name={item.icon} size={21} color={theme.colors.accent} />
                  </View>
                  <View style={styles.rowCopy}>
                    <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{item.label}</Text>
                    <Text style={[styles.rowDetail, { color: theme.colors.textMuted }]}>{item.detail}</Text>
                  </View>
                  <MaterialIcons name="arrow-forward" size={19} color={theme.colors.textSubtle} />
                </Pressable>
              ))}
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 16,
    paddingTop: 58,
    paddingBottom: 176,
  },
  header: {
    gap: 24,
    marginBottom: 32,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 5,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  eyebrow: {
    marginBottom: 9,
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.8,
    fontFamily: pluggdFonts.satoshiBold,
  },
  title: {
    maxWidth: 340,
    fontSize: 35,
    lineHeight: 39,
    fontFamily: pluggdFonts.displayExtraBold,
  },
  titleAccent: {
    color: '#F46A1B',
    fontFamily: pluggdFonts.displayBold,
  },
  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  sectionTitle: {
    marginBottom: 10,
    fontSize: 10,
    letterSpacing: 1.7,
    fontFamily: pluggdFonts.satoshiBold,
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  row: {
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 34,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowCopy: {
    flex: 1,
    gap: 2,
  },
  rowLabel: {
    fontSize: 15,
    fontFamily: pluggdFonts.satoshiBold,
  },
  rowDetail: {
    fontSize: 12,
    lineHeight: 16,
    fontFamily: pluggdFonts.satoshiMedium,
  },
});
