import { Text, type StyleProp, type TextStyle } from 'react-native';
import { pluggdFonts } from '../src/design/typography';

export type EditorialSegment = { text: string; accent?: boolean };

type EditorialTitleProps = {
  /** Ordered text segments; mark the word(s) to italicise + accent with `accent: true`. */
  segments: EditorialSegment[];
  size?: number;
  lineHeight?: number;
  color?: string;
  accentColor?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
};

/**
 * The PLUGGD signature headline: a bold Sora display line with an italic-serif
 * accent word in the brand orange — the mobile port of the web app's
 * "Where music culture comes alive" / "Find what's moving." treatment.
 */
export function EditorialTitle({
  segments,
  size = 32,
  lineHeight,
  color = '#FFFFFF',
  accentColor = '#FF5A00',
  numberOfLines,
  style,
}: EditorialTitleProps) {
  const lh = lineHeight ?? Math.round(size * 1.06);
  return (
    <Text
      numberOfLines={numberOfLines}
      style={[
        { color, fontFamily: pluggdFonts.displayExtraBold, fontSize: size, lineHeight: lh, letterSpacing: -0.6 },
        style,
      ]}
    >
      {segments.map((seg, i) =>
        seg.accent ? (
          <Text key={i} style={{ color: accentColor, fontFamily: pluggdFonts.serifItalicBold, letterSpacing: 0 }}>
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
