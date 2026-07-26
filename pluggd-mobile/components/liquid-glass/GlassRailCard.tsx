import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { selectionHaptic } from '../../src/design/haptics';
import {
  liquidGlassColors,
  liquidGlassToneColors,
  type LiquidGlassTone,
} from '../../src/design/liquidGlassTokens';
import { GlassPanel } from './GlassPanel';
import { LiftSurface } from './LiftSurface';

type GlassRailCardProps = {
  title: string;
  subtitle?: string;
  imageUrl?: string | null;
  fallbackSource?: ImageSourcePropType;
  fallbackTone?: LiquidGlassTone;
  metric?: string | null;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
};

export function GlassRailCard({
  title,
  subtitle,
  imageUrl,
  fallbackSource,
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
        <GlassPanel intensity="default" radius={5} style={styles.card} contentStyle={styles.content}>
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
            {!imageUrl && fallbackSource ? <Image source={fallbackSource} style={styles.image} resizeMode="cover" /> : null}
            {!imageUrl && !fallbackSource ? (
              <View style={styles.fallbackMark}>
                <MaterialIcons name="graphic-eq" size={32} color="rgba(255,255,255,0.42)" />
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
    shadowOpacity: 0.32,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 10 },
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
    borderRadius: 5,
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
    borderRadius: 5,
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
    fontFamily: 'Sora-Bold',
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
