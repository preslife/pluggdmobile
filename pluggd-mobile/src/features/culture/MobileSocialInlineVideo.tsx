import { MaterialIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback } from '../../context/PlaybackProvider';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { pluggdFonts } from '../../design/typography';
import { musicPostId } from '../social-music/model';
import { musicPlayback } from '../social-music/service';
import { useInlineVideoVisibility } from './useInlineVideoVisibility';
import { playInlineVideoAutomatic, setInlineVideoAutomaticAudio, setInlineVideoPrimaryAudioProtection } from './inlineVideoAudio';
import { hydrateInlineVideoSoundPreference, setInlineVideoUserMuted, useInlineVideoSoundPreference } from './inlineVideoSoundPreference';
import { AudioProgressQualification } from '../community-feed/communityRelevanceModel';

type Props = { uri: string; blocked: boolean; onFullscreen: () => void; onQualifiedListening?: (elapsedMs: number) => void };

export function MobileSocialInlineVideo(props: Props) {
  const { user, session } = useAuth();
  const context = useRef({ actor: user?.id, token: session?.access_token, revision: 0 });
  if (context.current.actor !== user?.id || context.current.token !== session?.access_token) {
    context.current = { actor: user?.id, token: session?.access_token, revision: context.current.revision + 1 };
  }
  // Release private URLs and native playback immediately on identity/source changes.
  return <InlineVideo key={`${context.current.revision}:${props.uri}`} {...props} />;
}

function InlineVideo({ uri, blocked, onFullscreen, onQualifiedListening }: Props) {
  const theme = usePluggdTheme();
  const visibility = useInlineVideoVisibility(blocked);
  const [autoplay, setAutoplay] = useState(false);
  const [requested, setRequested] = useState(false);
  const manualPlayRequested = useRef(false);
  const claimManualPlay = useCallback(() => {
    const requested = manualPlayRequested.current;
    manualPlayRequested.current = false;
    return requested;
  }, []);
  useEffect(() => {
    if (!visibility.active) { setRequested(false); manualPlayRequested.current = false; }
  }, [visibility.active]);
  const [screenReaderEnabled, setScreenReaderEnabled] = useState(true);
  useEffect(() => {
    let live = true;
    let reduce = true;
    let reader = true;
    const update = () => { if (live) { setAutoplay(!reduce && !reader); setScreenReaderEnabled(reader); } };
    void Promise.all([AccessibilityInfo.isReduceMotionEnabled(), AccessibilityInfo.isScreenReaderEnabled()]).then(([motion, screenReader]) => {
      reduce = motion; reader = screenReader; update();
    }).catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => { reduce = enabled; update(); });
    const screenReader = AccessibilityInfo.addEventListener('screenReaderChanged', enabled => { reader = enabled; update(); });
    return () => { live = false; motion.remove(); screenReader.remove(); };
  }, []);
  return <View ref={visibility.view} collapsable={false} style={[styles.frame, { backgroundColor: theme.colors.artworkBase }]}>
    {visibility.active && (autoplay || requested) ? <InlinePlayer uri={uri} onFullscreen={onFullscreen} onQualifiedListening={onQualifiedListening} claimManualPlay={claimManualPlay} screenReader={screenReaderEnabled} /> : <>
      <Pressable accessibilityRole="button" accessibilityLabel="Play video in this post" style={styles.center} onPress={event => {
        event.stopPropagation(); manualPlayRequested.current = true; setRequested(true); visibility.requestPlay();
      }}><MaterialIcons name="play-circle-outline" size={48} color={theme.colors.text} /></Pressable>
    </>}
  </View>;
}

function InlinePlayer({ uri, onFullscreen, onQualifiedListening, claimManualPlay, screenReader }: Pick<Props, 'uri' | 'onFullscreen' | 'onQualifiedListening'> & { claimManualPlay: () => boolean; screenReader: boolean }) {
  const listening = useRef(onQualifiedListening);
  listening.current = onQualifiedListening;
  const qualification = useRef(new AudioProgressQualification());
  useEffect(() => { qualification.current.reset(); }, [onQualifiedListening]);
  const { pause, isPlaying: musicPlaying, isBuffering, currentTrack } = usePlayback();
  const musicActive = musicPlaying || isBuffering;
  const musicTrackKey = `${currentTrack?.id ?? ''}:${currentTrack?.url ?? ''}`;
  const previousMusic = useRef({ playing: musicActive, trackKey: musicTrackKey });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const [controlInteraction, setControlInteraction] = useState(0);
  const musicState = useRef(musicActive);
  musicState.current = musicActive;
  const userMuted = useInlineVideoSoundPreference(state => state.muted);
  const automaticAudio = useRef(true);
  const manualPlay = useRef<boolean | null>(null);
  const alive = useRef(true);
  const soundRequest = useRef(0);
  const seekWidth = useRef(0);
  const replacement = useRef<Promise<void>>(Promise.resolve());
  const player = useVideoPlayer(null, instance => {
    instance.muted = true;
    setInlineVideoPrimaryAudioProtection(instance, musicState.current);
    setInlineVideoAutomaticAudio(instance, true);
    instance.audioMixingMode = 'mixWithOthers';
    instance.loop = true;
    instance.staysActiveInBackground = false;
    instance.showNowPlayingNotification = false;
    instance.keepScreenOnWhilePlaying = false;
    instance.timeUpdateEventInterval = 0.5;
  });
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; soundRequest.current++; };
  }, []);
  useEffect(() => {
    if (manualPlay.current === null) manualPlay.current = claimManualPlay();
    const request = ++soundRequest.current;
    const controller = new AbortController();
    let current = true;
    setStatus('loading');
    const postId = musicPostId(uri);
    // Preserve the full-screen viewer's authorised music-video resolver.
    void (async () => {
      await hydrateInlineVideoSoundPreference();
      if (!current) return;
      const source = postId ? await musicPlayback(postId, controller.signal) : uri;
      if (!current) return;
      const work = replacement.current.catch(() => undefined).then(async () => {
        if (current) await player.replaceAsync(source);
      });
      replacement.current = work;
      await work;
      if (!current) return;
      if (request === soundRequest.current && !useInlineVideoSoundPreference.getState().muted) {
        if (manualPlay.current) {
          if (musicState.current) await pause();
          if (!current) return;
          if (request === soundRequest.current && !useInlineVideoSoundPreference.getState().muted) {
            automaticAudio.current = false; setInlineVideoAutomaticAudio(player, false);
            player.audioMixingMode = 'doNotMix'; player.muted = false; setMuted(false);
          }
        }
      }
      if (automaticAudio.current) {
        setInlineVideoPrimaryAudioProtection(player, musicState.current);
        const audible = await playInlineVideoAutomatic(player,
          request === soundRequest.current && !useInlineVideoSoundPreference.getState().muted && !musicState.current);
        if (!current) return;
        if (request !== soundRequest.current || useInlineVideoSoundPreference.getState().muted || musicState.current) {
          player.muted = true; setMuted(true);
        } else { setMuted(!audible); }
        return;
      }
      player.play();
    })().catch(() => { if (current) setStatus('error'); });
    const statusSub = player.addListener('statusChange', event => {
      if (!current) return;
      if (event.status === 'readyToPlay') { setStatus('ready'); setDuration(Number.isFinite(player.duration) ? player.duration : 0); }
      if (event.status === 'error') setStatus('error');
    });
    const playingSub = player.addListener('playingChange', event => { if (current) setPlaying(event.isPlaying); });
    const timeSub = player.addListener('timeUpdate', event => {
      if (!current) return;
      setPosition(event.currentTime);
      if (!listening.current) return;
      const elapsed = qualification.current.sample(uri, event.currentTime, player.playing, player.muted ? 0 : player.volume, true);
      if (elapsed >= 10_000) listening.current(elapsed);
    });
    const mutedSub = player.addListener('mutedChange', event => { if (current) setMuted(event.muted); });
    return () => { current = false; qualification.current.reset(); controller.abort(); statusSub.remove(); playingSub.remove(); timeSub.remove(); mutedSub.remove(); };
  }, [uri, retry, player, pause, claimManualPlay]);
  useEffect(() => {
    const started = musicActive && (!previousMusic.current.playing || previousMusic.current.trackKey !== musicTrackKey);
    previousMusic.current = { playing: musicActive, trackKey: musicTrackKey };
    setInlineVideoPrimaryAudioProtection(player, musicActive);
    if (!musicActive) return;
    if (started) soundRequest.current++;
    player.muted = true;
    automaticAudio.current = true; setInlineVideoAutomaticAudio(player, true);
    player.audioMixingMode = 'mixWithOthers';
    setMuted(true); setBusy(false);
  }, [musicActive, musicTrackKey, player]);
  useEffect(() => {
    if (status !== 'error') return;
    soundRequest.current++;
    player.muted = true;
    automaticAudio.current = true; setInlineVideoAutomaticAudio(player, true);
    player.audioMixingMode = 'mixWithOthers';
    setMuted(true); setBusy(false); player.pause();
  }, [status, player]);
  useEffect(() => {
    if (!controlsVisible || !playing || screenReader) return;
    const timer = setTimeout(() => setControlsVisible(false), 3000);
    return () => clearTimeout(timer);
  }, [controlsVisible, controlInteraction, playing, screenReader]);
  useEffect(() => {
    if (!userMuted) return;
    soundRequest.current++;
    player.muted = true; setMuted(true);
    automaticAudio.current = true; setInlineVideoAutomaticAudio(player, true);
    player.audioMixingMode = 'mixWithOthers';
  }, [userMuted, player]);
  const revealControls = () => { setControlsVisible(true); setControlInteraction(value => value + 1); };
  const enableSound = async () => {
    void setInlineVideoUserMuted(false);
    const request = ++soundRequest.current;
    setBusy(true);
    try {
      if (musicState.current) await pause();
      if (!alive.current || request !== soundRequest.current || useInlineVideoSoundPreference.getState().muted) return;
      automaticAudio.current = false; setInlineVideoAutomaticAudio(player, false);
      player.audioMixingMode = 'doNotMix'; player.muted = false; setMuted(false);
    } catch {
      if (alive.current && request === soundRequest.current) setStatus('error');
    } finally {
      if (alive.current && request === soundRequest.current) setBusy(false);
    }
  };
  const toggleSound = () => {
    if (!muted) {
      void setInlineVideoUserMuted(true);
      soundRequest.current++;
      player.muted = true; setMuted(true);
      automaticAudio.current = true; setInlineVideoAutomaticAudio(player, true);
      player.audioMixingMode = 'mixWithOthers';
    } else { void enableSound(); }
  };
  const requestVideoSound = () => {
    if (!useInlineVideoSoundPreference.getState().muted && (muted || automaticAudio.current)) void enableSound();
  };
  const resumeVideo = () => {
    revealControls();
    if (useInlineVideoSoundPreference.getState().muted) {
      const request = ++soundRequest.current;
      setInlineVideoPrimaryAudioProtection(player, musicState.current);
      void playInlineVideoAutomatic(player, false).catch(() => {
        if (alive.current && request === soundRequest.current) setStatus('error');
      });
    } else {
      player.play(); requestVideoSound();
    }
  };
  const seek = (seconds: number) => { player.currentTime = Math.max(0, Math.min(duration, seconds)); setPosition(player.currentTime); };
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const showControls = status === 'ready' && (screenReader || !playing || controlsVisible);
  return <View style={StyleSheet.absoluteFill}>
    <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="contain" allowsPictureInPicture={false} />
    {status === 'ready' ? <Pressable accessible={!screenReader} accessibilityRole="button" accessibilityLabel={!playing ? 'Play video' : showControls ? 'Hide video controls' : 'Show video controls'} style={StyleSheet.absoluteFill} onPress={event => {
      event.stopPropagation();
      if (!playing) {
        resumeVideo();
      } else if (controlsVisible) setControlsVisible(false);
      else {
        revealControls();
        requestVideoSound();
      }
    }} /> : null}
    {status === 'ready' && !showControls ? <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Turn video sound on' : 'Mute video'} accessibilityState={{ busy }} disabled={busy} style={styles.muteCorner} onPress={event => { event.stopPropagation(); toggleSound(); }}>
      <MaterialIcons name={muted ? 'volume-off' : 'volume-up'} size={22} color="#FFFFFF" />
    </Pressable> : null}
    {status === 'loading' ? <View pointerEvents="none" style={styles.center}><ActivityIndicator color="#FFFFFF" accessibilityLabel="Loading video" /></View> : null}
    {status === 'error' ? <View style={styles.error}>
      <Text accessibilityRole="alert" style={styles.errorText}>This video couldn’t be played.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Retry video playback" style={styles.retry} onPress={event => { event.stopPropagation(); player.pause(); setRetry(value => value + 1); }}><Text style={styles.errorText}>Try again</Text></Pressable>
    </View> : showControls ? <View style={styles.controls}>
      <View style={styles.controlRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause video' : 'Play video'} disabled={status !== 'ready'} style={styles.button} onPress={event => { event.stopPropagation(); revealControls(); if (playing) { soundRequest.current++; player.pause(); } else { resumeVideo(); } }}><MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={25} color="#FFFFFF" /></Pressable>
        <Text style={styles.time}>{clock(position)} / {clock(duration)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Turn video sound on' : 'Mute video'} accessibilityState={{ busy }} disabled={busy || status !== 'ready'} style={styles.button} onPress={event => { event.stopPropagation(); revealControls(); void toggleSound(); }}><MaterialIcons name={muted ? 'volume-off' : 'volume-up'} size={22} color="#FFFFFF" /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open video full screen" style={styles.button} onPress={event => { event.stopPropagation(); player.pause(); onFullscreen(); }}><MaterialIcons name="fullscreen" size={25} color="#FFFFFF" /></Pressable>
      </View>
      <Pressable accessibilityRole="adjustable" accessibilityLabel="Video position" accessibilityValue={{ min: 0, max: Math.ceil(duration), now: Math.floor(position), text: `${clock(position)} of ${clock(duration)}` }} accessibilityActions={[{ name: 'increment', label: 'Forward ten seconds' }, { name: 'decrement', label: 'Back ten seconds' }]} onAccessibilityAction={event => { revealControls(); seek(position + (event.nativeEvent.actionName === 'increment' ? 10 : -10)); }} style={styles.seekTouch} onLayout={event => { seekWidth.current = event.nativeEvent.layout.width; }} onPress={event => { event.stopPropagation(); revealControls(); if (duration > 0 && seekWidth.current > 24) seek(duration * Math.max(0, Math.min(1, (event.nativeEvent.locationX - 12) / (seekWidth.current - 24)))); }}>
        <View style={styles.seekTrack}><View style={[styles.seekProgress, { width: `${duration > 0 ? Math.min(100, position / duration * 100) : 0}%` }]} /></View>
      </Pressable>
    </View> : null}
  </View>;
}

const styles = StyleSheet.create({
  frame: { aspectRatio: 16 / 10, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  error: { ...StyleSheet.absoluteFillObject, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  errorText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiMedium, textAlign: 'center', fontSize: 13 },
  retry: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 22, backgroundColor: '#333333' },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.72)' },
  muteCorner: { position: 'absolute', right: 8, bottom: 8, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', justifyContent: 'center' },
  controlRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  button: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  time: { flex: 1, color: '#FFFFFF', fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, fontVariant: ['tabular-nums'] },
  seekTouch: { height: 44, paddingHorizontal: 12, justifyContent: 'center',  },
  seekTrack: { height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.4)' },
  seekProgress: { height: 3, backgroundColor: '#FF6600' },
});
