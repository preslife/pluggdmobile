import { supabase } from './supabase';

type PublicCreator = { user_id?: string | null; id?: string | null; is_pro?: boolean };

export function proFirst<T extends { is_pro?: boolean }>(rows: readonly T[]): T[] {
  return [...rows.filter((row) => row.is_pro), ...rows.filter((row) => !row.is_pro)];
}

async function listingIds(name: 'pro_member_ids' | 'hidden_listing_ids', ids: string[]) {
  const matches = new Set<string>();
  for (let offset = 0; offset < ids.length; offset += 1000) {
    const { data, error } = await (supabase as any).rpc(name, { p_user_ids: ids.slice(offset, offset + 1000) });
    if (error) throw new Error('Creator listings could not be checked. Please try again.');
    for (const row of data ?? []) {
      const id = typeof row === 'string' ? row : row?.[name];
      if (typeof id === 'string') matches.add(id);
    }
  }
  return matches;
}

/** Listing metadata never affects direct profiles or reviewer authentication. */
export async function prepareCreatorListings<T extends PublicCreator>(rows: readonly T[]): Promise<Array<T & { is_pro: boolean }>> {
  const identity = (row: T) => row.user_id || row.id || '';
  const ids = [...new Set(rows.map(identity).filter(Boolean))];
  const [hidden, pro] = await Promise.all([
    listingIds('hidden_listing_ids', ids),
    // Placement is optional; a failed hidden-account lookup must not expose a listing.
    listingIds('pro_member_ids', ids).catch(() => new Set<string>()),
  ]);
  return proFirst(rows.filter((row) => !hidden.has(identity(row)))
    .map((row) => ({ ...row, is_pro: pro.has(identity(row)) })));
}
