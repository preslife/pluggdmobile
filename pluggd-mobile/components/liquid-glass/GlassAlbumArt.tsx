import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Platform, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import {
  liquidGlassColors,
  liquidGlassToneColors,
  type LiquidGlassTone,
} from '../../src/design/liquidGlassTokens';

type GlassAlbumArtProps = {
  imageUrl?: string | null;
  tone?: LiquidGlassTone;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GlassAlbumArt({ imageUrl, tone = 'violet', compact, style }: GlassAlbumArtProps) {
  const colors = liquidGlassToneColors[tone] ?? liquidGlassToneColors.violet;
  const sizeStyle = compact ? styles.compact : styles.regular;

  return (
    <View style={[styles.shadowWrap, webArtworkLift, sizeStyle, style]}>
      <View pointerEvents="none" style={[styles.floorGlow, { backgroundColor: colors[0] }]} />
      <View pointerEvents="none" style={[styles.backPlate, sizeStyle]} />
      <View pointerEvents="none" style={[styles.sidePlate, sizeStyle]} />
      <View style={[styles.frame, sizeStyle, style]}>
        {imageUrl ? (
          <>
            <PluggdImage uri={imageUrl} style={styles.fill} resizeMode="cover" />
            <LinearGradient
              colors={['rgba(255,255,255,0.26)', 'rgba(5,7,15,0.02)', 'rgba(0,0,0,0.50)']}
              locations={[0, 0.44, 1]}
              style={StyleSheet.absoluteFill}
            />
            <View pointerEvents="none" style={styles.photoSpecular} />
          </>
        ) : (
          <>
            <LinearGradient
              colors={[colors[0], '#151A34', '#060713', '#010207']}
              locations={[0, 0.28, 0.68, 1]}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.figure} />
            <View style={styles.lightBeam} />
            <MaterialIcons name="graphic-eq" size={compact ? 18 : 28} color="rgba(255,255,255,0.22)" style={styles.fallbackIcon} />
          </>
        )}
        <View pointerEvents="none" style={styles.frameRim} />
        <View pointerEvents="none" style={styles.topSpark} />
        <View pointerEvents="none" style={styles.leftSpark} />
        <View pointerEvents="none" style={styles.bottomLip} />
      </View>
      <View pointerEvents="none" style={[styles.glow, { backgroundColor: colors[0] }]} />
    </View>
  );
}

const webArtworkLift = Platform.select({
  web: {
    filter: 'drop-shadow(0px 2px 2px rgba(0,0,0,0.88)) drop-shadow(0px 12px 18px rgba(0,0,0,0.64)) drop-shadow(0px 30px 34px rgba(0,0,0,0.46))',
  },
  default: {},
}) as ViewStyle;

const styles = StyleSheet.create({
  shadowWrap: {
    position: 'relative',
    shadowColor: '#000',
    shadowOpacity: 0.62,
    shadowRadius: 30,
    shadowOffset: { width: 0, height: 20 },
    elevation: 12,
  },
  floorGlow: {
    position: 'absolute',
    left: '8%',
    right: '8%',
    bottom: -14,
    height: 30,
    borderRadius: 999,
    opacity: 0.28,
  },
  backPlate: {
    position: 'absolute',
    left: 7,
    top: 8,
    backgroundColor: 'rgba(3,4,12,0.72)',
    borderWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    borderLeftColor: 'rgba(255,255,255,0.05)',
    borderRightColor: 'rgba(0,0,0,0.52)',
    borderBottomColor: 'rgba(0,0,0,0.72)',
  },
  sidePlate: {
    position: 'absolute',
    left: 11,
    top: 13,
    backgroundColor: 'rgba(0,0,0,0.32)',
    transform: [{ scaleX: 0.96 }, { scaleY: 0.96 }],
  },
  regular: {
    width: 118,
    height: 118,
    borderRadius: 20,
  },
  compact: {
    width: 46,
    height: 46,
    borderRadius: 14,
  },
  frame: {
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.13)',
    backgroundColor: '#070914',
    shadowColor: '#000',
    shadowOpacity: 0.52,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  figure: {
    position: 'absolute',
    bottom: 0,
    left: '24%',
    width: '41%',
    height: '78%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    backgroundColor: '#282D4B',
    shadowColor: '#9A91FF',
    shadowOpacity: 0.24,
    shadowRadius: 28,
    shadowOffset: { width: 0, height: 0 },
  },
  lightBeam: {
    position: 'absolute',
    bottom: '9%',
    left: '43%',
    width: 4,
    height: '70%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.92)',
    shadowColor: '#FFFFFF',
    shadowOpacity: 0.82,
    shadowRadius: 15,
    shadowOffset: { width: 0, height: 0 },
  },
  fallbackIcon: {
    position: 'absolute',
    right: 10,
    top: 10,
  },
  frameRim: {
    ...StyleSheet.absoluteFillObject,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.24)',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(0,0,0,0.62)',
  },
  photoSpecular: {
    position: 'absolute',
    left: '-50%',
    top: '-12%',
    width: '54%',
    height: '136%',
    backgroundColor: 'rgba(255,255,255,0.12)',
    transform: [{ rotate: '12deg' }],
    opacity: 0.68,
  },
  topSpark: {
    position: 'absolute',
    left: '18%',
    right: '18%',
    top: 0,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  leftSpark: {
    position: 'absolute',
    left: 0,
    top: '16%',
    bottom: '18%',
    width: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.26)',
  },
  bottomLip: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    height: 9,
    backgroundColor: 'rgba(0,0,0,0.36)',
  },
  glow: {
    position: 'absolute',
    left: '15%',
    right: '15%',
    bottom: -19,
    height: 30,
    borderRadius: 999,
    opacity: 0.24,
  },
});
