import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as ImagePicker from 'expo-image-picker';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { CreatorAccessGate } from '../../../components/CreatorAccessGate';
import type { PluggdTheme } from '../../design/tokens';
import { pluggdFonts as basePluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import {
  addOwnedReleaseTrack,
  duplicateOwnerCatalogRecord,
  loadOwnerCatalogRecord,
  moveOwnedReleaseTrack,
  removeOwnerCatalogFromPublic,
  replaceOwnerCatalogArtwork,
  replaceOwnerCatalogAudio,
  restoreOwnerCatalogDraft,
  saveOwnedReleaseTrack,
  saveOwnerCatalogRecord,
  submitOwnerCatalogForReview,
  type OwnerCatalogAsset,
  type OwnerCatalogKind,
  type OwnerCatalogRecord,
  type OwnerReleaseTrack,
} from './ownerCatalogService';

const LICENSES = ['basic_lease', 'premium_lease', 'unlimited_lease', 'exclusive_rights'] as const;
const pluggdFonts = {
  ...basePluggdFonts,
  bold: basePluggdFonts.satoshiBold,
  black: basePluggdFonts.satoshiBlack,
  regular: basePluggdFonts.satoshiRegular,
};

type FormState = {
  title: string;
  description: string;
  artist: string;
  releaseDate: string;
  releaseType: string;
  genre: string;
  subGenre: string;
  language: string;
  label: string;
  explicit: boolean;
  instrumental: boolean;
  owns100Percent: boolean;
  rightsConfirmed: boolean;
  creditsPrice: string;
  directSales: boolean;
  producerName: string;
  bpm: string;
  musicalKey: string;
  price: string;
  tags: string;
  moods: string;
  instruments: string;
  availableLicenses: string[];
  licensePrices: Record<string, string>;
  stemsRequired: boolean;
  visibility: 'public' | 'private' | 'unlisted';
  allowDownload: boolean;
  recordingType: string;
  eventName: string;
  city: string;
  bpmMin: string;
  bpmMax: string;
};

function stringList(value: unknown) {
  return Array.isArray(value) ? value.map(String).filter(Boolean) : [];
}

function commaList(value: string) {
  return value.split(',').map((item) => item.trim()).filter(Boolean);
}

function numberOrNull(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const number = Number(trimmed);
  if (!Number.isFinite(number)) throw new Error(`“${value}” is not a valid number.`);
  return number;
}

function formFromRecord(record: OwnerCatalogRecord): FormState {
  const row = record.raw;
  const licences = stringList(row.available_licenses);
  const prices = row.license_prices && typeof row.license_prices === 'object' ? row.license_prices : {};
  return {
    title: record.title,
    description: record.description,
    artist: String(row.artist || ''),
    releaseDate: String(row.release_date || ''),
    releaseType: String(row.release_type || 'Single'),
    genre: String(row.genre || row.genre_tags?.[0] || ''),
    subGenre: String(row.sub_genre || ''),
    language: String(row.language || 'English'),
    label: String(row.label || ''),
    explicit: Boolean(row.explicit),
    instrumental: Boolean(row.is_instrumental),
    owns100Percent: Boolean(row.owns_100_percent),
    rightsConfirmed: Boolean(row.distribution_rights_confirmed),
    creditsPrice: row.credits_price == null ? '' : String(row.credits_price),
    directSales: Boolean(row.enable_direct_sales),
    producerName: String(row.producer_name || ''),
    bpm: row.bpm == null ? '' : String(row.bpm),
    musicalKey: String(row.key || ''),
    price: row.price == null ? '' : String(row.price),
    tags: stringList(record.kind === 'mix' ? row.genre_tags : row.tags).join(', '),
    moods: stringList(record.kind === 'mix' ? row.mood_tags : row.moods).join(', '),
    instruments: stringList(row.instruments).join(', '),
    availableLicenses: licences,
    licensePrices: Object.fromEntries(LICENSES.map((id) => [id, prices[id] == null ? '' : String(prices[id])])),
    stemsRequired: Boolean(row.stems_required),
    visibility: row.visibility === 'public' || row.visibility === 'unlisted' ? row.visibility : 'private',
    allowDownload: Boolean(row.allow_download),
    recordingType: String(row.recording_type || ''),
    eventName: String(row.event_name || ''),
    city: String(row.city || ''),
    bpmMin: row.bpm_min == null ? '' : String(row.bpm_min),
    bpmMax: row.bpm_max == null ? '' : String(row.bpm_max),
  };
}

function Field({ label, value, onChangeText, placeholder, multiline = false, keyboardType = 'default' }: { label: string; value: string; onChangeText: (value: string) => void; placeholder?: string; multiline?: boolean; keyboardType?: 'default' | 'decimal-pad' | 'number-pad' }) {
  const { theme, styles } = useOwnerCatalogStyles();
  return <View style={styles.field}><Text style={styles.label}>{label}</Text><TextInput accessibilityLabel={label} value={value} onChangeText={onChangeText} placeholder={placeholder} placeholderTextColor={theme.colors.textMuted} multiline={multiline} textAlignVertical={multiline ? 'top' : 'center'} keyboardType={keyboardType} style={[styles.input, multiline && styles.inputMultiline]} /></View>;
}

function ToggleRow({ title, detail, value, onValueChange }: { title: string; detail: string; value: boolean; onValueChange: (value: boolean) => void }) {
  const { theme, styles } = useOwnerCatalogStyles();
  return <View style={styles.toggleRow}><View style={styles.toggleCopy}><Text style={styles.toggleTitle}>{title}</Text><Text style={styles.toggleDetail}>{detail}</Text></View><Switch accessibilityLabel={title} style={styles.switch} value={value} onValueChange={onValueChange} trackColor={{ false: theme.colors.surfacePressed, true: theme.colors.accentFill }} thumbColor={value ? theme.colors.onAccent : theme.colors.textMuted} /></View>;
}

function actionText(record: OwnerCatalogRecord) {
  if (record.kind === 'release') return record.status === 'submitted' || record.status === 'under_review' ? 'Submitted for review' : 'Submit for review';
  if (record.kind === 'beat') return record.raw.moderation_status === 'approved' ? 'Publish beat' : record.raw.moderation_status === 'under_review' ? 'Under review' : 'Submit for review';
  return record.status === 'published' ? 'Published' : 'Publish mix';
}

export function OwnerCatalogScreen() {
  const router = useRouter();
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const params = useLocalSearchParams<{ kind?: string | string[]; id?: string | string[] }>();
  const kindParam = Array.isArray(params.kind) ? params.kind[0] : params.kind;
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const kind = kindParam === 'release' || kindParam === 'beat' || kindParam === 'mix' ? kindParam : null;
  const [record, setRecord] = useState<OwnerCatalogRecord | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState<string | null>(null);
  const [newTrackTitle, setNewTrackTitle] = useState('');

  const load = async () => {
    if (!kind || !id) {
      setError('This Studio catalogue route is incomplete.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const next = await loadOwnerCatalogRecord(kind, id);
      setRecord(next);
      setForm(formFromRecord(next));
    } catch (loadError: any) {
      setError(loadError?.message || 'This catalogue workspace could not be loaded.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { void load(); }, [kind, id]);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => setForm((current) => current ? { ...current, [key]: value } : current);
  const lifecycleDisabled = !record || working != null || record.status === 'submitted' || record.status === 'under_review' || (record.kind === 'beat' && record.raw.moderation_status === 'under_review') || (record.kind === 'mix' && record.status === 'published');
  const statusDetail = useMemo(() => {
    if (!record) return '';
    if (record.kind === 'release') return record.status === 'live' ? 'Live release' : `${record.status.replaceAll('_', ' ')} · moderation ${record.moderationStatus || 'pending'}`;
    if (record.kind === 'beat') return `${record.status} · moderation ${record.moderationStatus || 'pending'}`;
    return `${record.status} · ${record.raw.visibility || 'private'}`;
  }, [record]);

  const run = async (key: string, operation: () => Promise<void>, success: string) => {
    if (working) return;
    setWorking(key);
    try {
      await operation();
      Alert.alert(success);
      await load();
    } catch (operationError: any) {
      Alert.alert('Could not complete that action', operationError?.message || 'Please try again.');
    } finally {
      setWorking(null);
    }
  };

  const save = async () => {
    if (!record || !form) return;
    let licensePrices: Record<string, number>;
    try {
      licensePrices = Object.fromEntries(form.availableLicenses.map((license) => [license, Math.max(0, numberOrNull(form.licensePrices[license] || '') || 0)]));
    } catch (priceError) {
      Alert.alert('Check licence pricing', priceError instanceof Error ? priceError.message : 'Enter a valid price for each active licence.');
      return;
    }
    await run('save', () => saveOwnerCatalogRecord(record, {
      title: form.title,
      description: form.description,
      artist: form.artist,
      releaseDate: form.releaseDate,
      releaseType: form.releaseType,
      genre: form.genre,
      subGenre: form.subGenre,
      language: form.language,
      label: form.label,
      explicit: form.explicit,
      instrumental: form.instrumental,
      owns100Percent: form.owns100Percent,
      rightsConfirmed: form.rightsConfirmed,
      creditsPrice: numberOrNull(form.creditsPrice),
      directSales: form.directSales,
      producerName: form.producerName,
      bpm: numberOrNull(form.bpm),
      musicalKey: form.musicalKey,
      price: numberOrNull(form.price),
      tags: commaList(form.tags),
      moods: commaList(form.moods),
      instruments: commaList(form.instruments),
      availableLicenses: form.availableLicenses,
      licensePrices,
      stemsRequired: form.stemsRequired,
      visibility: form.visibility,
      allowDownload: form.allowDownload,
      recordingType: form.recordingType,
      eventName: form.eventName,
      city: form.city,
      bpmMin: numberOrNull(form.bpmMin),
      bpmMax: numberOrNull(form.bpmMax),
    }), record.isPublic && record.kind !== 'mix' ? 'Changes saved and returned to review' : 'Catalogue changes saved');
  };

  const pickArtwork = async () => {
    if (!record) return;
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) return Alert.alert('Photo access needed', 'Allow photo access to replace this artwork.');
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, aspect: [1, 1], quality: 0.9 });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    await run('artwork', () => replaceOwnerCatalogArtwork(record, { uri: asset.uri, name: asset.fileName || `${record.kind}-artwork.jpg`, size: asset.fileSize, mimeType: asset.mimeType }), 'Artwork replaced');
  };

  const pickAudio = async (trackId?: string, addTrack = false) => {
    if (!record) return;
    if (addTrack && !newTrackTitle.trim()) return Alert.alert('Name the track', 'Enter the track title before choosing its audio.');
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets[0]) return;
    const source = result.assets[0];
    const asset: OwnerCatalogAsset = { uri: source.uri, name: source.name, size: source.size, mimeType: source.mimeType };
    if (addTrack) {
      await run('add-track', () => addOwnedReleaseTrack(record, newTrackTitle, asset), 'Track added as a private draft');
      setNewTrackTitle('');
    } else {
      await run(`audio-${trackId || record.id}`, () => replaceOwnerCatalogAudio(record, asset, trackId), 'Audio replacement is processing');
    }
  };

  const saveTrack = async (track: OwnerReleaseTrack) => {
    if (!record) return;
    await run(`track-${track.id}`, () => saveOwnedReleaseTrack(record, track), 'Track details saved');
  };

  const updateTrack = (trackId: string, change: Partial<OwnerReleaseTrack>) => {
    setRecord((current) => current ? { ...current, tracks: current.tracks.map((track) => track.id === trackId ? { ...track, ...change } : track) } : current);
  };

  return (
    <CreatorAccessGate>
      <SafeAreaView style={styles.safe} edges={['top']}>
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <Stack.Screen options={{ headerShown: false }} />
        <View style={styles.header}>
          <Pressable accessibilityRole="button" accessibilityLabel="Back to Studio catalog" style={styles.iconButton} onPress={() => router.back()}><MaterialIcons name="arrow-back" size={24} color={theme.colors.text} /></Pressable>
          <View style={styles.headerCopy}><Text style={styles.kicker}>CATALOGUE STUDIO</Text><Text accessibilityRole="header" style={styles.headerTitle}>{kind ? `${kind[0].toUpperCase()}${kind.slice(1)} Studio` : 'Catalog Studio'}</Text></View>
          <Pressable accessibilityRole="button" accessibilityLabel="Refresh catalogue workspace" style={styles.iconButton} onPress={() => void load()}><MaterialIcons name="refresh" size={22} color={theme.colors.text} /></Pressable>
        </View>

        {loading ? <View style={styles.center}><ActivityIndicator color={theme.colors.accentText} size="large" /><Text style={styles.centerText}>Loading owned catalogue…</Text></View> : error || !record || !form ? <View style={styles.center}><MaterialIcons name="error-outline" size={42} color={theme.colors.danger} /><Text style={styles.errorTitle}>Workspace unavailable</Text><Text style={styles.centerText}>{error}</Text><Pressable accessibilityRole="button" accessibilityLabel="Retry loading catalogue workspace" style={styles.secondaryButton} onPress={() => void load()}><Text style={styles.secondaryButtonText}>Try again</Text></Pressable></View> : (
          <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.flex}>
            <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
              <View style={styles.hero}>
                {record.artworkUrl ? <Image source={{ uri: record.artworkUrl }} style={styles.artwork} /> : <View style={[styles.artwork, styles.artworkFallback]}><MaterialIcons name={record.kind === 'release' ? 'album' : record.kind === 'beat' ? 'graphic-eq' : 'headphones'} size={42} color={theme.colors.accentText} /></View>}
                <View style={styles.heroCopy}><Text style={styles.status}>{statusDetail.toUpperCase()}</Text><Text style={styles.heroTitle} numberOfLines={3}>{record.title}</Text><Text style={styles.heroDetail}>{record.isPublic ? 'Public now' : 'Private draft or awaiting publication'}</Text></View>
              </View>
              <View style={styles.heroActions}>
                <Pressable accessibilityRole="button" style={styles.assetButton} disabled={Boolean(working)} onPress={() => void pickArtwork()}><MaterialIcons name="photo-library" size={18} color={theme.colors.text} /><Text style={styles.assetButtonText}>{working === 'artwork' ? 'Uploading…' : 'Replace artwork'}</Text></Pressable>
                {record.kind !== 'release' ? <Pressable accessibilityRole="button" style={styles.assetButton} disabled={Boolean(working)} onPress={() => void pickAudio()}><MaterialIcons name="audio-file" size={18} color={theme.colors.text} /><Text style={styles.assetButtonText}>{working === `audio-${record.id}` ? 'Uploading…' : 'Replace audio'}</Text></Pressable> : null}
              </View>

              <View style={styles.section}><Text style={styles.sectionKicker}>METADATA</Text><Text style={styles.sectionTitle}>How this appears</Text><Field label="Title" value={form.title} onChangeText={(value) => set('title', value)} /><Field label="Description" value={form.description} onChangeText={(value) => set('description', value)} multiline /></View>

              {record.kind === 'release' ? <>
                <View style={styles.section}><Text style={styles.sectionKicker}>RELEASE DETAILS</Text><Field label="Primary artist" value={form.artist} onChangeText={(value) => set('artist', value)} /><View style={styles.fieldGrid}><Field label="Release date (YYYY-MM-DD)" value={form.releaseDate} onChangeText={(value) => set('releaseDate', value)} /><Field label="Format" value={form.releaseType} onChangeText={(value) => set('releaseType', value)} /></View><View style={styles.fieldGrid}><Field label="Primary genre" value={form.genre} onChangeText={(value) => set('genre', value)} /><Field label="Subgenre" value={form.subGenre} onChangeText={(value) => set('subGenre', value)} /></View><View style={styles.fieldGrid}><Field label="Language" value={form.language} onChangeText={(value) => set('language', value)} /><Field label="Label" value={form.label} onChangeText={(value) => set('label', value)} /></View><ToggleRow title="Explicit content" detail="Marks this release for listeners and review." value={form.explicit} onValueChange={(value) => set('explicit', value)} /><ToggleRow title="Instrumental" detail="Confirms this release contains no sung or spoken lyrics." value={form.instrumental} onValueChange={(value) => set('instrumental', value)} /></View>
                <View style={styles.section}><Text style={styles.sectionKicker}>RIGHTS & ACCESS</Text><ToggleRow title="I own or control 100%" detail="Use Split Engine instead when other rightsholders participate." value={form.owns100Percent} onValueChange={(value) => set('owns100Percent', value)} /><ToggleRow title="Distribution rights confirmed" detail="Required before the release can enter moderation." value={form.rightsConfirmed} onValueChange={(value) => set('rightsConfirmed', value)} /><Field label="Credit unlock price" value={form.creditsPrice} onChangeText={(value) => set('creditsPrice', value)} keyboardType="decimal-pad" placeholder="79" /><ToggleRow title="Enable direct sales configuration" detail="Configures the catalogue only; listeners still use the permitted in-app purchase flow." value={form.directSales} onValueChange={(value) => set('directSales', value)} /></View>
                <View style={styles.section}><View style={styles.sectionHeadingRow}><View><Text style={styles.sectionKicker}>TRACKS</Text><Text style={styles.sectionTitle}>{record.tracks.length} in this release</Text></View><Pressable accessibilityRole="button" style={styles.compactButton} onPress={() => router.push(`/studio/catalog?tab=releases&item=${record.id}` as any)}><MaterialIcons name="lyrics" size={17} color={theme.colors.accentText} /><Text style={styles.compactButtonText}>Lyrics</Text></Pressable></View>
                  {record.tracks.map((track, index) => <View key={track.id} style={styles.trackCard}><View style={styles.trackTop}><Text style={styles.trackNumber}>{String(index + 1).padStart(2, '0')}</Text><TextInput accessibilityLabel={`Title for track ${index + 1}`} style={styles.trackTitleInput} value={track.title} onChangeText={(value) => updateTrack(track.id, { title: value })} /><View style={styles.reorder}><Pressable accessibilityRole="button" accessibilityLabel={`Move ${track.title} up`} style={styles.reorderButton} disabled={index === 0 || Boolean(working)} onPress={() => void run(`order-${track.id}`, () => moveOwnedReleaseTrack(record, track.id, -1), 'Track moved')}><MaterialIcons name="keyboard-arrow-up" size={24} color={index === 0 ? theme.colors.textMuted : theme.colors.text} /></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Move ${track.title} down`} style={styles.reorderButton} disabled={index === record.tracks.length - 1 || Boolean(working)} onPress={() => void run(`order-${track.id}`, () => moveOwnedReleaseTrack(record, track.id, 1), 'Track moved')}><MaterialIcons name="keyboard-arrow-down" size={24} color={index === record.tracks.length - 1 ? theme.colors.textMuted : theme.colors.text} /></Pressable></View></View><ToggleRow title="Track rights confirmed" detail="Required before this audio can be playable." value={track.rightsConfirmed} onValueChange={(value) => updateTrack(track.id, { rightsConfirmed: value })} /><ToggleRow title="Own or control 100%" detail="Turn off when splits apply." value={track.owns100Percent} onValueChange={(value) => updateTrack(track.id, { owns100Percent: value })} /><ToggleRow title="Explicit track" detail="Set the track-level content label." value={Boolean(track.explicit)} onValueChange={(value) => updateTrack(track.id, { explicit: value })} /><View style={styles.trackActions}><Pressable accessibilityRole="button" accessibilityLabel={`Save ${track.title}`} style={styles.trackButton} disabled={Boolean(working)} onPress={() => void saveTrack(track)}><MaterialIcons name="save" size={17} color={theme.colors.text} /><Text style={styles.trackButtonText}>Save track</Text></Pressable><Pressable accessibilityRole="button" accessibilityLabel={`Replace audio for ${track.title}`} style={styles.trackButton} disabled={Boolean(working)} onPress={() => void pickAudio(track.id)}><MaterialIcons name="audio-file" size={17} color={theme.colors.text} /><Text style={styles.trackButtonText}>Replace audio</Text></Pressable></View></View>)}
                  <View style={styles.addTrack}><Field label="New track title" value={newTrackTitle} onChangeText={setNewTrackTitle} placeholder="Track name" /><Pressable accessibilityRole="button" accessibilityLabel="Choose audio and add track" style={styles.secondaryButton} disabled={Boolean(working)} onPress={() => void pickAudio(undefined, true)}>{working === 'add-track' ? <ActivityIndicator color={theme.colors.text} /> : <><MaterialIcons name="add" size={19} color={theme.colors.text} /><Text style={styles.secondaryButtonText}>Choose audio and add track</Text></>}</Pressable></View>
                </View>
              </> : null}

              {record.kind === 'beat' ? <>
                <View style={styles.section}><Text style={styles.sectionKicker}>BEAT DETAILS</Text><Field label="Producer name" value={form.producerName} onChangeText={(value) => set('producerName', value)} /><View style={styles.fieldGrid}><Field label="Genre" value={form.genre} onChangeText={(value) => set('genre', value)} /><Field label="BPM" value={form.bpm} onChangeText={(value) => set('bpm', value)} keyboardType="number-pad" /></View><View style={styles.fieldGrid}><Field label="Musical key" value={form.musicalKey} onChangeText={(value) => set('musicalKey', value)} /><Field label="Base price" value={form.price} onChangeText={(value) => set('price', value)} keyboardType="decimal-pad" /></View><Field label="Tags (comma separated)" value={form.tags} onChangeText={(value) => set('tags', value)} /><Field label="Moods (comma separated)" value={form.moods} onChangeText={(value) => set('moods', value)} /><Field label="Instruments (comma separated)" value={form.instruments} onChangeText={(value) => set('instruments', value)} /></View>
                <View style={styles.section}><Text style={styles.sectionKicker}>LICENSING</Text><Text style={styles.sectionTitle}>Available licence tiers</Text>{LICENSES.map((license) => { const active = form.availableLicenses.includes(license); return <View key={license} style={styles.licenseRow}><ToggleRow title={license.replaceAll('_', ' ')} detail="Make this licence available after moderation." value={active} onValueChange={(value) => set('availableLicenses', value ? [...form.availableLicenses, license] : form.availableLicenses.filter((item) => item !== license))} />{active ? <Field label={`${license.replaceAll('_', ' ')} price`} value={form.licensePrices[license] || ''} onChangeText={(value) => set('licensePrices', { ...form.licensePrices, [license]: value })} keyboardType="decimal-pad" /> : null}</View>; })}<ToggleRow title="Stems required" detail="Signals that qualifying licences include or require stems." value={form.stemsRequired} onValueChange={(value) => set('stemsRequired', value)} /></View>
              </> : null}

              {record.kind === 'mix' ? <>
                <View style={styles.section}><Text style={styles.sectionKicker}>MIX DETAILS</Text><Field label="Genres (comma separated)" value={form.tags} onChangeText={(value) => set('tags', value)} /><Field label="Moods (comma separated)" value={form.moods} onChangeText={(value) => set('moods', value)} /><View style={styles.fieldGrid}><Field label="Recording type" value={form.recordingType} onChangeText={(value) => set('recordingType', value)} /><Field label="Event name" value={form.eventName} onChangeText={(value) => set('eventName', value)} /></View><Field label="City" value={form.city} onChangeText={(value) => set('city', value)} /><View style={styles.fieldGrid}><Field label="Minimum BPM" value={form.bpmMin} onChangeText={(value) => set('bpmMin', value)} keyboardType="number-pad" /><Field label="Maximum BPM" value={form.bpmMax} onChangeText={(value) => set('bpmMax', value)} keyboardType="number-pad" /></View><Text style={styles.label}>VISIBILITY</Text><View style={styles.choiceRow}>{(['public', 'unlisted', 'private'] as const).map((option) => <Pressable key={option} accessibilityRole="radio" accessibilityState={{ selected: form.visibility === option }} style={[styles.choice, form.visibility === option && styles.choiceActive]} onPress={() => set('visibility', option)}><Text style={[styles.choiceText, form.visibility === option && styles.choiceTextActive]}>{option}</Text></Pressable>)}</View><ToggleRow title="Allow downloads" detail="Controls permitted mix downloads independently from public streaming." value={form.allowDownload} onValueChange={(value) => set('allowDownload', value)} /></View>
              </> : null}

              <View style={styles.stickyActions}><Pressable accessibilityRole="button" accessibilityLabel="Save catalogue changes" disabled={Boolean(working)} style={styles.primaryButton} onPress={() => void save()}>{working === 'save' ? <ActivityIndicator color={theme.colors.onAccent} /> : <><Text style={styles.primaryButtonText}>Save changes</Text><MaterialIcons name="save" size={20} color={theme.colors.onAccent} /></>}</Pressable><Pressable accessibilityRole="button" accessibilityLabel={actionText(record)} disabled={lifecycleDisabled} style={[styles.secondaryButton, lifecycleDisabled && styles.disabled]} onPress={() => void run('publish', () => submitOwnerCatalogForReview(record), record.kind === 'mix' || record.raw.moderation_status === 'approved' ? 'Published' : 'Submitted for review')}>{working === 'publish' ? <ActivityIndicator color={theme.colors.text} /> : <><Text style={styles.secondaryButtonText}>{actionText(record)}</Text><MaterialIcons name="publish" size={19} color={theme.colors.text} /></>}</Pressable></View>

              <View style={styles.section}>
                <Text style={styles.sectionKicker}>MORE ACTIONS</Text>
                {record.isPublic ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove ${record.title} from public view`} style={styles.moreAction} onPress={() => Alert.alert('Remove from public?', 'This is reversible and keeps your catalogue record and uploaded media.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Remove', style: 'destructive', onPress: () => void run('remove', () => removeOwnerCatalogFromPublic(record), 'Removed from public view') }])}>
                    <MaterialIcons name="visibility-off" size={20} color={theme.colors.danger} />
                    <View style={styles.moreCopy}><Text style={styles.moreTitle}>Remove from public</Text><Text style={styles.moreDetail}>Keep the catalogue record as a private draft.</Text></View>
                  </Pressable>
                ) : record.status === 'hidden' || record.status === 'archived' ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Restore ${record.title} as a private draft`} style={styles.moreAction} onPress={() => void run('restore', () => restoreOwnerCatalogDraft(record), 'Restored as a private draft')}>
                    <MaterialIcons name="restore" size={20} color={theme.colors.text} />
                    <View style={styles.moreCopy}><Text style={styles.moreTitle}>Restore draft</Text><Text style={styles.moreDetail}>Return this item to an editable private draft.</Text></View>
                  </Pressable>
                ) : null}
                <Pressable accessibilityRole="button" accessibilityLabel={`Duplicate ${record.title} as a private draft`} style={styles.moreAction} onPress={() => Alert.alert(`Duplicate ${record.kind}?`, 'The copy remains private. Existing uploaded audio is reused; no public item is created.', [{ text: 'Cancel', style: 'cancel' }, { text: 'Duplicate', onPress: () => void run('duplicate', async () => { const copy = await duplicateOwnerCatalogRecord(record); router.replace(`/studio/catalog/${copy.kind}/${copy.id}` as any); }, 'Private copy created') }])}>
                  <MaterialIcons name="content-copy" size={20} color={theme.colors.text} />
                  <View style={styles.moreCopy}><Text style={styles.moreTitle}>Duplicate as draft</Text><Text style={styles.moreDetail}>Create an editable private copy without changing this item.</Text></View>
                </Pressable>
                {record.isPublic ? (
                  <Pressable accessibilityRole="button" accessibilityLabel={`Open public view for ${record.title}`} style={styles.moreAction} onPress={() => router.push(record.publicRoute as any)}>
                    <MaterialIcons name="open-in-new" size={20} color={theme.colors.text} />
                    <View style={styles.moreCopy}><Text style={styles.moreTitle}>View public presentation</Text><Text style={styles.moreDetail}>Open the separate fan-facing page.</Text></View>
                  </Pressable>
                ) : null}
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        )}
      </SafeAreaView>
    </CreatorAccessGate>
  );
}

function useOwnerCatalogStyles() {
  const theme = usePluggdTheme();
  return { theme, styles: useMemo(() => createStyles(theme), [theme]) };
}

function createStyles(theme: PluggdTheme) {
  return StyleSheet.create({
  safe: { flex: 1, backgroundColor: theme.colors.background }, flex: { flex: 1 },
  header: { minHeight: 78, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', gap: 14, borderBottomWidth: 1, borderBottomColor: theme.colors.divider },
  iconButton: { width: 46, height: 46, borderRadius: 23, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  headerCopy: { flex: 1 }, kicker: { color: theme.colors.accentText, fontFamily: pluggdFonts.bold, fontSize: 11, letterSpacing: 1.8 }, headerTitle: { color: theme.colors.text, fontFamily: pluggdFonts.black, fontSize: 24, marginTop: 2 },
  center: { flex: 1, padding: 30, alignItems: 'center', justifyContent: 'center', gap: 14 }, centerText: { color: theme.colors.textSecondary, textAlign: 'center', fontFamily: pluggdFonts.regular, fontSize: 15, lineHeight: 22 }, errorTitle: { color: theme.colors.text, fontFamily: pluggdFonts.bold, fontSize: 23 },
  content: { padding: 18, paddingBottom: 60, gap: 18 },
  hero: { flexDirection: 'row', gap: 16, alignItems: 'center' }, artwork: { width: 112, height: 112, borderRadius: 22, backgroundColor: theme.colors.artworkBase }, artworkFallback: { alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.border }, heroCopy: { flex: 1 }, status: { color: theme.colors.accentText, fontFamily: pluggdFonts.bold, fontSize: 10, letterSpacing: 1.2 }, heroTitle: { color: theme.colors.text, fontFamily: pluggdFonts.black, fontSize: 28, lineHeight: 31, marginTop: 6 }, heroDetail: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.regular, fontSize: 13, marginTop: 7 },
  heroActions: { flexDirection: 'row', gap: 10 }, assetButton: { flex: 1, minHeight: 48, borderRadius: 15, backgroundColor: theme.colors.surface, borderWidth: 1, borderColor: theme.colors.controlBorder, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingHorizontal: 12 }, assetButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.bold, fontSize: 13 },
  section: { borderRadius: 24, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 18, gap: 15 }, sectionKicker: { color: theme.colors.accentText, fontFamily: pluggdFonts.bold, fontSize: 10, letterSpacing: 1.8 }, sectionTitle: { color: theme.colors.text, fontFamily: pluggdFonts.black, fontSize: 22, marginTop: -6 }, sectionHeadingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  field: { flex: 1, gap: 7 }, label: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.bold, fontSize: 10, letterSpacing: 1.2 }, input: { minHeight: 50, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, fontFamily: pluggdFonts.regular, fontSize: 15, paddingHorizontal: 14 }, inputMultiline: { minHeight: 116, paddingTop: 14 }, fieldGrid: { flexDirection: 'row', gap: 12 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52 }, toggleCopy: { flex: 1 }, toggleTitle: { color: theme.colors.text, fontFamily: pluggdFonts.bold, fontSize: 14, textTransform: 'capitalize' }, toggleDetail: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.regular, fontSize: 12, lineHeight: 17, marginTop: 3 }, switch: { minWidth: 51, minHeight: 44 },
  compactButton: { minHeight: 44, paddingHorizontal: 13, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, flexDirection: 'row', alignItems: 'center', gap: 7 }, compactButtonText: { color: theme.colors.accentText, fontFamily: pluggdFonts.bold, fontSize: 12 },
  trackCard: { borderRadius: 19, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surfaceRaised, padding: 14, gap: 11 }, trackTop: { flexDirection: 'row', alignItems: 'center', gap: 10 }, trackNumber: { color: theme.colors.accentText, fontFamily: pluggdFonts.black, fontSize: 17, width: 28 }, trackTitleInput: { flex: 1, color: theme.colors.text, minHeight: 45, borderBottomWidth: 1, borderBottomColor: theme.colors.controlBorder, fontFamily: pluggdFonts.bold, fontSize: 16 }, reorder: { flexDirection: 'row', gap: 2 }, reorderButton: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }, trackActions: { flexDirection: 'row', gap: 9 }, trackButton: { flex: 1, minHeight: 44, borderRadius: 13, backgroundColor: theme.colors.surfaceAlt, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 7 }, trackButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.bold, fontSize: 12 }, addTrack: { borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: 16, gap: 12 },
  licenseRow: { borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: 10 }, choiceRow: { flexDirection: 'row', gap: 8 }, choice: { flex: 1, minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' }, choiceActive: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill }, choiceText: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.bold, fontSize: 12, textTransform: 'capitalize' }, choiceTextActive: { color: theme.colors.onAccent },
  stickyActions: { gap: 10 }, primaryButton: { minHeight: 58, borderRadius: 18, backgroundColor: theme.colors.accentFill, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, primaryButtonText: { color: theme.colors.onAccent, fontFamily: pluggdFonts.black, fontSize: 16 }, secondaryButton: { minHeight: 52, borderRadius: 17, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, paddingHorizontal: 18 }, secondaryButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.bold, fontSize: 14 }, disabled: { opacity: 0.45 },
  moreAction: { minHeight: 66, flexDirection: 'row', alignItems: 'center', gap: 13, borderTopWidth: 1, borderTopColor: theme.colors.divider, paddingTop: 14 }, moreCopy: { flex: 1 }, moreTitle: { color: theme.colors.text, fontFamily: pluggdFonts.bold, fontSize: 14 }, moreDetail: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.regular, fontSize: 12, lineHeight: 17, marginTop: 3 },
  });
}
