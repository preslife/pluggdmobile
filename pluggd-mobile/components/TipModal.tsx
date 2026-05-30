import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useState } from 'react';
import { useRouter } from 'expo-router';
import { useWallet } from '../src/hooks/useWallet';

const TIP_AMOUNTS = [10, 25, 50, 100, 250, 500];

interface TipModalProps {
  visible: boolean;
  onClose: () => void;
  artistName: string;
  artistId: string;
}

export default function TipModal({
  visible,
  onClose,
  artistName,
  artistId,
}: TipModalProps) {
  const { balance, spendCredits } = useWallet();
  const router = useRouter();
  const [selected, setSelected] = useState(25);
  const [sending, setSending] = useState(false);

  async function handleSendTip() {
    if (balance.available_credits < selected) {
      Alert.alert(
        'Insufficient Credits',
        `You need ${selected} credits but have ${balance.available_credits}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Buy Credits',
            onPress: () => {
              onClose();
              router.push('/wallet');
            },
          },
        ],
      );
      return;
    }

    setSending(true);
    const result = await spendCredits(
      selected,
      'spend_tip',
      'artist',
      artistId,
      artistId,
    );
    setSending(false);

    if (result.success) {
      Alert.alert('Tip Sent!', `You tipped ${artistName} ${selected} credits.`);
      onClose();
    } else {
      Alert.alert('Error', result.error || 'Failed to send tip.');
    }
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 justify-end bg-black/60">
        <View className="bg-[#1A1A2E] rounded-t-3xl px-6 pt-6 pb-10">
          {/* Handle bar */}
          <View className="w-10 h-1 bg-white/20 rounded-full self-center mb-5" />

          <Text className="text-white text-xl font-bold text-center">
            Tip {artistName}
          </Text>
          <Text className="text-white/50 text-sm text-center mt-1 mb-5">
            Show your support with credits
          </Text>

          {/* Amount grid */}
          <View className="flex-row flex-wrap gap-3 mb-5">
            {TIP_AMOUNTS.map((amount) => (
              <TouchableOpacity
                key={amount}
                onPress={() => setSelected(amount)}
                className={`flex-1 min-w-[30%] py-3 rounded-xl items-center border ${
                  selected === amount
                    ? 'bg-[#FF5A00] border-[#FF5A00]'
                    : 'bg-white/5 border-white/10'
                }`}
              >
                <Text
                  className={`text-lg font-bold ${
                    selected === amount ? 'text-white' : 'text-white/70'
                  }`}
                >
                  {amount}
                </Text>
                <Text
                  className={`text-xs ${
                    selected === amount ? 'text-white/80' : 'text-white/40'
                  }`}
                >
                  credits
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Balance */}
          <View className="flex-row justify-between items-center mb-4 px-1">
            <Text className="text-white/50 text-sm">Your balance</Text>
            <Text className="text-white font-bold">
              {balance.available_credits.toLocaleString()} credits
            </Text>
          </View>

          {/* Send button */}
          <TouchableOpacity
            onPress={handleSendTip}
            disabled={sending}
            className="bg-[#FF5A00] rounded-xl py-4 items-center"
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">
                Send {selected} Credits
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity onPress={onClose} className="mt-3 py-2">
            <Text className="text-white/40 text-center">Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}
