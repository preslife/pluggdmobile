import type { PluggdTrack } from '../../context/PlaybackProvider';
import {
  RELEASE_LIST_SELECT,
  releasePlayableUrl,
  type FeedBundle,
  type ReleaseItem,
} from '../../lib/mobileContent';
import { supabase } from '../../lib/supabase';
import type { BackstageCommunity, LiveRoomItem } from '../culture/mobileTypes';
import { getCurrentUserId, safeList } from '../culture/mobileServices';

export type HomeEditorialStory = {
  id: string;
  title: string | null;
  excerpt: string | null;
  featured_image_url: string | null;
  tags: string[] | null;
  created_at: string | null;
};

export type HomeMarketSignal = {
  release_id: string;
  supporter_count: number;
  recent_supporter_count: number;
  preorder_count: number;
};

export type HomeRecentItem = {
  id: string;
  title: string;
  creator: string;
  imageUrl: string | null;
  route: string;
  track: PluggdTrack;
};

export type HomeSignalItem = {
  id: string;
  label: string;
};

export type HomeNextWaveItem = {
  id: string;
  kind: 'supported_release' | 'beat' | 'community' | 'creator';
  title: string;
  subtitle: string;
  label: string;
  imageUrl: string;
  route: string;
};

export async function loadHomeEditorialStories(limit = 2): Promise<HomeEditorialStory[]> {
  const db = supabase as any;
  const editorial = await db
    .from('blog_posts')
    .select('id,title,excerpt,featured_image_url,tags,created_at')
    .eq('is_published', true)
    .eq('is_global_editorial', true)
    .eq('global_feature_status', 'approved')
    .not('featured_image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (!editorial.error) return (editorial.data ?? []) as HomeEditorialStory[];

  const schemaFallback = await db
    .from('blog_posts')
    .select('id,title,excerpt,featured_image_url,tags,created_at')
    .eq('is_published', true)
    .not('featured_image_url', 'is', null)
    .order('created_at', { ascending: false })
    .limit(limit);
  return schemaFallback.error ? [] : ((schemaFallback.data ?? []) as HomeEditorialStory[]);
}

export async function loadHomeMarketSignals(releaseIds: string[]): Promise<Map<string, HomeMarketSignal>> {
  if (!releaseIds.length) return new Map();
  try {
    const { data, error } = await (supabase as any).rpc('get_public_release_market_signals', {
      p_release_ids: releaseIds,
    });
    if (error || !Array.isArray(data)) return new Map();
    return new Map(
      data.map((row: any) => [
        row.release_id,
        {
          release_id: row.release_id,
          supporter_count: Number(row.supporter_count ?? 0),
          recent_supporter_count: Number(row.recent_supporter_count ?? 0),
          preorder_count: Number(row.preorder_count ?? 0),
        },
      ]),
    );
  } catch {
    return new Map();
  }
}

export async function loadHomeRecentlyPlayed(limit = 8): Promise<HomeRecentItem[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const plays = await safeList<any>(
    (supabase as any)
      .from('release_plays')
      .select('id,release_id,track_id,played_at')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(limit * 2),
  );
  if (!plays.length) return [];

  const trackIds = Array.from(new Set(plays.map((play) => play.track_id).filter(Boolean)));
  const tracks = trackIds.length
    ? await safeList<any>(
        (supabase as any)
          .from('tracks')
          .select('id,title,release_id,audio_url,track_number')
          .in('id', trackIds),
      )
    : [];
  const trackById = new Map(tracks.map((track) => [track.id, track]));
  const releaseIds = new Set<string>();
  for (const play of plays) {
    const releaseId = play.release_id || trackById.get(play.track_id)?.release_id;
    if (releaseId) releaseIds.add(releaseId);
  }

  const releases = releaseIds.size
    ? await safeList<ReleaseItem>(
        (supabase as any)
          .from('releases')
          .select(RELEASE_LIST_SELECT)
          .in('id', [...releaseIds])
          .eq('approved', true)
          .eq('status', 'live')
          .eq('catalogue_mode', 'pluggd')
          .eq('visibility_status', 'visible'),
      )
    : [];
  const releaseById = new Map(releases.map((release) => [release.id, release]));
  const seen = new Set<string>();
  const recent: HomeRecentItem[] = [];

  for (const play of plays) {
    const trackRow = play.track_id ? trackById.get(play.track_id) : null;
    const releaseId = play.release_id || trackRow?.release_id;
    const release = releaseId ? releaseById.get(releaseId) : null;
    if (!release || seen.has(release.id)) continue;
    const playableUrl = trackRow?.audio_url || releasePlayableUrl(release);
    if (!playableUrl) continue;

    seen.add(release.id);
    const title = trackRow?.title || release.title || 'Recently played';
    const creator = release.artist || 'PLUGGD creator';
    recent.push({
      id: `${play.id}:${trackRow?.id || release.id}`,
      title,
      creator,
      imageUrl: release.cover_art_url,
      route: `/release/${release.id}`,
      track: {
        id: trackRow?.id || release.id,
        url: playableUrl,
        title,
        artist: creator,
        artwork: release.cover_art_url || undefined,
        releaseId: release.id,
        type: 'release',
        sourceType: 'release',
      },
    });
    if (recent.length >= limit) break;
  }

  return recent;
}

function startsInLabel(startsAt?: string | null) {
  if (!startsAt) return null;
  const starts = new Date(startsAt).getTime();
  if (!Number.isFinite(starts)) return null;
  const difference = starts - Date.now();
  if (difference <= 0) return null;
  const hours = Math.round(difference / 3_600_000);
  if (hours < 24) return `starts in ${Math.max(1, hours)}h`;
  const days = Math.round(hours / 24);
  return `starts in ${days}d`;
}

export function buildHomeSignals(
  bundle: FeedBundle | null | undefined,
  liveRooms: LiveRoomItem[],
  communities: BackstageCommunity[],
): HomeSignalItem[] {
  const signals: HomeSignalItem[] = [];

  // Match the live web home: one current signal from each PLUGGD world,
  // rather than letting the first few releases consume the entire marquee.
  // FeedBundle is backed by the same production content tables, while keeping
  // the mobile safeguard that excludes metadata-only catalogue releases.
  const release = bundle?.releases?.[0];
  if (release) {
    signals.push({
      id: `release:${release.id}`,
      label: `${release.artist || 'A creator'} released ${release.title || 'new music'}`,
    });
  }

  const liveRoom = liveRooms.find((room) => room.status === 'live');
  if (liveRoom) {
    signals.push({ id: `live:${liveRoom.id}`, label: `${liveRoom.title || 'A PLUGGD room'} is live now` });
  }

  const board = bundle?.soundboards?.[0];
  if (board) {
    signals.push({
      id: `soundboard:${board.id}`,
      label: `${board.title || 'A soundboard'} is building in public`,
    });
  }

  const event = bundle?.events?.[0];
  if (event) {
    const timing = startsInLabel(event.starts_at);
    signals.push({
      id: `event:${event.id}`,
      label: timing ? `${event.title || 'A PLUGGD event'} ${timing}` : `${event.title || 'A PLUGGD event'} is upcoming`,
    });
  }

  const community = communities.find((item) => item.cover_image_url || item.avatar_url) ?? communities[0];
  if (community) {
    signals.push({ id: `community:${community.id}`, label: `${community.title} room is open` });
  }

  const beat = bundle?.beats?.[0];
  if (beat) {
    signals.push({
      id: `beat:${beat.id}`,
      label: `${beat.producer_name || 'A producer'} shared ${beat.title || 'a new beat'}`,
    });
  }

  const unique = new Map(signals.map((signal) => [signal.label.toLowerCase(), signal]));
  return [...unique.values()].slice(0, 6);
}

export function buildNextWaveItems(
  bundle: FeedBundle | null | undefined,
  communities: BackstageCommunity[],
  marketSignals: Map<string, HomeMarketSignal>,
): HomeNextWaveItem[] {
  if (!bundle) return [];
  const candidates: HomeNextWaveItem[] = [];

  [...bundle.releases]
    .map((release) => ({ release, signal: marketSignals.get(release.id) }))
    .filter(({ release, signal }) => Boolean(release.cover_art_url && signal && signal.supporter_count > 0))
    .sort((a, b) => (b.signal?.supporter_count ?? 0) - (a.signal?.supporter_count ?? 0))
    .slice(0, 2)
    .forEach(({ release, signal }) => {
      const supporters = signal?.supporter_count ?? 0;
      candidates.push({
        id: `supported:${release.id}`,
        kind: 'supported_release',
        title: release.artist || release.title || 'PLUGGD release',
        subtitle: `${release.title || 'Independent release'}${release.genre ? ` · ${release.genre}` : ''}`,
        label: `${supporters} SUPPORTER${supporters === 1 ? '' : 'S'}`,
        imageUrl: release.cover_art_url!,
        route: `/release/${release.id}`,
      });
    });

  bundle.beats
    .filter((beat) => Boolean(beat.image_url))
    .slice(0, 2)
    .forEach((beat) => candidates.push({
      id: `beat:${beat.id}`,
      kind: 'beat',
      title: beat.producer_name || 'PLUGGD producer',
      subtitle: `${beat.title || 'Producer signal'}${beat.genre ? ` · ${beat.genre}` : ''}`,
      label: 'PRODUCER SIGNAL',
      imageUrl: beat.image_url!,
      route: `/beat/${beat.id}`,
    }));

  communities
    .filter((community) => Boolean(community.cover_image_url || community.avatar_url))
    .slice(0, 2)
    .forEach((community) => candidates.push({
      id: `community:${community.id}`,
      kind: 'community',
      title: community.title,
      subtitle: community.description || `${community.member_count || 0} members`,
      label: 'ROOM OPEN',
      imageUrl: (community.cover_image_url || community.avatar_url)!,
      route: `/community/${community.slug || community.id}`,
    }));

  bundle.profiles
    .filter((profile) => Boolean(profile.avatar_url && profile.username))
    .slice(0, 3)
    .forEach((profile) => candidates.push({
      id: `creator:${profile.user_id || profile.id || profile.username}`,
      kind: 'creator',
      title: profile.display_name || profile.full_name || profile.username || 'PLUGGD creator',
      subtitle: profile.primary_genre || profile.city || 'Independent creator',
      label: 'CREATOR TO KNOW',
      imageUrl: profile.avatar_url!,
      route: `/creator/${profile.username}`,
    }));

  const seen = new Set<string>();
  return candidates.filter((item) => {
    if (seen.has(item.route)) return false;
    seen.add(item.route);
    return true;
  }).slice(0, 5);
}
