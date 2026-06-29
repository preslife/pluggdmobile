import { MaterialIcons } from '@expo/vector-icons';
import { pluggdFonts } from '../../src/design/typography';
import { Stack, useRouter } from 'expo-router';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

export default function LegacyOrderRoute() {
  const router = useRouter();
  const theme = usePluggdTheme();

  return (
    <SafeAreaView style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.content}>
        <View style={[styles.symbol, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
          <MaterialIcons name="receipt-long" size={32} color={theme.colors.accent} />
        </View>

        <Text style={[styles.title, { color: theme.colors.text }]}>Order status</Text>
        <Text style={[styles.body, { color: theme.colors.textMuted }]}>
          Open Wallet to review credits, purchases, and recent activity.
        </Text>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/wallet')}
          style={[styles.primaryButton, { backgroundColor: theme.colors.accent }]}
        >
          <Text style={styles.primaryText}>Open Wallet</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
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
    fontSize: 25,
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
});
