import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

export default function CheckoutUnavailable() {
  const router = useRouter();
  const theme = usePluggdTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Go back"
          onPress={() => router.back()}
          style={[styles.iconButton, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
        >
          <MaterialIcons name="arrow-back-ios-new" size={19} color={theme.colors.text} />
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={[styles.symbol, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <MaterialIcons name="account-balance-wallet" size={34} color={theme.colors.accent} />
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>Use credits in app</Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>
          Add credits in Wallet, then unlock eligible releases and creator content from their detail pages.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/wallet')}
          style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}
        >
          <Text style={styles.primaryText}>Open Wallet</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/marketplace')}
          style={[styles.secondaryButton, { borderColor: theme.colors.border }]}
        >
          <Text style={[styles.secondaryText, { color: theme.colors.text }]}>Back to Market</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  header: {
    paddingHorizontal: 16,
    paddingTop: 10,
  },
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingBottom: 80,
  },
  symbol: {
    width: 72,
    height: 72,
    borderRadius: 18,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
  },
  title: {
    fontSize: 26,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
    textAlign: 'center',
  },
  body: {
    marginTop: 12,
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    maxWidth: 330,
  },
  primaryButton: {
    width: '100%',
    maxWidth: 330,
    minHeight: 52,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  primaryText: {
    color: '#080808',
    fontSize: 16,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
  secondaryButton: {
    width: '100%',
    maxWidth: 330,
    minHeight: 50,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  secondaryText: {
    fontSize: 15,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
});
