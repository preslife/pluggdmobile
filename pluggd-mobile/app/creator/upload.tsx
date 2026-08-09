import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text as NativeText,
  type TextProps,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { selectionHaptic } from '../../src/design/haptics';
import { pluggdFonts } from '../../src/design/typography';

type UploadKind = 'release' | 'beat' | 'mix';
type UploadStep = 'details' | 'media' | 'rights' | 'review';

type DraftAsset = {
  name: string;
  uri: string;
  size?: number | null;
  mimeType?: string | null;
};

type UploadDraft = {
  kind: UploadKind;
  title: string;
  creator: string;
  genre: string;
  releaseDate: string;
  bpm: string;
  musicalKey: string;
  recordingType: string;
  description: string;
  rightsOwner: string;
  tracklist: string;
  explicit: boolean;
  rightsConfirmed: boolean;
  artwork: DraftAsset | null;
  audio: DraftAsset | null;
  updatedAt?: string;
};

const ORANGE = '#FF6500';
const PAPER = '#FFF8ED';
const MUTED = 'rgba(255,248,237,0.62)';
const LINE = 'rgba(255,255,255,0.12)';
const PANEL = 'rgba(255,255,255,0.055)';
const AUDIO_DRAFT_DIRECTORY = 'pluggd-upload-drafts/audio/';
const STEPS: Array<{ id: UploadStep; label: string; short: string }> = [
  { id: 'details', label: 'Details', short: '01' },
  { id: 'media', label: 'Media', short: '02' },
  { id: 'rights', label: 'Rights', short: '03' },
  { id: 'review', label: 'Review', short: '04' },
];
const KINDS: Array<{ id: UploadKind; label: string; icon: keyof typeof MaterialIcons.glyphMap; line: string }> = [
  { id: 'release', label: 'Release', icon: 'album', line: 'Single, EP or album' },
  { id: 'beat', label: 'Beat', icon: 'graphic-eq', line: 'Preview and licence draft' },
  { id: 'mix', label: 'Mix', icon: 'headphones', line: 'DJ mix or live set' },
];

function Text({ maxFontSizeMultiplier = 1.3, ...props }: TextProps) {
  return <NativeText maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}

function normalizedKind(value: string | string[] | undefined): UploadKind {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === 'beat' || candidate === 'mix' ? candidate : 'release';
}

function emptyDraft(kind: UploadKind): UploadDraft {
  return {
    kind,
    title: '',
    creator: '',
    genre: '',
    releaseDate: '',
    bpm: '',
    musicalKey: '',
    recordingType: kind === 'mix' ? 'Studio mix' : '',
    description: '',
    rightsOwner: '',
    tracklist: '',
    explicit: false,
    rightsConfirmed: false,
    artwork: null,
    audio: null,
  };
}

function draftKey(kind: UploadKind) {
  return `pluggd:studio-upload-draft:${kind}`;
}

function formatSize(bytes?: number | null) {
  if (!bytes || bytes < 1) return 'Size available after selection';
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function safeDraftFileName(name: string) {
  const sanitized = name
    .normalize('NFKD')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(-96);

  return sanitized || 'audio-upload';
}

async function persistPickedAudio(asset: DocumentPicker.DocumentPickerAsset): Promise<DraftAsset> {
  if (!FileSystem.documentDirectory) {
    throw new Error('Persistent document storage is unavailable.');
  }

  const directoryUri = `${FileSystem.documentDirectory}${AUDIO_DRAFT_DIRECTORY}`;
  await FileSystem.makeDirectoryAsync(directoryUri, { intermediates: true });

  const destinationUri = `${directoryUri}${Date.now()}-${safeDraftFileName(asset.name)}`;
  await FileSystem.copyAsync({ from: asset.uri, to: destinationUri });

  return {
    name: asset.name,
    uri: destinationUri,
    size: asset.size,
    mimeType: asset.mimeType,
  };
}

function completedCount(draft: UploadDraft) {
  return [
    Boolean(draft.title.trim() && draft.creator.trim() && draft.genre.trim()),
    Boolean(draft.audio && draft.artwork),
    Boolean(draft.rightsOwner.trim() && draft.rightsConfirmed),
  ].filter(Boolean).length;
}

export default function CreatorUpload() {
  const router = useRouter();
  const params = useLocalSearchParams<{ type?: string | string[] }>();
  const initialKind = normalizedKind(params.type);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<UploadDraft>(() => emptyDraft(initialKind));
  const [step, setStep] = useState<UploadStep>('details');
  const [restoring, setRestoring] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  useEffect(() => {
    let active = true;
    setRestoring(true);
    AsyncStorage.getItem(draftKey(initialKind))
      .then((stored) => {
        if (!active) return;
        if (!stored) {
          setDraft(emptyDraft(initialKind));
          return;
        }
        const parsed = JSON.parse(stored) as UploadDraft;
        setDraft({ ...emptyDraft(initialKind), ...parsed, kind: initialKind });
      })
      .catch(() => {
        if (active) setDraft(emptyDraft(initialKind));
      })
      .finally(() => {
        if (active) setRestoring(false);
      });
    return () => {
      active = false;
    };
  }, [initialKind]);

  const activeIndex = STEPS.findIndex((item) => item.id === step);
  const progress = useMemo(() => completedCount(draft), [draft]);

  const update = <K extends keyof UploadDraft>(key: K, value: UploadDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const switchKind = async (kind: UploadKind) => {
    if (kind === draft.kind) return;
    selectionHaptic();
    const stored = await AsyncStorage.getItem(draftKey(kind)).catch(() => null);
    setDraft(stored ? { ...emptyDraft(kind), ...(JSON.parse(stored) as UploadDraft), kind } : emptyDraft(kind));
    setStep('details');
    router.setParams({ type: kind });
  };

  const chooseArtwork = async () => {
    selectionHaptic();
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      Alert.alert('Photo access needed', 'Allow photo access to choose release artwork.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (result.canceled || !result.assets[0]) return;
    const asset = result.assets[0];
    update('artwork', {
      name: asset.fileName || `${draft.kind}-artwork.jpg`,
      uri: asset.uri,
      size: asset.fileSize,
      mimeType: asset.mimeType,
    });
  };

  const chooseAudio = async () => {
    selectionHaptic();
    const result = await DocumentPicker.getDocumentAsync({
      type: 'audio/*',
      // Android SAF grants can be temporary. First copy the provider URI into
      // app cache, then copy it below into durable app-owned document storage.
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      update('audio', await persistPickedAudio(result.assets[0]));
    } catch (error) {
      console.warn('Audio draft copy failed', error);
      Alert.alert('Audio not saved', 'PLUGGD could not make a durable copy of that audio file. Choose it again.');
    }
  };

  const saveDraft = async () => {
    setSaving(true);
    try {
      const next = { ...draft, updatedAt: new Date().toISOString() };
      await AsyncStorage.setItem(draftKey(draft.kind), JSON.stringify(next));
      setDraft(next);
      selectionHaptic();
      Alert.alert('Draft saved', 'Your draft is safe on this device. You can return and continue at any time.');
    } catch {
      Alert.alert('Draft not saved', 'PLUGGD could not save this draft on your device.');
    } finally {
      setSaving(false);
    }
  };

  const goNext = () => {
    if (activeIndex === STEPS.length - 1) {
      setReviewOpen(true);
      return;
    }
    selectionHaptic();
    setStep(STEPS[activeIndex + 1].id);
  };

  if (restoring) {
    return (
      <View style={styles.loading}>
        <StatusBar style="light" />
        <ActivityIndicator color={ORANGE} />
        <Text style={styles.loadingText}>Opening your draft…</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style="light" />
      <LinearGradient colors={['#070504', '#050505', '#0D0805']} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(34, insets.bottom + 24) }]}
        >
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to Studio" onPress={() => router.back()} style={styles.iconButton}>
              <MaterialIcons name="arrow-back" size={22} color={PAPER} />
            </Pressable>
            <View style={styles.brand}>
              <Text style={styles.brandSmall}>PLUGGD</Text>
              <Text style={styles.brandTitle}>UPLOAD STUDIO</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Save upload draft" onPress={saveDraft} style={styles.saveTop}>
              <MaterialIcons name="cloud-done" size={17} color={ORANGE} />
              <Text style={styles.saveTopText}>Save</Text>
            </Pressable>
          </View>

          <View style={styles.hero}>
            <View style={styles.heroTop}>
              <View style={styles.heroCopy}>
                <Text style={styles.eyebrow}>CREATE YOUR NEXT RELEASE</Text>
                <Text style={styles.heroTitle}>Build the draft.{'\n'}Keep the momentum.</Text>
                <Text style={styles.heroBody}>
                  Add the music, artwork and rights details now, then review everything before it goes live.
                </Text>
              </View>
              <View style={styles.progressOrb}>
                <Text style={styles.progressValue}>{progress}/3</Text>
                <Text style={styles.progressLabel}>READY</Text>
              </View>
            </View>

            <View style={styles.kindRow}>
              {KINDS.map((kind) => {
                const selected = kind.id === draft.kind;
                return (
                  <Pressable
                    key={kind.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected }}
                    onPress={() => void switchKind(kind.id)}
                    style={[styles.kindCard, selected && styles.kindCardSelected]}
                  >
                    <MaterialIcons name={kind.icon} size={20} color={selected ? ORANGE : MUTED} />
                    <Text style={[styles.kindLabel, selected && styles.kindLabelSelected]}>{kind.label}</Text>
                    <Text style={styles.kindLine} numberOfLines={1}>{kind.line}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.stepRail}>
            {STEPS.map((item, index) => {
              const selected = item.id === step;
              const passed = index < activeIndex;
              return (
                <Pressable
                  key={item.id}
                  accessibilityRole="tab"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    selectionHaptic();
                    setStep(item.id);
                  }}
                  style={[styles.step, selected && styles.stepSelected]}
                >
                  <Text style={[styles.stepNumber, (selected || passed) && styles.stepNumberActive]}>{item.short}</Text>
                  <Text style={[styles.stepLabel, selected && styles.stepLabelActive]}>{item.label}</Text>
                  {passed ? <MaterialIcons name="check" size={14} color={ORANGE} /> : null}
                </Pressable>
              );
            })}
          </ScrollView>

          {step === 'details' ? (
            <View style={styles.section}>
              <SectionHeading
                eyebrow="THE ESSENTIALS"
                title={`${KINDS.find((item) => item.id === draft.kind)?.label} details`}
                body="Clear metadata makes the work easier to find, present and support."
              />
              <Field label="Title" value={draft.title} onChangeText={(value) => update('title', value)} placeholder={`Name this ${draft.kind}`} />
              <Field label={draft.kind === 'beat' ? 'Producer' : draft.kind === 'mix' ? 'DJ / selector' : 'Primary artist'} value={draft.creator} onChangeText={(value) => update('creator', value)} placeholder="Creator display name" />
              <View style={styles.twoColumn}>
                <Field compact label="Genre / scene" value={draft.genre} onChangeText={(value) => update('genre', value)} placeholder="e.g. Alté" />
                {draft.kind === 'beat' ? (
                  <Field compact label="BPM" value={draft.bpm} onChangeText={(value) => update('bpm', value.replace(/[^0-9]/g, ''))} placeholder="120" keyboardType="number-pad" />
                ) : (
                  <Field compact label={draft.kind === 'mix' ? 'Recording' : 'Release date'} value={draft.kind === 'mix' ? draft.recordingType : draft.releaseDate} onChangeText={(value) => update(draft.kind === 'mix' ? 'recordingType' : 'releaseDate', value)} placeholder={draft.kind === 'mix' ? 'Studio mix' : 'DD / MM / YYYY'} />
                )}
              </View>
              {draft.kind === 'beat' ? (
                <Field label="Key" value={draft.musicalKey} onChangeText={(value) => update('musicalKey', value)} placeholder="e.g. F minor" />
              ) : null}
            </View>
          ) : null}

          {step === 'media' ? (
            <View style={styles.section}>
              <SectionHeading
                eyebrow="MAKE IT FELT"
                title="Artwork and audio"
                body="Use finished artwork and the clearest master or preview you have."
              />
              <Pressable accessibilityRole="button" accessibilityLabel="Choose square artwork" onPress={chooseArtwork} style={styles.artworkPicker}>
                {draft.artwork ? (
                  <Image source={{ uri: draft.artwork.uri }} style={styles.artworkImage} />
                ) : (
                  <LinearGradient colors={['rgba(255,101,0,0.24)', 'rgba(255,255,255,0.05)']} style={styles.artworkPlaceholder}>
                    <MaterialIcons name="add-photo-alternate" size={34} color={ORANGE} />
                  </LinearGradient>
                )}
                <View style={styles.assetCopy}>
                  <Text style={styles.assetKicker}>SQUARE ARTWORK</Text>
                  <Text style={styles.assetTitle} numberOfLines={1}>{draft.artwork?.name || 'Choose cover artwork'}</Text>
                  <Text style={styles.assetMeta}>{draft.artwork ? formatSize(draft.artwork.size) : 'JPG or PNG · high resolution'}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={MUTED} />
              </Pressable>

              <Pressable accessibilityRole="button" accessibilityLabel="Choose audio file" onPress={chooseAudio} style={styles.audioPicker}>
                <View style={styles.audioIcon}>
                  <MaterialIcons name={draft.audio ? 'audio-file' : 'library-music'} size={27} color={ORANGE} />
                </View>
                <View style={styles.assetCopy}>
                  <Text style={styles.assetKicker}>{draft.kind === 'beat' ? 'MASTER OR PREVIEW' : 'PRIMARY AUDIO'}</Text>
                  <Text style={styles.assetTitle} numberOfLines={1}>{draft.audio?.name || 'Choose audio file'}</Text>
                  <Text style={styles.assetMeta}>{draft.audio ? formatSize(draft.audio.size) : 'WAV, AIFF, FLAC or MP3'}</Text>
                </View>
                <View style={styles.addCircle}>
                  <MaterialIcons name={draft.audio ? 'swap-horiz' : 'add'} size={20} color={PAPER} />
                </View>
              </Pressable>

              <View style={styles.guidanceBand}>
                <MaterialIcons name="tips-and-updates" size={18} color={ORANGE} />
                <Text style={styles.guidanceText}>
                  Keep source files available. PLUGGD will validate duration, format and artwork quality before final submission.
                </Text>
              </View>
            </View>
          ) : null}

          {step === 'rights' ? (
            <View style={styles.section}>
              <SectionHeading
                eyebrow="OWNERSHIP FIRST"
                title="Rights and context"
                body="Capture the essential ownership context before anything is submitted."
              />
              <Field label="Rights owner" value={draft.rightsOwner} onChangeText={(value) => update('rightsOwner', value)} placeholder="Person, label or company" />
              <Field
                label={draft.kind === 'mix' ? 'Tracklist and timestamps' : 'Description / credits'}
                value={draft.kind === 'mix' ? draft.tracklist : draft.description}
                onChangeText={(value) => update(draft.kind === 'mix' ? 'tracklist' : 'description', value)}
                placeholder={draft.kind === 'mix' ? '00:00 Artist — Track' : 'Credits, collaborators and useful context'}
                multiline
              />
              <ToggleRow
                icon="explicit"
                title="Explicit content"
                body="Mark this accurately for storefront and audience controls."
                value={draft.explicit}
                onValueChange={(value) => update('explicit', value)}
              />
              <ToggleRow
                icon="verified-user"
                title="I control the necessary rights"
                body="You can provide splits, clearances and licence documents during final review."
                value={draft.rightsConfirmed}
                onValueChange={(value) => update('rightsConfirmed', value)}
              />
            </View>
          ) : null}

          {step === 'review' ? (
            <View style={styles.section}>
              <SectionHeading
                eyebrow="FINAL CHECK"
                title="Review the draft"
                body="See what is ready and what still needs attention before final publishing."
              />
              <View style={styles.reviewCard}>
                <ReviewRow label="Identity" value={draft.title && draft.creator ? `${draft.title} · ${draft.creator}` : 'Needs title and creator'} ready={Boolean(draft.title && draft.creator)} />
                <ReviewRow label="Discovery" value={draft.genre || 'Needs genre or scene'} ready={Boolean(draft.genre)} />
                <ReviewRow label="Artwork" value={draft.artwork?.name || 'Artwork not selected'} ready={Boolean(draft.artwork)} />
                <ReviewRow label="Audio" value={draft.audio?.name || 'Audio not selected'} ready={Boolean(draft.audio)} />
                <ReviewRow label="Rights" value={draft.rightsOwner || 'Rights owner not added'} ready={Boolean(draft.rightsOwner && draft.rightsConfirmed)} />
              </View>
              <Pressable accessibilityRole="button" onPress={() => setReviewOpen(true)} style={styles.reviewAction}>
                <View>
                  <Text style={styles.reviewActionKicker}>PUBLISHING READINESS</Text>
                  <Text style={styles.reviewActionTitle}>{progress === 3 ? 'Draft ready for final review' : `${3 - progress} section${3 - progress === 1 ? '' : 's'} need attention`}</Text>
                </View>
                <MaterialIcons name="arrow-outward" size={22} color={ORANGE} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.footerActions}>
            {activeIndex > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => setStep(STEPS[activeIndex - 1].id)} style={styles.secondaryButton}>
                <MaterialIcons name="arrow-back" size={18} color={PAPER} />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={goNext} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{step === 'review' ? 'Open review' : `Continue to ${STEPS[activeIndex + 1]?.label}`}</Text>
              <MaterialIcons name="arrow-forward" size={18} color="#160B04" />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={reviewOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReviewOpen(false)}>
        <SafeAreaView style={styles.reviewModal}>
          <View style={styles.modalHandle} />
          <View style={styles.modalHead}>
            <View>
              <Text style={styles.modalEyebrow}>DRAFT REVIEW</Text>
              <Text style={styles.modalTitle}>{draft.title || `Untitled ${draft.kind}`}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close review" onPress={() => setReviewOpen(false)} style={styles.modalClose}>
              <MaterialIcons name="close" size={22} color={PAPER} />
            </Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.modalContent}>
            <View style={styles.modalScore}>
              <Text style={styles.modalScoreValue}>{progress}/3</Text>
              <View style={styles.modalScoreCopy}>
                <Text style={styles.modalScoreTitle}>{progress === 3 ? 'Core draft ready' : 'Draft in progress'}</Text>
                <Text style={styles.modalScoreBody}>Details, media and rights are checked separately so nothing important gets buried.</Text>
              </View>
            </View>
            <ReviewRow label="Type" value={KINDS.find((item) => item.id === draft.kind)?.label || draft.kind} ready />
            <ReviewRow label="Title" value={draft.title || 'Not added'} ready={Boolean(draft.title)} />
            <ReviewRow label="Creator" value={draft.creator || 'Not added'} ready={Boolean(draft.creator)} />
            <ReviewRow label="Media" value={draft.audio && draft.artwork ? 'Artwork and audio selected' : 'Media incomplete'} ready={Boolean(draft.audio && draft.artwork)} />
            <ReviewRow label="Rights" value={draft.rightsConfirmed ? 'Ownership confirmed' : 'Confirmation needed'} ready={draft.rightsConfirmed} />
          </ScrollView>
          <View style={[styles.modalFooter, { paddingBottom: Math.max(14, insets.bottom) }]}>
            <Text style={styles.modalNote}>Saving keeps this draft on your device. Final submission is completed after PLUGGD validates the files and rights details.</Text>
            <Pressable accessibilityRole="button" onPress={saveDraft} disabled={saving} style={styles.primaryButton}>
              {saving ? <ActivityIndicator color="#160B04" /> : <Text style={styles.primaryButtonText}>Save draft</Text>}
              {!saving ? <MaterialIcons name="cloud-done" size={18} color="#160B04" /> : null}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  return (
    <View style={styles.sectionHeading}>
      <Text style={styles.sectionEyebrow}>{eyebrow}</Text>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Text style={styles.sectionBody}>{body}</Text>
    </View>
  );
}

function Field({
  label,
  compact,
  multiline,
  ...props
}: {
  label: string;
  compact?: boolean;
  multiline?: boolean;
} & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={[styles.field, compact && styles.fieldCompact]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        maxFontSizeMultiplier={1.4}
        multiline={multiline}
        placeholderTextColor="rgba(255,248,237,0.34)"
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

function ToggleRow({
  icon,
  title,
  body,
  value,
  onValueChange,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  body: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIcon}>
        <MaterialIcons name={icon} size={20} color={ORANGE} />
      </View>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleBody}>{body}</Text>
      </View>
      <Switch
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: 'rgba(255,255,255,0.16)', true: 'rgba(255,101,0,0.54)' }}
        thumbColor={value ? ORANGE : '#D8D3CD'}
      />
    </View>
  );
}

function ReviewRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  return (
    <View style={styles.reviewRow}>
      <View style={[styles.reviewStatus, ready && styles.reviewStatusReady]}>
        <MaterialIcons name={ready ? 'check' : 'priority-high'} size={14} color={ready ? '#130A04' : MUTED} />
      </View>
      <View style={styles.reviewCopy}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: '#050505' },
  loading: { flex: 1, backgroundColor: '#050505', alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: MUTED, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  content: { paddingHorizontal: 16, gap: 18 },
  topBar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, alignItems: 'center', justifyContent: 'center' },
  brand: { alignItems: 'center', gap: 1 },
  brandSmall: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 1.3 },
  brandTitle: { color: PAPER, fontFamily: pluggdFonts.displayBold, fontSize: 16, letterSpacing: -0.3 },
  saveTop: { minWidth: 70, height: 44, borderRadius: 16, borderWidth: 1, borderColor: 'rgba(255,101,0,0.38)', backgroundColor: 'rgba(255,101,0,0.08)', paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveTopText: { color: PAPER, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  hero: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: LINE, paddingVertical: 20, gap: 18 },
  heroTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  heroCopy: { flex: 1 },
  eyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.5 },
  heroTitle: { color: PAPER, fontFamily: pluggdFonts.displayExtraBold, fontSize: 30, lineHeight: 33, letterSpacing: -1, marginTop: 8 },
  heroBody: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19, marginTop: 10 },
  progressOrb: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: 'rgba(255,101,0,0.52)', backgroundColor: 'rgba(255,101,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: PAPER, fontFamily: pluggdFonts.satoshiBlack, fontSize: 18 },
  progressLabel: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 7.5, letterSpacing: 1 },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindCard: { flex: 1, minHeight: 86, borderRadius: 16, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, padding: 11, justifyContent: 'space-between' },
  kindCardSelected: { borderColor: 'rgba(255,101,0,0.65)', backgroundColor: 'rgba(255,101,0,0.1)' },
  kindLabel: { color: PAPER, fontFamily: pluggdFonts.displayBold, fontSize: 13.5 },
  kindLabelSelected: { color: ORANGE },
  kindLine: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 9.5 },
  stepRail: { flexGrow: 1, gap: 6 },
  step: { flex: 1, minWidth: 78, height: 44, borderRadius: 14, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  stepSelected: { borderColor: 'rgba(255,101,0,0.55)', backgroundColor: 'rgba(255,101,0,0.12)' },
  stepNumber: { color: MUTED, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1 },
  stepNumberActive: { color: ORANGE },
  stepLabel: { color: MUTED, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  stepLabelActive: { color: PAPER },
  section: { gap: 13 },
  sectionHeading: { marginBottom: 2 },
  sectionEyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.5 },
  sectionTitle: { color: PAPER, fontFamily: pluggdFonts.displayBold, fontSize: 23, lineHeight: 28, letterSpacing: -0.6, marginTop: 5 },
  sectionBody: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 330 },
  field: { gap: 7 },
  fieldCompact: { flex: 1 },
  fieldLabel: { color: 'rgba(255,248,237,0.72)', fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, color: PAPER, paddingHorizontal: 14, fontFamily: pluggdFonts.satoshiMedium, fontSize: 15 },
  inputMultiline: { minHeight: 118, paddingTop: 14, textAlignVertical: 'top' },
  twoColumn: { flexDirection: 'row', gap: 10 },
  artworkPicker: { minHeight: 116, borderRadius: 20, borderWidth: 1, borderColor: LINE, backgroundColor: PANEL, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  artworkPlaceholder: { width: 94, height: 94, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  artworkImage: { width: 94, height: 94, borderRadius: 14, backgroundColor: '#171717' },
  audioPicker: { minHeight: 86, borderRadius: 20, borderWidth: 1, borderColor: 'rgba(255,101,0,0.26)', backgroundColor: 'rgba(255,101,0,0.065)', padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  audioIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: 'rgba(255,101,0,0.13)', alignItems: 'center', justifyContent: 'center' },
  assetCopy: { flex: 1, minWidth: 0 },
  assetKicker: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.25 },
  assetTitle: { color: PAPER, fontFamily: pluggdFonts.displayBold, fontSize: 14, marginTop: 4 },
  assetMeta: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, marginTop: 4 },
  addCircle: { width: 36, height: 36, borderRadius: 18, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  guidanceBand: { borderLeftWidth: 2, borderLeftColor: ORANGE, backgroundColor: 'rgba(255,255,255,0.035)', padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  guidanceText: { flex: 1, color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  toggleRow: { minHeight: 82, borderTopWidth: 1, borderColor: LINE, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  toggleIcon: { width: 40, height: 40, borderRadius: 14, backgroundColor: 'rgba(255,101,0,0.1)', alignItems: 'center', justifyContent: 'center' },
  toggleCopy: { flex: 1 },
  toggleTitle: { color: PAPER, fontFamily: pluggdFonts.displayBold, fontSize: 14 },
  toggleBody: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  reviewCard: { borderTopWidth: 1, borderColor: LINE },
  reviewRow: { minHeight: 66, borderBottomWidth: 1, borderColor: LINE, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewStatus: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  reviewStatusReady: { backgroundColor: ORANGE, borderColor: ORANGE },
  reviewCopy: { flex: 1, minWidth: 0 },
  reviewLabel: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.2, textTransform: 'uppercase' },
  reviewValue: { color: PAPER, fontFamily: pluggdFonts.satoshiBold, fontSize: 13, lineHeight: 17, marginTop: 3 },
  reviewAction: { minHeight: 78, borderRadius: 18, borderWidth: 1, borderColor: 'rgba(255,101,0,0.36)', backgroundColor: 'rgba(255,101,0,0.08)', padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reviewActionKicker: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.1 },
  reviewActionTitle: { color: PAPER, fontFamily: pluggdFonts.displayBold, fontSize: 15, marginTop: 4 },
  footerActions: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  secondaryButton: { minHeight: 52, borderRadius: 17, borderWidth: 1, borderColor: LINE, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryButtonText: { color: PAPER, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  primaryButton: { flex: 1, minHeight: 52, borderRadius: 17, backgroundColor: ORANGE, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: '#160B04', fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  reviewModal: { flex: 1, backgroundColor: '#070707' },
  modalHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: 'rgba(255,255,255,0.2)', marginTop: 8 },
  modalHead: { minHeight: 82, borderBottomWidth: 1, borderColor: LINE, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalEyebrow: { color: ORANGE, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.4 },
  modalTitle: { color: PAPER, fontFamily: pluggdFonts.displayBold, fontSize: 22, marginTop: 4 },
  modalClose: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: LINE, alignItems: 'center', justifyContent: 'center' },
  modalContent: { padding: 18 },
  modalScore: { borderRadius: 22, borderWidth: 1, borderColor: 'rgba(255,101,0,0.32)', backgroundColor: 'rgba(255,101,0,0.08)', padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  modalScoreValue: { color: ORANGE, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34 },
  modalScoreCopy: { flex: 1 },
  modalScoreTitle: { color: PAPER, fontFamily: pluggdFonts.displayBold, fontSize: 17 },
  modalScoreBody: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17, marginTop: 4 },
  modalFooter: { borderTopWidth: 1, borderColor: LINE, paddingHorizontal: 18, paddingTop: 14, gap: 12 },
  modalNote: { color: MUTED, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 16 },
});
