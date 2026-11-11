import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState, type ComponentProps } from 'react';
import { AccessibilityInfo, ActivityIndicator, AppState, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaybackSeekBar } from '../../components/PlaybackSeekBar';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { pluggdFonts as fonts } from '../../design/typography';
import { formatDuration, type MixItem, type MixTrackItem } from '../../lib/mobileContent';
import { mixAccessSession } from '../playback/mixAccessSession';
import { currentNativePlaybackIntent, nativePlaybackIntent } from '../playback/nativePlaybackControl';
import { ListeningDeck3D } from './ListeningDeck3D';
import { roomViewState, roomTimestamp, type RoomTab } from './roomViewState';
import type { useMixSocial } from './useMixSocial';

export type RoomComment = { id: string; user_id: string; body: string | null; timestamp_seconds: number | null };
export type RoomRequest = { id: string; user_id: string; timestamp_seconds: number; status: string };
type Icon = ComponentProps<typeof MaterialIcons>['name'];
type Props = {
  sessionKey: string; mix: MixItem; publicMix: boolean; privacyLabel: string;
  position: number; duration: number; playing: boolean; engaged: boolean; starting: boolean;
  playbackError: string | null; onToggle: (position: number) => Promise<boolean>; onStop: () => Promise<void>;
  onSeek: (seconds: number) => void; onClose: () => void; isCurrent: () => boolean;
  tracklist: MixTrackItem[]; tracklistLoading: boolean; tracklistError: boolean; onRetryTracklist: () => void;
  social: ReturnType<typeof useMixSocial>; onLike: () => void; onSave: () => void; onShare: () => void;
  canDownload: boolean; downloading: boolean; onDownload: () => void; onPostToCommunity: () => void;
  comments: RoomComment[]; requests: RoomRequest[]; profileNames: Record<string, string>;
  roomDataError: string | null; onRetryRoom: () => void;
  commentValue: string; onCommentValue: (value: string) => void; commentBusy: boolean; onComment: () => void;
  requestBusy: boolean; onRequestId: () => void;
};
/** The visual deck never owns audio. Explicit Play is the only path that starts
 * a new mix; a deck drag, chapter or seek bar preserves the paused state. */
export function ListeningRoomScreen(p: Props) {
  const theme = usePluggdTheme(); const c = theme.colors;
  const insets = useSafeAreaInsets(); const { width, height } = useWindowDimensions(); const wide = width >= 700; const compactWide = wide && width > height;
  const focused = useIsFocused();
  const initial = useRef(roomViewState.read(p.sessionKey, p.mix.id)).current;
  const [tab, setTab] = useState<RoomTab>(initial.tab);
  const [angle, setAngle] = useState(initial.angle);
  const [placed, setPlaced] = useState(initial.placed);
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const [reduced, setReduced] = useState(false);
  const [ready, setReady] = useState(false); const [deckError, setDeckError] = useState<string | null>(null);
  const [deckAttempt, setDeckAttempt] = useState(0);
  const [coverFailed, setCoverFailed] = useState(false);
  useEffect(() => setCoverFailed(false), [p.mix.id, p.mix.cover_url]);
  const [cue, setCue] = useState<number | null>(null);
  const deferredPlay = useRef<number | null>(null);
  const [waitingForDeck, setWaitingForDeck] = useState(false);
  const nextCue = useRef(0);
  const startGeneration = useRef(0);
  const [parkRequestId, setParkRequestId] = useState<number | null>(null);
  const pending = useRef<{ id: number; intent: number } | null>(null);
  const latest = useRef(p); latest.current = p;
  const visible = focused && foreground && tab === 'listen';
  const visibleNow = useRef(visible); visibleNow.current = visible;
  const styles = useMemo(() => StyleSheet.create({
    screen: { flex: 1, backgroundColor: c.background, paddingTop: insets.top },
    header: { paddingHorizontal: 16, paddingVertical: compactWide ? 0 : 6, flexDirection: 'row', alignItems: 'center', gap: 12 },
    icon: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center', borderRadius: 22 },
    head: { flex: 1 }, eyebrow: { fontFamily: fonts.satoshiBlack, color: c.accentText, fontSize: 10, letterSpacing: 1.6 },
    hint: { fontFamily: fonts.satoshiRegular, color: c.textMuted, fontSize: 12, lineHeight: 18 },
    title: { fontFamily: fonts.displayBold, color: c.text, fontSize: 24, lineHeight: 31 },
    subtitle: { fontFamily: fonts.satoshiMedium, color: c.textSecondary, fontSize: 13, lineHeight: 20 },
    body: { fontFamily: fonts.satoshiRegular, color: c.text, fontSize: 14, lineHeight: 22 },
    content: { paddingHorizontal: 16, paddingTop: compactWide ? 8 : 12, paddingBottom: insets.bottom + 28, maxWidth: 1040, width: '100%', alignSelf: 'center', gap: 18 },
    tabRow: { marginHorizontal: 16, flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.borderStrong },
    tab: { flex: 1, minHeight: compactWide ? 40 : 48, justifyContent: 'center', alignItems: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent' },
    tabText: { fontFamily: fonts.satoshiBold, fontSize: 14, color: c.textMuted },
    hero: { flexDirection: wide ? 'row' : 'column', alignItems: 'center', gap: 18 },
    deck: { width: compactWide ? Math.min((width - 50) * 0.6, Math.max(160, height - insets.top - insets.bottom - 110) * 1.55) : wide ? '60%' : '100%', minHeight: 160 },
    transport: { flex: 1, width: '100%', gap: compactWide ? 4 : 12 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
    cover: { width: 50, height: 50, borderRadius: 8, backgroundColor: c.surfaceAlt },
    controls: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 14 },
    play: { minWidth: compactWide ? 52 : 68, minHeight: compactWide ? 52 : 68, borderRadius: 34, backgroundColor: c.accentFill, justifyContent: 'center', alignItems: 'center' },
    action: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7, paddingHorizontal: 13, minHeight: 44, borderRadius: 22, borderWidth: 1, borderColor: c.borderStrong },
    actionText: { fontFamily: fonts.satoshiBold, fontSize: 13, color: c.text },
    panel: { padding: 16, gap: 12, borderRadius: 16, borderWidth: StyleSheet.hairlineWidth, borderColor: c.borderStrong, backgroundColor: c.surface },
    section: { fontFamily: fonts.displaySemiBold, fontSize: 17, color: c.text },
    chapter: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, minHeight: 66, borderRadius: 12, borderWidth: 1, borderColor: c.border },
    field: { minHeight: 90, textAlignVertical: 'top', padding: 12, borderWidth: 1, borderColor: c.controlBorder, borderRadius: 12, fontFamily: fonts.satoshiRegular, fontSize: 15, color: c.text, backgroundColor: c.background },
    notice: { padding: 14, gap: 8, borderRadius: 12, backgroundColor: c.surfaceAlt },
    error: { fontFamily: fonts.satoshiMedium, fontSize: 13, lineHeight: 20, color: c.text },
    time: { fontFamily: fonts.satoshiMedium, fontSize: 12, color: c.textMuted, fontVariant: ['tabular-nums'] },
    deckStatus: { paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', gap: 8 },
  }), [c, insets.top, insets.bottom, wide, compactWide, width, height]);
  useEffect(() => {
    const subscription = AppState.addEventListener('change', state => setForeground(state === 'active'));
    let alive = true; void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (alive) setReduced(value); });
    const motion = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { alive = false; subscription.remove(); motion.remove(); pending.current = null; };
  }, []);
  useEffect(() => {
    if (!focused || !foreground || !p.isCurrent()) { pending.current = null; deferredPlay.current = null; setWaitingForDeck(false); setCue(null); }
  }, [focused, foreground, p.sessionKey]);
  useEffect(() => {
    if (mixAccessSession.identityKey() === p.sessionKey) roomViewState.write(p.sessionKey, p.mix.id, { tab, angle, placed, position: p.position });
  }, [p.sessionKey, p.mix.id, tab, angle, placed, p.position]);
  useEffect(() => { if (deckError) { pending.current = null; deferredPlay.current = null; setWaitingForDeck(false); setCue(null); } }, [deckError]);
  const toggle = async () => {
    if (p.starting || !p.isCurrent() || !focused || !foreground) return;
    if (pending.current || waitingForDeck) { pending.current = null; deferredPlay.current = null; setWaitingForDeck(false); setCue(null); return; }
    if (p.playing || p.engaged || placed || deckError) { await p.onToggle(p.position); return; }
    if (!visible || !ready) { deferredPlay.current = nativePlaybackIntent(); setWaitingForDeck(true); setTab('listen'); return; }
    const id = ++nextCue.current;
    pending.current = { id, intent: nativePlaybackIntent() }; setCue(id);
  };
  useEffect(() => {
    if (!visible || !ready || deferredPlay.current === null) return;
    const intent = deferredPlay.current; deferredPlay.current = null; setWaitingForDeck(false);
    if (!currentNativePlaybackIntent(intent) || !latest.current.isCurrent()) return;
    const id = ++nextCue.current; pending.current = {id,intent}; setCue(id);
  }, [visible, ready]);
  const touchdown = (id: number) => {
    const request = pending.current; const now = latest.current;
    if (!request || request.id !== id || !visibleNow.current || !now.isCurrent() || !currentNativePlaybackIntent(request.intent)) {
      pending.current = null; setCue(null); return;
    }
    pending.current = null; setPlaced(true); setCue(null);
    const operation = ++startGeneration.current;
    void now.onToggle(now.position).then(ok => { if (!ok && operation === startGeneration.current && latest.current.sessionKey === now.sessionKey && latest.current.mix.id === now.mix.id && now.isCurrent()) setPlaced(false); });
  };
  const seek = (seconds: number) => {
    if (!p.isCurrent() || !Number.isFinite(seconds) || p.duration <= 0) return;
    // Seeking cancels a pending automatic cue; it never becomes a Play action.
    pending.current = null; deferredPlay.current = null; setWaitingForDeck(false); setCue(null); setPlaced(true);
    p.onSeek(Math.max(0, Math.min(p.duration, seconds)));
  };
  const button = (icon: Icon, label: string, action: () => void, selected = false, disabled = false) => <Pressable
    accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled, busy: disabled }}
    disabled={disabled} onPress={action} style={({ pressed }) => [styles.action, selected && { borderColor: c.accentText, backgroundColor: c.accentSoft }, { opacity: disabled ? 0.5 : pressed ? 0.72 : 1 }]}>
    <MaterialIcons name={icon} size={19} color={selected ? c.accentText : c.text} /><Text style={styles.actionText}>{label}</Text>
  </Pressable>;
  const validChapter = (item: MixTrackItem) => typeof item.start_seconds === 'number' && Number.isFinite(item.start_seconds) && item.start_seconds >= 0 && (p.duration <= 0 || item.start_seconds <= p.duration);
  const currentChapter = [...p.tracklist].filter(item => validChapter(item) && Number(item.start_seconds) <= p.position).sort((a,b) => Number(b.start_seconds) - Number(a.start_seconds))[0];
  const busy = p.starting || cue !== null || waitingForDeck;
  const tabs: [RoomTab, string][] = [['listen', 'Listen'], ['tracklist', 'Tracklist'], ['room', 'Room']];
  return <View style={styles.screen}>
    <View style={styles.header}>
      <Pressable accessibilityRole="button" accessibilityLabel="Minimise listening room" onPress={p.onClose} style={styles.icon}><MaterialIcons name="keyboard-arrow-down" size={28} color={c.text} /></Pressable>
      <View style={styles.head}><Text style={styles.eyebrow}>{p.privacyLabel || 'LISTENING ROOM'}</Text><Text style={styles.hint} numberOfLines={compactWide?1:undefined}>{compactWide?(p.mix.title||'Untitled mix'):'A closer listen'}</Text></View>
      {p.publicMix ? <Pressable accessibilityRole="button" accessibilityLabel="Share mix" onPress={p.onShare} style={styles.icon}><MaterialIcons name="ios-share" size={21} color={c.text} /></Pressable> : null}
    </View>
    <View style={styles.tabRow}>{tabs.map(([key,label]) => <Pressable key={key} accessibilityRole="tab" accessibilityState={{ selected: tab === key }} onPress={() => { if (key !== 'listen') { pending.current=null; deferredPlay.current=null;setWaitingForDeck(false); setCue(null); } setTab(key); }} style={[styles.tab, tab === key && { borderBottomColor: c.accentText }]}><Text style={[styles.tabText, tab === key && { color: c.text }]}>{label}</Text></Pressable>)}</View>
    {tab !== 'listen' ? <View style={[styles.panel,{marginHorizontal:16,marginTop:12,padding:10}]}>
      <View style={styles.row}>
        <Pressable accessibilityRole="button" accessibilityLabel={p.playing?'Pause mix':'Play mix'} accessibilityState={{disabled:p.starting,busy:p.starting}} disabled={p.starting} onPress={()=>void toggle()} style={styles.icon}>
          {busy?<ActivityIndicator color={c.accentFill}/>:<MaterialIcons name={p.playing?'pause':'play-arrow'} size={30} color={c.text}/>}
        </Pressable><View style={{flex:1}}><Text style={styles.subtitle} numberOfLines={1}>{p.mix.title||'Untitled mix'}</Text><Text style={styles.time}>{roomTimestamp(p.position)} / {formatDuration(p.duration)}</Text></View>
        <Pressable accessibilityRole="button" accessibilityLabel="Open deck" onPress={()=>setTab('listen')} style={styles.icon}><MaterialIcons name="album" size={24} color={c.accentText}/></Pressable>
      </View>
      <PlaybackSeekBar duration={p.duration} position={p.position} ratio={p.duration>0?p.position/p.duration:0} onSeek={ratio=>seek(ratio*p.duration)}/>
      {p.playbackError?<Text accessibilityRole="alert" style={styles.error}>{p.playbackError}</Text>:null}
    </View> : null}
    <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={styles.content}>
      <View style={[styles.row,compactWide&&{display:'none'}]}>
        {p.mix.cover_url && !coverFailed ? <Image source={{uri:p.mix.cover_url}} accessibilityLabel="Mix artwork" onError={() => setCoverFailed(true)} style={styles.cover} /> : <View style={[styles.cover,{alignItems:'center',justifyContent:'center'}]}><MaterialIcons name="album" size={30} color={c.textMuted} /></View>}
        <View style={{flex:1}}><Text style={styles.title}>{p.mix.title || 'Untitled mix'}</Text><Text style={styles.subtitle}>{[p.mix.city, p.mix.event_name, p.duration ? formatDuration(p.duration) : null].filter(Boolean).join(' · ') || 'Mix'}</Text></View>
      </View>
      <View style={{display: tab === 'listen' ? 'flex' : 'none'}}>
        <View style={styles.hero}>
          <View style={styles.deck}>
            <ListeningDeck3D key={deckAttempt} mixId={p.mix.id} coverUrl={p.mix.cover_url} position={p.position} duration={p.duration}
              playing={p.playing} engaged={p.engaged || placed} visible={visible} reducedMotion={reduced} cueRequestId={cue} parkRequestId={parkRequestId}
              onCueReady={touchdown} onSeek={seek} onReady={() => { setReady(true); setDeckError(null); }} onError={setDeckError}
              viewAngle={angle} chapters={p.tracklist.filter(validChapter).map(item=>item.start_seconds!)} />
            {!ready && !deckError ? <View style={styles.deckStatus}><ActivityIndicator color={c.accentFill}/><Text style={styles.hint}>Opening your deck…</Text></View> : null}
            {deckError ? <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{deckError}</Text>{button('refresh','Retry 3D deck',()=>{setReady(false);setDeckError(null);setDeckAttempt(value=>value+1);})}</View> : null}
          </View>
          <View style={styles.transport}>
            {currentChapter ? <Text style={styles.subtitle} numberOfLines={compactWide?2:undefined}>{currentChapter.raw_title || `Track ${currentChapter.position}`}{currentChapter.raw_artist ? ` · ${currentChapter.raw_artist}` : ''}</Text> : <Text style={styles.hint}>Drag the record or tonearm to seek.</Text>}
            <View>
              <PlaybackSeekBar duration={p.duration} position={p.position} ratio={p.duration>0?p.position/p.duration:0} onSeek={ratio=>seek(ratio*p.duration)} />
              <View style={[styles.row,{justifyContent:'space-between'}]}><Text style={styles.time}>{roomTimestamp(p.position)}</Text><Text style={styles.time}>{formatDuration(p.duration)}</Text></View>
            </View>
            <View style={styles.controls}>
              <Pressable accessibilityRole="button" accessibilityLabel="Seek backward 15 seconds" onPress={()=>seek(p.position-15)} style={styles.icon}><MaterialIcons name="fast-rewind" size={28} color={c.text}/></Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel={cue!==null||waitingForDeck?'Cancel cue':p.playing?'Pause mix':'Play mix'} accessibilityState={{busy,disabled:p.starting||(!ready&&!deckError&&!p.engaged&&!p.playing&&!placed&&!waitingForDeck)}} disabled={p.starting||(!ready&&!deckError&&!p.engaged&&!p.playing&&!placed&&!waitingForDeck)} onPress={()=>void toggle()} style={styles.play}>
                {busy?<ActivityIndicator color={c.onAccent}/>:<MaterialIcons name={p.playing?'pause':'play-arrow'} size={38} color={c.onAccent}/>}
              </Pressable>
              <Pressable accessibilityRole="button" accessibilityLabel="Seek forward 15 seconds" onPress={()=>seek(p.position+15)} style={styles.icon}><MaterialIcons name="fast-forward" size={28} color={c.text}/></Pressable>
            </View>
            {button('stop','Stop mix',()=>{pending.current=null;deferredPlay.current=null;setWaitingForDeck(false);startGeneration.current++;setCue(null);setPlaced(false);setParkRequestId(value=>(value??0)+1);void p.onStop();},false,p.starting)}
            {p.playbackError ? <Text accessibilityRole="alert" style={styles.error}>{p.playbackError}</Text> : null}
          </View>
        </View>
        <View style={[styles.row,{marginTop:12}]}>
          {p.publicMix ? <>{button(p.social.liked?'favorite':'favorite-border',p.social.liked?'Liked':'Like',p.onLike,Boolean(p.social.liked),p.social.busy||p.social.loading)}{button(p.social.saved?'bookmark':'bookmark-border',p.social.saved?'Saved':'Save',p.onSave,Boolean(p.social.saved),p.social.busy||p.social.loading)}{button('forum','Post to Community',p.onPostToCommunity)}</> : null}
          {p.canDownload ? button('file-download',p.downloading?'Opening…':'Download',p.onDownload,false,p.downloading) : null}
        </View>
        {p.publicMix && p.social.error ? <View style={[styles.notice,{marginTop:12}]}><Text accessibilityRole="alert" style={styles.error}>{p.social.error}</Text>{button('refresh','Retry Like and Save',()=>void p.social.retry())}</View> : null}
        <View style={[styles.panel,{marginTop:18}]}>
          <Text style={styles.section}>Your view</Text><Text style={styles.hint}>Tilt the deck to find your angle.</Text>
          <View accessible accessibilityRole="adjustable" accessibilityLabel="Deck viewing angle" accessibilityValue={{min:25,max:65,now:Number(angle.toFixed(1)),text:`${Number(angle.toFixed(1))} degrees`}} accessibilityActions={[{name:'decrement',label:'Tilt down'},{name:'increment',label:'Tilt up'}]} onAccessibilityAction={event=>setAngle(value=>Math.max(25,Math.min(65,value+(event.nativeEvent.actionName==='increment'?5:-5))))}>
            <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><PlaybackSeekBar accessibilityLabel="Deck viewing angle" duration={40} position={angle-25} ratio={(angle-25)/40} onSeek={ratio=>setAngle(25+ratio*40)} /></View>
          </View>
          <View style={[styles.row,{justifyContent:'space-between'}]}><Text style={styles.time}>{Number(angle.toFixed(1))}°</Text>{button('restart-alt','Reset view',()=>setAngle(35.5))}</View>
        </View>
        {p.mix.description ? <Text style={[styles.body,{marginTop:18}]}>{p.mix.description}</Text> : null}
      </View>
      {tab === 'tracklist' ? <View style={{gap:12}}>
        <Text style={styles.section}>Inside this mix</Text><Text style={styles.hint}>Choose a chapter to move there. A paused mix stays paused.</Text>
        {p.tracklistLoading ? <ActivityIndicator accessibilityLabel="Loading tracklist" color={c.accentFill}/> : null}
        {p.tracklistError ? <View style={styles.notice}><Text style={styles.error}>The tracklist could not load.</Text>{button('refresh','Retry tracklist',p.onRetryTracklist)}</View> : null}
        {!p.tracklistLoading&&!p.tracklistError&&!p.tracklist.length ? <Text style={styles.body}>The creator has not added a tracklist.</Text> : null}
        {p.tracklist.map(item=><Pressable key={item.id} accessibilityRole="button" accessibilityLabel={validChapter(item)?`Seek to ${item.raw_title||`track ${item.position}`} at ${roomTimestamp(item.start_seconds)}`:`${item.raw_title||`Track ${item.position}`}, time not set`} accessibilityState={{selected:currentChapter?.id===item.id,disabled:!validChapter(item)}} disabled={!validChapter(item)} onPress={()=>seek(item.start_seconds||0)} style={[styles.chapter,currentChapter?.id===item.id&&{borderColor:c.accentText,backgroundColor:c.accentSoft}]}><Text style={styles.time}>{String(item.position).padStart(2,'0')}</Text><View style={{flex:1}}><Text style={styles.body}>{item.raw_title||`Track ${item.position}`}</Text>{item.raw_artist?<Text style={styles.hint}>{item.raw_artist}</Text>:null}</View><Text style={styles.time}>{validChapter(item)?roomTimestamp(item.start_seconds):'Time not set'}</Text></Pressable>)}
        {button('headphones','Return to Listen',()=>setTab('listen'))}
      </View> : null}
      {tab === 'room' ? <View style={{gap:18}}>
        <View><Text style={styles.section}>In the room</Text><Text style={styles.hint}>Notes and track IDs at the moment you heard them.</Text></View>
        {!p.publicMix ? <View style={styles.notice}><Text style={styles.body}>Comments and track ID requests are available on public mixes.</Text></View> : <>
          {p.roomDataError ? <View style={styles.notice}><Text accessibilityRole="alert" style={styles.error}>{p.roomDataError}</Text>{button('refresh','Retry room activity',p.onRetryRoom)}</View> : null}
          <View style={styles.panel}><Text style={styles.section}>Leave a note</Text><Text style={styles.hint}>At {roomTimestamp(p.position)}</Text><TextInput accessibilityLabel="Your listening room comment" value={p.commentValue} onChangeText={p.onCommentValue} maxLength={500} multiline placeholder="What are you hearing?" placeholderTextColor={c.textMuted} style={styles.field}/>{button('send',p.commentBusy?'Posting…':'Post comment',p.onComment,false,p.commentBusy||!p.commentValue.trim())}</View>
          <View style={styles.row}>{button('help-outline',p.requestBusy?'Requesting…':'Request track ID',p.onRequestId,false,p.requestBusy)}</View>
          {!p.comments.length&&!p.requests.length&&!p.roomDataError ? <Text style={styles.body}>Be the first to leave a note.</Text> : null}
          {p.comments.map(comment=><View key={comment.id} style={styles.panel}><View style={[styles.row,{justifyContent:'space-between'}]}><Text style={styles.subtitle}>{p.profileNames[comment.user_id]||'PLUGGD listener'}</Text><Pressable accessibilityRole="button" accessibilityLabel={`Seek to comment at ${roomTimestamp(comment.timestamp_seconds)}`} onPress={()=>seek(comment.timestamp_seconds||0)} style={{minHeight:44,justifyContent:'center'}}><Text style={[styles.time,{color:c.accentText}]}>{roomTimestamp(comment.timestamp_seconds)}</Text></Pressable></View><Text style={styles.body}>{comment.body}</Text></View>)}
          {p.requests.map(request=><View key={request.id} style={styles.panel}><Text style={styles.subtitle}>Track ID · {request.status==='resolved'?'Resolved':request.status==='dismissed'?'Closed':'Requested'}</Text><Text style={styles.hint}>{p.profileNames[request.user_id]||'PLUGGD listener'} · {roomTimestamp(request.timestamp_seconds)}</Text></View>)}
        </>}
      </View> : null}
    </ScrollView>
  </View>;
}
