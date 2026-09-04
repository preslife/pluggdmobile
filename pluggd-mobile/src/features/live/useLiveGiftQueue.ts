import { useCallback, useEffect, useLayoutEffect, useReducer } from 'react';
import type { LiveGiftEvent } from './liveGiftPresentation';

export const MAX_PENDING_LIVE_GIFTS = 20;
export const LIVE_GIFT_EFFECT_TIMEOUT_MS = 5200;
export const REDUCED_MOTION_GIFT_TIMEOUT_MS = 2400;

export type LiveGiftQueueState = {
  active: LiveGiftEvent | null;
  pending: LiveGiftEvent[];
  seenEventIds: ReadonlySet<string>;
};

export type LiveGiftQueueAction =
  | { type: 'enqueue'; event: LiveGiftEvent }
  | { type: 'complete'; eventId: string }
  | { type: 'seed'; eventIds: readonly string[] }
  | { type: 'clear' };

export function createLiveGiftQueueState(): LiveGiftQueueState {
  return { active: null, pending: [], seenEventIds: new Set<string>() };
}

export function reduceLiveGiftQueue(
  state: LiveGiftQueueState,
  action: LiveGiftQueueAction,
): LiveGiftQueueState {
  if (action.type === 'clear') return createLiveGiftQueueState();

  if (action.type === 'seed') {
    const seenEventIds = new Set(state.seenEventIds);
    action.eventIds.filter(Boolean).forEach((id) => seenEventIds.add(id));
    return { ...state, seenEventIds };
  }

  if (action.type === 'complete') {
    if (!state.active || state.active.id !== action.eventId) return state;
    const [active = null, ...pending] = state.pending;
    return { ...state, active, pending };
  }

  const { event } = action;
  if (!event.id || state.seenEventIds.has(event.id)) return state;

  const seenEventIds = new Set(state.seenEventIds);
  seenEventIds.add(event.id);
  if (!state.active) return { active: event, pending: [], seenEventIds };
  if (state.pending.length >= MAX_PENDING_LIVE_GIFTS) return { ...state, seenEventIds };
  return { ...state, pending: [...state.pending, event], seenEventIds };
}

export function useLiveGiftQueue({
  resetKey,
  reducedMotion,
}: {
  resetKey: string;
  reducedMotion: boolean;
}) {
  const [state, dispatch] = useReducer(reduceLiveGiftQueue, undefined, createLiveGiftQueueState);

  const enqueue = useCallback((event: LiveGiftEvent) => {
    dispatch({ type: 'enqueue', event });
  }, []);

  const seedSeen = useCallback((eventIds: readonly string[]) => {
    dispatch({ type: 'seed', eventIds });
  }, []);

  const complete = useCallback((eventId: string) => {
    dispatch({ type: 'complete', eventId });
  }, []);

  const clear = useCallback(() => {
    dispatch({ type: 'clear' });
  }, []);

  useLayoutEffect(() => {
    dispatch({ type: 'clear' });
  }, [resetKey]);

  useEffect(() => {
    if (!state.active) return;
    const eventId = state.active.id;
    const timeout = setTimeout(
      () => dispatch({ type: 'complete', eventId }),
      reducedMotion ? REDUCED_MOTION_GIFT_TIMEOUT_MS : LIVE_GIFT_EFFECT_TIMEOUT_MS,
    );
    return () => clearTimeout(timeout);
  }, [reducedMotion, state.active]);

  return {
    active: state.active,
    pendingCount: state.pending.length,
    enqueue,
    seedSeen,
    complete,
    clear,
  };
}
