import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { selectionHaptic } from '../src/design/haptics';
import { pluggdFonts } from '../src/design/typography';
import { EditorialTitle } from './EditorialTitle';

const PAPER_TOP = '#EFE7D7';
const PAPER_BOTTOM = '#E2D7C2';
const INK = '#17130C';
const INK_SOFT = '#6A6052';
const ORANGE = '#FF5A00';

export type PulseStat = { value: number; label: string };

/**
 * Warm editorial "pulse" band — the mobile port of NewHome2's "What's moving
 * right now" section. Big ink counts of live activity on a printed-zine surface,
 * so the all-dark feed gets the web home's magazine rhythm and a live heartbeat.
 */
export function WhatsMovingNow({ stats, onPress }: { stats: PulseStat[]; onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? "See what's moving on PLUGGD" : undefined}
      disabled={!onPress}
      onPress={() => {
        if (!onPress) return;
        selectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && Boolean(onPress) && styles.pressed]}
    >
      <LinearGradient colors={[PAPER_TOP, PAPER_BOTTOM]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.vignette} />

      <View style={styles.eyebrowRow}>
        <View style={styles.rule} />
        <Text style={styles.eyebrow}>The pulse · live count</Text>
      </View>

      <EditorialTitle
        segments={[{ text: "What's moving " }, { text: 'right now', accent: true }]}
        size={25}
        lineHeight={29}
        color={INK}
        accentColor={ORANGE}
        style={styles.title}
      />

      <View style={styles.grid}>
        {stats.map((stat, index) => (
          <View key={stat.label} style={[styles.cell, index % 2 === 0 && styles.cellLeft, index < 2 && styles.cellTop]}>
            <Text style={styles.value}>{stat.value}</Text>
            <Text style={styles.label} numberOfLines={2}>{stat.label}</Text>
          </View>
        ))}
      </View>

      {onPress ? (
        <View style={styles.cta}>
          <Text style={styles.ctaText}>See what's moving</Text>
          <MaterialIcons name="arrow-forward" size={15} color={PAPER_TOP} />
        </View>
      ) : null}
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
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 18,
  },
  cell: {
    width: '50%',
    paddingVertical: 14,
    paddingHorizontal: 4,
    borderColor: 'rgba(23,19,12,0.12)',
  },
  cellLeft: { paddingLeft: 0, paddingRight: 14 },
  cellTop: { borderBottomWidth: StyleSheet.hairlineWidth },
  value: { color: INK, fontFamily: pluggdFonts.displayExtraBold, fontSize: 40, lineHeight: 44, letterSpacing: -1 },
  label: { color: INK_SOFT, fontFamily: pluggdFonts.satoshiBold, fontSize: 11, letterSpacing: 0.6, textTransform: 'uppercase', marginTop: 2 },
  cta: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    marginTop: 18,
    backgroundColor: INK,
    borderRadius: 999,
    paddingLeft: 16,
    paddingRight: 13,
    paddingVertical: 11,
  },
  pressed: { opacity: 0.95, transform: [{ scale: 0.994 }] },
  ctaText: { color: PAPER_TOP, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12.5, letterSpacing: 0.3 },
});

export default WhatsMovingNow;
