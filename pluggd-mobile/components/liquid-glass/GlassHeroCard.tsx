import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { selectionHaptic } from '../../src/design/haptics';
import {
  liquidGlassColors,
  liquidGlassRadii,
  type LiquidGlassTone,
} from '../../src/design/liquidGlassTokens';
import { pluggdFonts } from '../../src/design/typography';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';
import { GlassAlbumArt } from './GlassAlbumArt';

type GlassHeroCardProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  description?: string;
  image?: string | null;
  fallbackTone?: LiquidGlassTone;
  primaryAction?: ReactNode;
  metadata?: string;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function GlassHeroCard({
  eyebrow,
  title,
  subtitle,
  description,
  image,
  fallbackTone = 'accent',
  primaryAction,
  metadata,
  onPress,
  style,
}: GlassHeroCardProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={onPress ? `Open ${title}` : title}
      disabled={!onPress}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [pressed && styles.pressed, style]}
    >
      <LiftSurface depth="high">
        <GlassPanel intensity="strong" radius={liquidGlassRadii.xxl} style={styles.card} contentStyle={styles.content}>
          <View style={styles.heroGrid}>
            <View style={styles.copy}>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{eyebrow || 'Featured Drop'}</Text>
              </View>
              <Text style={styles.title} numberOfLines={3}>{title}</Text>
              {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
              {description ? <Text style={styles.description} numberOfLines={3}>{description}</Text> : null}
              <View style={styles.footer}>
                <LiftSurface depth="low" style={styles.playLift}>
                  <LinearGradient
                    colors={['#F3F3F3', '#ADADAD']}
                    start={{ x: 0.2, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.playButton}
                  >
                    <MaterialIcons name="play-arrow" size={21} color="#1A1820" />
                  </LinearGradient>
                </LiftSurface>
                <View style={styles.metaStack}>
                  {metadata ? <Text style={styles.metadata} numberOfLines={1}>{metadata}</Text> : null}
                  <View style={styles.waveform}>
                    {[8, 14, 20, 12, 26, 18, 10, 24, 16, 14, 20, 8].map((height, index) => (
                      <View
                        key={`hero-wave-${index}`}
                        style={[
                          styles.waveBar,
                          {
                            height,
                            opacity: index >= 4 && index <= 9 ? 0.58 : 0.16,
                          },
                        ]}
                      />
                    ))}
                  </View>
                </View>
                {primaryAction ?? null}
              </View>
            </View>
            <View style={styles.artStage}>
              <View pointerEvents="none" style={styles.artStageShadow} />
              <GlassAlbumArt imageUrl={image} tone={fallbackTone} style={styles.heroArtwork} />
              <View pointerEvents="none" style={styles.artGlow} />
            </View>
          </View>
        </GlassPanel>
      </LiftSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: {
    opacity: 0.9,
    transform: [{ scale: 0.99 }],
  },
  card: {
    minHeight: 268,
    shadowColor: '#000',
    shadowOpacity: 0.72,
    shadowRadius: 56,
    shadowOffset: { width: 0, height: 34 },
  },
  content: {
    padding: 20,
    gap: 0,
  },
  badge: {
    alignSelf: 'flex-start',
    minHeight: 24,
    borderRadius: liquidGlassRadii.pill,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liquidGlassColors.borderSoft,
    backgroundColor: 'rgba(255,255,255,0.045)',
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  badgeText: {
    color: liquidGlassColors.textSecondary,
    fontFamily: 'Satoshi-Medium',
    fontSize: 9,
    lineHeight: 14,
    textTransform: 'uppercase',
  },
  heroGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 18,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    paddingRight: 2,
  },
  title: {
    color: liquidGlassColors.textPrimary,
    fontFamily: pluggdFonts.displayBold,
    fontSize: 27,
    lineHeight: 29,
    marginTop: 18,
  },
  subtitle: {
    color: liquidGlassColors.textSecondary,
    fontFamily: 'Satoshi-Medium',
    fontSize: 13,
    lineHeight: 18,
    marginTop: 9,
  },
  description: {
    color: liquidGlassColors.textSubtle,
    fontFamily: 'Satoshi-Medium',
    fontSize: 12,
    lineHeight: 19,
    marginTop: 9,
  },
  footer: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginTop: 18,
  },
  playLift: {
    borderRadius: liquidGlassRadii.pill,
  },
  playButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.90)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.25)',
    shadowColor: '#000',
    shadowOpacity: 0.48,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 12 },
  },
  metaStack: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  metadata: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
  },
  waveform: {
    height: 28,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 2,
  },
  waveBar: {
    width: 3,
    borderRadius: 999,
    backgroundColor: liquidGlassColors.textPrimary,
  },
  artStage: {
    position: 'relative',
    width: 146,
    height: 154,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artStageShadow: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 2,
    height: 26,
    borderRadius: 999,
    backgroundColor: 'rgba(0,0,0,0.48)',
    transform: [{ scaleX: 1.08 }],
  },
  artGlow: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    bottom: 2,
    height: 31,
    borderRadius: 999,
    backgroundColor: 'rgba(138,125,255,0.18)',
  },
  heroArtwork: {
    width: 136,
    height: 136,
    borderRadius: 24,
  },
});
