import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAccountMenuIdentity } from '../components/AccountMenuButton';
import { usePluggdTheme } from '../src/design/usePluggdTheme';

export default function CreatorModeRoute() {
  const account = useAccountMenuIdentity();
  const theme = usePluggdTheme();

  if (!account.signedIn) return <Redirect href="/auth/login" />;
  if (account.ready) return <Redirect href={account.creatorAccess ? '/studio' : '/auth/role'} />;

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator color={theme.colors.accentText} />
      <Text style={[styles.copy, { color: theme.colors.textMuted }]}>Checking creator access…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#050403' },
  copy: { color: 'rgba(255,255,255,0.68)', fontFamily: 'Satoshi-Medium', fontSize: 14 },
});
