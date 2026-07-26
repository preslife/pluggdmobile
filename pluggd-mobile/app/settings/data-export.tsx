import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { pluggdFonts } from '../../src/design/typography';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

const DATA_ITEMS = [
  { id: 'profile', label: 'Profile & account', detail: 'Identity, preferences and account history', icon: 'person-outline' },
  { id: 'purchases', label: 'Purchases & support', detail: 'Receipts, tickets, memberships and wallet activity', icon: 'receipt-long' },
  { id: 'messages', label: 'Messages & community', detail: 'Messages, comments and social interactions', icon: 'chat-bubble-outline' },
  { id: 'media', label: 'Posts & media', detail: 'Uploads, posts, playlists and saved items', icon: 'library-music' },
] as const;

export default function DataExportScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();

  const requestExport = () => {
    Alert.alert('Identity verification required', 'Secure in-app export requests are being finalised. For now, request your archive through PLUGGD support or web account settings.');
  };

  return (
    <View style={[styles.screen, { backgroundColor: theme.colors.background }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={[styles.back, { borderColor: theme.colors.border }]}>
          <MaterialIcons name="arrow-back-ios-new" size={18} color={theme.colors.text} />
        </Pressable>

        <View style={styles.hero}>
          <View style={[styles.signal, { borderColor: theme.colors.border }]}>
            <MaterialIcons name="archive" size={32} color={theme.colors.accent} />
            <Text style={[styles.signalText, { color: theme.colors.textSubtle }]}>SECURE ARCHIVE</Text>
          </View>
          <Text style={[styles.kicker, { color: theme.colors.accent }]}>DATA EXPORT</Text>
          <Text style={[styles.title, { color: theme.colors.text }]}>Take your PLUGGD history<Text style={styles.titleAccent}> with you.</Text></Text>
          <Text style={[styles.intro, { color: theme.colors.textMuted }]}>Request a portable copy of the personal data connected to your account. We verify every request before preparing the archive.</Text>
        </View>

        <Text style={[styles.sectionTitle, { color: theme.colors.textSubtle }]}>WHAT YOUR ARCHIVE INCLUDES</Text>
        <View style={[styles.ledger, { borderTopColor: theme.colors.border }]}>
          {DATA_ITEMS.map((item, index) => (
            <View key={item.id} style={[styles.row, { borderBottomColor: theme.colors.border }]}>
              <Text style={[styles.number, { color: theme.colors.textSubtle }]}>{String(index + 1).padStart(2, '0')}</Text>
              <MaterialIcons name={item.icon} size={20} color={theme.colors.accent} />
              <View style={styles.rowCopy}>
                <Text style={[styles.rowTitle, { color: theme.colors.text }]}>{item.label}</Text>
                <Text style={[styles.rowDetail, { color: theme.colors.textMuted }]}>{item.detail}</Text>
              </View>
            </View>
          ))}
        </View>

        <View style={[styles.note, { borderColor: theme.colors.border }]}>
          <MaterialIcons name="verified-user" size={20} color={theme.colors.accent} />
          <Text style={[styles.noteText, { color: theme.colors.textMuted }]}>The download link is sent only to your verified account email and expires for your protection.</Text>
        </View>

        <Pressable accessibilityRole="button" onPress={requestExport} style={styles.primary}>
          <Text style={styles.primaryText}>REQUEST MY ARCHIVE</Text>
          <MaterialIcons name="arrow-forward" size={19} color="#120B06" />
        </Pressable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  content: { paddingHorizontal: 16, paddingTop: 58, paddingBottom: 176 },
  back: { width: 42, height: 42, borderRadius: 5, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  hero: { marginTop: 24, marginBottom: 34 },
  signal: { width: 112, height: 112, borderWidth: 1, borderRadius: 5, justifyContent: 'center', alignItems: 'center', gap: 9, marginBottom: 24 },
  signalText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 8, letterSpacing: 1.4 },
  kicker: { fontFamily: pluggdFonts.satoshiBold, fontSize: 11, lineHeight: 14, letterSpacing: 1.8, marginBottom: 9 },
  title: { fontFamily: pluggdFonts.displayExtraBold, fontSize: 34, lineHeight: 38, letterSpacing: -0.6, maxWidth: 355 },
  titleAccent: { color: '#F46A1B', fontFamily: pluggdFonts.displayBold },
  intro: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 21, marginTop: 11, maxWidth: 350 },
  sectionTitle: { fontFamily: pluggdFonts.satoshiBold, fontSize: 10, letterSpacing: 1.7, marginBottom: 10 },
  ledger: { borderTopWidth: StyleSheet.hairlineWidth },
  row: { minHeight: 76, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 10, paddingHorizontal: 2 },
  number: { width: 22, fontFamily: pluggdFonts.satoshiBold, fontSize: 10 },
  rowCopy: { flex: 1, gap: 3 },
  rowTitle: { fontFamily: pluggdFonts.satoshiBold, fontSize: 14, lineHeight: 18 },
  rowDetail: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 16 },
  note: { marginTop: 24, borderWidth: 1, borderRadius: 5, padding: 14, flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  noteText: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 18 },
  primary: { minHeight: 52, marginTop: 16, borderRadius: 5, backgroundColor: '#F46A1B', paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  primaryText: { color: '#120B06', fontFamily: pluggdFonts.satoshiBlack, fontSize: 12, letterSpacing: 0.8 },
});
