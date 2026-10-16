import type { PluggdTrack } from '../../context/PlaybackProvider';
import { supabase } from '../../lib/supabase';
import { battleAudioUrl } from '../live/battleService';

type ProtectedKind = 'beat' | 'mix' | 'release';
export type PlaybackSourceMetadata = { originalUrl: string; expiresAt: number | null };

const REFRESH_MARGIN_MS = 30_000;
const SOURCE_READ_TIMEOUT_MS = 10_000;

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

export function canRefreshPlaybackSource(track: PluggdTrack): boolean {
  return Boolean(battlePath(track) || protectedIdentity(track));
}

export function playbackSourceNeedsRefresh(track: PluggdTrack, now = Date.now()): boolean {
  if (!canRefreshPlaybackSource(track)) return false;
  const expiry = track.playbackSource?.expiresAt;
  return typeof expiry !== 'number' || !Number.isFinite(expiry) || now >= expiry - REFRESH_MARGIN_MS;
}

/** Keep the resolver's TTL alongside the native track so queued sources can
 * renew under the same access rules before a range request uses an old token.
 */
export async function resolvePlaybackTrack(track: PluggdTrack): Promise<PluggdTrack | null> {
  const path = battlePath(track);
  const identity = protectedIdentity(track);
  if (!path && !identity) return track;
  if (identity && !identity.contentId) return null;
  try {
    let url: string;
    let expiresIn: number;
    const requestedAt = Date.now();
    if (path) {
      url = await boundedSourceRead(battleAudioUrl(path));
      expiresIn = 300;
    } else {
      if (!identity) return null;
      const { data, error } = await boundedSourceRead(supabase.functions.invoke('resolve-playback-url', { body: identity }));
      if (error || typeof data?.signedUrl !== 'string') return null;
      url = data.signedUrl;
      expiresIn = Number(data.expiresIn);
    }
    if (!url.trim() || new URL(url).protocol !== 'https:') return null;
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
