import type { MixAccessScope } from '../playback/mixAccessSession';

export type MixSocialState = { liked: boolean; saved: boolean; likes: number; saves: number };
type Database = { from: (table: 'mixes' | 'mix_likes' | 'mix_saves' | 'saved_content') => any };
const count = (value: unknown) => Number.isSafeInteger(value) && Number(value) >= 0 ? Number(value) : 0;

/** Canonical website reactions: the captured actor never comes from a later auth lookup. */
export function createMixSocialService(database: Database, assertCurrent: (scope: MixAccessScope) => void) {
  async function publicCounts(scope: MixAccessScope, mixId: string) {
    assertCurrent(scope);
    const { data, error } = await database.from('mixes').select('like_count,save_count')
      .eq('id', mixId).eq('status', 'published').eq('visibility', 'public').maybeSingle();
    assertCurrent(scope);
    if (error || !data) throw new Error('This public mix is no longer available.');
    return { likes: count(data.like_count), saves: count(data.save_count) };
  }

  async function read(scope: MixAccessScope, mixId: string): Promise<MixSocialState> {
    assertCurrent(scope);
    if (!scope.actor) throw new Error('Sign in to Like or Save this mix.');
    const [like, save, legacy, counts] = await Promise.all([
      database.from('mix_likes').select('mix_id').eq('mix_id', mixId).eq('user_id', scope.actor).maybeSingle(),
      database.from('mix_saves').select('mix_id').eq('mix_id', mixId).eq('user_id', scope.actor).maybeSingle(),
      database.from('saved_content').select('id').eq('content_type', 'mix').eq('content_id', mixId).eq('user_id', scope.actor).maybeSingle(),
      publicCounts(scope, mixId),
    ]);
    assertCurrent(scope);
    if (like.error || save.error || legacy.error) throw new Error('Your Like and Save choices could not load.');
    return { liked: Boolean(like.data), saved: Boolean(save.data || legacy.data), ...counts };
  }

  async function change(scope: MixAccessScope, mixId: string, kind: 'like' | 'save', enabled: boolean): Promise<MixSocialState> {
    assertCurrent(scope);
    if (!scope.actor) throw new Error('Sign in to Like or Save this mix.');
    await publicCounts(scope, mixId);
    assertCurrent(scope);
    const table = kind === 'like' ? 'mix_likes' : 'mix_saves';
    const result = enabled
      ? await database.from(table).insert({ mix_id: mixId, user_id: scope.actor })
      : await database.from(table).delete().eq('mix_id', mixId).eq('user_id', scope.actor);
    assertCurrent(scope);
    if (result.error && !(enabled && result.error.code === '23505')) throw new Error('Your choice could not be saved. Please try again.');
    if (kind === 'save' && !enabled) {
      // Clear an older generic bookmark only after proving this ID is a real public Mix.
      // Never create another generic row; old release-based bookmarks retain their own path.
      const legacy = await database.from('saved_content').select('id').eq('content_type', 'mix')
        .eq('content_id', mixId).eq('user_id', scope.actor).maybeSingle();
      assertCurrent(scope);
      if (legacy.error) throw new Error('Your saved choices could not be fully updated. Please try again.');
      if (legacy.data?.id) {
        const removed = await database.from('saved_content').delete().eq('id', legacy.data.id)
          .eq('content_type', 'mix').eq('content_id', mixId).eq('user_id', scope.actor);
        assertCurrent(scope);
        if (removed.error) throw new Error('Your saved choices could not be fully updated. Please try again.');
      }
    }
    // Trigger counts and actual rows remain authoritative, including duplicate taps/devices.
    return read(scope, mixId);
  }
  return { read, change };
}

const inFlight = new Set<string>();
export async function withMixSocialLock<T>(identity: string, action: () => Promise<T>): Promise<T> {
  if (inFlight.has(identity)) throw new Error('Your previous choice is still saving.');
  inFlight.add(identity);
  try { return await action(); } finally { inFlight.delete(identity); }
}
