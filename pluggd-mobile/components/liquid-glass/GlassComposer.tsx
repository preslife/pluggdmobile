import { MaterialIcons } from '@expo/vector-icons';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { selectionHaptic } from '../../src/design/haptics';
import { liquidGlassColors, liquidGlassRadii } from '../../src/design/liquidGlassTokens';
import { GlassAvatar } from './GlassAvatar';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';

type GlassComposerProps = {
  userAvatar?: string | null;
  userName?: string;
  placeholder?: string;
  signedIn?: boolean;
  ctaLabel?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function GlassComposer({
  userAvatar,
  userName = 'PLUGGD',
  placeholder = 'Start a post',
  signedIn = true,
  ctaLabel,
  onPress,
  style,
}: GlassComposerProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={signedIn ? 'Start a post' : 'Sign in to post'}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [pressed && styles.pressed, style]}
    >
      <LiftSurface depth="normal">
        <GlassPanel intensity="default" radius={liquidGlassRadii.xl} style={styles.card} contentStyle={styles.content}>
          <GlassAvatar imageUrl={userAvatar} name={userName} size="md" tone={signedIn ? 'accent' : 'violet'} />
          {signedIn ? (
            <View style={styles.inputPill}>
              <Text style={styles.placeholder} numberOfLines={1}>
                {placeholder}
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.copy}>
                <Text style={styles.title}>Sign in to post</Text>
                <Text style={styles.subtitle} numberOfLines={2}>
                  Join the feed when you want to reply, repost, save, or share.
                </Text>
              </View>
              <View style={styles.actionWide}>
                <Text style={styles.actionText}>{ctaLabel || 'Sign in'}</Text>
              </View>
            </>
          )}
          {signedIn ? (
            <View style={styles.action}>
              <MaterialIcons name="add" size={22} color={liquidGlassColors.backgroundDeep} />
            </View>
          ) : null}
        </GlassPanel>
      </LiftSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.99 }],
  },
  card: {
    minHeight: 82,
  },
  content: {
    minHeight: 82,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    color: liquidGlassColors.textPrimary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 15,
    lineHeight: 19,
  },
  subtitle: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 17,
  },
  inputPill: {
    flex: 1,
    minHeight: 46,
    borderRadius: liquidGlassRadii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    backgroundColor: 'rgba(255,255,255,0.04)',
    paddingHorizontal: 15,
    justifyContent: 'center',
  },
  placeholder: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 16,
  },
  action: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.42)',
    borderLeftColor: 'rgba(255,255,255,0.18)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    borderBottomColor: 'rgba(0,0,0,0.48)',
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionWide: {
    minWidth: 72,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.42)',
    borderLeftColor: 'rgba(255,255,255,0.18)',
    borderRightColor: 'rgba(0,0,0,0.32)',
    borderBottomColor: 'rgba(0,0,0,0.48)',
    backgroundColor: 'rgba(255,255,255,0.82)',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
  },
  actionText: {
    color: liquidGlassColors.backgroundDeep,
    fontFamily: 'Satoshi-Bold',
    fontSize: 12,
  },
});
