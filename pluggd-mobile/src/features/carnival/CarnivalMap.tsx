import Mapbox, { Camera, MapView, PointAnnotation } from '@rnmapbox/maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { pluggdFonts } from '../../design/typography';
import type { CarnivalSignal } from './carnivalTypes';
import { carnivalSignalCategory } from './carnivalService';

const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim() ?? '';
if (token) Mapbox.setAccessToken(token);

const ORANGE = '#FF6600';
const LONDON_CARNIVAL_CENTER: [number, number] = [-0.203, 51.515];

function coordinate(signal: CarnivalSignal): [number, number] | null {
  if (typeof signal.public_longitude !== 'number' || typeof signal.public_latitude !== 'number') return null;
  return [signal.public_longitude, signal.public_latitude];
}

export function CarnivalMap({
  signals,
  routeStopIds = [],
  onSelectedSignal,
}: {
  signals: CarnivalSignal[];
  routeStopIds?: string[];
  onSelectedSignal?: (signal: CarnivalSignal) => void;
}) {
  const [selected, setSelected] = useState<CarnivalSignal | null>(null);
  const points = useMemo(() => signals.filter((signal) => coordinate(signal)), [signals]);

  if (!token) {
    return (
      <View accessibilityRole="text" style={[styles.map, styles.unavailable]}>
        <MaterialIcons name="map" size={28} color={ORANGE} />
        <Text style={styles.unavailableTitle}>Map temporarily unavailable</Text>
        <Text style={styles.unavailableCopy}>The sourced Carnival stops are still available in the list below.</Text>
      </View>
    );
  }

  return (
    <View style={styles.mapShell}>
      <MapView
        style={styles.map}
        styleURL="mapbox://styles/mapbox/dark-v11"
        logoEnabled={false}
        attributionEnabled
        compassEnabled
        scaleBarEnabled={false}
        accessibilityLabel="Interactive Carnival map. Pan and zoom to explore sourced locations."
      >
        <Camera defaultSettings={{ centerCoordinate: LONDON_CARNIVAL_CENTER, zoomLevel: 13.2 }} minZoomLevel={10} maxZoomLevel={18} />
        {points.map((signal, index) => {
          const location = coordinate(signal)!;
          const isRouteStop = routeStopIds.includes(signal.id);
          return (
            <PointAnnotation
              id={`carnival-${signal.id}`}
              key={signal.id}
              coordinate={location}
              title={signal.location_label ?? `Carnival stop ${index + 1}`}
              onSelected={() => {
                setSelected(signal);
                onSelectedSignal?.(signal);
              }}
            >
              <View style={[styles.marker, isRouteStop && styles.routeMarker]}>
                <Text style={styles.markerText}>{isRouteStop ? index + 1 : '•'}</Text>
              </View>
            </PointAnnotation>
          );
        })}
      </MapView>
      <View pointerEvents="none" style={styles.mapLabel}>
        <Text style={styles.mapLabelText}>{points.length} sourced places</Text>
      </View>
      {selected ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Close details for ${selected.location_label ?? 'Carnival stop'}`}
          onPress={() => setSelected(null)}
          style={styles.selectedCard}
        >
          <Text style={styles.selectedEyebrow}>{carnivalSignalCategory(selected)}</Text>
          <Text style={styles.selectedTitle} numberOfLines={1}>{selected.location_label ?? 'Carnival stop'}</Text>
          <Text style={styles.selectedBody} numberOfLines={2}>{selected.body || 'A verified point in the PLUGGD Carnival guide.'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  mapShell: { height: 360, borderRadius: 26, overflow: 'hidden', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.16)', backgroundColor: '#17120F' },
  map: { flex: 1 },
  unavailable: { alignItems: 'center', justifyContent: 'center', gap: 8, padding: 28 },
  unavailableTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 18 },
  unavailableCopy: { color: 'rgba(255,255,255,0.62)', fontFamily: pluggdFonts.satoshiRegular, fontSize: 13, lineHeight: 19, textAlign: 'center' },
  marker: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center', backgroundColor: '#111111', borderWidth: 2, borderColor: ORANGE },
  routeMarker: { width: 32, height: 32, borderRadius: 16, backgroundColor: ORANGE, borderColor: '#FFFFFF' },
  markerText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBlack, fontSize: 11 },
  mapLabel: { position: 'absolute', top: 12, left: 12, backgroundColor: 'rgba(8,7,6,0.82)', borderRadius: 999, paddingHorizontal: 12, paddingVertical: 7, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.2)' },
  mapLabelText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiBold, fontSize: 11 },
  selectedCard: { position: 'absolute', left: 12, right: 12, bottom: 12, borderRadius: 18, backgroundColor: 'rgba(8,7,6,0.94)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,102,0,0.55)', padding: 14, gap: 4 },
  selectedEyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1.1, textTransform: 'uppercase' },
  selectedTitle: { color: '#FFFFFF', fontFamily: pluggdFonts.displayBold, fontSize: 17 },
  selectedBody: { color: 'rgba(255,255,255,0.68)', fontFamily: pluggdFonts.satoshiRegular, fontSize: 12.5, lineHeight: 17 },
});

