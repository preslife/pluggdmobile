import Mapbox, { Camera, CircleLayer, LineLayer, MapView, ShapeSource, SymbolLayer, UserLocation } from '@rnmapbox/maps';
import { MaterialIcons } from '@expo/vector-icons';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PluggdImage } from '../../components/PluggdImage';
import { useAuth } from '../../context/AuthProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { pluggdFonts } from '../../design/typography';
import { useBottomChromeInset } from '../../design/useBottomChromeInset';
import { formatCompact } from '../../lib/mobileContent';
import { MAPBOX_CONFIG } from '../../lib/mapbox';
import { loadSavedCarnivalRoute } from '../carnival/carnivalService';
import type { SavedCarnivalRoute } from '../carnival/carnivalTypes';
import {
  createAndPublishMapSignal,
  loadMapSignals,
  toggleMapSignalLike,
  tuneInMapSignal,
  type MapSignal,
} from './mapSignalsService';
import { DiscoveryReturnBar } from '../discovery/DiscoveryReturnBar';
import { usePluggdTheme } from '../../design/usePluggdTheme';

const MAP_STYLE = 'mapbox://styles/mapbox/dark-v11';
const DEFAULT_CENTER: [number, number] = [-0.1276, 51.5072];
const ACTIVITY_FILTERS = ['live music', 'studio session', 'listening party', 'open decks', 'community'];
const MOOD_FILTERS = ['high energy', 'deep', 'experimental', 'soulful', 'open'];

if (MAPBOX_CONFIG.TOKEN.trim()) void Mapbox.setAccessToken(MAPBOX_CONFIG.TOKEN.trim());

function label(signal: MapSignal) {
  return signal.locationLabel || [signal.city, signal.country].filter(Boolean).join(', ') || 'Approximate signal';
}

function ago(value: string) {
  const elapsed = Date.now() - new Date(value).getTime();
  if (!Number.isFinite(elapsed) || elapsed < 0) return 'Live now';
  const minutes = Math.floor(elapsed / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function signalCollection(signals: MapSignal[], selectedId: string | null) {
  return {
    type: 'FeatureCollection',
    features: signals.map((signal) => ({
      type: 'Feature',
      id: signal.id,
      geometry: { type: 'Point', coordinates: [signal.longitude, signal.latitude] },
      properties: {
        id: signal.id,
        selected: signal.id === selectedId ? 1 : 0,
        promoted: signal.promoted ? 1 : 0,
        scene: signal.sceneMarker ? 1 : 0,
        recent: signal.recentTuneInCount,
      },
    })),
  } as any;
}

function carnivalLine(route: SavedCarnivalRoute | null) {
  const coordinates = route?.stops
    .filter((stop) => Number.isFinite(stop.public_longitude) && Number.isFinite(stop.public_latitude))
    .map((stop) => [Number(stop.public_longitude), Number(stop.public_latitude)]);
  if (!coordinates || coordinates.length < 2) return null;
  return { type: 'Feature', geometry: { type: 'LineString', coordinates }, properties: {} } as any;
}

function TagChip({ label: text, selected, onPress }: { label: string; selected: boolean; onPress: () => void }) {
  const styles = useMapSignalsStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ selected }} onPress={onPress} style={[styles.tagChip, selected && styles.tagChipActive]}>
      <Text style={[styles.tagChipText, selected && styles.tagChipTextActive]}>{text}</Text>
    </Pressable>
  );
}

function SignalRow({ signal, selected, onPress }: { signal: MapSignal; selected?: boolean; onPress: () => void }) {
  const theme = usePluggdTheme();
  const styles = useMapSignalsStyles();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open signal from ${signal.authorName} at ${label(signal)}`} onPress={onPress} style={[styles.listRow, selected && styles.listRowSelected]}>
      <View style={styles.rowAvatar}>
        {signal.authorAvatarUrl ? <PluggdImage uri={signal.authorAvatarUrl} style={styles.rowAvatarImage} displayWidth={120} /> : <MaterialIcons name="graphic-eq" size={21} color={theme.colors.accentText} />}
      </View>
      <View style={styles.rowBody}>
        <View style={styles.rowTop}><Text style={styles.rowAuthor} numberOfLines={1}>{signal.authorName}</Text><Text style={styles.rowTime}>{ago(signal.createdAt)}</Text></View>
        <Text style={styles.rowLocation} numberOfLines={1}><MaterialIcons name="place" size={12} color={theme.colors.accentText} /> {label(signal)}</Text>
        {signal.body ? <Text style={styles.rowCopy} numberOfLines={2}>{signal.body}</Text> : null}
        <Text style={styles.rowMetrics}>{formatCompact(signal.tuneInCount)} tuned in · {formatCompact(signal.likeCount)} likes</Text>
      </View>
      <MaterialIcons name="chevron-right" size={22} color={theme.colors.textMuted} />
    </Pressable>
  );
}

export function MapSignalsScreen() {
  const theme = usePluggdTheme();
  const styles = useMapSignalsStyles();
  const router = useRouter();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const bottomInset = useBottomChromeInset();
  const queryClient = useQueryClient();
  const cameraRef = useRef<any>(null);
  const [mode, setMode] = useState<'map' | 'list'>('map');
  const [search, setSearch] = useState('');
  const [activityTags, setActivityTags] = useState<string[]>([]);
  const [moodTags, setMoodTags] = useState<string[]>([]);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [composerOpen, setComposerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [mapFailed, setMapFailed] = useState(false);
  const [cameraState, setCameraState] = useState({ center: DEFAULT_CENTER, zoom: 10 });
  const [locating, setLocating] = useState(false);
  const [showUserLocation, setShowUserLocation] = useState(false);
  const [userCoordinate, setUserCoordinate] = useState<[number, number] | null>(null);
  const [savedRoute, setSavedRoute] = useState<SavedCarnivalRoute | null>(null);
  const [draftBody, setDraftBody] = useState('');
  const [draftLocation, setDraftLocation] = useState('');
  const [draftCity, setDraftCity] = useState('');
  const [draftCountry, setDraftCountry] = useState('');
  const [draftActivity, setDraftActivity] = useState<string[]>([]);
  const [draftMood, setDraftMood] = useState<string[]>([]);

  const queryKey = ['map-signals', activityTags, moodTags] as const;
  const query = useQuery({
    queryKey,
    queryFn: () => loadMapSignals({ activityTags, moodTags }),
    staleTime: 20_000,
    refetchInterval: 30_000,
  });
  useQuery({
    queryKey: ['saved-carnival-route', 'map-overlay'],
    queryFn: async () => {
      const route = await loadSavedCarnivalRoute();
      setSavedRoute(route);
      return route;
    },
    staleTime: 60_000,
  });

  const filtered = useMemo(() => {
    const needle = search.trim().toLocaleLowerCase('en-GB');
    if (!needle) return query.data ?? [];
    return (query.data ?? []).filter((signal) => [
      signal.authorName,
      signal.body,
      signal.locationLabel,
      signal.city,
      signal.country,
      ...signal.activityTags,
      ...signal.moodTags,
    ].filter(Boolean).join(' ').toLocaleLowerCase('en-GB').includes(needle));
  }, [query.data, search]);
  const selected = filtered.find((signal) => signal.id === selectedId) ?? null;
  const features = useMemo(() => signalCollection(filtered, selectedId), [filtered, selectedId]);
  const routeLine = useMemo(() => carnivalLine(savedRoute), [savedRoute]);

  const updateSignal = (signalId: string, changes: Partial<MapSignal>) => {
    queryClient.setQueryData<MapSignal[]>(queryKey, (current = []) => current.map((signal) => signal.id === signalId ? { ...signal, ...changes } : signal));
  };
  const tuneMutation = useMutation({
    mutationFn: (signalId: string) => tuneInMapSignal(signalId),
    onSuccess: (result, signalId) => { impactHaptic(); updateSignal(signalId, { tunedIn: result.tunedIn, tuneInCount: result.count }); },
    onError: (error: Error) => {
      if (error.message.includes('not_authenticated')) router.push({ pathname: '/auth/login', params: { redirect: '/maps' } } as never);
      else Alert.alert('Tune In unavailable', error.message);
    },
  });
  const likeMutation = useMutation({
    mutationFn: (signalId: string) => toggleMapSignalLike(signalId),
    onSuccess: (result, signalId) => { selectionHaptic(); updateSignal(signalId, { liked: result.liked, likeCount: result.count }); },
    onError: (error: Error) => {
      if (error.message.includes('not_authenticated')) router.push({ pathname: '/auth/login', params: { redirect: '/maps' } } as never);
      else Alert.alert('Like unavailable', error.message);
    },
  });
  const createMutation = useMutation({
    mutationFn: createAndPublishMapSignal,
    onSuccess: async () => {
      impactHaptic();
      setComposerOpen(false);
      setDraftBody('');
      setDraftLocation('');
      setDraftCity('');
      setDraftCountry('');
      setDraftActivity([]);
      setDraftMood([]);
      await query.refetch();
      Alert.alert('Signal is live', 'Your approximate map signal is now visible on PLUGGD Maps.');
    },
    onError: (error: Error) => Alert.alert('Signal not published', error.message),
  });

  const selectSignal = (signalId: string) => {
    const signal = filtered.find((item) => item.id === signalId);
    if (!signal) return;
    selectionHaptic();
    setSelectedId(signal.id);
    setMode('map');
    cameraRef.current?.setCamera({ centerCoordinate: [signal.longitude, signal.latitude], zoomLevel: Math.max(cameraState.zoom, 13), animationDuration: 450 });
  };

  const locateMe = async () => {
    setLocating(true);
    try {
      if (Platform.OS === 'android') {
        const allowed = await Mapbox.requestAndroidLocationPermissions();
        if (!allowed) throw new Error('Location permission was not granted.');
      }
      setShowUserLocation(true);
    } catch (error) {
      setLocating(false);
      Alert.alert('Location unavailable', error instanceof Error ? error.message : 'Location permission was not granted.');
    }
  };

  const openComposer = () => {
    if (!user?.id) {
      router.push({ pathname: '/auth/login', params: { redirect: '/maps' } } as never);
      return;
    }
    setComposerOpen(true);
  };

  const publishSignal = () => {
    const body = draftBody.trim();
    const coordinates = userCoordinate || cameraState.center;
    if (!body) return Alert.alert('Add a signal', 'Write what is happening before publishing.');
    createMutation.mutate({
      body,
      city: draftCity.trim() || null,
      country: draftCountry.trim() || null,
      locationLabel: draftLocation.trim() || null,
      latitude: coordinates[1],
      longitude: coordinates[0],
      activityTags: draftActivity,
      moodTags: draftMood,
      precision: draftCity.trim() ? 'city' : 'approximate',
    });
  };

  const openDirections = (signal: MapSignal) => {
    const destination = `${signal.latitude},${signal.longitude}`;
    const url = Platform.OS === 'ios'
      ? `http://maps.apple.com/?daddr=${destination}`
      : `geo:${destination}?q=${destination}(${encodeURIComponent(label(signal))})`;
    void Linking.openURL(url);
  };

  const mapUnavailable = !MAPBOX_CONFIG.TOKEN.trim() || mapFailed;

  return (
    <View style={styles.screen}>
      <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
      {mode === 'map' && !mapUnavailable ? (
        <MapView
          style={StyleSheet.absoluteFill}
          styleURL={MAP_STYLE}
          logoEnabled
          attributionEnabled
          compassEnabled
          scaleBarEnabled={false}
          localizeLabels={{ locale: 'current' }}
          onMapLoadingError={() => setMapFailed(true)}
          onCameraChanged={(event: any) => {
            const center = event?.properties?.center;
            const zoom = Number(event?.properties?.zoom);
            if (Array.isArray(center) && center.length === 2) setCameraState({ center: [Number(center[0]), Number(center[1])], zoom: Number.isFinite(zoom) ? zoom : cameraState.zoom });
          }}
          onPress={() => setSelectedId(null)}
          accessibilityLabel={`Interactive PLUGGD scene map with ${filtered.length} signals. Use the List button for an accessible list.`}
        >
          <Camera ref={cameraRef} defaultSettings={{ centerCoordinate: DEFAULT_CENTER, zoomLevel: 10 }} minZoomLevel={2} maxZoomLevel={18} />
          {showUserLocation ? (
            <UserLocation
              visible
              onUpdate={(location: any) => {
                const longitude = Number(location?.coords?.longitude);
                const latitude = Number(location?.coords?.latitude);
                if (!Number.isFinite(longitude) || !Number.isFinite(latitude)) return;
                const coordinate: [number, number] = [longitude, latitude];
                setUserCoordinate(coordinate);
                setLocating(false);
                cameraRef.current?.setCamera({ centerCoordinate: coordinate, zoomLevel: 14, animationDuration: 500 });
              }}
            />
          ) : null}
          {routeLine ? (
            <ShapeSource id="carnival-route" shape={routeLine}>
              <LineLayer id="carnival-route-glow" style={{ lineColor: '#FFB000', lineWidth: 7, lineOpacity: 0.22, lineBlur: 4 }} />
              <LineLayer id="carnival-route-line" style={{ lineColor: '#FFB000', lineWidth: 3, lineOpacity: 0.94, lineDasharray: [1.2, 1.1] }} />
            </ShapeSource>
          ) : null}
          <ShapeSource
            id="pluggd-signals"
            shape={features}
            cluster
            clusterRadius={48}
            clusterMaxZoomLevel={13}
            onPress={(event: any) => {
              const feature = event?.features?.[0];
              const coordinates = feature?.geometry?.coordinates;
              if (feature?.properties?.cluster && Array.isArray(coordinates)) {
                cameraRef.current?.setCamera({ centerCoordinate: coordinates, zoomLevel: cameraState.zoom + 2, animationDuration: 450 });
                return;
              }
              const signalId = String(feature?.properties?.id || feature?.id || '');
              if (signalId) selectSignal(signalId);
            }}
          >
            <CircleLayer id="signal-cluster" filter={['has', 'point_count']} style={{ circleColor: '#FF6600', circleStrokeColor: '#1A0B03', circleStrokeWidth: 3, circleRadius: ['step', ['get', 'point_count'], 19, 10, 23, 50, 29] as any }} />
            <SymbolLayer id="signal-cluster-count" filter={['has', 'point_count']} style={{ textField: ['get', 'point_count_abbreviated'] as any, textColor: '#160B04', textSize: 12, textFont: ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'] }} />
            <CircleLayer id="signal-live-pulse" filter={['!', ['has', 'point_count']]} style={{ circleColor: '#FF6600', circleOpacity: 0.18, circleRadius: ['interpolate', ['linear'], ['get', 'recent'], 0, 12, 1, 18, 10, 30] as any }} />
            <CircleLayer id="signal-point" filter={['!', ['has', 'point_count']]} style={{ circleColor: ['case', ['==', ['get', 'selected'], 1], '#FFF8EE', ['==', ['get', 'promoted'], 1], '#FFB000', '#FF6600'] as any, circleRadius: ['case', ['==', ['get', 'scene'], 1], 9, 7] as any, circleStrokeColor: '#120A05', circleStrokeWidth: 3 }} />
          </ShapeSource>
        </MapView>
      ) : (
        <View style={styles.listCanvas}>
          {query.isLoading ? <View style={styles.center}><ActivityIndicator color={theme.colors.accentFill} size="large" /><Text style={styles.centerCopy}>Finding live scene signals…</Text></View> : null}
          {query.isError ? <View style={styles.center}><MaterialIcons name="cloud-off" size={34} color={theme.colors.accentText} /><Text style={styles.centerTitle}>Maps could not load</Text><Text style={styles.centerCopy}>Check your connection and try again.</Text><Pressable accessibilityRole="button" onPress={() => void query.refetch()} style={styles.retryButton}><Text style={styles.retryText}>Try again</Text></Pressable></View> : null}
          {!query.isLoading && !query.isError ? (
            <FlatList
              data={filtered}
              keyExtractor={(item) => item.id}
              contentContainerStyle={{ paddingTop: insets.top + 192, paddingHorizontal: 14, paddingBottom: bottomInset }}
              ItemSeparatorComponent={() => <View style={styles.listDivider} />}
              renderItem={({ item }) => <SignalRow signal={item} selected={item.id === selectedId} onPress={() => selectSignal(item.id)} />}
              ListEmptyComponent={<View style={styles.center}><MaterialIcons name="travel-explore" size={35} color={theme.colors.accentText} /><Text style={styles.centerTitle}>No signals match</Text><Text style={styles.centerCopy}>Clear search or filters to explore the full map.</Text></View>}
            />
          ) : null}
        </View>
      )}

      <View style={[styles.topOverlay, { paddingTop: insets.top + 8 }]}>
        <DiscoveryReturnBar tone={theme.scheme === 'light' ? 'paper' : 'dark'} style={styles.returnBar} />
        <View style={styles.topLine}>
          <View>
            <Text style={styles.liveLabel}><Text style={styles.liveDot}>●</Text> LIVE SCENE MAP</Text>
            <Text style={styles.title}>Maps</Text>
          </View>
          <View style={styles.modeSwitch}>
            <Pressable accessibilityRole="button" accessibilityLabel="Show map" accessibilityState={{ selected: mode === 'map' }} onPress={() => setMode('map')} style={[styles.modeButton, mode === 'map' && styles.modeButtonActive]}><MaterialIcons name="map" size={20} color={mode === 'map' ? theme.colors.onAccent : theme.colors.text} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel="Show accessible signal list" accessibilityState={{ selected: mode === 'list' }} onPress={() => setMode('list')} style={[styles.modeButton, mode === 'list' && styles.modeButtonActive]}><MaterialIcons name="view-list" size={21} color={mode === 'list' ? theme.colors.onAccent : theme.colors.text} /></Pressable>
          </View>
        </View>
        <View style={styles.searchRow}>
          <View style={styles.searchBox}><MaterialIcons name="search" size={21} color={theme.colors.textMuted} /><TextInput accessibilityLabel="Search scene signals" value={search} onChangeText={setSearch} placeholder="Search place, scene or sound" placeholderTextColor={theme.colors.textMuted} style={styles.searchInput} />{search ? <Pressable accessibilityRole="button" accessibilityLabel="Clear map search" onPress={() => setSearch('')} style={styles.searchClear}><MaterialIcons name="close" size={18} color={theme.colors.text} /></Pressable> : null}</View>
          <Pressable accessibilityRole="button" accessibilityLabel="Filter map signals" accessibilityState={{ selected: Boolean(activityTags.length || moodTags.length) }} onPress={() => setFiltersOpen(true)} style={[styles.squareButton, Boolean(activityTags.length || moodTags.length) && styles.squareButtonActive]}><MaterialIcons name="tune" size={22} color={activityTags.length || moodTags.length ? theme.colors.onAccent : theme.colors.text} /></Pressable>
        </View>
      </View>

      {mode === 'map' ? (
        <View style={[styles.mapControls, { bottom: Math.max(bottomInset, 100) + (selected ? 238 : 12) }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Locate me" accessibilityState={{ busy: locating }} onPress={() => void locateMe()} style={styles.mapControl}>{locating ? <ActivityIndicator size="small" color={theme.colors.text} /> : <MaterialIcons name="my-location" size={21} color={theme.colors.text} />}</Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="Create a map signal" onPress={openComposer} style={[styles.mapControl, styles.createControl]}><MaterialIcons name="add" size={25} color={theme.colors.onAccent} /></Pressable>
        </View>
      ) : null}

      {selected && mode === 'map' ? (
        <View style={[styles.selectedSheet, { bottom: bottomInset }]}>
          <View style={styles.sheetHandle} />
          <View style={styles.selectedTop}>
            <View style={styles.selectedAvatar}>{selected.authorAvatarUrl ? <PluggdImage uri={selected.authorAvatarUrl} style={styles.selectedAvatarImage} displayWidth={140} /> : <MaterialIcons name="graphic-eq" size={22} color={theme.colors.accentText} />}</View>
            <View style={styles.selectedIdentity}><Text style={styles.selectedAuthor}>{selected.authorName}</Text><Text style={styles.selectedLocation}>{label(selected)} · {ago(selected.createdAt)}</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close signal details" onPress={() => setSelectedId(null)} style={styles.closeButton}><MaterialIcons name="close" size={19} color={theme.colors.text} /></Pressable>
          </View>
          {selected.body ? <Text style={styles.selectedBody} numberOfLines={3}>{selected.body}</Text> : null}
          <View style={styles.signalTags}>{[...selected.activityTags, ...selected.moodTags].slice(0, 4).map((tag) => <View key={tag} style={styles.signalTag}><Text style={styles.signalTagText}>{tag}</Text></View>)}</View>
          <View style={styles.selectedActions}>
            <Pressable accessibilityRole="button" accessibilityState={{ selected: selected.tunedIn, busy: tuneMutation.isPending }} onPress={() => tuneMutation.mutate(selected.id)} style={[styles.tuneButton, selected.tunedIn && styles.tuneButtonActive]}><MaterialIcons name="sensors" size={19} color={selected.tunedIn ? theme.colors.onAccent : theme.colors.accentText} /><Text style={[styles.tuneText, selected.tunedIn && styles.tuneTextActive]}>{selected.tunedIn ? 'Tuned in' : 'Tune In'} · {formatCompact(selected.tuneInCount)}</Text></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={selected.liked ? 'Unlike signal' : 'Like signal'} accessibilityState={{ selected: selected.liked, busy: likeMutation.isPending }} onPress={() => likeMutation.mutate(selected.id)} style={styles.actionCircle}><MaterialIcons name={selected.liked ? 'favorite' : 'favorite-border'} size={21} color={selected.liked ? theme.colors.accentText : theme.colors.text} /></Pressable>
            <Pressable accessibilityRole="button" accessibilityLabel={`Directions to ${label(selected)}`} onPress={() => openDirections(selected)} style={styles.actionCircle}><MaterialIcons name="directions" size={21} color={theme.colors.text} /></Pressable>
          </View>
        </View>
      ) : null}

      {mapUnavailable && mode === 'map' ? <View style={[styles.mapUnavailable, { top: insets.top + 200, bottom: bottomInset }]}><MaterialIcons name="map" size={40} color={theme.colors.accentText} /><Text style={styles.centerTitle}>Map canvas unavailable</Text><Text style={styles.centerCopy}>The accessible signal list remains available while the map service reconnects.</Text><Pressable accessibilityRole="button" onPress={() => setMode('list')} style={styles.retryButton}><Text style={styles.retryText}>Open signal list</Text></Pressable></View> : null}

      <Modal visible={filtersOpen} transparent animationType="slide" onRequestClose={() => setFiltersOpen(false)}>
        <Pressable accessible={false} style={styles.modalBackdrop} onPress={() => setFiltersOpen(false)} />
        <View style={[styles.filterSheet, { paddingBottom: insets.bottom + 18 }]}>
          <View style={styles.modalHeader}><View><Text style={styles.modalEyebrow}>DISCOVERY FILTERS</Text><Text style={styles.modalTitle}>What are you looking for?</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Close filters" onPress={() => setFiltersOpen(false)} style={styles.closeButton}><MaterialIcons name="close" size={21} color={theme.colors.text} /></Pressable></View>
          <Text style={styles.filterTitle}>ACTIVITY</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>{ACTIVITY_FILTERS.map((tag) => <TagChip key={tag} label={tag} selected={activityTags.includes(tag)} onPress={() => setActivityTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} />)}</ScrollView>
          <Text style={styles.filterTitle}>MOOD</Text><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tagRow}>{MOOD_FILTERS.map((tag) => <TagChip key={tag} label={tag} selected={moodTags.includes(tag)} onPress={() => setMoodTags((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} />)}</ScrollView>
          <View style={styles.filterActions}><Pressable accessibilityRole="button" onPress={() => { setActivityTags([]); setMoodTags([]); }} style={styles.clearFilters}><Text style={styles.clearFiltersText}>Clear all</Text></Pressable><Pressable accessibilityRole="button" onPress={() => setFiltersOpen(false)} style={styles.applyFilters}><Text style={styles.applyFiltersText}>Show {filtered.length} signals</Text></Pressable></View>
        </View>
      </Modal>

      <Modal visible={composerOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setComposerOpen(false)}>
        <KeyboardAvoidingView style={styles.composer} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={[styles.composerHeader, { paddingTop: insets.top + 10 }]}><Pressable accessibilityRole="button" accessibilityLabel="Close signal composer" onPress={() => setComposerOpen(false)} style={styles.closeButton}><MaterialIcons name="close" size={21} color={theme.colors.text} /></Pressable><Text style={styles.composerTitle}>Create a signal</Text><View style={{ width: 44 }} /></View>
          <ScrollView contentContainerStyle={[styles.composerContent, { paddingBottom: insets.bottom + 30 }]} keyboardShouldPersistTaps="handled">
            <Text style={styles.composerLead}>Show the map what is moving around you.</Text>
            <Text style={styles.inputLabel}>WHAT'S HAPPENING?</Text><TextInput accessibilityLabel="Signal message" value={draftBody} onChangeText={(value) => setDraftBody(value.slice(0, 280))} multiline maxLength={280} placeholder="Open decks, a listening party, a sound system warming up…" placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.bodyInput]} /><Text style={styles.charCount}>{draftBody.length}/280</Text>
            <Text style={styles.inputLabel}>LOCATION LABEL</Text><TextInput accessibilityLabel="Signal location label" value={draftLocation} onChangeText={setDraftLocation} placeholder="Venue, area or landmark (optional)" placeholderTextColor={theme.colors.textMuted} style={styles.input} />
            <View style={styles.inputPair}><View style={styles.inputHalf}><Text style={styles.inputLabel}>CITY</Text><TextInput accessibilityLabel="Signal city" value={draftCity} onChangeText={setDraftCity} placeholder="City" placeholderTextColor={theme.colors.textMuted} style={styles.input} /></View><View style={styles.inputHalf}><Text style={styles.inputLabel}>COUNTRY</Text><TextInput accessibilityLabel="Signal country" value={draftCountry} onChangeText={setDraftCountry} placeholder="Country" placeholderTextColor={theme.colors.textMuted} style={styles.input} /></View></View>
            <View style={styles.coordinateCard}><MaterialIcons name="privacy-tip" size={23} color={theme.colors.accentText} /><View style={styles.coordinateCopy}><Text style={styles.coordinateTitle}>{userCoordinate ? 'Using your approximate location' : 'Using the current map centre'}</Text><Text style={styles.coordinateBody}>PLUGGD publishes an approximate point unless a verified event or venue is linked. Location permission is requested only when you choose Locate me.</Text></View><Pressable accessibilityRole="button" onPress={() => void locateMe()} style={styles.locateTextButton}><Text style={styles.locateText}>{userCoordinate ? 'Update' : 'Locate me'}</Text></Pressable></View>
            <Text style={styles.inputLabel}>ACTIVITY</Text><View style={styles.wrapTags}>{ACTIVITY_FILTERS.map((tag) => <TagChip key={tag} label={tag} selected={draftActivity.includes(tag)} onPress={() => setDraftActivity((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} />)}</View>
            <Text style={styles.inputLabel}>MOOD</Text><View style={styles.wrapTags}>{MOOD_FILTERS.map((tag) => <TagChip key={tag} label={tag} selected={draftMood.includes(tag)} onPress={() => setDraftMood((current) => current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag])} />)}</View>
            <Pressable accessibilityRole="button" accessibilityState={{ disabled: !draftBody.trim(), busy: createMutation.isPending }} disabled={!draftBody.trim() || createMutation.isPending} onPress={publishSignal} style={[styles.publishButton, (!draftBody.trim() || createMutation.isPending) && styles.publishButtonDisabled]}>{createMutation.isPending ? <ActivityIndicator color={theme.colors.onAccent} /> : <><Text style={styles.publishText}>Publish signal</Text><MaterialIcons name="north-east" size={20} color={theme.colors.onAccent} /></>}</Pressable>
          </ScrollView>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

function useMapSignalsStyles() {
  const theme = usePluggdTheme();
  return useMemo(() => StyleSheet.create({
  screen: { flex: 1, backgroundColor: theme.colors.background },
  listCanvas: { flex: 1, backgroundColor: theme.colors.background },
  topOverlay: { position: 'absolute', left: 0, right: 0, top: 0, paddingHorizontal: 14, paddingBottom: 12, gap: 10, backgroundColor: theme.colors.headerGlass, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  returnBar: { paddingHorizontal: 0 },
  topLine: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between' },
  liveLabel: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.4 },
  liveDot: { color: theme.colors.accentText },
  title: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 29, lineHeight: 32, letterSpacing: -0.8, marginTop: 2 },
  modeSwitch: { flexDirection: 'row', padding: 3, borderRadius: 24, backgroundColor: theme.colors.surfaceRaised, borderWidth: 1, borderColor: theme.colors.controlBorder },
  modeButton: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  modeButtonActive: { backgroundColor: theme.colors.accentFill },
  searchRow: { flexDirection: 'row', gap: 8 },
  searchBox: { flex: 1, minHeight: 48, flexDirection: 'row', alignItems: 'center', paddingLeft: 13, borderRadius: 10, backgroundColor: theme.colors.surfaceRaised, borderWidth: 1, borderColor: theme.colors.controlBorder },
  searchInput: { flex: 1, minHeight: 46, color: theme.colors.text, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13.5, paddingHorizontal: 9 },
  searchClear: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  squareButton: { width: 48, height: 48, borderRadius: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceRaised, borderWidth: 1, borderColor: theme.colors.controlBorder },
  squareButtonActive: { backgroundColor: theme.colors.accentFill },
  mapControls: { position: 'absolute', right: 14, gap: 9 },
  mapControl: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.surfaceRaised, borderWidth: 1, borderColor: theme.colors.controlBorder },
  createControl: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  selectedSheet: { position: 'absolute', left: 10, right: 10, minHeight: 222, padding: 15, paddingTop: 9, gap: 10, borderRadius: 20, backgroundColor: theme.colors.surfaceRaised, borderWidth: 1, borderColor: theme.colors.borderAccent, shadowColor: theme.colors.shadow, shadowOpacity: 0.55, shadowRadius: 18, shadowOffset: { width: 0, height: 8 } },
  sheetHandle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, backgroundColor: theme.colors.divider, marginBottom: 2 },
  selectedTop: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  selectedAvatar: { width: 44, height: 44, borderRadius: 22, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.artworkBase, borderWidth: 1, borderColor: theme.colors.borderAccent },
  selectedAvatarImage: { width: '100%', height: '100%' },
  selectedIdentity: { flex: 1, minWidth: 0 },
  selectedAuthor: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  selectedLocation: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, marginTop: 2 },
  closeButton: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  selectedBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, lineHeight: 20 },
  signalTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  signalTag: { minHeight: 27, borderRadius: 14, paddingHorizontal: 9, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentSoft },
  signalTagText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 9.5 },
  selectedActions: { minHeight: 48, flexDirection: 'row', alignItems: 'center', gap: 8 },
  tuneButton: { flex: 1, minHeight: 48, borderRadius: 24, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  tuneButtonActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  tuneText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  tuneTextActive: { color: theme.colors.onAccent },
  actionCircle: { width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface },
  mapUnavailable: { position: 'absolute', left: 14, right: 14, alignItems: 'center', justifyContent: 'center', gap: 10, padding: 28, backgroundColor: theme.colors.surfaceRaised },
  center: { minHeight: 270, alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 28 },
  centerTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 21, textAlign: 'center' },
  centerCopy: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19, textAlign: 'center', maxWidth: 320 },
  retryButton: { minHeight: 46, borderRadius: 23, backgroundColor: theme.colors.accentFill, paddingHorizontal: 18, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  retryText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  listRow: { minHeight: 116, flexDirection: 'row', alignItems: 'center', gap: 11, paddingVertical: 14, paddingHorizontal: 4 },
  listRowSelected: { backgroundColor: theme.colors.accentSoft },
  rowAvatar: { width: 50, height: 50, borderRadius: 25, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.artworkBase },
  rowAvatarImage: { width: '100%', height: '100%' },
  rowBody: { flex: 1, minWidth: 0 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8 },
  rowAuthor: { flex: 1, color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13.5 },
  rowTime: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5 },
  rowLocation: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold, fontSize: 10.5, marginTop: 2 },
  rowCopy: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12.5, lineHeight: 17, marginTop: 5 },
  rowMetrics: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBold, fontSize: 9.5, marginTop: 5 },
  listDivider: { height: StyleSheet.hairlineWidth, backgroundColor: theme.colors.divider },
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: theme.colors.overlay },
  filterSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, minHeight: 390, padding: 20, gap: 10, borderTopLeftRadius: 26, borderTopRightRadius: 26, backgroundColor: theme.colors.surfaceRaised, borderTopWidth: 1, borderColor: theme.colors.borderAccent },
  modalHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  modalEyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.4 },
  modalTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 22, marginTop: 3 },
  filterTitle: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.3, marginTop: 8 },
  tagRow: { gap: 7, paddingRight: 16 },
  wrapTags: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  tagChip: { minHeight: 44, borderRadius: 22, paddingHorizontal: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface },
  tagChipActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  tagChipText: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiBold, fontSize: 11 },
  tagChipTextActive: { color: theme.colors.onAccent },
  filterActions: { flexDirection: 'row', gap: 9, marginTop: 18 },
  clearFilters: { minHeight: 48, paddingHorizontal: 18, borderRadius: 24, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface },
  clearFiltersText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  applyFilters: { flex: 1, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', backgroundColor: theme.colors.accentFill },
  applyFiltersText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  composer: { flex: 1, backgroundColor: theme.colors.background },
  composerHeader: { minHeight: 72, paddingHorizontal: 14, paddingBottom: 10, flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: theme.colors.divider },
  composerTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 18, marginBottom: 11 },
  composerContent: { padding: 20, gap: 9 },
  composerLead: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 25, lineHeight: 30, marginBottom: 13 },
  inputLabel: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.3, marginTop: 10 },
  input: { minHeight: 50, borderRadius: 10, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, fontFamily: pluggdFonts.satoshiMedium, fontSize: 14, paddingHorizontal: 14 },
  bodyInput: { minHeight: 126, paddingTop: 13, textAlignVertical: 'top' },
  charCount: { alignSelf: 'flex-end', color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10 },
  inputPair: { flexDirection: 'row', gap: 9 },
  inputHalf: { flex: 1, gap: 9 },
  coordinateCard: { minHeight: 106, marginTop: 12, borderRadius: 14, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10, backgroundColor: theme.colors.accentSoft, borderWidth: 1, borderColor: theme.colors.borderAccent },
  coordinateCopy: { flex: 1 },
  coordinateTitle: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12.5 },
  coordinateBody: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, lineHeight: 15, marginTop: 3 },
  locateTextButton: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  locateText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11 },
  publishButton: { minHeight: 54, marginTop: 22, borderRadius: 27, paddingHorizontal: 20, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, backgroundColor: theme.colors.accentFill },
  publishButtonDisabled: { opacity: 0.42 },
  publishText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.satoshiBlack, fontSize: 14 },
  }), [theme]);
}
