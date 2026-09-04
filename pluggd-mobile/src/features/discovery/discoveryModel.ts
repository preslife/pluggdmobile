import type { PluggdTrack } from '../../context/PlaybackProvider';
import {
  releasePlayableUrl,
  type BeatItem,
  type FeedBundle,
  type MixItem,
  type ReleaseItem,
  type SoundboardItem,
} from '../../lib/mobileContent';

export type DiscoveryKind = 'release' | 'beat' | 'mix' | 'soundboard';

export type DiscoveryItem = {
  id: string;
  kind: DiscoveryKind;
  title: string;
  creator: string;
  artwork: string | null;
  /** True only when the item has a verified URL that may enter TrackPlayer. */
  isPlayable: boolean;
  playableUrl: string | null;
  playAction: 'play' | 'unavailable';
  destinationRoute: string;
  discoveryReason: string;
  description?: string;
  genre?: string;
  city?: string;
  signal?: string;
  supportRoute?: string;
  creatorRoute?: string;
  creatorId?: string;
  createdAt?: string;
  isEditorialPick?: boolean;
  rankScore?: number;
  track: PluggdTrack | null;
};

function releaseItem(item: ReleaseItem): DiscoveryItem | null {
  const playableUrl = releasePlayableUrl(item);
  if (!playableUrl) return null;
  const title = item.title?.trim() || 'Untitled release';
  const creator = item.artist?.trim() || '';
  return {
    id: `release:${item.id}`,
    kind: 'release',
    title,
    creator,
    artwork: item.cover_art_url,
    isPlayable: true,
    playableUrl,
    playAction: 'play',
    destinationRoute: `/release/${item.id}`,
    discoveryReason: item.genre ? `New in ${item.genre}` : 'New independent release',
    description: creator
      ? `${creator}'s latest independent release${item.genre ? `, rooted in ${item.genre}` : ''}.`
      : `A new independent release${item.genre ? ` rooted in ${item.genre}` : ''}.`,
    genre: item.genre || undefined,
    supportRoute: `/release/${item.id}`,
    creatorRoute: item.user_id || item.owner_id ? `/user/${item.user_id || item.owner_id}` : undefined,
    creatorId: item.user_id || item.owner_id || undefined,
    createdAt: item.created_at || undefined,
    isEditorialPick: Boolean(item.is_featured),
    track: {
      id: item.id,
      url: playableUrl,
      title,
      artist: creator,
      artwork: item.cover_art_url || undefined,
      releaseId: item.id,
      type: 'release',
      sourceType: 'release',
    },
  };
}

function beatItem(item: BeatItem): DiscoveryItem | null {
  // The tagged preview is the listening-safe asset. Masters are commonly
  // 32-bit float WAV files, which AVPlayer cannot stream reliably on iOS.
  const playableUrl = item.tagged_url || item.audio_url;
  if (!playableUrl) return null;
  const title = item.title?.trim() || 'Untitled beat';
  const creator = item.producer_name?.trim() || '';
  return {
    id: `beat:${item.id}`,
    kind: 'beat',
    title,
    creator,
    artwork: item.image_url,
    isPlayable: true,
    playableUrl,
    playAction: 'play',
    destinationRoute: `/beat/${item.id}`,
    discoveryReason: item.genre ? `${item.genre} producer signal` : 'Producer signal',
    description: item.description?.trim() && item.description.trim().length > 24
      ? item.description.trim()
      : creator
        ? `A new ${item.genre ? `${item.genre} ` : ''}beat from ${creator}${item.bpm ? ` at ${item.bpm} BPM` : ''}.`
        : `A new ${item.genre ? `${item.genre} ` : ''}beat${item.bpm ? ` at ${item.bpm} BPM` : ''}.`,
    genre: item.genre || undefined,
    signal: item.bpm ? `${item.bpm} BPM${item.key ? ` · ${item.key}` : ''}` : undefined,
    supportRoute: `/beat/${item.id}`,
    creatorRoute: item.user_id || item.owner_id ? `/user/${item.user_id || item.owner_id}` : undefined,
    creatorId: item.user_id || item.owner_id || undefined,
    createdAt: item.created_at || undefined,
    track: {
      id: item.id,
      url: playableUrl,
      title,
      artist: creator,
      artwork: item.image_url || undefined,
      beatId: item.id,
      type: 'beat',
      sourceType: 'beat',
    },
  };
}

function mixItem(item: MixItem): DiscoveryItem | null {
  if (!item.audio_url) return null;
  const title = item.title?.trim() || 'Untitled mix';
  const creator = item.event_name?.trim() || item.city?.trim() || 'PLUGGD selector';
  return {
    id: `mix:${item.id}`,
    kind: 'mix',
    title,
    creator,
    artwork: item.cover_url,
    isPlayable: true,
    playableUrl: item.audio_url,
    playAction: 'play',
    destinationRoute: `/mixes/${item.id}`,
    discoveryReason: item.city
      ? `Moving in ${item.city}`
      : item.genre_tags?.[0]
        ? `Selected for ${item.genre_tags[0]}`
        : 'Fresh selector mix',
    description: item.description?.trim() || `${creator} connects new music in one uninterrupted selector journey.`,
    genre: item.genre_tags?.[0] || undefined,
    city: item.city || undefined,
    signal: item.play_count ? `${item.play_count.toLocaleString()} plays` : undefined,
    createdAt: item.published_at || item.created_at || undefined,
    rankScore: Math.max(0, Number(item.play_count ?? 0))
      + Math.max(0, Number(item.save_count ?? 0)) * 4
      + Math.max(0, Number(item.repost_count ?? 0)) * 3
      + Math.max(0, Number(item.like_count ?? 0)) * 2,
    track: {
      id: item.id,
      url: item.audio_url,
      title,
      artist: creator,
      artwork: item.cover_url || undefined,
      duration: item.duration_seconds || undefined,
      mixId: item.id,
      type: 'mix',
      sourceType: 'mix',
    },
  };
}

function soundboardItem(item: SoundboardItem): DiscoveryItem {
  const title = item.title?.trim() || 'Untitled soundboard';
  const creator = item.creator_username
    ? `@${item.creator_username.replace(/^@/, '')}`
    : item.creator_display_name?.trim() || '';
  return {
    id: `soundboard:${item.id}`,
    kind: 'soundboard',
    title,
    creator,
    artwork: item.cover_image_url,
    isPlayable: false,
    playableUrl: null,
    playAction: 'unavailable',
    destinationRoute: `/soundboards/${item.slug || item.id}`,
    discoveryReason: item.item_count
      ? `${item.item_count} ideas and works in progress`
      : 'A creator-led world in progress',
    description: item.description?.trim() || 'Open the board to hear any creator-approved audio pieces.',
    signal: item.comment_count ? `${item.comment_count} comments` : undefined,
    creatorRoute: item.creator_id ? `/user/${item.creator_id}` : undefined,
    creatorId: item.creator_id || undefined,
    createdAt: item.last_activity_at || item.created_at || undefined,
    rankScore: Math.max(0, Number(item.like_count ?? 0)) * 2
      + Math.max(0, Number(item.comment_count ?? 0)) * 3
      + Math.max(0, Number(item.follower_count ?? 0)) * 4,
    track: null,
  };
}

export function isPlayableDiscoveryItem(
  item: DiscoveryItem,
): item is DiscoveryItem & { isPlayable: true; playableUrl: string; playAction: 'play'; track: PluggdTrack } {
  return item.isPlayable && item.playAction === 'play' && Boolean(item.playableUrl && item.track);
}

/** Adapts the FeedBundle into one discovery language without pretending every destination is playable. */
export function buildDiscoveryItems(bundle?: FeedBundle | null): DiscoveryItem[] {
  if (!bundle) return [];
  const releases = bundle.releases.map(releaseItem).filter(Boolean) as DiscoveryItem[];
  const mixes = bundle.mixes.map(mixItem).filter(Boolean) as DiscoveryItem[];
  const beats = bundle.beats.map(beatItem).filter(Boolean) as DiscoveryItem[];
  const soundboards = bundle.soundboards.map(soundboardItem);
  const max = Math.max(releases.length, mixes.length, beats.length, soundboards.length);
  const ordered: DiscoveryItem[] = [];
  for (let index = 0; index < max; index += 1) {
    if (releases[index]) ordered.push(releases[index]);
    if (beats[index]) ordered.push(beats[index]);
    if (mixes[index]) ordered.push(mixes[index]);
    if (soundboards[index]) ordered.push(soundboards[index]);
  }
  return ordered;
}

export function buildPlayableDiscoveryItems(bundle?: FeedBundle | null) {
  return buildDiscoveryItems(bundle).filter(isPlayableDiscoveryItem);
}

/** Rankings are based only on measured engagement; no recommendation row is relabelled as a chart. */
export function buildRankedDiscoveryItems(items: DiscoveryItem[], limit = 10): DiscoveryItem[] {
  return items
    .filter((item) => Number(item.rankScore ?? 0) > 0)
    .slice()
    .sort((a, b) => Number(b.rankScore ?? 0) - Number(a.rankScore ?? 0) || a.id.localeCompare(b.id))
    .slice(0, limit);
}

/**
 * Selects the compact Home grid deliberately instead of inheriting whichever
 * content table happens to contain the most rows. When the catalogue supports
 * it, the first four choices span releases, mixes, and beats.
 */
export function buildBalancedHomePicks(
  items: DiscoveryItem[],
  featuredId?: string,
  limit = 4,
): DiscoveryItem[] {
  const available = items.filter((item) => item.id !== featuredId && isPlayableDiscoveryItem(item));
  const selected: DiscoveryItem[] = [];
  const selectedIds = new Set<string>();

  for (const kind of ['release', 'mix', 'beat'] as const) {
    const match = available.find((item) => item.kind === kind && !selectedIds.has(item.id));
    if (!match) continue;
    selected.push(match);
    selectedIds.add(match.id);
  }

  for (const item of available) {
    if (selected.length >= limit) break;
    if (selectedIds.has(item.id)) continue;
    selected.push(item);
    selectedIds.add(item.id);
  }

  return selected.slice(0, limit);
}

/** Prefers a genuinely featured release, then rotates the freshest playable kinds by day. */
export function selectDailyFeature(items: DiscoveryItem[], date = new Date()): DiscoveryItem | undefined {
  const playable = items.filter(isPlayableDiscoveryItem);
  const editorial = playable.find((item) => item.isEditorialPick);
  if (editorial) return editorial;
  const candidates = playable.slice(0, Math.min(playable.length, 9));
  if (!candidates.length) return undefined;
  const dayKey = Math.floor(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()) / 86_400_000);
  return candidates[dayKey % candidates.length];
}

export type DiscoveryScene = {
  label: string;
  detail: string;
  image: string | null;
  route: string;
  kind: 'city' | 'genre';
  canonicalValue: string;
};

const SCENE_ALIASES: Record<string, string> = {
  'r b': 'rnb',
  'r and b': 'rnb',
  rnb: 'rnb',
  'hip hop': 'hiphop',
  hiphop: 'hiphop',
  'dance hall': 'dancehall',
  dancehall: 'dancehall',
  'drum and bass': 'drumandbass',
  'drum n bass': 'drumandbass',
  dnb: 'drumandbass',
};

export function normalizeSceneValue(value?: string | null) {
  const normalized = (value || '')
    .normalize('NFKD')
    .replace(/[’']/g, '')
    .replace(/&/g, ' and ')
    .replace(/[^a-zA-Z0-9]+/g, ' ')
    .trim()
    .toLocaleLowerCase('en-GB')
    .replace(/\s+/g, ' ');
  return SCENE_ALIASES[normalized] || normalized.replace(/\s+/g, '');
}

function sceneTokens(value?: string | null) {
  const source = value || '';
  return Array.from(new Set([
    normalizeSceneValue(source),
    ...source.split(/[,/|;+]/).map(normalizeSceneValue),
  ].filter(Boolean)));
}

export function discoveryItemMatchesScene(item: DiscoveryItem, scene: Pick<DiscoveryScene, 'kind' | 'canonicalValue'>) {
  const candidates = scene.kind === 'city' ? sceneTokens(item.city) : sceneTokens(item.genre);
  return candidates.includes(normalizeSceneValue(scene.canonicalValue));
}

export function buildDiscoveryScenes(bundle?: FeedBundle | null): DiscoveryScene[] {
  if (!bundle) return [];
  const scenes = new Map<string, DiscoveryScene>();
  bundle.mixes.forEach((mix) => {
    const city = mix.city?.trim();
    const genre = mix.genre_tags?.[0]?.trim();
    const label = city || genre;
    const kind = city ? 'city' : 'genre';
    const canonicalValue = normalizeSceneValue(label);
    const key = `${kind}:${canonicalValue}`;
    if (!label || !canonicalValue || scenes.has(key)) return;
    scenes.set(key, {
      label,
      detail: city ? 'City' : 'Genre',
      image: mix.cover_url,
      route: `/discover?scene=${encodeURIComponent(label)}&sceneValue=${encodeURIComponent(canonicalValue)}&sceneKind=${kind}`,
      kind,
      canonicalValue,
    });
  });
  bundle.releases.forEach((release) => {
    const label = release.genre?.trim();
    const canonicalValue = normalizeSceneValue(label);
    const key = `genre:${canonicalValue}`;
    if (!label || !canonicalValue || scenes.has(key)) return;
    scenes.set(key, {
      label,
      detail: 'Genre',
      image: release.cover_art_url,
      route: `/discover?scene=${encodeURIComponent(label)}&sceneValue=${encodeURIComponent(canonicalValue)}&sceneKind=genre`,
      kind: 'genre',
      canonicalValue,
    });
  });
  bundle.beats.forEach((beat) => {
    const label = beat.genre?.trim();
    const canonicalValue = normalizeSceneValue(label);
    const key = `genre:${canonicalValue}`;
    if (!label || !canonicalValue || scenes.has(key)) return;
    scenes.set(key, {
      label,
      detail: 'Genre',
      image: beat.image_url,
      route: `/discover?scene=${encodeURIComponent(label)}&sceneValue=${encodeURIComponent(canonicalValue)}&sceneKind=genre`,
      kind: 'genre',
      canonicalValue,
    });
  });
  return [...scenes.values()].slice(0, 6);
}
