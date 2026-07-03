import { type StyleProp, type TextStyle } from 'react-native';
import { EditorialTitle, type EditorialSegment } from './EditorialTitle';

function accentLastWord(value?: string | null): EditorialSegment[] {
  const trimmed = (value || '').trim();
  if (!trimmed) return [{ text: value || '' }];
  const idx = trimmed.lastIndexOf(' ');
  if (idx < 0) return [{ text: trimmed, accent: true }];
  return [{ text: trimmed.slice(0, idx + 1) }, { text: trimmed.slice(idx + 1), accent: true }];
}

/**
 * Shared editorial detail-screen title — bold display type with the final word
 * in the brand's italic-serif orange accent. Gives every media detail (beat,
 * mix, event, sample pack, soundboard) the same signature headline as the
 * release detail, app-wide.
 */
export function DetailTitle({
  title,
  size = 34,
  lineHeight = 39,
  color = '#FFFFFF',
  accentColor = '#FF5A00',
  numberOfLines,
  style,
}: {
  title?: string | null;
  size?: number;
  lineHeight?: number;
  color?: string;
  accentColor?: string;
  numberOfLines?: number;
  style?: StyleProp<TextStyle>;
}) {
  return (
    <EditorialTitle
      segments={accentLastWord(title)}
      size={size}
      lineHeight={lineHeight}
      color={color}
      accentColor={accentColor}
      numberOfLines={numberOfLines}
      style={style}
    />
  );
}

export default DetailTitle;
