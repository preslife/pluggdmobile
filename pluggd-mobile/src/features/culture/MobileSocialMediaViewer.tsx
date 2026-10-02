import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, AppState, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, PluggdImage } from '../../components/PluggdImage';
import { pluggdFonts } from '../../design/typography';
import type { MobileSocialPostPreview } from './mobileTypes';
import { usePlayback } from '../../context/PlaybackProvider';
import { musicError, musicPostId } from '../social-music/model';
import { musicPlayback } from '../social-music/service';
import { useReducedMotion } from '../../design/useReducedMotion';
import { boundedMediaTransform, containedMediaSize, MAX_MEDIA_ZOOM, mediaPageDirection } from './mediaZoomGeometry';

export type MobileSocialMediaSelection =
  | { kind: 'image'; index: number }
  | { kind: 'video' }
  | null;

type MobileSocialMediaViewerProps = {
  post: MobileSocialPostPreview;
  selection: MobileSocialMediaSelection;
  onSelectionChange: (selection: MobileSocialMediaSelection) => void;
};

function AndroidZoomableImage({ uri, label, width, height, aspectRatio, onPage }: {
  uri: string; label: string; width: number; height: number; aspectRatio: number; onPage: (direction: -1 | 1) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [zoomLevel, setZoomLevel] = useState(1);
  const scale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const pinchScale = useSharedValue(1);
  const focalImageX = useSharedValue(0);
  const focalImageY = useSharedValue(0);
  const panX = useSharedValue(0);
  const panY = useSharedValue(0);
  const panWasZoomed = useSharedValue(false);
  const image = containedMediaSize(width, height, aspectRatio);

  useEffect(() => {
    // Caption expansion and Android fold/rotation must not retain stale bounds.
    scale.value = 1; x.value = 0; y.value = 0; setZoomLevel(1);
  }, [width, height, aspectRatio, scale, x, y]);

  const gestures = useMemo(() => {
    const pinch = Gesture.Pinch()
      .onStart((event) => {
        pinchScale.value = scale.value;
        focalImageX.value = (event.focalX - width / 2 - x.value) / scale.value;
        focalImageY.value = (event.focalY - height / 2 - y.value) / scale.value;
      })
      .onUpdate((event) => {
        const zoom = Math.min(MAX_MEDIA_ZOOM, Math.max(1, pinchScale.value * event.scale));
        const next = boundedMediaTransform(zoom,
          event.focalX - width / 2 - focalImageX.value * zoom,
          event.focalY - height / 2 - focalImageY.value * zoom,
          image.width, image.height, width, height);
        scale.value = next.scale; x.value = next.x; y.value = next.y;
      })
      .onFinalize(() => {
        if (scale.value <= 1.01) { scale.value = 1; x.value = 0; y.value = 0; }
        runOnJS(setZoomLevel)(scale.value);
      });
    const pan = Gesture.Pan().maxPointers(1).minDistance(8)
      .onStart(() => {
        panX.value = x.value; panY.value = y.value; panWasZoomed.value = scale.value > 1.01;
      })
      .onUpdate((event) => {
        if (!panWasZoomed.value) return;
        const next = boundedMediaTransform(scale.value, panX.value + event.translationX, panY.value + event.translationY,
          image.width, image.height, width, height);
        x.value = next.x; y.value = next.y;
      })
      .onEnd((event, success) => {
        if (!success || panWasZoomed.value) return;
        const direction = mediaPageDirection(scale.value, event.translationX, event.translationY);
        if (direction) runOnJS(onPage)(direction);
      });
    return Gesture.Simultaneous(pinch, pan);
  }, [width, height, image.width, image.height, onPage, scale, x, y, pinchScale, focalImageX, focalImageY, panX, panY, panWasZoomed]);
  const transform = useAnimatedStyle(() => ({ transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }] }));
  const reset = () => {
    scale.value = reducedMotion ? 1 : withTiming(1, { duration: 120 });
    x.value = reducedMotion ? 0 : withTiming(0, { duration: 120 });
    y.value = reducedMotion ? 0 : withTiming(0, { duration: 120 });
    setZoomLevel(1);
  };

  return (
    // Android Modal content needs its own native gesture root.
    <GestureHandlerRootView style={styles.zoomViewport}>
      <GestureDetector gesture={gestures}>
        <View style={styles.androidZoomViewport} accessible accessibilityRole="adjustable" accessibilityLabel={label}
          accessibilityHint="Pinch to zoom. Drag a zoomed image to pan. Swipe a normal-size image to change attachments."
          accessibilityValue={{ min: 1, max: MAX_MEDIA_ZOOM, now: zoomLevel, text: `${zoomLevel.toFixed(1)} times zoom` }}
          accessibilityActions={[{ name: 'increment', label: 'Zoom in' }, { name: 'decrement', label: 'Zoom out' }]}
          onAccessibilityAction={(event) => {
            const next = boundedMediaTransform(scale.value + (event.nativeEvent.actionName === 'increment' ? 1 : -1), x.value, y.value,
              image.width, image.height, width, height);
            scale.value = next.scale; x.value = next.x; y.value = next.y; setZoomLevel(next.scale);
          }}>
          <Animated.View style={[{ width: image.width, height: image.height }, transform]}>
            <PluggdImage uri={uri} style={styles.media} resizeMode="contain" displayWidth={1800} accessible={false} />
          </Animated.View>
        </View>
      </GestureDetector>
      <Pressable accessibilityRole="button" accessibilityLabel="Reset image zoom" accessibilityState={{ disabled: zoomLevel === 1 }}
        disabled={zoomLevel === 1} onPress={reset} style={[styles.zoomReset, zoomLevel === 1 && styles.zoomResetDisabled]}>
        <MaterialIcons name="zoom-out-map" size={18} color="#FFFFFF" /><Text style={styles.zoomResetText}>Reset zoom</Text>
      </Pressable>
    </GestureHandlerRootView>
  );
}

function FullScreenVideo({ uri }: { uri: string }) {
  const { pause } = usePlayback();
  const [source, setSource] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const player = useVideoPlayer(null, (instance) => {
    instance.loop = false;
    instance.staysActiveInBackground = false;
    instance.audioMixingMode = 'doNotMix';
  });
  useEffect(() => {
    let active = true;
    const controller = new AbortController();
    setSource(null); setError(''); player.pause();
    const postId = musicPostId(uri);
    const load = async () => {
      const next = postId ? await musicPlayback(postId, controller.signal) : uri;
      if (!active) return;
      await player.replaceAsync(next);
      if (active) setSource(next);
    };
    void load().catch(error => { if (active) setError(musicError(error)); });
    const playing = player.addListener('playingChange', event => { if (event.isPlaying) void pause(); });
    const status = player.addListener('statusChange', event => { if (event.status === 'error' && active) setError('This video could not be played. Please try again.'); });
    const background = AppState.addEventListener('change', state => { if (state !== 'active') player.pause(); });
    // The hook stops/releases its native player on unmount; it may already be released here.
    return () => { active = false; controller.abort(); playing.remove(); status.remove(); background.remove(); };
  }, [uri, retry, player, pause]);
  if (error) return <View style={[styles.media, { alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24 }]}>
    <Text accessibilityRole="alert" style={{ color: '#FFFFFF', textAlign: 'center' }}>{error}</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="Retry video playback" onPress={() => setRetry(value => value + 1)} style={{ minHeight: 44, padding: 12 }}><Text style={{ color: '#FF6600' }}>Try again</Text></Pressable>
  </View>;
  if (!source) return <View style={[styles.media, { alignItems: 'center', justifyContent: 'center' }]}><ActivityIndicator color="#FF6600" accessibilityLabel="Loading video" /></View>;
  return <VideoView player={player} style={styles.media} nativeControls contentFit="contain" />;
}

export function MobileSocialMediaViewer({
  post,
  selection,
  onSelectionChange,
}: MobileSocialMediaViewerProps) {
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const { width: viewportWidth, height: viewportHeight } = useWindowDimensions();
  const [mediaAspectRatio, setMediaAspectRatio] = useState(16 / 9);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [captionLineCount, setCaptionLineCount] = useState(0);
  const images = post.images.filter(Boolean);
  const imageIndex = selection?.kind === 'image'
    ? Math.min(Math.max(selection.index, 0), Math.max(images.length - 1, 0))
    : null;
  const activeImage = imageIndex === null ? null : images[imageIndex] || null;
  const isVideo = selection?.kind === 'video' && Boolean(post.video);
  const visible = Boolean(activeImage || isVideo);
  const authorName = post.display_name || post.username || 'Community member';
  const captionMeasured = captionLineCount > 0;
  const captionCanExpand = captionLineCount > 2;
  const desiredMediaHeight = viewportWidth / Math.max(mediaAspectRatio, 0.1);
  const mediaHeight = Math.min(desiredMediaHeight, viewportHeight * (captionExpanded ? 0.48 : 0.62));
  const close = () => onSelectionChange(null);

  useEffect(() => {
    setCaptionExpanded(false);
    setCaptionLineCount(0);
    setMediaAspectRatio(16 / 9);
    if (!activeImage) return;
    Image.getSize(
      activeImage,
      (width, height) => {
        if (width > 0 && height > 0) setMediaAspectRatio(width / height);
      },
      () => undefined,
    );
  }, [activeImage, isVideo, post.id]);

  const moveImage = (direction: -1 | 1) => {
    if (imageIndex === null || images.length < 2) return;
    const nextIndex = (imageIndex + direction + images.length) % images.length;
    onSelectionChange({ kind: 'image', index: nextIndex });
  };

  return (
    <Modal
      visible={visible}
      animationType={Platform.OS === 'android' && reducedMotion ? 'none' : 'fade'}
      presentationStyle="fullScreen"
      onRequestClose={close}
    >
      <View style={styles.screen}>
        <StatusBar style="light" />
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 12) }]}>
          <View style={styles.topCopy}>
            <Text style={styles.author} numberOfLines={1}>{authorName}</Text>
            <Text style={styles.meta} numberOfLines={1}>
              {isVideo ? 'Video' : `Image ${(imageIndex ?? 0) + 1} of ${images.length}`}
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close media viewer"
            hitSlop={8}
            style={styles.closeButton}
            onPress={close}
          >
            <MaterialIcons name="close" size={25} color="#FFFFFF" />
          </Pressable>
        </View>

        <View style={[styles.contentGroup, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          {post.content ? (
            <View style={styles.captionPanel}>
              <View style={styles.captionBlock}>
                <Text
                  accessible={false}
                  pointerEvents="none"
                  style={[styles.caption, styles.captionMeasure]}
                  onTextLayout={(event) => setCaptionLineCount(event.nativeEvent.lines.length)}
                >
                  {post.content}
                </Text>
                {captionExpanded ? (
                  <ScrollView
                    style={styles.captionScroll}
                    contentContainerStyle={styles.captionScrollContent}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={captionLineCount > 7}
                  >
                    <Text style={styles.caption}>{post.content}</Text>
                  </ScrollView>
                ) : captionCanExpand ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Expand caption"
                    accessibilityState={{ expanded: false }}
                    onPress={() => setCaptionExpanded(true)}
                  >
                    <Text style={styles.caption} numberOfLines={2} ellipsizeMode="tail">{post.content}</Text>
                  </Pressable>
                ) : captionMeasured ? (
                  <Text style={styles.caption}>{post.content}</Text>
                ) : (
                  <Text style={styles.caption} numberOfLines={2} ellipsizeMode="tail">{post.content}</Text>
                )}
                {captionCanExpand ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={captionExpanded ? 'Collapse caption' : 'Expand caption'}
                    accessibilityState={{ expanded: captionExpanded }}
                    hitSlop={6}
                    style={styles.captionToggle}
                    onPress={() => setCaptionExpanded((current) => !current)}
                  >
                    <Text style={styles.captionToggleText}>{captionExpanded ? 'less' : 'more'}</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          ) : null}

          <View style={[styles.stage, { height: mediaHeight }]}>
            {activeImage && Platform.OS === 'android' ? (
              <AndroidZoomableImage key={`${post.id}:${imageIndex}:${activeImage}`} uri={activeImage}
                label={`Image ${(imageIndex ?? 0) + 1} attached to ${authorName}`} width={viewportWidth} height={mediaHeight}
                aspectRatio={mediaAspectRatio} onPage={moveImage} />
            ) : activeImage ? (
              <ScrollView
                key={activeImage}
                style={styles.zoomViewport}
                contentContainerStyle={styles.zoomContent}
                minimumZoomScale={1}
                maximumZoomScale={4}
                bouncesZoom
                centerContent
                showsHorizontalScrollIndicator={false}
                showsVerticalScrollIndicator={false}
              >
                <PluggdImage
                  uri={activeImage}
                  style={styles.media}
                  resizeMode="contain"
                  displayWidth={1800}
                  accessibilityLabel={`Image ${imageIndex === null ? 1 : imageIndex + 1} attached to ${authorName}`}
                />
              </ScrollView>
            ) : null}
            {isVideo && post.video ? <FullScreenVideo uri={post.video} /> : null}

            {activeImage && images.length > 1 ? (
              <>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Previous image"
                  style={[styles.arrowButton, styles.previousButton]}
                  onPress={() => moveImage(-1)}
                >
                  <MaterialIcons name="chevron-left" size={30} color="#FFFFFF" />
                </Pressable>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Next image"
                  style={[styles.arrowButton, styles.nextButton]}
                  onPress={() => moveImage(1)}
                >
                  <MaterialIcons name="chevron-right" size={30} color="#FFFFFF" />
                </Pressable>
              </>
            ) : null}
          </View>

          {activeImage && images.length > 1 ? (
            <View style={styles.galleryFooter}>
              <View style={styles.dots} accessibilityLabel={`Image ${(imageIndex ?? 0) + 1} of ${images.length}`}>
                {images.map((image, index) => (
                  <View
                    key={`${image}-${index}`}
                    style={[styles.dot, index === imageIndex && styles.activeDot]}
                  />
                ))}
              </View>
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#000000',
  },
  topBar: {
    minHeight: 72,
    paddingHorizontal: 16,
    paddingBottom: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.14)',
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  topCopy: {
    flex: 1,
    minWidth: 0,
  },
  author: {
    color: '#FFFFFF',
    fontSize: 14,
    fontFamily: pluggdFonts.satoshiBlack,
    fontWeight: '900',
  },
  meta: {
    color: '#8E8E9F',
    fontSize: 11,
    fontFamily: pluggdFonts.satoshiBold,
    fontWeight: '700',
    marginTop: 2,
  },
  closeButton: {
    width: 44,
    height: 44,
    marginBottom: -5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  contentGroup: {
    flex: 1,
    width: '100%',
    justifyContent: 'flex-start',
    paddingTop: 18,
  },
  stage: {
    width: '100%',
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomViewport: {
    width: '100%',
    height: '100%',
  },
  androidZoomViewport: {
    flex: 1,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  zoomReset: {
    position: 'absolute',
    bottom: 12,
    alignSelf: 'center',
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 22,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: 'rgba(0,0,0,0.78)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  zoomResetDisabled: { opacity: 0.45 },
  zoomResetText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  zoomContent: {
    flexGrow: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  arrowButton: {
    position: 'absolute',
    top: '50%',
    width: 44,
    height: 44,
    marginTop: -22,
    borderRadius: 22,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
    backgroundColor: 'rgba(0,0,0,0.66)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  previousButton: {
    left: 12,
  },
  nextButton: {
    right: 12,
  },
  captionPanel: {
    paddingHorizontal: 18,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.14)',
  },
  captionBlock: {
    position: 'relative',
  },
  caption: {
    color: '#E4E4E9',
    fontSize: 13,
    lineHeight: 18,
    fontFamily: pluggdFonts.satoshiMedium,
    fontWeight: '600',
  },
  captionMeasure: {
    position: 'absolute',
    left: 0,
    right: 0,
    opacity: 0,
  },
  captionScroll: {
    maxHeight: 140,
  },
  captionScrollContent: {
    paddingBottom: 2,
  },
  captionToggle: {
    alignSelf: 'flex-start',
    minHeight: 28,
    marginTop: 2,
    justifyContent: 'center',
  },
  captionToggleText: {
    color: '#FF6600',
    fontSize: 12,
    lineHeight: 16,
    fontFamily: pluggdFonts.satoshiBold,
    fontWeight: '700',
  },
  galleryFooter: {
    minHeight: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dots: {
    minHeight: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: 'rgba(255,255,255,0.34)',
  },
  activeDot: {
    width: 18,
    backgroundColor: '#FFFFFF',
  },
});
