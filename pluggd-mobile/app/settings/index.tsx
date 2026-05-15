import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

const SETTINGS = [
  { label: 'Profile', route: '/profile', icon: 'person' },
  { label: 'Wallet', route: '/wallet', icon: 'account-balance-wallet' },
  { label: 'Notifications', route: '/notifications', icon: 'notifications' },
  { label: 'Privacy', route: '/settings/privacy', icon: 'lock' },
  { label: 'Data export', route: '/settings/data-export', icon: 'download' },
  { label: 'Creator tools', route: '/creator-mode', icon: 'space-dashboard' },
] as const;

export default function SettingsIndex() {
  const router = useRouter();
  const theme = usePluggdTheme();

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <LinearGradient
        colors={theme.scheme === 'dark' ? ['#080808', '#0C0C0C', '#080808'] : ['#FAFAF8', '#FFFFFF', '#F4F2EE']}
        style={StyleSheet.absoluteFill}
      />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Go back"
            onPress={() => router.back()}
            style={[styles.backButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          >
            <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
          </Pressable>
          <View>
            <Text style={[styles.title, { color: theme.colors.text }]}>Settings</Text>
            <Text style={[styles.subtitle, { color: theme.colors.textMuted }]}>Account, privacy, wallet, and creator controls.</Text>
          </View>
        </View>

        <View style={styles.list}>
          {SETTINGS.map((item) => (
            <Pressable
              key={item.route}
              accessibilityRole="button"
              onPress={() => router.push(item.route as any)}
              style={[styles.row, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            >
              <View style={[styles.icon, { backgroundColor: theme.colors.surfaceAlt }]}>
                <MaterialIcons name={item.icon} size={21} color={theme.colors.accent} />
              </View>
              <Text style={[styles.rowLabel, { color: theme.colors.text }]}>{item.label}</Text>
              <MaterialIcons name="chevron-right" size={23} color={theme.colors.textSubtle} />
            </Pressable>
          ))}
        </View>
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
    paddingTop: 74,
    paddingBottom: 176,
  },
  header: {
    gap: 18,
    marginBottom: 20,
  },
  backButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
  },
  subtitle: {
    marginTop: 7,
    fontSize: 14,
    lineHeight: 21,
    fontWeight: '600',
  },
  list: {
    gap: 10,
  },
  row: {
    minHeight: 62,
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  icon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  rowLabel: {
    flex: 1,
    fontSize: 16,
    fontWeight: '800',
  },
});
