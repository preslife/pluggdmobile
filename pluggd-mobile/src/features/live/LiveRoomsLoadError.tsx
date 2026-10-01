import { MaterialIcons } from '@expo/vector-icons';
import { ActivityIndicator, Pressable, Text, View } from 'react-native';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';

export function LiveRoomsLoadError({ onRetry, retrying, hasRooms = false }: { onRetry: () => void; retrying: boolean; hasRooms?: boolean }) {
  const { colors } = usePluggdTheme();
  return <View accessibilityRole="alert" style={{ gap: 12, padding: 20, borderRadius: 18, backgroundColor: colors.surfaceAlt, marginVertical: 12 }}>
    <Text style={{ fontFamily: pluggdFonts.satoshiBold, color: colors.text, fontSize: 16 }}>{hasRooms ? 'Could not refresh Live rooms' : 'Live rooms could not be loaded'}</Text>
    <Text style={{ fontFamily: pluggdFonts.satoshiMedium, color: colors.textMuted, fontSize: 14, lineHeight: 20 }}>{hasRooms ? 'Your last loaded rooms are still here. Try again for the latest status.' : 'Check your connection and try again.'}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Retry loading Live rooms" accessibilityState={{ disabled: retrying }} disabled={retrying} onPress={onRetry}
      style={{ minHeight: 48, borderRadius: 24, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: colors.accentFill, opacity: retrying ? 0.6 : 1 }}>
      {retrying ? <ActivityIndicator color={colors.onAccent} /> : <MaterialIcons name="refresh" size={20} color={colors.onAccent} />}
      <Text style={{ fontFamily: pluggdFonts.satoshiBold, color: colors.onAccent, fontSize: 14 }}>{retrying ? 'Trying again…' : 'Try again'}</Text>
    </Pressable>
  </View>;
}
