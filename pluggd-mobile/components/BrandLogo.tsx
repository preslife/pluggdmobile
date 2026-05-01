import {
  Image,
  type ImageStyle,
  type StyleProp,
  useColorScheme,
} from 'react-native';

const darkLogo = require('../assets/brand/pluggd-logo-dark.png');
const lightLogo = require('../assets/brand/pluggd-logo-light.png');

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
  const colorScheme = useColorScheme();
  const useLightLogo = variant === 'light' || (variant === 'auto' && colorScheme === 'light');

  return (
    <Image
      accessibilityIgnoresInvertColors
      accessibilityLabel="Pluggd"
      resizeMode="contain"
      source={useLightLogo ? lightLogo : darkLogo}
      style={[{ width, height }, style]}
    />
  );
}
