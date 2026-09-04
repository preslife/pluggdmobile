import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { pluggdFonts } from '../../src/design/typography';
import { useBottomChromeInset } from '../../src/design/useBottomChromeInset';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { listBlockedAccounts, unblockUser, type BlockedAccount } from '../../src/features/safety/accountSafety';

export default function BlockedAccountsScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const bottomInset = useBottomChromeInset();
  const [accounts, setAccounts] = useState<BlockedAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listBlockedAccounts()
      .then(setAccounts)
      .catch(() => Alert.alert('Could not load blocked accounts', 'Check your connection and try again.'))
      .finally(() => setLoading(false));
  }, []);
  useEffect(load, [load]);

  const confirmUnblock = (account: BlockedAccount) => {
    Alert.alert(`Unblock ${account.name}?`, 'They may be able to find your profile and interact with your public content again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Unblock',
        onPress: async () => {
          setBusyId(account.userId);
          try {
            await unblockUser(account.userId);
            setAccounts((current) => current.filter((item) => item.userId !== account.userId));
          } catch {
            Alert.alert('Could not unblock account', 'Please try again.');
          } finally {
            setBusyId(null);
          }
        },
      },
    ]);
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={[styles.content, { paddingBottom: bottomInset }]}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => (router.canGoBack() ? router.back() : router.replace('/settings/privacy' as any))} style={[styles.back, { borderColor: theme.colors.border }]}>
          <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
        </Pressable>
        <View style={styles.hero}>
          <Text style={[styles.kicker, { color: theme.colors.accent }]}>COMMUNITY CONTROL</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>Blocked<Text style={styles.accent}> accounts.</Text></Text>
          <Text style={[styles.intro, { color: theme.colors.textMuted }]}>Blocked accounts cannot follow, message or surface their posts to you.</Text>
        </View>
        {loading ? <ActivityIndicator color={theme.colors.accent} /> : accounts.length ? (
          <View style={[styles.list, { borderTopColor: theme.colors.border }]}>
            {accounts.map((account) => (
              <View key={account.blockId} style={[styles.row, { borderBottomColor: theme.colors.border }]}>
                {account.avatarUrl ? <Image source={{ uri: account.avatarUrl }} style={styles.avatar} /> : <View style={[styles.avatar, styles.fallback, { backgroundColor: theme.colors.surfaceAlt }]}><MaterialIcons name="person" size={22} color={theme.colors.textSubtle} /></View>}
                <View style={styles.copy}><Text style={[styles.name, { color: theme.colors.text }]}>{account.name}</Text>{account.username ? <Text style={[styles.handle, { color: theme.colors.textMuted }]}>@{account.username}</Text> : null}</View>
                <Pressable accessibilityRole="button" accessibilityLabel={`Unblock ${account.name}`} disabled={busyId === account.userId} onPress={() => confirmUnblock(account)} style={[styles.unblock, { borderColor: theme.colors.accent }]}>
                  <Text style={[styles.unblockText, { color: theme.colors.accent }]}>{busyId === account.userId ? 'WAIT' : 'UNBLOCK'}</Text>
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={[styles.empty, { borderColor: theme.colors.border }]}>
            <MaterialIcons name="verified-user" size={34} color={theme.colors.accent} />
            <Text style={[styles.emptyTitle, { color: theme.colors.text }]}>No blocked accounts</Text>
            <Text style={[styles.emptyBody, { color: theme.colors.textMuted }]}>When you block someone, you can review and unblock them here.</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 }, content: { paddingHorizontal: 16, paddingTop: 58, paddingBottom: 160 },
  back: { width: 44, height: 44, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 24, marginBottom: 30 }, kicker: { fontFamily: pluggdFonts.satoshiBold, fontSize: 11, letterSpacing: 1.8, marginBottom: 9 },
  title: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 35, lineHeight: 39 }, accent: { color: '#F46A1B' },
  intro: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, marginTop: 9 },
  list: { borderTopWidth: StyleSheet.hairlineWidth }, row: { minHeight: 76, flexDirection: 'row', alignItems: 'center', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth },
  avatar: { width: 46, height: 46, borderRadius: 23 }, fallback: { alignItems: 'center', justifyContent: 'center' }, copy: { flex: 1 },
  name: { fontFamily: pluggdFonts.satoshiBold, fontSize: 14 }, handle: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, marginTop: 2 },
  unblock: { minHeight: 44, borderWidth: 1, borderRadius: 5, paddingHorizontal: 12, alignItems: 'center', justifyContent: 'center' },
  unblockText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1 },
  empty: { minHeight: 230, borderWidth: 1, borderRadius: 6, padding: 28, alignItems: 'center', justifyContent: 'center', gap: 10 },
  emptyTitle: { fontFamily: pluggdFonts.displayBold, fontSize: 20 }, emptyBody: { maxWidth: 270, textAlign: 'center', fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19 },
});
