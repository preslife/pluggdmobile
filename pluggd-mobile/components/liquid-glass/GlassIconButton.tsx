import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, type StyleProp, type ViewStyle } from 'react-native';
import { selectionHaptic } from '../../src/design/haptics';
import { liquidGlassColors, liquidGlassRadii } from '../../src/design/liquidGlassTokens';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';

type GlassIconButtonProps = {
  icon: keyof typeof MaterialIcons.glyphMap;
  accessibilityLabel: string;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
  size?: number;
  quiet?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GlassIconButton({
  icon,
  accessibilityLabel,
  active,
  disabled,
  onPress,
  size = 44,
  quiet,
  style,
}: GlassIconButtonProps) {
  const panel = (
    <GlassPanel
      intensity={active ? 'default' : 'subtle'}
      radius={liquidGlassRadii.pill}
      style={[styles.fill, quiet && styles.quietPanel]}
      contentStyle={styles.content}
    >
      <MaterialIcons
        name={icon}
        size={Math.max(16, Math.round(size * 0.45))}
        color={active ? liquidGlassColors.accent : liquidGlassColors.textSecondary}
      />
    </GlassPanel>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ selected: !!active, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [
        styles.pressable,
        { width: size, height: size, opacity: disabled ? 0.5 : pressed ? 0.82 : 1 },
        style,
      ]}
    >
      {quiet ? panel : <LiftSurface depth="low" style={styles.fill}>{panel}</LiftSurface>}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  quietPanel: {
    backgroundColor: 'rgba(255,255,255,0.02)',
  },
});
