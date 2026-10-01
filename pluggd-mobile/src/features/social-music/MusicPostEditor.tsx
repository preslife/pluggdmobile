import { MaterialIcons } from '@expo/vector-icons';
import { useEvent } from 'expo';
import * as Crypto from 'expo-crypto';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Animated, AppState, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQueryClient } from '@tanstack/react-query';
import { PluggdImage } from '../../components/PluggdImage';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback } from '../../context/PlaybackProvider';
import { impactHaptic, selectionHaptic } from '../../design/haptics';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import type { MobileSocialDestinationInput } from '../culture/mobileTypes';
import { MusicButton, MusicSlider, MusicTool, MusicWaveform, SoundArtwork } from './MusicControls';
import { SoundPickerSheet } from './SoundPickerSheet';
import { clamp, fitRecipe, formatMusicTime, musicError, type MusicDraft, type MusicRecipe, type MusicTrack } from './model';
import { clearMusicDraft, keepMusicMedia, loadMusicAudition, musicJobStatus, newMusicDraft, publishMusicDraft, readMusicDraft, readyMusicPreview, rememberMusic, removeMusicMedia, renderMusicDraft, saveMusicDraft, searchMusic, type MusicAudition } from './service';

type Params = { releaseId?: string; trackId?: string; content?: string; destinations?: string; mediaUri?: string; mediaKind?: string; mimeType?: string; mediaDuration?: string };
const DESTINATION_TYPES = new Set(['global_feed', 'user_profile', 'board', 'event', 'release', 'beat', 'mix', 'challenge', 'creator_community']);
function routeDestinations(raw?: string): MobileSocialDestinationInput[] {
  try {
    const rows = JSON.parse(raw || '[]');
    return Array.isArray(rows) ? rows.filter(row => DESTINATION_TYPES.has(row?.destination_type) && typeof row?.destination_id === 'string').slice(0, 10) : [];
  } catch { return []; }
}

function FinishedPreview({ uri, onError }: { uri: string; onError: () => void }) {
  const { pause } = usePlayback();
  const player = useVideoPlayer(uri, instance => { instance.loop = false; instance.staysActiveInBackground = false; instance.audioMixingMode = 'doNotMix'; });
  useEffect(() => {
    const play = player.addListener('playingChange', event => { if (event.isPlaying) void pause(); });
    const status = player.addListener('statusChange', event => { if (event.status === 'error') onError(); });
    const background = AppState.addEventListener('change', state => { if (state !== 'active') player.pause(); });
    // useVideoPlayer releases and stops the native player before passive cleanup.
    return () => { play.remove(); status.remove(); background.remove(); };
  }, [player, pause, onError]);
  return <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls contentFit="contain" />;
}

export function MusicPostEditor() {
  const { colors } = usePluggdTheme();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { height: viewportHeight } = useWindowDimensions();
  const router = useRouter();
  const params = useLocalSearchParams<Params>();
  const { user } = useAuth();
  const { pause: pauseGlobal } = usePlayback();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<MusicDraft | null>(null);
  const draftRef = useRef<MusicDraft | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [soundPicker, setSoundPicker] = useState(false);
  const [segmentSheet, setSegmentSheet] = useState(false);
  const [mixSheet, setMixSheet] = useState(false);
  const stageHeight = useRef(new Animated.Value(430)).current;
  const [busy, setBusy] = useState<'media' | 'render' | 'publish' | null>(null);
  const busyRef = useRef(false);
  const [error, setError] = useState('');
  const [readyUri, setReadyUri] = useState<string | null>(null);
  const [review, setReview] = useState(false);
  const [previewError, setPreviewError] = useState(false);
  const [waveform, setWaveform] = useState<number[]>([]);
  const [trackDuration, setTrackDuration] = useState(0);
  const [auditionBusy, setAuditionBusy] = useState(false);
  const [auditionId, setAuditionId] = useState<string | undefined>();
  const [auditionError, setAuditionError] = useState('');
  const [previewRevision, setPreviewRevision] = useState(0);
  const [soundProgress, setSoundProgress] = useState(0);
  const audio = useVideoPlayer(null, instance => { instance.loop = true; instance.staysActiveInBackground = false; instance.audioMixingMode = 'doNotMix'; instance.showNowPlayingNotification = false; instance.timeUpdateEventInterval = 0.1; });
  const video = useVideoPlayer(null, instance => { instance.loop = true; instance.staysActiveInBackground = false; instance.audioMixingMode = 'doNotMix'; });
  const { isPlaying } = useEvent(audio, 'playingChange', { isPlaying: audio.playing });
  const { isPlaying: videoPlaying } = useEvent(video, 'playingChange', { isPlaying: video.playing });
  const audition = useRef<MusicAudition | null>(null);
  const auditionRequest = useRef(0);
  const auditionAbort = useRef<AbortController | null>(null);
  const autoAudition = useRef(false);
  const recipeBeforeSheet = useRef<MusicRecipe | null>(null);
  const trackBeforeSheet = useRef<MusicTrack | null>(null);
  const mounted = useRef(true);
  const completed = useRef(false);
  const focused = useRef(true);
  const persistQueue = useRef(Promise.resolve());
  useLayoutEffect(() => () => { mounted.current = false; focused.current = false; }, []);
  const update = useCallback((next: MusicDraft) => { draftRef.current = next; setDraft(next); }, []);
  const persist = useCallback(async (next: MusicDraft) => {
    const write = persistQueue.current.catch(() => undefined).then(() => completed.current ? undefined : saveMusicDraft(next));
    persistQueue.current = write;
    await write;
  }, []);
  const checkpoint = useCallback(async (next: MusicDraft) => { update(next); await persist(next); }, [persist, update]);
  useEffect(() => {
    const sheetOpen = soundPicker || segmentSheet || mixSheet;
    const height = sheetOpen ? Math.max(120, viewportHeight * (soundPicker ? 0.28 : 0.34) - insets.top - 76) : Math.min(430, viewportHeight * 0.54);
    Animated.timing(stageHeight, { toValue: height, duration: 240, useNativeDriver: false }).start();
  }, [soundPicker, segmentSheet, mixSheet, viewportHeight, insets.top, stageHeight]);
  const stop = useCallback(() => { audio.pause(); video.pause(); }, [audio, video]);
  const cancelAudition = useCallback(() => {
    auditionRequest.current++; auditionAbort.current?.abort(); if (mounted.current) audio.pause();
    setAuditionBusy(false); setAuditionId(undefined);
  }, [audio]);
  useFocusEffect(useCallback(() => { focused.current = true; return () => { focused.current = false; cancelAudition(); if (mounted.current) video.pause(); }; }, [cancelAudition, video]));
  useEffect(() => {
    mounted.current = true;
    const subscription = AppState.addEventListener('change', state => { if (state !== 'active') { cancelAudition(); video.pause(); } });
    return () => { mounted.current = false; auditionRequest.current++; auditionAbort.current?.abort(); subscription.remove(); audition.current?.dispose(); };
  }, [cancelAudition, video]);
  useEffect(() => {
    if (!user?.id) { setHydrated(true); return; }
    let active = true;
    const initialise = async (restore: MusicDraft | null) => {
      let next = restore || newMusicDraft(user.id, params.content || '', routeDestinations(params.destinations));
      if (!restore && params.mediaUri && (params.mediaKind === 'photo' || params.mediaKind === 'video')) {
        const media = await keepMusicMedia({ uri: params.mediaUri, kind: params.mediaKind, mimeType: params.mimeType || (params.mediaKind === 'photo' ? 'image/jpeg' : 'video/mp4'), duration: clamp(Number(params.mediaDuration) || 15, 1, 30) });
        next = { ...next, media, recipe: fitRecipe(next.recipe, 30, media.duration) };
      }
      if (!restore && params.releaseId) {
        const tracks = await searchMusic('', params.releaseId);
        const initial = tracks.find(track => track.track_id === params.trackId) || (tracks.length === 1 ? tracks[0] : null);
        if (initial) next = { ...next, track: initial, recipe: fitRecipe(next.recipe, initial.duration || 30) };
      }
      if (!active) return;
      await checkpoint(next);
      setHydrated(true);
      if (restore?.jobId) {
        const status = await musicJobStatus(restore.jobId);
        if (status === 'published') {
          completed.current = true; await persistQueue.current; await clearMusicDraft(user.id); removeMusicMedia(restore.media);
          router.replace(`/post/${restore.postId}` as any); return;
        }
        if (status === 'ready') { const uri = await readyMusicPreview(user.id, restore.jobId); if (active) { setReadyUri(uri); setReview(true); } }
      }
    };
    readMusicDraft(user.id).then(saved => {
      if (!active) return;
      if (saved) {
        Alert.alert('Continue your music post?', 'Your media and audio selection are saved.', [
          { text: 'Start new', onPress: () => { removeMusicMedia(saved.media); void initialise(null).catch(error => { setError(musicError(error)); setHydrated(true); }); } },
          { text: 'Continue draft', onPress: () => { void initialise(saved).catch(error => { setError(musicError(error)); setHydrated(true); }); } },
        ], { cancelable: false });
      } else void initialise(null).catch(error => { setError(musicError(error)); setHydrated(true); });
    }).catch(error => { if (active) { setError(musicError(error)); setHydrated(true); } });
    return () => { active = false; };
  }, [user?.id]);
  useEffect(() => {
    if (!draft || !hydrated) return;
    const timer = setTimeout(() => { void persist(draft).catch(error => { if (mounted.current) setError(`Could not save your draft: ${musicError(error)}`); }); }, 350);
    return () => clearTimeout(timer);
  }, [draft, hydrated, persist]);
  useEffect(() => {
    const media = draft?.media;
    video.pause();
    if (media?.kind === 'video') void video.replaceAsync(media.uri).catch(() => setError('Could not open this video. Choose it again from your library.'));
    else void video.replaceAsync(null);
  }, [draft?.media?.uri, video]);
  useEffect(() => { audio.volume = draft?.recipe.musicGain ?? 0.8; video.volume = draft?.recipe.originalGain ?? 0.6; }, [audio, video, draft?.recipe.musicGain, draft?.recipe.originalGain]);
  useEffect(() => {
    const soundStatus = audio.addListener('statusChange', event => { if (event.status === 'error') setAuditionError('This sound could not be played. Retry the preview or choose another sound.'); });
    const soundTime = audio.addListener('timeUpdate', event => setSoundProgress(event.currentTime));
    const videoStatus = video.addListener('statusChange', event => { if (event.status === 'error') setError('This video could not be opened. Choose it again from your library.'); });
    return () => { soundStatus.remove(); soundTime.remove(); videoStatus.remove(); };
  }, [audio, video]);

  const loadAudition = useCallback(async (track: MusicTrack, recipe: MusicRecipe, shouldPlay: boolean, selected: boolean) => {
    const generation = ++auditionRequest.current;
    auditionAbort.current?.abort();
    const controller = new AbortController(); auditionAbort.current = controller;
    audio.pause(); video.pause(); setAuditionBusy(true); setAuditionError(''); setAuditionId(track.track_id);
    let loaded: MusicAudition | null = null;
    try {
      loaded = await loadMusicAudition(track.track_id, recipe.startSeconds, recipe.durationSeconds, controller.signal);
      if (generation !== auditionRequest.current || !mounted.current) { loaded.dispose(); return; }
      await audio.replaceAsync(loaded.uri);
      if (generation !== auditionRequest.current || !mounted.current) { loaded.dispose(); return; }
      audition.current?.dispose(); audition.current = loaded;
      if (selected) {
        setWaveform(loaded.waveform); setTrackDuration(loaded.trackDuration);
        const current = draftRef.current;
        if (current?.track?.track_id === track.track_id) {
          const fitted = fitRecipe(current.recipe, loaded.trackDuration);
          update({ ...current, track: { ...current.track, duration: loaded.trackDuration }, recipe: fitted });
        }
      }
      if (shouldPlay && focused.current && AppState.currentState === 'active') {
        await pauseGlobal();
        if (generation === auditionRequest.current && mounted.current && focused.current && AppState.currentState === 'active') audio.play();
      }
    } catch (error) {
      if (generation === auditionRequest.current && !controller.signal.aborted && mounted.current) setAuditionError(musicError(error));
    } finally { if (generation === auditionRequest.current && mounted.current) setAuditionBusy(false); }
  }, [audio, video, pauseGlobal, update]);
  useEffect(() => {
    if (!draft?.track || !hydrated || soundPicker || review) return;
    audio.pause();
    const track = draft.track, recipe = draft.recipe;
    const timer = setTimeout(() => { void loadAudition(track, recipe, autoAudition.current && segmentSheet, true); }, 300);
    return () => { clearTimeout(timer); auditionAbort.current?.abort(); auditionRequest.current++; };
  }, [draft?.track?.track_id, draft?.recipe.startSeconds, draft?.recipe.durationSeconds, hydrated, soundPicker, review, previewRevision]);

  const edit = (patch: Partial<MusicDraft>, recipeChange = false) => {
    const current = draftRef.current;
    if (!current || busyRef.current) return;
    if (recipeChange) { stop(); setReadyUri(null); setPreviewError(false); }
    update({ ...current, ...patch, reviewPending: false, ...(recipeChange ? { requestId: Crypto.randomUUID(), postId: Crypto.randomUUID(), jobId: undefined } : {}) });
  };
  const changeRecipe = (patch: Partial<MusicRecipe>) => {
    if (!draft) return;
    edit({ recipe: fitRecipe({ ...draft.recipe, ...patch }, trackDuration || draft.track?.duration || 30) }, true);
  };
  const pickMedia = async (camera = false) => {
    if (busyRef.current || !draft) return;
    try {
      stop(); setError('');
      const permission = camera ? await ImagePicker.requestCameraPermissionsAsync() : await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) throw new Error(camera ? 'Allow camera access in Settings to capture a photo or video.' : 'Allow photo library access in Settings to choose media.');
      const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images', 'videos'], quality: 0.9, videoMaxDuration: 30, allowsEditing: false, videoExportPreset: ImagePicker.VideoExportPreset.H264_1920x1080, preferredAssetRepresentationMode: ImagePicker.UIImagePickerPreferredAssetRepresentationMode.Compatible };
      const result = camera ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled || !result.assets[0]) return;
      busyRef.current = true; setBusy('media');
      const asset = result.assets[0];
      const kind = asset.type === 'video' ? 'video' : 'photo';
      const mime = asset.mimeType || (kind === 'photo' ? 'image/jpeg' : 'video/mp4');
      if (!(kind === 'photo' ? ['image/jpeg', 'image/png'] : ['video/mp4', 'video/quicktime']).includes(mime)) throw new Error('Choose a JPEG/PNG photo or an MP4/MOV video.');
      const rawDuration = kind === 'video' ? Number(asset.duration) / 1000 : draft.recipe.contentDurationSeconds;
      if (kind === 'video' && (!Number.isFinite(rawDuration) || rawDuration < 1)) throw new Error('Choose a video at least one second long.');
      const media = await keepMusicMedia({ uri: asset.uri, kind, mimeType: mime, duration: Math.min(30, rawDuration) });
      const next = { ...draft, media, uploadId: Crypto.randomUUID(), requestId: Crypto.randomUUID(), postId: Crypto.randomUUID(), sourcePath: undefined, jobId: undefined, recipe: fitRecipe(draft.recipe, trackDuration || 30, media.duration) };
      await checkpoint(next); removeMusicMedia(draft.media); setReadyUri(null);
      if (rawDuration > 30) setError('Your post uses the first 30 seconds of this video.');
    } catch (error) { setError(musicError(error)); } finally { busyRef.current = false; setBusy(null); }
  };
  const openSegment = () => { if (!draft?.track) { setSoundPicker(true); return; } recipeBeforeSheet.current = draft.recipe; trackBeforeSheet.current = draft.track; setSegmentSheet(true); };
  const selectTrack = (track: MusicTrack) => {
    if (!draft) return;
    cancelAudition(); setWaveform([]); setTrackDuration(0); autoAudition.current = true;
    recipeBeforeSheet.current = draft.recipe; trackBeforeSheet.current = draft.track;
    edit({ track, recipe: fitRecipe({ ...draft.recipe, startSeconds: 0 }, track.duration || 30) }, true);
    setSoundPicker(false); setSegmentSheet(true);
    void rememberMusic(draft.userId, 'recent', track).catch(error => setError(musicError(error)));
  };
  const toggleAudition = async () => {
    if (!draft?.track || auditionBusy) return;
    if (audio.playing) { audio.pause(); autoAudition.current = false; return; }
    autoAudition.current = true;
    if (audition.current && auditionId === draft.track.track_id) { video.pause(); await pauseGlobal(); if (focused.current && AppState.currentState === 'active') audio.play(); }
    else void loadAudition(draft.track, draft.recipe, true, true);
  };
  const closeSegment = (cancel: boolean) => {
    autoAudition.current = false; cancelAudition();
    if (cancel && recipeBeforeSheet.current) {
      if (trackBeforeSheet.current?.track_id !== draft?.track?.track_id) { setWaveform([]); setTrackDuration(0); }
      edit({ track: trackBeforeSheet.current, recipe: recipeBeforeSheet.current }, true);
    }
    setSegmentSheet(false);
  };
  const finish = async () => {
    if (!draftRef.current?.media || !draftRef.current.track || busyRef.current) return;
    busyRef.current = true; setBusy('render'); setError(''); stop();
    try {
      const current = draftRef.current;
      if (!waveform.length || trackDuration < 1) throw new Error('Load the sound preview before preparing your post.');
      const result = await renderMusicDraft(current, checkpoint);
      if (!mounted.current) return;
      if (result.published) { completed.current = true; await persistQueue.current; await clearMusicDraft(current.userId); removeMusicMedia(current.media); router.replace(`/post/${current.postId}` as any); return; }
      setReadyUri(result.uri); setPreviewError(false); setReview(true);
    } catch (error) { if (mounted.current) setError(musicError(error)); } finally { busyRef.current = false; if (mounted.current) setBusy(null); }
  };
  const publish = async () => {
    if (!draftRef.current || !readyUri || previewError || busyRef.current) return;
    busyRef.current = true; setBusy('publish'); setError(''); stop();
    try {
      const current = draftRef.current;
      await checkpoint(current);
      const result = await publishMusicDraft(current);
      if (result.status === 'pending_review') { await checkpoint({ ...current, reviewPending: true }); return; }
      const postId = result.postId;
      completed.current = true; await persistQueue.current; await clearMusicDraft(current.userId); removeMusicMedia(current.media);
      await Promise.all(['community-feed', 'culture'].map(query => queryClient.invalidateQueries({ queryKey: [query] })));
      impactHaptic(); if (mounted.current) router.replace(`/post/${postId}` as any);
    } catch (error) { if (mounted.current) setError(musicError(error)); } finally { busyRef.current = false; if (mounted.current) setBusy(null); }
  };
  const leave = () => {
    if (busyRef.current) return;
    stop();
    if (!draft || completed.current) { router.back(); return; }
    void checkpoint(draft).then(() => router.back()).catch(error => setError(musicError(error)));
  };
  const audience = draft?.destinations.some(destination => destination.destination_type === 'creator_community') ? 'Your community' : draft?.destinations.length ? 'Selected feed' : 'Community feed + profile';
  const track = draft?.track;
  const recipe = draft?.recipe;
  const availableDuration = Math.min(30, trackDuration || track?.duration || 30, draft?.media?.kind === 'video' ? recipe?.contentDurationSeconds || 30 : 30);
  const selectDuration = (durationSeconds: number) => {
    autoAudition.current = audio.playing || autoAudition.current;
    changeRecipe({ durationSeconds, ...(draft?.media?.kind !== 'video' ? { contentDurationSeconds: Math.min(30, durationSeconds + (recipe?.timelineOffsetSeconds || 0)) } : {}) });
  };
  const onFinishedError = useCallback(() => setPreviewError(true), []);

  if (!hydrated || !draft) return <View style={[styles.screen, { paddingTop: insets.top + 20 }]}><Stack.Screen options={{ headerShown: false }} />
    <View style={styles.top}><MusicButton icon="close" label="Close" onPress={leave} compact /><Text style={styles.heading}>Music post</Text></View>
    <View style={styles.empty}>{!hydrated ? <ActivityIndicator color={colors.accentText} /> : <><Text style={styles.body}>{error || 'Sign in to create a music post.'}</Text>{!user ? <MusicButton primary label="Sign in" onPress={() => router.push('/auth/login' as any)} /> : null}<MusicButton label="Back" onPress={() => router.back()} /></>}</View>
  </View>;
  return <KeyboardAvoidingView style={styles.screen} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
    <Stack.Screen options={{ headerShown: false, gestureEnabled: !busy }} /><StatusBar style={colors.background === '#FFF8ED' ? 'dark' : 'light'} />
    <View style={[styles.top, { paddingTop: Math.max(insets.top, 12) }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={review ? 'Back to audio editor' : 'Close and save draft'} disabled={Boolean(busy)} style={styles.round} onPress={review ? () => { setReview(false); setPreviewError(false); } : leave}><MaterialIcons name={review ? 'chevron-left' : 'close'} size={25} color={colors.text} /></Pressable>
      <Text style={styles.heading}>{review ? 'Ready to share' : 'Create with music'}</Text>
      <Text style={styles.durationPill}>{formatMusicTime(recipe!.contentDurationSeconds)}</Text>
    </View>
    <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1, paddingBottom: Math.max(insets.bottom, 16) + 12 }} keyboardShouldPersistTaps="handled">
      <Animated.View style={[styles.stage, { height: stageHeight }]}>
        {review && readyUri ? <FinishedPreview key={readyUri} uri={readyUri} onError={onFinishedError} /> : draft.media ? <>
          {draft.media.kind === 'photo' ? <PluggdImage uri={draft.media.uri} style={StyleSheet.absoluteFill} resizeMode="contain" /> : <VideoView player={video} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="contain" />}
          <LinearGradient colors={['rgba(0,0,0,0.6)', 'transparent']} style={styles.topScrim} pointerEvents="none" />
          <Pressable accessibilityRole="button" accessibilityLabel={track ? `Edit music: ${track.track_title}` : 'Add music'} style={styles.soundChip} disabled={Boolean(busy)} onPress={() => { stop(); track ? openSegment() : setSoundPicker(true); }}>
            {track ? <SoundArtwork track={track} size={34} /> : <MaterialIcons name="music-note" size={23} color="#FFFFFF" />}
            <View style={{ flexShrink: 1, gap: 2 }}><Text numberOfLines={1} style={styles.chipTitle}>{track?.track_title || 'Add music'}</Text>{track ? <Text style={styles.chipMeta}>{track.artist} · {formatMusicTime(recipe!.startSeconds)}–{formatMusicTime(recipe!.startSeconds + recipe!.durationSeconds)}</Text> : null}</View>
            <MaterialIcons name="expand-more" size={22} color="#FFFFFF" />
          </Pressable>
          {draft.media.kind === 'video' ? <Pressable accessibilityRole="button" accessibilityLabel={videoPlaying ? 'Pause original video' : 'Play original video'} style={styles.mediaPlay} onPress={() => { if (video.playing) video.pause(); else { audio.pause(); void pauseGlobal().then(() => video.play()); } }}><MaterialIcons name={videoPlaying ? 'pause' : 'play-arrow'} size={30} color="#FFFFFF" /></Pressable> : null}
        </> : <View style={styles.empty}><View style={styles.emptyIcon}><MaterialIcons name="add-photo-alternate" size={42} color={colors.accentText} /></View>
          <Text style={styles.emptyTitle}>Make a moment</Text><Text style={styles.emptyCopy}>Your photo or video.{`\n`}The soundtrack you choose.</Text>
          <MusicButton primary icon="photo-library" label="Choose photo or video" onPress={() => void pickMedia()} /><MusicButton icon="photo-camera" label="Open camera" onPress={() => void pickMedia(true)} />
          <Pressable accessibilityRole="button" accessibilityLabel="Choose music first" onPress={() => setSoundPicker(true)} style={{ minHeight: 44, justifyContent: 'center' }}><Text style={styles.accent}>{track ? track.track_title : 'Choose music first'}</Text></Pressable>
        </View>}
        {previewError ? <View style={styles.previewFailure}><Text style={{ color: '#FFFFFF', textAlign: 'center' }}>Your preview needs to be refreshed.</Text><MusicButton label="Refresh preview" onPress={() => { if (draft.jobId) void readyMusicPreview(draft.userId, draft.jobId).then(uri => { setReadyUri(uri); setPreviewError(false); }).catch(error => setError(musicError(error))); }} /></View> : null}
      </Animated.View>
      {review ? <View style={styles.reviewCopy}>
        <Text style={styles.label}>Caption</Text><TextInput accessibilityLabel="Music post caption" multiline maxLength={500} value={draft.content} onChangeText={content => edit({ content })} placeholder="Tell the story behind your moment…" placeholderTextColor={colors.textMuted} style={styles.caption} editable={!busy} />
        <View style={styles.between}><Text style={styles.meta}>Sharing to {audience}</Text><Text style={styles.meta}>{draft.content.length}/500</Text></View>
        {track ? <View style={styles.attribution}><SoundArtwork track={track} size={36} /><View style={{ flex: 1 }}><Text style={styles.body} numberOfLines={1}>{track.track_title}</Text><Text style={styles.meta}>{track.artist} · linked to the release</Text></View></View> : null}
      </View> : draft.media ? <View style={styles.tools}>
        <MusicTool icon="library-music" label={track ? 'Change' : 'Music'} onPress={() => { cancelAudition(); video.pause(); setSoundPicker(true); }} disabled={Boolean(busy)} />
        <MusicTool icon="content-cut" label="Trim" onPress={openSegment} disabled={!track || Boolean(busy)} />
        <MusicTool icon="tune" label="Mix" onPress={() => { stop(); setMixSheet(true); }} disabled={!track || Boolean(busy)} />
        <MusicTool icon="photo-library" label="Media" onPress={() => void pickMedia()} disabled={Boolean(busy)} />
      </View> : null}
      {draft.reviewPending ? <Text accessibilityLiveRegion="polite" style={[styles.body, { marginHorizontal: 24, marginBottom: 12, textAlign: 'center' }]}>Your finished post is awaiting review. Your draft is saved. Check again here before publishing. Editing the caption or audience requires a new review. Unfinished previews expire after seven days.</Text> : null}
      {error ? <Text accessibilityRole="alert" style={styles.error}>{error}</Text> : null}
      {review && /expired|new preview/i.test(error) ? <MusicButton label="Prepare a new preview" onPress={() => { edit({}, true); setReview(false); setError(''); }} /> : null}
      {!review && auditionError ? <Text accessibilityRole="alert" style={styles.error}>{auditionError}</Text> : null}
      <View style={styles.bottom}>
        {busy ? <View style={styles.processing}><ActivityIndicator color={colors.accentText} /><Text accessibilityLiveRegion="polite" style={styles.body}>{busy === 'render' ? 'Preparing your finished preview…' : busy === 'publish' ? 'Sharing your post…' : 'Preparing your media…'}</Text><Text style={styles.meta}>{busy === 'render' ? 'Keep this screen open. Your draft is saved.' : 'Just a moment.'}</Text></View>
          : <MusicButton primary icon={review ? 'arrow-upward' : 'play-circle-outline'} label={review ? draft.reviewPending ? 'Check review and publish' : 'Submit for review' : 'Preview post'} onPress={() => void (review ? publish() : finish())} disabled={review ? !readyUri || previewError : !draft.media || !track || auditionBusy || !waveform.length} />}
        {!review && draft.media ? <Text style={[styles.meta, { textAlign: 'center', marginTop: 10 }]}>Watch the finished mix before sharing.</Text> : null}
      </View>
    </ScrollView>
    <Modal transparent visible={soundPicker || segmentSheet || mixSheet} animationType="slide" onRequestClose={() => {
      if (segmentSheet) closeSegment(false); else { cancelAudition(); setSoundPicker(false); setMixSheet(false); }
    }}>
    {soundPicker ? <SoundPickerSheet inline visible userId={draft.userId} releaseId={params.releaseId} selectedId={track?.track_id} auditionId={isPlaying || auditionBusy ? auditionId : undefined} auditionBusy={auditionBusy}
      onClose={() => { cancelAudition(); setSoundPicker(false); }} onSelect={selectTrack}
      onAudition={item => { if (item.track_id === auditionId && (audio.playing || auditionBusy)) cancelAudition(); else void loadAudition(item, { ...recipe!, startSeconds: 0, durationSeconds: Math.min(15, item.duration || 15) }, true, false); }} /> : null}
    {segmentSheet ?
      <View style={styles.modalRoot}><Pressable accessibilityRole="button" accessibilityLabel="Close audio editor" style={styles.modalScrim} onPress={() => closeSegment(false)} />
        <View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
          <View style={styles.handle} /><View style={styles.between}><MusicButton compact label="Cancel" onPress={() => closeSegment(true)} /><Text style={styles.heading}>Choose the moment</Text><MusicButton compact primary label="Done" onPress={() => closeSegment(false)} /></View>
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ gap: 18, paddingTop: 20 }}>
            {track ? <View style={styles.selectedSound}><SoundArtwork track={track} size={60} /><View style={{ flex: 1, gap: 5 }}><Text style={styles.soundTitle} numberOfLines={2}>{track.track_title}</Text><Text style={styles.meta}>{track.artist}</Text></View>
              <Pressable accessibilityRole="button" accessibilityLabel={isPlaying ? 'Pause selected audio' : 'Play selected audio'} disabled={auditionBusy} style={styles.round} onPress={() => void toggleAudition()}>{auditionBusy ? <ActivityIndicator color={colors.accentText} /> : <MaterialIcons name={isPlaying ? 'pause' : 'play-arrow'} size={28} color={colors.text} />}</Pressable></View> : null}
            {waveform.length && trackDuration ? <MusicWaveform peaks={waveform} trackDuration={trackDuration} duration={recipe!.durationSeconds} start={recipe!.startSeconds} progress={soundProgress} onChange={startSeconds => changeRecipe({ startSeconds })}
              onDrag={() => { autoAudition.current = audio.playing; audio.pause(); }} onCommit={() => setPreviewRevision(value => value + 1)} />
              : <View style={styles.processing}><ActivityIndicator color={colors.accentText} /><Text style={styles.meta}>Loading sound timeline…</Text></View>}
            <View style={styles.presetRow}>{[5, 15, 30].map(seconds => <Pressable key={seconds} accessibilityRole="button" accessibilityLabel={`Select ${seconds} seconds of audio`} accessibilityState={{ selected: recipe!.durationSeconds === seconds }} disabled={seconds > availableDuration}
              onPress={() => { selectionHaptic(); selectDuration(seconds); }} style={[styles.preset, recipe!.durationSeconds === seconds && styles.presetSelected, seconds > availableDuration && { opacity: 0.35 }]}><Text style={[styles.body, recipe!.durationSeconds === seconds && { color: colors.onAccent }]}>{seconds}s</Text></Pressable>)}</View>
            <MusicSlider label="Audio duration" min={1} max={availableDuration} step={0.1} value={recipe!.durationSeconds} format={value => `${value.toFixed(1)}s`} onChange={selectDuration} onCommit={() => setPreviewRevision(value => value + 1)} />
            {auditionError ? <View style={{ gap: 10 }}><Text accessibilityRole="alert" style={styles.error}>{auditionError}</Text><MusicButton label="Retry preview" onPress={() => setPreviewRevision(value => value + 1)} /></View> : null}
            <MusicButton icon="swap-horiz" label="Change audio" onPress={() => { closeSegment(false); setSoundPicker(true); }} />
          </ScrollView>
        </View>
      </View>
    : null}
    {mixSheet ?
      <View style={styles.modalRoot}><Pressable accessibilityRole="button" accessibilityLabel="Close mix controls" style={styles.modalScrim} onPress={() => setMixSheet(false)} /><View accessibilityViewIsModal style={[styles.sheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
        <View style={styles.handle} /><View style={styles.between}><Text style={styles.heading}>Make it yours</Text><MusicButton primary compact label="Done" onPress={() => setMixSheet(false)} /></View>
        <ScrollView contentContainerStyle={{ gap: 20, paddingTop: 22 }}>
          <MusicSlider label="Music volume" value={recipe!.musicGain} onChange={musicGain => changeRecipe({ musicGain })} />
          {draft.media?.kind === 'video' ? <MusicSlider label="Original video volume" value={recipe!.originalGain} onChange={originalGain => changeRecipe({ originalGain })} /> : null}
          <MusicSlider label={draft.media?.kind === 'photo' ? 'Photo duration' : 'Post duration'} min={1} max={draft.media?.kind === 'video' ? draft.media.duration : 30} step={0.1} value={recipe!.contentDurationSeconds} format={value => `${value.toFixed(1)}s`} onChange={contentDurationSeconds => changeRecipe({ contentDurationSeconds })} />
          {recipe!.contentDurationSeconds > recipe!.durationSeconds ? <MusicSlider label="Music starts in your post" min={0} max={recipe!.contentDurationSeconds - recipe!.durationSeconds} step={0.1} value={recipe!.timelineOffsetSeconds} format={value => formatMusicTime(value, true)} onChange={timelineOffsetSeconds => changeRecipe({ timelineOffsetSeconds })} /> : null}
          <Text style={styles.meta}>Preview post lets you hear both volumes and the exact timing together.</Text>
        </ScrollView>
      </View></View>
    : null}
    </Modal>
  </KeyboardAvoidingView>;
}

function useStyles() {
  const { colors } = usePluggdTheme();
  return StyleSheet.create({
    screen: { flex: 1, backgroundColor: colors.background }, top: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, paddingHorizontal: 20, paddingBottom: 14 },
    heading: { fontFamily: pluggdFonts.satoshiBold, fontSize: 17, color: colors.text, flexShrink: 1, textAlign: 'center' }, round: { width: 48, height: 48, borderRadius: 24, backgroundColor: colors.surfaceAlt, alignItems: 'center', justifyContent: 'center' },
    durationPill: { fontFamily: pluggdFonts.satoshiBold, color: colors.textSecondary, fontSize: 13, backgroundColor: colors.surfaceAlt, overflow: 'hidden', borderRadius: 16, paddingHorizontal: 12, paddingVertical: 8, fontVariant: ['tabular-nums'] },
    stage: { marginHorizontal: 12, height: 430, borderRadius: 24, overflow: 'hidden', backgroundColor: colors.artworkBase },
    topScrim: { position: 'absolute', top: 0, left: 0, right: 0, height: 120 }, soundChip: { position: 'absolute', top: 18, left: 24, right: 24, minHeight: 54, borderRadius: 28, paddingVertical: 8, paddingHorizontal: 14, backgroundColor: 'rgba(0,0,0,0.68)', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 },
    chipTitle: { fontFamily: pluggdFonts.satoshiBold, color: '#FFFFFF', fontSize: 14 }, chipMeta: { fontFamily: pluggdFonts.satoshiMedium, color: '#DADADA', fontSize: 11 },
    mediaPlay: { position: 'absolute', bottom: 20, right: 20, width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(0,0,0,0.65)', alignItems: 'center', justifyContent: 'center' },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 16, paddingHorizontal: 24, paddingVertical: 28 }, emptyIcon: { width: 76, height: 76, borderRadius: 24, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' },
    emptyTitle: { fontFamily: pluggdFonts.satoshiBlack, fontSize: 28, color: colors.text }, emptyCopy: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 16, lineHeight: 24, color: colors.textMuted, textAlign: 'center' }, accent: { fontFamily: pluggdFonts.satoshiBold, color: colors.accentText, fontSize: 14 },
    tools: { flexDirection: 'row', justifyContent: 'center', gap: 8, paddingHorizontal: 24, paddingVertical: 20 }, bottom: { paddingHorizontal: 24, paddingTop: 8 },
    body: { fontFamily: pluggdFonts.satoshiBold, fontSize: 14, color: colors.text }, meta: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 18, color: colors.textMuted }, label: { fontFamily: pluggdFonts.satoshiBold, fontSize: 13, color: colors.textSecondary },
    between: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }, processing: { alignItems: 'center', paddingVertical: 16, gap: 10 }, error: { color: colors.danger, fontFamily: pluggdFonts.satoshiMedium, textAlign: 'center', fontSize: 13, lineHeight: 19, marginHorizontal: 24, marginBottom: 12 },
    modalRoot: { flex: 1, justifyContent: 'flex-end' }, modalScrim: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)' }, sheet: { height: '66%', maxHeight: '80%', paddingHorizontal: 20, backgroundColor: colors.background, borderTopLeftRadius: 28, borderTopRightRadius: 28 }, handle: { width: 40, height: 4, borderRadius: 2, backgroundColor: colors.controlBorder, alignSelf: 'center', marginTop: 10, marginBottom: 12 },
    selectedSound: { flexDirection: 'row', alignItems: 'center', gap: 14 }, soundTitle: { fontFamily: pluggdFonts.satoshiBold, color: colors.text, fontSize: 18 },
    presetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10 }, preset: { minHeight: 44, minWidth: 64, borderRadius: 22, backgroundColor: colors.surfaceAlt, justifyContent: 'center', alignItems: 'center' }, presetSelected: { backgroundColor: colors.accentFill },
    reviewCopy: { padding: 24, gap: 12 }, caption: { minHeight: 70, fontFamily: pluggdFonts.satoshiMedium, fontSize: 16, lineHeight: 24, color: colors.text, textAlignVertical: 'top' }, attribution: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.divider },
    previewFailure: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center', gap: 16, padding: 24, backgroundColor: 'rgba(0,0,0,0.85)' },
  });
}
