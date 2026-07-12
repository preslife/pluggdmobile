import { useRef, useState } from 'react';
import { Animated, Image, Platform, type ImageProps, type ImageSourcePropType } from 'react-native';

type PluggdImageProps = Omit<ImageProps, 'source'> & {
  uri: string;
};

// On web, browser-cached images can complete before React attaches the
// load handlers, which would leave the fade-in stuck at opacity 0 — so the
// fade only runs on native, where onLoadEnd is reliable for cache hits.
const FADE_ENABLED = Platform.OS !== 'web';

export function PluggdImage({ uri, style, onLoadEnd, ...props }: PluggdImageProps) {
  const opacity = useRef(new Animated.Value(FADE_ENABLED ? 0 : 1)).current;
  const [loaded, setLoaded] = useState(!FADE_ENABLED);
  const source = { uri, cache: 'force-cache' } as ImageSourcePropType;

  return (
    <Animated.Image
      {...props}
      source={source}
      style={[style, { opacity: loaded ? opacity : 0 }]}
      onLoadEnd={() => {
        setLoaded(true);
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        onLoadEnd?.();
      }}
    />
  );
}

export { Image };
