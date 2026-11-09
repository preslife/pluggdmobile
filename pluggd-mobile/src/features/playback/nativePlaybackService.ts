import TrackPlayer, { Event } from 'react-native-track-player';
import type { PluggdTrack } from '../../context/PlaybackProvider';
import { mixAccessSession } from './mixAccessSession';
import { observeMixActor } from './observeMixActor';
import { hasCurrentPlaybackAccess, requiresPlaybackAccess } from './playbackAccess';
import { isReleaseTrack, releaseAgeAccess } from './releaseAgeAccess';
import { currentNativePlaybackIntent, guardedNativePlayback, nativePlaybackIntent, purgeInvalidPrivateMixes, refreshActivePrivateMix } from './nativePlaybackControl';
import { attachPlaybackService } from './playbackServiceOwnership';

let installed: { player: typeof TrackPlayer; dispose: () => void } | undefined;

/** Native remote controls and private expiry survive UI unmount. Bearers are
 * never restored from TrackPlayer metadata; a different JS session fails closed.
 */
export function installNativePlaybackService(player = TrackPlayer): () => void {
  if (installed?.player === player) return installed.dispose;
  let alive = true;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let deadlineTimer: ReturnType<typeof setTimeout> | undefined;
  let schedule = 0;
  let renewing = false;
  let readFailures = 0;
  let releaseRetry: { id: string; url: string; at: number } | undefined;
  let lastTrack: PluggdTrack | undefined;
  const detach = attachPlaybackService();
  const stopObservingActor = observeMixActor();
  const stopObservingReleaseActor = releaseAgeAccess.observe();
  const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const clearDeadline = () => { if (deadlineTimer !== undefined) clearTimeout(deadlineTimer); deadlineTimer = undefined; };
  const armDeadline = (track: PluggdTrack) => {
    clearDeadline();
    if (!isReleaseTrack(track)) return;
    const deadline = releaseAgeAccess.deadline(track);
    if (deadline === null || !Number.isFinite(deadline)) return;
    deadlineTimer = setTimeout(() => {
      deadlineTimer = undefined;
      void (async () => {
        const [active, wants] = await Promise.all([player.getActiveTrack(), player.getPlayWhenReady()]);
        const current = active as PluggdTrack | undefined;
        if (alive && wants && current?.id === track.id && current.url === track.url
          && releaseAgeAccess.authorized(current) && !releaseAgeAccess.playable(current)) {
          await player.pause();
          releaseAgeAccess.reportUnavailable();
        }
      })().catch(() => undefined);
    }, Math.max(0, deadline - Date.now()));
  };
  const failClosed = () => player.pause().catch(() => undefined);

  const renew = async (expected: PluggdTrack, ticket: number, beforeAdvance = false) => {
    if (!alive || renewing || !currentNativePlaybackIntent(ticket)) return;
    renewing = true;
    try {
      const wants = await player.getPlayWhenReady();
      if (alive && wants && currentNativePlaybackIntent(ticket)) {
        const pausedForCheck = beforeAdvance && isReleaseTrack(expected) && !releaseAgeAccess.playable(expected);
        if (pausedForCheck) await player.pause();
        const allowed = await refreshActivePrivateMix(player, expected, ticket);
        if (isReleaseTrack(expected)) releaseRetry = allowed ? undefined : { id: expected.id, url: expected.url, at: Date.now() + 15_000 };
        if (pausedForCheck && allowed && alive && currentNativePlaybackIntent(ticket)) {
          const active = await player.getActiveTrack() as PluggdTrack | undefined;
          if (active?.id === expected.id && releaseAgeAccess.playable(active) && currentNativePlaybackIntent(ticket)) await player.play();
        }
      }
    } catch {
      if (alive && currentNativePlaybackIntent(ticket)) {
        if (isReleaseTrack(expected) && hasCurrentPlaybackAccess(expected) && releaseAgeAccess.playable(expected)) {
          releaseRetry = { id: expected.id, url: expected.url, at: Date.now() + 15_000 };
        } else await failClosed();
      }
    } finally { renewing = false; if (alive) await arm(); }
  };

  const arm = async () => {
    const request = ++schedule;
    clearTimer();
    if (!alive || renewing) return;
    const ticket = nativePlaybackIntent();
    try {
      const [item, wants] = await Promise.all([player.getActiveTrack(), player.getPlayWhenReady()]);
      if (!alive || request !== schedule) return;
      if (!currentNativePlaybackIntent(ticket)) { void arm(); return; }
      if (!wants) { clearDeadline(); return; }
      const track = item as PluggdTrack | undefined;
      lastTrack = track;
      readFailures = 0;
      if (!track || !requiresPlaybackAccess(track)) { clearDeadline(); return; }
      armDeadline(track);
      if (!hasCurrentPlaybackAccess(track)) { await purgeInvalidPrivateMixes(player); return; }
      if (isReleaseTrack(track) && !releaseAgeAccess.playable(track)) { await failClosed(); releaseAgeAccess.reportUnavailable(); return; }
      const expires = track.playbackSource?.expiresAt;
      const retryAt = releaseRetry?.id === track.id && releaseRetry.url === track.url ? releaseRetry.at : 0;
      const releaseRefresh = isReleaseTrack(track) ? releaseAgeAccess.refreshAt(track) : null;
      const releaseDeadline = isReleaseTrack(track) ? releaseAgeAccess.deadline(track) : null;
      const delay = isReleaseTrack(track) && releaseRefresh !== null && releaseDeadline !== null
        ? Math.max(0, Math.min(Math.max(releaseRefresh, retryAt), releaseDeadline) - Date.now())
        : typeof expires === 'number' && Number.isFinite(expires) ? Math.max(0, expires - Date.now() - 30_000) : 0;
      timer = setTimeout(() => {
        timer = undefined;
        if (alive && request === schedule) {
          if (currentNativePlaybackIntent(ticket)) void renew(track, ticket);
          else void arm();
        }
      }, delay);
    } catch {
      if (!alive || request !== schedule) return;
      if (!currentNativePlaybackIntent(ticket)) { void arm(); return; }
      // Recover a transient bridge read before a private grant's 30-second
      // margin runs out. Persistent failure cannot leave a known private stream
      // running; unknown/public startup failures do not pause public music.
      if (++readFailures < 3) {
        timer = setTimeout(() => {
          timer = undefined;
          if (alive && request === schedule) void arm();
        }, 1_000);
      } else if (lastTrack && requiresPlaybackAccess(lastTrack)) {
        if (lastTrack.mixAccess) mixAccessSession.invalidateAuthorization(lastTrack.mixAccess.authorizationId);
        if (!isReleaseTrack(lastTrack) || !releaseAgeAccess.playable(lastTrack)) await failClosed();
        else timer = setTimeout(() => { timer = undefined; if (alive) void arm(); }, 15_000);
      }
    }
  };

  const subscriptions: Array<{ remove(): void }> = [];
  const remotes: Array<[Event, Parameters<typeof guardedNativePlayback>[1]]> = [
    [Event.RemotePlay, 'play'], [Event.RemotePause, 'pause'], [Event.RemoteStop, 'stop'],
    [Event.RemoteNext, 'next'], [Event.RemotePrevious, 'previous'], [Event.RemoteSeek, 'seek'],
  ];
  for (const [event, action] of remotes) {
    subscriptions.push(player.addEventListener(event, async payload => {
      if (!alive) return;
      try { await guardedNativePlayback(player, action, (payload as { position?: number } | undefined)?.position); }
      catch { /* Native playback state/error events provide existing recovery. */ }
      if (alive) await arm();
    }));
  }
  subscriptions.push(player.addEventListener(Event.PlaybackState, () => { void arm(); }));
  // Keep the existing queue-ended observer. Native repeat/queue handling
  // remains responsible for advancement; this must not force playback.
  subscriptions.push(player.addEventListener(Event.PlaybackQueueEnded, () => {}));
  subscriptions.push(player.addEventListener(Event.PlaybackActiveTrackChanged, async event => {
    if (!alive) return;
    const track = event?.track as PluggdTrack | undefined;
    lastTrack = track;
    if (track && isReleaseTrack(track)) {
      // Queue construction already checked this exact source. A known-current
      // clean entry advances entirely in native audio, with no network/pause.
      if (releaseAgeAccess.playable(track)) { await arm(); return; }
      await renew(track, nativePlaybackIntent(), true);
      return;
    }
    if (track && requiresPlaybackAccess(track)) {
      const expiry = track.playbackSource?.expiresAt;
      if (typeof expiry !== 'number' || expiry < Date.now() + 295_000) {
        await renew(track, nativePlaybackIntent(), isReleaseTrack(track));
        return;
      }
    }
    await arm();
  }));
  const unsubscribe = mixAccessSession.subscribe(() => {
    if (!alive) return;
    void purgeInvalidPrivateMixes(player).then(arm).catch(failClosed);
  });
  const unsubscribeRelease = releaseAgeAccess.subscribe(reason => {
    if (reason === 'unavailable') return;
    if (!alive) return;
    void player.getQueue().then(queue => {
      if ((queue as PluggdTrack[]).some(isReleaseTrack)) return purgeInvalidPrivateMixes(player).then(arm);
    }).catch(failClosed);
  });
  void purgeInvalidPrivateMixes(player).then(arm).catch(() => undefined);

  const dispose = () => {
    if (!alive) return;
    alive = false; schedule++; clearTimer(); clearDeadline();
    for (const subscription of subscriptions) subscription.remove();
    unsubscribe(); unsubscribeRelease(); stopObservingActor(); stopObservingReleaseActor(); detach();
    if (installed?.dispose === dispose) installed = undefined;
  };
  installed = { player, dispose };
  return dispose;
}
