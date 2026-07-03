import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { selectionHaptic } from '../../src/design/haptics';
import { liquidGlassColors } from '../../src/design/liquidGlassTokens';
import { GlassAvatar } from './GlassAvatar';

type GlassComposerProps = {
  userAvatar?: string | null;
  userName?: string;
  placeholder?: string;
  signedIn?: boolean;
  ctaLabel?: string;
  accessibilityLabel?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Web-parity compose row: one slim line — avatar, "What's happening in your
 * world?", and an orange action pill (Sign in / Post) — matching the live web
 * Community composer instead of a heavy glass card.
 */
export function GlassComposer({
  userAvatar,
  userName = 'PLUGGD',
  placeholder = 'Start a post',
  signedIn = true,
  ctaLabel,
  accessibilityLabel,
  onPress,
  style,
}: GlassComposerProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || (signedIn ? 'Start a post' : 'Sign in to post')}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [styles.row, pressed && styles.pressed, style]}
    >
      <GlassAvatar imageUrl={userAvatar} name={userName} size="sm" tone={signedIn ? 'accent' : 'violet'} />
      <Text style={styles.placeholder} numberOfLines={1}>
        {placeholder}
      </Text>
      <View style={styles.cta}>
        <Text style={styles.ctaText}>{signedIn ? ctaLabel || 'Post' : ctaLabel || 'Sign in'}</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    minHeight: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingVertical: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.09)',
  },
  pressed: {
    opacity: 0.88,
  },
  placeholder: {
    flex: 1,
    minWidth: 0,
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 14,
    lineHeight: 18,
  },
  cta: {
    borderRadius: 999,
    backgroundColor: '#FF5A00',
    paddingHorizontal: 16,
    paddingVertical: 9,
  },
  ctaText: {
    color: '#14100C',
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 16,
  },
});

export default GlassComposer;
