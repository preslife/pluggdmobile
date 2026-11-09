import type { MixItem, MixTrackItem } from '../../lib/mobileContent';
import { supabase } from '../../lib/supabase';
import { mixAccessSession, MixSessionUnavailable, validMixReference, type MixAccessSession, type MixAccessScope, type MixPlaybackAccess } from './mixAccessSession';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const TIMEOUT_MS = 8_000;
export type NativeAccessibleMix = MixItem & {
  owner_user_id: string;
  status: string;
  visibility: 'public' | 'unlisted' | 'private';
  allow_download: boolean;
  bpm_min?: number | null;
  bpm_max?: number | null;
};
export type NativeMixEnvelope = {
  mix: NativeAccessibleMix; tracklist: MixTrackItem[]; owner: boolean; public: boolean; accessKey?: string; playbackAccess?: MixPlaybackAccess; metadataReadAt?: number;
};

export type NativeMixPresentation = Readonly<{ title: string; artist: string; artwork?: string; duration?: number; mixMetadataReadAt: number; public: boolean }>;
export const NATIVE_MIX_METADATA_MAX_AGE_MS = 200_000;

export class NativeMixAccessError extends Error {
  constructor(public readonly reason: 'unavailable' | 'authentication' | 'notFound' = 'unavailable') {
    super(`Mix access: ${reason}`);
  }
}

type Invoke = (name: string, options: { body: { action: string; reference: string; token?: string } }) => PromiseLike<{
  data: unknown; error: unknown;
}>;
type Dependencies = { invoke: Invoke; session: MixAccessSession; projectUrl: string };
const nullableText = (value: unknown): string | null => typeof value === 'string' ? value : null;
const nonnegative = (value: unknown): number | null => typeof value === 'number' && Number.isFinite(value) && value >= 0 ? value : null;
const tags = (value: unknown): string[] | null => Array.isArray(value) && value.every(item => typeof item === 'string') ? [...value] : null;

/** The SDK alone owns authentication. This client supplies only mix identity
 * and an optional in-memory capability, never a catalogue storage pointer.
 */
export function createNativeMixAccessClient({ invoke, session, projectUrl }: Dependencies) {
  const presentations = new Map<string, { access: MixPlaybackAccess; value: NativeMixPresentation; id: string }>();
  session.subscribe(() => {
    for (const [key, stored] of presentations) if (!session.authorized(stored.id, stored.access)) presentations.delete(key);
  });
  const presentation = (id: string, access: MixPlaybackAccess): NativeMixPresentation | undefined => {
    if (!session.authorized(id, access)) return undefined;
    const stored = presentations.get(access.authorizationId);
    return stored?.id === id ? { ...stored.value } : undefined;
  };
  const signedUrl = (value: unknown, cover = false): string => {
    if (typeof value !== 'string') throw new NativeMixAccessError();
    try {
      const url = new URL(value);
      const project = new URL(projectUrl);
      const route = cover
        ? /^\/storage\/v1\/object\/sign\/mix-media\//
        : /^\/storage\/v1\/object\/sign\/(audio-files|Mixes-audio|mixes-audio|mix-media)\//;
      if (url.protocol !== 'https:' || url.origin !== project.origin || url.username || url.password
        || url.hash || !route.test(url.pathname) || !url.searchParams.get('token')) throw new Error();
      return value;
    } catch { throw new NativeMixAccessError(); }
  };

  const request = async (action: 'read' | 'play' | 'download' | 'createLink' | 'revokeLink', reference: string, accessKey?: string) => {
    if (!validMixReference(reference)) throw new NativeMixAccessError();
    let scope: MixAccessScope;
    let token: string | undefined;
    try { scope = session.scope(); token = session.token(scope, reference, accessKey); }
    catch { throw new NativeMixAccessError(); }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const requestedAt = Date.now();
    try {
      const { data, error } = await Promise.race([
        Promise.resolve(invoke('mix-access', { body: { action, reference, ...(token ? { token } : {}) } })),
        new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new NativeMixAccessError()), TIMEOUT_MS); }),
      ]);
      session.assertCurrent(scope);
      if (error) {
        const failure = error as { context?: { status?: number }; status?: number };
        const status = failure.context?.status ?? failure.status;
        throw new NativeMixAccessError(status === 401 ? 'authentication' : status === 404 ? 'notFound' : 'unavailable');
      }
      if (!data || typeof data !== 'object') throw new NativeMixAccessError();
      return { data: data as Record<string, any>, scope, token, requestedAt };
    } catch (error) {
      if (error instanceof NativeMixAccessError) throw error;
      // Neither SDK/provider errors nor stale scope errors can carry a token
      // or signed source into a user message or exception report.
      if (error instanceof MixSessionUnavailable) throw new NativeMixAccessError();
      throw new NativeMixAccessError();
    } finally { if (timer !== undefined) clearTimeout(timer); }
  };

  const parseRead = (data: Record<string, any>, reference: string, scope: MixAccessScope, accessKey?: string, token?: string, readAt = Date.now()): NativeMixEnvelope => {
    session.assertCurrent(scope);
    const raw = data.mix;
    if (data.version !== 1 || !raw || !UUID.test(raw.id) || !UUID.test(raw.owner_user_id)
      || raw.audio_url !== `mix:${raw.id}` || !['public', 'unlisted', 'private'].includes(raw.visibility)
      || typeof raw.status !== 'string' || typeof data.owner !== 'boolean' || typeof data.public !== 'boolean'
      || !Array.isArray(data.tracklist) || typeof raw.allow_download !== 'boolean'
      || (UUID.test(reference) ? raw.id !== reference : raw.slug !== reference)) throw new NativeMixAccessError();
    const owner = scope.actor !== null && raw.owner_user_id === scope.actor;
    const publicMix = raw.visibility === 'public' && raw.status === 'published';
    if (data.owner !== owner || data.public !== publicMix
      || (!publicMix && !owner && !(raw.visibility === 'unlisted' && raw.status === 'published' && token))) throw new NativeMixAccessError();
    let cover = nullableText(raw.cover_url);
    if (cover && raw.visibility !== 'public') cover = signedUrl(cover, true);
    // Explicit fields keep capabilities, source paths and provider diagnostics
    // out of screen/queue state even if an invalid response includes extras.
    const mix: NativeAccessibleMix = {
      id: raw.id, owner_user_id: raw.owner_user_id, slug: nullableText(raw.slug),
      title: nullableText(raw.title), description: nullableText(raw.description),
      audio_url: `mix:${raw.id}`, cover_url: cover,
      duration_seconds: nonnegative(raw.duration_seconds), city: nullableText(raw.city),
      genre_tags: tags(raw.genre_tags), mood_tags: tags(raw.mood_tags),
      recording_type: nullableText(raw.recording_type), event_name: nullableText(raw.event_name),
      like_count: nonnegative(raw.like_count), repost_count: nonnegative(raw.repost_count),
      save_count: nonnegative(raw.save_count), play_count: nonnegative(raw.play_count),
      published_at: nullableText(raw.published_at), created_at: nullableText(raw.created_at),
      visibility: raw.visibility, status: raw.status, allow_download: raw.allow_download,
      bpm_min: nonnegative(raw.bpm_min), bpm_max: nonnegative(raw.bpm_max),
    };
    const tracklist = data.tracklist.map((row: any): MixTrackItem => {
      if (!row || !UUID.test(row.id) || (row.mix_id !== undefined && row.mix_id !== mix.id)
        || !Number.isInteger(row.position) || row.position < 0 || nonnegative(row.start_seconds) === null
        || (row.end_seconds !== null && row.end_seconds !== undefined
          && (nonnegative(row.end_seconds) === null || row.end_seconds < row.start_seconds))) throw new NativeMixAccessError();
      return { id: row.id, mix_id: mix.id, position: row.position, start_seconds: row.start_seconds,
        end_seconds: row.end_seconds ?? null, raw_title: nullableText(row.raw_title), raw_artist: nullableText(row.raw_artist) };
    });
    session.bindCanonicalId(scope, accessKey, reference, mix.id);
    // Public playback must retain its ordinary identity/grant path even when
    // someone opens an old unlisted link after the owner makes the mix public.
    const playbackKey = owner ? undefined : accessKey;
    const playbackAccess = !publicMix ? session.authorize(scope, mix.id, playbackKey) : undefined;
    if (playbackAccess) {
      presentations.set(playbackAccess.authorizationId, { id: mix.id, access: playbackAccess,
        value: { title: mix.title || 'Untitled mix', artist: mix.city || 'PLUGGD DJ', artwork: mix.cover_url || undefined,
          duration: mix.duration_seconds ?? undefined, mixMetadataReadAt: readAt, public: false } });
    }
    return { mix, tracklist, owner, public: publicMix, metadataReadAt: readAt,
      ...(playbackAccess ? { playbackAccess, ...(playbackKey ? { accessKey: playbackKey } : {}) } : {}) };
  };

  const read = async (reference: string, accessKey?: string): Promise<NativeMixEnvelope> => {
    const { data, scope, token, requestedAt } = await request('read', reference, accessKey);
    return parseRead(data, reference, scope, accessKey, token, requestedAt);
  };

  const refreshPresentation = async (id: string, access: MixPlaybackAccess): Promise<NativeMixPresentation> => {
    if (!session.authorized(id, access)) throw new NativeMixAccessError();
    const detail = await read(id, access.accessKey);
    if (!session.authorized(id, access)) throw new NativeMixAccessError();
    const value: NativeMixPresentation = { title: detail.mix.title || 'Untitled mix', artist: detail.mix.city || 'PLUGGD DJ',
      artwork: detail.mix.cover_url || undefined, duration: detail.mix.duration_seconds ?? undefined,
      mixMetadataReadAt: detail.metadataReadAt ?? Date.now(), public: detail.public };
    presentations.set(access.authorizationId, { id, access, value });
    return { ...value };
  };

  // A staggered-rollout fallback can decode only an explicitly published public
  // row. It shares the scoped response parser and never creates private access.
  const publicEnvelope = (reference: string, row: unknown, tracks: unknown, scope: MixAccessScope): NativeMixEnvelope => {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new NativeMixAccessError();
    const mix = row as Record<string, unknown>;
    if (mix.visibility !== 'public' || mix.status !== 'published') throw new NativeMixAccessError();
    return parseRead({ version: 1, mix: { ...mix, audio_url: `mix:${mix.id}` }, tracklist: tracks,
      owner: scope.actor !== null && scope.actor === mix.owner_user_id, public: true }, reference, scope);
  };

  const play = async (id: string, accessKey?: string, protectedMix = false) => {
    if (!UUID.test(id)) throw new NativeMixAccessError();
    const requestedAt = Date.now();
    const { data } = await request('play', id, accessKey);
    if (data.expiresIn !== 300 && data.expiresIn !== 14400) throw new NativeMixAccessError();
    if ((accessKey || protectedMix) && data.expiresIn !== 300) throw new NativeMixAccessError();
    return { url: signedUrl(data.url), expiresAt: requestedAt + data.expiresIn * 1000 };
  };

  const download = async (id: string, accessKey?: string) => {
    if (!UUID.test(id)) throw new NativeMixAccessError();
    const { data } = await request('download', id, accessKey);
    if (typeof data.fileName !== 'string' || !data.fileName || /[\\/\u0000-\u001f\u007f]/.test(data.fileName)) throw new NativeMixAccessError();
    return { url: signedUrl(data.url), fileName: data.fileName };
  };

  const updateOwnerLink=async(id:string,revoke:boolean)=>{
    if(!UUID.test(id)||session.scope().actor===null)throw new NativeMixAccessError('authentication');
    const {data}=await request(revoke?'revokeLink':'createLink',id);
    if(revoke){if(data.revoked!==true)throw new NativeMixAccessError();return null;}
    if(data.mixId!==id||typeof data.token!=='string'||!/^[0-9a-f]{64}$/.test(data.token))throw new NativeMixAccessError();
    return `https://pluggd.fm/mixes/${id}#token=${data.token}`;
  };
  return { read, play, download, publicEnvelope, presentation, refreshPresentation,
    createLink:async(id:string)=>(await updateOwnerLink(id,false))!,revokeLink:async(id:string)=>{await updateOwnerLink(id,true);} };
}

export const nativeMixAccess = createNativeMixAccessClient({
  invoke: (name, options) => supabase.functions.invoke(name, options),
  session: mixAccessSession,
  projectUrl: process.env.EXPO_PUBLIC_SUPABASE_URL || '',
});
