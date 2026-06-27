import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { selectionHaptic } from '../../src/design/haptics';
import {
  liquidGlassColors,
  liquidGlassRadii,
  liquidGlassToneColors,
  type LiquidGlassTone,
} from '../../src/design/liquidGlassTokens';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';

type GlassRailCardProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  fallbackTone?: LiquidGlassTone;
  metric?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function GlassRailCard({
  title,
  subtitle,
  imageUrl,
  fallbackTone = 'violet',
  metric,
  onPress,
  style,
}: GlassRailCardProps) {
  const colors = liquidGlassToneColors[fallbackTone] ?? liquidGlassToneColors.violet;

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'text'}
      accessibilityLabel={onPress ? `Open ${title}` : title}
      disabled={!onPress}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [styles.pressable, pressed && styles.pressed, style]}
    >
      <LiftSurface depth="normal">
        <GlassPanel intensity="default" radius={liquidGlassRadii.lg} style={styles.card} contentStyle={styles.content}>
          <View pointerEvents="none" style={styles.rearPlate} />
          <LinearGradient
            colors={[colors[0], '#111528', '#04050B']}
            locations={[0, 0.42, 1]}
            start={{ x: 0.12, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.coverPlane}>
            {imageUrl ? <PluggdImage uri={imageUrl} style={styles.image} resizeMode="cover" /> : null}
            {!imageUrl ? (
              <View style={styles.fallbackMark}>
                <View style={styles.trackFigure} />
                <View style={styles.trackBeam} />
                <MaterialIcons name="graphic-eq" size={28} color="rgba(255,255,255,0.26)" />
              </View>
            ) : null}
          </View>
          <View pointerEvents="none" style={styles.topBevel} />
          <View pointerEvents="none" style={styles.leftBevel} />
          <View pointerEvents="none" style={styles.rightCavity} />
          <View pointerEvents="none" style={styles.bottomShelf} />
          <View pointerEvents="none" style={styles.specularSlash} />
          <LinearGradient
            pointerEvents="none"
            colors={['rgba(2,3,8,0.00)', 'rgba(2,3,8,0.22)', 'rgba(2,3,8,0.92)']}
            locations={[0, 0.45, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View pointerEvents="none" style={[styles.imageGlow, { backgroundColor: colors[0] }]} />
          <View style={styles.copy}>
            <Text style={styles.eyebrow} numberOfLines={1}>{metric || 'PLUGGD'}</Text>
            <Text style={styles.title} numberOfLines={2}>{title}</Text>
            {subtitle ? <Text style={styles.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          </View>
        </GlassPanel>
      </LiftSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressable: {
    width: 164,
  },
  pressed: {
    opacity: 0.86,
    transform: [{ scale: 0.985 }],
  },
  card: {
    height: 214,
    shadowColor: '#000',
    shadowOpacity: 0.66,
    shadowRadius: 34,
    shadowOffset: { width: 0, height: 22 },
  },
  content: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  coverPlane: {
    ...StyleSheet.absoluteFillObject,
    overflow: 'hidden',
    borderRadius: liquidGlassRadii.lg,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.24)',
    borderLeftWidth: StyleSheet.hairlineWidth,
    borderLeftColor: 'rgba(255,255,255,0.14)',
    borderRightWidth: StyleSheet.hairlineWidth,
    borderRightColor: 'rgba(0,0,0,0.40)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.62)',
    backgroundColor: '#070914',
    shadowColor: '#000',
    shadowOpacity: 0.48,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 14 },
  },
  rearPlate: {
    position: 'absolute',
    left: 8,
    right: -4,
    top: 10,
    bottom: -6,
    borderRadius: liquidGlassRadii.lg,
    backgroundColor: 'rgba(0,0,0,0.30)',
  },
  topBevel: {
    position: 'absolute',
    left: 9,
    right: 9,
    top: 0,
    height: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.46)',
  },
  leftBevel: {
    position: 'absolute',
    left: 0,
    top: 12,
    bottom: 18,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.22)',
  },
  rightCavity: {
    position: 'absolute',
    right: 0,
    top: 14,
    bottom: 16,
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  bottomShelf: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 18,
    backgroundColor: 'rgba(0,0,0,0.28)',
  },
  specularSlash: {
    position: 'absolute',
    left: '-46%',
    top: '-8%',
    width: '46%',
    height: '120%',
    backgroundColor: 'rgba(255,255,255,0.10)',
    opacity: 0.58,
    transform: [{ rotate: '12deg' }],
  },
  copy: {
    minHeight: 74,
    paddingHorizontal: 12,
    paddingTop: 28,
    paddingBottom: 12,
    gap: 4,
  },
  eyebrow: {
    color: 'rgba(255,255,255,0.48)',
    fontFamily: 'Satoshi-Medium',
    fontSize: 9,
    lineHeight: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: liquidGlassColors.textPrimary,
    fontFamily: 'Satoshi-Bold',
    fontSize: 13,
    lineHeight: 17,
  },
  subtitle: {
    color: liquidGlassColors.textMuted,
    fontFamily: 'Satoshi-Medium',
    fontSize: 11,
    lineHeight: 15,
  },
  fallbackMark: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trackFigure: {
    position: 'absolute',
    left: '28%',
    bottom: 0,
    width: '34%',
    height: '58%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: 'rgba(40,45,75,0.86)',
    shadowColor: '#9A91FF',
    shadowOpacity: 0.28,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 0 },
  },
  trackBeam: {
    position: 'absolute',
    bottom: '12%',
    left: '47%',
    width: 3,
    height: '58%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.80)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.76,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 0 },
  },
  imageGlow: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 52,
    height: 36,
    borderRadius: 999,
    opacity: 0.16,
  },
});
