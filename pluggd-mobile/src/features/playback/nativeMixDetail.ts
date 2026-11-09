import { supabase } from '../../lib/supabase';
import { mixAccessSession, validMixReference, type MixAccessScope } from './mixAccessSession';
import { nativeMixAccess, NativeMixAccessError, type NativeMixEnvelope } from './nativeMixAccess';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PUBLIC_COLUMNS = 'id,slug,owner_user_id,title,description,cover_url,audio_url,duration_seconds,city,genre_tags,mood_tags,recording_type,event_name,bpm_min,bpm_max,allow_download,like_count,repost_count,save_count,play_count,published_at,created_at,status,visibility';
export type NativeMixDetail = NativeMixEnvelope & { protocol: 'scoped' | 'public-fallback' };

async function bounded<T>(operation: PromiseLike<T>): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      Promise.resolve(operation),
      new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new NativeMixAccessError()), 8_000); }),
    ]);
  } finally { if (timer !== undefined) clearTimeout(timer); }
}

export async function readNativeMixDetail(reference: string, accessKey?: string): Promise<NativeMixDetail> {
  if (!validMixReference(reference)) throw new NativeMixAccessError('notFound');
  const scope = mixAccessSession.scope();
  let originalError: NativeMixAccessError;
  try { return { ...await nativeMixAccess.read(reference, accessKey), protocol: 'scoped' }; }
  catch (error) {
    originalError = error instanceof NativeMixAccessError ? error : new NativeMixAccessError();
    // A capability, expired auth or changed actor cannot enter the fallback.
    // Even other failures can only query explicitly published public rows.
    if (accessKey !== undefined || originalError.reason === 'authentication' || !mixAccessSession.current(scope)) throw originalError;
  }
  try {
    const query = (supabase as any).from('mixes').select(PUBLIC_COLUMNS)
      .eq('status', 'published').eq('visibility', 'public');
    const { data, error } = await bounded<{ data: unknown; error: unknown }>(
      (UUID.test(reference) ? query.eq('id', reference) : query.eq('slug', reference)).maybeSingle(),
    );
    mixAccessSession.assertCurrent(scope);
    if (error || !data) throw originalError;
    return { ...nativeMixAccess.publicEnvelope(reference, data, [], scope), protocol: 'public-fallback' };
  } catch { throw originalError; }
}

export async function readPublicNativeMixTracklist(detail: NativeMixDetail, scope: MixAccessScope): Promise<NativeMixDetail> {
  if (!detail.public || detail.protocol !== 'public-fallback') throw new NativeMixAccessError();
  mixAccessSession.assertCurrent(scope);
  const { data, error } = await bounded<{ data: unknown; error: unknown }>((supabase as any)
    .from('mix_tracklist_items').select('id,mix_id,position,start_seconds,end_seconds,raw_title,raw_artist,mixes!inner(status,visibility)')
    .eq('mix_id', detail.mix.id).eq('mixes.status', 'published').eq('mixes.visibility', 'public')
    .order('position', { ascending: true }));
  mixAccessSession.assertCurrent(scope);
  if (error || !Array.isArray(data)) throw new NativeMixAccessError();
  return { ...nativeMixAccess.publicEnvelope(detail.mix.id, detail.mix, data, scope), protocol: 'public-fallback' };
}

export async function nativeMixDownload(detail: NativeMixDetail): Promise<{ url: string; fileName: string }> {
  const scope = mixAccessSession.scope();
  if (detail.playbackAccess && !mixAccessSession.authorized(detail.mix.id, detail.playbackAccess)) throw new NativeMixAccessError();
  if (detail.protocol === 'scoped') return nativeMixAccess.download(detail.mix.id, detail.accessKey);
  if (!detail.public) throw new NativeMixAccessError();
  const { data, error } = await bounded<{ data: any; error: unknown }>(supabase.functions.invoke('get-mix-download-url', { body: { mixId: detail.mix.id } }));
  mixAccessSession.assertCurrent(scope);
  if (error || typeof data?.url !== 'string' || typeof data?.fileName !== 'string'
    || !data.fileName || /[\\/\u0000-\u001f\u007f]/.test(data.fileName)) throw new NativeMixAccessError();
  try {
    const url = new URL(data.url);
    if (url.protocol !== 'https:' || url.origin !== new URL(process.env.EXPO_PUBLIC_SUPABASE_URL || '').origin
      || url.username || url.password || url.hash || !url.searchParams.get('token')
      || !/^\/storage\/v1\/object\/sign\/(audio-files|Mixes-audio|mixes-audio|mix-media)\//.test(url.pathname)) throw new Error();
  } catch { throw new NativeMixAccessError(); }
  return { url: data.url, fileName: data.fileName };
}
