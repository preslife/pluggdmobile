import type { PluggdTrack } from '../../context/PlaybackProvider';
import {
  releasePlayableUrl,
  type BeatItem,
  type FeedBundle,
  type MixItem,
  type ReleaseItem,
} from '../../lib/mobileContent';

export type DiscoveryKind = 'release' | 'beat' | 'mix' | 'soundboard';

export type DiscoveryItem = {
  id: string;
  kind: DiscoveryKind;
  title: string;
  creator: string;
  artwork: string | null;
  playableUrl: string;
  destinationRoute: string;
  discoveryReason: string;
  description?: string;
  genre?: string;
  city?: string;
  signal?: string;
  supportRoute?: string;
  track: PluggdTrack;
};

function releaseItem(item: ReleaseItem): DiscoveryItem | null {
  const playableUrl = releasePlayableUrl(item);
  if (!playableUrl) return null;
  const title = item.title?.trim() || 'Untitled release';
  const creator = item.artist?.trim() || 'PLUGGD creator';
  return {
    id: `release:${item.id}`,
    kind: 'release',
    title,
    creator,
    artwork: item.cover_art_url,
    playableUrl,
    destinationRoute: `/release/${item.id}`,
    discoveryReason: item.genre ? `New in ${item.genre}` : 'New independent release',
    description: `${creator}'s latest independent release${item.genre ? `, rooted in ${item.genre}` : ''}.`,
    genre: item.genre || undefined,
    supportRoute: `/release/${item.id}`,
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
  const creator = item.producer_name?.trim() || 'PLUGGD producer';
  return {
    id: `beat:${item.id}`,
    kind: 'beat',
    title,
    creator,
    artwork: item.image_url,
    playableUrl,
    destinationRoute: `/beat/${item.id}`,
    discoveryReason: item.genre ? `${item.genre} producer signal` : 'Producer signal',
    description: item.description?.trim() && item.description.trim().length > 24
      ? item.description.trim()
      : `A new ${item.genre ? `${item.genre} ` : ''}beat from ${creator}${item.bpm ? ` at ${item.bpm} BPM` : ''}.`,
    genre: item.genre || undefined,
    signal: item.bpm ? `${item.bpm} BPM${item.key ? ` · ${item.key}` : ''}` : undefined,
    supportRoute: `/beat/${item.id}`,
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
    playableUrl: item.audio_url,
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

/** Adapts the existing FeedBundle into one honest, playable discovery language. */
export function buildDiscoveryItems(bundle?: FeedBundle | null): DiscoveryItem[] {
  if (!bundle) return [];
  const releases = bundle.releases.map(releaseItem).filter(Boolean) as DiscoveryItem[];
  const mixes = bundle.mixes.map(mixItem).filter(Boolean) as DiscoveryItem[];
  const beats = bundle.beats.map(beatItem).filter(Boolean) as DiscoveryItem[];
  const max = Math.max(releases.length, mixes.length, beats.length);
  const ordered: DiscoveryItem[] = [];
  for (let index = 0; index < max; index += 1) {
    if (releases[index]) ordered.push(releases[index]);
    if (beats[index]) ordered.push(beats[index]);
    if (mixes[index]) ordered.push(mixes[index]);
  }
  return ordered;
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
  const available = items.filter((item) => item.id !== featuredId);
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

export type DiscoveryScene = {
  label: string;
  detail: string;
  image: string | null;
  route: string;
};

export function buildDiscoveryScenes(bundle?: FeedBundle | null): DiscoveryScene[] {
  if (!bundle) return [];
  const scenes = new Map<string, DiscoveryScene>();
  bundle.mixes.forEach((mix) => {
    const label = mix.city?.trim() || mix.genre_tags?.[0]?.trim();
    if (!label || scenes.has(label.toLowerCase())) return;
    scenes.set(label.toLowerCase(), {
      label,
      detail: mix.city ? 'City signal' : 'Genre signal',
      image: mix.cover_url,
      route: `/discover?scene=${encodeURIComponent(label)}`,
    });
  });
  bundle.releases.forEach((release) => {
    const label = release.genre?.trim();
    if (!label || scenes.has(label.toLowerCase())) return;
    scenes.set(label.toLowerCase(), {
      label,
      detail: 'New releases',
      image: release.cover_art_url,
      route: `/discover?scene=${encodeURIComponent(label)}`,
    });
  });
  return [...scenes.values()].slice(0, 6);
}
