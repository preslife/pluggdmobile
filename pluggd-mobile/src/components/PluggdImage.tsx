import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Image, Platform, type ImageProps, type ImageSourcePropType } from 'react-native';
import {
  imageDisplayWidthForDevice,
  isLowMemoryAndroidImageTarget,
  lowMemoryImageLoadScheduler,
} from './lowMemoryImagePolicy';

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
const DEFAULT_FALLBACK = require('../../assets/brand/pluggd-logo-dark.png');

/** Supabase image-transform URL for public storage objects; null when not transformable. */
export function transformedUri(uri: string, width: number): string | null {
  if (!uri || !uri.includes(STORAGE_PUBLIC_PATH)) return null;
  const base = uri.replace(STORAGE_PUBLIC_PATH, STORAGE_RENDER_PATH);
  // Supabase's renderer can retain the source pixel height when only `width`
  // is supplied, producing a distorted derivative (for example 520×3000
  // from a 3000×3000 cover). `resize=contain` preserves the source aspect
  // ratio while still serving the requested display width.
  return `${base}${base.includes('?') ? '&' : '?'}width=${Math.round(width)}&resize=contain&quality=80`;
}

// On web, browser-cached images can complete before React attaches the
// load handlers, which would leave the fade-in stuck at opacity 0 — so the
// fade only runs on native, where onLoadEnd is reliable for cache hits.
const FADE_ENABLED = Platform.OS !== 'web';
const LOW_MEMORY_ANDROID_TARGET = isLowMemoryAndroidImageTarget(Platform.OS, Platform.Version);
const LOW_MEMORY_SLOT_TIMEOUT_MS = 20_000;

export function PluggdImage({
  uri,
  fallbackSource,
  style,
  onLoadEnd,
  onError,
  displayWidth = 800,
  resizeMode,
  ...props
}: PluggdImageProps) {
  const opacity = useRef(new Animated.Value(FADE_ENABLED ? 0 : 1)).current;
  const [loaded, setLoaded] = useState(!FADE_ENABLED);
  const [loadAllowed, setLoadAllowed] = useState(!LOW_MEMORY_ANDROID_TARGET);
  const slotReleaseRef = useRef<(() => void) | null>(null);
  const slotTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Falls back to the original object URL if the transform endpoint ever
  // rejects a request (unsupported format, transforms disabled, …).
  const [transformFailedFor, setTransformFailedFor] = useState<string | null>(null);
  const [originalFailedFor, setOriginalFailedFor] = useState<string | null>(null);
  const releaseLowMemorySlot = useCallback(() => {
    if (slotTimeoutRef.current) {
      clearTimeout(slotTimeoutRef.current);
      slotTimeoutRef.current = null;
    }
    slotReleaseRef.current?.();
    slotReleaseRef.current = null;
  }, []);

  useEffect(() => {
    if (!LOW_MEMORY_ANDROID_TARGET || !uri) {
      setLoadAllowed(true);
      return undefined;
    }

    setLoaded(false);
    setLoadAllowed(false);
    opacity.setValue(0);
    const cancel = lowMemoryImageLoadScheduler.schedule((release) => {
      slotReleaseRef.current = release;
      slotTimeoutRef.current = setTimeout(releaseLowMemorySlot, LOW_MEMORY_SLOT_TIMEOUT_MS);
      setLoadAllowed(true);
    });

    return () => {
      cancel();
      releaseLowMemorySlot();
    };
  }, [opacity, releaseLowMemorySlot, uri]);

  const effectiveDisplayWidth = imageDisplayWidthForDevice(displayWidth, LOW_MEMORY_ANDROID_TARGET);
  const resized = uri && transformFailedFor !== uri ? transformedUri(uri, effectiveDisplayWidth) : null;
  const usingFallback = !uri || originalFailedFor === uri;
  const usingDefaultFallback = usingFallback && !fallbackSource;
  const source = (usingFallback
    ? fallbackSource || DEFAULT_FALLBACK
    : { uri: resized || uri, cache: 'force-cache' }) as ImageSourcePropType;

  if (LOW_MEMORY_ANDROID_TARGET && !loadAllowed) {
    return <Animated.View style={[style as any, { backgroundColor: '#17130F' }]} />;
  }

  return (
    <Animated.Image
      {...props}
      source={source}
      resizeMode={usingDefaultFallback ? 'contain' : resizeMode}
      style={[
        style,
        usingDefaultFallback && { backgroundColor: '#0B0A09' },
        { opacity: loaded ? opacity : 0 },
      ]}
      onError={(event) => {
        if (!usingFallback && resized) {
          setTransformFailedFor(uri);
          return;
        }
        if (!usingFallback) {
          opacity.setValue(0);
          setLoaded(false);
          setOriginalFailedFor(uri);
          return;
        }
        releaseLowMemorySlot();
        onError?.(event);
      }}
      onLoadEnd={() => {
        setLoaded(true);
        Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }).start();
        releaseLowMemorySlot();
        onLoadEnd?.();
      }}
    />
  );
}

export { Image };
