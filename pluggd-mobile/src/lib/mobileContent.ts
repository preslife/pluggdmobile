import { supabase } from './supabase';
import type { PluggdTrack, PluggdTrackKind } from '../context/PlaybackProvider';

export const PLUGGD_ORANGE = '#FF5200';

export type ContentKind =
  | 'release'
  | 'beat'
  | 'sample_pack'
  | 'mix'
  | 'event'
  | 'soundboard'
  | 'profile'
  | 'post'
  | 'map_plug';

export type ReleaseItem = {
  id: string;
  title: string | null;
  artist: string | null;
  cover_art_url: string | null;
  audio_url: string | null;
  genre: string | null;
  price: number | null;
  download_price: number | null;
  minimum_price: number | null;
  created_at: string | null;
};

export type BeatItem = {
  id: string;
  title: string | null;
  producer_name: string | null;
  image_url: string | null;
  audio_url: string | null;
  tagged_url: string | null;
  genre: string | null;
  bpm: number | null;
  key: string | null;
  price: number | null;
  description: string | null;
  moods: string[] | null;
  tags: string[] | null;
  license_prices: unknown | null;
  available_licenses: unknown | null;
  created_at: string | null;
};

export type SamplePackItem = {
  id: string;
  title: string | null;
  description: string | null;
  cover_art_url: string | null;
  preview_url: string | null;
  download_url: string | null;
  genre: string | null;
  bpm_range: string | null;
  price: number | null;
  sample_count: number | null;
  tags: string[] | null;
  total_downloads: number | null;
  created_at: string | null;
};

export type SampleItem = {
  id: string;
  sample_pack_id: string;
  title: string;
  file_url: string;
  category: string | null;
  bpm: number | null;
  musical_key: string | null;
  duration_seconds: number | null;
  is_preview: boolean | null;
  sort_order: number | null;
};

export type MixItem = {
  id: string;
  slug: string | null;
  title: string | null;
  description: string | null;
  cover_url: string | null;
  audio_url: string | null;
  duration_seconds: number | null;
  city: string | null;
  genre_tags: string[] | null;
  mood_tags: string[] | null;
  recording_type: string | null;
  event_name: string | null;
  like_count: number | null;
  repost_count: number | null;
  save_count: number | null;
  play_count: number | null;
  published_at: string | null;
  created_at: string | null;
};

export type MixTrackItem = {
  id: string;
  mix_id: string;
  position: number;
  start_seconds: number | null;
  end_seconds: number | null;
  raw_title: string | null;
  raw_artist: string | null;
};

export type EventItem = {
  id: string;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;
  location: string | null;
  starts_at: string | null;
  ends_at: string | null;
  price_cents: number | null;
  rsvp_count: number | null;
  stream_url: string | null;
  playback_url: string | null;
  created_at: string | null;
};

export type SoundboardItem = {
  id: string;
  creator_id: string | null;
  slug: string | null;
  title: string | null;
  description: string | null;
  cover_image_url: string | null;
  item_count: number | null;
  like_count: number | null;
  comment_count: number | null;
  follower_count: number | null;
  last_activity_at: string | null;
  created_at: string | null;
};

export type SoundboardContentItem = {
  id: string;
  soundboard_id: string;
  item_type: 'audio' | 'note' | 'image' | 'link' | 'poll' | string;
  title: string | null;
  description: string | null;
  content_text: string | null;
  media_url: string | null;
  external_url: string | null;
  duration_seconds: number | null;
  is_pinned: boolean | null;
  plays_count: number | null;
  likes_count: number | null;
  comments_count: number | null;
  position: number | null;
  created_at: string | null;
};

export type ProfileItem = {
  user_id: string | null;
  id?: string | null;
  display_name: string | null;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  user_type: string | null;
  profile_type: string | null;
  is_creator: boolean | null;
  is_verified: boolean | null;
  primary_genre: string | null;
  city: string | null;
};

export type SocialPostItem = {
  id: string;
  body: string;
  user_id: string | null;
  destinations: string[] | null;
  media_paths: string[] | null;
  status: string | null;
  created_at: string | null;
};

export type FanMapPlugItem = {
  id: string;
  display_name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  message: string | null;
  tip_amount: number | null;
  creator_id: string | null;
  user_id: string | null;
  is_featured: boolean | null;
  created_at: string | null;
};

export type FeedBundle = {
  releases: ReleaseItem[];
  beats: BeatItem[];
  samplePacks: SamplePackItem[];
  mixes: MixItem[];
  events: EventItem[];
  soundboards: SoundboardItem[];
  profiles: ProfileItem[];
  posts: SocialPostItem[];
  mapPlugs: FanMapPlugItem[];
};

export function formatGBP(value?: number | null, options?: { cents?: boolean }) {
  const numeric = Number(value ?? 0);
  const amount = options?.cents ? numeric / 100 : numeric;
  if (!Number.isFinite(amount) || amount <= 0) return 'Free';
  return new Intl.NumberFormat('en-GB', {
    style: 'currency',
    currency: 'GBP',
    minimumFractionDigits: amount >= 10 ? 0 : 2,
  }).format(amount);
}

export function formatCompact(value?: number | null) {
  const numeric = Number(value ?? 0);
  if (!Number.isFinite(numeric) || numeric <= 0) return '0';
  if (numeric >= 1000000) return `${(numeric / 1000000).toFixed(1)}M`;
  if (numeric >= 1000) return `${(numeric / 1000).toFixed(numeric >= 10000 ? 0 : 1)}K`;
  return Math.round(numeric).toLocaleString('en-GB');
}

export function formatDate(value?: string | null, fallback = 'TBA') {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
  });
}

export function formatDuration(seconds?: number | null) {
  const total = Math.max(0, Math.floor(Number(seconds ?? 0)));
  if (!total) return '--:--';
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function contentInitials(name?: string | null) {
  return (name || 'PL')
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

export function priceForRelease(item: ReleaseItem) {
  return item.price ?? item.download_price ?? item.minimum_price ?? 0;
}

export function toTrack(
  item:
    | ReleaseItem
    | BeatItem
    | SamplePackItem
    | SampleItem
    | MixItem
    | SoundboardContentItem,
  kind: PluggdTrackKind,
): PluggdTrack | null {
  if (kind === 'release') {
    const release = item as ReleaseItem;
    if (!release.audio_url) return null;
    return {
      id: release.id,
      url: release.audio_url,
      title: release.title || 'Untitled release',
      artist: release.artist || 'Pluggd Creator',
      artwork: release.cover_art_url || undefined,
      releaseId: release.id,
      type: 'release',
      sourceType: 'release',
      price: priceForRelease(release),
      currency: 'GBP',
    };
  }

  if (kind === 'beat') {
    const beat = item as BeatItem;
    const url = beat.tagged_url || beat.audio_url;
    if (!url) return null;
    return {
      id: beat.id,
      url,
      title: beat.title || 'Untitled beat',
      artist: beat.producer_name || 'Producer',
      artwork: beat.image_url || undefined,
      beatId: beat.id,
      type: 'beat',
      sourceType: 'beat',
      price: beat.price ?? 0,
      currency: 'GBP',
    };
  }

  if (kind === 'sample') {
    const sample = item as SampleItem;
    if (!sample.file_url) return null;
    return {
      id: sample.id,
      url: sample.file_url,
      title: sample.title || 'Sample preview',
      artist: sample.category || 'Samples',
      duration: Number(sample.duration_seconds ?? 0) || undefined,
      sampleId: sample.id,
      samplePackId: sample.sample_pack_id,
      type: 'sample',
      sourceType: 'sample',
    };
  }

  if (kind === 'sample_pack') {
    const pack = item as SamplePackItem;
    if (!pack.preview_url) return null;
    return {
      id: pack.id,
      url: pack.preview_url,
      title: pack.title || 'Samples preview',
      artist: pack.genre || 'Samples',
      artwork: pack.cover_art_url || undefined,
      samplePackId: pack.id,
      type: 'sample_pack',
      sourceType: 'sample_pack',
      price: pack.price ?? 0,
      currency: 'GBP',
    };
  }

  if (kind === 'mix') {
    const mix = item as MixItem;
    if (!mix.audio_url) return null;
    return {
      id: mix.id,
      url: mix.audio_url,
      title: mix.title || 'Untitled mix',
      artist: mix.city || 'Pluggd DJ',
      artwork: mix.cover_url || undefined,
      duration: mix.duration_seconds ?? undefined,
      mixId: mix.id,
      type: 'mix',
      sourceType: 'mix',
    };
  }

  const soundboardItem = item as SoundboardContentItem;
  if (!soundboardItem.media_url) return null;
  return {
    id: soundboardItem.id,
    url: soundboardItem.media_url,
    title: soundboardItem.title || 'Soundboard audio',
    artist: 'Soundboard',
    duration: soundboardItem.duration_seconds ?? undefined,
    soundboardId: soundboardItem.soundboard_id,
    soundboardItemId: soundboardItem.id,
    type: 'soundboard',
    sourceType: 'soundboard',
  };
}

async function list<T>(query: PromiseLike<{ data: unknown; error: unknown }>, fallback: T[] = []) {
  const { data, error } = await query;
  if (error || !Array.isArray(data)) return fallback;
  return data as T[];
}

export async function loadFeedBundle(limit = 8): Promise<FeedBundle> {
  const nowIso = new Date().toISOString();
  const [
    releases,
    beats,
    samplePacks,
    mixes,
    events,
    soundboards,
    profiles,
    posts,
    mapPlugs,
  ] = await Promise.all([
    list<ReleaseItem>(
      supabase
        .from('releases')
        .select('id,title,artist,cover_art_url,audio_url,genre,price,download_price,minimum_price,created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
    ),
    list<BeatItem>(
      supabase
        .from('beats')
        .select('id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at')
        .eq('is_published', true)
        .order('created_at', { ascending: false })
        .limit(limit),
    ),
    list<SamplePackItem>(
      (supabase as any)
        .from('sample_packs')
        .select('id,title,description,cover_art_url,preview_url,download_url,genre,bpm_range,price,sample_count,tags,total_downloads,created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
    ),
    list<MixItem>(
      (supabase as any)
        .from('mixes')
        .select('id,slug,title,description,cover_url,audio_url,duration_seconds,city,genre_tags,mood_tags,recording_type,event_name,like_count,repost_count,save_count,play_count,published_at,created_at')
        .eq('visibility', 'public')
        .eq('status', 'published')
        .order('published_at', { ascending: false })
        .limit(limit),
    ),
    list<EventItem>(
      supabase
        .from('events')
        .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at')
        .gte('starts_at', nowIso)
        .order('starts_at', { ascending: true })
        .limit(limit),
    ),
    list<SoundboardItem>(
      (supabase as any)
        .from('soundboards')
        .select('id,creator_id,slug,title,description,cover_image_url,item_count,like_count,comment_count,follower_count,last_activity_at,created_at')
        .eq('is_published', true)
        .in('visibility', ['public', 'link'])
        .order('last_activity_at', { ascending: false })
        .limit(limit),
    ),
    list<ProfileItem>(
      (supabase as any)
        .from('profiles')
        .select('user_id,id,display_name,full_name,username,avatar_url,user_type,profile_type,is_creator,is_verified,primary_genre,city')
        .or('is_creator.eq.true,user_type.in.(artist,producer,industry)')
        .limit(limit),
    ),
    list<SocialPostItem>(
      (supabase as any)
        .from('social_posts')
        .select('id,body,user_id,destinations,media_paths,status,created_at')
        .eq('status', 'published')
        .order('created_at', { ascending: false })
        .limit(limit),
    ),
    list<FanMapPlugItem>(
      (supabase as any)
        .from('fan_map_plugs')
        .select('id,display_name,city,country,lat,lng,message,tip_amount,creator_id,user_id,is_featured,created_at')
        .order('created_at', { ascending: false })
        .limit(limit),
    ),
  ]);

  return { releases, beats, samplePacks, mixes, events, soundboards, profiles, posts, mapPlugs };
}
