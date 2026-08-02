import { Redirect, Stack } from 'expo-router';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { useAccountMenuIdentity } from '../components/AccountMenuButton';

export default function CreatorModeRoute() {
  const account = useAccountMenuIdentity();

  if (!account.signedIn) return <Redirect href="/auth/login" />;
  if (account.ready) return <Redirect href={account.creatorAccess ? '/studio' : '/auth/role'} />;

  return (
    <View style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <ActivityIndicator color="#ff6600" />
      <Text style={styles.copy}>Checking creator access…</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12, backgroundColor: '#050403' },
  copy: { color: 'rgba(255,255,255,0.68)', fontFamily: 'Satoshi-Medium', fontSize: 14 },
});
