import { MaterialIcons } from '@expo/vector-icons';
import { VideoView, useVideoPlayer } from 'expo-video';
import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback } from '../../context/PlaybackProvider';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { pluggdFonts } from '../../design/typography';
import { musicPostId } from '../social-music/model';
import { musicPlayback } from '../social-music/service';
import { useInlineVideoVisibility } from './useInlineVideoVisibility';

type Props = { uri: string; blocked: boolean; onFullscreen: () => void };

export function MobileSocialInlineVideo(props: Props) {
  const { user, session } = useAuth();
  const context = useRef({ actor: user?.id, token: session?.access_token, revision: 0 });
  if (context.current.actor !== user?.id || context.current.token !== session?.access_token) {
    context.current = { actor: user?.id, token: session?.access_token, revision: context.current.revision + 1 };
  }
  // Release private URLs and native playback immediately on identity/source changes.
  return <InlineVideo key={`${context.current.revision}:${props.uri}`} {...props} />;
}

function InlineVideo({ uri, blocked, onFullscreen }: Props) {
  const theme = usePluggdTheme();
  const visibility = useInlineVideoVisibility(blocked);
  const [autoplay, setAutoplay] = useState(false);
  const [requested, setRequested] = useState(false);
  useEffect(() => {
    let live = true;
    let reduce = true;
    let reader = true;
    const update = () => { if (live) setAutoplay(!reduce && !reader); };
    void Promise.all([AccessibilityInfo.isReduceMotionEnabled(), AccessibilityInfo.isScreenReaderEnabled()]).then(([motion, screenReader]) => {
      reduce = motion; reader = screenReader; update();
    }).catch(() => undefined);
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', enabled => { reduce = enabled; update(); });
    const screenReader = AccessibilityInfo.addEventListener('screenReaderChanged', enabled => { reader = enabled; update(); });
    return () => { live = false; motion.remove(); screenReader.remove(); };
  }, []);
  return <View ref={visibility.view} collapsable={false} style={[styles.frame, { backgroundColor: theme.colors.artworkBase }]}>
    {visibility.active && (autoplay || requested) ? <InlinePlayer uri={uri} onFullscreen={onFullscreen} /> : <>
      <Pressable accessibilityRole="button" accessibilityLabel="Play video in this post" style={styles.center} onPress={event => {
        event.stopPropagation(); setRequested(true); visibility.requestPlay();
      }}><MaterialIcons name="play-circle-outline" size={48} color={theme.colors.text} /></Pressable>
    </>}
  </View>;
}

function InlinePlayer({ uri, onFullscreen }: Pick<Props, 'uri' | 'onFullscreen'>) {
  const { pause, isPlaying: musicPlaying } = usePlayback();
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(true);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [retry, setRetry] = useState(0);
  const [busy, setBusy] = useState(false);
  const alive = useRef(true);
  const soundRequest = useRef(0);
  const seekWidth = useRef(0);
  const replacement = useRef<Promise<void>>(Promise.resolve());
  const player = useVideoPlayer(null, instance => {
    instance.muted = true;
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
    const controller = new AbortController();
    let current = true;
    setStatus('loading');
    const postId = musicPostId(uri);
    // Preserve the full-screen viewer's authorised music-video resolver.
    void (async () => {
      const source = postId ? await musicPlayback(postId, controller.signal) : uri;
      if (!current) return;
      const work = replacement.current.catch(() => undefined).then(async () => {
        if (current) await player.replaceAsync(source);
      });
      replacement.current = work;
      await work;
      if (current) player.play();
    })().catch(() => { if (current) setStatus('error'); });
    const statusSub = player.addListener('statusChange', event => {
      if (!current) return;
      if (event.status === 'readyToPlay') { setStatus('ready'); setDuration(Number.isFinite(player.duration) ? player.duration : 0); }
      if (event.status === 'error') setStatus('error');
    });
    const playingSub = player.addListener('playingChange', event => { if (current) setPlaying(event.isPlaying); });
    const timeSub = player.addListener('timeUpdate', event => { if (current) setPosition(event.currentTime); });
    return () => { current = false; controller.abort(); statusSub.remove(); playingSub.remove(); timeSub.remove(); };
  }, [uri, retry, player]);
  useEffect(() => {
    if (musicPlaying || status === 'error') {
      soundRequest.current++;
      player.muted = true;
      player.audioMixingMode = 'mixWithOthers';
      setMuted(true); setBusy(false);
      if (status === 'error') player.pause();
    }
  }, [musicPlaying, status, player]);
  const toggleSound = async () => {
    if (!muted) {
      soundRequest.current++;
      player.muted = true; player.audioMixingMode = 'mixWithOthers'; setMuted(true);
      return;
    }
    const request = ++soundRequest.current;
    setBusy(true);
    try {
      await pause();
      if (!alive.current || request !== soundRequest.current) return;
      player.audioMixingMode = 'doNotMix'; player.muted = false; setMuted(false);
    } catch {
      if (alive.current && request === soundRequest.current) setStatus('error');
    } finally {
      if (alive.current && request === soundRequest.current) setBusy(false);
    }
  };
  const seek = (seconds: number) => { player.currentTime = Math.max(0, Math.min(duration, seconds)); setPosition(player.currentTime); };
  const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  return <View style={StyleSheet.absoluteFill}>
    <VideoView player={player} style={StyleSheet.absoluteFill} nativeControls={false} contentFit="contain" allowsPictureInPicture={false} />
    {status === 'loading' ? <View pointerEvents="none" style={styles.center}><ActivityIndicator color="#FFFFFF" accessibilityLabel="Loading video" /></View> : null}
    {status === 'error' ? <View style={styles.error}>
      <Text accessibilityRole="alert" style={styles.errorText}>This video couldn’t be played.</Text>
      <Pressable accessibilityRole="button" accessibilityLabel="Retry video playback" style={styles.retry} onPress={event => { event.stopPropagation(); player.pause(); setRetry(value => value + 1); }}><Text style={styles.errorText}>Try again</Text></Pressable>
    </View> : <View style={styles.controls}>
      <View style={styles.controlRow}>
        <Pressable accessibilityRole="button" accessibilityLabel={playing ? 'Pause video' : 'Play video'} disabled={status !== 'ready'} style={styles.button} onPress={event => { event.stopPropagation(); playing ? player.pause() : player.play(); }}><MaterialIcons name={playing ? 'pause' : 'play-arrow'} size={25} color="#FFFFFF" /></Pressable>
        <Text style={styles.time}>{clock(position)} / {clock(duration)}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={muted ? 'Turn video sound on' : 'Mute video'} accessibilityState={{ busy }} disabled={busy || status !== 'ready'} style={styles.button} onPress={event => { event.stopPropagation(); void toggleSound(); }}><MaterialIcons name={muted ? 'volume-off' : 'volume-up'} size={22} color="#FFFFFF" /></Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Open video full screen" style={styles.button} onPress={event => { event.stopPropagation(); player.pause(); onFullscreen(); }}><MaterialIcons name="fullscreen" size={25} color="#FFFFFF" /></Pressable>
      </View>
      <Pressable accessibilityRole="adjustable" accessibilityLabel="Video position" accessibilityValue={{ min: 0, max: Math.ceil(duration), now: Math.floor(position), text: `${clock(position)} of ${clock(duration)}` }} accessibilityActions={[{ name: 'increment', label: 'Forward ten seconds' }, { name: 'decrement', label: 'Back ten seconds' }]} onAccessibilityAction={event => seek(position + (event.nativeEvent.actionName === 'increment' ? 10 : -10))} style={styles.seekTouch} onLayout={event => { seekWidth.current = event.nativeEvent.layout.width; }} onPress={event => { event.stopPropagation(); if (duration > 0 && seekWidth.current > 24) seek(duration * Math.max(0, Math.min(1, (event.nativeEvent.locationX - 12) / (seekWidth.current - 24)))); }}>
        <View style={styles.seekTrack}><View style={[styles.seekProgress, { width: `${duration > 0 ? Math.min(100, position / duration * 100) : 0}%` }]} /></View>
      </Pressable>
    </View>}
  </View>;
}

const styles = StyleSheet.create({
  frame: { aspectRatio: 16 / 10, borderRadius: 14, overflow: 'hidden', alignItems: 'center', justifyContent: 'center', marginTop: 12 },
  center: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  error: { ...StyleSheet.absoluteFillObject, backgroundColor: '#121212', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 16 },
  errorText: { color: '#FFFFFF', fontFamily: pluggdFonts.satoshiMedium, textAlign: 'center', fontSize: 13 },
  retry: { minHeight: 44, paddingHorizontal: 20, justifyContent: 'center', borderRadius: 22, backgroundColor: '#333333' },
  controls: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: 'rgba(0,0,0,0.72)' },
  controlRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 4 },
  button: { width: 44, height: 44, justifyContent: 'center', alignItems: 'center' },
  time: { flex: 1, color: '#FFFFFF', fontFamily: pluggdFonts.satoshiMedium, fontSize: 11, fontVariant: ['tabular-nums'] },
  seekTouch: { height: 44, paddingHorizontal: 12, justifyContent: 'center',  },
  seekTrack: { height: 3, borderRadius: 2, overflow: 'hidden', backgroundColor: 'rgba(255,255,255,0.4)' },
  seekProgress: { height: 3, backgroundColor: '#FF6600' },
});
