import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Platform, StyleSheet, View, type ImageSourcePropType, type StyleProp, type ViewStyle } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import {
  liquidGlassColors,
  liquidGlassToneColors,
  type LiquidGlassTone,
} from '../../src/design/liquidGlassTokens';

type GlassAlbumArtProps = {
  imageUrl?: string | null;
  fallbackSource?: ImageSourcePropType;
  tone?: LiquidGlassTone;
  compact?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function GlassAlbumArt({ imageUrl, fallbackSource, tone = 'accent', compact, style }: GlassAlbumArtProps) {
  const colors = liquidGlassToneColors[tone] ?? liquidGlassToneColors.violet;
  const sizeStyle = compact ? styles.compact : styles.regular;

  return (
    <View style={[styles.shadowWrap, webArtworkLift, sizeStyle, style]}>
      <View style={[styles.frame, sizeStyle, style]}>
        {imageUrl ? (
          <PluggdImage uri={imageUrl} style={styles.fill} resizeMode="cover" />
        ) : fallbackSource ? (
          <Image source={fallbackSource} style={styles.fill} resizeMode="cover" />
        ) : (
          <>
            <LinearGradient
              colors={[colors[0], '#16110D']}
              start={{ x: 0.2, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={StyleSheet.absoluteFill}
            />
            <View style={styles.fallbackIcon}>
              <MaterialIcons name="graphic-eq" size={compact ? 18 : 30} color="rgba(255,255,255,0.62)" />
            </View>
          </>
        )}
      </View>
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
    shadowOpacity: 0.32,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 9 },
    elevation: 6,
  },
  regular: {
    width: 118,
    height: 118,
    borderRadius: 5,
  },
  compact: {
    width: 46,
    height: 46,
    borderRadius: 4,
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
  fallbackIcon: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
