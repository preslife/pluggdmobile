import { useEffect, useState, type ReactNode } from 'react';
import {
  StyleSheet,
  View,
  type AccessibilityActionEvent,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

type PlaybackSeekBarProps = {
  ratio: number;
  duration: number;
  position: number;
  onSeek: (ratio: number) => void;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
  trackStyle?: StyleProp<ViewStyle>;
  fillStyle?: StyleProp<ViewStyle>;
  thumbStyle?: StyleProp<ViewStyle>;
  children?: (displayRatio: number) => ReactNode;
  showDefaultTrack?: boolean;
  showThumb?: boolean;
};

function clampRatio(value: number) {
  return Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));
}

export function PlaybackSeekBar({
  ratio,
  duration,
  position,
  onSeek,
  accessibilityLabel = 'Playback position',
  style,
  trackStyle,
  fillStyle,
  thumbStyle,
  children,
  showDefaultTrack = true,
  showThumb = true,
}: PlaybackSeekBarProps) {
  const [width, setWidth] = useState(0);
  const [dragRatio, setDragRatio] = useState<number | null>(null);
  const displayRatio = clampRatio(dragRatio ?? ratio);

  useEffect(() => {
    if (duration <= 0) setDragRatio(null);
  }, [duration]);

  const ratioFromEvent = (event: GestureResponderEvent) => {
    if (width <= 0) return displayRatio;
    return clampRatio(Number(event.nativeEvent.locationX || 0) / width);
  };

  const updateDraft = (event: GestureResponderEvent) => {
    if (duration <= 0) return;
    setDragRatio(ratioFromEvent(event));
  };

  const commit = (event: GestureResponderEvent) => {
    if (duration <= 0) return;
    const next = ratioFromEvent(event);
    setDragRatio(null);
    onSeek(next);
  };

  const handleAccessibilityAction = (event: AccessibilityActionEvent) => {
    if (duration <= 0) return;
    const step = Math.min(15, Math.max(5, duration * 0.05));
    const nextPosition = event.nativeEvent.actionName === 'increment'
      ? Math.min(duration, position + step)
      : Math.max(0, position - step);
    onSeek(nextPosition / duration);
  };

  return (
    <View
      accessible
      accessibilityRole="adjustable"
      accessibilityLabel={accessibilityLabel}
      accessibilityActions={[{ name: 'decrement', label: 'Seek backward' }, { name: 'increment', label: 'Seek forward' }]}
      accessibilityValue={{ min: 0, max: Math.max(0, Math.round(duration)), now: Math.max(0, Math.round(position)) }}
      onAccessibilityAction={handleAccessibilityAction}
      onLayout={(event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width)}
      onStartShouldSetResponder={() => duration > 0}
      onMoveShouldSetResponder={() => duration > 0}
      onResponderGrant={updateDraft}
      onResponderMove={updateDraft}
      onResponderRelease={commit}
      onResponderTerminate={() => setDragRatio(null)}
      onResponderTerminationRequest={() => false}
      style={[styles.hitArea, style]}
    >
      {children?.(displayRatio)}
      {showDefaultTrack ? (
        <View pointerEvents="none" style={[styles.track, trackStyle]}>
          <View style={[styles.fill, fillStyle, { width: `${displayRatio * 100}%` }]} />
        </View>
      ) : null}
      {showThumb ? <View pointerEvents="none" style={[styles.thumb, thumbStyle, { left: `${displayRatio * 100}%` }]} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  hitArea: {
    minHeight: 44,
    justifyContent: 'center',
  },
  track: {
    height: 5,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: 'rgba(127,127,127,0.28)',
  },
  fill: {
    height: '100%',
    borderRadius: 999,
    backgroundColor: '#ff6600',
  },
  thumb: {
    position: 'absolute',
    top: '50%',
    width: 14,
    height: 14,
    marginLeft: -7,
    marginTop: -7,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: '#ff6600',
    backgroundColor: '#fff8ef',
  },
});
