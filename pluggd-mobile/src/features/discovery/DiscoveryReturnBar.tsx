import { MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { selectionHaptic } from '../../design/haptics';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';

type DiscoveryReturnBarProps = {
  tone?: 'auto' | 'dark' | 'paper';
  compact?: boolean;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function DiscoveryReturnBar({ tone = 'auto', compact = false, showLabel = true, style }: DiscoveryReturnBarProps) {
  const router = useRouter();
  const theme = usePluggdTheme();
  const paper = tone === 'paper';
  const dark = tone === 'dark';
  const foreground = paper ? '#2A1B12' : dark ? '#FFF8EE' : theme.colors.text;
  const muted = paper ? 'rgba(42,27,18,0.5)' : dark ? 'rgba(255,248,238,0.45)' : theme.colors.divider;

  return (
    <View style={[styles.wrap, compact && styles.compactWrap, tone === 'auto' && { backgroundColor: theme.colors.background }, style]}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back to Discovery"
        onPress={() => {
          selectionHaptic();
          router.replace('/discover' as any);
        }}
        style={({ pressed }) => [styles.action, compact && styles.compactAction, pressed && styles.pressed]}
      >
        <MaterialIcons name="arrow-back" size={18} color={foreground} />
        {showLabel ? <Text style={[styles.label, { color: foreground }]}>BACK TO DISCOVERY</Text> : null}
      </Pressable>
      <View style={[styles.rule, { backgroundColor: muted }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 52,
    paddingHorizontal: 20,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  compactWrap: { minHeight: 36, paddingVertical: 0 },
  action: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  compactAction: { minHeight: 36 },
  pressed: { opacity: 0.66, transform: [{ translateX: -2 }] },
  label: {
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9.5,
    lineHeight: 13,
    letterSpacing: 1.45,
  },
  rule: { flex: 1, height: StyleSheet.hairlineWidth },
});
