/**
 * Shared editorial primitives — direct ports of the pluggd.fm public
 * visual system (dark/cream rhythm, Instrument Serif titles, JetBrains
 * Mono data labels, torn paper edges, corkboard pieces).
 */
import { MaterialIcons } from '@expo/vector-icons';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type PressableProps,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import { ed, edFonts } from '../../design/editorial';
import { impactHaptic, selectionHaptic } from '../../design/haptics';

/** The app-wide pressed treatment (matches the GlassDock tab feel). */
export const ED_PRESSED = { opacity: 0.86, transform: [{ scale: 0.985 }] } as const;

/**
 * Pressable with the shared editorial press feedback: the standard
 * dim+shrink visual plus a selection haptic tick. Drop-in replacement
 * for Pressable across the editorial surfaces.
 */
export function EdPressable({ style, onPress, haptic = true, ...props }: PressableProps & { haptic?: boolean }) {
  return (
    <Pressable
      {...props}
      onPress={(event: GestureResponderEvent) => {
        if (haptic) selectionHaptic();
        onPress?.(event);
      }}
      style={(state) => [
        typeof style === 'function' ? style(state) : style,
        state.pressed ? ED_PRESSED : null,
      ]}
    />
  );
}

/** Tracked mono uppercase label — orange on night, brown-ink on paper. */
export function Eyebrow({ text, onPaper = false, color, style }: { text: string; onPaper?: boolean; color?: string; style?: StyleProp<TextStyle> }) {
  return (
    <Text style={[bits.eyebrow, { color: color || ed.orange }, onPaper && !color ? { color: ed.orange } : null, style]}>
      {text.toUpperCase()}
    </Text>
  );
}

/** Instrument Serif display title. Pass `caps` for the ALL-CAPS section voice. */
export function SerifTitle({
  text,
  size = 27,
  onPaper = false,
  caps = false,
  style,
  accent,
}: {
  text: string;
  size?: number;
  onPaper?: boolean;
  caps?: boolean;
  style?: StyleProp<TextStyle>;
  /** Optional trailing italic-orange emphasis segment. */
  accent?: string;
}) {
  const base: TextStyle = {
    fontFamily: edFonts.serif,
    fontSize: size,
    lineHeight: Math.round(size * 1.04),
    letterSpacing: caps ? 0.4 : -0.4,
    color: onPaper ? ed.ink : ed.cream,
  };
  return (
    <Text style={[base, style]}>
      {caps ? text.toUpperCase() : text}
      {accent ? (
        <Text style={{ fontFamily: edFonts.serifItalic, color: ed.orange }}>{caps ? accent.toUpperCase() : accent}</Text>
      ) : null}
    </Text>
  );
}

/** Body copy under section titles. */
export function SectionBody({ text, onPaper = false, style }: { text: string; onPaper?: boolean; style?: StyleProp<TextStyle> }) {
  return <Text style={[bits.body, { color: onPaper ? ed.inkMuted : ed.creamMuted }, style]}>{text}</Text>;
}

/**
 * Buttons render their fill on an inner View: react-native-web turns
 * Pressable into <button>, and the Tailwind preflight strips button
 * background-color at equal specificity, so the Pressable itself must
 * stay visually transparent.
 */
function PillButton({
  label,
  onPress,
  fillStyle,
  textColor,
  style,
}: {
  label: string;
  onPress?: () => void;
  fillStyle: StyleProp<ViewStyle>;
  textColor: string;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={() => {
        impactHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [bits.ctaTouch, style, pressed ? ED_PRESSED : null]}
    >
      <View style={[bits.cta, fillStyle]}>
        <Text style={[bits.ctaText, { color: textColor }]}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** pvs-cta — orange pill button. */
export function OrangeButton({ label, onPress, style }: { label: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return <PillButton label={label} onPress={onPress} fillStyle={bits.ctaOrange} textColor={ed.onOrange} style={style} />;
}

/** pvs-cta-secondary — outline pill on night, white pill on paper. */
export function GhostButton({ label, onPaper = false, onPress, style }: { label: string; onPaper?: boolean; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return (
    <PillButton
      label={label}
      onPress={onPress}
      fillStyle={onPaper ? bits.ctaPaper : bits.ctaGhost}
      textColor={onPaper ? ed.ink : ed.cream}
      style={style}
    />
  );
}

/** Cream pill button (web uses on dark cards: "Enter scene", "Read story"). */
export function CreamButton({ label, onPress, style }: { label: string; onPress?: () => void; style?: StyleProp<ViewStyle> }) {
  return <PillButton label={label} onPress={onPress} fillStyle={bits.ctaCream} textColor={ed.ink} style={style} />;
}

/** Small caps chip — dark pill on paper ("SUPPORT THIS SCENE", board meta chips). */
export function InkChip({ text, tone = 'ink', style }: { text: string; tone?: 'ink' | 'orange' | 'cream' | 'note'; style?: StyleProp<ViewStyle> }) {
  const palette = {
    ink: { backgroundColor: '#1d1712', color: ed.paper },
    orange: { backgroundColor: ed.orange, color: '#ffffff' },
    cream: { backgroundColor: ed.paper, color: ed.ink },
    note: { backgroundColor: ed.note, color: ed.ink },
  }[tone];
  return (
    <View style={[bits.chip, { backgroundColor: palette.backgroundColor }, style]}>
      <Text style={[bits.chipText, { color: palette.color }]}>{text.toUpperCase()}</Text>
    </View>
  );
}

/**
 * Torn paper edge between night and paper sections.
 * Renders paper-coloured teeth over whatever sits above it.
 */
export function TornEdge({ flip = false, color = ed.paper2 }: { flip?: boolean; color?: string }) {
  const teeth = Array.from({ length: 26 });
  return (
    <View style={[bits.tornRow, flip ? { transform: [{ rotate: '180deg' }] } : null]} pointerEvents="none">
      {teeth.map((_, index) => (
        <View
          key={index}
          style={[
            bits.tooth,
            { backgroundColor: color },
            index % 3 === 0 ? { height: 9 } : index % 3 === 1 ? { height: 12 } : { height: 7 },
          ]}
        />
      ))}
    </View>
  );
}

/** Corkboard pushpin. */
export function Pushpin({ style }: { style?: StyleProp<ViewStyle> }) {
  return (
    <View style={[bits.pin, style]}>
      <View style={bits.pinHighlight} />
    </View>
  );
}

/** Masking-tape strip used on polaroids. */
export function Tape({ style }: { style?: StyleProp<ViewStyle> }) {
  return <View style={[bits.tape, style]} />;
}

/** Static waveform ticks (deterministic, seeded by length). */
export function WaveTicks({
  bars = 27,
  color = ed.orange,
  height = 26,
  style,
  seed = 7,
}: {
  bars?: number;
  color?: string;
  height?: number;
  style?: StyleProp<ViewStyle>;
  seed?: number;
}) {
  const items = Array.from({ length: bars }, (_, index) => {
    const wave = Math.abs(Math.sin((index + seed) * 1.7)) * 0.72 + Math.abs(Math.cos((index + seed) * 0.9)) * 0.28;
    return Math.max(0.18, Math.min(1, wave));
  });
  return (
    <View style={[bits.waveRow, { height }, style]}>
      {items.map((value, index) => (
        <View key={index} style={[bits.waveBar, { height: Math.max(3, Math.round(value * height)), backgroundColor: color }]} />
      ))}
    </View>
  );
}

/** Dark rounded audio pill with a play control + waveform ("audio" cards). */
export function AudioPill({
  label = 'audio',
  playing = false,
  onPress,
  light = false,
  style,
}: {
  label?: string;
  playing?: boolean;
  onPress?: () => void;
  light?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={playing ? 'Pause audio preview' : 'Play audio preview'}
      onPress={() => {
        selectionHaptic();
        onPress?.();
      }}
      style={({ pressed }) => [style, pressed ? ED_PRESSED : null]}
    >
      <View style={[bits.audioPill, light ? bits.audioPillLight : null]}>
        <View style={[bits.audioPlay, light ? { backgroundColor: ed.orange } : null]}>
          <MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={20} color={light ? '#ffffff' : ed.ink} />
        </View>
        <WaveTicks bars={22} color={light ? ed.orange : 'rgba(255,248,237,0.55)'} height={22} style={{ flex: 1 }} />
        <Text style={[bits.audioLabel, light ? { color: ed.inkSoft } : null]}>{label}</Text>
      </View>
    </Pressable>
  );
}

/** Yellow lined sticky note. */
export function StickyNote({
  title,
  body,
  rotate = '-2deg',
  showLabel = true,
  style,
}: {
  title: string;
  body?: string | null;
  rotate?: string;
  showLabel?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return (
    <View style={[bits.note, { transform: [{ rotate }] }, style]}>
      {showLabel ? <Text style={bits.noteLabel}>NOTE</Text> : null}
      <Text style={bits.noteTitle} numberOfLines={3}>{title}</Text>
      {body ? <Text style={bits.noteBody} numberOfLines={3}>{body}</Text> : null}
    </View>
  );
}

const bits = StyleSheet.create({
  eyebrow: {
    fontFamily: edFonts.mono,
    fontSize: 11,
    letterSpacing: 2.2,
    textTransform: 'uppercase',
  },
  body: {
    fontFamily: edFonts.bodyMedium,
    fontSize: 14.5,
    lineHeight: 21,
  },
  ctaTouch: {
    alignSelf: 'flex-start',
  },
  cta: {
    minHeight: 44,
    borderRadius: 999,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  ctaOrange: {
    backgroundColor: ed.orange,
    borderWidth: 1,
    borderColor: 'rgba(255, 102, 0, 0.72)',
    shadowColor: ed.orange,
    shadowOpacity: 0.28,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
  },
  ctaGhost: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderWidth: 1,
    borderColor: ed.nightLine,
  },
  ctaPaper: {
    backgroundColor: 'rgba(255,255,255,0.72)',
    borderWidth: 1,
    borderColor: ed.paperLine,
  },
  ctaCream: {
    backgroundColor: ed.paper2,
    borderWidth: 1,
    borderColor: 'rgba(239, 224, 200, 0.5)',
  },
  ctaText: {
    fontFamily: edFonts.bodyBlack,
    fontSize: 13.5,
    letterSpacing: 0.1,
  },
  chip: {
    borderRadius: 999,
    paddingHorizontal: 11,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  chipText: {
    fontFamily: edFonts.bodyBlack,
    fontSize: 9.5,
    letterSpacing: 1.1,
  },
  tornRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 12,
    overflow: 'hidden',
  },
  tooth: {
    width: 9,
    borderTopLeftRadius: 2,
    borderTopRightRadius: 2,
  },
  pin: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#d3541e',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.35)',
    shadowColor: '#000',
    shadowOpacity: 0.4,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 2 },
    alignItems: 'flex-start',
    justifyContent: 'flex-start',
  },
  pinHighlight: {
    width: 5,
    height: 5,
    borderRadius: 2.5,
    marginTop: 3,
    marginLeft: 3,
    backgroundColor: 'rgba(255,255,255,0.65)',
  },
  tape: {
    width: 46,
    height: 14,
    backgroundColor: 'rgba(214, 196, 158, 0.85)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(91, 56, 31, 0.25)',
    transform: [{ rotate: '-3deg' }],
  },
  waveRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2.5,
    overflow: 'hidden',
  },
  waveBar: {
    width: 2.5,
    borderRadius: 1.5,
  },
  audioPill: {
    minHeight: 56,
    borderRadius: 16,
    backgroundColor: '#171310',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  audioPillLight: {
    backgroundColor: '#fffdf7',
    borderColor: 'rgba(91, 56, 31, 0.18)',
    shadowColor: '#5b381f',
    shadowOpacity: 0.18,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  audioPlay: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: ed.paper,
    alignItems: 'center',
    justifyContent: 'center',
  },
  audioLabel: {
    fontFamily: edFonts.bodyMedium,
    fontSize: 11.5,
    color: 'rgba(255,248,237,0.62)',
  },
  note: {
    backgroundColor: ed.note,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(120, 104, 34, 0.35)',
    padding: 12,
    shadowColor: '#4d3b12',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 5 },
    maxWidth: 190,
  },
  noteLabel: {
    fontFamily: edFonts.mono,
    fontSize: 9,
    letterSpacing: 1.6,
    color: 'rgba(34, 23, 15, 0.55)',
    marginBottom: 4,
  },
  noteTitle: {
    fontFamily: edFonts.bodyBlack,
    fontSize: 14,
    lineHeight: 18,
    color: ed.ink,
  },
  noteBody: {
    fontFamily: edFonts.bodyMedium,
    fontSize: 11.5,
    lineHeight: 15,
    color: 'rgba(34, 23, 15, 0.72)',
    marginTop: 4,
  },
});
