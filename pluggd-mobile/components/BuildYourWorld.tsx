import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { StyleSheet, Text, View } from 'react-native';
import { pluggdFonts } from '../src/design/typography';
import { EditorialTitle } from './EditorialTitle';

const PAPER_TOP = '#EFE7D7';
const PAPER_BOTTOM = '#E2D7C2';
const INK = '#17130C';
const INK_SOFT = '#6A6052';
const ORANGE = '#FF5A00';

type Tool = { icon: keyof typeof MaterialIcons.glyphMap; title: string; copy: string };

const TOOLS: Tool[] = [
  { icon: 'celebration', title: 'Listening Parties', copy: 'Ticketed rooms and community funding for the moments fans already want.' },
  { icon: 'handshake', title: 'Co-production', copy: 'Secure rights and collaborate without losing the story behind the sound.' },
  { icon: 'pie-chart', title: 'Transparent Splits', copy: 'Retain master rights and make who owns what visible from day one.' },
];

/**
 * Warm "Build your world" creator-tools section — mobile port of NewHome2's
 * paper build section. Keeps the exact web brand-voice copy and the printed-zine
 * treatment so the dark feed gets the web home's dark↔cream editorial rhythm.
 */
export function BuildYourWorld() {
  return (
    <View style={styles.card}>
      <LinearGradient colors={[PAPER_TOP, PAPER_BOTTOM]} start={{ x: 0, y: 0 }} end={{ x: 0.4, y: 1 }} style={StyleSheet.absoluteFill} />
      <View pointerEvents="none" style={styles.vignette} />

      <View style={styles.eyebrowRow}>
        <View style={styles.rule} />
        <Text style={styles.eyebrow}>Creator tool</Text>
      </View>

      <EditorialTitle
        segments={[{ text: 'Build your ' }, { text: 'world', accent: true }]}
        size={25}
        lineHeight={29}
        color={INK}
        accentColor={ORANGE}
        style={styles.title}
      />
      <Text style={styles.subline}>
        Run listening parties, collaborations, rights, and revenue without losing the culture around them.
      </Text>

      <View style={styles.tools}>
        {TOOLS.map((tool) => (
          <View key={tool.title} style={styles.tool}>
            <View style={styles.toolIcon}>
              <MaterialIcons name={tool.icon} size={19} color={INK} />
            </View>
            <View style={styles.toolBody}>
              <Text style={styles.toolTitle}>{tool.title}</Text>
              <Text style={styles.toolCopy}>{tool.copy}</Text>
            </View>
          </View>
        ))}
      </View>
    </View>
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
  subline: { color: INK_SOFT, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20, marginTop: 10 },
  tools: { marginTop: 18, gap: 16 },
  tool: { flexDirection: 'row', gap: 13, alignItems: 'flex-start' },
  toolIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(23,19,12,0.06)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(23,19,12,0.14)',
  },
  toolBody: { flex: 1, minWidth: 0, gap: 2 },
  toolTitle: { color: INK, fontFamily: pluggdFonts.displayBold, fontSize: 15.5, letterSpacing: -0.2 },
  toolCopy: { color: INK_SOFT, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 17 },
});

export default BuildYourWorld;
