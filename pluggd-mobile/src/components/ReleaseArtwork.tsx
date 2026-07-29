import { type ImageSourcePropType, type ImageStyle, type StyleProp } from 'react-native';
import { PluggdImage } from './PluggdImage';

type ReleaseArtworkProps = {
  uri: string;
  style: StyleProp<ImageStyle>;
  fallbackSource?: ImageSourcePropType;
  displayWidth?: number;
};

/** Consistent edge-to-edge treatment for release artwork across public surfaces. */
export function ReleaseArtwork({
  uri,
  style,
  fallbackSource,
  displayWidth = 800,
}: ReleaseArtworkProps) {
  return (
    <PluggdImage
      uri={uri}
      fallbackSource={fallbackSource}
      displayWidth={displayWidth}
      resizeMode="cover"
      style={style}
    />
  );
}
