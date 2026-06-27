import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import {
  liquidGlassColors,
  liquidGlassToneColors,
  type LiquidGlassTone,
} from '../../src/design/liquidGlassTokens';

type GlassAvatarProps = {
  imageUrl?: string | null;
  name: string;
  tone?: LiquidGlassTone;
  size?: 'sm' | 'md' | 'lg' | number;
  status?: 'online' | 'live' | 'none';
};

function sizeValue(size: GlassAvatarProps['size']) {
  if (typeof size === 'number') return size;
  if (size === 'sm') return 34;
  if (size === 'lg') return 74;
  return 48;
}

export function GlassAvatar({ imageUrl, name, tone = 'violet', size = 'md', status = 'none' }: GlassAvatarProps) {
  const dimension = sizeValue(size);
  const initial = name.trim().charAt(0).toUpperCase() || 'P';
  const colors = liquidGlassToneColors[tone] ?? liquidGlassToneColors.violet;

  return (
    <View
      style={[
        styles.shell,
        {
          width: dimension,
          height: dimension,
          borderRadius: dimension / 2,
          padding: Math.max(2, Math.round(dimension * 0.045)),
        },
      ]}
    >
      <LinearGradient
        colors={[colors[0], liquidGlassColors.accent, colors[1]]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      <View style={[styles.inner, { borderRadius: dimension / 2 }]}>
        {imageUrl ? (
          <PluggdImage uri={imageUrl} style={styles.fill} resizeMode="cover" />
        ) : (
          <LinearGradient colors={[colors[0], '#171827', colors[1]]} style={[styles.fallback, { borderRadius: dimension / 2 }]}>
            <Text style={[styles.initial, { fontSize: Math.max(12, Math.round(dimension * 0.34)) }]}>{initial}</Text>
          </LinearGradient>
        )}
      </View>
      {status !== 'none' ? (
        <View
          style={[
            styles.status,
            {
              width: Math.max(10, Math.round(dimension * 0.18)),
              height: Math.max(10, Math.round(dimension * 0.18)),
              borderRadius: Math.max(5, Math.round(dimension * 0.09)),
              backgroundColor: status === 'live' ? '#FF4757' : '#41D17D',
            },
          ]}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    overflow: 'hidden',
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: liquidGlassColors.borderTop,
  },
  inner: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#171827',
  },
  fallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fill: {
    width: '100%',
    height: '100%',
  },
  initial: {
    color: liquidGlassColors.textPrimary,
    fontFamily: 'Satoshi-Black',
  },
  status: {
    position: 'absolute',
    right: 2,
    bottom: 2,
    borderWidth: 2,
    borderColor: '#10121E',
  },
});
