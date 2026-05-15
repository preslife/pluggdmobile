import { useRef, useState } from 'react';
import { Animated, Image, type ImageProps, type ImageSourcePropType } from 'react-native';

type PluggdImageProps = Omit<ImageProps, 'source'> & {
  uri: string;
};

export function PluggdImage({ uri, style, onLoadEnd, ...props }: PluggdImageProps) {
  const opacity = useRef(new Animated.Value(0)).current;
  const [loaded, setLoaded] = useState(false);
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
