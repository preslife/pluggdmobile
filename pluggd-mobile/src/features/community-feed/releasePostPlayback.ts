import type { PluggdTrack } from '../../context/PlaybackProvider';
import { releasePlayableUrl } from '../../lib/mobileContent';
import { supabase } from '../../lib/supabase';
import { assertReleaseAccess } from '../playback/releaseAgeAccess';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const releaseKey = /^[a-z0-9][a-z0-9-]{0,199}$/i;
/** Only canonical PLUGGD release links may create a native playback request. */
export function releaseIdForPost(preview: Record<string, unknown> | null): string | null {
  if (preview?.type === 'release' && typeof preview.id === 'string' && uuid.test(preview.id)) return preview.id;
  if (typeof preview?.url !== 'string') return null;
  try {
    const url = new URL(preview.url, 'https://pluggd.fm');
    if (url.username || url.password || !['https://pluggd.fm', 'https://www.pluggd.fm', 'https://pluggd.live', 'https://www.pluggd.live'].includes(url.origin)) return null;
    const id = url.pathname.match(/^\/release\/([^/]+)\/?$/)?.[1];
    return id && releaseKey.test(id) ? id : null;
  } catch { return null; }
}

export async function loadPostReleaseQueue(releaseId: string, signal?: AbortSignal): Promise<PluggdTrack[]> {
  if (!releaseKey.test(releaseId)) throw new Error('This release is unavailable.');
  const session = await supabase.auth.getSession();
  const token = session.data.session?.access_token;
  const current = async () => {
    const next = await supabase.auth.getSession();
    if (signal?.aborted || next.data.session?.access_token !== token) throw new Error('Your account changed. Please try again.');
  };
  await current();
  const releaseRead = (supabase as any).from('releases')
    .select('id,title,artist,cover_art_url,audio_url,preview_url,catalogue_mode,catalogue_import_job_id,is_exclusive,is_premium_content,perk_access')
    .eq(uuid.test(releaseId) ? 'id' : 'slug', releaseId).eq('approved', true).in('status', ['published', 'live', 'approved'])
    .eq('visibility_status', 'visible').abortSignal(signal ?? new AbortController().signal).maybeSingle();
  const releaseResult = await releaseRead;
  await current();
  if (releaseResult.error) throw new Error('This release could not load. Please try again.');
  const release = releaseResult.data;
  if (!release || !uuid.test(release.id) || release.catalogue_import_job_id || (release.catalogue_mode && release.catalogue_mode !== 'pluggd')) {
    throw new Error('This release is not available to play on PLUGGD.');
  }
  releaseId = release.id;
  await assertReleaseAccess({ releaseId });
  await current();
  const tracksResult = await (supabase as any).from('tracks')
    .select('id,title,duration,audio_url,audio_rights_status,playable_on_pluggd')
    .eq('release_id', releaseId).order('track_number', { ascending: true })
    .abortSignal(signal ?? new AbortController().signal);
  await current();
  if (tracksResult.error) throw new Error('This release could not load. Please try again.');
  const rows: any[] = tracksResult.data ?? [];
  const access = String(release.perk_access || 'public').trim().toLowerCase();
  if (release.is_exclusive || release.is_premium_content || !['', 'public', 'free'].includes(access)) {
    const preview = releasePlayableUrl(release);
    if (!preview) throw new Error('This release has no public preview. Open the release to check your access.');
    return [{ id: releaseId, releaseId, url: preview, title: release.title || 'Release', artist: release.artist || 'Artist',
      artwork: release.cover_art_url || undefined, type: 'release', sourceType: 'release' }];
  }
  const queue: PluggdTrack[] = rows.filter(track => track.playable_on_pluggd !== false && !['unlicensed', 'takedown'].includes(track.audio_rights_status || ''))
    .flatMap(track => {
      const url = releasePlayableUrl(track);
      return url ? [{ id: track.id, trackId: track.id, releaseId, url, title: track.title || release.title,
        artist: release.artist || 'Artist', artwork: release.cover_art_url || undefined,
        duration: Number(track.duration) > 0 ? Number(track.duration) : undefined,
        type: 'release' as const, sourceType: 'release' as const }] : [];
    });
  // An existing track list with denied/unavailable rows cannot fall back to a master.
  if (!rows.length) {
    const url = releasePlayableUrl(release);
    if (url) queue.push({ id: releaseId, releaseId, url, title: release.title || 'Release', artist: release.artist || 'Artist',
      artwork: release.cover_art_url || undefined, type: 'release', sourceType: 'release' });
  }
  if (!queue.length) throw new Error('There is no playable audio for this release yet.');
  return queue;
}
