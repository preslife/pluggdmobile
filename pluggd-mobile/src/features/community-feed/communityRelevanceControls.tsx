import { useEffect, useRef } from 'react';
import { ActivityIndicator, Alert, AppState, Platform, Pressable, StyleSheet, Switch, Text, View, useWindowDimensions } from 'react-native';
import TrackPlayer from 'react-native-track-player';
import { usePlayback } from '../../context/PlaybackProvider';
import { pluggdFonts } from '../../design/typography';
import { usePluggdTheme } from '../../design/usePluggdTheme';
import { createRecommendationVisibilityGate, NativeRelevanceController, type RelevanceState } from './communityRelevanceController';
import { AudioProgressQualification, RECOMMENDATION_REASONS, canCollectRecommendations, type NativeFeedMode } from './communityRelevanceModel';
import { useNativeRelevance } from './useNativeRelevance';
import type { MobileSocialPost } from '../culture/mobileTypes';

export function recommendationTabProps<T extends string>(active: boolean, index: number, values: T[], select: (value: T) => void) {
  if (Platform.OS !== 'web') return {};
  return { 'aria-selected': active, tabIndex: active ? 0 : -1, onKeyDown: (event: any) => {
    let next: number;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % values.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + values.length - 1) % values.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = values.length - 1;
    else return;
    event.preventDefault(); select(values[next]);
    event.currentTarget.parentElement?.querySelectorAll('[role="tab"]')[next]?.focus();
  } } as any;
}

export function RecommendationModes({ state, onChange, signedIn, includeLatest = true }: { state: RelevanceState; onChange: (mode: NativeFeedMode) => void; signedIn: boolean; includeLatest?: boolean }) {
  const theme = usePluggdTheme();
  const modes: NativeFeedMode[] = includeLatest ? ['latest', 'for-you', 'following'] : ['for-you', 'following'];
  if (!signedIn) return <View style={styles.modes}><Text style={[styles.modeText, { color: theme.colors.text, paddingVertical: 14 }]}>Latest</Text></View>;
  return <View style={[styles.modes, { borderColor: theme.colors.border }]} accessibilityRole="tablist">
    {modes.map((mode, index) => {
      const active = state.mode === mode;
      const label = mode === 'latest' ? 'Latest' : mode === 'following' ? 'Following' : state.context?.personalization_enabled === false ? 'Popular' : 'For You';
      return <Pressable key={mode} {...recommendationTabProps(active, index, modes, onChange)} accessibilityRole="tab" accessibilityLabel={`${label} feed`} accessibilityState={{ selected: active }} onPress={() => onChange(mode)} style={[styles.mode, { backgroundColor: active ? theme.colors.accentSoft : 'transparent', borderBottomColor: active ? theme.colors.accentText : 'transparent' }]}><Text style={[styles.modeText, { color: active ? theme.colors.text : theme.colors.textMuted }]}>{label}</Text></Pressable>;
    })}
  </View>;
}
export function RecommendationStatus({ state, controller }: { state: RelevanceState; controller: NativeRelevanceController }) {
  const theme = usePluggdTheme();
  return <View style={styles.status}>
    {state.notice ? <View style={styles.statusRow}><Text accessibilityLiveRegion="polite" style={[styles.body, { color: theme.colors.text }]}>{state.notice}</Text>{state.undo ? <Pressable accessibilityRole="button" disabled={state.busy || state.loading} onPress={() => void controller.undo()} style={styles.button}><Text style={[styles.action, { color: theme.colors.accentText }]}>Undo</Text></Pressable> : null}</View> : null}
    {state.error ? <View style={styles.statusRow}><Text accessibilityLiveRegion="assertive" style={[styles.body, { color: theme.colors.text }]}>{state.error}</Text><Pressable accessibilityRole="button" onPress={() => void controller.refresh()} style={styles.button}><Text style={[styles.action, { color: theme.colors.accentText }]}>Retry</Text></Pressable></View> : null}
    {!state.loading && state.mode === 'for-you' && !state.context ? <Text style={[styles.body, { color: theme.colors.textMuted }]}>Showing Latest while recommendation settings are unavailable.</Text> : null}
    {!state.loading && state.mode === 'for-you' && state.context?.personalization_enabled && !state.context.use_v3 && !state.context.legacy_affinity_allowed ? <Text style={[styles.body, { color: theme.colors.textMuted }]}>Showing Latest until personalized recommendations are available.</Text> : null}
    {!state.loading && state.mode === 'for-you' && state.context?.personalization_enabled === false ? <Text style={[styles.body, { color: theme.colors.textMuted }]}>{state.context.use_v3 ? 'Popular uses public Community activity. Personalization is off.' : 'Personalization is off. Showing Latest.'}</Text> : null}
  </View>;
}
export function RecommendationMore({ state, controller }: { state: RelevanceState; controller: NativeRelevanceController }) {
  const theme = usePluggdTheme();
  if (!state.hasMore) return null;
  return <Pressable accessibilityRole="button" accessibilityLabel={state.loadingMore ? 'Loading more posts' : 'Load more posts'} disabled={state.loadingMore} onPress={() => void controller.more()} style={[styles.more, { borderColor: theme.colors.border }]}>{state.loadingMore ? <ActivityIndicator color={theme.colors.accentText} /> : <Text style={[styles.action, { color: theme.colors.accentText }]}>Load more posts</Text>}</Pressable>;
}

export function RecommendationPrivacy() {
  const { state, controller, actorId } = useNativeRelevance('latest', true, true);
  const theme = usePluggdTheme();
  const disabled = state.loading || state.busy;
  const reset = () => Alert.alert('Reset recommendation history?', 'Clear recommendation history and hidden recommendations. Your follows, posts, likes and saved items are kept.', [
    { text: 'Cancel', style: 'cancel' }, { text: 'Reset history', onPress: () => void controller.reset() },
  ]);
  return <View style={styles.privacy}>
    <Text style={[styles.kicker, { color: theme.colors.textSubtle }]}>COMMUNITY RECOMMENDATIONS</Text>
    {state.notice || state.error ? <RecommendationStatus state={state} controller={controller} /> : null}
    {!actorId ? <Text style={[styles.body, { color: theme.colors.textMuted }]}>Sign in to manage recommendations.</Text> : state.loading ? <View style={styles.statusRow}><ActivityIndicator color={theme.colors.accentText} /><Text style={[styles.body, { color: theme.colors.textMuted }]}>Loading recommendation settings…</Text></View> : !state.context ? <View style={styles.statusRow}><Text style={[styles.body, { color: theme.colors.textMuted }]}>Recommendation settings are unavailable. Your feed uses Latest.</Text><Pressable accessibilityRole="button" onPress={() => void controller.refresh()} style={styles.button}><Text style={[styles.action, { color: theme.colors.accentText }]}>Retry</Text></Pressable></View> : <>
      <View style={[styles.preferenceRow, { borderColor: theme.colors.border }]}><View style={styles.copy}><Text style={[styles.title, { color: theme.colors.text }]}>Personalize For You</Text><Text style={[styles.body, { color: theme.colors.textMuted }]}>Use your Community activity and interests to recommend posts. Turn off to use public Popular activity.</Text></View><Switch thumbColor="#FFFFFF" accessibilityLabel="Personalize For You" value={state.context.personalization_enabled} disabled={disabled} onValueChange={value => void controller.preference(value)} trackColor={{ false: theme.colors.surfaceAlt, true: theme.colors.accentFill }} /></View>
      <Pressable accessibilityRole="button" disabled={disabled} onPress={reset} style={[styles.reset, { borderBottomColor: theme.colors.border }]}><Text style={[styles.title, { color: theme.colors.text }]}>Reset recommendation history</Text><Text style={[styles.body, { color: theme.colors.textMuted }]}>Start fresh. Your follows and saved items stay yours.</Text></Pressable>
      <Text style={[styles.body, { color: theme.colors.textMuted }]}>Recommendation activity and hidden recommendations are kept for up to 90 days.</Text>
    </>}
  </View>;
}

/** Native measurement / web IntersectionObserver measure actual card visibility. */
export function RecommendationPost({ post, state, controller, children }: { post: MobileSocialPost; state: RelevanceState; controller: NativeRelevanceController; children: React.ReactNode }) {
  const theme = usePluggdTheme();
  const ref = useRef<View>(null);
  const dimensions = useWindowDimensions();
  const metadata = state.metadata[post.id];
  const collecting = state.mode === 'for-you' && canCollectRecommendations(state.context) && !!metadata;
  useEffect(() => {
    if (!collecting) return;
    const visibility = createRecommendationVisibilityGate(controller.prepareVisibility(post.id));
    if (Platform.OS === 'web') {
      const element = ref.current as unknown as Element;
      if (!element || typeof IntersectionObserver === 'undefined') { visibility.dispose(); return; }
      const observer = new IntersectionObserver(entries => visibility.visible(entries.some(entry => entry.isIntersecting && entry.intersectionRatio >= 0.5)), { threshold: [0, 0.5, 1] });
      observer.observe(element);
      return () => { visibility.dispose(); observer.disconnect(); };
    }
    const measure = () => visibility.sample(done => ref.current?.measureInWindow((_x, y, _width, height) => {
      const visible = Math.min(y + height, dimensions.height) - Math.max(y, 0);
      done(height > 0 && visible / height >= 0.5 && AppState.currentState === 'active');
    }));
    measure();
    const timer = setInterval(measure, 500);
    return () => { visibility.dispose(); clearInterval(timer); };
  }, [collecting, controller, post.id, dimensions.height, metadata?.requestId, state.context?.epoch]);
  return <View ref={ref} collapsable={false}>
    {metadata ? <View style={styles.reasonRow}><Text style={[styles.reason, { color: theme.colors.textMuted }]}>{RECOMMENDATION_REASONS[metadata.reason]}</Text><Pressable accessibilityRole="button" accessibilityLabel="Recommendation options" disabled={state.busy || state.loading} onPress={() => Alert.alert('Tune your recommendations', undefined, [{ text: 'Not interested', onPress: () => void controller.suppress(post.id, 'post') }, { text: 'Show fewer from this creator', onPress: () => void controller.suppress(post.id, 'author') }, { text: 'Cancel', style: 'cancel' }])} style={styles.button}><Text style={[styles.action, { color: theme.colors.accentText }]}>Fine-tune</Text></Pressable></View> : null}
    {children}
    {collecting && post.audio ? <RecommendationAudioProgress post={post} controller={controller} /> : null}
  </View>;
}
function RecommendationAudioProgress({ post, controller }: { post: MobileSocialPost; controller: NativeRelevanceController }) {
  const { currentTrack, isPlaying, progress } = usePlayback();
  const qualification = useRef(new AudioProgressQualification());
  const revision = useRef(0);
  useEffect(() => {
    const sampleRevision = ++revision.current;
    if (currentTrack?.id !== `social-audio-${post.id}` || currentTrack.url !== post.audio || !isPlaying || AppState.currentState !== 'active') { qualification.current.reset(); return; }
    void TrackPlayer.getVolume().then(volume => {
      if (sampleRevision !== revision.current) return;
      const elapsed = qualification.current.sample(currentTrack.id, progress.position, isPlaying, volume, AppState.currentState === 'active');
      if (elapsed >= 10_000) controller.audio(post.id, elapsed);
    }).catch(() => { if (sampleRevision === revision.current) qualification.current.reset(); });
    return () => { ++revision.current; };
  }, [controller, post.id, post.audio, currentTrack?.id, currentTrack?.url, isPlaying, progress.position]);
  useEffect(() => () => qualification.current.reset(), []);
  return null;
}
const styles = StyleSheet.create({
  modes: { flexDirection: 'row', marginHorizontal: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  mode: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', borderBottomWidth: 2, borderTopLeftRadius: 10, borderTopRightRadius: 10 },
  modeText: { fontFamily: pluggdFonts.satoshiBold, fontSize: 14 },
  status: { gap: 8, paddingHorizontal: 16 }, statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  body: { fontFamily: pluggdFonts.satoshiMedium, fontSize: 13, lineHeight: 20, flexShrink: 1 },
  action: { fontFamily: pluggdFonts.satoshiBold, fontSize: 14 }, button: { minHeight: 44, minWidth: 44, justifyContent: 'center', alignItems: 'center' },
  more: { margin: 16, minHeight: 48, borderWidth: 1, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  privacy: { gap: 14, paddingVertical: 14 }, kicker: { fontFamily: pluggdFonts.satoshiBold, fontSize: 11, letterSpacing: 1.2 },
  preferenceRow: { gap: 12, flexDirection: 'row', alignItems: 'center', borderTopWidth: StyleSheet.hairlineWidth, paddingVertical: 16 }, copy: { flex: 1, gap: 5 }, title: { fontFamily: pluggdFonts.satoshiBold, fontSize: 16 }, reset: { minHeight: 72, gap: 5, paddingBottom: 14, borderBottomWidth: StyleSheet.hairlineWidth },
  reasonRow: { marginHorizontal: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  reason: { flex: 1, fontFamily: pluggdFonts.satoshiMedium, fontSize: 12, lineHeight: 18 },
});
