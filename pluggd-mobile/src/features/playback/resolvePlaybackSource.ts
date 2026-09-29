import type { PluggdTrack } from '../../context/PlaybackProvider';
import { supabase } from '../../lib/supabase';

type ProtectedKind = 'beat' | 'mix' | 'release';

function protectedIdentity(track: PluggdTrack): { contentId: string; contentType: ProtectedKind } | null {
  const kind = track.sourceType ?? track.type;
  if (kind === 'beat') return { contentId: track.beatId || track.id, contentType: 'beat' };
  if (kind === 'mix') return { contentId: track.mixId || track.id, contentType: 'mix' };
  // A few published releases still carry expiring audio-files links. Refresh
  // only those through the public release identity; ordinary CDN links stay as-is.
  if (kind === 'release' && /\/storage\/v1\/object\/(?:sign|public|authenticated)\/audio-files\//i.test(track.url)) {
    return { contentId: track.trackId || track.releaseId || track.id, contentType: 'release' };
  }
  return null;
}

/** The server selects the public Beat preview and refreshes private Mix URLs.
 * Never sign a Beat's catalogue path directly: audio_url can be the paid master.
 */
export async function resolvePlaybackSource(track: PluggdTrack): Promise<string | null> {
  const identity = protectedIdentity(track);
  if (!identity) return track.url;
  if (!identity.contentId) return null;

  try {
    const { data, error } = await supabase.functions.invoke('resolve-playback-url', {
      body: identity,
    });
    if (error || typeof data?.signedUrl !== 'string') return null;
    return data.signedUrl.trim() || null;
  } catch {
    return null;
  }
}
