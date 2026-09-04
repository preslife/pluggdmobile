import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Image,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';
import { pluggdFonts } from '../../design/typography';
import {
  LiveGiftCatalogItem,
  LiveGiftEvent,
  safeGiftAssetUrl,
} from './liveGiftPresentation';

const PLUGGD_ORANGE = '#FF6600';
const FULL_EFFECT_DURATION_MS = 3400;
const STATIC_EFFECT_DURATION_MS = 1800;

function giftVisual(slug?: string | null): {
  icon: keyof typeof MaterialIcons.glyphMap;
  accent: string;
  colors: readonly [string, string, string];
} {
  const key = slug?.toLowerCase() ?? '';
  if (key.includes('applause') || key.includes('clap')) return { icon: 'celebration', accent: '#FFE7A6', colors: ['#FFB13B', '#FF5A36', '#761A4C'] };
  if (key.includes('spotlight') || key.includes('light')) return { icon: 'lightbulb', accent: '#FFF4B5', colors: ['#FFE970', '#F3A31F', '#5A2B0A'] };
  if (key.includes('crown') || key.includes('royal')) return { icon: 'workspace-premium', accent: '#FFF1A1', colors: ['#FFD84A', '#F59A23', '#5C2A0A'] };
  if (key.includes('fire') || key.includes('flame')) return { icon: 'local-fire-department', accent: '#FFF0B4', colors: ['#FFD34E', '#FF5B21', '#631022'] };
  if (key.includes('star')) return { icon: 'star', accent: '#FFF1AA', colors: ['#FFD85B', '#FF8A25', '#681743'] };
  if (key.includes('rose') || key.includes('flower')) return { icon: 'local-florist', accent: '#FFE4EF', colors: ['#FF78AD', '#D82D74', '#561849'] };
  if (key.includes('bolt') || key.includes('boost')) return { icon: 'bolt', accent: '#F0E9FF', colors: ['#C9B2FF', '#8A63E8', '#34226E'] };
  return { icon: 'favorite', accent: '#FFE5EA', colors: ['#FF7287', '#D82E60', '#551431'] };
}

export function LiveGiftArtwork({
  gift,
  size,
  style,
}: {
  gift: LiveGiftCatalogItem | null;
  size: number;
  style?: StyleProp<ViewStyle>;
}) {
  const [thumbnailFailed, setThumbnailFailed] = useState(false);
  const visual = useMemo(() => giftVisual(gift?.slug), [gift?.slug]);
  const thumbnailUrl = safeGiftAssetUrl(gift?.thumbnail_url);

  useEffect(() => {
    setThumbnailFailed(false);
  }, [gift?.id, thumbnailUrl]);

  return (
    <LinearGradient
      colors={visual.colors}
      start={{ x: 0.08, y: 0 }}
      end={{ x: 0.94, y: 1 }}
      style={[
        styles.artwork,
        { width: size, height: size, borderRadius: Math.max(16, size * 0.24) },
        style,
      ]}
    >
      <View style={styles.artworkHalo} />
      <View style={styles.artworkRing} />
      <MaterialIcons name={visual.icon} size={Math.round(size * 0.52)} color={visual.accent} style={styles.artworkIcon} />
      {thumbnailUrl && !thumbnailFailed ? (
        <Image
          accessibilityIgnoresInvertColors
          onError={() => setThumbnailFailed(true)}
          resizeMode="cover"
          source={{ uri: thumbnailUrl }}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
    </LinearGradient>
  );
}

export function LiveGiftOverlay({
  event,
  senderName,
  hostName,
  pendingCount,
  reducedMotion,
  onComplete,
}: {
  event: LiveGiftEvent | null;
  senderName: string;
  hostName: string;
  pendingCount: number;
  reducedMotion: boolean;
  onComplete: (eventId: string) => void;
}) {
  const progress = useRef(new Animated.Value(0)).current;
  const announcedEventIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (!event) return;
    const eventId = event.id;
    const giftName = event.gift?.label ?? 'a live gift';
    const quantity = Math.max(1, event.quantity);
    const quantityCopy = quantity > 1 ? `${quantity} ${giftName} gifts` : giftName;
    if (announcedEventIdRef.current !== eventId) {
      announcedEventIdRef.current = eventId;
      AccessibilityInfo.announceForAccessibility(
        `${senderName} sent ${quantityCopy} to support ${hostName}.`,
      );
    }

    progress.stopAnimation();
    progress.setValue(reducedMotion ? 1 : 0);

    if (reducedMotion) {
      const timeout = setTimeout(() => onComplete(eventId), STATIC_EFFECT_DURATION_MS);
      return () => clearTimeout(timeout);
    }

    const animation = Animated.timing(progress, {
      toValue: 1,
      duration: FULL_EFFECT_DURATION_MS,
      useNativeDriver: true,
    });
    animation.start(({ finished }) => {
      if (finished) onComplete(eventId);
    });
    return () => animation.stop();
    // Sender and host changes update the visible copy without announcing the same durable event twice.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event?.id, progress, reducedMotion]);

  if (!event) return null;

  const giftName = event.gift?.label ?? 'Live gift';
  const quantity = Math.max(1, event.quantity);
  const opacity = reducedMotion
    ? 1
    : progress.interpolate({
        inputRange: [0, 0.08, 0.82, 1],
        outputRange: [0, 1, 1, 0],
      });
  const cardScale = reducedMotion
    ? 1
    : progress.interpolate({
        inputRange: [0, 0.12, 0.28, 1],
        outputRange: [0.78, 1.05, 1, 0.96],
      });
  const cardY = reducedMotion
    ? 0
    : progress.interpolate({ inputRange: [0, 0.18, 1], outputRange: [24, 0, -10] });
  const burstScale = reducedMotion
    ? 1
    : progress.interpolate({ inputRange: [0, 0.28, 1], outputRange: [0.35, 1.18, 1.34] });
  const burstOpacity = reducedMotion
    ? 0.34
    : progress.interpolate({ inputRange: [0, 0.1, 0.62, 1], outputRange: [0, 0.72, 0.28, 0] });
  const spin = progress.interpolate({ inputRange: [0, 1], outputRange: ['-10deg', '18deg'] });

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      pointerEvents="none"
      style={styles.overlayRoot}
    >
      <Animated.View
        style={[
          styles.burst,
          { opacity: burstOpacity, transform: [{ scale: burstScale }, { rotate: spin }] },
        ]}
      >
        <View style={[styles.spark, styles.sparkOne]} />
        <View style={[styles.spark, styles.sparkTwo]} />
        <View style={[styles.spark, styles.sparkThree]} />
        <View style={[styles.spark, styles.sparkFour]} />
      </Animated.View>

      <Animated.View
        style={[
          styles.card,
          { opacity, transform: [{ translateY: cardY }, { scale: cardScale }] },
        ]}
      >
        <View style={styles.accentLine} />
        {pendingCount > 0 ? (
          <View style={styles.queueBadge}>
            <Text maxFontSizeMultiplier={1.2} style={styles.queueBadgeText}>+{pendingCount} queued</Text>
          </View>
        ) : null}
        <LiveGiftArtwork gift={event.gift} size={104} />
        <View style={styles.copy}>
          <Text maxFontSizeMultiplier={1.3} style={styles.eyebrow}>LIVE SUPPORT</Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={2} style={styles.giftName}>
            {giftName}{quantity > 1 ? ` ×${quantity}` : ''}
          </Text>
          <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.sender}>
            {senderName}
          </Text>
          <View style={styles.supportRow}>
            <MaterialIcons name="favorite" size={14} color="#FFB487" />
            <Text maxFontSizeMultiplier={1.3} numberOfLines={1} style={styles.supportCopy}>
              Supporting {hostName}
            </Text>
          </View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlayRoot: {
    position: 'absolute',
    top: 132,
    right: 78,
    bottom: 206,
    left: 12,
    zIndex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  burst: {
    position: 'absolute',
    width: 252,
    height: 252,
    borderRadius: 126,
    borderWidth: 2,
    borderColor: 'rgba(255,181,127,0.72)',
    backgroundColor: 'rgba(255,102,0,0.14)',
  },
  spark: {
    position: 'absolute',
    width: 10,
    height: 28,
    borderRadius: 999,
    backgroundColor: '#FFD6A1',
  },
  sparkOne: { left: 121, top: -17 },
  sparkTwo: { right: 4, top: 55, transform: [{ rotate: '58deg' }] },
  sparkThree: { left: 18, bottom: 22, transform: [{ rotate: '-48deg' }] },
  sparkFour: { right: 26, bottom: 6, transform: [{ rotate: '32deg' }] },
  card: {
    width: '100%',
    maxWidth: 320,
    minHeight: 142,
    overflow: 'hidden',
    borderRadius: 26,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.24)',
    backgroundColor: 'rgba(17,10,7,0.94)',
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    shadowColor: '#000000',
    shadowOpacity: 0.46,
    shadowRadius: 22,
    shadowOffset: { width: 0, height: 12 },
    elevation: 18,
  },
  accentLine: {
    position: 'absolute',
    top: 0,
    right: 0,
    left: 0,
    height: 4,
    backgroundColor: PLUGGD_ORANGE,
  },
  queueBadge: {
    position: 'absolute',
    top: 11,
    right: 11,
    zIndex: 2,
    borderRadius: 999,
    backgroundColor: 'rgba(255,102,0,0.92)',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  queueBadgeText: {
    color: '#180A02',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 8.5,
    letterSpacing: 0.2,
  },
  artwork: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkHalo: {
    position: 'absolute',
    width: '118%',
    height: '118%',
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.14)',
    top: '-52%',
    right: '-38%',
  },
  artworkRing: {
    position: 'absolute',
    width: '72%',
    height: '72%',
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.32)',
  },
  artworkIcon: {
    textShadowColor: 'rgba(0,0,0,0.34)',
    textShadowOffset: { width: 0, height: 4 },
    textShadowRadius: 8,
  },
  copy: { flex: 1, minWidth: 0 },
  eyebrow: {
    color: '#FF9D63',
    fontFamily: pluggdFonts.satoshiBlack,
    fontSize: 9,
    letterSpacing: 1.6,
  },
  giftName: {
    color: '#FFF8ED',
    fontFamily: pluggdFonts.displayExtraBold,
    fontSize: 24,
    lineHeight: 27,
    letterSpacing: -0.5,
    marginTop: 4,
  },
  sender: {
    color: '#FFFFFF',
    fontFamily: pluggdFonts.satoshiBold,
    fontSize: 13,
    marginTop: 5,
  },
  supportRow: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 7,
  },
  supportCopy: {
    flex: 1,
    color: '#D9C7BB',
    fontFamily: pluggdFonts.satoshiMedium,
    fontSize: 11,
  },
});
