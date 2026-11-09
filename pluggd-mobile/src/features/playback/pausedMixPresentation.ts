import type { PluggdTrack } from '../../context/PlaybackProvider';
import { mixAccessSession } from './mixAccessSession';
import { nativeMixAccess, NATIVE_MIX_METADATA_MAX_AGE_MS } from './nativeMixAccess';
import { hasCurrentMixAccess } from './protectedMixPlayback';
import { runNativeQueueMutation } from './nativeQueueMutation';

type MetadataPlayer = {
  getActiveTrack(): Promise<unknown>;
  getActiveTrackIndex(): Promise<number | undefined>;
  updateMetadataForTrack(index: number, metadata: { title: string; artist: string; artwork: string; duration?: number }): Promise<unknown>;
};

/** One foreground paused watcher in the shared provider. Playing/background
 * audio uses its existing source-renewal owner. Native metadata updates never
 * replace a source, move the timeline or issue play/pause commands.
 */
export function createPausedMixPresentation({ player, isForeground, prepareTrack, onUpdated, onPending, onFailure }: {
  player: MetadataPlayer;
  isForeground: () => boolean;
  prepareTrack: (track: PluggdTrack) => PluggdTrack;
  onUpdated: () => void;
  onPending: (pending: boolean) => void;
  onFailure: (track: PluggdTrack) => void;
}) {
  let disposed = false;
  let source: PluggdTrack | null = null;
  let playing = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let inFlight: { key: string; promise: Promise<void> } | null = null;
  const key = (track: PluggdTrack | null) => track?.mixAccess ? `${track.mixId || track.id}|${track.mixAccess.authorizationId}` : '';
  const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const current = (expected: PluggdTrack) => !disposed && key(source) === key(expected) && hasCurrentMixAccess(expected);
  const readTime = (track: PluggdTrack): number | undefined => {
    const cached = track.mixAccess ? nativeMixAccess.presentation(track.mixId || track.id, track.mixAccess) : undefined;
    const values = [cached?.mixMetadataReadAt, track.mixMetadataReadAt].filter((value): value is number => typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Date.now());
    return values.length ? Math.max(...values) : undefined;
  };
  const arm = () => {
    clearTimer();
    if (disposed || playing || !isForeground() || !source?.mixAccess || !hasCurrentMixAccess(source)) return;
    const expected = source;
    if (inFlight?.key === key(expected)) return;
    const readAt = readTime(expected);
    const delay = readAt !== undefined ? Math.max(0, readAt + NATIVE_MIX_METADATA_MAX_AGE_MS - Date.now()) : 0;
    timer = setTimeout(() => { timer = undefined; void refresh(expected); }, delay);
  };
  const refresh = (expected: PluggdTrack, force = false): Promise<void> => {
    const requestKey = key(expected);
    if (inFlight?.key === requestKey) return inFlight.promise;
    if (!current(expected) || (!force && playing) || !isForeground() || !expected.mixAccess) return Promise.resolve();
    // A playing-source/detail read may have completed after this timer was
    // armed. Reuse it rather than send a second metadata request.
    const readAt = readTime(expected);
    if (!force && readAt !== undefined && Date.now() - readAt < NATIVE_MIX_METADATA_MAX_AGE_MS) {
      onUpdated(); arm(); return Promise.resolve();
    }
    onPending(true);
    const access = expected.mixAccess;
    const id = expected.mixId || expected.id;
    const promise = (async () => {
      try {
        const value = await nativeMixAccess.refreshPresentation(id, access);
        if (!current(expected)) return;
        // Publish the validated memory presentation even if the bridge fails;
        // a failed native update is never treated as a successful OS update.
        onUpdated();
        await runNativeQueueMutation(async () => {
          if (!current(expected)) return;
          const index = await player.getActiveTrackIndex();
          const active = await player.getActiveTrack() as PluggdTrack | undefined;
          if (index === undefined || !current(expected) || key(active ?? null) !== requestKey) return;
          const metadata = prepareTrack({ ...expected, ...value });
          await player.updateMetadataForTrack(index, { title: metadata.title, artist: metadata.artist,
            artwork: metadata.artwork || '', ...(metadata.duration !== undefined ? { duration: metadata.duration } : {}) });
        });
      } catch {
        if (current(expected)) onFailure(expected);
        // An old read cannot affect another account; a genuine denial still
        // invalidates its own queued permission after navigation/unmount.
        if (mixAccessSession.current(access.scope)) mixAccessSession.invalidateAuthorization(access.authorizationId);
      }
    })().finally(() => {
      if (inFlight?.promise !== promise) return;
      inFlight = null;
      if (!disposed) { onPending(false); arm(); }
    });
    inFlight = { key: requestKey, promise };
    return promise;
  };
  return {
    watch(track: PluggdTrack | null, isPlaying: boolean) {
      if (key(source) !== key(track) || !hasCurrentMixAccess(track)) onPending(false);
      source = track; playing = isPlaying; arm();
    },
    refresh() { return source ? refresh(source, true) : Promise.resolve(); },
    foregroundChanged() { arm(); },
    dispose() { disposed = true; clearTimer(); },
  };
}
