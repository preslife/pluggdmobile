import { useEffect, useRef } from 'react';
import { pluggdFonts } from '../design/typography';
import { Animated, StyleSheet, Text, View, type ViewStyle } from 'react-native';

const COLORS = {
  surface: '#12121A',
  surface2: '#1F1F2E',
  border: '#262637',
  muted: '#8E8E9F',
};

export function PremiumSkeleton({
  label = 'Loading live data...',
  compact = false,
  style,
}: {
  label?: string;
  compact?: boolean;
  style?: ViewStyle;
}) {
  const opacity = useRef(new Animated.Value(0.46)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 0.92, duration: 760, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.46, duration: 760, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [opacity]);

  return (
    <View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      style={[styles.wrap, compact && styles.wrapCompact, style]}
    >
      <Animated.View style={[styles.art, compact && styles.artCompact, { opacity }]} />
      <View style={styles.copy}>
        <Animated.View style={[styles.line, compact && styles.lineCompact, styles.lineWide, { opacity }]} />
        <Animated.View style={[styles.line, compact && styles.lineCompact, styles.lineShort, { opacity }]} />
      </View>
      {!compact ? (
        <View style={styles.rail}>
          {[0, 1, 2].map((item) => (
            <Animated.View key={item} style={[styles.pill, { opacity }]} />
          ))}
        </View>
      ) : null}
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    minHeight: 82,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.surface,
    padding: 12,
    overflow: 'hidden',
  },
  wrapCompact: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 8,
  },
  art: {
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: COLORS.surface2,
  },
  artCompact: {
    width: 30,
    height: 30,
    borderRadius: 8,
  },
  copy: {
    flex: 1,
    gap: 8,
  },
  line: {
    height: 10,
    borderRadius: 999,
    backgroundColor: COLORS.surface2,
  },
  lineCompact: {
    height: 8,
  },
  lineWide: {
    width: '78%',
  },
  lineShort: {
    width: '46%',
  },
  rail: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  pill: {
    width: 52,
    height: 8,
    borderRadius: 999,
    backgroundColor: COLORS.surface2,
  },
  label: {
    position: 'absolute',
    right: 12,
    bottom: 10,
    color: COLORS.muted,
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBold, fontWeight: '800',
  },
});
