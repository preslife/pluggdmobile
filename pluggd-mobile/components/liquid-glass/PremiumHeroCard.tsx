import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { PluggdImage } from '../../src/components/PluggdImage';
import { selectionHaptic } from '../../src/design/haptics';
import { pluggdFonts } from '../../src/design/typography';

type PremiumHeroCardProps = {
  image: string;
  eyebrow: string;
  title: string;
  meta?: string | null;
  statusLabel?: string;
  statusColor?: string;
  canPlay?: boolean;
  playing?: boolean;
  onPress?: () => void;
  onPlay?: () => void;
  style?: StyleProp<ViewStyle>;
};

/**
 * Full-bleed cinematic hero used for the Home lead spotlight. The artwork fills
 * the card and copy is overlaid over a gradient scrim, so the title gets the
 * full card width (no cramped side column) and never truncates mid-word.
 */
export function PremiumHeroCard({
  image,
  eyebrow,
  title,
  meta,
  statusLabel,
  statusColor = '#FF5A00',
  canPlay,
  playing,
  onPress,
  onPlay,
  style,
}: PremiumHeroCardProps) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel={`Open ${title}`}
      disabled={!onPress}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [styles.root, style, pressed && styles.pressed]}
    >
      <PluggdImage uri={image} resizeMode="cover" style={StyleSheet.absoluteFill} />
      {/* bottom-up scrim for the copy + a soft left wash for the status row */}
      <LinearGradient
        colors={['rgba(8,8,12,0)', 'rgba(8,8,12,0.34)', 'rgba(8,8,12,0.95)']}
        locations={[0, 0.42, 1]}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <LinearGradient
        colors={['rgba(8,8,12,0.5)', 'rgba(8,8,12,0)']}
        start={{ x: 0, y: 0.35 }}
        end={{ x: 0.9, y: 0.35 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <View style={styles.head}>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{eyebrow}</Text>
        </View>
        {statusLabel ? (
          <View style={styles.status}>
            <View style={[styles.dot, { backgroundColor: statusColor }]} />
            <Text style={styles.statusText}>{statusLabel}</Text>
          </View>
        ) : null}
      </View>

      <View style={styles.foot}>
        <View style={styles.copy}>
          <Text style={styles.title} numberOfLines={2}>{title}</Text>
          {meta ? <Text style={styles.meta} numberOfLines={1}>{meta}</Text> : null}
        </View>
        {onPlay ? (
          <Pressable
            onPress={() => {
              selectionHaptic();
              onPlay();
            }}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={canPlay ? (playing ? 'Pause' : 'Play') : 'Open'}
            style={({ pressed }) => pressed && { opacity: 0.85 }}
          >
            <View style={styles.play}>
              <MaterialIcons name={canPlay ? (playing ? 'pause' : 'play-arrow') : 'arrow-forward'} size={26} color="#0E0E12" />
            </View>
          </Pressable>
        ) : null}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  root: { padding: 16, justifyContent: 'space-between' },
  pressed: { opacity: 0.96, transform: [{ scale: 0.992 }] },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  badge: {
    alignSelf: 'flex-start',
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.28)',
    backgroundColor: 'rgba(8,8,12,0.4)',
    paddingHorizontal: 11,
    paddingVertical: 6,
  },
  badgeText: { color: '#FFFFFF', fontFamily: 'Satoshi-Bold', fontSize: 9.5, letterSpacing: 1.1, textTransform: 'uppercase' },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(8,8,12,0.4)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  statusText: { color: '#FFFFFF', fontFamily: 'Satoshi-Bold', fontSize: 10, letterSpacing: 0.5, textTransform: 'uppercase' },
  foot: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12 },
  copy: { flex: 1, minWidth: 0, gap: 5 },
  title: { color: '#FFFFFF', fontFamily: pluggdFonts.displayExtraBold, fontSize: 27, lineHeight: 30, letterSpacing: -0.4 },
  meta: { color: 'rgba(255,255,255,0.8)', fontFamily: 'Satoshi-Bold', fontSize: 13, lineHeight: 17 },
  play: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#FFFFFF',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 14,
    shadowOffset: { width: 0, height: 8 },
  },
});

export default PremiumHeroCard;
