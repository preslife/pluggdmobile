import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { selectionHaptic } from '../src/design/haptics';
import { pluggdFonts } from '../src/design/typography';
import { staticMapUrl, type MapPoint } from '../src/lib/mapbox';

/**
 * EVT-02 events map (first pass). Renders a real branded Mapbox dark-v11 map with
 * orange pins via the Static Images API — a plain <Image>, so it works on web and
 * native with no native module. Falls back to a branded placeholder when there is
 * no Mapbox token or no geocoded points yet. An interactive @rnmapbox MapView is
 * the later upgrade for pan/zoom + tappable pins.
 */
export function EventsMap({ points, count, onPress }: { points: MapPoint[]; count?: number; onPress?: () => void }) {
  const url = staticMapUrl(points, { width: 680, height: 320 });
  const pinCount = count ?? points.length;

  const body = url ? (
    <>
      <Image source={{ uri: url }} style={StyleSheet.absoluteFill} resizeMode="cover" accessibilityLabel="Map of upcoming events" />
      <LinearGradient
        colors={['rgba(8,8,12,0)', 'rgba(8,8,12,0.55)']}
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
        {onPress ? (
          <View style={styles.openChip}>
            <Text style={styles.openText}>Browse</Text>
            <MaterialIcons name="arrow-forward" size={14} color="#0E0E12" />
          </View>
        ) : null}
      </View>
    </>
  ) : (
    <>
      <LinearGradient colors={['#12131A', '#0B0B10']} style={StyleSheet.absoluteFill} />
      <View style={styles.gridA} pointerEvents="none" />
      <View style={styles.gridB} pointerEvents="none" />
      <View style={styles.fallbackBody}>
        <MaterialIcons name="map" size={26} color="#FF5A00" />
        <Text style={styles.fallbackTitle}>Events map</Text>
        <Text style={styles.fallbackCopy} numberOfLines={2}>
          {pinCount > 0 ? `${pinCount} upcoming events across the scene` : 'Upcoming events will pin here by location'}
        </Text>
      </View>
    </>
  );

  return (
    <Pressable
      accessibilityRole={onPress ? 'button' : 'image'}
      accessibilityLabel="Open the events map"
      disabled={!onPress}
      onPress={() => {
        if (!onPress) return;
        selectionHaptic();
        onPress();
      }}
      style={({ pressed }) => [styles.card, pressed && onPress ? styles.pressed : null]}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    height: 190,
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
    backgroundColor: 'rgba(8,8,12,0.6)',
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
  gridA: { position: 'absolute', left: 0, right: 0, top: '50%', height: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,90,0,0.14)' },
  gridB: { position: 'absolute', top: 0, bottom: 0, left: '50%', width: StyleSheet.hairlineWidth, backgroundColor: 'rgba(255,90,0,0.14)' },
  fallbackBody: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, alignItems: 'center', justifyContent: 'center', gap: 6, padding: 16 },
  fallbackTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 17, letterSpacing: -0.2 },
  fallbackCopy: { color: 'rgba(255,255,255,0.6)', fontFamily: 'Satoshi-Medium', fontSize: 12.5, lineHeight: 17, textAlign: 'center', maxWidth: 260 },
});

export default EventsMap;
