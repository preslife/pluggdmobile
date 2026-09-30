import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { supabase } from '../../lib/supabase';
import { uploadFileToSupabaseStorage } from '../../lib/storageUpload';
import { MAX_MEDIA_BYTES, MAX_MUSIC_SECONDS, type MusicDraft, type MusicMedia, type MusicTrack, type PostMusic } from './model';
import type { MobileSocialDestinationInput } from '../culture/mobileTypes';

const db = supabase as any;
const API_ORIGIN = 'https://pluggd.fm';
const key = (userId: string, name: string) => `pluggd.music.${name}.${userId}`;
const previews = new Directory(Paths.cache, 'pluggd-music-preview');
export async function currentMusicToken() {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) throw new Error('Sign in again to use release music.');
  return data.session.access_token;
}
async function api(path: string, body: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch(`${API_ORIGIN}/api/${path}`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await currentMusicToken()}` },
    body: JSON.stringify(body),
  });
  const result = await response.json().catch(() => ({})) as { error?: string; url?: string; status?: string; postId?: string };
  if (!response.ok) throw new Error(result.error || 'Could not complete this music request. Please try again.');
  return result;
}
export async function searchMusic(query = '', releaseId?: string): Promise<MusicTrack[]> {
  const { data, error } = await db.rpc(releaseId ? 'get_reusable_release_tracks_for_release' : 'search_reusable_release_tracks',
    releaseId ? { p_release_id: releaseId } : { p_query: query.trim().slice(0, 80), p_limit: 24 });
  if (error) throw new Error(error.message || 'Could not load release music.');
  return (data || []) as MusicTrack[];
}
export async function loadPersonalMusic(userId: string, name: 'saved' | 'recent'): Promise<MusicTrack[]> {
  const stored = JSON.parse(await AsyncStorage.getItem(key(userId, name)) || '[]') as MusicTrack[];
  if (!Array.isArray(stored)) return [];
  // Refresh eligibility rather than offering a withdrawn sound from local history.
  const releases = [...new Set(stored.slice(0, 40).map(item => item.release_id))];
  const available = (await Promise.all(releases.map(id => searchMusic('', id)))).flat();
  const byId = new Map(available.map(item => [item.track_id, item]));
  return stored.flatMap(item => byId.has(item.track_id) ? [byId.get(item.track_id)!] : []);
}
export async function rememberMusic(userId: string, name: 'saved' | 'recent', track: MusicTrack, remove = false) {
  const value = JSON.parse(await AsyncStorage.getItem(key(userId, name)) || '[]') as MusicTrack[];
  const rows = Array.isArray(value) ? value.filter(item => item.track_id !== track.track_id) : [];
  await AsyncStorage.setItem(key(userId, name), JSON.stringify((remove ? rows : [track, ...rows]).slice(0, 40)));
}
export type MusicAudition = { uri: string; waveform: number[]; trackDuration: number; dispose: () => void };
export async function loadMusicAudition(trackId: string, startSeconds: number, durationSeconds: number, signal?: AbortSignal): Promise<MusicAudition> {
  const response = await fetch(`${API_ORIGIN}/api/social-music-preview`, {
    method: 'POST', signal,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${await currentMusicToken()}` },
    body: JSON.stringify({ trackId, startSeconds, durationSeconds }),
  });
  if (!response.ok) {
    const result = await response.json().catch(() => ({}));
    throw new Error(result.error || 'This sound could not be previewed. Please try again.');
  }
  const bytes = new Uint8Array(await response.arrayBuffer());
  if (bytes.length < 1 || bytes.length > 2_000_000 || !response.headers.get('content-type')?.includes('audio/mpeg')) {
    throw new Error('This sound preview is unavailable.');
  }
  const trackDuration = Number(response.headers.get('X-PLUGGD-Track-Duration'));
  const peaks = JSON.parse(response.headers.get('X-PLUGGD-Waveform') || '[]') as unknown;
  if (!Number.isFinite(trackDuration) || trackDuration < 1 || !Array.isArray(peaks) || peaks.length !== 256
    || !peaks.every(peak => Number.isFinite(peak) && peak >= 0 && peak <= 100)) {
    throw new Error('Could not load the sound timeline. Please try again.');
  }
  if (signal?.aborted) throw new Error('Preview cancelled.');
  previews.create({ idempotent: true, intermediates: true });
  const file = new File(previews, `${Crypto.randomUUID()}.mp3`);
  file.write(bytes);
  return { uri: file.uri, waveform: peaks, trackDuration, dispose: () => { if (file.exists) file.delete(); } };
}
export function newMusicDraft(userId: string, content = '', destinations: MobileSocialDestinationInput[] = []): MusicDraft {
  return {
    version: 1, userId, uploadId: Crypto.randomUUID(), requestId: Crypto.randomUUID(), postId: Crypto.randomUUID(),
    media: null, track: null, content, destinations, updatedAt: Date.now(),
    recipe: { startSeconds: 0, durationSeconds: 15, timelineOffsetSeconds: 0, contentDurationSeconds: 15, musicGain: 0.8, originalGain: 0.6 },
  };
}
export async function saveMusicDraft(draft: MusicDraft) {
  await AsyncStorage.setItem(key(draft.userId, 'draft'), JSON.stringify({ ...draft, updatedAt: Date.now() }));
}
export async function readMusicDraft(userId: string): Promise<MusicDraft | null> {
  const raw = await AsyncStorage.getItem(key(userId, 'draft'));
  if (!raw) return null;
  try {
    const draft = JSON.parse(raw) as MusicDraft;
    if (draft.version !== 1 || draft.userId !== userId) return null;
    if (Date.now() - draft.updatedAt > 7 * 86400_000) { removeMusicMedia(draft.media); await clearMusicDraft(userId); return null; }
    if (draft.media) {
      const file = ownMediaFile(draft.media);
      // iOS can move the sandbox on app updates. Persist identity, not the old container path.
      if (file?.exists) draft.media = { ...draft.media, uri: file.uri, localName: file.name, fileSize: file.size };
      else if (file && !draft.sourcePath && !draft.jobId) draft.media = null;
    }
    return draft;
  } catch { return null; }
}
export async function clearMusicDraft(userId: string) { await AsyncStorage.removeItem(key(userId, 'draft')); }
export async function keepMusicMedia(media: MusicMedia): Promise<MusicMedia> {
  if (!(media.kind === 'photo' ? ['image/jpeg', 'image/png'] : ['video/mp4', 'video/quicktime']).includes(media.mimeType)) {
    throw new Error('Choose a JPEG/PNG photo or an MP4/MOV video.');
  }
  const source = new File(media.uri);
  if (!source.exists || source.size < 1) throw new Error('This file is unavailable. Choose it again from your library.');
  if (source.size > MAX_MEDIA_BYTES) throw new Error('Choose a photo or video smaller than 100 MB.');
  const ext = media.mimeType === 'image/png' ? 'png' : media.kind === 'photo' ? 'jpg' : media.mimeType === 'video/quicktime' ? 'mov' : 'mp4';
  const dir = new Directory(Paths.document, 'pluggd-music-drafts');
  dir.create({ idempotent: true, intermediates: true });
  // Keep a draft through OS cache eviction; one task-owned file per active editor.
  const localName = `${Crypto.randomUUID()}.${ext}`;
  const file = new File(dir, localName);
  source.copy(file);
  return { ...media, uri: file.uri, localName, fileSize: source.size };
}
function ownMediaFile(media: MusicMedia) {
  const name = media.localName || (media.uri.includes('/pluggd-music-drafts/') ? media.uri.split('/').pop() : undefined);
  if (!name || !/^[0-9a-f-]{36}[.](jpg|png|mp4|mov)$/.test(name)) return null;
  return new File(new Directory(Paths.document, 'pluggd-music-drafts'), name);
}
export function removeMusicMedia(media: MusicMedia | null) {
  if (!media) return;
  const file = ownMediaFile(media);
  if (file?.exists) file.delete();
}
export async function renderMusicDraft(draft: MusicDraft, checkpoint: (draft: MusicDraft) => Promise<void>) {
  if (!draft.track || !draft.media) throw new Error('Choose a photo or video and a sound first.');
  const current = { ...draft };
  if (!current.sourcePath) {
    const ext = current.media!.mimeType === 'image/png' ? 'png' : current.media!.kind === 'photo' ? 'jpg' : current.media!.mimeType === 'video/quicktime' ? 'mov' : 'mp4';
    const path = `${current.userId}/${current.uploadId}/source.${ext}`;
    try {
      await uploadFileToSupabaseStorage({ bucket: 'social-music-drafts', path, uri: current.media!.uri, contentType: current.media!.mimeType });
    } catch (uploadError) {
      // A lost upload response must not cause a duplicate object or overwrite.
      const { data, error } = await supabase.storage.from('social-music-drafts').list(`${current.userId}/${current.uploadId}`, { search: `source.${ext}` });
      if (error || !data?.some(item => item.name === `source.${ext}` && Number(item.metadata?.size) === current.media!.fileSize)) throw uploadError;
    }
    current.sourcePath = path;
    await checkpoint(current);
  }
  if (!current.jobId) {
    // requestId and postId are persisted before any server mutation.
    await checkpoint(current);
    const { data, error } = await db.rpc('prepare_social_music_render', {
      p_request_id: current.requestId, p_release_id: current.track!.release_id, p_track_id: current.track!.track_id,
      p_source_path: current.sourcePath, p_source_kind: current.media!.kind, p_recipe: current.recipe,
    });
    if (error || !data) throw new Error(error?.message || 'Could not prepare your preview.');
    current.jobId = String(data);
    await checkpoint(current);
  }
  const status = await musicJobStatus(current.jobId!);
  if (status === 'published') return { draft: current, published: true, uri: null };
  if (status === 'processing') throw new Error('Your preview is still being prepared. Keep this draft and try again shortly.');
  if (status !== 'ready') {
    const result = await api('social-music-render', { jobId: current.jobId });
    if (result.status !== 'ready') throw new Error('Your preview is not ready yet. Keep this draft and try again shortly.');
  }
  return { draft: current, published: false, uri: await readyMusicPreview(current.userId, current.jobId!) };
}
export async function musicJobStatus(jobId: string): Promise<string> {
  const { data, error } = await db.from('social_music_render_jobs').select('status').eq('id', jobId).single();
  if (error || !data) throw new Error('This draft is unavailable or has expired.');
  return data.status;
}
export async function readyMusicPreview(userId: string, jobId: string) {
  const { data, error } = await supabase.storage.from('social-music-processed').createSignedUrl(`${userId}/${jobId}/preview.mp4`, 300);
  if (error || !data?.signedUrl) throw new Error('Could not open your finished preview. Please try again.');
  return data.signedUrl;
}
export async function publishMusicDraft(draft: MusicDraft) {
  if (!draft.jobId) throw new Error('Prepare your finished preview first.');
  const result = await api('social-music-publish', { jobId: draft.jobId, postId: draft.postId, content: draft.content.trim(), destinations: draft.destinations });
  if (result.postId !== draft.postId || result.status !== 'published') throw new Error('Publication was not confirmed. Please retry this draft.');
  return draft.postId;
}
export async function musicPlayback(postId: string, signal?: AbortSignal) {
  const { data, error } = await supabase.auth.getSession();
  if (error) throw new Error('Sign in again to watch this video.');
  // Public redirects recheck visibility on the server; anonymous private requests remain denied.
  if (!data.session) return `${API_ORIGIN}/api/social-music-playback?postId=${encodeURIComponent(postId)}`;
  const result = await api('social-music-playback', { postId }, signal);
  if (!result.url || !result.url.startsWith(`${process.env.EXPO_PUBLIC_SUPABASE_URL}/storage/v1/object/sign/social-music-published/`)) {
    throw new Error('This video is unavailable.');
  }
  return result.url;
}
export async function postMusicSummaries(ids: string[]): Promise<Map<string, PostMusic>> {
  const unique = [...new Set(ids)].slice(0, 100);
  if (!unique.length) return new Map();
  const { data, error } = await db.rpc('get_post_music_summaries', { p_post_ids: unique });
  if (error) throw error;
  return new Map((data || []).map((item: PostMusic) => [item.post_id, item]));
}
