import { MaterialIcons } from '@expo/vector-icons';
import { memo, useMemo, useRef } from 'react';
import {
  Animated,
  Image,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Polyline } from 'react-native-svg';
import { pluggdFonts } from '../../design/typography';
import {
  fitNativeCanvas,
  projectNativeMobileTopology,
  readNativeDoodles,
  resolveNativeCanvasLayout,
  type NativeCanvasLayout,
  type NativeCanvasProjection,
  type NativeDoodle,
  type NativeSoundboardItem,
} from './nativeSoundboardLayout';

type CanvasMode = 'preview' | 'public' | 'editor';

type NativeSoundboardCanvasProps = {
  items: NativeSoundboardItem[];
  boardMetadata?: Record<string, unknown> | null;
  boardArtwork?: string | null;
  width: number;
  height?: number;
  mode: CanvasMode;
  selectedItemId?: string | null;
  activeAudioItemId?: string | null;
  isAudioPlaying?: boolean;
  onOpenItem?: (item: NativeSoundboardItem) => void;
  onToggleAudio?: (item: NativeSoundboardItem) => void;
  onSelectItem?: (item: NativeSoundboardItem) => void;
  onCommitLayout?: (item: NativeSoundboardItem, layout: NativeCanvasLayout) => void;
};

const STICKER_ICONS: Record<Extract<NativeDoodle, { kind: 'sticker' }>['sticker'], keyof typeof MaterialIcons.glyphMap> = {
  star: 'star-outline',
  arrow: 'north-east',
  underline: 'horizontal-rule',
  tape: 'texture',
  pin: 'push-pin',
  splash: 'flare',
};

const isRecord = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);

function safeThemeColor(value: unknown, fallback: string) {
  return typeof value === 'string' && /^#[0-9a-f]{6}$/i.test(value.trim()) ? value.trim() : fallback;
}

function readCanvasTheme(metadata?: Record<string, unknown> | null) {
  const rawTheme = isRecord(metadata?.canvas_theme) ? metadata.canvas_theme : {};
  return {
    background: safeThemeColor(rawTheme.background, '#101014'),
    accent: safeThemeColor(rawTheme.accent, '#8B5CF6'),
    paper: safeThemeColor(rawTheme.paper, '#F4D96B'),
  };
}

function waveformValues(value: unknown, count: number) {
  const raw = Array.isArray(value)
    ? value
    : isRecord(value) && Array.isArray(value.peaks)
      ? value.peaks
      : [];
  const numbers = raw.map(Number).filter(Number.isFinite);
  if (!numbers.length) {
    // A flat rail communicates audio without pretending we have waveform data.
    return Array.from({ length: count }, () => 0.18);
  }
  const max = Math.max(...numbers.map((number) => Math.abs(number)), 0.001);
  return Array.from({ length: count }, (_, index) => {
    const sourceIndex = Math.min(numbers.length - 1, Math.round(index / Math.max(1, count - 1) * (numbers.length - 1)));
    return Math.max(0.14, Math.abs(numbers[sourceIndex]) / max);
  });
}

function itemBody(item: NativeSoundboardItem) {
  return item.content_text || item.description || item.title || '';
}

function CanvasItemBody({
  item,
  boardArtwork,
  compact,
  isPlaying,
  accent,
  paper,
  onToggleAudio,
  onOpen,
}: {
  item: NativeSoundboardItem;
  boardArtwork?: string | null;
  compact: boolean;
  isPlaying: boolean;
  accent: string;
  paper: string;
  onToggleAudio?: () => void;
  onOpen?: () => void;
}) {
  const body = itemBody(item);
  if (item.item_type === 'image' || item.item_type === 'video') {
    return (
      <View style={styles.mediaCard}>
        {item.media_url ? <Image source={{ uri: item.media_url }} style={styles.mediaImage} resizeMode="cover" /> : <View style={styles.mediaFallback}><MaterialIcons name={item.item_type === 'video' ? 'movie' : 'image'} size={compact ? 20 : 28} color="#9d8dff" /></View>}
        {item.item_type === 'video' ? <View style={styles.videoPlay}><MaterialIcons name="play-arrow" size={compact ? 15 : 20} color="#fff" /></View> : null}
        {item.title ? <View style={styles.mediaCaption}><Text style={[styles.mediaCaptionText, compact && styles.compactCaption]} numberOfLines={compact ? 1 : 2}>{item.title}</Text></View> : null}
      </View>
    );
  }

  if (item.item_type === 'audio') {
    const bars = waveformValues(item.waveform_data, compact ? 16 : 24);
    return (
      <View style={styles.audioCard}>
        {boardArtwork ? <Image source={{ uri: boardArtwork }} style={styles.audioArtwork} blurRadius={compact ? 10 : 14} /> : null}
        <View style={styles.audioShade} />
        <View style={styles.audioHeading}>
          <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause audio' : 'Play audio'} hitSlop={8} style={[styles.audioPlay, { backgroundColor: accent }]} onPress={onToggleAudio}>
            <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={compact ? 16 : 20} color="#fff" />
          </Pressable>
          <View style={styles.audioTitleWrap}>
            <Text style={[styles.audioTitle, compact && styles.compactAudioTitle]} numberOfLines={1}>{item.title || 'Audio idea'}</Text>
            {!compact ? <Text style={styles.audioMeta}>{item.duration_seconds ? `${Math.floor(item.duration_seconds / 60)}:${String(Math.floor(item.duration_seconds % 60)).padStart(2, '0')}` : 'Soundboard audio'}</Text> : null}
          </View>
          {!compact && onOpen ? <Pressable accessibilityRole="button" accessibilityLabel="Open full audio player" hitSlop={8} onPress={onOpen}><MaterialIcons name="open-in-full" size={17} color="#c4b5fd" /></Pressable> : null}
        </View>
        <View style={styles.waveform}>
          {bars.map((bar, index) => <View key={`${item.id}-bar-${index}`} style={[styles.waveBar, { height: `${Math.round(bar * 100)}%`, backgroundColor: accent }]} />)}
        </View>
      </View>
    );
  }

  if (item.item_type === 'note') {
    return (
      <View style={[styles.noteCard, { backgroundColor: paper }]}>
        <View style={styles.noteTape} />
        <Text style={[styles.noteLabel, compact && styles.compactLabel]} numberOfLines={1}>{item.title || 'NOTE'}</Text>
        <Text style={[styles.noteBody, compact && styles.compactNote]} numberOfLines={compact ? 4 : 8}>{body || 'Untitled note'}</Text>
        <View style={styles.noteFade} />
      </View>
    );
  }

  if (item.item_type === 'link') {
    return (
      <View style={styles.referenceCard}>
        <MaterialIcons name="link" size={compact ? 15 : 20} color="#c4b5fd" />
        <Text style={[styles.referenceTitle, compact && styles.compactReference]} numberOfLines={compact ? 2 : 4}>{item.title || item.external_url || 'Reference'}</Text>
      </View>
    );
  }

  return (
    <View style={styles.referenceCard}>
      <MaterialIcons name="format-quote" size={compact ? 15 : 20} color="#c4b5fd" />
      <Text style={[styles.referenceTitle, compact && styles.compactReference]} numberOfLines={compact ? 3 : 7}>{body || item.title || 'Soundboard idea'}</Text>
    </View>
  );
}

function DraggableCanvasItem({
  item,
  layout,
  sourceLayout,
  projectionScale,
  mode,
  selected,
  boardArtwork,
  themeAccent,
  themePaper,
  activeAudioItemId,
  isAudioPlaying,
  onOpenItem,
  onToggleAudio,
  onSelectItem,
  onCommitLayout,
}: {
  item: NativeSoundboardItem;
  layout: NativeCanvasLayout;
  sourceLayout: NativeCanvasLayout;
  projectionScale: number;
  mode: CanvasMode;
  selected: boolean;
  boardArtwork?: string | null;
  themeAccent: string;
  themePaper: string;
  activeAudioItemId?: string | null;
  isAudioPlaying?: boolean;
  onOpenItem?: (item: NativeSoundboardItem) => void;
  onToggleAudio?: (item: NativeSoundboardItem) => void;
  onSelectItem?: (item: NativeSoundboardItem) => void;
  onCommitLayout?: (item: NativeSoundboardItem, layout: NativeCanvasLayout) => void;
}) {
  const offset = useRef(new Animated.ValueXY()).current;
  const draggable = mode === 'editor' && !sourceLayout.locked && Boolean(onCommitLayout);
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => draggable,
    onMoveShouldSetPanResponder: (_event, gesture) => draggable && Math.abs(gesture.dx) + Math.abs(gesture.dy) > 4,
    onPanResponderGrant: () => onSelectItem?.(item),
    onPanResponderMove: Animated.event([null, { dx: offset.x, dy: offset.y }], { useNativeDriver: false }),
    onPanResponderRelease: (_event, gesture) => {
      const scale = Math.max(0.001, projectionScale);
      onCommitLayout?.(item, {
        ...sourceLayout,
        x: Math.round(sourceLayout.x + gesture.dx / scale),
        y: Math.round(sourceLayout.y + gesture.dy / scale),
      });
      offset.setValue({ x: 0, y: 0 });
    },
    onPanResponderTerminate: () => offset.setValue({ x: 0, y: 0 }),
  }), [draggable, item, offset, onCommitLayout, onSelectItem, projectionScale, sourceLayout]);

  const compact = mode === 'preview' || layout.width < 145 || layout.height < 130;
  return (
    <Animated.View
      {...(draggable ? panResponder.panHandlers : {})}
      style={[
        styles.canvasItem,
        {
          left: layout.x,
          top: layout.y,
          width: layout.width,
          height: layout.height,
          zIndex: layout.zIndex,
          transform: [{ translateX: offset.x }, { translateY: offset.y }, { rotate: `${layout.rotation}deg` }],
        },
        selected && styles.canvasItemSelected,
        selected && { borderColor: themeAccent },
      ]}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${mode === 'editor' ? 'Select' : 'Open'} ${item.title || item.item_type}`}
        style={styles.itemPressable}
        onPress={() => mode === 'editor' ? onSelectItem?.(item) : onOpenItem?.(item)}
      >
        <CanvasItemBody
          item={item}
          boardArtwork={boardArtwork}
          compact={compact}
          isPlaying={activeAudioItemId === item.id && Boolean(isAudioPlaying)}
          accent={themeAccent}
          paper={themePaper}
          onToggleAudio={onToggleAudio ? () => onToggleAudio(item) : undefined}
          onOpen={onOpenItem ? () => onOpenItem(item) : undefined}
        />
      </Pressable>
      {mode === 'editor' && selected ? <View pointerEvents="none" style={[styles.selectionTag, { backgroundColor: themeAccent }]}><Text style={styles.selectionTagText}>MOVE</Text></View> : null}
    </Animated.View>
  );
}

function DoodleLayer({ doodles, projection }: { doodles: NativeDoodle[]; projection: NativeCanvasProjection }) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width={projection.width} height={projection.height} style={StyleSheet.absoluteFill}>
        {doodles.flatMap((doodle) => {
          if (doodle.kind !== 'stroke') return [];
          const points = doodle.points.map(projection.transformPoint).map((point) => `${point.x},${point.y}`).join(' ');
          return [<Polyline key={doodle.id} points={points} fill="none" stroke={doodle.color} strokeWidth={Math.max(1, doodle.width * projection.contentScale)} strokeLinecap="round" strokeLinejoin="round" opacity={doodle.opacity} />];
        })}
      </Svg>
      {doodles.flatMap((doodle) => {
        if (doodle.kind !== 'sticker') return [];
        const point = projection.transformPoint({ x: doodle.x, y: doodle.y });
        const size = Math.max(14, 36 * doodle.scale * projection.contentScale);
        return [
          <View key={doodle.id} style={{ position: 'absolute', left: point.x - size / 2, top: point.y - size / 2, opacity: doodle.opacity, transform: [{ rotate: `${doodle.rotation}deg` }] }}>
            <MaterialIcons name={STICKER_ICONS[doodle.sticker]} size={size} color={doodle.color} />
          </View>,
        ];
      })}
    </View>
  );
}

export const NativeSoundboardCanvas = memo(function NativeSoundboardCanvas({
  items,
  boardMetadata,
  boardArtwork,
  width,
  height,
  mode,
  selectedItemId,
  activeAudioItemId,
  isAudioPlaying,
  onOpenItem,
  onToggleAudio,
  onSelectItem,
  onCommitLayout,
}: NativeSoundboardCanvasProps) {
  const orderedItems = useMemo(() => [...items].sort((left, right) => {
    if (left.is_pinned !== right.is_pinned) return Number(right.is_pinned) - Number(left.is_pinned);
    return Number(left.position || 0) - Number(right.position || 0);
  }).slice(0, mode === 'preview' ? 9 : 80), [items, mode]);
  const targetHeight = height ?? Math.max(420, width * 1.08);
  const projection = useMemo(() => {
    if (mode === 'public') return projectNativeMobileTopology(orderedItems, width);
    return fitNativeCanvas(orderedItems, width, targetHeight);
  }, [mode, orderedItems, targetHeight, width]);
  const doodles = useMemo(() => readNativeDoodles(boardMetadata), [boardMetadata]);
  const theme = useMemo(() => readCanvasTheme(boardMetadata), [boardMetadata]);

  return (
    <View
      accessibilityLabel="Soundboard canvas"
      style={[
        styles.canvas,
        { width: projection.width, height: projection.height, backgroundColor: theme.background, borderColor: `${theme.accent}55` },
        mode === 'preview' && styles.previewCanvas,
      ]}
    >
      {orderedItems.length ? orderedItems.map((item, index) => {
        const sourceLayout = resolveNativeCanvasLayout(item, index);
        const layout = projection.layouts[item.id] || sourceLayout;
        return (
          <DraggableCanvasItem
            key={item.id}
            item={item}
            layout={layout}
            sourceLayout={sourceLayout}
            projectionScale={projection.contentScale}
            mode={mode}
            selected={selectedItemId === item.id}
            boardArtwork={boardArtwork}
            themeAccent={theme.accent}
            themePaper={theme.paper}
            activeAudioItemId={activeAudioItemId}
            isAudioPlaying={isAudioPlaying}
            onOpenItem={onOpenItem}
            onToggleAudio={onToggleAudio}
            onSelectItem={onSelectItem}
            onCommitLayout={onCommitLayout}
          />
        );
      }) : (
        <View style={styles.emptyCanvas}>
          {boardArtwork ? <Image source={{ uri: boardArtwork }} style={StyleSheet.absoluteFill} resizeMode="cover" /> : null}
          <View style={styles.emptyShade} />
          <MaterialIcons name="dashboard-customize" size={32} color={theme.accent} />
          <Text style={styles.emptyTitle}>The canvas is ready</Text>
          <Text style={styles.emptyBody}>Add real audio, notes and images to start shaping this Soundboard.</Text>
        </View>
      )}
      <DoodleLayer doodles={doodles} projection={projection} />
    </View>
  );
});

const styles = StyleSheet.create({
  canvas: { position: 'relative', overflow: 'hidden', borderRadius: 18, backgroundColor: '#101014', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)' },
  previewCanvas: { borderRadius: 14 },
  canvasItem: { position: 'absolute', borderRadius: 12, overflow: 'hidden', backgroundColor: '#1a1a20', shadowColor: '#000', shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 4 },
  canvasItemSelected: { borderWidth: 2, borderColor: '#8b5cf6' },
  itemPressable: { flex: 1 },
  mediaCard: { flex: 1, backgroundColor: '#18181d', overflow: 'hidden' },
  mediaImage: { width: '100%', height: '100%' },
  mediaFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  videoPlay: { position: 'absolute', left: '50%', top: '50%', width: 34, height: 34, marginLeft: -17, marginTop: -17, borderRadius: 17, backgroundColor: 'rgba(8,8,12,0.78)', alignItems: 'center', justifyContent: 'center' },
  mediaCaption: { position: 'absolute', left: 8, right: 8, bottom: 8, paddingHorizontal: 8, paddingVertical: 6, borderRadius: 8, backgroundColor: 'rgba(7,7,11,0.76)' },
  mediaCaptionText: { color: '#fff', fontFamily: pluggdFonts.satoshiBold, fontSize: 12, lineHeight: 16 },
  compactCaption: { fontSize: 8, lineHeight: 10 },
  audioCard: { flex: 1, backgroundColor: '#191722', padding: 12, justifyContent: 'space-between' },
  audioArtwork: { ...StyleSheet.absoluteFillObject, width: '100%', height: '100%' },
  audioShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(11,9,17,0.78)' },
  audioHeading: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  audioPlay: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#8b5cf6', alignItems: 'center', justifyContent: 'center' },
  audioTitleWrap: { flex: 1, minWidth: 0 },
  audioTitle: { color: '#fff', fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  compactAudioTitle: { fontSize: 9 },
  audioMeta: { color: 'rgba(255,255,255,0.58)', fontFamily: pluggdFonts.satoshiMedium, fontSize: 10, marginTop: 2 },
  waveform: { height: 36, flexDirection: 'row', alignItems: 'center', gap: 2 },
  waveBar: { flex: 1, minHeight: 3, borderRadius: 2, backgroundColor: '#a78bfa' },
  noteCard: { flex: 1, overflow: 'hidden', backgroundColor: '#f4d96b', padding: 14 },
  noteTape: { position: 'absolute', width: 46, height: 12, top: -2, left: '50%', marginLeft: -23, backgroundColor: 'rgba(229,217,197,0.72)', transform: [{ rotate: '-2deg' }] },
  noteLabel: { color: '#4b3b12', fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1, marginTop: 5, marginBottom: 7 },
  compactLabel: { fontSize: 7, marginBottom: 3 },
  noteBody: { color: '#2d270e', fontFamily: pluggdFonts.satoshiBold, fontSize: 14, lineHeight: 19 },
  compactNote: { fontSize: 8, lineHeight: 10 },
  noteFade: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 16, backgroundColor: 'rgba(244,217,107,0.84)' },
  referenceCard: { flex: 1, backgroundColor: '#211d2c', padding: 14, justifyContent: 'center', gap: 8 },
  referenceTitle: { color: '#f7f4ff', fontFamily: pluggdFonts.satoshiBold, fontSize: 13, lineHeight: 18 },
  compactReference: { fontSize: 8, lineHeight: 10 },
  selectionTag: { position: 'absolute', top: 5, right: 5, borderRadius: 999, backgroundColor: '#8b5cf6', paddingHorizontal: 7, paddingVertical: 3 },
  selectionTagText: { color: '#fff', fontFamily: pluggdFonts.satoshiBlack, fontSize: 7, letterSpacing: 0.8 },
  emptyCanvas: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  emptyShade: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(10,9,14,0.76)' },
  emptyTitle: { color: '#fff', fontFamily: pluggdFonts.displayBold, fontSize: 20, marginTop: 9 },
  emptyBody: { maxWidth: 260, textAlign: 'center', color: 'rgba(255,255,255,0.62)', fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17, marginTop: 5 },
});
