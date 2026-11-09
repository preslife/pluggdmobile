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
  let schedule = 0;
  let renewing = false;
  let readFailures = 0;
  let lastTrack: PluggdTrack | undefined;
  const detach = attachPlaybackService();
  const stopObservingActor = observeMixActor();
  const stopObservingReleaseActor = releaseAgeAccess.observe();
  const clearTimer = () => { if (timer !== undefined) clearTimeout(timer); timer = undefined; };
  const failClosed = () => player.pause().catch(() => undefined);

  const renew = async (expected: PluggdTrack, ticket: number, beforeAdvance = false) => {
    if (!alive || renewing || !currentNativePlaybackIntent(ticket)) return;
    renewing = true;
    try {
      const wants = await player.getPlayWhenReady();
      if (alive && wants && currentNativePlaybackIntent(ticket)) {
        // Native advancement can select an older queued release before JS is
        // notified. Pause before its policy read; resume only the same intent.
        if (beforeAdvance && isReleaseTrack(expected)) await player.pause();
        const allowed = await refreshActivePrivateMix(player, expected, ticket);
        if (beforeAdvance && allowed && alive && currentNativePlaybackIntent(ticket)) {
          const active = await player.getActiveTrack() as PluggdTrack | undefined;
          if (active?.id === expected.id && hasCurrentPlaybackAccess(active) && currentNativePlaybackIntent(ticket)) await player.play();
        }
      }
    } catch { if (alive && currentNativePlaybackIntent(ticket)) await failClosed(); }
    finally { renewing = false; if (alive) await arm(); }
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
      if (!wants) return;
      const track = item as PluggdTrack | undefined;
      lastTrack = track;
      readFailures = 0;
      if (!track || !requiresPlaybackAccess(track)) return;
      if (!hasCurrentPlaybackAccess(track)) { await purgeInvalidPrivateMixes(player); return; }
      const expires = track.playbackSource?.expiresAt;
      const delay = typeof expires === 'number' && Number.isFinite(expires) ? Math.max(0, expires - Date.now() - 30_000) : 0;
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
        releaseAgeAccess.invalidate(lastTrack.releaseAccess);
        await failClosed();
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
  const unsubscribeRelease = releaseAgeAccess.subscribe(() => {
    if (!alive) return;
    void player.getQueue().then(queue => {
      if ((queue as PluggdTrack[]).some(isReleaseTrack)) return purgeInvalidPrivateMixes(player).then(arm);
    }).catch(failClosed);
  });
  void purgeInvalidPrivateMixes(player).then(arm).catch(() => undefined);

  const dispose = () => {
    if (!alive) return;
    alive = false; schedule++; clearTimer();
    for (const subscription of subscriptions) subscription.remove();
    unsubscribe(); unsubscribeRelease(); stopObservingActor(); stopObservingReleaseActor(); detach();
    if (installed?.dispose === dispose) installed = undefined;
  };
  installed = { player, dispose };
  return dispose;
}
