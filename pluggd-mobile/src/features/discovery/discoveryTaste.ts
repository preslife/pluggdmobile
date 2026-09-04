import { safeList } from '../culture/mobileServices';
import { supabase } from '../../lib/supabase';
import type { DiscoveryItem } from './discoveryModel';

export type DiscoveryTasteProfile = {
  genres: string[];
  followedCreatorIds: string[];
  playedContentIds: string[];
  recentTitle: string | null;
  hasSignal: boolean;
};

export const EMPTY_DISCOVERY_TASTE: DiscoveryTasteProfile = {
  genres: [],
  followedCreatorIds: [],
  playedContentIds: [],
  recentTitle: null,
  hasSignal: false,
};

function splitGenres(value?: string | null) {
  return (value || '')
    .split(/[,/|]/)
    .map((genre) => genre.trim().toLocaleLowerCase('en-GB'))
    .filter(Boolean);
}

/** Builds the same lightweight, behaviour-backed taste model used by web Discover. */
export async function loadDiscoveryTasteProfile(userId: string): Promise<DiscoveryTasteProfile> {
  if (!userId) return EMPTY_DISCOVERY_TASTE;
  const db = supabase as any;
  const [releasePlayEvents, beatPlayEvents, nativeReleasePlays, favourites, follows] = await Promise.all([
    safeList<{ track_id: string; played_at: string }>(
      db.from('play_events').select('track_id,played_at').eq('user_id', userId).eq('track_type', 'release').order('played_at', { ascending: false }).limit(50),
    ),
    safeList<{ track_id: string; played_at: string }>(
      db.from('play_events').select('track_id,played_at').eq('user_id', userId).eq('track_type', 'beat').order('played_at', { ascending: false }).limit(50),
    ),
    safeList<{ release_id: string | null; played_at: string }>(
      db.from('release_plays').select('release_id,played_at').eq('user_id', userId).order('played_at', { ascending: false }).limit(50),
    ),
    safeList<{ beat_id: string }>(db.from('favorites').select('beat_id').eq('user_id', userId).limit(60)),
    safeList<{ following_id: string }>(db.from('user_follows').select('following_id').eq('follower_id', userId).limit(200)),
  ]);

  const releaseIds = Array.from(new Set([
    ...releasePlayEvents.map((row) => row.track_id),
    ...nativeReleasePlays.map((row) => row.release_id).filter((id): id is string => Boolean(id)),
  ].filter(Boolean)));
  const beatIds = Array.from(new Set([
    ...beatPlayEvents.map((row) => row.track_id),
    ...favourites.map((row) => row.beat_id),
  ].filter(Boolean)));

  const [releases, beats] = await Promise.all([
    releaseIds.length
      ? safeList<{ id: string; title: string | null; genre: string | null }>(db.from('releases').select('id,title,genre').in('id', releaseIds.slice(0, 60)))
      : Promise.resolve([]),
    beatIds.length
      ? safeList<{ id: string; title: string | null; genre: string | null }>(db.from('beats').select('id,title,genre').in('id', beatIds.slice(0, 60)))
      : Promise.resolve([]),
  ]);

  const genres = Array.from(new Set([
    ...releases.flatMap((row) => splitGenres(row.genre)),
    ...beats.flatMap((row) => splitGenres(row.genre)),
  ]));
  const followedCreatorIds = Array.from(new Set(follows.map((row) => row.following_id).filter(Boolean)));
  const playedContentIds = Array.from(new Set([...releaseIds, ...beatIds]));
  const titleById = new Map<string, string>();
  releases.forEach((row) => row.title && titleById.set(row.id, row.title));
  beats.forEach((row) => row.title && titleById.set(row.id, row.title));
  const recentTitle = [
    ...releasePlayEvents.map((row) => ({ id: row.track_id, at: row.played_at })),
    ...beatPlayEvents.map((row) => ({ id: row.track_id, at: row.played_at })),
    ...nativeReleasePlays
      .filter((row): row is { release_id: string; played_at: string } => Boolean(row.release_id))
      .map((row) => ({ id: row.release_id, at: row.played_at })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map((row) => titleById.get(row.id))
    .find(Boolean) ?? null;

  return {
    genres,
    followedCreatorIds,
    playedContentIds,
    recentTitle,
    hasSignal: genres.length > 0 || followedCreatorIds.length > 0,
  };
}

function contentId(item: DiscoveryItem) {
  return item.id.replace(/^(release|beat|mix|soundboard):/, '');
}

function itemGenres(item: DiscoveryItem) {
  return splitGenres(item.genre);
}

/** Ranks the existing public pool; it never creates a recommendation or metric. */
export function rankDiscoveryForYou(options: {
  items: DiscoveryItem[];
  curated: DiscoveryItem[];
  editorialFallback: DiscoveryItem[];
  taste: DiscoveryTasteProfile;
  limit?: number;
}) {
  const { items, curated, editorialFallback, taste, limit = 8 } = options;
  const curatedIds = new Set(curated.map((item) => item.id));
  const unique = new Map<string, DiscoveryItem>();
  [...curated, ...items].forEach((item) => {
    if (!unique.has(item.id)) unique.set(item.id, item);
  });

  if (!taste.hasSignal) {
    const fallback = new Map<string, DiscoveryItem>();
    [...curated, ...editorialFallback, ...items].forEach((item) => {
      if (!fallback.has(item.id)) fallback.set(item.id, curatedIds.has(item.id)
        ? { ...item, discoveryReason: 'Selected by PLUGGD editors' }
        : item);
    });
    return [...fallback.values()].slice(0, limit);
  }

  const followed = new Set(taste.followedCreatorIds);
  const played = new Set(taste.playedContentIds);
  const now = Date.now();
  const scored = [...unique.values()].map((item) => {
    const matchedGenre = itemGenres(item).find((genre) => taste.genres.some((signal) => genre.includes(signal) || signal.includes(genre)));
    const followsCreator = Boolean(item.creatorId && followed.has(item.creatorId));
    const alreadyPlayed = played.has(contentId(item));
    const created = item.createdAt ? new Date(item.createdAt).getTime() : Number.NaN;
    const ageDays = Number.isFinite(created) ? Math.max(0, (now - created) / 86_400_000) : 999;
    const freshness = Math.max(0, 1 - ageDays / 45);
    let relevance = freshness * 1.5;
    if (followsCreator) relevance += 5;
    if (matchedGenre) relevance += 4;
    if (curatedIds.has(item.id)) relevance += 2;
    if (alreadyPlayed) relevance -= 3;
    const reason = followsCreator
      ? 'Because you follow this creator'
      : matchedGenre
        ? `Because you listen to ${matchedGenre}`
        : curatedIds.has(item.id)
          ? 'Selected by PLUGGD editors'
          : taste.recentTitle
            ? `A fresh turn after ${taste.recentTitle}`
            : 'Fresh on PLUGGD';
    return {
      item: { ...item, discoveryReason: reason },
      relevance,
      followsCreator,
    };
  })
    .filter((entry) => entry.relevance > 0)
    .sort((a, b) => b.relevance - a.relevance || Number(b.item.rankScore ?? 0) - Number(a.item.rankScore ?? 0));

  const picks: DiscoveryItem[] = [];
  const picked = new Set<string>();
  for (const entry of scored.filter((candidate) => candidate.followsCreator).slice(0, 3)) {
    picks.push(entry.item);
    picked.add(entry.item.id);
  }
  for (const entry of scored) {
    if (picks.length >= limit) break;
    if (picked.has(entry.item.id)) continue;
    picks.push(entry.item);
    picked.add(entry.item.id);
  }
  if (picks.length < Math.min(4, limit)) {
    for (const item of [...curated, ...editorialFallback]) {
      if (picks.length >= limit) break;
      if (picked.has(item.id)) continue;
      picks.push(curatedIds.has(item.id) ? { ...item, discoveryReason: 'Selected by PLUGGD editors' } : item);
      picked.add(item.id);
    }
  }
  return picks.slice(0, limit);
}
