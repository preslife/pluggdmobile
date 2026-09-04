import {
  Image,
  type ImageStyle,
  type StyleProp,
} from 'react-native';
import { FilterImage, type Filters } from 'react-native-svg/filter-image';
import { usePluggdTheme } from '../src/design/usePluggdTheme';

const darkLogo = require('../assets/brand/pluggd-logo-dark.png');
const lightLogo = require('../assets/brand/pluggd-logo-light.png');

const editorialInkFilter: Filters = [{
  name: 'feColorMatrix',
  type: 'matrix',
  // The supplied variants share white letters and an orange plug. Blue is the
  // discriminating channel, so this maps white to editorial ink while leaving
  // the orange brand mark unchanged and preserving the original alpha mask.
  values: [
    1, 0, -0.9, 0, 0,
    0, 1, -0.92, 0, 0,
    0, 0, 0.08, 0, 0,
    0, 0, 0, 1, 0,
  ],
}];

type BrandLogoVariant = 'auto' | 'dark' | 'light';

type BrandLogoProps = {
  width?: number;
  height?: number;
  variant?: BrandLogoVariant;
  style?: StyleProp<ImageStyle>;
};

export function BrandLogo({
  width = 112,
  height = 34,
  variant = 'auto',
  style,
}: BrandLogoProps) {
  const theme = usePluggdTheme();
  const useLightLogo = variant === 'light' || (variant === 'auto' && theme.scheme === 'light');

  if (useLightLogo) {
    return (
      <FilterImage
        accessibilityIgnoresInvertColors
        accessibilityLabel="Pluggd"
        resizeMode="contain"
        source={lightLogo}
        filters={editorialInkFilter}
        style={[{ width, height }, style]}
      />
    );
  }

  return (
    <Image
      accessibilityIgnoresInvertColors
      accessibilityLabel="Pluggd"
      resizeMode="contain"
      source={darkLogo}
      style={[{ width, height }, style]}
    />
  );
}
