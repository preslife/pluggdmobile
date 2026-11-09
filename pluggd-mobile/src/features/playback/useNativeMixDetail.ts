import { useCallback, useRef, useState, useSyncExternalStore } from 'react';
import { AppState } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { mixAccessSession, type MixAccessScope } from './mixAccessSession';
import { NativeMixAccessError, NATIVE_MIX_METADATA_MAX_AGE_MS } from './nativeMixAccess';
import { readNativeMixDetail, readPublicNativeMixTracklist, type NativeMixDetail } from './nativeMixDetail';

const subscribe = (changed: () => void) => mixAccessSession.subscribe(() => changed());
const snapshot = () => mixAccessSession.version();
export function useMixSessionIdentity(): { key: string; ready: boolean } {
  useSyncExternalStore(subscribe, snapshot, snapshot);
  let ready = true;
  try { mixAccessSession.scope(); } catch { ready = false; }
  return { key: mixAccessSession.identityKey(), ready };
}

type DetailState = {
  identity: string;
  scope: MixAccessScope | null;
  detail: NativeMixDetail | null;
  phase: 'loading' | 'ready' | 'unavailable' | 'error';
  refreshing: boolean;
  tracklistLoading: boolean;
  tracklistError: boolean;
};

/** Focus-scoped, memory-only detail state. Private data is never a React Query
 * cache entry, route payload or direct-table fallback. Public audio can render
 * while its independent fallback tracklist is still loading/retrying.
 */
export function useNativeMixDetail(reference: string, accessKey?: string) {
  const identity = useMixSessionIdentity();
  const context = `${identity.key}|${reference}|${accessKey ?? ''}`;
  const [state, setState] = useState<DetailState>({ identity: context, scope: null, detail: null,
    phase: 'loading', refreshing: false, tracklistLoading: false, tracklistError: false });
  const latest = useRef(state);
  latest.current = state;
  const liveContext = useRef(context);
  liveContext.current = context;
  const retry = useRef<() => Promise<void>>(async () => undefined);
  const retryTracklist = useRef<() => Promise<void>>(async () => undefined);
  const focused = useRef(false);

  useFocusEffect(useCallback(() => {
    if (!identity.ready) return;
    focused.current = true;
    let alive = true;
    let generation = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let inFlight: Promise<void> | null = null;
    let tracklistFlight: { generation: number; promise: Promise<void> } | null = null;
    const scope = mixAccessSession.scope();
    const current = () => alive && liveContext.current === context && mixAccessSession.current(scope);
    const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };

    const loadTracklist = async (detail?: NativeMixDetail) => {
      if (tracklistFlight?.generation === generation) return tracklistFlight.promise;
      const value = detail ?? latest.current.detail;
      if (!current() || !value?.public || value.protocol !== 'public-fallback') return;
      const request = generation;
      setState(s => s.identity === context ? { ...s, tracklistLoading: true, tracklistError: false } : s);
      const promise = (async () => {
        try {
          const updated = await readPublicNativeMixTracklist(value, scope);
          if (current() && request === generation) setState(s => s.identity === context
            ? { ...s, detail: updated, tracklistLoading: false, tracklistError: false } : s);
        } catch {
          if (current() && request === generation) setState(s => s.identity === context
            ? { ...s, tracklistLoading: false, tracklistError: true } : s);
        }
      })().finally(() => { if (tracklistFlight?.generation === request) tracklistFlight = null; });
      tracklistFlight = { generation: request, promise };
      return promise;
    };

    const load = () => {
      if (inFlight || !current() || AppState.currentState !== 'active') return inFlight ?? Promise.resolve();
      clearTimer();
      const request = ++generation;
      const previous = latest.current.identity === context ? latest.current.detail : null;
      setState(s => s.identity === context ? { ...s, refreshing: Boolean(s.detail), phase: s.detail ? s.phase : 'loading' }
        : { identity: context, scope, detail: null, phase: 'loading', refreshing: false, tracklistLoading: false, tracklistError: false });
      inFlight = (async () => {
        try {
          const detail = await readNativeMixDetail(reference, accessKey);
          if (!current() || request !== generation) return;
          setState({ identity: context, scope, detail, phase: 'ready', refreshing: false,
            tracklistLoading: detail.protocol === 'public-fallback', tracklistError: false });
          if (detail.protocol === 'public-fallback') void loadTracklist(detail);
        } catch (error) {
          // A current private read failure invalidates that permission even if
          // the screen blurred during the request; audio must not keep stale access.
          if (mixAccessSession.current(scope) && previous?.playbackAccess) {
            mixAccessSession.invalidateAuthorization(previous.playbackAccess.authorizationId);
          }
          if (!current() || request !== generation) return;
          const unavailable = error instanceof NativeMixAccessError && error.reason === 'notFound';
          setState({ identity: context, scope, detail: null, phase: unavailable ? 'unavailable' : 'error',
            refreshing: false, tracklistLoading: false, tracklistError: false });
        } finally {
          if (current() && request === generation && AppState.currentState === 'active') {
            timer = setTimeout(() => { timer = undefined; void load(); }, NATIVE_MIX_METADATA_MAX_AGE_MS);
          }
        }
      })().finally(() => { inFlight = null; });
      return inFlight;
    };
    retry.current = load;
    retryTracklist.current = () => loadTracklist();
    const subscription = AppState.addEventListener('change', next => {
      if (next === 'active') void load();
      else clearTimer();
    });
    void load();
    return () => {
      alive = false; generation++; focused.current = false; clearTimer(); subscription.remove();
      retry.current = async () => undefined;
      retryTracklist.current = async () => undefined;
    };
  }, [context, identity.ready, reference, accessKey]));

  const value = state.identity === context && state.scope && mixAccessSession.current(state.scope) ? state.detail : null;
  const permitted = value?.public || (value?.playbackAccess && mixAccessSession.authorized(value.mix.id, value.playbackAccess));
  const detail = permitted ? value : null;
  const phase = !identity.ready || state.identity !== context ? 'loading'
    : value && !permitted ? 'unavailable' : state.phase;
  return {
    detail, phase, refreshing: state.refreshing, tracklistLoading: state.tracklistLoading,
    tracklistError: state.tracklistError,
    retry: () => retry.current(), retryTracklist: () => retryTracklist.current(),
    isCurrent: () => {
      const now = latest.current;
      return focused.current && liveContext.current === context && now.identity === context
        && Boolean(now.scope && mixAccessSession.current(now.scope))
        && Boolean(now.detail && (now.detail.public || (now.detail.playbackAccess && mixAccessSession.authorized(now.detail.mix.id, now.detail.playbackAccess))));
    },
  };
}
