import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { selectionHaptic } from '../src/design/haptics';
import { pluggdFonts } from '../src/design/typography';
import { staticMapUrl, type EventMapPoint, type MapPoint } from '../src/lib/mapbox';

/** Browser fallback for the interactive native Events map. */
export function EventsMap({
  points,
  count,
  loading = false,
  onSelectEvent,
  onActiveEventChange: _onActiveEventChange,
  onPress,
}: {
  points: Array<EventMapPoint | MapPoint>;
  count?: number;
  loading?: boolean;
  onSelectEvent?: (id: string) => void;
  onActiveEventChange?: (id: string | null) => void;
  onPress?: () => void;
}) {
  const url = staticMapUrl(points, { width: 680, height: 320 });
  const pinCount = count ?? points.length;
  const firstEvent = points[0] && 'id' in points[0] ? points[0] : null;
  const canOpen = Boolean(onPress || (firstEvent && onSelectEvent));

  const body = url ? (
    <>
      <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Map of upcoming events" />
      <LinearGradient
        colors={['rgba(10,8,6,0)', 'rgba(10,8,6,0.55)']}
        start={{ x: 0.5, y: 0.3 }}
        end={{ x: 0.5, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />
      <View style={styles.foot}>
        <View style={styles.chip}>
          <MaterialIcons name="place" size={14} color="#FFFFFF" />
          <Text style={styles.chipText}>{pinCount} pinned by location</Text>
        </View>
        {canOpen ? (
          <View style={styles.openChip}>
            <Text style={styles.openText}>View first event</Text>
            <MaterialIcons name="arrow-forward" size={14} color="#0E0E12" />
          </View>
        ) : null}
      </View>
    </>
  ) : (
    <>
      <LinearGradient colors={['#241d15', '#0a0806']} style={StyleSheet.absoluteFill} />
      <View style={styles.gridA} pointerEvents="none" />
      <View style={styles.gridB} pointerEvents="none" />
      <View style={styles.fallbackBody}>
        <MaterialIcons name="map" size={26} color="#ff6600" />
        <Text style={styles.fallbackTitle}>Events map</Text>
        <Text style={styles.fallbackCopy} numberOfLines={2}>
          {loading ? 'Pinning venues and locations…' : pinCount > 0 ? `${pinCount} upcoming events across the scene` : 'Events with confirmed locations will appear here'}
        </Text>
      </View>
    </>
  );

  if (!canOpen) {
    return (
      <View accessible accessibilityRole="image" accessibilityLabel="Map of upcoming events" style={styles.card}>
        {body}
      </View>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={firstEvent ? `View ${firstEvent.title}` : 'Browse events'}
      onPress={() => {
        selectionHaptic();
        if (firstEvent && onSelectEvent) onSelectEvent(firstEvent.id);
        else onPress?.();
      }}
      style={({ pressed }) => [styles.card, pressed ? styles.pressed : null]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 190,
    minHeight: 190,
    width: '100%',
    flexShrink: 0,
    borderRadius: 22,
    overflow: 'hidden',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.12)',
    justifyContent: 'flex-end',
  },
  pressed: { opacity: 0.94 },
  foot: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 12,
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    backgroundColor: 'rgba(10,8,6,0.6)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.22)',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  chipText: { color: '#FFFFFF', fontFamily: 'Satoshi-Bold', fontSize: 11, letterSpacing: 0.2 },
  openChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 999,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  openText: { color: '#0E0E12', fontFamily: 'Satoshi-Bold', fontSize: 11.5 },
  gridA: { position: 'absolute', left: 0, right: 0, top: '50%', height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,102,0,0.14)' },
  gridB: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,102,0,0.14)' },
  fallbackBody: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16 },
  fallbackTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 17, letterSpacing: -0.2 },
  fallbackCopy: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Satoshi-Medium', fontSize: 12.5, lineHeight: 17, textAlign: 'center', maxWidth: 260 },
});

export default EventsMap;
