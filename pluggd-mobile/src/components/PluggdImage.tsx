import { useRef, useState } from 'react';
import { Animated, Image, Platform, type ImageProps, type ImageSourcePropType } from 'react-native';

type PluggdImageProps = Omit<ImageProps, 'source'> & {
  uri: string;
  /** Local branded artwork used when a remote image is absent or unavailable. */
  fallbackSource?: ImageSourcePropType;
  /**
   * Target render width in physical pixels for Supabase storage images.
   * 800px covers full-bleed art on a 390pt screen at 2x. Raw storage
   * uploads can be 6MB+, so serving resized variants is the difference
   * between a smooth scroll and a stutter.
   */
  displayWidth?: number;
};

const STORAGE_PUBLIC_PATH = '/storage/v1/object/public/';
const STORAGE_RENDER_PATH = '/storage/v1/render/image/public/';

/** Supabase image-transform URL for public storage objects; null when not transformable. */
export function transformedUri(uri: string, width: number): string | null {
  if (!uri || !uri.includes(STORAGE_PUBLIC_PATH)) return null;
  const base = uri.replace(STORAGE_PUBLIC_PATH, STORAGE_RENDER_PATH);
  return `${base}${base.includes('?') ? '&' : '?'}width=${Math.round(width)}&quality=80`;
}

// On web, browser-cached images can complete before React attaches the
// load handlers, which would leave the fade-in stuck at opacity 0 — so the
// fade only runs on native, where onLoadEnd is reliable for cache hits.
const FADE_ENABLED = Platform.OS !== 'web';

export function PluggdImage({
  uri,
  fallbackSource,
  style,
  onLoadEnd,
  onError,
  displayWidth = 800,
  ...props
}: PluggdImageProps) {
  const opacity = useRef(new Animated.Value(FADE_ENABLED ? 0 : 1)).current;
  const [loaded, setLoaded] = useState(!FADE_ENABLED);
  // Falls back to the original object URL if the transform endpoint ever
  // rejects a request (unsupported format, transforms disabled, …).
  const [transformFailedFor, setTransformFailedFor] = useState<string | null>(null);
  const [originalFailedFor, setOriginalFailedFor] = useState<string | null>(null);
  const resized = transformFailedFor === uri ? null : transformedUri(uri, displayWidth);
  const usingFallback = Boolean(fallbackSource && (!uri || originalFailedFor === uri));
  const source = (usingFallback ? fallbackSource : { uri: resized || uri, cache: 'force-cache' }) as ImageSourcePropType;

  return (
    <Animated.Image
      {...props}
      source={source}
      style={[style, { opacity: loaded ? opacity : 0 }]}
      onError={(event) => {
        if (resized) {
          setTransformFailedFor(uri);
          return;
        }
        if (fallbackSource && originalFailedFor !== uri) {
          opacity.setValue(0);
          setLoaded(false);
          setOriginalFailedFor(uri);
          return;
        }
        onError?.(event);
      }}
      onLoadEnd={() => {
        setLoaded(true);
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        onLoadEnd?.();
      }}
    />
  );
}

export { Image };
