import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { selectionHaptic } from '../src/design/haptics';
import { pluggdFonts } from '../src/design/typography';
import { EditorialTitle, type EditorialSegment } from './EditorialTitle';

const PAPER_TOP = '#EFE7D7';
const PAPER_BOTTOM = '#E2D7C2';
const INK = '#17130C';
const INK_SOFT = '#6A6052';
const ORANGE = '#FF5A00';

type SceneReportCardProps = {
  eyebrow: string;
  titleSegments: EditorialSegment[];
  body: string;
  signalLine?: string;
  ctaLabel: string;
  onPress?: () => void;
};

/**
 * Warm paper editorial card — the mobile port of the web app's "What's moving
 * now" scene-report card. Deliberately breaks the all-dark UI with a printed-
 * zine surface: cream stock, ink type, an italic-serif accent, a signal count
 * and a solid-ink CTA. This is the platform's editorial voice made physical.
 */
export function SceneReportCard({ eyebrow, titleSegments, body, signalLine, ctaLabel, onPress }: SceneReportCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={ctaLabel}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <LinearGradient colors={[PAPER_TOP, PAPER_BOTTOM]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
      {/* faint printed-edge vignette */}
      <View pointerEvents="none" style={styles.vignette} />

      <View style={styles.eyebrowRow}>
        <View style={styles.rule} />
        <Text style={styles.eyebrow}>{eyebrow}</Text>
      </View>

      <EditorialTitle segments={titleSegments} size={25} lineHeight={29} color={INK} accentColor={ORANGE} style={styles.title} />
      <Text style={styles.body}>{body}</Text>
      {signalLine ? <Text style={styles.signal}>{signalLine}</Text> : null}

      <View style={styles.cta}>
        <Text style={styles.ctaText}>{ctaLabel}</Text>
        <MaterialIcons name="arrow-forward" size={15} color={PAPER_TOP} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 24,
    overflow: 'hidden',
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.08)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 26,
    shadowOffset: { width: 0, height: 16 },
  },
  pressed: { opacity: 0.95, transform: [{ scale: 0.994 }] },
  vignette: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    borderWidth: 8,
    borderColor: 'rgba(120,98,60,0.05)',
  },
  eyebrowRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 12 },
  rule: { width: 22, height: 2, borderRadius: 2, backgroundColor: ORANGE },
  eyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10.5, letterSpacing: 1.4, textTransform: 'uppercase' },
  title: { maxWidth: '95%' },
  body: { color: INK_SOFT, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20, marginTop: 10 },
  signal: { color: INK, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5, marginTop: 12 },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 16,
    backgroundColor: INK,
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 13,
    paddingVertical: 11,
  },
  ctaText: { color: PAPER_TOP, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12.5, letterSpacing: 0.3 },
});

export default SceneReportCard;
