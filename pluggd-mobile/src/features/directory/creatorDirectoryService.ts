import { supabase } from '../../lib/supabase';
import { getCurrentUserId } from '../culture/mobileServices';
import { loadBlockedUserIds } from '../safety/accountSafety';
import { isPresentablePublicUsername, isPublicProfileName } from '../../lib/publicAudienceFilters';

export type CreatorDirectoryTab = 'artist' | 'creator' | 'industry';

export type CreatorDirectoryEntry = {
  userId: string;
  profileId: string | null;
  displayName: string;
  username: string | null;
  avatarUrl: string | null;
  coverUrl: string | null;
  bio: string | null;
  role: string;
  tab: CreatorDirectoryTab;
  genre: string | null;
  city: string | null;
  country: string | null;
  verified: boolean;
  followerCount: number | null;
  following: boolean;
  route: string;
};

export const CREATOR_DIRECTORY_PAGE_SIZE = 100;
const MAX_DIRECTORY_PAGES = 50;

const INDUSTRY_TYPES = new Set([
  'industry',
  'manager',
  'management',
  'promoter',
  'venue',
  'service provider',
  'service_provider',
  'label',
  'agency',
]);

const ARTIST_TYPES = new Set(['artist', 'musician', 'singer', 'songwriter', 'band']);

function cleanText(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function token(value: unknown) {
  return cleanText(value)?.toLocaleLowerCase('en-GB').replace(/[-_]+/g, ' ') || '';
}

function titleCase(value: string) {
  return value.replace(/[-_]+/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function classifyCreatorDirectoryRow(row: Record<string, unknown>): CreatorDirectoryTab {
  const userType = token(row.user_type);
  const profileType = token(row.profile_type);
  if (userType === 'industry' || INDUSTRY_TYPES.has(profileType)) return 'industry';
  if (row.is_creator === true || userType === 'creator' || profileType === 'creator') return 'creator';
  if (userType === 'artist' || ARTIST_TYPES.has(profileType)) return 'artist';
  return 'creator';
}

function roleLabel(row: Record<string, unknown>, tab: CreatorDirectoryTab) {
  const profileType = cleanText(row.profile_type);
  if (profileType && token(profileType) !== 'creator') return titleCase(profileType);
  const userType = cleanText(row.user_type);
  if (userType && token(userType) !== 'creator') return userType === 'industry' ? 'Music Industry' : titleCase(userType);
  return tab === 'artist' ? 'Artist' : tab === 'industry' ? 'Music Industry' : 'PLUGGD Creator';
}

function numberOrNull(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) && number >= 0 ? number : null;
}

function rowIdentity(row: Record<string, unknown>) {
  return cleanText(row.user_id) || cleanText(row.id);
}

function rowCompleteness(row: Record<string, unknown>) {
  return [
    row.is_creator === true,
    cleanText(row.username),
    cleanText(row.display_name),
    cleanText(row.full_name),
    cleanText(row.avatar_url),
    cleanText(row.cover_image_url),
    cleanText(row.bio),
  ].filter(Boolean).length;
}

export function dedupeCreatorDirectoryRows(rows: Array<Record<string, unknown>>) {
  const byUserId = new Map<string, Record<string, unknown>>();
  rows.forEach((row) => {
    const id = rowIdentity(row);
    if (!id) return;
    const current = byUserId.get(id);
    if (!current || rowCompleteness(row) > rowCompleteness(current)) {
      byUserId.set(id, row);
    }
  });
  return Array.from(byUserId.values()).sort((left, right) =>
    (rowIdentity(left) || '').localeCompare(rowIdentity(right) || '', 'en-GB'),
  );
}

async function loadPublicProfilePages() {
  const rows: Array<Record<string, unknown>> = [];
  let exactCount: number | null = null;

  for (let page = 0; page < MAX_DIRECTORY_PAGES; page += 1) {
    const from = page * CREATOR_DIRECTORY_PAGE_SIZE;
    const to = from + CREATOR_DIRECTORY_PAGE_SIZE - 1;
    const { data, error, count } = await (supabase as any)
      .from('public_profiles')
      .select('*', { count: 'exact' })
      .order('user_id', { ascending: true })
      .order('id', { ascending: true })
      .range(from, to);

    if (error) throw new Error(error.message || 'The creator directory could not load.');
    const pageRows = Array.isArray(data) ? data as Array<Record<string, unknown>> : [];
    rows.push(...pageRows);
    if (typeof count === 'number') exactCount = count;

    if (pageRows.length < CREATOR_DIRECTORY_PAGE_SIZE || (exactCount !== null && rows.length >= exactCount)) {
      break;
    }
  }

  if (exactCount !== null && rows.length < exactCount) {
    throw new Error('The creator directory could not load every public profile.');
  }
  return dedupeCreatorDirectoryRows(rows);
}

export async function loadCreatorDirectory(): Promise<CreatorDirectoryEntry[]> {
  const [viewerId, sourceRows] = await Promise.all([
    getCurrentUserId(),
    loadPublicProfilePages(),
  ]);
  const blockedIds = viewerId ? await loadBlockedUserIds() : new Set<string>();
  const candidateIds = Array.from(new Set(sourceRows
    .map(rowIdentity)
    .filter((id): id is string => Boolean(id && !blockedIds.has(id)))));

  let followingIds = new Set<string>();
  if (viewerId && candidateIds.length) {
    const { data: followRows } = await (supabase as any)
      .from('user_follows')
      .select('following_id')
      .eq('follower_id', viewerId)
      .in('following_id', candidateIds);
    followingIds = new Set(
      (Array.isArray(followRows) ? followRows : [])
        .map((row: Record<string, unknown>) => cleanText(row.following_id))
        .filter((id: string | null): id is string => Boolean(id)),
    );
  }

  const entries = sourceRows.flatMap<CreatorDirectoryEntry>((row) => {
    const userId = rowIdentity(row);
    if (!userId || blockedIds.has(userId)) return [];
    const isCreator = row.is_creator === true;
    const userType = token(row.user_type);
    const profileType = token(row.profile_type);
    if (!isCreator && !userType && !profileType) return [];

    const candidateUsername = cleanText(row.username) || cleanText(row.slug);
    const username = isPresentablePublicUsername(candidateUsername) ? candidateUsername?.replace(/^@/, '') || null : null;
    const displayName = cleanText(row.display_name)
      || cleanText(row.full_name)
      || username;
    if (!displayName || !isPublicProfileName(displayName)) return [];
    const tab = classifyCreatorDirectoryRow(row);
    const country = cleanText(row.country)
      || cleanText(row.country_name)
      || cleanText(row.country_code);

    return [{
      userId,
      profileId: cleanText(row.id),
      displayName,
      username,
      avatarUrl: cleanText(row.avatar_url) || cleanText(row.logo_url),
      coverUrl: cleanText(row.cover_image_url),
      bio: cleanText(row.bio),
      role: roleLabel(row, tab),
      tab,
      genre: cleanText(row.primary_genre) || cleanText(row.genre),
      city: cleanText(row.city) || cleanText(row.location),
      country,
      verified: row.is_verified === true || row.verified === true,
      followerCount: numberOrNull(row.follower_count ?? row.followers_count),
      following: followingIds.has(userId),
      route: username ? `/creator/${encodeURIComponent(username)}` : `/user/${encodeURIComponent(userId)}`,
    }];
  });

  return entries.sort((left, right) =>
    Number(right.verified) - Number(left.verified)
    || (right.followerCount ?? -1) - (left.followerCount ?? -1)
    || left.displayName.localeCompare(right.displayName, 'en-GB')
    || left.userId.localeCompare(right.userId, 'en-GB'),
  );
}
