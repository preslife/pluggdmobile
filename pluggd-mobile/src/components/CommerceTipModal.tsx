import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { ActivityIndicator, Alert, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { ed, edFonts } from '../design/editorial';
import { useWallet } from '../hooks/useWallet';

const TIP_AMOUNTS = [10, 25, 50, 100, 250, 500];

export default function TipModal({
  visible,
  onClose,
  artistName,
  artistId,
}: {
  visible: boolean;
  onClose: () => void;
  artistName: string;
  artistId: string;
}) {
  const { balance, spendCredits } = useWallet();
  const router = useRouter();
  const [selected, setSelected] = useState(25);
  const [sending, setSending] = useState(false);

  async function send() {
    if (balance.available_credits < selected) {
      Alert.alert('More credits needed', `You need ${selected} credits and have ${balance.available_credits}.`, [
        { text: 'Not now', style: 'cancel' },
        { text: 'Open Wallet', onPress: () => { onClose(); router.push('/wallet'); } },
      ]);
      return;
    }
    setSending(true);
    const result = await spendCredits(selected, 'spend_tip', 'artist', artistId, artistId);
    setSending(false);
    if (!result.success) {
      Alert.alert('Tip not sent', result.error || 'Please try again.');
      return;
    }
    Alert.alert('Support sent', `${artistName} received ${selected} credits.`);
    onClose();
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.scrim}>
        <View style={styles.sheet}>
          <View style={styles.handle} />
          <Text style={styles.kicker}>DIRECT SUPPORT</Text>
          <Text accessibilityRole="header" style={styles.title}>Tip {artistName}</Text>
          <Text style={styles.body}>Credits go directly into this creator-support moment. They are never used for beat licences, tickets, merchandise or memberships.</Text>
          <View accessibilityRole="radiogroup" style={styles.amountGrid}>
            {TIP_AMOUNTS.map((amount) => {
              const active = selected === amount;
              return (
                <Pressable
                  key={amount}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: active }}
                  accessibilityLabel={`${amount} credits`}
                  onPress={() => setSelected(amount)}
                  style={[styles.amount, active && styles.amountActive]}
                >
                  <Text style={[styles.amountValue, active && styles.amountValueActive]}>{amount}</Text>
                  <Text style={[styles.amountLabel, active && styles.amountValueActive]}>CREDITS</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.balance}>
            <Text style={styles.balanceLabel}>YOUR BALANCE</Text>
            <Text style={styles.balanceValue}>{balance.available_credits.toLocaleString()} credits</Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel={`Send ${selected} credits to ${artistName}`} accessibilityState={{ busy: sending }} disabled={sending} onPress={send} style={styles.primary}>
            {sending ? <ActivityIndicator color={ed.onOrange} /> : <>
              <Text style={styles.primaryText}>Send {selected} credits</Text>
              <MaterialIcons name="arrow-forward" size={19} color={ed.onOrange} />
            </>}
          </Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Close tip sheet" onPress={onClose} style={styles.cancel}>
            <Text style={styles.cancelText}>Not now</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  scrim: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.72)' },
  sheet: { backgroundColor: '#120D0A', borderTopWidth: 1, borderColor: 'rgba(255,102,0,0.4)', paddingHorizontal: 20, paddingTop: 12, paddingBottom: 34 },
  handle: { width: 42, height: 4, borderRadius: 2, backgroundColor: 'rgba(255,248,237,0.24)', alignSelf: 'center', marginBottom: 22 },
  kicker: { color: ed.orange, fontFamily: edFonts.bodyBlack, fontSize: 10, letterSpacing: 1.7 },
  title: { color: ed.cream, fontFamily: edFonts.displayExtraBold, fontSize: 30, lineHeight: 35, letterSpacing: -1, marginTop: 6 },
  body: { color: 'rgba(255,248,237,0.58)', fontFamily: edFonts.bodyMedium, fontSize: 13, lineHeight: 19, marginTop: 8 },
  amountGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 18 },
  amount: { width: '31.8%', minHeight: 58, borderWidth: 1, borderColor: 'rgba(255,248,237,0.15)', alignItems: 'center', justifyContent: 'center' },
  amountActive: { backgroundColor: ed.orange, borderColor: ed.orange },
  amountValue: { color: ed.cream, fontFamily: edFonts.displayBold, fontSize: 17 },
  amountLabel: { color: 'rgba(255,248,237,0.45)', fontFamily: edFonts.bodyBlack, fontSize: 8, letterSpacing: 1, marginTop: 2 },
  amountValueActive: { color: ed.onOrange },
  balance: { minHeight: 58, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderTopWidth: 1, borderBottomWidth: 1, borderColor: 'rgba(255,248,237,0.13)', marginTop: 18 },
  balanceLabel: { color: 'rgba(255,248,237,0.48)', fontFamily: edFonts.bodyBlack, fontSize: 9, letterSpacing: 1.3 },
  balanceValue: { color: ed.cream, fontFamily: edFonts.bodyBold, fontSize: 13 },
  primary: { minHeight: 54, backgroundColor: ed.orange, borderRadius: 5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, marginTop: 16 },
  primaryText: { color: ed.onOrange, fontFamily: edFonts.bodyBlack, fontSize: 14 },
  cancel: { minHeight: 48, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  cancelText: { color: 'rgba(255,248,237,0.62)', fontFamily: edFonts.bodyBold, fontSize: 13 },
});
