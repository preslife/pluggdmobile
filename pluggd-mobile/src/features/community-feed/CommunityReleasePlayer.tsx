import { MaterialIcons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';
import * as WebBrowser from 'expo-web-browser';
import { useRouter } from 'expo-router';
import { PluggdImage } from '../../components/PluggdImage';
import { useAuth } from '../../context/AuthProvider';
import { usePlayback } from '../../context/PlaybackProvider';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { pluggdFonts } from '../../design/typography';
import { loadPostReleaseQueue } from './releasePostPlayback';
import { nativePlaybackIntent } from '../playback/nativePlaybackControl';
import { releaseAccessRecoveryUrl } from '../playback/releaseAgeAccess';

type Props = { releaseId: string; title: string; artist?: string | null; image?: string | null };

export function CommunityReleasePlayer(props: Props) {
  const { session } = useAuth();
  const context = useRef({ token: session?.access_token, revision: 0 });
  if (context.current.token !== session?.access_token) context.current = { token: session?.access_token, revision: context.current.revision + 1 };
  return <ReleasePlayer key={`${props.releaseId}:${context.current.revision}`} {...props} />;
}

function ReleasePlayer({ releaseId, title, artist, image }: Props) {
  const theme = usePluggdTheme();
  const router = useRouter();
  const { currentTrack, isPlaying, isBuffering, playQueue, togglePlayPause } = usePlayback();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [recoveryUrl, setRecoveryUrl] = useState<string | null>(null);
  const [canonicalId, setCanonicalId] = useState(releaseId);
  const pending = useRef<AbortController | null>(null);
  const mounted = useRef(true);
  const active = currentTrack?.releaseId === canonicalId;
  const playback = useRef({ currentTrack, togglePlayPause });
  playback.current = { currentTrack, togglePlayPause };
  useEffect(() => {
    mounted.current = true;
    return () => { mounted.current = false; pending.current?.abort(); };
  }, []);
  const play = async () => {
    if (pending.current || busy) return;
    const request = new AbortController();
    const intent = nativePlaybackIntent();
    pending.current = request;
    setBusy(true); setError(''); setRecoveryUrl(null);
    try {
      if (active) await togglePlayPause();
      else {
        const queue = await loadPostReleaseQueue(releaseId, request.signal);
        if (!mounted.current || request.signal.aborted) return;
        if (nativePlaybackIntent() !== intent) return;
        const resolvedId = queue[0]?.releaseId;
        if (!resolvedId) throw new Error('This release is unavailable.');
        setCanonicalId(resolvedId);
        if (playback.current.currentTrack?.releaseId === resolvedId) { await playback.current.togglePlayPause(); return; }
        const started = await playQueue(queue, 0);
        if (mounted.current && !request.signal.aborted && started?.releaseId !== resolvedId) {
          throw new Error('This release did not start. Please try again.');
        }
      }
    } catch (cause) {
      if (mounted.current && !request.signal.aborted) {
        setError(cause instanceof Error ? cause.message : 'Playback could not start. Please try again.');
        setRecoveryUrl(releaseAccessRecoveryUrl(cause));
      }
    } finally {
      if (pending.current === request) pending.current = null;
      if (mounted.current) setBusy(false);
    }
  };
  return <View style={[styles.card, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
    <View style={styles.row}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open release ${title}`} style={styles.details} onPress={event => {
        event.stopPropagation(); router.push(`/release/${releaseId}` as any);
      }}>
        {image ? <PluggdImage uri={image} style={styles.art} /> : <View style={[styles.art, styles.fallback, { backgroundColor: theme.colors.artworkBase }]}><MaterialIcons name="album" size={24} color={theme.colors.textMuted} /></View>}
        <View style={styles.copy}><Text style={[styles.label, { color: theme.colors.accentText }]}>PLUGGD RELEASE</Text>
          <Text style={[styles.title, { color: theme.colors.text }]} numberOfLines={2}>{title}</Text>
          {artist ? <Text style={[styles.artist, { color: theme.colors.textMuted }]} numberOfLines={1}>{artist}</Text> : null}
        </View>
      </Pressable>
      <Pressable accessibilityRole="button" accessibilityLabel={`${active && isPlaying ? 'Pause' : error ? 'Retry playing' : 'Play'} ${title}`}
        accessibilityState={{ busy: busy || (active && isBuffering), disabled: busy }} disabled={busy}
        style={[styles.play, { backgroundColor: theme.colors.accentFill }]} onPress={event => { event.stopPropagation(); void play(); }}>
        {busy || (active && isBuffering) ? <ActivityIndicator color={theme.colors.onAccent} /> : <MaterialIcons name={active && isPlaying ? 'pause' : 'play-arrow'} size={26} color={theme.colors.onAccent} />}
      </Pressable>
    </View>
    {error ? <Text accessibilityRole="alert" style={[styles.error, { color: theme.colors.textMuted }]}>{error}</Text> : null}
    {recoveryUrl ? <Pressable accessibilityRole="link" accessibilityLabel="Open PLUGGD account settings on the web" style={{ minHeight: 44, justifyContent: 'center' }} onPress={event => {
      event.stopPropagation();
      void WebBrowser.openBrowserAsync(recoveryUrl).catch(() => { if (mounted.current) setError('Open pluggd.fm in your browser, then Dashboard → Settings → Account → Optional personal details.'); });
    }}><Text style={{ color: theme.colors.accentText, fontFamily: pluggdFonts.satoshiBold }}>Open account on web</Text></Pressable> : null}
  </View>;
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 16, padding: 12, marginTop: 10 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  details: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 56 },
  art: { width: 56, height: 56, borderRadius: 10 }, fallback: { alignItems: 'center', justifyContent: 'center' },
  copy: { flex: 1, minWidth: 0 }, label: { fontSize: 10, fontFamily: pluggdFonts.satoshiBold, letterSpacing: 1 },
  title: { fontSize: 15, lineHeight: 20, fontFamily: pluggdFonts.satoshiBold, marginTop: 3 },
  artist: { fontSize: 12, lineHeight: 18, marginTop: 2 },
  play: { width: 48, minHeight: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 13, lineHeight: 19, marginTop: 10 },
});
