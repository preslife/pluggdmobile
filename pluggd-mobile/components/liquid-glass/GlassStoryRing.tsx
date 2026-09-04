import { Pressable, StyleSheet, Text, View } from 'react-native';
import { selectionHaptic } from '../../src/design/haptics';
import { liquidGlassColors, type LiquidGlassTone } from '../../src/design/liquidGlassTokens';
import { GlassAvatar } from './GlassAvatar';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';

type GlassStoryRingProps = {
  name: string;
  imageUrl?: string | null;
  tone?: LiquidGlassTone;
  viewed?: boolean;
  onPress?: () => void;
};

export function GlassStoryRing({ name, imageUrl, tone = 'accent', viewed, onPress }: GlassStoryRingProps) {
  const theme = usePluggdTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open stories from ${name}`}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [styles.wrap, pressed && styles.pressed]}
    >
      <View style={[styles.ring, { borderColor: theme.colors.accentFill, backgroundColor: theme.scheme === 'light' ? 'rgba(232,79,0,0.09)' : 'rgba(255,102,0,0.12)' }, viewed && styles.viewed, viewed && { borderColor: theme.colors.border, backgroundColor: theme.colors.surface }]}>
        <GlassAvatar imageUrl={imageUrl} name={name} tone={tone} size="lg" />
      </View>
      <Text style={[styles.label, { color: theme.colors.textSecondary }]} numberOfLines={1}>{name}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: 84,
    alignItems: 'center',
    gap: 7,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.985 }],
  },
  ring: {
    borderRadius: 999,
    padding: 2,
    borderWidth: 1,
    borderColor: liquidGlassColors.accent,
    backgroundColor: 'rgba(255,102,0,0.12)',
  },
  viewed: {
    borderColor: liquidGlassColors.borderSoft,
    backgroundColor: 'rgba(255,255,255,0.04)',
  },
  label: {
    maxWidth: '100%',
    color: liquidGlassColors.textSecondary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
  },
});
