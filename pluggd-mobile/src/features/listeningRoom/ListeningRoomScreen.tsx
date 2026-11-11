import { MaterialIcons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';
import { useEffect, useMemo, useRef, useState, type ComponentProps, type ReactNode } from 'react';
import { AccessibilityInfo, ActivityIndicator, AppState, Image, Pressable, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { PlaybackSeekBar } from '../../components/PlaybackSeekBar';
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
  creator?: { name: string; avatarUrl?: string | null; onPress?: () => void }; followSlot?: ReactNode;
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
  const insets = useSafeAreaInsets(); const { width, height, fontScale } = useWindowDimensions();
  const wide = width >= 700 && width > height; const narrow = width <= 380; const largeControls = fontScale > 1.2;
  const c = { background: '#111210', text: '#f0eee3', muted: '#92948b', accent: '#d7e769', surface: '#1a1c17', line: 'rgba(240,238,227,0.14)' };
  const focused = useIsFocused();
  const roomScroll = useRef<ScrollView>(null);
  const initial = useRef(roomViewState.read(p.sessionKey, p.mix.id)).current;
  const [tab, setTab] = useState<RoomTab>(initial.tab);
  useEffect(() => { roomScroll.current?.scrollTo({ y: 0, animated: false }); }, [tab]);
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
    screen: { flex: 1, backgroundColor: '#111210', paddingTop: insets.top },
    header: { height: 57, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(240,238,227,0.14)' },
    wordmark: { fontFamily: fonts.satoshiBlack, fontSize: 17, letterSpacing: 2.7, color: '#f0eee3' },
    icon: { width: 44, minHeight: 44, flexShrink: 0, alignItems: 'center', justifyContent: 'center', borderRadius: 6 },
    row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    muted: { fontFamily: fonts.satoshiRegular, color: '#92948b', fontSize: 12, lineHeight: 18 },
    body: { fontFamily: fonts.satoshiRegular, color: '#f0eee3', fontSize: 14, lineHeight: 22 },
    small: { fontFamily: fonts.satoshiMedium, color: '#9ba58b', fontSize: 10, lineHeight: 15 },
    tabRow: { paddingHorizontal: 18, flexDirection: 'row', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(240,238,227,0.14)' },
    tab: { flex: 1, minHeight: 48, flexDirection: 'row', gap: 7, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderBottomColor: 'transparent', paddingHorizontal: 5 },
    tabText: { fontFamily: fonts.satoshiMedium, fontSize: 13, lineHeight: 19, color: '#949d86', flexShrink: 1 },
    content: { paddingHorizontal: 22, paddingTop: 24, paddingBottom: 28, maxWidth: 1040, width: '100%', alignSelf: 'center', gap: 25 },
    hero: { flexDirection: wide ? 'row' : 'column', alignItems: wide ? 'center' : 'stretch', gap: 22 },
    deck: { width: wide ? '49%' : '100%', maxWidth: wide ? undefined : 430, alignSelf: 'center', paddingHorizontal: 12, paddingTop: 13, paddingBottom: 10, borderWidth: 1, borderColor: '#3a3d31', borderRadius: 15, backgroundColor: '#191b16' },
    deckTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 2, gap: 8 },
    deckEyebrow: { fontFamily: fonts.satoshiBold, fontSize: 8, letterSpacing: 1.2, color: '#9ca58e' },
    dot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#d7e769' },
    deckAngle: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: -2, marginBottom: 3 },
    angleTrack: { height: 3, backgroundColor: '#444d36' }, angleFill: { backgroundColor: '#687852' },
    angleThumb: { width: 11, height: 11, backgroundColor: '#cedd91', borderColor: '#788855' },
    deckButtons: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 7, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#ffffff12', paddingTop: 10 },
    deckAction: { minHeight: 44, flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 6, paddingHorizontal: 11, borderRadius: 7, borderWidth: 1, borderColor: '#414b34', backgroundColor: '#2a3023', flexShrink: 0 },
    deckActionText: { fontFamily: fonts.satoshiBold, fontSize: 12, color: '#c8d0b8' },
    deckReadout: { flex: 1, minWidth: 0, alignItems: 'flex-end', gap: 2 },
    deckTime: { fontFamily: fonts.satoshiMedium, fontSize: narrow ? 17 : 20, lineHeight: 24, fontVariant: ['tabular-nums'], color: '#dce1cf' },
    deckHint: { fontFamily: fonts.satoshiRegular, fontSize: 10, lineHeight: 15, textAlign: 'center', color: '#a1ad90', marginTop: 9 },
    heroCopy: { flex: wide ? 1 : undefined, minWidth: 0, gap: 11 },
    type: { fontFamily: fonts.satoshiMedium, color: '#a8b198', fontSize: 9, letterSpacing: 1.3, lineHeight: 14, textTransform: 'uppercase' },
    title: { fontFamily: fonts.satoshiBlack, color: '#f0eee3', fontSize: 35, lineHeight: 37, letterSpacing: -1.3 },
    creatorRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
    avatar: { width: 27, height: 27, borderRadius: 14, backgroundColor: '#292e21', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#3a4230' },
    creator: { fontFamily: fonts.satoshiMedium, color: '#f0eee3', fontSize: 13, lineHeight: 19, flexShrink: 1 },
    metadata: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap' },
    actions: { flexDirection: 'row', alignItems: 'stretch', gap: 8, marginTop: 8 },
    action: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, borderWidth: 1, borderColor: '#45483e', borderRadius: 9, paddingHorizontal: 11, flexShrink: 0 },
    actionText: { fontFamily: fonts.satoshiMedium, fontSize: 11, lineHeight: 16, color: '#f0eee3' },
    heroPlay: { flex: 1, minWidth: 0, minHeight: 45, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 24, backgroundColor: '#d7e769', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7 },
    heroPlayText: { fontFamily: fonts.satoshiBold, fontSize: 13, lineHeight: 18, color: '#15190e', flexShrink: 1 },
    section: { fontFamily: fonts.satoshiBold, color: '#f0eee3', fontSize: 20, lineHeight: 27, letterSpacing: -0.3 },
    chapterTitle: { fontFamily: fonts.satoshiBold, color: '#f0eee3', fontSize: 22, lineHeight: 27, letterSpacing: -0.4, flex: 1 },
    timeline: { height: 36, width: '100%', position: 'relative', justifyContent: 'center' },
    timelineBase: { height: 24, borderRadius: 3, backgroundColor: '#343b2c', overflow: 'hidden' },
    timelineFill: { height: '100%', backgroundColor: '#87923e' },
    marker: { position: 'absolute', top: 6, bottom: 6, width: 2, backgroundColor: '#111210' },
    playhead: { position: 'absolute', top: 1, bottom: 1, width: 1, backgroundColor: '#f0eee3' },
    panel: { padding: 16, gap: 12, borderRadius: 10, borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(240,238,227,0.14)', backgroundColor: '#171914' },
    chapter: { flexDirection: 'row', gap: 12, alignItems: 'center', paddingVertical: 14, paddingHorizontal: 12, minHeight: 66, borderRadius: 9, borderWidth: 1, borderColor: '#30352a' },
    field: { minHeight: 90, textAlignVertical: 'top', padding: 12, borderWidth: 1, borderColor: '#3b4231', borderRadius: 8, fontFamily: fonts.satoshiRegular, fontSize: 15, color: '#f0eee3', backgroundColor: '#111210' },
    notice: { padding: 13, gap: 8, borderRadius: 8, backgroundColor: '#24291d' },
    footer: { paddingHorizontal: 17, paddingTop: 12, paddingBottom: Math.max(insets.bottom, 12), minHeight: 77 + insets.bottom, backgroundColor: '#151711', borderTopWidth: 1, borderTopColor: '#363c2b' },
    footerRow: { flexDirection: 'row', alignItems: 'center', gap: 5, minHeight: 44 },
    footerIdentity: { flex: 1, minWidth: 0, flexDirection: 'row', alignItems: 'center', gap: 9, minHeight: 44 },
    footerCover: { width: 38, height: 38, borderRadius: 4, backgroundColor: '#2c3222', flexShrink: 0 },
    footerTitle: { fontFamily: fonts.satoshiBold, color: '#f0eee3', fontSize: 12, lineHeight: 17 },
    footerMeta: { fontFamily: fonts.satoshiRegular, color: '#8d9e7a', fontSize: 10, lineHeight: 15 },
    footerPlay: { width: 44, minHeight: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: '#d7e769', flexShrink: 0 },
    footerProgress: { position: 'absolute', left: 0, right: 0, top: 0, height: 2, backgroundColor: '#343b2a' },
  }), [insets.top, insets.bottom, wide, narrow]);
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
  const validChapter = (item: MixTrackItem) => typeof item.start_seconds === 'number' && Number.isFinite(item.start_seconds) && item.start_seconds >= 0 && (p.duration <= 0 || item.start_seconds <= p.duration);
  const timed = [...p.tracklist].filter(validChapter).sort((a,b) => Number(a.start_seconds)-Number(b.start_seconds));
  const currentIndex = timed.reduce((found,item,index) => Number(item.start_seconds)<=p.position ? index : found,-1);
  const currentChapter = timed[currentIndex]; const nextChapter = timed[currentIndex+1];
  const previousSecond = currentChapter && p.position-Number(currentChapter.start_seconds)>3 ? Number(currentChapter.start_seconds) : Number(timed[Math.max(0,currentIndex-1)]?.start_seconds ?? 0);
  const busy = p.starting || cue !== null || waitingForDeck;
  const cancelCue = cue !== null || waitingForDeck;
  const ratio = p.duration>0 ? Math.max(0,Math.min(1,p.position/p.duration)) : 0;
  const stop = () => { pending.current=null;deferredPlay.current=null;setWaitingForDeck(false);startGeneration.current++;setCue(null);setPlaced(false);setParkRequestId(value=>(value??0)+1);void p.onStop(); };
  // NativeWind must not reinterpret functional native Pressable styles.
  const button = (icon: Icon, label: string, action: () => void, selected = false, disabled = false, iconOnly = false) => <Pressable cssInterop={false}
    accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ selected, disabled, busy: disabled }} disabled={disabled} onPress={action}
    style={({ pressed }) => [styles.action, selected && { borderColor: c.accent, backgroundColor: '#d7e76912' }, iconOnly && { width: 44, paddingHorizontal: 0 }, { opacity: disabled ? 0.4 : pressed ? 0.65 : 1 }]}>
    <MaterialIcons name={icon} size={18} color={selected ? c.accent : c.text}/>{!iconOnly ? <Text style={styles.actionText}>{label}</Text> : null}
  </Pressable>;
  const tabs: [RoomTab, string, Icon][] = [['listen','Listen','headphones'],['tracklist','Tracklist','queue-music'],['room','Room','chat-bubble-outline']];
  const metadata = [p.duration>0 ? formatDuration(p.duration) : null, p.tracklist.length ? `${p.tracklist.length} tracks` : null, [p.mix.genre_tags?.[0],p.mix.mood_tags?.[0]].filter(Boolean).join(' / ')].filter(Boolean);
  return <View style={styles.screen}>
    <View style={styles.header}>
      <Text style={styles.wordmark}>PLUGGD<Text style={{color:c.accent}}>.</Text></Text>
      <View style={styles.row}>{p.privacyLabel ? <Text numberOfLines={1} style={[styles.small,{maxWidth:150}]}>{p.privacyLabel}</Text> : null}<Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Minimise listening room" onPress={p.onClose} style={styles.icon}><MaterialIcons name="close" size={20} color={c.text}/></Pressable></View>
    </View>
    <View style={styles.tabRow}>{tabs.map(([key,label,icon])=><Pressable cssInterop={false} key={key} accessibilityRole="tab" accessibilityLabel={label} accessibilityState={{selected:tab===key}} onPress={()=>{if(key!=='listen'){pending.current=null;deferredPlay.current=null;setWaitingForDeck(false);setCue(null);}setTab(key);}} style={[styles.tab,tab===key&&{borderBottomColor:c.accent}]}>
      {!(width<350&&fontScale>1.25) ? <MaterialIcons name={icon} size={16} color={tab===key?c.text:'#949d86'}/> : null}<Text style={[styles.tabText,tab===key&&{color:c.text}]}>{label}</Text>
    </Pressable>)}</View>
    <ScrollView ref={roomScroll} keyboardShouldPersistTaps="handled" automaticallyAdjustKeyboardInsets contentContainerStyle={styles.content}>
      <View style={{display:tab==='listen'?'flex':'none',gap:26}}>
        <View style={styles.hero}>
          <View style={styles.deck}>
            <View style={styles.deckTop}><View style={[styles.row,{gap:7}]}><View style={[styles.dot,!p.playing&&{backgroundColor:'#687059'}]}/><Text style={styles.deckEyebrow}>PLUGGD LISTENING DECK</Text></View><Text style={styles.deckEyebrow}>33⅓</Text></View>
            <ListeningDeck3D key={deckAttempt} mixId={p.mix.id} coverUrl={p.mix.cover_url} position={p.position} duration={p.duration} playing={p.playing} engaged={p.engaged||placed} visible={visible} reducedMotion={reduced} cueRequestId={cue} parkRequestId={parkRequestId} onCueReady={touchdown} onSeek={seek} onReady={()=>{setReady(true);setDeckError(null);}} onError={setDeckError} viewAngle={angle} chapters={timed.map(item=>item.start_seconds!)} />
            {!ready&&!deckError ? <View style={[styles.row,{justifyContent:'center',gap:8,paddingVertical:8}]}><ActivityIndicator size="small" color={c.accent}/><Text style={styles.small}>Opening your deck…</Text></View> : null}
            {deckError ? <View style={styles.notice}><Text accessibilityRole="alert" style={styles.body}>{deckError}</Text>{button('refresh','Retry 3D deck',()=>{setReady(false);setDeckError(null);setDeckAttempt(value=>value+1);})}</View> : null}
            <View style={styles.deckAngle}>
              <Text style={styles.small}>View angle</Text><View style={{flex:1,minWidth:0}} accessible accessibilityRole="adjustable" accessibilityLabel="Deck viewing angle" accessibilityValue={{min:25,max:65,now:Number(angle.toFixed(1)),text:`${Number(angle.toFixed(1))} degrees`}} accessibilityActions={[{name:'decrement',label:'Tilt down'},{name:'increment',label:'Tilt up'}]} onAccessibilityAction={event=>setAngle(value=>Math.max(25,Math.min(65,value+(event.nativeEvent.actionName==='increment' ? 0.5 : -0.5))))}>
                <View accessibilityElementsHidden importantForAccessibility="no-hide-descendants"><PlaybackSeekBar accessibilityLabel="Deck viewing angle" duration={40} position={angle-25} ratio={(angle-25)/40} onSeek={value=>setAngle(25+value*40)} trackStyle={styles.angleTrack} fillStyle={styles.angleFill} thumbStyle={styles.angleThumb}/></View>
              </View><Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Reset deck view angle" onPress={()=>setAngle(35.5)} style={styles.icon}><MaterialIcons name="restart-alt" size={17} color="#99a684"/></Pressable>
            </View>
            <View style={styles.deckButtons}>
              <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={cancelCue?'Cancel deck cue':p.playing?'Pause deck':'Start deck'} accessibilityState={{busy,disabled:p.starting}} disabled={p.starting} onPress={()=>void toggle()} style={[styles.deckAction,{backgroundColor:c.accent,borderColor:'#e5f38a'}]}>{busy?<ActivityIndicator size="small" color="#1c2510"/>:<MaterialIcons name={p.playing?'pause':'play-arrow'} size={17} color="#1c2510"/>}<Text style={[styles.deckActionText,{color:'#1c2510'}]}>{cancelCue?'Cancel':p.playing?'Pause':'Start'}</Text></Pressable>
              <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Cue current chapter" disabled={p.duration<=0} onPress={()=>seek(Number(currentChapter?.start_seconds??0))} style={[styles.deckAction,width<350&&{width:44,paddingHorizontal:0}]}><MaterialIcons name="replay" size={16} color="#c8d0b8"/>{width>=350?<Text style={styles.deckActionText}>Cue</Text>:null}</Pressable>
              {!largeControls ? <View style={styles.deckReadout}><Text style={styles.small}>{p.starting?'BUFFERING':cancelCue?'CUEING':p.playing?'TRACKING':(p.engaged||placed)?'PAUSED':'ARM PARKED'}</Text><Text style={styles.deckTime}>{roomTimestamp(p.position)}</Text></View> : null}
              <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Stop mix" disabled={p.starting} onPress={stop} style={[styles.icon,{width:44},largeControls&&{marginLeft:'auto'}]}><MaterialIcons name="stop" size={17} color="#9fa98f"/></Pressable>
              {largeControls ? <View style={[styles.deckReadout,{flexBasis:'100%',flexDirection:'row',alignItems:'center',justifyContent:'space-between',paddingTop:6}]}><Text style={styles.small}>{p.starting?'BUFFERING':cancelCue?'CUEING':p.playing?'TRACKING':(p.engaged||placed)?'PAUSED':'ARM PARKED'}</Text><Text style={styles.deckTime}>{roomTimestamp(p.position)}</Text></View> : null}
            </View>
            <Text style={styles.deckHint}>Drag the arm or record to seek.</Text>
          </View>
          <View style={styles.heroCopy}>
            {[p.mix.recording_type,p.mix.genre_tags?.[0]].filter(Boolean).length ? <Text style={styles.type}>{[p.mix.recording_type,p.mix.genre_tags?.[0]].filter(Boolean).join(' · ')}</Text> : null}
            <Text style={styles.title}>{p.mix.title||'Untitled mix'}</Text>
            {p.creator||p.followSlot ? <View style={styles.creatorRow}>
              {p.creator ? <><View style={styles.avatar}>{p.creator.avatarUrl?<Image source={{uri:p.creator.avatarUrl}} style={{width:25,height:25,borderRadius:13}}/>:<MaterialIcons name="headphones" size={14} color="#d7e769"/>}</View>{p.creator.onPress?<Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={`Open ${p.creator.name}`} onPress={p.creator.onPress} style={{minHeight:44,justifyContent:'center',flexShrink:1}}><Text style={styles.creator}>{p.creator.name}</Text></Pressable>:<Text style={styles.creator}>{p.creator.name}</Text>}</> : null}
              {p.followSlot}
            </View> : null}
            <View style={styles.metadata}>{metadata.map((value,index)=><View key={String(value)} style={[styles.row,{gap:7}]}>{index>0?<Text style={styles.small}>·</Text>:null}<Text style={styles.small}>{value}</Text></View>)}</View>
            <View style={styles.actions}>
              <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={cancelCue?'Cancel mix cue':p.playing?'Pause mix from deck':'Play mix from deck'} accessibilityState={{busy,disabled:p.starting}} disabled={p.starting} onPress={()=>void toggle()} style={styles.heroPlay}>{busy?<ActivityIndicator size="small" color="#15190e"/>:<MaterialIcons name={p.playing?'pause':'play-arrow'} size={19} color="#15190e"/>}<Text style={styles.heroPlayText}>{cancelCue?'Cancel':p.playing?'Pause mix':'Play mix'}</Text></Pressable>
              {p.publicMix ? <>{button(p.social.liked?'favorite':'favorite-border',p.social.liked?'Liked':'Like',p.onLike,Boolean(p.social.liked),p.social.busy||p.social.loading,narrow)}{button(p.social.saved?'bookmark':'bookmark-border',p.social.saved?'Saved':'Save',p.onSave,Boolean(p.social.saved),p.social.busy||p.social.loading,narrow)}{button('ios-share','Share mix',p.onShare,false,false,true)}</> : null}
            </View>
            {p.playbackError ? <Text accessibilityRole="alert" style={styles.body}>{p.playbackError}</Text> : null}
            {p.publicMix&&p.social.error ? <View style={styles.notice}><Text accessibilityRole="alert" style={styles.body}>{p.social.error}</Text>{button('refresh','Retry Like and Save',()=>void p.social.retry())}</View> : null}
          </View>
        </View>
        <View style={{gap:9}}>
          <View style={[styles.row,{alignItems:'flex-start'}]}><Text style={[styles.small,{paddingTop:6,minWidth:42}]}>{timed.length?`${String(Math.max(0,currentIndex)+1).padStart(2,'0')} / ${String(timed.length).padStart(2,'0')}`:roomTimestamp(p.position)}</Text><Text style={styles.chapterTitle}>{currentChapter?.raw_title||'Full mix'}</Text></View>
          {currentChapter?.raw_artist?<Text style={[styles.small,{paddingLeft:50}]}>{currentChapter.raw_artist}</Text>:null}
          <Text style={styles.small}>{timed.length?'CHAPTER TIMELINE':'MIX TIMELINE'}</Text>
          <PlaybackSeekBar accessibilityLabel="Seek mix" ratio={ratio} duration={p.duration} position={p.position} onSeek={value=>seek(value*p.duration)} showDefaultTrack={false} showThumb={false}>{displayRatio=><View pointerEvents="none" style={styles.timeline}><View style={styles.timelineBase}><View style={[styles.timelineFill,{width:`${displayRatio*100}%`}]}/></View>{p.duration>0?timed.slice(1).map(item=><View key={item.id} style={[styles.marker,{left:`${Number(item.start_seconds)/p.duration*100}%`}]}/>):null}<View style={[styles.playhead,{left:`${displayRatio*100}%`}]}/></View>}</PlaybackSeekBar>
          <View style={[styles.row,{justifyContent:'space-between'}]}><Text style={styles.small}>{roomTimestamp(p.position)}</Text><Text style={styles.small}>{p.duration>0?roomTimestamp(p.duration):'--:--'}</Text></View>
        </View>
        {p.mix.description ? <View style={{gap:10,borderTopWidth:StyleSheet.hairlineWidth,borderTopColor:c.line,paddingTop:20}}><Text style={styles.section}>About this mix</Text><Text style={styles.body}>{p.mix.description}</Text></View>:null}
        <View style={[styles.row,{flexWrap:'wrap',gap:9}]}>{p.publicMix?button('forum','Post to Community',p.onPostToCommunity):null}{p.canDownload?button('file-download',p.downloading?'Opening…':'Download mix',p.onDownload,false,p.downloading):null}</View>
      </View>
      {tab!=='listen'?<View style={[styles.row,{paddingBottom:18,borderBottomWidth:StyleSheet.hairlineWidth,borderBottomColor:c.line}]}>{p.mix.cover_url&&!coverFailed?<Image source={{uri:p.mix.cover_url}} onError={()=>setCoverFailed(true)} style={styles.footerCover}/>:<View style={styles.footerCover}/>}<View style={{flex:1,minWidth:0}}><Text style={styles.creator}>{p.mix.title||'Untitled mix'}</Text><Text style={styles.small}>{p.creator?.name||p.privacyLabel||`${p.tracklist.length} tracks`}</Text></View></View>:null}
      {tab==='tracklist'?<View style={{gap:12}}>
        <Text style={styles.section}>Tracklist</Text><Text style={styles.muted}>Choose a chapter. A paused mix stays paused.</Text>
        {p.tracklistLoading?<ActivityIndicator accessibilityLabel="Loading tracklist" color={c.accent}/>:null}
        {p.tracklistError?<View style={styles.notice}><Text style={styles.body}>The tracklist could not load.</Text>{button('refresh','Retry tracklist',p.onRetryTracklist)}</View>:null}
        {!p.tracklistLoading&&!p.tracklistError&&!p.tracklist.length?<Text style={styles.muted}>The creator has not added a tracklist.</Text>:null}
        {p.tracklist.map(item=><Pressable cssInterop={false} key={item.id} accessibilityRole="button" accessibilityLabel={validChapter(item)?`Seek to ${item.raw_title||`track ${item.position}`} at ${roomTimestamp(item.start_seconds)}`:`${item.raw_title||`Track ${item.position}`}, time not set`} accessibilityState={{selected:currentChapter?.id===item.id,disabled:!validChapter(item)}} disabled={!validChapter(item)} onPress={()=>seek(item.start_seconds||0)} style={[styles.chapter,currentChapter?.id===item.id&&{borderColor:'#7b8a45',backgroundColor:'#d7e7690a'}]}><Text style={[styles.small,{minWidth:20}]}>{String(item.position).padStart(2,'0')}</Text><View style={{flex:1,minWidth:0}}><Text style={styles.body}>{item.raw_title||`Track ${item.position}`}</Text>{item.raw_artist?<Text style={styles.small}>{item.raw_artist}</Text>:null}</View><Text style={styles.small}>{validChapter(item)?roomTimestamp(item.start_seconds):'Time not set'}</Text></Pressable>)}
      </View>:null}
      {tab==='room'?<View style={{gap:18}}>
        <View><Text style={styles.section}>In the room</Text><Text style={styles.muted}>Notes and track IDs at the moment you heard them.</Text></View>
        {!p.publicMix?<View style={styles.notice}><Text style={styles.body}>Comments and track ID requests are available on public mixes.</Text></View>:<>
          {p.roomDataError?<View style={styles.notice}><Text accessibilityRole="alert" style={styles.body}>{p.roomDataError}</Text>{button('refresh','Retry room activity',p.onRetryRoom)}</View>:null}
          <View style={styles.panel}><Text style={[styles.section,{fontSize:17}]}>Leave a note</Text><Text style={styles.small}>At {roomTimestamp(p.position)}</Text><TextInput accessibilityLabel="Your listening room comment" value={p.commentValue} onChangeText={p.onCommentValue} maxLength={500} multiline placeholder="What are you hearing?" placeholderTextColor={c.muted} style={styles.field}/>{button('send',p.commentBusy?'Posting…':'Post comment',p.onComment,false,p.commentBusy||!p.commentValue.trim())}</View>
          <View style={styles.row}>{button('help-outline',p.requestBusy?'Requesting…':'Request track ID',p.onRequestId,false,p.requestBusy)}</View>
          {!p.comments.length&&!p.requests.length&&!p.roomDataError?<Text style={styles.muted}>Be the first to leave a note.</Text>:null}
          {p.comments.map(comment=><View key={comment.id} style={styles.panel}><View style={[styles.row,{justifyContent:'space-between'}]}><Text style={styles.creator}>{p.profileNames[comment.user_id]||'PLUGGD listener'}</Text><Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={`Seek to comment at ${roomTimestamp(comment.timestamp_seconds)}`} onPress={()=>seek(comment.timestamp_seconds||0)} style={{minHeight:44,justifyContent:'center'}}><Text style={[styles.small,{color:c.accent}]}>{roomTimestamp(comment.timestamp_seconds)}</Text></Pressable></View><Text style={styles.body}>{comment.body}</Text></View>)}
          {p.requests.map(request=><View key={request.id} style={styles.panel}><Text style={styles.creator}>Track ID · {request.status==='resolved'?'Resolved':request.status==='dismissed'?'Closed':'Requested'}</Text><Text style={styles.small}>{p.profileNames[request.user_id]||'PLUGGD listener'} · {roomTimestamp(request.timestamp_seconds)}</Text></View>)}
        </>}
      </View>:null}
    </ScrollView>
    <View style={styles.footer}>
      <View style={styles.footerProgress}><View style={{height:2,width:`${ratio*100}%`,backgroundColor:c.accent}}/></View>
      <View style={styles.footerRow}>
        <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Open listening deck" onPress={()=>{setTab('listen');roomScroll.current?.scrollTo({y:0,animated:!reduced});}} style={styles.footerIdentity}>{p.mix.cover_url&&!coverFailed?<Image source={{uri:p.mix.cover_url}} onError={()=>setCoverFailed(true)} style={styles.footerCover}/>:<View style={styles.footerCover}/>}<View style={{flex:1,minWidth:0}}><Text numberOfLines={1} style={styles.footerTitle}>{currentChapter?.raw_title||p.mix.title||'Untitled mix'}</Text><Text numberOfLines={1} style={styles.footerMeta}>{p.mix.title||'Untitled mix'}</Text></View></Pressable>
        {p.publicMix?<Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={p.social.liked?'Unlike mix':'Like mix'} accessibilityState={{selected:Boolean(p.social.liked),disabled:p.social.busy||p.social.loading}} disabled={p.social.busy||p.social.loading} onPress={p.onLike} style={styles.icon}><MaterialIcons name={p.social.liked?'favorite':'favorite-border'} size={19} color={p.social.liked?c.accent:c.text}/></Pressable>:null}
        {wide?<Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Previous chapter" onPress={()=>seek(previousSecond)} disabled={p.duration<=0} style={styles.icon}><MaterialIcons name="skip-previous" size={20} color={c.text}/></Pressable>:null}
        <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel={cancelCue?'Cancel cue':p.playing?'Pause mix':'Play mix'} accessibilityState={{busy,disabled:p.starting}} disabled={p.starting} onPress={()=>void toggle()} style={styles.footerPlay}>{busy?<ActivityIndicator size="small" color="#1c2510"/>:<MaterialIcons name={p.playing?'pause':'play-arrow'} size={22} color="#1c2510"/>}</Pressable>
        <Pressable cssInterop={false} accessibilityRole="button" accessibilityLabel="Next chapter" accessibilityState={{disabled:!nextChapter}} disabled={!nextChapter} onPress={()=>nextChapter&&seek(Number(nextChapter.start_seconds))} style={[styles.icon,!nextChapter&&{opacity:0.35}]}><MaterialIcons name="skip-next" size={20} color={c.text}/></Pressable>
      </View>
    </View>
  </View>;
}
