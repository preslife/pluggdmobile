import type { PluggdTrack } from '../../context/PlaybackProvider';
import { supabase } from '../../lib/supabase';
import { battleAudioUrl } from '../live/battleService';
import { mixAccessSession } from './mixAccessSession';
import { nativeMixAccess, NATIVE_MIX_METADATA_MAX_AGE_MS } from './nativeMixAccess';
import { hasCurrentMixAccess, isProtectedMix, nativeMixTrack } from './protectedMixPlayback';

import { assertReleaseAccess, assertReleaseGrantCurrent, hasCurrentReleaseAccess, isReleaseTrack, releaseAgeAccess } from './releaseAgeAccess';
import { releasePlayableUrl } from '../../lib/mobileContent';

type ProtectedKind = 'beat' | 'mix' | 'release';
type SampleStreamIdentity =
  | { sampleId: string; samplePackId?: string; intent: 'stream' }
  | { samplePackId: string; intent: 'stream' };
export type PlaybackSourceMetadata = { originalUrl: string; expiresAt: number | null };

const REFRESH_MARGIN_MS = 30_000;
const SOURCE_READ_TIMEOUT_MS = 10_000;
const SAMPLE_SOURCE_MAX_AGE_SECONDS = 900;

async function boundedSourceRead<T>(operation: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error('Audio source refresh timed out')), SOURCE_READ_TIMEOUT_MS); }),
    ]);
  } finally {
    if (timer !== undefined) clearTimeout(timer);
  }
}

function originalUrl(track: PluggdTrack) {
  return track.playbackSource?.originalUrl || track.url;
}

// Reuse battleAudioUrl's existing authenticated storage/RLS path, accepting
// only an already-signed URL for this app's project and battle-audio bucket.
// Raw paths, foreign hosts, public URLs and other buckets are never signed here.
function battlePath(track: PluggdTrack): string | null {
  try {
    const source = new URL(originalUrl(track));
    const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL || '');
    if (source.protocol !== 'https:' || source.origin !== project.origin || !source.searchParams.get('token')) return null;
    const match = source.pathname.match(/^\/storage\/v1\/object\/sign\/battle-audio\/(.+)$/);
    if (!match) return null;
    const path = decodeURIComponent(match[1]);
    if (path.split('/').some((part) => !part || part === '.' || part === '..' || part.includes('\\'))) return null;
    return path;
  } catch {
    return null;
  }
}

function protectedIdentity(track: PluggdTrack): { contentId: string; contentType: ProtectedKind } | null {
  const kind = track.sourceType ?? track.type;
  if (kind === 'beat') return { contentId: track.beatId || track.id, contentType: 'beat' };
  if (kind === 'mix') return { contentId: track.mixId || track.id, contentType: 'mix' };
  // A few published releases still carry expiring audio-files links. Refresh
  // only those through the public release identity; ordinary CDN links stay as-is.
  if (kind === 'release' && /\/storage\/v1\/object\/(?:sign|public|authenticated)\/audio-files\//i.test(originalUrl(track))) {
    return { contentId: track.trackId || track.releaseId || track.id, contentType: 'release' };
  }
  return null;
}

function sampleStreamIdentity(track: PluggdTrack): SampleStreamIdentity | null {
  const kind = track.sourceType ?? track.type;
  if (kind !== 'sample' && kind !== 'sample_pack') return null;
  try {
    const source = new URL(originalUrl(track));
    const project = new URL(process.env.EXPO_PUBLIC_SUPABASE_URL || '');
    if (source.protocol !== 'https:' || source.origin !== project.origin
      || !/^\/storage\/v1\/object\/(?:public|sign|authenticated)\/sample-pack-files\/.+/.test(source.pathname)) return null;
  } catch {
    return null;
  }
  // The server chooses the current authorised preview by identity. Never pass
  // a catalogue URL/path to a signer or turn a pack preview into an archive.
  return kind === 'sample'
    ? { sampleId: track.sampleId || track.id, ...(track.samplePackId ? { samplePackId: track.samplePackId } : {}), intent: 'stream' }
    : { samplePackId: track.samplePackId || track.id, intent: 'stream' };
}

export function canRefreshPlaybackSource(track: PluggdTrack): boolean {
  return Boolean(isReleaseTrack(track) || isProtectedMix(track) || battlePath(track) || protectedIdentity(track) || sampleStreamIdentity(track));
}

export function playbackSourceNeedsRefresh(track: PluggdTrack, now = Date.now()): boolean {
  if (!canRefreshPlaybackSource(track)) return false;
  const expiry = track.playbackSource?.expiresAt;
  return typeof expiry !== 'number' || !Number.isFinite(expiry) || now >= expiry - REFRESH_MARGIN_MS;
}

/** Keep the resolver's TTL alongside the native track so queued sources can
 * renew under the same access rules before a range request uses an old token.
 */
export async function resolvePlaybackTrack(track: PluggdTrack, options: { useCurrentSource?: boolean } = {}): Promise<PluggdTrack | null> {
  let canonicalReleaseSourceId: string | undefined;
  if (isProtectedMix(track)) {
    if (!track.mixAccess) return null;
    if (!hasCurrentMixAccess(track)) {
      mixAccessSession.invalidateAuthorization(track.mixAccess.authorizationId);
      return null;
    }
    try {
      const id = track.mixId || track.id;
      const cached = nativeMixAccess.presentation(id, track.mixAccess);
      let next = cached && cached.mixMetadataReadAt >= (track.mixMetadataReadAt ?? 0) ? { ...track, ...cached, mixAccess: cached.public ? undefined : track.mixAccess } : track;
      const age = typeof next.mixMetadataReadAt === 'number' ? Date.now() - next.mixMetadataReadAt : Infinity;
      if (age < 0 || age >= NATIVE_MIX_METADATA_MAX_AGE_MS) {
        const detail = await nativeMixAccess.read(id, track.mixAccess.accessKey);
        if (!hasCurrentMixAccess(track)) return null;
        next = { ...track, ...nativeMixTrack(detail), mixAccess: detail.public ? undefined : detail.playbackAccess };
      }
      const source = await nativeMixAccess.play(id, next.mixAccess?.accessKey, Boolean(next.mixAccess));
      if (!hasCurrentMixAccess(track) || !hasCurrentMixAccess(next)) return null;
      // Both protected audio and cover grants last 300 seconds. Renew before
      // the earlier deadline, including when a focused detail supplied artwork
      // before a later audio signing. A public transition retains its full TTL.
      const expiresAt = next.mixAccess && typeof next.mixMetadataReadAt === 'number'
        ? Math.min(source.expiresAt, next.mixMetadataReadAt + 300_000) : source.expiresAt;
      return { ...next, url: source.url,
        playbackSource: { originalUrl: `mix:${id}`, expiresAt } };
    } catch {
      mixAccessSession.invalidateAuthorization(track.mixAccess.authorizationId);
      return null;
    }
  }
  if (isReleaseTrack(track)) {
    const grant = await assertReleaseAccess({ releaseId: track.releaseId || (track.trackId ? undefined : track.id), trackId: track.trackId }).catch(error => {
      releaseAgeAccess.invalidate(track.releaseAccess);
      throw error;
    });
    const source = releasePlayableUrl(grant.source);
    canonicalReleaseSourceId = grant.sourceCatalogId;
    if (!source || grant.source.playable_on_pluggd === false || ['unlicensed', 'takedown'].includes(grant.source.audio_rights_status)) {
      releaseAgeAccess.invalidate(track.releaseAccess);
      return null;
    }
    if (options.useCurrentSource && source === originalUrl(track) && typeof track.playbackSource?.expiresAt === 'number'
      && track.playbackSource.expiresAt > Date.now() && hasCurrentReleaseAccess(track)) {
      return { ...track, releaseAccess: { authorizationId: grant.authorizationId } };
    }
    track = { ...track, sourceType: 'release', releaseId: grant.releaseId, trackId: grant.trackId, url: source,
      releaseAccess: { authorizationId: grant.authorizationId },
      playbackSource: { originalUrl: source, expiresAt: Date.now() + 300_000 } };
    if (!hasCurrentReleaseAccess(track)) return null;
  }
  const path = battlePath(track);
  const storedIdentity = protectedIdentity(track);
  const identity = storedIdentity && canonicalReleaseSourceId ? { contentId: canonicalReleaseSourceId, contentType: 'release' as const } : storedIdentity;
  const sample = sampleStreamIdentity(track);
  if (!path && !identity && !sample) return track;
  if (identity && !identity.contentId) return null;
  if (sample && !('sampleId' in sample ? sample.sampleId : sample.samplePackId)?.trim()) return null;
  try {
    let url: string;
    let expiresIn: number;
    const requestedAt = Date.now();
    if (path) {
      url = await boundedSourceRead(battleAudioUrl(path));
      expiresIn = 300;
    } else if (sample) {
      const { data, error } = await boundedSourceRead(supabase.functions.invoke('get-sample-pack-sample-url', { body: sample }));
      if (error || typeof data?.url !== 'string') return null;
      const ttl = Number(data.expiresIn);
      if (!Number.isFinite(ttl) || ttl <= 0) return null;
      url = data.url;
      expiresIn = Math.min(ttl, SAMPLE_SOURCE_MAX_AGE_SECONDS);
    } else {
      if (!identity) return null;
      const { data, error } = await boundedSourceRead(supabase.functions.invoke('resolve-playback-url', { body: identity }));
      if (error || typeof data?.signedUrl !== 'string') return null;
      url = data.signedUrl;
      expiresIn = Number(data.expiresIn);
    }
    if (track.releaseAccess) await assertReleaseGrantCurrent(track.releaseAccess);
    if (!url.trim() || !hasCurrentReleaseAccess(track)) return null;
    const resolved = new URL(url);
    if (resolved.protocol !== 'https:' || (sample && (resolved.username || resolved.password))) return null;
    return {
      ...track,
      url: url.trim(),
      playbackSource: {
        originalUrl: originalUrl(track),
        // Count from request start, conservatively including network latency.
        expiresAt: Number.isFinite(expiresIn) && expiresIn > 0 ? requestedAt + expiresIn * 1000 : null,
      },
    };
  } catch {
    return null;
  }
}

/** The server selects the public Beat preview and refreshes private Mix URLs.
 * Never sign a Beat's catalogue path directly: audio_url can be the paid master.
 */
export async function resolvePlaybackSource(track: PluggdTrack): Promise<string | null> {
  return (await resolvePlaybackTrack(track))?.url ?? null;
}
