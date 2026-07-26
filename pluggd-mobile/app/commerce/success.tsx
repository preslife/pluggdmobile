import { MaterialIcons } from '@expo/vector-icons';
import { Stack, useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { pluggdFonts } from '../../src/design/typography';

const ORANGE = '#FF6600';

export default function LegacyOrderRoute() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.screen}>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.header}><Text style={styles.headerLabel}>PURCHASE RECORD</Text></View>
      <View style={styles.content}>
        <View style={styles.mark}><MaterialIcons name="receipt-long" size={31} color="#0A0806" /></View>
        <Text style={styles.kicker}>SOURCE OF TRUTH</Text>
        <Text style={styles.title}>Every unlock has a clear record.</Text>
        <Text style={styles.body}>Wallet keeps your current credits, completed purchases and recent account activity together. An order is only shown when PLUGGD has a real transaction to report.</Text>
        <View style={styles.rule} />
        <View style={styles.fact}><Text style={styles.factLabel}>CREDITS</Text><Text style={styles.factValue}>Current balance</Text></View>
        <View style={styles.fact}><Text style={styles.factLabel}>PURCHASES</Text><Text style={styles.factValue}>Eligible unlocks</Text></View>
        <View style={styles.fact}><Text style={styles.factLabel}>ACTIVITY</Text><Text style={styles.factValue}>Recent ledger</Text></View>
        <Pressable accessibilityRole="button" onPress={() => router.replace('/wallet')} style={styles.primary}><Text style={styles.primaryText}>Open Wallet</Text><MaterialIcons name="arrow-forward" size={19} color="#0A0806" /></Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#0A0806' },
  header: { height: 64, paddingHorizontal: 24, justifyContent: 'center', borderBottomWidth: 1, borderBottomColor: '#24201D' },
  headerLabel: { color: '#8D8681', fontSize: 10.5, letterSpacing: 1.5, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  content: { flex: 1, paddingHorizontal: 24, paddingTop: 40 },
  mark: { width: 58, height: 58, borderRadius: 5, backgroundColor: ORANGE, alignItems: 'center', justifyContent: 'center', marginBottom: 24 },
  kicker: { color: ORANGE, fontSize: 11, letterSpacing: 1.8, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  title: { color: '#FFF', fontSize: 37, lineHeight: 41, letterSpacing: -1.4, fontFamily: pluggdFonts.displayExtraBold, fontWeight: '800', maxWidth: 350, marginTop: 8 },
  body: { color: '#A39C97', fontSize: 14, lineHeight: 21, fontFamily: pluggdFonts.satoshiBold, fontWeight: '700', marginTop: 14, maxWidth: 350 },
  rule: { height: 1, backgroundColor: '#302A26', marginTop: 30 },
  fact: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1, borderBottomColor: '#302A26' },
  factLabel: { color: '#817A75', fontSize: 10, letterSpacing: 1.3, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
  factValue: { color: '#FFF', fontSize: 13.5, fontFamily: pluggdFonts.displayBold, fontWeight: '700' },
  primary: { minHeight: 52, borderRadius: 5, backgroundColor: ORANGE, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, marginTop: 24 },
  primaryText: { color: '#0A0806', fontSize: 14, fontFamily: pluggdFonts.satoshiBlack, fontWeight: '900' },
});
