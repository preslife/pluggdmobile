import { MaterialIcons } from '@expo/vector-icons';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { PluggdImage } from '../../components/PluggdImage';
import { pluggdFonts } from '../../design/typography';
import { selectionHaptic } from '../../design/haptics';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { clamp, formatMusicTime, type MusicTrack } from './model';

export function SoundArtwork({ track, size = 48 }: { track: MusicTrack; size?: number }) {
  const { colors } = usePluggdTheme();
  return <View style={{ width: size, height: size, borderRadius: 12, overflow: 'hidden', backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' }}>
    {track.cover_art_url ? <PluggdImage uri={track.cover_art_url} displayWidth={size * 3} style={{ width: size, height: size }} />
      : <MaterialIcons name="music-note" size={size * 0.5} color={colors.accentText} />}
  </View>;
}
export function MusicButton({ icon, label, onPress, disabled, primary, compact }: {
  icon?: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void; disabled?: boolean; primary?: boolean; compact?: boolean;
}) {
  const { colors } = usePluggdTheme();
  const [pressed, setPressed] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled}
    onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}
    style={{ minHeight: 48, paddingHorizontal: compact ? 12 : 20, borderRadius: 24, gap: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
      backgroundColor: primary ? colors.accentFill : colors.surfaceAlt, opacity: disabled ? 0.45 : pressed ? 0.72 : 1 }}>
    {icon ? <MaterialIcons name={icon} size={21} color={primary ? colors.onAccent : colors.text} /> : null}
    <Text style={{ fontFamily: pluggdFonts.satoshiBold, fontSize: 14, color: primary ? colors.onAccent : colors.text }}>{label}</Text>
  </Pressable>;
}
export function MusicSlider({ label, value, min = 0, max = 1, step = 0.01, format = v => `${Math.round(v * 100)}%`, onChange, onCommit }: {
  label: string; value: number; min?: number; max?: number; step?: number; format?: (value: number) => string;
  onChange: (value: number) => void; onCommit?: () => void;
}) {
  const { colors } = usePluggdTheme();
  const [width, setWidth] = useState(1);
  const props = useRef({ value, min, max, step, width, onChange, onCommit });
  props.current = { value, min, max, step, width, onChange, onCommit };
  const dragStart = useRef(0);
  const setAt = (x: number) => {
    const p = props.current;
    p.onChange(clamp(Math.round((p.min + clamp(x / p.width, 0, 1) * (p.max - p.min)) / p.step) * p.step, p.min, p.max));
  };
  const pan = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: event => { dragStart.current = event.nativeEvent.locationX; setAt(dragStart.current); },
    onPanResponderMove: (_event, gesture) => setAt(dragStart.current + gesture.dx),
    onPanResponderRelease: () => { selectionHaptic(); props.current.onCommit?.(); },
    onPanResponderTerminationRequest: () => false,
  }), []);
  const fraction = max > min ? clamp((value - min) / (max - min), 0, 1) : 0;
  return <View style={{ gap: 4 }}>
    <View style={styles.between}><Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text><Text style={[styles.value, { color: colors.text }]}>{format(value)}</Text></View>
    <View accessible accessibilityRole="adjustable" accessibilityLabel={label} accessibilityValue={{ min, max, now: value, text: format(value) }}
      accessibilityActions={[{ name: 'increment' }, { name: 'decrement' }]}
      onAccessibilityAction={event => { onChange(clamp(value + (event.nativeEvent.actionName === 'increment' ? step : -step), min, max)); onCommit?.(); }}
      style={{ height: 44, justifyContent: 'center', marginHorizontal: 12 }} onLayout={event => setWidth(event.nativeEvent.layout.width)} {...pan.panHandlers}>
      <View pointerEvents="none" style={{ height: 4, borderRadius: 2, backgroundColor: colors.controlBorder }}>
        <View style={{ width: `${fraction * 100}%`, height: 4, borderRadius: 2, backgroundColor: colors.accentFill }} />
      </View>
      <View pointerEvents="none" style={{ position: 'absolute', left: `${fraction * 100}%`, marginLeft: -12, width: 24, height: 24, borderRadius: 12, backgroundColor: colors.text, borderWidth: 3, borderColor: colors.accentFill }} />
    </View>
  </View>;
}

export function MusicTool({ icon, label, onPress, disabled }: {
  icon: keyof typeof MaterialIcons.glyphMap; label: string; onPress: () => void; disabled?: boolean;
}) {
  const { colors } = usePluggdTheme();
  const [pressed, setPressed] = useState(false);
  return <Pressable accessibilityRole="button" accessibilityLabel={label} disabled={disabled} accessibilityState={{ disabled: Boolean(disabled) }}
    onPress={onPress} onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)}
    style={{ flex: 1, minWidth: 0, minHeight: 68, borderRadius: 18, alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: colors.surfaceAlt, opacity: disabled ? 0.4 : pressed ? 0.75 : 1 }}>
    <MaterialIcons name={icon} size={24} color={colors.text} /><Text style={{ fontFamily: pluggdFonts.satoshiBold, fontSize: 12, color: colors.text }}>{label}</Text>
  </Pressable>;
}

const WaveBars = memo(function WaveBars({ peaks, width, color }: { peaks: number[]; width: number; color: string }) {
  const interval = width / peaks.length;
  return <Svg width={width} height={78} accessible={false}>
    {peaks.map((peak, i) => {
      const height = Math.max(3, Math.pow(peak / 100, 0.65) * 66);
      return <Rect key={i} x={i * interval} y={(78 - height) / 2} width={Math.max(1.5, interval * 0.58)} height={height} rx={1.5} fill={color} />;
    })}
  </Svg>;
});

/** Native scrolling keeps the waveform responsive while the chosen window stays fixed. */
export function MusicWaveform({ peaks, trackDuration, duration, start, progress = 0, onChange, onCommit, onDrag }: {
  peaks: number[]; trackDuration: number; duration: number; start: number;
  progress?: number;
  onChange: (start: number) => void; onCommit: () => void; onDrag: () => void;
}) {
  const { colors } = usePluggdTheme();
  const [width, setWidth] = useState(0);
  const scroll = useRef<ScrollView>(null);
  const dragging = useRef(false);
  const offset = useRef(0);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scale = Math.max(1, (width - 48) / duration);
  const props = useRef({ scale, trackDuration, duration, onChange, onCommit });
  props.current = { scale, trackDuration, duration, onChange, onCommit };
  useEffect(() => {
    if (!dragging.current && Math.abs(offset.current - start * scale) > 1) scroll.current?.scrollTo({ x: start * scale, animated: false });
  }, [start, scale]);
  useEffect(() => () => { if (timeout.current) clearTimeout(timeout.current); }, []);
  const finish = () => {
    if (timeout.current) clearTimeout(timeout.current);
    timeout.current = setTimeout(() => { dragging.current = false; selectionHaptic(); props.current.onCommit(); }, 180);
  };
  return <View style={{ gap: 10 }}>
    <View style={styles.between}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>Drag to choose your moment</Text>
      <Text style={[styles.value, { color: colors.accentText }]}>{duration.toFixed(duration % 1 ? 1 : 0)}s selected</Text>
    </View>
    <View accessible accessibilityRole="adjustable" accessibilityLabel="Audio start in the track" accessibilityValue={{ min: 0, max: Math.max(0, trackDuration - duration), now: start, text: formatMusicTime(start, true) }}
      accessibilityActions={[{ name: 'increment', label: 'One second later' }, { name: 'decrement', label: 'One second earlier' }]}
      onAccessibilityAction={event => { onDrag(); onChange(clamp(start + (event.nativeEvent.actionName === 'increment' ? 1 : -1), 0, trackDuration - duration)); onCommit(); }}
      style={{ height: 94, overflow: 'hidden' }} onLayout={event => setWidth(event.nativeEvent.layout.width)}>
      {width > 48 ? <ScrollView ref={scroll} horizontal bounces={false} showsHorizontalScrollIndicator={false} scrollEventThrottle={32}
        contentContainerStyle={{ paddingHorizontal: 24, alignItems: 'center' }}
        onScrollBeginDrag={() => { dragging.current = true; if (timeout.current) clearTimeout(timeout.current); onDrag(); }}
        onMomentumScrollBegin={() => { if (timeout.current) clearTimeout(timeout.current); }}
        onScrollEndDrag={finish} onMomentumScrollEnd={finish}
        onScroll={event => {
          offset.current = event.nativeEvent.contentOffset.x;
          if (dragging.current) onChange(Math.round(clamp(offset.current / scale, 0, trackDuration - duration) * 10) / 10);
        }}>
        <WaveBars peaks={peaks} width={trackDuration * scale} color={colors.textSecondary} />
      </ScrollView> : null}
      <View pointerEvents="none" style={{ position: 'absolute', left: 24, right: 24, top: 4, bottom: 4, borderWidth: 3, borderRadius: 16, borderColor: colors.accentFill, backgroundColor: colors.accentSoft }} />
      <View pointerEvents="none" style={{ position: 'absolute', left: 28 + clamp(progress / duration, 0, 1) * Math.max(0, width - 56), top: 14, bottom: 14, width: 3, borderRadius: 2, backgroundColor: colors.accentFill }} />
    </View>
    <View style={styles.between}>
      <Pressable accessibilityRole="button" accessibilityLabel="Move audio start earlier by one tenth of a second" disabled={start <= 0}
        onPress={() => { onChange(clamp(Math.round((start - 0.1) * 10) / 10, 0, trackDuration - duration)); onCommit(); }} style={styles.nudge}>
        <MaterialIcons name="chevron-left" size={20} color={colors.text} /><Text style={[styles.value, { color: colors.text }]}>{formatMusicTime(start, true)}</Text>
      </Pressable>
      <Text style={[styles.label, { color: colors.textMuted }]}>to {formatMusicTime(start + duration, true)} · {formatMusicTime(trackDuration)}</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Move audio start later by one tenth of a second" disabled={start + duration >= trackDuration}
        onPress={() => { onChange(clamp(Math.round((start + 0.1) * 10) / 10, 0, trackDuration - duration)); onCommit(); }} style={styles.nudge}>
        <MaterialIcons name="chevron-right" size={24} color={colors.text} />
      </Pressable>
    </View>
  </View>;
}
const styles = StyleSheet.create({
  between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  label: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 13 },
  value: { fontFamily: pluggdFonts.satoshiBold, fontSize: 13, fontVariant: ['tabular-nums'] },
  nudge: { minWidth: 44, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
});
