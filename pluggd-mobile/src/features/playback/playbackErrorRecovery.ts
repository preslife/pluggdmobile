type RecoveryTrack = {
  id?: unknown;
  url: string;
  playbackSource?: { originalUrl: string; expiresAt: number | null };
};
type RecoveryPlayer = {
  getActiveTrack: () => Promise<RecoveryTrack | undefined>;
  getPlayWhenReady?: () => Promise<boolean>;
  getPlaybackState?: () => Promise<{ state: unknown }>;
  retry?: () => Promise<unknown>;
  load?: (track: RecoveryTrack) => Promise<unknown>;
  seekTo?: (position: number) => Promise<void>;
  getProgress?: () => Promise<{ position: number }>;
  getActiveTrackIndex?: () => Promise<number | undefined>;
};

const TRANSIENT_ERRORS = new Set([
  'ios_not_connected_to_internet',
  'ios_failed_to_load_resource',
  'ios_playback_failed',
]);

function trackKey(track?: RecoveryTrack | null) {
  return track && typeof track.id === 'string' && typeof track.url === 'string'
    ? `${track.id}\u0000${track.url}`
    : null;
}

/** One transient retry per source/intent; expiring credentials renew once per
 * source URL. Replace only the active item, never rebuild or resume a queue.
 */
export function createPlaybackErrorRecovery({
  player,
  isForeground,
  reportFailure,
  refreshSource,
  needsSourceRefresh,
  onSourceRefreshed,
  keepCurrentSource,
  retrySourceFailure,
  sourceExpiry,
  sourceDeadline,
  onSourceExpired,
}: {
  player: RecoveryPlayer;
  isForeground: () => boolean;
  reportFailure: () => void;
  refreshSource?: (track: RecoveryTrack) => Promise<RecoveryTrack | null>;
  needsSourceRefresh?: (track: RecoveryTrack) => boolean;
  sourceExpiry?: (track: RecoveryTrack) => number | null | undefined;
  sourceDeadline?: (track: RecoveryTrack) => number | null;
  onSourceExpired?: (track: RecoveryTrack) => void;
  retrySourceFailure?: (track: RecoveryTrack) => number | null;
  keepCurrentSource?: (previous: RecoveryTrack, next: RecoveryTrack) => boolean;
  onSourceRefreshed?: (previous: RecoveryTrack, next: RecoveryTrack, index: number) => void;
}) {
  let generation = 0;
  let timer: ReturnType<typeof setTimeout> | null = null;
  let expiryTimer: ReturnType<typeof setTimeout> | null = null;
  let deadlineTimer: ReturnType<typeof setTimeout> | null = null;
  let phase: 'idle' | 'waiting' | 'refreshing' | 'retrying' | 'attempted' | 'recovered' | 'exhausted' = 'idle';
  let usedRetry = false;
  let pendingFailure = false;
  let disposed = false;
  let suspended = false;
  let lastRenewalKey: string | null = null;
  let replacement: { key: string | null; index: number } | null = null;
  let replacementOwner: number | null = null;
  let replacementError: { code: string; position: number } | null = null;
  const isCurrent = (request: number) => !disposed && request === generation && phase !== 'exhausted';

  const showPendingFailure = () => {
    if (!disposed && pendingFailure && isForeground()) {
      pendingFailure = false;
      reportFailure();
    }
  };

  const fail = () => {
    if (phase === 'exhausted' || disposed) return;
    phase = 'exhausted';
    pendingFailure = true;
    showPendingFailure();
  };

  const cancel = (resetBudget = true) => {
    generation++;
    if (timer !== null) clearTimeout(timer);
    if (expiryTimer !== null) clearTimeout(expiryTimer);
    if (deadlineTimer !== null) clearTimeout(deadlineTimer);
    deadlineTimer = null;
    timer = null;
    expiryTimer = null;
    pendingFailure = false;
    replacementOwner = null;
    replacementError = null;
    if (resetBudget) { usedRetry = false; lastRenewalKey = null; }
    suspended = !resetBudget;
    phase = usedRetry ? 'recovered' : 'idle';
  };

  const canRenew = () => Boolean(refreshSource && needsSourceRefresh && player.load && player.seekTo && player.getProgress && player.getActiveTrackIndex && player.getPlayWhenReady);

  const watchSource = (track: RecoveryTrack | null | undefined, playing: boolean) => {
    if (expiryTimer !== null) clearTimeout(expiryTimer);
    expiryTimer = null;
    if (deadlineTimer !== null) clearTimeout(deadlineTimer);
    deadlineTimer = null;
    const deadline = track && sourceDeadline?.(track);
    if (track && playing && !disposed && !suspended && typeof deadline === 'number' && Number.isFinite(deadline)) {
      const request = generation;
      const expected = trackKey(track);
      deadlineTimer = setTimeout(() => {
        deadlineTimer = null;
        void (async () => {
          const [active, wants] = await Promise.all([player.getActiveTrack(), player.getPlayWhenReady?.()]);
          if (!isCurrent(request) || !active || !wants || trackKey(active) !== expected) return;
          const currentDeadline = sourceDeadline?.(active);
          if (typeof currentDeadline === 'number' && Date.now() >= currentDeadline) {
            onSourceExpired?.(active);
            fail();
          }
        })().catch(() => undefined);
      }, Math.max(0, deadline - Date.now()));
    }
    const expiry = track && sourceExpiry ? sourceExpiry(track) : track?.playbackSource?.expiresAt;
    if (!track || !playing || disposed || suspended || phase === 'exhausted' || !canRenew()
      || typeof expiry !== 'number' || !Number.isFinite(expiry) || trackKey(track) === lastRenewalKey) return;
    const request = generation;
    expiryTimer = setTimeout(() => {
      expiryTimer = null;
      if (!isCurrent(request) || phase === 'refreshing' || phase === 'waiting' || phase === 'retrying') return;
      void renewWithRetry(track, request);
    }, Math.max(0, expiry - 30_000 - Date.now()));
  };

  const renewWithRetry = async (track: RecoveryTrack, request: number): Promise<void> => {
    try { await renewSource(track, request, 0); }
    catch {
      if (!isCurrent(request)) return;
      const delay = retrySourceFailure?.(track);
      if (typeof delay === 'number' && Number.isFinite(delay) && delay > 0) {
        phase = 'idle'; lastRenewalKey = null;
        expiryTimer = setTimeout(() => {
          expiryTimer = null;
          if (isCurrent(request)) void renewWithRetry(track, request);
        }, delay);
      } else fail();
    }
  };

  const renewSource = async (track: RecoveryTrack, request: number, fallbackPosition: number) => {
    const expected = trackKey(track);
    if (!canRenew() || !expected || lastRenewalKey === expected) throw new Error('Audio source cannot be renewed again');
    lastRenewalKey = expected;
    phase = 'refreshing';
    const next = await refreshSource!(track);
    if (!isCurrent(request)) return;
    if (!next || (trackKey(next) === expected && !keepCurrentSource?.(track, next)) || (typeof next.playbackSource?.expiresAt === 'number' && next.playbackSource.expiresAt <= Date.now() + 30_000)) {
      throw new Error('No fresh authorized audio source');
    }
    const [active, wantsPlayback, progress, index] = await Promise.all([
      player.getActiveTrack(), player.getPlayWhenReady!(), player.getProgress!(), player.getActiveTrackIndex!(),
    ]);
    if (!isCurrent(request)) return;
    if (trackKey(active) !== expected || !wantsPlayback || !Number.isInteger(index) || index! < 0) {
      cancel(false);
      return;
    }
    // A failed AVPlayer item can report zero after having made progress.
    // Error recovery supplies the retained position; proactive renewal passes
    // zero and trusts the live native position, including a genuine start.
    const position = Number.isFinite(progress.position) && progress.position > 0
      ? progress.position : Math.max(0, fallbackPosition || 0);
    if (trackKey(next) === expected && keepCurrentSource?.(track, next)) {
      // A successful canonical/TTL acknowledgement may retain exactly the same
      // URL. Update its proof and schedule without disturbing audible native audio.
      onSourceRefreshed?.(track, next, index!);
      lastRenewalKey = null;
      phase = 'recovered';
      watchSource(next, true);
      return;
    }
    phase = 'retrying';
    replacement = { key: trackKey(next), index: index! };
    replacementOwner = request;
    // Dispatch together, without an intervening await. Native preserves
    // playWhenReady; its seek is deferred while loading. Any newer user seek,
    // pause, stop or track change is dispatched after both and keeps precedence.
    const loading = player.load!(next);
    const seeking = player.seekTo!(position);
    let replayError: { code: string; position: number } | null = null;
    try {
      await Promise.all([loading, seeking]);
    } finally {
      if (replacementOwner === request) {
        replayError = replacementError;
        replacementOwner = null;
        replacementError = null;
      }
    }
    if (!isCurrent(request)) return;
    onSourceRefreshed?.(track, next, index!);
    usedRetry = false;
    phase = 'recovered';
    watchSource(next, true);
    if (replayError) onError(replayError, next, position);
  };

  const onError = (error: { code: string }, track?: RecoveryTrack | null, position = 0) => {
    if (disposed || suspended || phase === 'exhausted' || phase === 'waiting' || phase === 'refreshing') return;
    if (replacementOwner !== null) {
      replacementError = { code: error.code, position };
      return;
    }
    const expectedTrack = trackKey(track);
    if (!expectedTrack) return;
    const renew = Boolean(track && canRenew() && needsSourceRefresh!(track) && expectedTrack !== lastRenewalKey);
    if ((!renew && usedRetry) || !TRANSIENT_ERRORS.has(error.code)
      || !player.retry || !player.getPlayWhenReady || !player.getPlaybackState) {
      fail();
      return;
    }
    phase = 'waiting';
    const request = generation;
    timer = setTimeout(() => {
      timer = null;
      void (async () => {
        try {
          const [active, wantsPlayback, state] = await Promise.all([
            player.getActiveTrack(), player.getPlayWhenReady!(), player.getPlaybackState!(),
          ]);
          if (!isCurrent(request)) return;
          if (trackKey(active) !== expectedTrack || !wantsPlayback) {
            cancel(false);
            return;
          }
          if (state.state !== 'error') {
            phase = 'idle';
            return;
          }
          if (renew) {
            await renewSource(active!, request, position);
            return;
          }
          usedRetry = true;
          phase = 'retrying';
          // Native iOS reload(startFromCurrentTime:true) retains the item,
          // position and playWhenReady. Do not call play() after this await:
          // a user pause/stop/track change must always keep its newer intent.
          await player.retry!();
          if (isCurrent(request) && phase === 'retrying') phase = 'attempted';
        } catch {
          if (isCurrent(request)) fail();
        }
      })();
    }, 1200);
  };

  return {
    activate() { disposed = false; suspended = false; },
    onError,
    watchSource,
    onTrackChanged(event: { index?: number; lastIndex?: number; track?: RecoveryTrack; lastTrack?: RecoveryTrack }) {
      if (replacement && event.index === replacement.index && trackKey(event.track) === replacement.key && event.index === event.lastIndex) {
        replacement = null;
        return;
      }
      if (event.index !== event.lastIndex || trackKey(event.track) !== trackKey(event.lastTrack)) cancel();
    },
    cancel,
    showPendingFailure,
    onState(state: unknown) {
      if (state === 'paused' || state === 'stopped' || state === 'none' || state === 'ended') cancel(false);
      else if (state === 'playing' && usedRetry && phase !== 'exhausted') phase = 'recovered';
    },
    dispose() {
      cancel(false);
      disposed = true;
    },
  };
}
