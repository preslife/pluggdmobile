import { Text, type StyleProp, type TextStyle } from 'react-native';
import { edFonts } from '../src/design/editorial';

export type EditorialSegment = { text: string; accent?: boolean };

type EditorialTitleProps = {
  /** Ordered text segments; mark the word(s) to accent with `accent: true`. */
  segments: EditorialSegment[];
  size?: number;
  lineHeight?: number;
  color?: string;
  accentColor?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
};

/**
 * Compatibility wrapper for segmented headlines in the selected redesign.
 * Both base and accent segments use the Sora display family; orange provides
 * emphasis without reviving the retired serif system.
 */
export function EditorialTitle({
  segments,
  size = 34,
  lineHeight,
  color = '#fff8ed',
  accentColor = '#ff6600',
  numberOfLines,
  style,
}: EditorialTitleProps) {
  const lh = lineHeight ?? Math.round(size * 1.02);
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { color, fontFamily: edFonts.serif, fontSize: size, lineHeight: lh, letterSpacing: -0.6 },
        style,
      ]}
    >
      {segments.map((seg, i) =>
        seg.accent ? (
          <Text key={i} style={{ color: accentColor, fontFamily: edFonts.serifItalic, letterSpacing: 0 }}>
            {seg.text}
          </Text>
        ) : (
          <Text key={i}>{seg.text}</Text>
        ),
      )}
    </Text>
  );
}

export default EditorialTitle;
