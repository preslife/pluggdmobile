import { supabase } from '../../lib/supabase';
import { isPresentablePublicUsername } from '../../lib/publicAudienceFilters';

export type PublicCreatorIdentity = {
  user_id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

type IdentityQueryResult = {
  data: unknown;
  error: { message?: string | null } | null;
};

function clean(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function presentableUsername(value: unknown) {
  const username = clean(value)?.replace(/^@/, '') || null;
  return isPresentablePublicUsername(username) ? username : null;
}

function normaliseIdentity(row: Record<string, unknown>): PublicCreatorIdentity | null {
  const userId = clean(row.user_id);
  if (!userId) return null;
  return {
    user_id: userId,
    full_name: clean(row.full_name),
    username: presentableUsername(row.username),
    avatar_url: clean(row.avatar_url),
  };
}

function mergeIdentity(
  primary: PublicCreatorIdentity | undefined,
  fallback: PublicCreatorIdentity,
): PublicCreatorIdentity {
  if (!primary) return fallback;
  return {
    user_id: primary.user_id,
    full_name: primary.full_name || fallback.full_name,
    username: primary.username || fallback.username,
    avatar_url: primary.avatar_url || fallback.avatar_url,
  };
}

async function readIdentityRows(table: 'social_author_profiles' | 'public_profiles' | 'profiles', userIds: string[]) {
  if (!userIds.length) return [];
  try {
    const result = await (supabase as any)
      .from(table)
      .select('user_id,full_name,username,avatar_url')
      .in('user_id', userIds) as IdentityQueryResult;
    if (result.error || !Array.isArray(result.data)) return [];
    return result.data
      .map((row) => normaliseIdentity(row as Record<string, unknown>))
      .filter((row): row is PublicCreatorIdentity => Boolean(row));
  } catch {
    return [];
  }
}

/**
 * Resolves the same public-safe creator identity authority as the web social
 * feed. Signed-out readers receive display-only rows from
 * social_author_profiles. The public creator-directory view fills non-social
 * catalogue owners, and a direct profiles lookup is the final authenticated
 * fallback while preserving either public result as authoritative.
 */
export async function loadPublicCreatorIdentityMap(userIds: Array<string | null | undefined>) {
  const ids = Array.from(new Set(userIds.filter((id): id is string => Boolean(id?.trim())).map((id) => id.trim())));
  const map = new Map<string, PublicCreatorIdentity>();
  if (!ids.length) return map;

  const [publicRows, publicCreatorRows] = await Promise.all([
    readIdentityRows('social_author_profiles', ids),
    readIdentityRows('public_profiles', ids),
  ]);
  publicRows.forEach((identity) => map.set(identity.user_id, identity));
  publicCreatorRows.forEach((identity) => map.set(identity.user_id, mergeIdentity(map.get(identity.user_id), identity)));

  const privateFallbackIds = ids.filter((id) => {
    const identity = map.get(id);
    return !identity || !identity.full_name || !identity.username || !identity.avatar_url;
  });
  if (privateFallbackIds.length) {
    const privateRows = await readIdentityRows('profiles', privateFallbackIds);
    privateRows.forEach((identity) => map.set(identity.user_id, mergeIdentity(map.get(identity.user_id), identity)));
  }

  return map;
}

export function publicCreatorDisplayName(identity?: PublicCreatorIdentity | null) {
  return identity?.full_name || identity?.username || 'Community member';
}
