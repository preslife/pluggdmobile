import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
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
import { CreatorAccessGate } from '../../components/CreatorAccessGate';
import { selectionHaptic } from '../../src/design/haptics';
import type { PluggdTheme } from '../../src/design/tokens';
import { pluggdFonts } from '../../src/design/typography';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import {
  createCreatorStudioDraft,
  type CreatorUploadStage,
  type CreatorBeatLicenseInput,
  type CreatorReleaseTrackInput,
} from '../../src/features/studio/creatorUploadService';

type UploadKind = 'release' | 'beat' | 'mix';
type UploadStep = 'details' | 'media' | 'rights' | 'review';
type AiUseDeclaration = '' | 'none' | 'assisted' | 'generated';
type AiGeneratedElement = 'lyrics' | 'composition' | 'vocals' | 'instrumentals' | 'other_audio';
type AiAudioScope = '' | 'part' | 'all';
type AiArtistIdentity = '' | 'human' | 'ai_persona';

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
  primaryGenre: string;
  subGenre: string;
  releaseType: string;
  releaseDate: string;
  language: string;
  label: string;
  featuredArtists: string[];
  producers: string[];
  songwriters: string[];
  composers: string[];
  executiveProducer: string;
  mixingEngineer: string;
  masteringEngineer: string;
  recordingEngineer: string;
  additionalTracks: CreatorReleaseTrackInput[];
  bpm: string;
  musicalKey: string;
  tags: string[];
  moods: string[];
  instruments: string[];
  beatLicenses: CreatorBeatLicenseInput[];
  exclusiveRightsAuthorized: boolean;
  recordingType: string;
  eventName: string;
  city: string;
  bpmMin: string;
  bpmMax: string;
  visibility: 'private' | 'unlisted' | 'public';
  allowDownloads: boolean;
  description: string;
  rightsOwner: string;
  tracklist: string;
  explicit: boolean;
  instrumental: boolean;
  owns100Percent: boolean;
  rightsConfirmed: boolean;
  aiUseDeclaration: AiUseDeclaration;
  aiGeneratedElements: AiGeneratedElement[];
  aiAudioScope: AiAudioScope;
  aiArtistIdentity: AiArtistIdentity;
  aiRightsConfirmed: boolean;
  aiNoImpersonationConfirmed: boolean;
  artwork: DraftAsset | null;
  audio: DraftAsset | null;
  stems: DraftAsset | null;
  taggedPreview: DraftAsset | null;
  updatedAt?: string;
};

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
const UPLOAD_STAGE_COPY: Record<CreatorUploadStage, string> = {
  artwork: 'Uploading artwork…',
  audio: 'Uploading audio…',
  draft: 'Creating your private Studio draft…',
  processing: 'Starting audio processing…',
};
const AI_DECLARATION_OPTIONS: Array<{ id: Exclude<AiUseDeclaration, ''>; label: string; description: string }> = [
  { id: 'none', label: 'No AI used', description: 'No AI tools generated or shaped the creative content.' },
  { id: 'assisted', label: 'AI-assisted', description: 'AI helped with cleanup, mixing, mastering or workflow, but did not generate creative content.' },
  { id: 'generated', label: 'AI-generated elements', description: 'AI generated any lyrics, music, vocals, instrumentals or audio.' },
];
const AI_GENERATED_ELEMENTS: Array<{ id: AiGeneratedElement; label: string }> = [
  { id: 'lyrics', label: 'Lyrics' },
  { id: 'composition', label: 'Composition or melody' },
  { id: 'vocals', label: 'Vocals' },
  { id: 'instrumentals', label: 'Instrumental performance' },
  { id: 'other_audio', label: 'Other audio or production' },
];
const AI_AUDIO_ELEMENTS: AiGeneratedElement[] = ['vocals', 'instrumentals', 'other_audio'];
const RELEASE_TYPES = ['Single', 'EP', 'Album', 'Mixtape'] as const;
const MIX_VISIBILITY = ['private', 'unlisted', 'public'] as const;
const DEFAULT_BEAT_LICENSES: CreatorBeatLicenseInput[] = [
  { key: 'basic_lease', enabled: true, price: '25' },
  { key: 'premium_lease', enabled: true, price: '50' },
  { key: 'unlimited_lease', enabled: true, price: '100' },
  { key: 'exclusive_rights', enabled: false, price: '500' },
];

function Text({ maxFontSizeMultiplier = 1.3, ...props }: TextProps) {
  return <NativeText maxFontSizeMultiplier={maxFontSizeMultiplier} {...props} />;
}

function normalizedKind(value: string | string[] | undefined): UploadKind {
  const candidate = Array.isArray(value) ? value[0] : value;
  return candidate === 'beat' || candidate === 'mix' ? candidate : 'release';
}

function scalarParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function normalizedStep(value: string | string[] | undefined): UploadStep {
  const candidate = scalarParam(value);
  return candidate === 'media' || candidate === 'rights' || candidate === 'review' ? candidate : 'details';
}

function emptyDraft(kind: UploadKind): UploadDraft {
  return {
    kind,
    title: '',
    creator: '',
    genre: '',
    primaryGenre: '',
    subGenre: '',
    releaseType: 'Single',
    releaseDate: '',
    language: 'English',
    label: '',
    featuredArtists: [],
    producers: [],
    songwriters: [],
    composers: [],
    executiveProducer: '',
    mixingEngineer: '',
    masteringEngineer: '',
    recordingEngineer: '',
    additionalTracks: [],
    bpm: '',
    musicalKey: '',
    tags: [],
    moods: [],
    instruments: [],
    beatLicenses: DEFAULT_BEAT_LICENSES.map((license) => ({ ...license })),
    exclusiveRightsAuthorized: false,
    recordingType: kind === 'mix' ? 'Studio mix' : '',
    eventName: '',
    city: '',
    bpmMin: '',
    bpmMax: '',
    visibility: 'private',
    allowDownloads: false,
    description: '',
    rightsOwner: '',
    tracklist: '',
    explicit: false,
    instrumental: false,
    owns100Percent: true,
    rightsConfirmed: false,
    aiUseDeclaration: '',
    aiGeneratedElements: [],
    aiAudioScope: '',
    aiArtistIdentity: '',
    aiRightsConfirmed: false,
    aiNoImpersonationConfirmed: false,
    artwork: null,
    audio: null,
    stems: null,
    taggedPreview: null,
  };
}

function displayDate(value: string) {
  if (!value) return 'Choose date';
  const date = new Date(`${value}T12:00:00`);
  if (Number.isNaN(date.getTime())) return 'Choose date';
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
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
  const releaseTracksReady = draft.kind !== 'release' || draft.additionalTracks.every((track) => Boolean(track.title.trim() && track.audio));
  const enabledLicences = draft.beatLicenses.filter((license) => license.enabled);
  const beatLicencesReady = draft.kind !== 'beat' || (
    enabledLicences.length > 0
    && enabledLicences.every((license) => Number.isFinite(Number(license.price)) && Number(license.price) >= 0)
    && (!enabledLicences.some((license) => license.key === 'exclusive_rights') || Boolean(draft.stems && draft.exclusiveRightsAuthorized))
  );
  const rightsReady = Boolean(
    draft.rightsOwner.trim()
      && draft.rightsConfirmed
      && beatLicencesReady
      && (draft.kind !== 'release' || releaseAiErrors(draft).length === 0),
  );
  return [
    Boolean(draft.title.trim() && draft.creator.trim() && draft.genre.trim()),
    Boolean(draft.audio && draft.artwork && releaseTracksReady),
    rightsReady,
  ].filter(Boolean).length;
}

function aiUseLabel(value: AiUseDeclaration) {
  return AI_DECLARATION_OPTIONS.find((option) => option.id === value)?.label || 'Not selected';
}

function hasGeneratedAudio(draft: UploadDraft) {
  return draft.aiGeneratedElements.some((element) => AI_AUDIO_ELEMENTS.includes(element));
}

function releaseAiErrors(draft: UploadDraft) {
  if (!draft.aiUseDeclaration) return ['Choose how AI was used on this release'];
  if (draft.aiUseDeclaration !== 'generated') return [];

  const errors: string[] = [];
  if (draft.aiGeneratedElements.length === 0) errors.push('Select what AI generated');
  if (hasGeneratedAudio(draft) && !draft.aiAudioScope) errors.push('Choose how much of the audio was AI-generated');
  if (hasGeneratedAudio(draft) && draft.aiAudioScope === 'all' && !draft.aiArtistIdentity) {
    errors.push('Confirm whether the artist identity is human or an AI persona');
  }
  if (!draft.aiRightsConfirmed) errors.push('Confirm the rights to the AI-generated elements');
  if (!draft.aiNoImpersonationConfirmed) errors.push('Confirm the release does not use an unauthorised imitation');
  return errors;
}

function aiDeclarationSummary(draft: UploadDraft) {
  if (!draft.aiUseDeclaration) return 'Choose how AI was used on this release';
  if (draft.aiUseDeclaration !== 'generated') return aiUseLabel(draft.aiUseDeclaration);

  const contributions = draft.aiGeneratedElements
    .map((value) => AI_GENERATED_ELEMENTS.find((element) => element.id === value)?.label)
    .filter(Boolean)
    .join(', ');
  const details = [
    aiUseLabel(draft.aiUseDeclaration),
    contributions || 'Generated contribution needed',
    draft.aiAudioScope === 'part' ? 'Part of audio' : draft.aiAudioScope === 'all' ? 'All audio' : null,
    draft.aiArtistIdentity === 'human' ? 'Human artist identity' : draft.aiArtistIdentity === 'ai_persona' ? 'AI persona' : null,
  ].filter(Boolean);
  const errors = releaseAiErrors(draft);
  return `${details.join(' · ')}${errors.length ? ` · ${errors.length} item${errors.length === 1 ? '' : 's'} needed` : ''}`;
}

function UploadAccessBoundary({ preview, children }: { preview: boolean; children: ReactNode }) {
  if (__DEV__ && preview) return <>{children}</>;
  return <CreatorAccessGate>{children}</CreatorAccessGate>;
}

function useUploadThemeStyles() {
  const theme = usePluggdTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  return { theme, styles };
}

export default function CreatorUpload() {
  const router = useRouter();
  const { theme, styles } = useUploadThemeStyles();
  const params = useLocalSearchParams<{
    type?: string | string[];
    preview?: string | string[];
    stage?: string | string[];
    ai?: string | string[];
  }>();
  const initialKind = normalizedKind(params.type);
  const previewMode = __DEV__ && scalarParam(params.preview) === 'creator';
  const previewStep = normalizedStep(params.stage);
  const previewAi = scalarParam(params.ai);
  const insets = useSafeAreaInsets();
  const [draft, setDraft] = useState<UploadDraft>(() => emptyDraft(initialKind));
  const [step, setStep] = useState<UploadStep>('details');
  const [restoring, setRestoring] = useState(true);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [uploadStage, setUploadStage] = useState<CreatorUploadStage | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const contentScrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    let active = true;
    if (previewMode) {
      const previewDraft = emptyDraft(initialKind);
      if (initialKind === 'release' && previewAi === 'assisted') {
        previewDraft.aiUseDeclaration = 'assisted';
      }
      if (initialKind === 'release' && previewAi === 'generated') {
        previewDraft.aiUseDeclaration = 'generated';
        previewDraft.aiGeneratedElements = ['lyrics', 'composition', 'vocals', 'instrumentals', 'other_audio'];
        previewDraft.aiAudioScope = 'all';
        previewDraft.aiArtistIdentity = 'human';
        previewDraft.aiRightsConfirmed = true;
        previewDraft.aiNoImpersonationConfirmed = true;
      }
      setDraft(previewDraft);
      setStep(previewStep);
      setRestoring(false);
      return () => {
        active = false;
      };
    }
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
  }, [initialKind, previewAi, previewMode, previewStep]);

  const activeIndex = STEPS.findIndex((item) => item.id === step);
  const progress = useMemo(() => completedCount(draft), [draft]);

  useEffect(() => {
    requestAnimationFrame(() => contentScrollRef.current?.scrollTo({ y: 0, animated: false }));
  }, [draft.kind, step]);

  const update = <K extends keyof UploadDraft>(key: K, value: UploadDraft[K]) => {
    setDraft((current) => ({ ...current, [key]: value }));
  };

  const updateAiUse = (value: Exclude<AiUseDeclaration, ''>) => {
    selectionHaptic();
    setDraft((current) => value === 'generated'
      ? { ...current, aiUseDeclaration: value }
      : {
        ...current,
        aiUseDeclaration: value,
        aiGeneratedElements: [],
        aiAudioScope: '',
        aiArtistIdentity: '',
        aiRightsConfirmed: false,
        aiNoImpersonationConfirmed: false,
      });
  };

  const toggleAiGeneratedElement = (value: AiGeneratedElement) => {
    selectionHaptic();
    setDraft((current) => {
      const nextElements = current.aiGeneratedElements.includes(value)
        ? current.aiGeneratedElements.filter((element) => element !== value)
        : [...current.aiGeneratedElements, value];
      const nextHasGeneratedAudio = nextElements.some((element) => AI_AUDIO_ELEMENTS.includes(element));
      return {
        ...current,
        aiGeneratedElements: nextElements,
        aiAudioScope: nextHasGeneratedAudio ? current.aiAudioScope : '',
        aiArtistIdentity: nextHasGeneratedAudio ? current.aiArtistIdentity : '',
      };
    });
  };

  const updateAiAudioScope = (value: Exclude<AiAudioScope, ''>) => {
    selectionHaptic();
    setDraft((current) => ({
      ...current,
      aiAudioScope: value,
      aiArtistIdentity: value === 'all' ? current.aiArtistIdentity : '',
    }));
  };

  const switchKind = async (kind: UploadKind) => {
    if (kind === draft.kind) return;
    selectionHaptic();
    const stored = previewMode ? null : await AsyncStorage.getItem(draftKey(kind)).catch(() => null);
    setDraft(stored ? { ...emptyDraft(kind), ...(JSON.parse(stored) as UploadDraft), kind } : emptyDraft(kind));
    setStep('details');
    router.setParams({ type: kind });
  };

  const chooseArtwork = async () => {
    if (previewMode) return;
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
    if (previewMode) return;
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

  const chooseSupplementaryAudio = async (target: 'stems' | 'taggedPreview') => {
    if (previewMode) return;
    selectionHaptic();
    const result = await DocumentPicker.getDocumentAsync({
      type: target === 'stems' ? ['audio/*', 'application/zip', 'application/x-zip-compressed'] : 'audio/*',
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets[0]) return;
    try {
      update(target, await persistPickedAudio(result.assets[0]));
    } catch {
      Alert.alert('Audio not saved', 'PLUGGD could not make a durable copy of that audio file. Choose it again.');
    }
  };

  const chooseAdditionalTrackAudio = async (trackId: string) => {
    if (previewMode) return;
    const result = await DocumentPicker.getDocumentAsync({ type: 'audio/*', copyToCacheDirectory: true, multiple: false });
    if (result.canceled || !result.assets[0]) return;
    try {
      const audio = await persistPickedAudio(result.assets[0]);
      update('additionalTracks', draft.additionalTracks.map((track) => track.id === trackId ? { ...track, audio } : track));
    } catch {
      Alert.alert('Audio not saved', 'PLUGGD could not make a durable copy of that track. Choose it again.');
    }
  };

  const updateStringList = (key: 'featuredArtists' | 'producers' | 'songwriters' | 'composers' | 'tags' | 'moods' | 'instruments', values: string[]) => update(key, values);

  const updateBeatLicense = (key: CreatorBeatLicenseInput['key'], patch: Partial<CreatorBeatLicenseInput>) => {
    update('beatLicenses', draft.beatLicenses.map((license) => license.key === key ? { ...license, ...patch } : license));
  };

  const saveDraft = async () => {
    if (previewMode) return;
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

  const createStudioDraft = async () => {
    if (previewMode || progress !== 3 || creating) return;
    setCreating(true);
    setUploadStage('artwork');
    try {
      const result = await createCreatorStudioDraft(draft, setUploadStage);
      await AsyncStorage.removeItem(draftKey(draft.kind));
      setReviewOpen(false);
      selectionHaptic();
      Alert.alert(
        'Studio draft created',
        `Your ${draft.kind} is private while PLUGGD processes the audio. Open its catalogue workspace to finish metadata, lyrics, pricing and publication.`,
        [
          {
            text: 'Open Studio',
            onPress: () => router.replace({
              pathname: '/studio/catalog',
              params: { tab: `${draft.kind}s`, item: result.catalogId },
            } as any),
          },
        ],
      );
    } catch (error) {
      Alert.alert(
        'Draft not created',
        error instanceof Error ? error.message : 'PLUGGD could not create the Studio draft. Nothing was published.',
      );
    } finally {
      setCreating(false);
      setUploadStage(null);
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
        <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
        <ActivityIndicator color={theme.colors.accentText} />
        <Text style={styles.loadingText}>Opening your draft…</Text>
      </View>
    );
  }

  return (
    <UploadAccessBoundary preview={previewMode}>
      <SafeAreaView style={styles.screen} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
      <LinearGradient colors={[theme.colors.backgroundDeep, theme.colors.background, theme.colors.backgroundElevated]} style={StyleSheet.absoluteFill} />
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={contentScrollRef}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.content, { paddingBottom: Math.max(34, insets.bottom + 24) }]}
        >
          <View style={styles.topBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Back to Studio" onPress={() => router.back()} style={styles.iconButton}>
              <MaterialIcons name="arrow-back" size={22} color={theme.colors.text} />
            </Pressable>
            <View style={styles.brand}>
              <Text style={styles.brandSmall}>PLUGGD</Text>
              <Text style={styles.brandTitle}>UPLOAD STUDIO</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Save upload draft"
              accessibilityState={{ disabled: previewMode }}
              disabled={previewMode}
              onPress={saveDraft}
              style={[styles.saveTop, previewMode && styles.buttonDisabled]}
            >
              <MaterialIcons name="cloud-done" size={17} color={theme.colors.accentText} />
              <Text style={styles.saveTopText}>Save</Text>
            </Pressable>
          </View>

          {previewMode ? (
            <View accessibilityRole="text" style={styles.previewBanner}>
              <MaterialIcons name="visibility" size={17} color={theme.colors.accentText} />
              <View style={styles.previewCopy}>
                <Text style={styles.previewTitle}>FORM PREVIEW · NO ACCOUNT DATA</Text>
                <Text style={styles.previewBody}>Development-only visual review. File selection, saving and draft creation are disabled.</Text>
              </View>
            </View>
          ) : null}

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
                    <MaterialIcons name={kind.icon} size={20} color={selected ? theme.colors.accentText : theme.colors.textMuted} />
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
                  {passed ? <MaterialIcons name="check" size={14} color={theme.colors.accentText} /> : null}
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
              {draft.kind === 'release' ? <>
                <ChoiceRail label="Release format" value={draft.releaseType} options={RELEASE_TYPES} onChange={(value) => update('releaseType', value)} />
                <View style={styles.twoColumn}>
                  <Field compact label="Primary genre" value={draft.primaryGenre} onChangeText={(value) => { update('primaryGenre', value); update('genre', value); }} placeholder="e.g. Dancehall" />
                  <Field compact label="Subgenre" value={draft.subGenre} onChangeText={(value) => update('subGenre', value)} placeholder="Optional" />
                </View>
                <View style={styles.field}>
                  <Text style={styles.fieldLabel}>RELEASE DATE</Text>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Release date. ${displayDate(draft.releaseDate)}`} onPress={() => setDatePickerOpen(true)} style={styles.dateButton}>
                    <MaterialIcons name="calendar-month" size={20} color={theme.colors.accentText} />
                    <Text style={styles.dateButtonText}>{displayDate(draft.releaseDate)}</Text>
                    <MaterialIcons name="chevron-right" size={21} color={theme.colors.textMuted} />
                  </Pressable>
                  {datePickerOpen ? <DateTimePicker value={draft.releaseDate ? new Date(`${draft.releaseDate}T12:00:00`) : new Date()} mode="date" display={Platform.OS === 'ios' ? 'inline' : 'default'} onChange={(_, value) => { if (Platform.OS !== 'ios') setDatePickerOpen(false); if (value) update('releaseDate', `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, '0')}-${String(value.getDate()).padStart(2, '0')}`); }} /> : null}
                  {datePickerOpen && Platform.OS === 'ios' ? <Pressable accessibilityRole="button" onPress={() => setDatePickerOpen(false)} style={styles.dateDone}><Text style={styles.dateDoneText}>Done</Text></Pressable> : null}
                </View>
                <View style={styles.twoColumn}>
                  <Field compact label="Language" value={draft.language} onChangeText={(value) => update('language', value)} placeholder="English" />
                  <Field compact label="Label" value={draft.label} onChangeText={(value) => update('label', value)} placeholder="Independent" />
                </View>
                <RepeatableField label="Featured / additional artists" values={draft.featuredArtists} placeholder="Artist name" addLabel="Add artist" onChange={(values) => updateStringList('featuredArtists', values)} />
              </> : null}
              {draft.kind === 'beat' ? <>
                <View style={styles.twoColumn}>
                  <Field compact label="Genre" value={draft.genre} onChangeText={(value) => update('genre', value)} placeholder="e.g. Drill" />
                  <Field compact label="BPM" value={draft.bpm} onChangeText={(value) => update('bpm', value.replace(/[^0-9]/g, ''))} placeholder="120" keyboardType="number-pad" />
                </View>
                <Field label="Key" value={draft.musicalKey} onChangeText={(value) => update('musicalKey', value)} placeholder="e.g. F minor" />
                <RepeatableField label="Tags" values={draft.tags} placeholder="Add a searchable tag" addLabel="Add tag" onChange={(values) => updateStringList('tags', values)} />
                <RepeatableField label="Moods" values={draft.moods} placeholder="Add a mood" addLabel="Add mood" onChange={(values) => updateStringList('moods', values)} />
                <RepeatableField label="Instruments" values={draft.instruments} placeholder="Add an instrument" addLabel="Add instrument" onChange={(values) => updateStringList('instruments', values)} />
              </> : null}
              {draft.kind === 'mix' ? <>
                <View style={styles.twoColumn}>
                  <Field compact label="Genre / scene" value={draft.genre} onChangeText={(value) => update('genre', value)} placeholder="e.g. Dancehall" />
                  <Field compact label="Recording type" value={draft.recordingType} onChangeText={(value) => update('recordingType', value)} placeholder="Studio mix" />
                </View>
                <View style={styles.twoColumn}>
                  <Field compact label="Event" value={draft.eventName} onChangeText={(value) => update('eventName', value)} placeholder="Optional event" />
                  <Field compact label="City" value={draft.city} onChangeText={(value) => update('city', value)} placeholder="London" />
                </View>
                <View style={styles.twoColumn}>
                  <Field compact label="BPM from" value={draft.bpmMin} onChangeText={(value) => update('bpmMin', value.replace(/[^0-9]/g, ''))} placeholder="90" keyboardType="number-pad" />
                  <Field compact label="BPM to" value={draft.bpmMax} onChangeText={(value) => update('bpmMax', value.replace(/[^0-9]/g, ''))} placeholder="130" keyboardType="number-pad" />
                </View>
                <RepeatableField label="Mood tags" values={draft.moods} placeholder="Add a mood" addLabel="Add mood" onChange={(values) => updateStringList('moods', values)} />
              </> : null}
            </View>
          ) : null}

          {step === 'media' ? (
            <View style={styles.section}>
              <SectionHeading
                eyebrow="MAKE IT FELT"
                title="Artwork and audio"
                body="Use finished artwork and the clearest master or preview you have."
              />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose square artwork"
                accessibilityState={{ disabled: previewMode }}
                disabled={previewMode}
                onPress={chooseArtwork}
                style={[styles.artworkPicker, previewMode && styles.previewControlDisabled]}
              >
                {draft.artwork ? (
                  <Image source={{ uri: draft.artwork.uri }} style={styles.artworkImage} />
                ) : (
                  <LinearGradient colors={[theme.colors.accentSoft, theme.colors.surfaceAlt]} style={styles.artworkPlaceholder}>
                    <MaterialIcons name="add-photo-alternate" size={34} color={theme.colors.accentText} />
                  </LinearGradient>
                )}
                <View style={styles.assetCopy}>
                  <Text style={styles.assetKicker}>SQUARE ARTWORK</Text>
                  <Text style={styles.assetTitle} numberOfLines={1}>{draft.artwork?.name || 'Choose cover artwork'}</Text>
                  <Text style={styles.assetMeta}>{draft.artwork ? formatSize(draft.artwork.size) : 'JPG or PNG · high resolution'}</Text>
                </View>
                <MaterialIcons name="chevron-right" size={24} color={theme.colors.textMuted} />
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Choose audio file"
                accessibilityState={{ disabled: previewMode }}
                disabled={previewMode}
                onPress={chooseAudio}
                style={[styles.audioPicker, previewMode && styles.previewControlDisabled]}
              >
                <View style={styles.audioIcon}>
                  <MaterialIcons name={draft.audio ? 'audio-file' : 'library-music'} size={27} color={theme.colors.accentText} />
                </View>
                <View style={styles.assetCopy}>
                  <Text style={styles.assetKicker}>{draft.kind === 'beat' ? 'MASTER OR PREVIEW' : 'PRIMARY AUDIO'}</Text>
                  <Text style={styles.assetTitle} numberOfLines={1}>{draft.audio?.name || 'Choose audio file'}</Text>
                  <Text style={styles.assetMeta}>{draft.audio ? formatSize(draft.audio.size) : 'WAV, AIFF, FLAC or MP3'}</Text>
                </View>
                <View style={styles.addCircle}>
                  <MaterialIcons name={draft.audio ? 'swap-horiz' : 'add'} size={20} color={theme.colors.text} />
                </View>
              </Pressable>

              {draft.kind === 'release' ? <View style={styles.subsectionCard}>
                <View style={styles.subsectionHeader}>
                  <View style={styles.subsectionCopy}><Text style={styles.assetKicker}>TRACKLIST</Text><Text style={styles.subsectionTitle}>Additional release tracks</Text></View>
                  <Pressable accessibilityRole="button" accessibilityLabel="Add release track" onPress={() => update('additionalTracks', [...draft.additionalTracks, { id: `${Date.now()}-${draft.additionalTracks.length}`, title: '', audio: null }])} style={styles.compactAdd}><MaterialIcons name="add" size={18} color={theme.colors.accentText} /><Text style={styles.compactAddText}>Add track</Text></Pressable>
                </View>
                <View style={styles.primaryTrackNote}><Text style={styles.primaryTrackNumber}>01</Text><Text style={styles.primaryTrackText}>{draft.title.trim() || 'Primary track'} · {draft.audio?.name || 'audio needed'}</Text></View>
                {draft.additionalTracks.map((track, index) => <View key={track.id} style={styles.trackEditor}>
                  <Text style={styles.primaryTrackNumber}>{String(index + 2).padStart(2, '0')}</Text>
                  <View style={styles.trackEditorBody}>
                    <TextInput accessibilityLabel={`Track ${index + 2} title`} value={track.title} onChangeText={(title) => update('additionalTracks', draft.additionalTracks.map((item) => item.id === track.id ? { ...item, title } : item))} placeholder="Track title" placeholderTextColor={theme.colors.textMuted} style={styles.trackInput} />
                    <Pressable accessibilityRole="button" accessibilityLabel={`Choose audio for track ${index + 2}`} onPress={() => void chooseAdditionalTrackAudio(track.id)} style={styles.trackAudio}><MaterialIcons name="audio-file" size={18} color={theme.colors.accentText} /><Text style={styles.trackAudioText} numberOfLines={1}>{track.audio?.name || 'Choose audio'}</Text></Pressable>
                  </View>
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove track ${index + 2}`} onPress={() => update('additionalTracks', draft.additionalTracks.filter((item) => item.id !== track.id))} style={styles.removeTrack}><MaterialIcons name="close" size={18} color={theme.colors.textMuted} /></Pressable>
                </View>)}
              </View> : null}

              {draft.kind === 'beat' ? <View style={styles.subsectionCard}>
                <Text style={styles.assetKicker}>DELIVERY FILES</Text>
                <Text style={styles.subsectionTitle}>Stems and tagged preview</Text>
                <AssetMiniPicker label="Stems archive / audio" value={draft.stems} icon="folder-zip" onPress={() => void chooseSupplementaryAudio('stems')} />
                <AssetMiniPicker label="Tagged preview" value={draft.taggedPreview} icon="record-voice-over" onPress={() => void chooseSupplementaryAudio('taggedPreview')} />
              </View> : null}

              <View style={styles.guidanceBand}>
                <MaterialIcons name="tips-and-updates" size={18} color={theme.colors.accentText} />
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
              {draft.kind === 'release' ? <>
                <RepeatableField label="Producers" values={draft.producers} placeholder="Producer name" addLabel="Add producer" onChange={(values) => updateStringList('producers', values)} />
                <RepeatableField label="Songwriters" values={draft.songwriters} placeholder="Songwriter name" addLabel="Add songwriter" onChange={(values) => updateStringList('songwriters', values)} />
                <RepeatableField label="Composers" values={draft.composers} placeholder="Composer name" addLabel="Add composer" onChange={(values) => updateStringList('composers', values)} />
                <Field label="Executive producer" value={draft.executiveProducer} onChangeText={(value) => update('executiveProducer', value)} placeholder="Optional" />
                <View style={styles.twoColumn}>
                  <Field compact label="Mixing engineer" value={draft.mixingEngineer} onChangeText={(value) => update('mixingEngineer', value)} placeholder="Optional" />
                  <Field compact label="Mastering engineer" value={draft.masteringEngineer} onChangeText={(value) => update('masteringEngineer', value)} placeholder="Optional" />
                </View>
                <Field label="Recording engineer" value={draft.recordingEngineer} onChangeText={(value) => update('recordingEngineer', value)} placeholder="Optional" />
                <ToggleRow icon="music-off" title="Instrumental release" body="Mark releases that contain no sung or spoken lyrics." value={draft.instrumental} onValueChange={(value) => update('instrumental', value)} />
                <ToggleRow icon="pie-chart" title="I own 100%" body="Turn this off later in Studio when collaborators or split documents apply." value={draft.owns100Percent} onValueChange={(value) => update('owns100Percent', value)} />
              </> : null}
              {draft.kind === 'beat' ? <View style={styles.licencePanel}>
                <Text style={styles.assetKicker}>LICENCE OPTIONS</Text>
                <Text style={styles.subsectionTitle}>Choose what buyers can licence</Text>
                {draft.beatLicenses.map((license) => <View key={license.key} style={styles.licenceRow}>
                  <Pressable accessibilityRole="checkbox" accessibilityState={{ checked: license.enabled }} accessibilityLabel={`${license.key.replaceAll('_', ' ')} licence`} onPress={() => updateBeatLicense(license.key, { enabled: !license.enabled })} style={[styles.checkbox, license.enabled && styles.checkboxSelected]}>{license.enabled ? <MaterialIcons name="check" size={14} color={theme.colors.onAccent} /> : null}</Pressable>
                  <Text style={styles.licenceName}>{license.key.split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ')}</Text>
                  <TextInput accessibilityLabel={`${license.key.replaceAll('_', ' ')} price`} editable={license.enabled} value={license.price} onChangeText={(price) => updateBeatLicense(license.key, { price: price.replace(/[^0-9.]/g, '') })} keyboardType="decimal-pad" placeholder="0" placeholderTextColor={theme.colors.textMuted} style={[styles.licencePrice, !license.enabled && styles.buttonDisabled]} />
                  <Text style={styles.licenceCurrency}>GBP</Text>
                </View>)}
                {draft.beatLicenses.some((license) => license.key === 'exclusive_rights' && license.enabled) ? <AiConfirmationRow label="I am authorised to offer these stems as Exclusive Rights." value={draft.exclusiveRightsAuthorized} onChange={(value) => update('exclusiveRightsAuthorized', value)} /> : null}
              </View> : null}
              {draft.kind === 'mix' ? <>
                <ChoiceRail label="Draft visibility" value={draft.visibility} options={MIX_VISIBILITY} onChange={(value) => update('visibility', value)} />
                <ToggleRow icon="download" title="Allow downloads when published" body="The mix remains private until you explicitly publish it." value={draft.allowDownloads} onValueChange={(value) => update('allowDownloads', value)} />
              </> : null}
              <ToggleRow
                icon="explicit"
                title="Explicit content"
                body="Mark this accurately for storefront and audience controls."
                value={draft.explicit}
                onValueChange={(value) => update('explicit', value)}
              />
              {draft.kind === 'release' ? (
                <View style={styles.aiDeclarationCard}>
                  <View style={styles.aiDeclarationHead}>
                    <View style={styles.aiDeclarationIcon}>
                      <MaterialIcons name="auto-awesome" size={20} color={theme.colors.accentText} />
                    </View>
                    <View style={styles.aiDeclarationHeadCopy}>
                      <View style={styles.aiDeclarationTitleRow}>
                        <Text style={styles.aiDeclarationTitle}>AI use declaration</Text>
                        <Text style={styles.requiredBadge}>REQUIRED FOR SUBMISSION</Text>
                      </View>
                      <Text style={styles.aiDeclarationBody}>Choose the highest level of AI use anywhere on this release. You can still save an unfinished draft.</Text>
                    </View>
                  </View>

                  <AiDeclarationChoices
                    value={draft.aiUseDeclaration}
                    onChange={updateAiUse}
                  />

                  {draft.aiUseDeclaration === 'assisted' ? (
                    <View style={styles.aiAssistedNote}>
                      <MaterialIcons name="info-outline" size={18} color={theme.colors.accentText} />
                      <Text style={styles.aiAssistedText}>AI-assisted tools are recorded separately from AI-generated credits. Examples include audio cleanup, stem separation, mixing suggestions and automated mastering.</Text>
                    </View>
                  ) : null}

                  {draft.aiUseDeclaration === 'generated' ? (
                    <View style={styles.aiGeneratedPanel}>
                      <AiGeneratedElementChoices values={draft.aiGeneratedElements} onToggle={toggleAiGeneratedElement} />

                      {hasGeneratedAudio(draft) ? (
                        <AiSimpleRadioGroup
                          label="How much of the audio is AI-generated?"
                          value={draft.aiAudioScope}
                          options={[
                            { id: 'part', label: 'Part of the audio' },
                            { id: 'all', label: 'All of the audio' },
                          ]}
                          onChange={(value) => updateAiAudioScope(value as Exclude<AiAudioScope, ''>)}
                        />
                      ) : null}

                      {draft.aiAudioScope === 'all' ? (
                        <AiSimpleRadioGroup
                          label="Artist identity"
                          value={draft.aiArtistIdentity}
                          options={[
                            { id: 'human', label: 'Human artist identity' },
                            { id: 'ai_persona', label: 'AI persona' },
                          ]}
                          onChange={(value) => {
                            selectionHaptic();
                            update('aiArtistIdentity', value as Exclude<AiArtistIdentity, ''>);
                          }}
                        />
                      ) : null}

                      <View style={styles.aiConfirmations}>
                        <AiConfirmationRow
                          label="I own or control the rights needed to distribute every AI-generated element."
                          value={draft.aiRightsConfirmed}
                          onChange={(value) => update('aiRightsConfirmed', value)}
                        />
                        <AiConfirmationRow
                          label="This release does not imitate or clone another person’s voice, likeness or identity without permission."
                          value={draft.aiNoImpersonationConfirmed}
                          onChange={(value) => update('aiNoImpersonationConfirmed', value)}
                        />
                      </View>
                    </View>
                  ) : null}
                </View>
              ) : null}
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
                {draft.kind === 'release' ? (
                  <ReviewRow label="AI declaration" value={aiDeclarationSummary(draft)} ready={releaseAiErrors(draft).length === 0} />
                ) : null}
              </View>
              <Pressable accessibilityRole="button" onPress={() => setReviewOpen(true)} style={styles.reviewAction}>
                <View>
                  <Text style={styles.reviewActionKicker}>PUBLISHING READINESS</Text>
                  <Text style={styles.reviewActionTitle}>{progress === 3 ? 'Draft ready for final review' : `${3 - progress} section${3 - progress === 1 ? '' : 's'} need attention`}</Text>
                </View>
                <MaterialIcons name="arrow-outward" size={22} color={theme.colors.accentText} />
              </Pressable>
            </View>
          ) : null}

          <View style={styles.footerActions}>
            {activeIndex > 0 ? (
              <Pressable accessibilityRole="button" onPress={() => setStep(STEPS[activeIndex - 1].id)} style={styles.secondaryButton}>
                <MaterialIcons name="arrow-back" size={18} color={theme.colors.text} />
                <Text style={styles.secondaryButtonText}>Back</Text>
              </Pressable>
            ) : null}
            <Pressable accessibilityRole="button" onPress={goNext} style={styles.primaryButton}>
              <Text style={styles.primaryButtonText}>{step === 'review' ? 'Open review' : `Continue to ${STEPS[activeIndex + 1]?.label}`}</Text>
              <MaterialIcons name="arrow-forward" size={18} color={theme.colors.accentText} />
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={reviewOpen} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setReviewOpen(false)}>
        <SafeAreaView style={styles.reviewModal}>
          <StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />
          <View style={styles.modalHandle} />
          <View style={styles.modalHead}>
            <View>
              <Text style={styles.modalEyebrow}>DRAFT REVIEW</Text>
              <Text style={styles.modalTitle}>{draft.title || `Untitled ${draft.kind}`}</Text>
            </View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close review" onPress={() => setReviewOpen(false)} style={styles.modalClose}>
              <MaterialIcons name="close" size={22} color={theme.colors.text} />
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
            {draft.kind === 'release' ? (
              <ReviewRow label="AI declaration" value={aiDeclarationSummary(draft)} ready={releaseAiErrors(draft).length === 0} />
            ) : null}
          </ScrollView>
          <View style={[styles.modalFooter, { paddingBottom: Math.max(14, insets.bottom) }]}>
            <Text style={styles.modalNote}>
              Creating a Studio draft uploads these files and keeps the item private. It does not publish, schedule or submit the work for review.
            </Text>
            {creating && uploadStage ? (
              <View accessibilityLiveRegion="polite" style={styles.uploadStatus}>
                <ActivityIndicator color={theme.colors.accentText} />
                <Text style={styles.uploadStatusText}>{UPLOAD_STAGE_COPY[uploadStage]}</Text>
              </View>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Create private Studio draft"
              accessibilityState={{ disabled: previewMode || progress !== 3 || creating }}
              onPress={() => void createStudioDraft()}
              disabled={previewMode || progress !== 3 || creating}
              style={[styles.primaryButton, styles.modalPrimary, (previewMode || progress !== 3 || creating) && styles.buttonDisabled]}
            >
              {creating ? <ActivityIndicator color={theme.colors.accentText} /> : <Text style={styles.primaryButtonText}>{previewMode ? 'Preview only' : progress === 3 ? 'Create Studio draft' : 'Complete required sections'}</Text>}
              {!creating ? <MaterialIcons name="cloud-upload" size={18} color={theme.colors.accentText} /> : null}
            </Pressable>
            <Pressable accessibilityRole="button" onPress={saveDraft} disabled={previewMode || saving || creating} style={[styles.secondaryButton, previewMode && styles.buttonDisabled]}>
              {saving ? <ActivityIndicator color={theme.colors.text} /> : <Text style={styles.secondaryButtonText}>Save on this device</Text>}
              {!saving ? <MaterialIcons name="save" size={18} color={theme.colors.text} /> : null}
            </Pressable>
          </View>
        </SafeAreaView>
      </Modal>
      </SafeAreaView>
    </UploadAccessBoundary>
  );
}

function SectionHeading({ eyebrow, title, body }: { eyebrow: string; title: string; body: string }) {
  const { styles } = useUploadThemeStyles();
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
  const { theme, styles } = useUploadThemeStyles();
  return (
    <View style={[styles.field, compact && styles.fieldCompact]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        maxFontSizeMultiplier={1.4}
        multiline={multiline}
        placeholderTextColor={theme.colors.textMuted}
        style={[styles.input, multiline && styles.inputMultiline]}
      />
    </View>
  );
}

function ChoiceRail<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly T[]; onChange: (value: T) => void }) {
  const { styles } = useUploadThemeStyles();
  return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text><View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.choiceRail}>{options.map((option) => {
    const selected = option === value;
    return <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: selected }} onPress={() => onChange(option)} style={[styles.choiceChip, selected && styles.choiceChipSelected]}><Text style={[styles.choiceChipText, selected && styles.choiceChipTextSelected]}>{option[0].toUpperCase() + option.slice(1)}</Text></Pressable>;
  })}</View></View>;
}

function RepeatableField({ label, values, placeholder, addLabel, onChange }: { label: string; values: string[]; placeholder: string; addLabel: string; onChange: (values: string[]) => void }) {
  const { theme, styles } = useUploadThemeStyles();
  return <View style={styles.repeatableField}>
    <View style={styles.repeatableHeader}><Text style={styles.fieldLabel}>{label}</Text><Pressable accessibilityRole="button" accessibilityLabel={addLabel} onPress={() => onChange([...values, ''])} style={styles.compactAdd}><MaterialIcons name="add" size={17} color={theme.colors.accentText} /><Text style={styles.compactAddText}>{addLabel}</Text></Pressable></View>
    {values.length ? values.map((value, index) => <View key={`${label}-${index}`} style={styles.repeatableRow}><TextInput accessibilityLabel={`${label} ${index + 1}`} value={value} onChangeText={(next) => onChange(values.map((item, itemIndex) => itemIndex === index ? next : item))} placeholder={placeholder} placeholderTextColor={theme.colors.textMuted} style={[styles.input, styles.repeatableInput]} /><Pressable accessibilityRole="button" accessibilityLabel={`Remove ${label} ${index + 1}`} onPress={() => onChange(values.filter((_, itemIndex) => itemIndex !== index))} style={styles.repeatableRemove}><MaterialIcons name="close" size={19} color={theme.colors.textMuted} /></Pressable></View>) : <Text style={styles.emptyFieldHint}>None added yet</Text>}
  </View>;
}

function AssetMiniPicker({ label, value, icon, onPress }: { label: string; value: DraftAsset | null; icon: keyof typeof MaterialIcons.glyphMap; onPress: () => void }) {
  const { theme, styles } = useUploadThemeStyles();
  return <Pressable accessibilityRole="button" accessibilityLabel={`${value ? 'Change' : 'Choose'} ${label}`} onPress={onPress} style={styles.assetMiniPicker}><MaterialIcons name={icon} size={20} color={theme.colors.accentText} /><View style={styles.assetCopy}><Text style={styles.assetTitle}>{label}</Text><Text style={styles.assetMeta} numberOfLines={1}>{value?.name || 'Optional'}</Text></View><MaterialIcons name={value ? 'swap-horiz' : 'add'} size={20} color={theme.colors.textMuted} /></Pressable>;
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
  const { theme, styles } = useUploadThemeStyles();
  return (
    <View style={styles.toggleRow}>
      <View style={styles.toggleIcon}>
        <MaterialIcons name={icon} size={20} color={theme.colors.accentText} />
      </View>
      <View style={styles.toggleCopy}>
        <Text style={styles.toggleTitle}>{title}</Text>
        <Text style={styles.toggleBody}>{body}</Text>
      </View>
      <Switch
        style={styles.switch}
        accessibilityLabel={title}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.surfacePressed, true: theme.colors.accentFill }}
        thumbColor={value ? theme.colors.onAccent : theme.colors.textMuted}
      />
    </View>
  );
}

function AiDeclarationChoices({
  value,
  onChange,
}: {
  value: AiUseDeclaration;
  onChange: (value: Exclude<AiUseDeclaration, ''>) => void;
}) {
  const { styles } = useUploadThemeStyles();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel="AI use declaration" style={styles.aiChoiceGroup}>
      {AI_DECLARATION_OPTIONS.map((option) => {
        const selected = value === option.id;
        return (
          <Pressable
            key={option.id}
            accessibilityRole="radio"
            accessibilityLabel={`${option.label}. ${option.description}`}
            accessibilityState={{ checked: selected }}
            onPress={() => onChange(option.id)}
            style={[styles.aiChoice, selected && styles.aiChoiceSelected]}
          >
            <View style={[styles.radioDot, selected && styles.radioDotSelected]}>
              {selected ? <View style={styles.radioDotCore} /> : null}
            </View>
            <View style={styles.aiChoiceCopy}>
              <Text style={[styles.aiChoiceText, selected && styles.aiChoiceTextSelected]}>{option.label}</Text>
              <Text style={styles.aiChoiceDescription}>{option.description}</Text>
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

function AiGeneratedElementChoices({
  values,
  onToggle,
}: {
  values: AiGeneratedElement[];
  onToggle: (value: AiGeneratedElement) => void;
}) {
  const { theme, styles } = useUploadThemeStyles();
  return (
    <View style={styles.aiDetailGroup}>
      <Text style={styles.aiDetailTitle}>What did AI generate?</Text>
      <Text style={styles.aiDetailBody}>Select every contribution that applies anywhere on the release.</Text>
      <View style={styles.aiCheckboxList}>
        {AI_GENERATED_ELEMENTS.map((element) => {
          const checked = values.includes(element.id);
          return (
            <Pressable
              key={element.id}
              accessibilityRole="checkbox"
              accessibilityState={{ checked }}
              accessibilityLabel={element.label}
              onPress={() => onToggle(element.id)}
              style={[styles.aiCheckboxRow, checked && styles.aiCheckboxRowSelected]}
            >
              <View style={[styles.checkbox, checked && styles.checkboxSelected]}>
                {checked ? <MaterialIcons name="check" size={14} color={theme.colors.onAccent} /> : null}
              </View>
              <Text style={styles.aiCheckboxLabel}>{element.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AiSimpleRadioGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ id: T; label: string }>;
  onChange: (value: T) => void;
}) {
  const { styles } = useUploadThemeStyles();
  return (
    <View accessibilityRole="radiogroup" accessibilityLabel={label} style={styles.aiDetailGroup}>
      <Text style={styles.aiDetailTitle}>{label}</Text>
      <View style={styles.aiStackedChoices}>
        {options.map((option) => {
          const selected = value === option.id;
          return (
            <Pressable
              key={option.id}
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={option.label}
              onPress={() => onChange(option.id)}
              style={[styles.aiCompactChoice, selected && styles.aiChoiceSelected]}
            >
              <View style={[styles.radioDot, selected && styles.radioDotSelected]}>
                {selected ? <View style={styles.radioDotCore} /> : null}
              </View>
              <Text style={[styles.aiCompactChoiceText, selected && styles.aiChoiceTextSelected]}>{option.label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function AiConfirmationRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  const { theme, styles } = useUploadThemeStyles();
  return (
    <Pressable
      accessibilityRole="checkbox"
      accessibilityState={{ checked: value }}
      accessibilityLabel={label}
      onPress={() => {
        selectionHaptic();
        onChange(!value);
      }}
      style={styles.aiConfirmationRow}
    >
      <View style={[styles.checkbox, value && styles.checkboxSelected]}>
        {value ? <MaterialIcons name="check" size={14} color={theme.colors.onAccent} /> : null}
      </View>
      <Text style={styles.aiConfirmationText}>{label}</Text>
    </Pressable>
  );
}

function ReviewRow({ label, value, ready }: { label: string; value: string; ready: boolean }) {
  const { theme, styles } = useUploadThemeStyles();
  return (
    <View style={styles.reviewRow}>
      <View style={[styles.reviewStatus, ready && styles.reviewStatusReady]}>
        <MaterialIcons name={ready ? 'check' : 'priority-high'} size={14} color={ready ? theme.colors.onAccent : theme.colors.textMuted} />
      </View>
      <View style={styles.reviewCopy}>
        <Text style={styles.reviewLabel}>{label}</Text>
        <Text style={styles.reviewValue} numberOfLines={2}>{value}</Text>
      </View>
    </View>
  );
}

function createStyles(theme: PluggdTheme) {
  return StyleSheet.create({
  flex: { flex: 1 },
  screen: { flex: 1, backgroundColor: theme.colors.background },
  loading: { flex: 1, backgroundColor: theme.colors.background, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  content: { paddingHorizontal: 16, gap: 18 },
  topBar: { minHeight: 60, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  iconButton: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  brand: { alignItems: 'center', gap: 1 },
  brandSmall: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8, letterSpacing: 1.3 },
  brandTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 16, letterSpacing: -0.3 },
  saveTop: { minWidth: 70, height: 44, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.accentSoft, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  saveTopText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 12 },
  previewBanner: { minHeight: 62, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  previewCopy: { flex: 1 },
  previewTitle: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.15 },
  previewBody: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, lineHeight: 15, marginTop: 3 },
  previewControlDisabled: { opacity: 0.72 },
  hero: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 20, gap: 18 },
  heroTop: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  heroCopy: { flex: 1 },
  eyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.5 },
  heroTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayExtraBold, fontSize: 30, lineHeight: 33, letterSpacing: -1, marginTop: 8 },
  heroBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19, marginTop: 10 },
  progressOrb: { width: 64, height: 64, borderRadius: 32, borderWidth: 1.5, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  progressValue: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 18 },
  progressLabel: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 7.5, letterSpacing: 1 },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindCard: { flex: 1, minHeight: 86, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 11, justifyContent: 'space-between' },
  kindCardSelected: { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft },
  kindLabel: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 13.5 },
  kindLabelSelected: { color: theme.colors.accentText },
  kindLine: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 9.5 },
  stepRail: { flexGrow: 1, gap: 6 },
  step: { flex: 1, minWidth: 78, height: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, paddingHorizontal: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4 },
  stepSelected: { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft },
  stepNumber: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1 },
  stepNumberActive: { color: theme.colors.accentText },
  stepLabel: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  stepLabelActive: { color: theme.colors.text },
  section: { gap: 13 },
  sectionHeading: { marginBottom: 2 },
  sectionEyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9.5, letterSpacing: 1.5 },
  sectionTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 23, lineHeight: 28, letterSpacing: -0.6, marginTop: 5 },
  sectionBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 19, marginTop: 6, maxWidth: 330 },
  field: { gap: 7 },
  fieldCompact: { flex: 1 },
  fieldLabel: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 1, textTransform: 'uppercase' },
  input: { minHeight: 52, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, paddingHorizontal: 14, fontFamily: pluggdFonts.satoshiMedium, fontSize: 15 },
  inputMultiline: { minHeight: 118, paddingTop: 14, textAlignVertical: 'top' },
  twoColumn: { flexDirection: 'row', gap: 10 },
  dateButton: { minHeight: 54, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  dateButtonText: { flex: 1, color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  dateDone: { alignSelf: 'flex-end', minHeight: 44, paddingHorizontal: 14, justifyContent: 'center' },
  dateDoneText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  choiceRail: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  choiceChip: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, paddingHorizontal: 13, alignItems: 'center', justifyContent: 'center' },
  choiceChipSelected: { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft },
  choiceChipText: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  choiceChipTextSelected: { color: theme.colors.accentText },
  repeatableField: { gap: 8 },
  repeatableHeader: { minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  repeatableRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  repeatableInput: { flex: 1 },
  repeatableRemove: { width: 44, height: 44, borderRadius: 14, alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface },
  emptyFieldHint: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5 },
  compactAdd: { minHeight: 44, borderRadius: 14, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 5, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface },
  compactAddText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 11 },
  artworkPicker: { minHeight: 116, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 10, flexDirection: 'row', alignItems: 'center', gap: 12, overflow: 'hidden' },
  artworkPlaceholder: { width: 94, height: 94, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  artworkImage: { width: 94, height: 94, borderRadius: 14, backgroundColor: theme.colors.artworkBase },
  audioPicker: { minHeight: 86, borderRadius: 20, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.accentSoft, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 },
  audioIcon: { width: 52, height: 52, borderRadius: 18, backgroundColor: theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  assetCopy: { flex: 1, minWidth: 0 },
  assetKicker: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.25 },
  assetTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 14, marginTop: 4 },
  assetMeta: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, marginTop: 4 },
  addCircle: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  subsectionCard: { borderRadius: 18, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 13, gap: 10 },
  subsectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  subsectionCopy: { flex: 1 },
  subsectionTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 16, lineHeight: 21, marginTop: 4 },
  primaryTrackNote: { minHeight: 48, borderRadius: 13, backgroundColor: theme.colors.surfaceRaised, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  primaryTrackNumber: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 10, letterSpacing: 0.8 },
  primaryTrackText: { flex: 1, color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  trackEditor: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider, paddingTop: 10 },
  trackEditorBody: { flex: 1, gap: 7 },
  trackInput: { minHeight: 46, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, paddingHorizontal: 12, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  trackAudio: { minHeight: 44, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.controlBorder, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 8 },
  trackAudioText: { flex: 1, color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5 },
  removeTrack: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  assetMiniPicker: { minHeight: 62, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 10 },
  guidanceBand: { borderLeftWidth: 2, borderLeftColor: theme.colors.accentFill, backgroundColor: theme.colors.surface, padding: 13, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  guidanceText: { flex: 1, color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17 },
  toggleRow: { minHeight: 82, borderTopWidth: 1, borderColor: theme.colors.border, paddingVertical: 13, flexDirection: 'row', alignItems: 'center', gap: 11 },
  toggleIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
  toggleCopy: { flex: 1 },
  toggleTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 14 },
  toggleBody: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 16, marginTop: 3 },
  switch: { minWidth: 51, minHeight: 44 },
  aiDeclarationCard: { borderRadius: 22, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, padding: 14, overflow: 'hidden' },
  aiDeclarationHead: { flexDirection: 'row', alignItems: 'flex-start', gap: 11 },
  aiDeclarationIcon: { width: 44, height: 44, borderRadius: 14, backgroundColor: theme.colors.surfaceRaised, alignItems: 'center', justifyContent: 'center' },
  aiDeclarationHeadCopy: { flex: 1, minWidth: 0 },
  aiDeclarationTitleRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 7, flexWrap: 'wrap' },
  aiDeclarationTitle: { flexShrink: 1, color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 16, lineHeight: 20 },
  requiredBadge: { color: theme.colors.onAccent, backgroundColor: theme.colors.accentFill, borderRadius: 7, overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3, fontFamily: pluggdFonts.satoshiBlack, fontSize: 7.5, letterSpacing: 0.8 },
  aiDeclarationBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 16, marginTop: 5 },
  aiChoiceGroup: { gap: 8, marginTop: 14 },
  aiChoice: { minHeight: 80, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  aiChoiceSelected: { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft },
  aiChoiceCopy: { flex: 1, minWidth: 0 },
  radioDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 1.5, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  radioDotSelected: { borderColor: theme.colors.accentFill },
  radioDotCore: { width: 10, height: 10, borderRadius: 5, backgroundColor: theme.colors.accentFill },
  aiChoiceText: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  aiChoiceTextSelected: { color: theme.colors.text },
  aiChoiceDescription: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, lineHeight: 16, marginTop: 4 },
  aiAssistedNote: { borderRadius: 14, borderWidth: 1, borderStyle: 'dashed', borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 12, flexDirection: 'row', alignItems: 'flex-start', gap: 9, marginTop: 12 },
  aiAssistedText: { flex: 1, color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, lineHeight: 16 },
  aiGeneratedPanel: { borderRadius: 16, borderWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.surface, padding: 12, gap: 16, marginTop: 12 },
  aiDetailGroup: { gap: 8 },
  aiDetailTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 13.5, lineHeight: 18 },
  aiDetailBody: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 10.5, lineHeight: 15, marginTop: -3 },
  aiCheckboxList: { gap: 7 },
  aiCheckboxRow: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiCheckboxRowSelected: { borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft },
  checkbox: { width: 20, height: 20, borderRadius: 6, borderWidth: 1.5, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  checkboxSelected: { borderColor: theme.colors.accentFill, backgroundColor: theme.colors.accentFill },
  licencePanel: { borderRadius: 18, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, padding: 13, gap: 9 },
  licenceRow: { minHeight: 54, flexDirection: 'row', alignItems: 'center', gap: 9, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: theme.colors.divider },
  licenceName: { flex: 1, color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  licencePrice: { width: 68, minHeight: 44, borderRadius: 12, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, color: theme.colors.text, textAlign: 'right', paddingHorizontal: 9, fontFamily: pluggdFonts.satoshiBold, fontSize: 13 },
  licenceCurrency: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9 },
  aiCheckboxLabel: { flex: 1, color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  aiStackedChoices: { gap: 7 },
  aiCompactChoice: { minHeight: 48, borderRadius: 13, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surfaceRaised, paddingHorizontal: 11, flexDirection: 'row', alignItems: 'center', gap: 10 },
  aiCompactChoiceText: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiBold, fontSize: 12 },
  aiConfirmations: { borderTopWidth: 1, borderColor: theme.colors.border, paddingTop: 8, gap: 2 },
  aiConfirmationRow: { minHeight: 54, paddingVertical: 8, flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  aiConfirmationText: { flex: 1, color: theme.colors.text, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 17 },
  reviewCard: { borderTopWidth: 1, borderColor: theme.colors.border },
  reviewRow: { minHeight: 66, borderBottomWidth: 1, borderColor: theme.colors.border, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 12 },
  reviewStatus: { width: 28, height: 28, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.controlBorder, alignItems: 'center', justifyContent: 'center' },
  reviewStatusReady: { backgroundColor: theme.colors.accentFill, borderColor: theme.colors.accentFill },
  reviewCopy: { flex: 1, minWidth: 0 },
  reviewLabel: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.2, textTransform: 'uppercase' },
  reviewValue: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 13, lineHeight: 17, marginTop: 3 },
  reviewAction: { minHeight: 78, borderRadius: 18, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, padding: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reviewActionKicker: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 8.5, letterSpacing: 1.1 },
  reviewActionTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 15, marginTop: 4 },
  footerActions: { flexDirection: 'row', gap: 10, paddingTop: 4 },
  secondaryButton: { minHeight: 52, borderRadius: 17, borderWidth: 1, borderColor: theme.colors.controlBorder, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
  secondaryButtonText: { color: theme.colors.text, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  primaryButton: { flex: 1, minHeight: 52, borderRadius: 17, borderWidth: 1.5, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.surfaceRaised, paddingHorizontal: 17, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  primaryButtonText: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 13 },
  reviewModal: { flex: 1, backgroundColor: theme.colors.background },
  modalHandle: { alignSelf: 'center', width: 42, height: 5, borderRadius: 3, backgroundColor: theme.colors.borderStrong, marginTop: 8 },
  modalHead: { minHeight: 82, borderBottomWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  modalEyebrow: { color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBlack, fontSize: 9, letterSpacing: 1.4 },
  modalTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 22, marginTop: 4 },
  modalClose: { width: 44, height: 44, borderRadius: 16, borderWidth: 1, borderColor: theme.colors.controlBorder, backgroundColor: theme.colors.surface, alignItems: 'center', justifyContent: 'center' },
  modalContent: { padding: 18 },
  modalScore: { borderRadius: 22, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, padding: 18, flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 12 },
  modalScoreValue: { color: theme.colors.accentText, fontFamily: pluggdFonts.displayExtraBold, fontSize: 34 },
  modalScoreCopy: { flex: 1 },
  modalScoreTitle: { color: theme.colors.text, fontFamily: pluggdFonts.displayBold, fontSize: 17 },
  modalScoreBody: { color: theme.colors.textSecondary, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 17, marginTop: 4 },
  modalFooter: { borderTopWidth: 1, borderColor: theme.colors.border, paddingHorizontal: 18, paddingTop: 14, gap: 12, backgroundColor: theme.colors.background },
  modalNote: { color: theme.colors.textMuted, fontFamily: pluggdFonts.satoshiMedium, fontSize: 11.5, lineHeight: 16 },
  modalPrimary: { flex: 0 },
  buttonDisabled: { opacity: 0.46 },
  uploadStatus: { minHeight: 44, borderRadius: 14, borderWidth: 1, borderColor: theme.colors.borderAccent, backgroundColor: theme.colors.accentSoft, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10 },
  uploadStatusText: { flex: 1, color: theme.colors.text, fontFamily: pluggdFonts.satoshiBold, fontSize: 12.5 },
  });
}
