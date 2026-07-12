import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { pluggdFonts } from '../src/design/typography';
import { ed } from '../src/design/editorial';

type LiveTickerProps = {
  items: string[];
  /** pixels per second */
  speed?: number;
  accent?: string;
  /**
   * 'night' — inline dark row with a LIVE pill.
   * 'paper' — the web home's full-bleed cream band with ink text.
   */
  variant?: 'night' | 'paper';
};

const SEP = '     •     ';

/**
 * Continuous activity marquee — the mobile port of the web app's scrolling
 * "look for me (Acoustic) • Black Loyalty opened Room…" ticker. Two copies of
 * the line translate seamlessly so the scene always feels live.
 */
export function LiveTicker({ items, speed = 40, accent = '#FF5A00', variant = 'night' }: LiveTickerProps) {
  const translate = useRef(new Animated.Value(0)).current;
  const [width, setWidth] = useState(0);
  const line = items.filter(Boolean).join(SEP) + SEP;
  const paper = variant === 'paper';

  useEffect(() => {
    if (!width) return;
    translate.setValue(0);
    const anim = Animated.loop(
      Animated.timing(translate, {
        toValue: -width,
        duration: (width / speed) * 1000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    anim.start();
    return () => anim.stop();
  }, [width, speed, translate]);

  if (!items.length) return null;

  return (
    <View style={[styles.wrap, paper && styles.wrapPaper]}>
      {paper ? (
        <View style={styles.paperDot} />
      ) : (
        <View style={[styles.livePill, { borderColor: accent }]}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={[styles.liveText, { color: accent }]}>LIVE</Text>
        </View>
      )}
      <View style={styles.track}>
        <Animated.View style={[styles.row, { transform: [{ translateX: translate }] }]}>
          <Text onLayout={(e) => setWidth(e.nativeEvent.layout.width)} numberOfLines={1} style={[styles.text, paper && styles.textPaper]}>
            {line}
          </Text>
          <Text numberOfLines={1} style={[styles.text, paper && styles.textPaper]}>
            {line}
          </Text>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  wrapPaper: {
    backgroundColor: ed.paper2,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  livePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 9,
    paddingVertical: 4,
  },
  dot: { width: 6, height: 6, borderRadius: 3 },
  paperDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: ed.orange },
  liveText: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1 },
  track: { flex: 1, overflow: 'hidden' },
  row: { flexDirection: 'row' },
  text: { color: 'rgba(255,255,255,0.62)', fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5 },
  textPaper: { color: ed.ink, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
});

export default LiveTicker;
