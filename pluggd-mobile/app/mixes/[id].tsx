import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Alert, Linking, Share, View } from 'react-native';
import { RecoveryState } from '../../components/ContentUI';
import { usePlayback } from '../../src/context/PlaybackProvider';
import { useListeningRoomOrientation } from '../../src/lib/orientation';
import { getCurrentUserId } from '../../src/features/culture/mobileServices';
import { supabase } from '../../src/lib/supabase';
import { formatDuration } from '../../src/lib/mobileContent';
import { usePluggdTheme } from '../../src/design/usePluggdTheme';
import { mixAccessSession } from '../../src/features/playback/mixAccessSession';
import { nativeMixTrack } from '../../src/features/playback/protectedMixPlayback';
import { nativeMixDownload } from '../../src/features/playback/nativeMixDetail';
import { useMixSessionIdentity, useNativeMixDetail } from '../../src/features/playback/useNativeMixDetail';
import { currentNativePlaybackIntent, nativePlaybackIntent } from '../../src/features/playback/nativePlaybackControl';
import { ListeningRoomScreen } from '../../src/features/listeningRoom/ListeningRoomScreen';
import { roomViewState, createRoomSeekQueue } from '../../src/features/listeningRoom/roomViewState';
import { useMixSocial } from '../../src/features/listeningRoom/useMixSocial';

const MIX_STARTING_FEEDBACK_MS = 350;

type MixCommentRow = {
  id: string;
  mix_id: string;
  user_id: string;
  body: string | null;
  timestamp_seconds: number | null;
  created_at: string;
};

type TrackIdRequestRow = {
  id: string;
  mix_id: string;
  user_id: string;
  timestamp_seconds: number;
  note: string | null;
  status: 'open' | 'resolved' | 'dismissed';
  matched_tracklist_item_id: string | null;
  created_at: string;
  updated_at: string;
};

export default function MixDetailScreen() {
  const params = useLocalSearchParams<{ id?: string | string[]; access?: string | string[] }>();
  const identity = useMixSessionIdentity();
  const reference = typeof params.id === 'string' ? params.id : Array.isArray(params.id) && params.id.length === 1 ? params.id[0] : '';
  const accessKey = typeof params.access === 'string' ? params.access : params.access === undefined ? undefined : 'invalid';
  return <MixDetailContent key={`${identity.key}|${reference}|${accessKey ?? ''}`} reference={reference} accessKey={accessKey} />;
}

function MixDetailContent({ reference, accessKey }: { reference: string; accessKey?: string }) {
  const theme = usePluggdTheme();
  const identity = useMixSessionIdentity();
  const router = useRouter();
  const { playTrack, pause, seekTo, currentTrack, isPlaying, togglePlayPause, progress } = usePlayback();
  const detailState = useNativeMixDetail(reference, accessKey);
  const envelope = detailState.detail;
  const mix = envelope?.mix ?? null;
  const tracklist = envelope?.tracklist ?? [];
  const loading = detailState.phase === 'loading';
  const publicMix = envelope?.public === true;
  const current = useRef(detailState.isCurrent);
  current.current = detailState.isCurrent;
  const currentPublic = useRef(publicMix);
  currentPublic.current = publicMix;
  const alive = useRef(true);
  useEffect(() => { alive.current = true; return () => { alive.current = false; }; }, []);
  // Turning the phone sideways enters the wide listening-room layout.
  useListeningRoomOrientation();
  const [startingPlayback, setStartingPlayback] = useState(false);
  const [playbackError, setPlaybackError] = useState<string | null>(null);
  const [comments, setComments] = useState<MixCommentRow[]>([]);
  const [trackIdRequests, setTrackIdRequests] = useState<TrackIdRequestRow[]>([]);
  const [profileNames, setProfileNames] = useState<Record<string, string>>({});
  const [commentValue, setCommentValue] = useState('');
  const [commentBusy, setCommentBusy] = useState(false);
  const [requestBusy, setRequestBusy] = useState(false);
  const [roomDataError, setRoomDataError] = useState<string | null>(null);
  const [socialRetry, setSocialRetry] = useState(0);
  const [downloading, setDownloading] = useState(false);

  useEffect(() => {
    setComments([]); setTrackIdRequests([]); setProfileNames({}); setRoomDataError(null);
    if (!mix || !publicMix || !current.current()) return;
    let mounted = true;
    const scope = mixAccessSession.scope();
    const active = () => mounted && mixAccessSession.current(scope) && current.current() && currentPublic.current;
    const load = async () => {
      try {
        const [commentRes, requestRes] = await Promise.all([
          (supabase as any).from('mix_comments').select('id,mix_id,user_id,body,timestamp_seconds,created_at')
            .eq('mix_id', mix.id).order('created_at', { ascending: false }).limit(60),
          (supabase as any).from('mix_track_id_requests').select('id,mix_id,user_id,timestamp_seconds,note,status,matched_tracklist_item_id,created_at,updated_at')
            .eq('mix_id', mix.id).order('created_at', { ascending: false }).limit(40),
        ]);
        if (!active()) return;
        const commentRows = !commentRes.error && Array.isArray(commentRes.data) ? commentRes.data as MixCommentRow[] : [];
        const requestRows = !requestRes.error && Array.isArray(requestRes.data) ? requestRes.data as TrackIdRequestRow[] : [];
        setComments(commentRows); setTrackIdRequests(requestRows);
        const ids = Array.from(new Set([...commentRows.map(row => row.user_id), ...requestRows.map(row => row.user_id)].filter(Boolean)));
        let profileError = false;
        if (ids.length) {
          const profileRes = await (supabase as any).from('profiles').select('user_id,username,full_name').in('user_id', ids);
          if (!active()) return;
          profileError = Boolean(profileRes.error);
          if (Array.isArray(profileRes.data)) setProfileNames(Object.fromEntries(profileRes.data.map((profile: any) => [profile.user_id,
            (typeof profile.full_name === 'string' && profile.full_name.trim()) || (typeof profile.username === 'string' && profile.username.trim()) || 'PLUGGD listener'])));
        }
        if (active()) setRoomDataError(commentRes.error || requestRes.error || profileError ? 'Some room activity could not load. Audio and tracklist remain available.' : null);
      } catch { if (active()) setRoomDataError('Room activity could not load. Audio and tracklist remain available.'); }
    };
    void load();
    return () => { mounted = false; };
  }, [mix?.id, publicMix, socialRetry]);

  const active = () => alive.current && current.current();
  const activePublic = () => active() && currentPublic.current;
  const playMix = async (openFullPlayer = false, startAt = 0) => {
    if (!envelope || startingPlayback || !active()) return null;
    const startedAt = Date.now();
    setPlaybackError(null);
    setStartingPlayback(true);
    let ticket: number | undefined;
    const feedback = async () => {
      const remaining = MIX_STARTING_FEEDBACK_MS - (Date.now() - startedAt);
      if (remaining > 0) await new Promise(resolve => setTimeout(resolve, remaining));
    };
    try {
      const pending = playTrack(nativeMixTrack(envelope), startAt);
      ticket = nativePlaybackIntent();
      const selected = await pending;
      await feedback();
      if (!active() || !currentNativePlaybackIntent(ticket)) return null;
      if (!selected || selected.mixId !== envelope.mix.id) throw new Error('Mix unavailable');
      if (openFullPlayer) router.push('/player');
      return selected;
    } catch {
      await feedback();
      if (!active() || (ticket !== undefined && !currentNativePlaybackIntent(ticket))) return null;
      const message = 'This mix could not start. Check your connection, then tap Play mix to try again.';
      setPlaybackError(message);
      return null;
    } finally { if (alive.current) setStartingPlayback(false); }
  };

  const social = useMixSocial(mix?.id, publicMix);
  const changeSocial = async (kind: 'like' | 'save') => {
    if (!activePublic() || social.busy) return;
    const scope = mixAccessSession.scope();
    if (!scope.actor) { Alert.alert('Sign in required', 'Sign in to Like or Save a mix.'); return; }
    try { await (kind === 'like' ? social.toggleLike() : social.toggleSave()); }
    catch { if (activePublic() && mixAccessSession.current(scope)) Alert.alert(kind === 'like' ? 'Like unavailable' : 'Save unavailable', 'Your choice could not be saved. Please try again.'); }
  };

  const shareMix = async () => {
    if (!mix || !activePublic()) return;
    try { await Share.share({ message: `PLUGGD mix: ${mix.title || 'Untitled mix'} https://pluggd.fm/mixes/${encodeURIComponent(mix.id)}` }); }
    catch { if (activePublic()) Alert.alert('Share unavailable', 'Please try sharing this mix again.'); }
  };

  const downloadMix = async () => {
    if (!envelope || downloading || !active() || (!envelope.owner && !mix?.allow_download)) return;
    const scope = mixAccessSession.scope();
    setDownloading(true);
    try {
      const result = await nativeMixDownload(envelope);
      if (!active() || !mixAccessSession.current(scope)) return;
      await Linking.openURL(result.url);
      if (active() && mixAccessSession.current(scope)) Alert.alert('Download opened', 'Complete the download in the window that opened.');
    } catch { if (active() && mixAccessSession.current(scope)) Alert.alert('Download unavailable', 'This download could not open. Check your access and connection, then try again.'); }
    finally { if (alive.current) setDownloading(false); }
  };
  const canDownload = Boolean(envelope && (envelope.owner || mix?.allow_download));
  const privacyLabel = publicMix ? '' : `${mix?.visibility === 'unlisted' ? 'Unlisted' : 'Private'} mix${mix?.status !== 'published' ? ' · Not published' : ''}`;
  const isThisMixPlaying = Boolean(mix && currentTrack?.mixId === mix.id);
  const roomDuration = Math.max(0, (isThisMixPlaying ? progress.duration : 0) || Number(mix?.duration_seconds ?? 0));
  const [selectedPosition, setSelectedPosition] = useState(0);
  const [restoredMix, setRestoredMix] = useState<string | null>(null);
  const [seekDraft, setSeekDraft] = useState<{ seconds: number; until: number } | null>(null);
  useEffect(() => {
    if (!mix || mixAccessSession.identityKey() !== identity.key) return;
    const restored = roomViewState.read(identity.key, mix.id);
    setSelectedPosition(restored.position); setCommentValue(restored.draft); setSeekDraft(null); setRestoredMix(mix.id);
  }, [identity.key, mix?.id]);
  useEffect(() => {
    if (mix && restoredMix === mix.id && mixAccessSession.identityKey() === identity.key) roomViewState.write(identity.key, mix.id, { draft: commentValue });
  }, [identity.key, mix?.id, commentValue, restoredMix]);
  useEffect(() => {
    if (!seekDraft) return;
    if (isThisMixPlaying && Math.abs(progress.position - seekDraft.seconds) < 1) { setSeekDraft(null); return; }
    const timer = setTimeout(() => setSeekDraft(null), Math.max(0, seekDraft.until - Date.now()));
    return () => clearTimeout(timer);
  }, [seekDraft, progress.position, isThisMixPlaying]);
  const roomPosition = Math.min(roomDuration || Infinity, Math.max(0, seekDraft?.seconds ?? (isThisMixPlaying ? progress.position : selectedPosition)));
  const roomSecond = Math.floor(roomPosition);
  const roomPlaying = Boolean(isThisMixPlaying && isPlaying);
  const tonearmEngaged = Boolean(isThisMixPlaying && (roomPlaying || (roomPosition > 0 && (roomDuration <= 0 || roomPosition < roomDuration - 1))));
  const latestPlayback = useRef({ isThisMixPlaying, seekTo, active });
  latestPlayback.current = { isThisMixPlaying, seekTo, active };
  const seekQueue = useMemo(() => {
    let expectedIntent: number | null = null;
    const scope = identity.ready ? mixAccessSession.scope() : null;
    const queue = createRoomSeekQueue({
      current: () => alive.current && scope !== null && mixAccessSession.current(scope) && latestPlayback.current.active() && latestPlayback.current.isThisMixPlaying && (expectedIntent === null || currentNativePlaybackIntent(expectedIntent)),
      seek: async seconds => {
        const pending = latestPlayback.current.seekTo(seconds);
        expectedIntent = nativePlaybackIntent();
        await pending;
      },
      failed: () => { setSeekDraft(null); setPlaybackError('The position could not be changed. Please try again.'); },
    });
    return {
      request: (seconds: number) => {
        if (!queue.busy) expectedIntent = nativePlaybackIntent();
        queue.request(seconds);
      },
      dispose: queue.dispose,
    };
  }, [identity.key, mix?.id]);
  useEffect(() => () => seekQueue.dispose(), [seekQueue]);
  const seekRoom = (seconds: number) => {
    if (!active() || !Number.isFinite(seconds) || roomDuration <= 0) return;
    const target = Math.max(0, Math.min(roomDuration, seconds));
    setPlaybackError(null); setSelectedPosition(target);
    if (isThisMixPlaying) { setSeekDraft({seconds:target,until:Date.now()+2000}); seekQueue.request(target); }
    // A different queued track is left alone until the listener explicitly presses Play.
  };
  const toggleRoomPlayback = async (startAt: number): Promise<boolean> => {
    if (!active() || startingPlayback) return false;
    try {
      if (isThisMixPlaying) { await togglePlayPause(); return active(); }
      return Boolean(await playMix(false, startAt));
    } catch { if (active()) setPlaybackError('Playback could not change. Please try again.'); return false; }
  };
  const stopRoomPlayback = async () => {
    if (!active()) return;
    setSelectedPosition(0); setSeekDraft(isThisMixPlaying ? {seconds:0,until:Date.now()+2000} : null);
    if (!isThisMixPlaying) return;
    try {
      const stopped = pause(); const ticket = nativePlaybackIntent(); await stopped;
      if (active() && currentNativePlaybackIntent(ticket)) await seekTo(0);
    } catch { if (active()) setPlaybackError('The mix could not stop. Please try again.'); }
  };
  const requestTrackId = async () => {
    if (!mix || requestBusy || !activePublic()) return;
    const scope = mixAccessSession.scope();
    setRequestBusy(true);
    try {
      const userId = await getCurrentUserId();
      if (!activePublic() || !mixAccessSession.current(scope)) return;
      if (!userId) { Alert.alert('Sign in required', 'Track ID requests require an account.'); return; }
      if (scope.actor !== userId) return;
      const { data, error } = await (supabase as any).from('mix_track_id_requests')
        .insert({ mix_id: mix.id, user_id: userId, timestamp_seconds: roomSecond, note: null })
        .select('id,mix_id,user_id,timestamp_seconds,note,status,matched_tracklist_item_id,created_at,updated_at').single();
      if (!activePublic() || !mixAccessSession.current(scope)) return;
      if (error || !data) throw new Error();
      setTrackIdRequests(rows => [data as TrackIdRequestRow, ...rows]);
      Alert.alert('Track ID requested', `Saved at ${formatDuration(roomSecond)}.`);
    } catch { if (activePublic() && mixAccessSession.current(scope)) Alert.alert('Track ID request failed', 'The request could not be saved. Please try again.'); }
    finally { if (alive.current) setRequestBusy(false); }
  };

  const postRoomComment = async () => {
    if (!mix || commentBusy || !activePublic()) return;
    const body = commentValue.trim();
    if (!body) return;
    const scope = mixAccessSession.scope();
    setCommentBusy(true);
    try {
      const userId = await getCurrentUserId();
      if (!activePublic() || !mixAccessSession.current(scope)) return;
      if (!userId) { Alert.alert('Sign in required', 'Listening Room comments require an account.'); return; }
      if (scope.actor !== userId) return;
      const { data, error } = await (supabase as any).from('mix_comments')
        .insert({ mix_id: mix.id, user_id: userId, body, timestamp_seconds: roomSecond })
        .select('id,mix_id,user_id,body,timestamp_seconds,created_at').single();
      if (!activePublic() || !mixAccessSession.current(scope)) return;
      if (error || !data) throw new Error();
      setComments(rows => [data as MixCommentRow, ...rows]);
      setProfileNames(names => ({ ...names, [userId]: names[userId] || 'You' }));
      setCommentValue(value => value.trim() === body ? '' : value);
    } catch { if (activePublic() && mixAccessSession.current(scope)) Alert.alert('Comment failed', 'The room comment could not be posted. Please try again.'); }
    finally { if (alive.current) setCommentBusy(false); }
  };

  return <View style={{flex:1,backgroundColor:theme.colors.background}}>
    <StatusBar style={theme.scheme === 'light' ? 'dark' : 'light'} />
    <Stack.Screen options={{headerShown:false}} />
    {mix && restoredMix === mix.id ? <ListeningRoomScreen key={`${identity.key}|${mix.id}`} sessionKey={identity.key} mix={mix} publicMix={publicMix} privacyLabel={privacyLabel}
      position={roomPosition} duration={roomDuration} playing={roomPlaying} engaged={tonearmEngaged}
      starting={startingPlayback} playbackError={playbackError}
      onToggle={toggleRoomPlayback} onStop={stopRoomPlayback} onSeek={seekRoom} isCurrent={active}
      onClose={() => router.canGoBack() ? router.back() : router.replace('/mixes' as any)}
      tracklist={tracklist} tracklistLoading={detailState.tracklistLoading} tracklistError={detailState.tracklistError} onRetryTracklist={() => void detailState.retryTracklist()}
      social={social} onLike={()=>void changeSocial('like')} onSave={()=>void changeSocial('save')} onShare={()=>void shareMix()}
      canDownload={canDownload} downloading={downloading} onDownload={()=>void downloadMix()}
      onPostToCommunity={()=>{if(activePublic())router.push({pathname:'/create-post',params:{attachmentType:'mix',mixId:mix.id,type:'post'}} as any);}}
      comments={comments} requests={trackIdRequests} profileNames={profileNames} roomDataError={roomDataError} onRetryRoom={()=>setSocialRetry(n=>n+1)}
      commentValue={commentValue} onCommentValue={setCommentValue} commentBusy={commentBusy} onComment={()=>void postRoomComment()} requestBusy={requestBusy} onRequestId={()=>void requestTrackId()}
    /> : loading || mix ? <View style={{flex:1,alignItems:'center',justifyContent:'center'}}><ActivityIndicator accessibilityLabel="Opening mix" color={theme.colors.accentFill}/></View> : <RecoveryState
      eyebrow={detailState.phase==='error'?'CONNECTION INTERRUPTED':'ROOM CLOSED'} title={detailState.phase==='error'?'This mix could not load':'This mix is unavailable'}
      body={detailState.phase==='error'?'Check your connection and try again.':'The link may have expired, or you may need access from the creator.'} icon="headphones"
      primaryLabel="Try again" onPrimary={()=>void detailState.retry()} secondaryLabel="Explore mixes" onSecondary={()=>router.replace('/mixes' as any)}/>
    }
  </View>;
}
