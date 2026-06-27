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
  TextProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { PluggdImage } from '../src/components/PluggdImage';
import { impactHaptic, selectionHaptic } from '../src/design/haptics';
import { PLUGGD_ORANGE, pluggdRadii } from '../src/design/tokens';
import { pluggdFonts, pluggdTextStyles } from '../src/design/typography';
import { usePluggdTheme } from '../src/design/usePluggdTheme';
import { LiquidBackground } from './liquid-glass/LiquidBackground';

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

type PluggdTextProps = TextProps & {
  children?: ReactNode;
  style?: StyleProp<TextStyle>;
};

function createTextPrimitive(baseStyle: TextStyle) {
  return function PluggdTextPrimitive({ children, style, ...props }: PluggdTextProps) {
    const theme = usePluggdTheme();
    return (
      <Text {...props} style={[baseStyle, { color: theme.colors.text }, style]}>
        {children}
      </Text>
    );
  };
}

export const PluggdTitle = createTextPrimitive(pluggdTextStyles.appTitle);
export const PluggdHeading = createTextPrimitive(pluggdTextStyles.heading);
export const PluggdSectionTitle = createTextPrimitive(pluggdTextStyles.sectionTitle);
export const PluggdBody = createTextPrimitive(pluggdTextStyles.body);
export const PluggdMeta = createTextPrimitive(pluggdTextStyles.meta);
export const PluggdCTA = createTextPrimitive(pluggdTextStyles.cta);

export function PluggdHitTarget({
  children,
  accessibilityLabel,
  accessibilityRole = 'button',
  disabled,
  onPress,
  style,
}: {
  children?: ReactNode;
  accessibilityLabel?: string;
  accessibilityRole?: 'button' | 'link' | 'tab';
  disabled?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole={accessibilityRole}
      accessibilityLabel={accessibilityLabel}
      disabled={disabled}
      onPress={onPress}
      style={[styles.hitTarget, style]}
    >
      {children}
    </Pressable>
  );
}

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
      style={styles.hitTarget}
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
      style={styles.hitTargetHorizontal}
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

type PremiumTone = 'accent' | 'live' | 'community' | 'muted';

function premiumToneColor(theme: ReturnType<typeof usePluggdTheme>, tone: PremiumTone = 'accent') {
  if (tone === 'live') return theme.colors.live;
  if (tone === 'community') return theme.colors.backstage;
  if (tone === 'muted') return theme.colors.textMuted;
  return theme.colors.accent;
}

export function PremiumScreenBackdrop({
  children,
  tone = 'accent',
  style,
}: {
  children?: ReactNode;
  tone?: PremiumTone;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  const backgroundTone = tone === 'live' ? 'rose' : tone === 'community' ? 'violet' : tone === 'muted' ? 'blue' : 'accent';

  return (
    <View style={[premiumStyles.backdrop, { backgroundColor: theme.colors.canvas }, style]}>
      <LiquidBackground tone={backgroundTone} style={StyleSheet.absoluteFill} />
      {children}
    </View>
  );
}

export function PremiumScreenHeader({
  eyebrow,
  title,
  subtitle,
  tone = 'accent',
  actions,
  style,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  tone?: PremiumTone;
  actions?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  const accent = premiumToneColor(theme, tone);

  return (
    <View style={[premiumStyles.header, style]}>
      <View style={premiumStyles.headerCopy}>
        {eyebrow ? <Text style={[premiumStyles.eyebrow, { color: accent }]}>{eyebrow}</Text> : null}
        <Text style={[premiumStyles.headerTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[premiumStyles.headerSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {actions ? <View style={premiumStyles.headerActions}>{actions}</View> : null}
    </View>
  );
}

export function PremiumHeroCard({
  eyebrow,
  title,
  subtitle,
  meta,
  imageUrl,
  badge,
  ctaLabel,
  onPress,
  tone = 'accent',
  compact = false,
  style,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  meta?: string;
  imageUrl?: string | null;
  badge?: string;
  ctaLabel?: string;
  onPress?: () => void;
  tone?: PremiumTone;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  const accent = premiumToneColor(theme, tone);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      onPress={() => {
        impactHaptic();
        onPress?.();
      }}
      style={[
        premiumStyles.hero,
        compact && premiumStyles.heroCompact,
        { borderColor: theme.colors.borderStrong, backgroundColor: theme.colors.surfaceStrong },
        style,
      ]}
    >
      <LinearGradient
        colors={[`${accent}40`, 'rgba(8,8,12,0.2)', theme.colors.backgroundElevated]}
        style={StyleSheet.absoluteFill}
      />
      <View style={[premiumStyles.heroArtwork, { backgroundColor: theme.colors.artworkBase }]}>
        {imageUrl ? <PluggdImage uri={imageUrl} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        <LinearGradient colors={['transparent', 'rgba(8,8,12,0.78)']} style={StyleSheet.absoluteFill} />
      </View>
      <View style={[premiumStyles.heroCopy, compact && premiumStyles.heroCopyCompact]}>
        <View style={premiumStyles.heroTopLine}>
          {eyebrow ? <Text style={[premiumStyles.eyebrow, { color: accent }]}>{eyebrow}</Text> : null}
          {badge ? <PluggdBadge label={badge} tone={tone === 'live' ? 'danger' : tone === 'muted' ? 'muted' : 'accent'} /> : null}
        </View>
        <Text style={[premiumStyles.heroTitle, { color: theme.colors.text }]} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[premiumStyles.heroSubtitle, { color: theme.colors.textSecondary }]} numberOfLines={3}>
            {subtitle}
          </Text>
        ) : null}
        <View style={premiumStyles.heroFooter}>
          {meta ? <Text style={[premiumStyles.heroMeta, { color: theme.colors.textMuted }]}>{meta}</Text> : null}
          {ctaLabel ? (
            <View style={[premiumStyles.heroCta, { backgroundColor: accent }]}>
              <Text style={premiumStyles.heroCtaText}>{ctaLabel}</Text>
            </View>
          ) : null}
        </View>
      </View>
    </Pressable>
  );
}

export function PremiumMediaRail({
  title,
  action,
  children,
  style,
}: {
  title: string;
  action?: string;
  children?: ReactNode;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();

  return (
    <View style={[premiumStyles.rail, style]}>
      <View style={premiumStyles.railHeader}>
        <Text style={[premiumStyles.railTitle, { color: theme.colors.text }]}>{title}</Text>
        {action ? <Text style={[premiumStyles.railAction, { color: theme.colors.accent }]}>{action}</Text> : null}
      </View>
      <View style={premiumStyles.railContent}>{children}</View>
    </View>
  );
}

export function PremiumListRow({
  title,
  subtitle,
  meta,
  imageUrl,
  icon = 'chevron-right',
  tone = 'accent',
  onPress,
  style,
}: {
  title: string;
  subtitle?: string | null;
  meta?: string | null;
  imageUrl?: string | null;
  icon?: keyof typeof MaterialIcons.glyphMap;
  tone?: PremiumTone;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  const accent = premiumToneColor(theme, tone);

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      disabled={!onPress}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={[premiumStyles.listRow, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, style]}
    >
      <View style={[premiumStyles.listArtwork, { backgroundColor: theme.colors.artworkBase }]}>
        {imageUrl ? <PluggdImage uri={imageUrl} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
        {!imageUrl ? <MaterialIcons name={icon} size={21} color={accent} /> : null}
      </View>
      <View style={premiumStyles.listCopy}>
        <Text style={[premiumStyles.listTitle, { color: theme.colors.text }]} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={[premiumStyles.listSubtitle, { color: theme.colors.textMuted }]} numberOfLines={2}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {meta ? <Text style={[premiumStyles.listMeta, { color: accent }]}>{meta}</Text> : null}
    </Pressable>
  );
}

export function PremiumEmptyState({
  icon = 'auto-awesome',
  title,
  body,
  tone = 'accent',
  style,
}: {
  icon?: keyof typeof MaterialIcons.glyphMap;
  title: string;
  body: string;
  tone?: PremiumTone;
  style?: StyleProp<ViewStyle>;
}) {
  const theme = usePluggdTheme();
  const accent = premiumToneColor(theme, tone);

  return (
    <View style={[premiumStyles.empty, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }, style]}>
      <View style={[premiumStyles.emptyIcon, { backgroundColor: `${accent}1F` }]}>
        <MaterialIcons name={icon} size={24} color={accent} />
      </View>
      <Text style={[premiumStyles.emptyTitle, { color: theme.colors.text }]}>{title}</Text>
      <Text style={[premiumStyles.emptyBody, { color: theme.colors.textMuted }]}>{body}</Text>
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
  hitTarget: {
    minWidth: 44,
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  hitTargetHorizontal: {
    minHeight: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    minHeight: 44,
    borderRadius: pluggdRadii.control,
    borderWidth: 1,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 7,
  },
  buttonText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 14,
    letterSpacing: 0.3,
    textTransform: 'uppercase',
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: pluggdRadii.control,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chip: {
    minHeight: 36,
    borderRadius: pluggdRadii.pill,
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipText: {
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
  },
  sheet: {
    maxHeight: '78%',
    borderTopLeftRadius: pluggdRadii.sheet,
    borderTopRightRadius: pluggdRadii.sheet,
    paddingHorizontal: 16,
    paddingTop: 11,
    paddingBottom: 28,
  },
  sheetHandle: {
    alignSelf: 'center',
    width: 42,
    height: 4,
    borderRadius: pluggdRadii.pill,
    marginBottom: 14,
  },
  sheetTitle: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 23,
    letterSpacing: 0,
  },
  sheetSubtitle: {
    fontSize: 13.5,
    lineHeight: 20,
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
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
  },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: pluggdRadii.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
  },
});

const premiumStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    overflow: 'hidden',
  },
  backdropVignette: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.12)',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 12,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 16,
  },
  headerCopy: {
    flex: 1,
    gap: 5,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  eyebrow: {
    fontFamily: 'Satoshi-Black',
    fontSize: 11,
    lineHeight: 14,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  headerTitle: {
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 31,
    lineHeight: 35,
    letterSpacing: 0,
  },
  headerSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  hero: {
    minHeight: 236,
    borderRadius: pluggdRadii.sheet,
    borderWidth: 1,
    overflow: 'hidden',
  },
  heroArtwork: {
    ...StyleSheet.absoluteFillObject,
  },
  heroCopy: {
    flex: 1,
    minHeight: 236,
    justifyContent: 'flex-end',
    padding: 18,
    gap: 8,
  },
  heroCompact: {
    minHeight: 164,
  },
  heroCopyCompact: {
    minHeight: 164,
    padding: 16,
  },
  heroTopLine: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  heroTitle: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 27,
    lineHeight: 31,
    letterSpacing: 0,
  },
  heroSubtitle: {
    fontSize: 14,
    lineHeight: 20,
  },
  heroFooter: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginTop: 4,
  },
  heroMeta: {
    flex: 1,
    fontSize: 12,
    lineHeight: 16,
    fontVariant: ['tabular-nums'],
  },
  heroCta: {
    minHeight: 44,
    borderRadius: pluggdRadii.pill,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCtaText: {
    color: '#FFFFFF',
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 15,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  rail: {
    gap: 10,
  },
  railHeader: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
  },
  railTitle: {
    fontFamily: pluggdFonts.displayBold,
    fontSize: 18,
    lineHeight: 22,
  },
  railAction: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  railContent: {
    gap: 10,
  },
  listRow: {
    minHeight: 72,
    borderRadius: pluggdRadii.card,
    borderWidth: 1,
    padding: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  listArtwork: {
    width: 52,
    height: 52,
    borderRadius: 12,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  listCopy: {
    flex: 1,
    gap: 3,
  },
  listTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 19,
  },
  listSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
  },
  listMeta: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 11,
    lineHeight: 14,
    fontVariant: ['tabular-nums'],
    textTransform: 'uppercase',
  },
  empty: {
    borderRadius: pluggdRadii.card,
    borderWidth: 1,
    padding: 18,
    alignItems: 'center',
    gap: 8,
  },
  emptyIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTitle: {
    fontFamily: 'Satoshi-Bold',
    fontSize: 16,
    lineHeight: 20,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },
});

export { PLUGGD_ORANGE };
