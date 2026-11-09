import type { PluggdTrack } from '../../context/PlaybackProvider';
import { mixAccessSession } from './mixAccessSession';
import { hasCurrentPlaybackAccess, requiresPlaybackAccess } from './playbackAccess';
import { resolvePlaybackTrack } from './resolvePlaybackSource';
import { isReleaseTrack, releaseAgeAccess } from './releaseAgeAccess';
import { runNativeQueueMutation } from './nativeQueueMutation';

export interface NativeControlPlayer {
  getActiveTrack(): Promise<unknown>;
  getActiveTrackIndex(): Promise<number | undefined>;
  getQueue(): Promise<unknown[]>;
  getProgress(): Promise<{ position: number }>;
  getPlayWhenReady(): Promise<boolean>;
  load(track: any): Promise<unknown>;
  seekTo(position: number): Promise<unknown>;
  skip(index: number): Promise<unknown>;
  remove(indexes: number[]): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  stop(): Promise<void>;
}

let intent = 0;
export const beginNativePlaybackIntent = (): number => ++intent;
export const nativePlaybackIntent = (): number => intent;
export const currentNativePlaybackIntent = (ticket: number): boolean => ticket === intent;

const sameAuthority = (a: PluggdTrack | undefined, b: PluggdTrack) => a?.id === b.id
  && a?.mixAccess?.authorizationId === b.mixAccess?.authorizationId
  && a?.releaseId === b.releaseId && a?.trackId === b.trackId;
const sameEntry = (a: PluggdTrack | undefined, b: PluggdTrack) => sameAuthority(a, b) && a?.url === b.url;

export function purgeInvalidPrivateMixes(player: NativeControlPlayer): Promise<PluggdTrack[]> {
  return runNativeQueueMutation(async () => {
    const queue = (await player.getQueue()) as PluggdTrack[];
    const invalid = queue.flatMap((track, index) => hasCurrentPlaybackAccess(track) ? [] : [index]);
    if (!invalid.length) return queue;
    const active = (await player.getActiveTrack()) as PluggdTrack | undefined;
    if (requiresPlaybackAccess(active) && !hasCurrentPlaybackAccess(active)) await player.pause();
    await player.remove(invalid);
    return ((await player.getQueue()) as PluggdTrack[]).filter(hasCurrentPlaybackAccess);
  });
}

async function denied(player: NativeControlPlayer, track: PluggdTrack): Promise<false> {
  releaseAgeAccess.invalidate(track.releaseAccess);
  if (track.mixAccess) mixAccessSession.invalidateAuthorization(track.mixAccess.authorizationId);
  await purgeInvalidPrivateMixes(player).catch(() => player.pause().catch(() => undefined));
  return false;
}

/** Refresh outside the mutation lane. A newer pause/selection always wins,
 * and only the same active scoped Mix can receive the resulting source.
 */
export async function refreshActivePrivateMix(
  player: NativeControlPlayer, expected: PluggdTrack, ticket: number, position?: number, policyOnly = false,
): Promise<boolean> {
  if (!currentNativePlaybackIntent(ticket)) return false;
  if (!hasCurrentPlaybackAccess(expected)) return denied(player, expected);
  const next = await resolvePlaybackTrack(expected, { useCurrentSource: policyOnly }).catch(() => null);
  if (!currentNativePlaybackIntent(ticket)) return false;
  if (!next || !hasCurrentPlaybackAccess(next)) return denied(player, expected);
  try {
    return await runNativeQueueMutation(async () => {
      if (!currentNativePlaybackIntent(ticket) || !hasCurrentPlaybackAccess(next)) return false;
      const active = (await player.getActiveTrack()) as PluggdTrack | undefined;
      if (!sameAuthority(active, expected)) return false;
      if (policyOnly && isReleaseTrack(expected) && next.url === expected.url) {
        if (position !== undefined) await player.seekTo(position);
        return currentNativePlaybackIntent(ticket) && hasCurrentPlaybackAccess(next);
      }
      const progress = await player.getProgress();
      if (!currentNativePlaybackIntent(ticket) || !hasCurrentPlaybackAccess(next)) return false;
      const target = position ?? (Number.isFinite(progress.position) ? Math.max(0, progress.position) : 0);
      // Preserve native playWhenReady; dispatch both before yielding so a later
      // pause/seek/stop stays later in native command order.
      await Promise.all([player.load(next), player.seekTo(target)]);
      return currentNativePlaybackIntent(ticket) && hasCurrentPlaybackAccess(next);
    });
  } catch { return denied(player, expected); }
}

export async function selectNativeQueueEntry(
  player: NativeControlPlayer, index: number, ticket: number, resume = false, expected?: PluggdTrack,
): Promise<boolean> {
  if (!Number.isInteger(index) || index < 0 || !currentNativePlaybackIntent(ticket)) return false;
  const snapshot = (await player.getQueue()) as PluggdTrack[];
  // UI indices can already exclude a denied private item while the native
  // removal is still pending. Bind that selection to its rendered identity.
  const candidates = expected ? snapshot.flatMap((track, at) => sameAuthority(track, expected) ? [at] : []) : [];
  const requestedIndex = expected ? sameAuthority(snapshot[index], expected) ? index : candidates.length === 1 ? candidates[0] : -1 : index;
  const target = snapshot[requestedIndex];
  if (!target || !currentNativePlaybackIntent(ticket)) return false;
  const protectedTarget = requiresPlaybackAccess(target);
  const next = protectedTarget ? await resolvePlaybackTrack(target, { useCurrentSource: true }).catch(() => null) : target;
  if (!currentNativePlaybackIntent(ticket)) return false;
  if (!next || !hasCurrentPlaybackAccess(next)) return denied(player, target);
  try {
    return await runNativeQueueMutation(async () => {
      if (!currentNativePlaybackIntent(ticket) || !hasCurrentPlaybackAccess(next)) return false;
      const queue = (await player.getQueue()) as PluggdTrack[];
      const matches = queue.flatMap((track, at) => sameEntry(track, target) ? [at] : []);
      const actualIndex = sameEntry(queue[requestedIndex], target) ? requestedIndex : matches.length === 1 ? matches[0] : -1;
      if (actualIndex < 0 || !currentNativePlaybackIntent(ticket)) return false;
      await player.skip(actualIndex);
      if (!currentNativePlaybackIntent(ticket) || !hasCurrentPlaybackAccess(next)) return false;
      if (protectedTarget) await Promise.all([player.load(next), player.seekTo(0)]);
      if (!currentNativePlaybackIntent(ticket) || !hasCurrentPlaybackAccess(next)) return false;
      if (resume) await player.play();
      return true;
    });
  } catch { return protectedTarget ? denied(player, target) : false; }
}

export async function stepNativeQueue(player: NativeControlPlayer, delta: -1 | 1, ticket: number): Promise<boolean> {
  const index = await player.getActiveTrackIndex();
  if (index === undefined || !currentNativePlaybackIntent(ticket)) return false;
  const active = (await player.getActiveTrack()) as PluggdTrack | undefined;
  if (!active || !currentNativePlaybackIntent(ticket)) return false;
  if (delta === -1 && ((await player.getProgress()).position > 3 || index === 0)) {
    if (!currentNativePlaybackIntent(ticket)) return false;
    if (requiresPlaybackAccess(active)) return refreshActivePrivateMix(player, active, ticket, 0, true);
    await player.seekTo(0);
    return true;
  }
  return selectNativeQueueEntry(player, index + delta, ticket);
}

export async function guardedNativePlayback(
  player: NativeControlPlayer, action: 'play' | 'pause' | 'stop' | 'next' | 'previous' | 'seek', position?: number,
): Promise<boolean> {
  const ticket = beginNativePlaybackIntent();
  if (action === 'pause' || action === 'stop') { await player[action](); return true; }
  if (action === 'next' || action === 'previous') return stepNativeQueue(player, action === 'next' ? 1 : -1, ticket);
  if (action === 'seek' && (typeof position !== 'number' || !Number.isFinite(position) || position < 0)) return false;
  const track = (await player.getActiveTrack()) as PluggdTrack | undefined;
  if (!currentNativePlaybackIntent(ticket)) return false;
  if (requiresPlaybackAccess(track) && track) {
    if (!await refreshActivePrivateMix(player, track, ticket, action === 'seek' ? position : undefined, true)) return false;
    if (action === 'play' && currentNativePlaybackIntent(ticket) && hasCurrentPlaybackAccess(track)) await player.play();
  } else if (action === 'play') await player.play();
  else await player.seekTo(position!);
  return true;
}
