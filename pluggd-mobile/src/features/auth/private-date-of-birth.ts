import { supabase } from '../../lib/supabase';
import { supabaseStorage } from '../../lib/storage';
import { MINIMUM_AGE } from '../../config/environment';

const PREFIX = 'pluggd_private_signup_dob_v1:';
export const PENDING_DOB_TTL_MS = 24 * 60 * 60 * 1000;
const ACTIVE_DOB_TTL_MS = 15 * 60 * 1000;
const REQUEST_TIMEOUT_MS = 10_000;
type Intent = { userId: string; dateOfBirth: string; createdAt: number; durable: boolean };
type PrivateDateOfBirth = { hasDateOfBirth: boolean; adult: boolean | null };
type Storage = { getItem(key: string): Promise<string | null>; setItem(key: string, value: string): Promise<void>; removeItem(key: string): Promise<void>; getAllKeys?(): Promise<readonly string[]> };
export class PrivateDateOfBirthError extends Error {
  constructor(public readonly reason: 'invalid' | 'signed-out' | 'session-changed' | 'unavailable') {
    super(reason === 'invalid' ? `Choose a valid date of birth. You must be at least ${MINIMUM_AGE}.`
      : reason === 'signed-out' ? 'Sign in to save your private date of birth.'
      : reason === 'session-changed' ? 'Your account changed. Please try again.'
      : 'Your private date of birth could not be checked or saved. Please try again.');
    this.name = 'PrivateDateOfBirthError';
  }
}
export function birthDateAge(value: unknown, now = new Date()): number | null {
  if (typeof value !== 'string') return null;
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const [year, month, day] = match.slice(1).map(Number);
  const date = new Date(year, month - 1, day, 12);
  if (year < 1900 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) return null;
  let age = now.getFullYear() - year;
  if (now.getMonth() + 1 < month || now.getMonth() + 1 === month && now.getDate() < day) age--;
  return age < 0 ? null : age;
}
export function birthDateForStorage(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function latestSignupBirthDate(now = new Date()) {
  const date = new Date(now); date.setHours(12, 0, 0, 0); date.setFullYear(date.getFullYear() - MINIMUM_AGE); return date;
}

/** Self-owned private-table requests only. Never reads metadata or public DOB. */
export function createPrivateDateOfBirthService(client = supabase as any, storage: Storage = supabaseStorage, now = () => Date.now()) {
  const activeIntents = new Map<string, Intent>();
  let cleanupInFlight: Promise<void> | null = null;
  const valid = (value: unknown) => { const age = birthDateAge(value, new Date(now())); return age !== null && age >= MINIMUM_AGE; };
  const summary = (row: any): PrivateDateOfBirth => {
    const age = birthDateAge(row?.date_of_birth, new Date(now()));
    return { hasDateOfBirth: Boolean(row?.date_of_birth), adult: age === null ? null : age >= 18 };
  };
  async function bounded<T>(operation: PromiseLike<T>): Promise<T> {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([Promise.resolve(operation), new Promise<never>((_, reject) => {
      timer = setTimeout(() => reject(new PrivateDateOfBirthError('unavailable')), REQUEST_TIMEOUT_MS);
    })]); } finally { if (timer) clearTimeout(timer); }
  }
  function cleanupExpired(): Promise<void> {
    if (cleanupInFlight) return cleanupInFlight;
    cleanupInFlight = (async () => {
      for (const [id, intent] of activeIntents) {
        if (now() - intent.createdAt > ACTIVE_DOB_TTL_MS || intent.createdAt > now()) activeIntents.delete(id);
      }
      if (!storage.getAllKeys) return;
      const keys = (await bounded(storage.getAllKeys())).filter((key) => key.startsWith(PREFIX));
      // At most eight reads run together. Only this private-intent prefix is
      // considered; a failed/slow local read cannot delete an unexpired intent.
      for (let offset = 0; offset < keys.length; offset += 8) {
        await Promise.allSettled(keys.slice(offset, offset + 8).map(async (key) => {
          const raw = await bounded(storage.getItem(key));
          if (!raw) return;
          let createdAt: unknown;
          try { createdAt = JSON.parse(raw)?.createdAt; } catch { return; }
          if (typeof createdAt !== 'number' || !Number.isFinite(createdAt) || now() - createdAt <= PENDING_DOB_TTL_MS) return;
          if (await bounded(storage.getItem(key)) === raw) await bounded(storage.removeItem(key));
        }));
      }
    })().finally(() => { cleanupInFlight = null; });
    return cleanupInFlight;
  }
  async function ownActor<T>(userId: string, run: (scope: { read(query: any): Promise<any>; assertCurrent(): Promise<void> }) => Promise<T>, current = () => true): Promise<T> {
    const controller = new AbortController();
    let revision = 0;
    const { data: listener } = client.auth.onAuthStateChange((event: string) => {
      if (event !== 'INITIAL_SESSION') { revision++; controller.abort(); }
    });
    try {
      const initial = await bounded<any>(client.auth.getSession());
      const session = initial.data?.session;
      if (initial.error) throw new PrivateDateOfBirthError('unavailable');
      if (!session?.user?.id || !session.access_token) throw new PrivateDateOfBirthError('signed-out');
      if (session.user.id !== userId || revision || !current()) throw new PrivateDateOfBirthError('session-changed');
      const token = session.access_token;
      const assertCurrent = async () => {
        if (revision || controller.signal.aborted || !current()) throw new PrivateDateOfBirthError('session-changed');
        const next = await bounded<any>(client.auth.getSession());
        if (next.error) throw new PrivateDateOfBirthError('unavailable');
        if (revision || controller.signal.aborted || !current() || next.data?.session?.user?.id !== userId || next.data?.session?.access_token !== token) throw new PrivateDateOfBirthError('session-changed');
      };
      const verified = await bounded<any>(client.auth.getUser(token));
      await assertCurrent();
      if (verified.error) throw new PrivateDateOfBirthError('unavailable');
      if (verified.data?.user?.id !== userId) throw new PrivateDateOfBirthError('signed-out');
      const read = async (query: any) => {
        await assertCurrent();
        // The installed SDK preserves an explicitly-set Authorization header.
        // Account rotation can never replace this request's initiating bearer.
        const result = await bounded<any>(query.setHeader('Authorization', `Bearer ${token}`).abortSignal(controller.signal));
        await assertCurrent();
        if (result.error) throw new PrivateDateOfBirthError('unavailable');
        return result.data;
      };
      return await run({ read, assertCurrent });
    } catch (error) {
      if (revision || !current()) throw new PrivateDateOfBirthError('session-changed');
      throw error instanceof PrivateDateOfBirthError ? error : new PrivateDateOfBirthError('unavailable');
    } finally { controller.abort(); listener.subscription.unsubscribe(); }
  }
  const ownRow = (userId: string) => client.from('profile_private_demographics').select('user_id,date_of_birth').eq('user_id', userId).maybeSingle();
  async function save(scope: { read(query: any): Promise<any>; assertCurrent(): Promise<void> }, userId: string, dateOfBirth: string) {
    const row = await scope.read(ownRow(userId));
    if (row && row.user_id !== userId) throw new PrivateDateOfBirthError('unavailable');
    if (row?.date_of_birth) return summary(row);
    const write = row
      ? client.from('profile_private_demographics').update({ date_of_birth: dateOfBirth }).eq('user_id', userId).is('date_of_birth', null)
      : client.from('profile_private_demographics').upsert({ user_id: userId, date_of_birth: dateOfBirth }, { onConflict: 'user_id', ignoreDuplicates: true });
    await scope.read(write);
    const saved = await scope.read(ownRow(userId));
    if (saved?.user_id !== userId || !saved.date_of_birth) throw new PrivateDateOfBirthError('unavailable');
    return summary(saved);
  }
  async function rememberSignup(userId: string, dateOfBirth: string, durable: boolean) {
    if (!userId || !valid(dateOfBirth)) throw new PrivateDateOfBirthError('invalid');
    await cleanupExpired().catch(() => undefined);
    const intent: Intent = { userId, dateOfBirth, createdAt: now(), durable };
    if (durable) {
      try { await storage.setItem(`${PREFIX}${userId}`, JSON.stringify(intent)); }
      catch { throw new PrivateDateOfBirthError('unavailable'); }
    }
    else activeIntents.set(userId, intent);
  }
  async function resumeSignup(userId: string, current = () => true): Promise<PrivateDateOfBirth | null> {
    await cleanupExpired().catch(() => undefined);
    const key = `${PREFIX}${userId}`;
    const raw = await bounded(storage.getItem(key));
    if (!raw && !activeIntents.has(userId)) return null;
    return ownActor(userId, async (scope) => {
      await scope.assertCurrent();
      let intent = activeIntents.get(userId);
      if (!intent && raw) { try { intent = JSON.parse(raw); } catch { /* Invalid local intent is discarded below. */ } }
      const ttl = intent?.durable ? PENDING_DOB_TTL_MS : ACTIVE_DOB_TTL_MS;
      if (!intent || intent.userId !== userId || !valid(intent.dateOfBirth) || !Number.isFinite(intent.createdAt) || intent.createdAt > now() || now() - intent.createdAt > ttl) {
        activeIntents.delete(userId);
        if (raw && await storage.getItem(key) === raw) { await scope.assertCurrent(); await storage.removeItem(key); }
        return null;
      }
      const result = await save(scope, userId, intent.dateOfBirth);
      await scope.assertCurrent();
      if (activeIntents.get(userId) === intent) activeIntents.delete(userId);
      if (raw && await storage.getItem(key) === raw) { await scope.assertCurrent(); await storage.removeItem(key); }
      return result;
    }, current);
  }
  return {
    rememberSignup, resumeSignup, cleanupExpired,
    load(userId: string, current = () => true) { return ownActor(userId, async (scope) => {
      const row = await scope.read(ownRow(userId));
      if (row && row.user_id !== userId) throw new PrivateDateOfBirthError('unavailable');
      return summary(row);
    }, current); },
    saveMissing(userId: string, dateOfBirth: string, current = () => true) {
      if (!valid(dateOfBirth)) return Promise.reject(new PrivateDateOfBirthError('invalid'));
      return ownActor(userId, (scope) => save(scope, userId, dateOfBirth), current);
    },
  };
}
export const privateDateOfBirth = createPrivateDateOfBirthService();
