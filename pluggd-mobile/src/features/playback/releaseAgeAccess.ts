import { randomUUID } from 'expo-crypto';
import { supabase } from '../../lib/supabase';
import type { PluggdTrack } from '../../context/PlaybackProvider';

export type ReleaseAccessStatus = 'allowed' | 'signed-out' | 'missing-dob' | 'under-18' | 'unavailable' | 'session-changed' | 'restricted';
export type ReleaseAccessIdentity = { releaseId?: string; trackId?: string };
export type ReleasePlaybackAccess = { authorizationId: string };
export type ReleaseAccessGrant = ReleasePlaybackAccess & { releaseId: string; trackId?: string; sourceCatalogId: string; source: Record<string, any> };
const messages: Record<ReleaseAccessStatus, string> = {
  allowed: '',
  'signed-out': 'Sign in to listen to explicit music. This music is for listeners aged 18 and over.',
  'missing-dob': 'Add your date of birth to confirm your age and listen to explicit music. After saving, try playing again.',
  'under-18': 'This explicit music is only available to listeners aged 18 and over.',
  restricted: 'This music is no longer available to play.',
  unavailable: 'We could not check access to this music. Please try again.',
  'session-changed': 'Your account changed. Please try again.',
};
export class ReleaseAgeAccessError extends Error {
  constructor(public readonly status: ReleaseAccessStatus) { super(messages[status]); this.name = 'ReleaseAgeAccessError'; }
}
export const RELEASE_DECISION_MAX_AGE_MS = 30 * 60_000;
export const RELEASE_DECISION_REFRESH_MARGIN_MS = 60_000;
export const isReleaseAccessDenial = (error: unknown): boolean => error instanceof ReleaseAgeAccessError && ['signed-out', 'missing-dob', 'under-18', 'restricted'].includes(error.status);
export const RELEASE_DOB_SETTINGS_URL = 'https://pluggd.fm/dashboard/settings/account';
export const releaseAccessRecoveryRoute = (error: unknown): '/auth/date-of-birth' | null => error instanceof ReleaseAgeAccessError && error.status === 'missing-dob' ? '/auth/date-of-birth' : null;
/** Kept for callers while recovery moves to the native completion route. */
export const releaseAccessRecoveryUrl = (_error: unknown): string | null => null;
export const releaseAccessMessage = (error: unknown) => error instanceof ReleaseAgeAccessError ? error.message : messages.unavailable;

/** Calendar-date comparison avoids UTC parsing moving an eighteenth birthday.
 * DOB stays within this request and is never placed in a grant or native queue. */
export function adultFromDateOfBirth(value: unknown, now = new Date()): boolean | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day || date > now) return null;
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age--;
  return age >= 18;
}

/** In-memory client policy, not a substitute for server audio authorization. */
export function createReleaseAgeAccess(client = supabase as any) {
  let actor: string | null | undefined;
  let epoch = 0;
  let credentialRevision = 0;
  let observedToken: string | null | undefined;
  let observation: (() => void) | undefined;
  let observers = 0;
  const grants = new Map<string, { actor: string | null; epoch: number; releaseId: string; trackId?: string; token: string | null; credentialRevision: number; decisionExpiresAt: number; explicit: boolean; canonicalUrl: string | null; source?: { url: string; expiresAt: number | null } }>();
  const listeners = new Set<(reason: 'identity' | 'authorization' | 'unavailable') => void>();
  const bind = (nextActor: string | null, nextToken: string | null) => {
    const changed = actor !== undefined && actor !== nextActor;
    if (actor !== nextActor || observedToken !== nextToken) credentialRevision++;
    actor = nextActor; observedToken = nextToken;
    if (changed) { epoch++; grants.clear(); for (const listener of listeners) listener('identity'); }
  };
  const session = async () => {
    const { data, error } = await client.auth.getSession();
    if (error) throw new ReleaseAgeAccessError('unavailable');
    const value = { actor: data.session?.user.id ?? null, token: data.session?.access_token ?? null };
    bind(value.actor, value.token);
    return { ...value, epoch, credentialRevision };
  };
  const current = async (scope: Awaited<ReturnType<typeof session>>) => {
    const next = await session();
    if (scope.credentialRevision !== next.credentialRevision || scope.epoch !== next.epoch || scope.actor !== next.actor || scope.token !== next.token) throw new ReleaseAgeAccessError('session-changed');
  };
  const read = async (operation: PromiseLike<any>) => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const result = await Promise.race([Promise.resolve(operation), new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new ReleaseAgeAccessError('unavailable')), 10_000);
      })]);
      if (result.error) throw new ReleaseAgeAccessError('unavailable');
      return result.data;
    } finally { if (timer !== undefined) clearTimeout(timer); }
  };
  async function assert(identity: ReleaseAccessIdentity): Promise<ReleaseAccessGrant> {
    const startedAt = Date.now();
    const scope = await session();
    try {
      if (!identity.releaseId && !identity.trackId) throw new ReleaseAgeAccessError('unavailable');
      const track = identity.trackId ? await read(client.from('tracks')
        .select('id,release_id,explicit,audio_url,audio_rights_status,playable_on_pluggd,catalogue_import_job_id')
        .eq('id', identity.trackId).maybeSingle()) : null;
      if (identity.trackId && (!track || (identity.releaseId && track.release_id !== identity.releaseId))) throw new ReleaseAgeAccessError('restricted');
      const releaseId = track?.release_id || identity.releaseId;
      if (!releaseId) throw new ReleaseAgeAccessError('unavailable');
      const release = await read(client.from('releases')
        .select('id,user_id,owner_id,owner_type,explicit,audio_url,preview_url,catalogue_mode,catalogue_import_job_id,is_exclusive,is_premium_content,perk_access')
        .eq('id', releaseId).maybeSingle());
      if (!release || release.id !== releaseId) throw new ReleaseAgeAccessError('restricted');
      if (!Object.hasOwn(release, 'explicit') || (track && !Object.hasOwn(track, 'explicit'))) throw new ReleaseAgeAccessError('unavailable');
      // A release-wide action includes every child: a clean parent cannot hide
      // an explicit song in a download, legacy preview or "play all" action.
      const children = track ? [] : await read(client.from('tracks').select('id,explicit').eq('release_id', releaseId));
      if (!Array.isArray(children) || children.some((row: any) => !Object.hasOwn(row, 'explicit'))) throw new ReleaseAgeAccessError('unavailable');
      const explicit = release.explicit === true || track?.explicit === true || children.some((row: any) => row.explicit === true);
      const owner = Boolean(scope.actor && (scope.actor === release.user_id || (release.owner_type === 'profile' && scope.actor === release.owner_id)));
      if (explicit && !owner) {
        if (!scope.actor) throw new ReleaseAgeAccessError('signed-out');
        // Private demographics are authoritative. Never let a public legacy
        // profile override an absent DOB or a private-data read failure.
        const demographics = await read(client.from('profile_private_demographics').select('date_of_birth').eq('user_id', scope.actor).maybeSingle());
        const adult = adultFromDateOfBirth(demographics?.date_of_birth);
        if (adult === null) throw new ReleaseAgeAccessError('missing-dob');
        if (!adult) throw new ReleaseAgeAccessError('under-18');
      }
      await current(scope);
      const authorizationId = randomUUID();
      const restrictedParent = release.is_exclusive || release.is_premium_content
        || !['', 'public', 'free'].includes(String(release.perk_access || 'public').trim().toLowerCase());
      const source = track ? { ...release, ...track,
        // Parent policy can only narrow a song's grant. Imported/reference
        // albums and subscriber previews cannot expose a child's full upload.
        catalogue_mode: release.catalogue_mode,
        catalogue_import_job_id: release.catalogue_import_job_id || track.catalogue_import_job_id,
        is_exclusive: release.is_exclusive, is_premium_content: release.is_premium_content, perk_access: release.perk_access,
        preview_url: restrictedParent ? release.preview_url : undefined,
        audio_url: restrictedParent ? undefined : track.audio_url,
      } : release;
      const canonicalUrl = source.catalogue_import_job_id || (source.catalogue_mode && source.catalogue_mode !== 'pluggd')
        || source.playable_on_pluggd === false || ['unlicensed', 'takedown'].includes(source.audio_rights_status)
        ? null : source.preview_url || source.audio_url || null;
      grants.set(authorizationId, { credentialRevision: scope.credentialRevision, token: scope.token, actor: scope.actor, epoch: scope.epoch,
        releaseId, ...(track ? { trackId: track.id } : {}), decisionExpiresAt: startedAt + RELEASE_DECISION_MAX_AGE_MS, explicit, canonicalUrl });
      return { authorizationId, releaseId, ...(track ? { trackId: track.id } : {}), sourceCatalogId: restrictedParent || !track ? releaseId : track.id, source };
    } catch (error) {
      await current(scope);
      throw error instanceof ReleaseAgeAccessError ? error : new ReleaseAgeAccessError('unavailable');
    }
  }
  return {
    assert,
    async load(identity: ReleaseAccessIdentity) {
      try { await assert(identity); return { allowed: true, status: 'allowed' as ReleaseAccessStatus, message: '' }; }
      catch (error) { return { allowed: false, status: error instanceof ReleaseAgeAccessError ? error.status : 'unavailable' as ReleaseAccessStatus, message: releaseAccessMessage(error) }; }
    },
    reportUnavailable() { for (const listener of listeners) listener('unavailable'); },
    invalidate(access?: ReleasePlaybackAccess) {
      if (access && grants.delete(access.authorizationId)) for (const listener of listeners) listener('authorization');
    },
    async assertCurrent(access: ReleasePlaybackAccess) {
      const grant = grants.get(access.authorizationId);
      if (!grant) throw new ReleaseAgeAccessError('session-changed');
      await current({ actor: grant.actor, epoch: grant.epoch, token: grant.token, credentialRevision: grant.credentialRevision });
    },
    bindSource(access: ReleasePlaybackAccess, originalUrl: string, url: string, expiresAt: number | null) {
      const grant = grants.get(access.authorizationId);
      if (!grant || grant.actor !== actor || grant.epoch !== epoch || !grant.canonicalUrl || originalUrl !== grant.canonicalUrl
        || !url || (expiresAt !== null && (!Number.isFinite(expiresAt) || expiresAt <= Date.now()))) throw new ReleaseAgeAccessError('unavailable');
      grant.source = { url, expiresAt };
    },
    authorized(track?: Partial<PluggdTrack> | null) {
      if (!isReleaseTrack(track)) return true;
      const grant = track?.releaseAccess && grants.get(track.releaseAccess.authorizationId);
      return Boolean(grant && grant.actor === actor && grant.epoch === epoch && grant.releaseId === (track?.releaseId || track?.id)
        && grant.trackId === track?.trackId && grant.source && grant.source.url === track?.url
        && grant.canonicalUrl === track?.playbackSource?.originalUrl);
    },
    deadline(track?: Partial<PluggdTrack> | null): number | null {
      if (!this.authorized(track)) return null;
      const grant = track?.releaseAccess && grants.get(track.releaseAccess.authorizationId);
      return grant?.source ? Math.min(grant.explicit ? grant.decisionExpiresAt : Infinity, grant.source.expiresAt ?? Infinity) : null;
    },
    sourceExpiresAt(track?: Partial<PluggdTrack> | null): number | null | undefined {
      if (!this.authorized(track)) return undefined;
      const grant = track?.releaseAccess && grants.get(track.releaseAccess.authorizationId);
      return grant?.source?.expiresAt;
    },
    refreshAt(track?: Partial<PluggdTrack> | null): number | null {
      if (!this.authorized(track)) return null;
      const grant = track?.releaseAccess && grants.get(track.releaseAccess.authorizationId);
      return grant?.source ? Math.min(grant.decisionExpiresAt - RELEASE_DECISION_REFRESH_MARGIN_MS,
        grant.source.expiresAt === null ? Infinity : grant.source.expiresAt - 30_000) : null;
    },
    playable(track?: Partial<PluggdTrack> | null, now = Date.now()): boolean {
      const deadline = this.deadline(track);
      return typeof deadline === 'number' && now < deadline;
    },
    adopt(previous: PluggdTrack, next: PluggdTrack): boolean {
      if (previous.url !== next.url || !this.authorized(previous) || !this.authorized(next)) return false;
      const old = grants.get(previous.releaseAccess!.authorizationId)!;
      const fresh = grants.get(next.releaseAccess!.authorizationId)!;
      if (old.releaseId !== fresh.releaseId || old.trackId !== fresh.trackId || old.canonicalUrl !== fresh.canonicalUrl) return false;
      // Native metadata need not reload an identical URL to extend a freshly
      // checked policy or signer acknowledgement; its opaque proof stays bound.
      grants.set(previous.releaseAccess!.authorizationId, { ...fresh });
      return true;
    },
    subscribe(listener: (reason: 'identity' | 'authorization' | 'unavailable') => void) { listeners.add(listener); return () => { listeners.delete(listener); }; },
    observe() {
      observers++;
      if (!observation) {
        let live = true; let eventReceived = false; let identityEventReceived = false;
        const { data } = client.auth.onAuthStateChange((_event: string, value: any) => {
          if (!live || (_event === 'INITIAL_SESSION' && identityEventReceived)) return;
          if (_event !== 'INITIAL_SESSION') identityEventReceived = true;
          eventReceived = true; bind(value?.user.id ?? null, value?.access_token ?? null);
        });
        void client.auth.getSession().then(({ data: snapshot }: any) => {
          if (live && !eventReceived) bind(snapshot.session?.user.id ?? null, snapshot.session?.access_token ?? null);
        }).catch(() => { if (live && !eventReceived) bind(null, null); });
        observation = () => { live = false; data.subscription.unsubscribe(); };
      }
      let released = false;
      return () => { if (released) return; released = true; if (--observers === 0) { observation?.(); observation = undefined; } };
    },
  };
}
export function isReleaseTrack(track?: Partial<PluggdTrack> | null): boolean {
  const kind = track?.sourceType ?? track?.type;
  return Boolean(track && (kind === 'release' || ((!kind || kind === 'preview') && (track.releaseId || track.trackId))));
}
export const releaseAgeAccess = createReleaseAgeAccess();
export const assertReleaseAccess = releaseAgeAccess.assert;
export const loadReleaseAccess = releaseAgeAccess.load;
export const assertReleaseGrantCurrent = releaseAgeAccess.assertCurrent;
export const hasCurrentReleaseAccess = (track?: Partial<PluggdTrack> | null) => releaseAgeAccess.authorized(track);
