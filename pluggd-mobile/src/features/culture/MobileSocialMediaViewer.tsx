import { MaterialIcons } from '@expo/vector-icons';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Image, PluggdImage } from '../../components/PluggdImage';
import { pluggdFonts } from '../../design/typography';
import type { MobileSocialPostPreview } from './mobileTypes';

export type MobileSocialMediaSelection =
  | { kind: 'image'; index: number }
  | { kind: 'video' }
  | null;

type MobileSocialMediaViewerProps = {
  post: MobileSocialPostPreview;
  selection: MobileSocialMediaSelection;
  onSelectionChange: (selection: MobileSocialMediaSelection) => void;
};

function FullScreenVideo({ uri }: { uri: string }) {
  const player = useVideoPlayer(uri, (instance) => {
    instance.loop = false;
  });

  return <VideoView player={player} style={styles.media} nativeControls contentFit="contain" />;
}

export function MobileSocialMediaViewer({
  post,
  selection,
  onSelectionChange,
}: MobileSocialMediaViewerProps) {
  const insets = useSafeAreaInsets();
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
      animationType="fade"
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
            {activeImage ? (
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
