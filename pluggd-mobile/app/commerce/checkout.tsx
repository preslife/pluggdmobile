import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pluggdFonts } from '../../src/design/typography';

const ORANGE = '#FF6600';

export default function CheckoutUnavailable() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Go back" onPress={() => router.back()} style={styles.back}><MaterialIcons name="arrow-back" size={21} color="#FFF" /></Pressable>
        <Text style={styles.headerLabel}>PURCHASE ROUTE</Text>
      </View>
      <View style={styles.content}>
        <View style={styles.mark}><MaterialIcons name="account-balance-wallet" size={31} color="#0A0806" /></View>
        <Text style={styles.kicker}>PLUGGD CREDITS</Text>
        <Text style={styles.title}>Support starts from the music.</Text>
        <Text style={styles.body}>PLUGGD does not run a detached mobile checkout. Add credits in Wallet, then unlock eligible work directly on its release or creator page.</Text>
        <View style={styles.ledger}>
          <RouteRow index="01" title="Add credits" body="Your balance and Apple billing status stay visible in Wallet." />
          <RouteRow index="02" title="Choose the work" body="Return to a release, beat, pack or creator offer." />
          <RouteRow index="03" title="Confirm in context" body="Price, access and creator destination remain visible before unlock." last />
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/wallet')} style={styles.primary}><Text style={styles.primaryText}>Open Wallet</Text><MaterialIcons name="arrow-forward" size={19} color="#0A0806" /></Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/marketplace')} style={styles.secondary}><Text style={styles.secondaryText}>Return to Market</Text></Pressable>
      </View>
    </SafeAreaView>
  );
}

function RouteRow({ index, title, body, last = false }: { index: string; title: string; body: string; last?: boolean }) {
  return <View style={[styles.row, last && styles.last]}><Text style={styles.index}>{index}</Text><View style={styles.copy}><Text style={styles.rowTitle}>{title}</Text><Text style={styles.rowBody}>{body}</Text></View></View>;
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0806' },
  header: { height: 64, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', gap: 14 },
  back: { width: 44, height: 44, borderRadius: 5, borderWidth: 1, borderColor: '#37302B', alignItems: 'center', justifyContent: 'center' },
  headerLabel: { color: '#8D8681', fontSize: 10.5, letterSpacing: 1.5, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 22 },
  mark: { width: 58, height: 58, borderRadius: 5, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginBottom: 23 },
  kicker: { color: ORANGE, fontSize: 11, letterSpacing: 1.8, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  title: { color: '#FFF', fontSize: 36, lineHeight: 40, letterSpacing: -1.3, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', maxWidth: 350, marginTop: 8 },
  body: { color: '#A39C97', fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 13, marginBottom: 23 },
  ledger: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#302A26' },
  row: { minHeight: 75, flexDirection: 'row', gap: 14, alignItems: 'center', borderBottomWidth: 1, borderBottomColor: '#302A26', paddingVertical: 11 },
  last: { borderBottomWidth: 0 },
  index: { width: 28, color: ORANGE, fontSize: 11, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  copy: { flex: 1 },
  rowTitle: { color: '#FFF', fontSize: 14, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  rowBody: { color: '#8E8782', fontSize: 12, lineHeight: 17, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 3 },
  primary: { minHeight: 52, borderRadius: 5, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 18 },
  primaryText: { color: '#0A0806', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  secondary: { minHeight: 50, borderRadius: 5, borderWidth: 1, borderColor: '#39322D', alignItems: 'center', justifyContent: 'center', marginTop: 10 },
  secondaryText: { color: '#FFF', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
});
