import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import MapView, { Marker, type Region } from 'react-native-maps';
import { PluggdImage } from '../src/components/PluggdImage';
import { selectionHaptic } from '../src/design/haptics';
import { pluggdFonts } from '../src/design/typography';
import type { EventMapPoint, MapPoint } from '../src/lib/mapbox';
import { formatGBP } from '../src/lib/mobileContent';

type Props = {
  points: Array<EventMapPoint | MapPoint>;
  count?: number;
  loading?: boolean;
  onSelectEvent?: (id: string) => void;
  onPress?: () => void;
};

function regionFor(points: EventMapPoint[]): Region {
  if (!points.length) {
    return { latitude: 51.5072, longitude: -0.1276, latitudeDelta: 0.18, longitudeDelta: 0.18 };
  }
  const latitudes = points.map((point) => point.lat);
  const longitudes = points.map((point) => point.lng);
  const minLat = Math.min(...latitudes);
  const maxLat = Math.max(...latitudes);
  const minLng = Math.min(...longitudes);
  const maxLng = Math.max(...longitudes);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: Math.max((maxLat - minLat) * 1.7, 0.08),
    longitudeDelta: Math.max((maxLng - minLng) * 1.7, 0.08),
  };
}

function dateParts(value?: string | null) {
  if (!value) return { day: '--', month: 'TBA', full: 'Date to be announced' };
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { day: '--', month: 'TBA', full: 'Date to be announced' };
  return {
    day: String(date.getDate()).padStart(2, '0'),
    month: date.toLocaleDateString('en-GB', { month: 'short' }).toUpperCase(),
    full: `${date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })} · ${date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
  };
}

export function EventsMap({ points: sourcePoints, count, loading = false, onSelectEvent, onPress }: Props) {
  const points = useMemo<EventMapPoint[]>(
    () => sourcePoints.map((point, index) => ({
      ...point,
      id: 'id' in point ? point.id : `map-event-${index}`,
      title: 'title' in point ? point.title : 'Upcoming event',
    })),
    [sourcePoints],
  );
  const mapRef = useRef<MapView>(null);
  const [selectedId, setSelectedId] = useState<string | null>(points[0]?.id ?? null);
  const selected = points.find((point) => point.id === selectedId) ?? points[0] ?? null;
  const initialRegion = useMemo(() => regionFor(points), [points]);

  useEffect(() => {
    setSelectedId((current) => points.some((point) => point.id === current) ? current : points[0]?.id ?? null);
    if (points.length) {
      mapRef.current?.fitToCoordinates(
        points.map((point) => ({ latitude: point.lat, longitude: point.lng })),
        { edgePadding: { top: 52, right: 48, bottom: 52, left: 48 }, animated: true },
      );
    }
  }, [points]);

  if (!points.length) {
    return (
      <View style={styles.emptyCard} accessible accessibilityLabel="Events map">
        <View style={styles.emptyIcon}><MaterialIcons name="map" size={24} color="#ff6600" /></View>
        <Text style={styles.emptyTitle}>{loading ? 'Finding events on the map' : 'No mapped events yet'}</Text>
        <Text style={styles.emptyCopy}>
          {loading ? 'Pinning venues and locations…' : 'Events with confirmed locations will appear here.'}
        </Text>
      </View>
    );
  }

  const selectedDate = dateParts(selected?.startsAt);
  const eventCount = count ?? points.length;

  return (
    <View style={styles.card}>
      <View style={styles.mapWrap}>
        <MapView
          ref={mapRef}
          style={StyleSheet.absoluteFill}
          initialRegion={initialRegion}
          userInterfaceStyle="dark"
          showsCompass
          showsScale
          accessibilityLabel={`Interactive map with ${eventCount} upcoming events`}
        >
          {points.map((point) => {
            const date = dateParts(point.startsAt);
            const active = point.id === selected?.id;
            return (
              <Marker
                key={point.id}
                coordinate={{ latitude: point.lat, longitude: point.lng }}
                accessibilityLabel={`${point.title}, ${point.location || 'location to be announced'}`}
                onPress={() => {
                  selectionHaptic();
                  setSelectedId(point.id);
                }}
              >
                <View style={[styles.marker, active && styles.markerActive]}>
                  <Text style={[styles.markerDay, active && styles.markerDayActive]}>{date.day}</Text>
                  <Text style={[styles.markerMonth, active && styles.markerMonthActive]}>{date.month}</Text>
                </View>
              </Marker>
            );
          })}
        </MapView>
        <View pointerEvents="none" style={styles.mapBadge}>
          <MaterialIcons name="place" size={14} color="#ff6600" />
          <Text style={styles.mapBadgeText}>{eventCount} {eventCount === 1 ? 'event' : 'events'}</Text>
        </View>
      </View>

      {selected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`View ${selected.title}`}
          onPress={() => {
            selectionHaptic();
            if (onSelectEvent && !selected.id.startsWith('map-event-')) onSelectEvent(selected.id);
            else onPress?.();
          }}
          style={({ pressed }) => [styles.preview, pressed && styles.previewPressed]}
        >
          <View style={styles.artWrap}>
            {selected.coverImage ? (
              <PluggdImage uri={selected.coverImage} style={styles.art} resizeMode="cover" displayWidth={240} />
            ) : (
              <View style={styles.artFallback}><MaterialIcons name="event" size={24} color="#ff6600" /></View>
            )}
          </View>
          <View style={styles.previewBody}>
            <Text style={styles.previewKicker}>{selectedDate.full.toUpperCase()}</Text>
            <Text style={styles.previewTitle} numberOfLines={1}>{selected.title}</Text>
            <View style={styles.metaRow}>
              <MaterialIcons name="place" size={13} color="rgba(255,248,237,0.58)" />
              <Text style={styles.previewMeta} numberOfLines={1}>{selected.location || 'Location to be announced'}</Text>
            </View>
          </View>
          <View style={styles.previewAction}>
            <Text style={styles.price}>{Number(selected.priceCents ?? 0) > 0 ? formatGBP(selected.priceCents!, { cents: true }) : 'Free'}</Text>
            <View style={styles.arrow}><MaterialIcons name="arrow-forward" size={18} color="#1d0e03" /></View>
          </View>
        </Pressable>
      ) : (
        <View style={styles.selectPrompt}>
          <Text style={styles.selectPromptText}>Choose a pin to see the event</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,248,237,0.16)', backgroundColor: '#100b08' },
  mapWrap: { height: 330, backgroundColor: '#17110d' },
  mapBadge: { position: 'absolute', left: 12, top: 12, minHeight: 34, borderRadius: 999, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'rgba(10,7,5,0.88)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,248,237,0.22)' },
  mapBadgeText: { color: '#fff8ed', fontFamily: 'Satoshi-Bold', fontSize: 11.5 },
  marker: { minWidth: 42, minHeight: 46, borderRadius: 12, paddingHorizontal: 7, alignItems: 'center', justifyContent: 'center', backgroundColor: '#17100b', borderWidth: 2, borderColor: '#ff6600', shadowColor: '#000', shadowOpacity: 0.45, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
  markerActive: { backgroundColor: '#ff6600', transform: [{ scale: 1.08 }] },
  markerDay: { color: '#fff8ed', fontFamily: 'Satoshi-Black', fontSize: 14, lineHeight: 16 },
  markerDayActive: { color: '#1d0e03' },
  markerMonth: { color: '#ff6600', fontFamily: 'Satoshi-Black', fontSize: 8, lineHeight: 10, letterSpacing: 0.7 },
  markerMonthActive: { color: '#1d0e03' },
  preview: { minHeight: 112, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, backgroundColor: '#100b08' },
  previewPressed: { opacity: 0.9 },
  artWrap: { width: 76, height: 76, borderRadius: 10, overflow: 'hidden', flexShrink: 0 },
  art: { width: '100%', height: '100%' },
  artFallback: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#25170f' },
  previewBody: { flex: 1, minWidth: 0, gap: 4 },
  previewKicker: { color: '#ff6600', fontFamily: 'Satoshi-Black', fontSize: 9.5, letterSpacing: 0.7 },
  previewTitle: { color: '#fff8ed', fontFamily: pluggdFonts.displayBold, fontSize: 17, lineHeight: 21 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, minWidth: 0 },
  previewMeta: { flex: 1, color: 'rgba(255,248,237,0.58)', fontFamily: 'Satoshi-Medium', fontSize: 11.5 },
  previewAction: { alignItems: 'flex-end', justifyContent: 'space-between', alignSelf: 'stretch', paddingVertical: 5 },
  price: { color: '#fff8ed', fontFamily: 'Satoshi-Black', fontSize: 11.5 },
  arrow: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ff6600' },
  selectPrompt: { minHeight: 70, alignItems: 'center', justifyContent: 'center', padding: 14 },
  selectPromptText: { color: 'rgba(255,248,237,0.66)', fontFamily: 'Satoshi-Medium', fontSize: 13 },
  emptyCard: { minHeight: 240, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,248,237,0.14)', backgroundColor: '#15100c', alignItems: 'center', justifyContent: 'center', padding: 24, gap: 7 },
  emptyIcon: { width: 50, height: 50, borderRadius: 25, alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,102,0,0.1)', marginBottom: 4 },
  emptyTitle: { color: '#fff8ed', fontFamily: pluggdFonts.displayBold, fontSize: 18 },
  emptyCopy: { maxWidth: 270, color: 'rgba(255,248,237,0.58)', fontFamily: 'Satoshi-Medium', fontSize: 13, lineHeight: 18, textAlign: 'center' },
});

export default EventsMap;
