import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useAccountMenuIdentity } from '../../components/AccountMenuButton';
import { usePluggdTheme, usePluggdThemeMode, type PluggdThemeMode } from '../../src/design/usePluggdTheme';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';

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

const APPEARANCE_CHOICES: Array<{ id: PluggdThemeMode; label: string; detail: string; compactDetail: string; icon: keyof typeof MaterialIcons.glyphMap }> = [
  { id: 'system', label: 'System', detail: 'Follow your iPhone appearance', compactDetail: 'Follows iPhone', icon: 'brightness-auto' },
  { id: 'light', label: 'Editorial Light', detail: 'Cream paper, dark ink and orange highlights', compactDetail: 'Cream + ink', icon: 'light-mode' },
  { id: 'dark', label: 'Night', detail: 'The original PLUGGD dark canvas', compactDetail: 'Dark canvas', icon: 'dark-mode' },
];

export default function SettingsIndex() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const { mode, resolvedScheme, setMode } = usePluggdThemeMode();
  const account = useAccountMenuIdentity();
  const bottomInset = useBottomChromeInset();
  const { height: viewportHeight } = useWindowDimensions();
  const compactRows = viewportHeight < 760;
  const settingsSections = [
    ...SETTINGS,
    {
      title: 'HELP',
      items: [
        { id: 'support', label: 'Help & contact', detail: 'Email PLUGGD support or open the Help Centre', route: '/support', icon: 'support-agent' as const },
      ],
    },
    {
      title: 'CREATOR',
      items: [
        account.creatorAccess
          ? { id: 'creator-tools', label: 'Creator Studio', detail: 'Open your creator workspace', route: '/studio', icon: 'space-dashboard' as const }
          : { id: 'creator-tools', label: 'Become a creator', detail: 'Add a creator role when you are ready', route: '/auth/role', icon: 'auto-awesome' as const },
      ],
    },
  ] as const;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerTopRow}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() => (router.canGoBack() ? router.back() : router.replace('/my-pluggd' as any))}
              style={styles.backButton}
            >
              <View pointerEvents="none" style={[styles.backButtonVisual, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
                <MaterialIcons name="arrow-back-ios-new" size={17} color={theme.colors.text} />
              </View>
            </Pressable>
            <Text style={[styles.eyebrow, styles.headerTitle, { color: theme.colors.accent }]}>ACCOUNT CONTROL</Text>
            <View accessible={false} style={styles.headerSideSpacer} />
          </View>
          <Text style={[styles.subtitle, { color: theme.colors.textMuted }]} numberOfLines={1}>Manage your identity, purchases and privacy.</Text>
        </View>

        <View style={[styles.section, styles.appearanceSection]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textSubtle }]}>APPEARANCE</Text>
          <View accessibilityRole="radiogroup" accessibilityLabel="App appearance" style={styles.appearanceList}>
            {APPEARANCE_CHOICES.map((choice) => {
              const selected = mode === choice.id;
              const detail = choice.id === 'system' ? `${choice.detail} · currently ${resolvedScheme}` : choice.detail;
              const compactDetail = choice.id === 'system' ? `Currently ${resolvedScheme}` : choice.compactDetail;
              return (
                <View key={choice.id} style={styles.appearanceSlot}>
                  <Pressable
                    accessibilityRole="radio"
                    accessibilityLabel={choice.label}
                    accessibilityHint={detail}
                    accessibilityState={{ selected, checked: selected }}
                    onPress={() => setMode(choice.id)}
                    style={({ pressed }) => [
                      styles.appearanceChoice,
                      {
                        borderColor: selected ? theme.colors.borderAccent : theme.colors.border,
                        backgroundColor: selected ? theme.colors.accentSoft : theme.colors.surfaceAlt,
                      },
                      pressed && { backgroundColor: theme.colors.surfacePressed },
                    ]}
                  >
                    <View style={styles.appearanceCenteredItem}>
                      <View style={[styles.appearanceIcon, { backgroundColor: selected ? theme.colors.accentFill : theme.colors.surfaceAlt }]}>
                        <MaterialIcons name={choice.icon} size={20} color={selected ? theme.colors.onAccent : theme.colors.textSecondary} />
                      </View>
                    </View>
                    <Text adjustsFontSizeToFit minimumFontScale={0.85} style={[styles.appearanceLabel, { color: theme.colors.text }]} numberOfLines={1}>{choice.label}</Text>
                    <Text style={[styles.appearanceDetail, { color: theme.colors.textMuted }]} numberOfLines={1}>{compactDetail}</Text>
                    <View style={styles.appearanceCenteredItem}>
                      <View style={[styles.appearanceSelection, { borderColor: selected ? theme.colors.accent : theme.colors.borderStrong, backgroundColor: selected ? theme.colors.accentFill : 'transparent' }]}>
                        {selected ? <MaterialIcons name="check" size={12} color={theme.colors.onAccent} /> : null}
                      </View>
                    </View>
                  </Pressable>
                </View>
              );
            })}
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
                  style={[styles.row, compactRows && styles.rowCompact, { borderBottomColor: theme.colors.border }]}
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
    paddingTop: 38,
    paddingBottom: 176,
  },
  header: {
    gap: 8,
    marginBottom: 20,
  },
  headerTopRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  backButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backButtonVisual: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    flex: 1,
    textAlign: 'center',
  },
  headerSideSpacer: {
    width: 44,
    height: 44,
  },
  eyebrow: {
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1.6,
    fontFamily: pluggdFonts.satoshiBold,
  },
  subtitle: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 21,
    fontFamily: pluggdFonts.satoshiMedium, fontWeight: '600',
  },
  section: {
    marginBottom: 30,
  },
  appearanceSection: {
    marginBottom: 12,
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
  appearanceList: {
    width: '100%',
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'stretch',
    gap: 8,
  },
  appearanceSlot: {
    flex: 1,
    minWidth: 0,
  },
  appearanceChoice: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 90,
    borderWidth: 1,
    borderRadius: 16,
    paddingHorizontal: 6,
    paddingVertical: 6,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  appearanceCenteredItem: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearanceIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
  },
  appearanceLabel: {
    width: '100%',
    alignSelf: 'stretch',
    minHeight: 15,
    textAlign: 'center',
    fontSize: 12.5,
    lineHeight: 15,
    fontFamily: pluggdFonts.satoshiBold,
  },
  appearanceDetail: {
    width: '100%',
    alignSelf: 'stretch',
    textAlign: 'center',
    fontSize: 9,
    lineHeight: 12,
    fontFamily: pluggdFonts.satoshiMedium,
  },
  appearanceSelection: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    minHeight: 68,
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 2,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  rowCompact: {
    minHeight: 62,
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
