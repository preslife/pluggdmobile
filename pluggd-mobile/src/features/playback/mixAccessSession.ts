import { randomUUID } from 'expo-crypto';

export type MixAccessScope = Readonly<{ actor: string | null; generation: number; instance: string }>;
export type MixPlaybackAccess = Readonly<{ scope: MixAccessScope; authorizationId: string; accessKey?: string }>;
export type MixSessionChange = 'hydrated' | 'identity' | 'authorization';
type Capability = { reference: string; canonicalId?: string; token: string; generation: number };
const TOKEN = /^[0-9a-f]{64}$/;
const HANDLE = /^[0-9a-f-]{36}$/i;
const MAX_CAPABILITIES = 64;

export class MixSessionUnavailable extends Error {
  constructor() { super('Mix access is no longer available'); }
}

export function validMixReference(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0 && value.length <= 200
    && !/[\s\u0000-\u001f\u007f/%?#\\]/.test(value);
}

/** Bearer capabilities never enter route params, native Track metadata or storage.
 * An opaque route handle is useful only in this live JS session and actor epoch.
 * Initial auth hydration binds cold-start links once; subsequent actor changes
 * invalidate them, including logout followed by signing back into the same user.
 */
export class MixAccessSession {
  private actor: string | null | undefined;
  private generation = 0;
  private revision = 0;
  private readonly instance: string;
  private readonly capabilities = new Map<string, Capability>();
  private readonly authorizations = new Map<string, { reference: string; accessKey?: string }>();
  private readonly listeners = new Set<(reason: MixSessionChange) => void>();

  constructor(private readonly newHandle: () => string = randomUUID) { this.instance = newHandle(); }

  version(): number { return this.revision; }
  identityKey(): string { return `${this.instance}:${this.generation}:${this.actor === undefined ? 'pending' : this.actor ?? 'guest'}`; }
  private emit(reason: MixSessionChange): void {
    this.revision++;
    for (const listener of this.listeners) listener(reason);
  }

  bindActor(actor: string | null): void {
    if (this.actor === actor) return;
    const hydrated = this.actor !== undefined;
    this.actor = actor;
    if (hydrated) {
      this.generation++;
      this.capabilities.clear();
      this.authorizations.clear();
    }
    this.emit(hydrated ? 'identity' : 'hydrated');
  }

  scope(): MixAccessScope {
    if (this.actor === undefined) throw new MixSessionUnavailable();
    return { actor: this.actor, generation: this.generation, instance: this.instance };
  }

  current(scope: MixAccessScope): boolean {
    return this.actor !== undefined && scope.actor === this.actor && scope.generation === this.generation && scope.instance === this.instance;
  }

  assertCurrent(scope: MixAccessScope): void {
    if (!this.current(scope)) throw new MixSessionUnavailable();
  }

  subscribe(listener: (reason: MixSessionChange) => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }

  remember(reference: string, token: string): string {
    if (!validMixReference(reference) || !TOKEN.test(token)) throw new MixSessionUnavailable();
    const handle = this.newHandle();
    if (!HANDLE.test(handle) || this.capabilities.has(handle)) throw new MixSessionUnavailable();
    this.capabilities.set(handle, { reference, token, generation: this.generation });
    if (this.capabilities.size > MAX_CAPABILITIES) {
      const oldest = this.capabilities.keys().next().value;
      if (oldest !== undefined) this.forget(oldest);
    }
    return handle;
  }

  token(scope: MixAccessScope, reference: string, handle?: string): string | undefined {
    this.assertCurrent(scope);
    if (handle === undefined) return undefined;
    const entry = this.capabilities.get(handle);
    if (!entry || entry.generation !== scope.generation
      || (entry.reference !== reference && entry.canonicalId !== reference)) throw new MixSessionUnavailable();
    return entry.token;
  }

  bindCanonicalId(scope: MixAccessScope, handle: string | undefined, reference: string, id: string): void {
    if (handle === undefined) return;
    this.token(scope, reference, handle);
    this.capabilities.get(handle)!.canonicalId = id;
  }

  forget(handle: string): void {
    this.capabilities.delete(handle);
    let changed = false;
    for (const [id, authorization] of this.authorizations) {
      if (authorization.accessKey === handle) { this.authorizations.delete(id); changed = true; }
    }
    if (changed) this.emit('authorization');
  }

  authorize(scope: MixAccessScope, reference: string, accessKey?: string): MixPlaybackAccess {
    this.token(scope, reference, accessKey);
    for (const [authorizationId, existing] of this.authorizations) {
      if (existing.reference === reference && existing.accessKey === accessKey) {
        return { scope, authorizationId, ...(accessKey ? { accessKey } : {}) };
      }
    }
    const authorizationId = this.newHandle();
    if (!HANDLE.test(authorizationId) || this.authorizations.has(authorizationId)) throw new MixSessionUnavailable();
    this.authorizations.set(authorizationId, { reference, accessKey });
    if (this.authorizations.size > MAX_CAPABILITIES) {
      const oldest = this.authorizations.keys().next().value;
      if (oldest !== undefined) this.invalidateAuthorization(oldest);
    }
    return { scope, authorizationId, ...(accessKey ? { accessKey } : {}) };
  }

  authorized(reference: string, access: MixPlaybackAccess): boolean {
    try {
      const stored = this.authorizations.get(access.authorizationId);
      if (!stored || stored.reference !== reference || stored.accessKey !== access.accessKey) return false;
      this.token(access.scope, reference, access.accessKey);
      return true;
    } catch { return false; }
  }

  invalidateAuthorization(authorizationId: string): void {
    if (!this.authorizations.delete(authorizationId)) return;
    this.emit('authorization');
  }

  /** Expo native-intent boundary. Preserve all unrelated auth/content links.
   * Query capabilities are never accepted. A malformed capability is removed
   * from navigation and leaves a fail-closed marker for the detail screen.
   */
  rewriteLink(path: string, extraHost?: string): string {
    let url: URL;
    let pathname: string;
    let mixTarget = false;
    let invalidOrigin = false;
    try {
      url = new URL(path, 'https://pluggd.fm');
      if (url.protocol === 'pluggd:') {
        if (url.hostname !== '' && url.hostname !== 'mixes') return path;
        invalidOrigin = Boolean(url.username || url.password || url.port);
        pathname = url.hostname === 'mixes' ? `/mixes${url.pathname}` : url.pathname;
      } else {
        const hosts = new Set(['pluggd.fm', 'www.pluggd.fm', 'pluggd.live', 'www.pluggd.live']);
        if (extraHost && /^[a-z0-9.-]+$/i.test(extraHost)) hosts.add(extraHost.toLowerCase());
        if (!['http:', 'https:'].includes(url.protocol) || !hosts.has(url.hostname)) return path;
        invalidOrigin = url.protocol !== 'https:' || Boolean(url.port || url.username || url.password);
        pathname = url.pathname;
      }
      const match = pathname.match(/^\/mixes\/([^/]+)\/?$/);
      if (!match) return path;
      mixTarget = true;
      const reference = decodeURIComponent(match[1]);
      if (!validMixReference(reference)) return '/mixes/unavailable?access=invalid';
      if (invalidOrigin) return `/mixes/${encodeURIComponent(reference)}?access=invalid`;
      const fragment = new URLSearchParams(url.hash.slice(1));
      const tokens = fragment.getAll('token');
      if (!tokens.length && !url.searchParams.has('token')) return path;
      let handle = 'invalid';
      if (!url.searchParams.has('token') && tokens.length === 1 && TOKEN.test(tokens[0])) {
        handle = this.remember(reference, tokens[0]);
      }
      return `/mixes/${encodeURIComponent(reference)}?access=${handle}`;
    } catch {
      // A malformed target link must not crash the router or echo its secret.
      return mixTarget ? '/mixes/unavailable?access=invalid' : path;
    }
  }
}

export const mixAccessSession = new MixAccessSession();
