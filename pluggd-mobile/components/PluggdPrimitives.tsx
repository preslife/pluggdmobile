import { MaterialIcons } from '@expo/vector-icons';
import { BlurView } from 'expo-blur';
import {
  GlassView,
  isGlassEffectAPIAvailable,
  isLiquidGlassAvailable,
  type GlassColorScheme,
  type GlassStyle,
} from 'expo-glass-effect';
import { LinearGradient } from 'expo-linear-gradient';
import { ReactNode, useEffect, useState } from 'react';
import {
  AccessibilityInfo,
  Image,
  Platform,
  Pressable,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { PLUGGD_ORANGE, pluggdRadii } from '../src/design/tokens';
import { usePluggdTheme } from '../src/design/usePluggdTheme';

type GlassSurfaceProps = {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
  glassEffectStyle?: GlassStyle;
  colorScheme?: GlassColorScheme;
  tintColor?: string;
  fallbackColor?: string;
  borderColor?: string;
  blurIntensity?: number;
  interactive?: boolean;
  disabled?: boolean;
};

function useReduceTransparency() {
  const [reduceTransparency, setReduceTransparency] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'ios') return undefined;

    AccessibilityInfo.isReduceTransparencyEnabled()
      .then(setReduceTransparency)
      .catch(() => undefined);

    const subscription = AccessibilityInfo.addEventListener(
      'reduceTransparencyChanged',
      setReduceTransparency,
    );

    return () => subscription.remove();
  }, []);

  return reduceTransparency;
}

function canUseGlassEffect(reduceTransparency: boolean) {
  return (
    Platform.OS === 'ios' &&
    !reduceTransparency &&
    isLiquidGlassAvailable() &&
    isGlassEffectAPIAvailable()
  );
}

export function PluggdGlassSurface({
  children,
  style,
  glassEffectStyle = 'regular',
  colorScheme,
  tintColor,
  fallbackColor,
  borderColor,
  blurIntensity = 42,
  interactive = false,
  disabled = false,
}: GlassSurfaceProps) {
  const theme = usePluggdTheme();
  const reduceTransparency = useReduceTransparency();
  const resolvedScheme = colorScheme ?? theme.scheme;
  const blurTint = resolvedScheme === 'auto' ? theme.scheme : resolvedScheme;
  const resolvedFallback = fallbackColor ?? theme.colors.glassFallback;
  const resolvedBorder = borderColor ?? theme.colors.border;
  const resolvedTint = tintColor ?? theme.colors.glassTint;
  const baseStyle = [
    styles.glassBase,
    { backgroundColor: resolvedFallback, borderColor: resolvedBorder, opacity: disabled ? 0.58 : 1 },
    style,
  ];

  if (canUseGlassEffect(reduceTransparency)) {
    return (
      <GlassView
        glassEffectStyle={glassEffectStyle}
        colorScheme={resolvedScheme}
        tintColor={resolvedTint}
        isInteractive={interactive && !disabled}
        style={baseStyle}
      >
        {children}
      </GlassView>
    );
  }

  if (Platform.OS === 'ios' && !reduceTransparency) {
    return (
      <BlurView
        intensity={blurIntensity}
        tint={blurTint}
        style={[baseStyle, { backgroundColor: resolvedFallback }]}
      >
        {children}
      </BlurView>
    );
  }

  return <View style={[baseStyle, { backgroundColor: resolvedFallback }]}>{children}</View>;
}

export function PluggdSurface({
  children,
  style,
}: {
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  return (
    <View
      style={[
        styles.surface,
        {
          backgroundColor: theme.colors.surface,
          borderColor: theme.colors.border,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function PluggdButton({
  label,
  icon,
  variant = 'primary',
  disabled,
  onPress,
  style,
}: {
  label: string;
  icon?: keyof typeof MaterialIcons.glyphMap;
  variant?: ButtonVariant;
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  const isPrimary = variant === 'primary';
  const isDanger = variant === 'danger';

  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={() => {
        if (disabled) return;
        impactHaptic();
        onPress?.();
      }}
      style={[
        styles.button,
        {
          backgroundColor: isPrimary
            ? theme.colors.accent
            : isDanger
            ? 'rgba(255,92,92,0.1)'
            : theme.colors.surface,
          borderColor: isPrimary ? theme.colors.accent : theme.colors.border,
          opacity: disabled ? 0.55 : 1,
        },
        style,
      ]}
    >
      {icon ? (
        <MaterialIcons
          name={icon}
          size={18}
          color={isPrimary ? '#FFFFFF' : isDanger ? theme.colors.danger : theme.colors.accent}
        />
      ) : null}
      <Text
        style={[
          styles.buttonText,
          { color: isPrimary ? '#FFFFFF' : isDanger ? theme.colors.danger : theme.colors.text },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

export function PluggdIconButton({
  icon,
  active,
  accessibilityLabel,
  onPress,
  style,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  active?: boolean;
  accessibilityLabel: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
    >
      <PluggdGlassSurface
        interactive
        glassEffectStyle={active ? 'regular' : 'clear'}
        borderColor={active ? theme.colors.borderAccent : theme.colors.border}
        fallbackColor={active ? theme.colors.surfaceStrong : theme.colors.glassFallback}
        style={[styles.iconButton, style]}
      >
        <MaterialIcons name={icon} size={22} color={active ? theme.colors.accent : theme.colors.text} />
      </PluggdGlassSurface>
    </Pressable>
  );
}

export function PluggdChip({
  label,
  active,
  onPress,
  style,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: !!active }}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
    >
      <PluggdGlassSurface
        interactive
        glassEffectStyle={active ? 'regular' : 'clear'}
        borderColor={active ? theme.colors.accent : theme.colors.border}
        fallbackColor={active ? theme.colors.surfaceStrong : theme.colors.surfaceAlt}
        style={[styles.chip, style]}
      >
        <Text style={[styles.chipText, { color: active ? theme.colors.accent : theme.colors.textMuted }]}>
          {label}
        </Text>
      </PluggdGlassSurface>
    </Pressable>
  );
}

export function PluggdSheet({
  children,
  title,
  subtitle,
  style,
}: {
  children: ReactNode;
  title?: string;
  subtitle?: string;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  return (
    <PluggdGlassSurface
      glassEffectStyle="regular"
      blurIntensity={58}
      borderColor={theme.colors.border}
      fallbackColor={theme.colors.backgroundElevated}
      style={[styles.sheet, style]}
    >
      <View style={[styles.sheetHandle, { backgroundColor: theme.colors.border }]} />
      {title ? <Text style={[styles.sheetTitle, { color: theme.colors.text }]}>{title}</Text> : null}
      {subtitle ? (
        <Text style={[styles.sheetSubtitle, { color: theme.colors.textMuted }]}>{subtitle}</Text>
      ) : null}
      {children}
    </PluggdGlassSurface>
  );
}

export function PluggdAvatar({
  uri,
  label,
  size = 38,
  style,
}: {
  uri?: string | null;
  label: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  const initial = label.trim().charAt(0).toUpperCase() || 'P';

  return (
    <View
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: theme.colors.surfaceStrong,
          borderColor: theme.colors.borderAccent,
        },
        style,
      ]}
    >
      {uri ? (
        <Image source={{ uri }} style={styles.avatarImage} />
      ) : (
        <Text style={[styles.avatarText, { color: theme.colors.text }]}>{initial}</Text>
      )}
    </View>
  );
}

export function SkeletonBlock({
  width = '100%',
  height = 16,
  radius = pluggdRadii.compact,
  style,
}: {
  width?: number | `${number}%`;
  height?: number;
  radius?: number;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  return (
    <LinearGradient
      colors={[theme.colors.surfaceAlt, theme.colors.surface, theme.colors.surfaceAlt]}
      start={{ x: 0, y: 0.5 }}
      end={{ x: 1, y: 0.5 }}
      style={[{ width, height, borderRadius: radius }, style]}
    />
  );
}

export function PluggdBadge({
  label,
  tone = 'accent',
}: {
  label: string;
  tone?: 'accent' | 'muted' | 'success' | 'danger';
}) {
  const theme = usePluggdTheme();
  const color =
    tone === 'success'
      ? theme.colors.success
      : tone === 'danger'
      ? theme.colors.danger
      : tone === 'muted'
      ? theme.colors.textMuted
      : theme.colors.accent;

  return (
    <View style={[styles.badge, { borderColor: color, backgroundColor: `${color}1A` }]}>
      <Text style={[styles.badgeText, { color }]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  glassBase: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
  },
  surface: {
    borderRadius: pluggdRadii.compact,
    borderWidth: 1,
  },
  button: {
    minHeight: 42,
    borderRadius: pluggdRadii.compact,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  buttonText: {
    fontSize: 13,
    fontWeight: '700',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: pluggdRadii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    minHeight: 32,
    borderRadius: pluggdRadii.pill,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontSize: 12.5,
    fontWeight: '600',
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: pluggdRadii.sheet,
    borderTopRightRadius: pluggdRadii.sheet,
    paddingHorizontal: 14,
    paddingTop: 10,
    paddingBottom: 26,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: pluggdRadii.pill,
    marginBottom: 14,
  },
  sheetTitle: {
    fontSize: 22,
    fontWeight: '700',
  },
  sheetSubtitle: {
    fontSize: 13,
    lineHeight: 20,
    fontWeight: '700',
    marginTop: 4,
    marginBottom: 12,
  },
  avatar: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  avatarImage: {
    width: '100%',
    height: '100%',
  },
  avatarText: {
    fontSize: 15,
    fontWeight: '700',
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: pluggdRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
});

export { PLUGGD_ORANGE };
