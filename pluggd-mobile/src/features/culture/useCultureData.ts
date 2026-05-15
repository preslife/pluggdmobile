import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/supabase';
import {
  loadFeedBundle,
  type BeatItem,
  type EventItem,
  type FeedBundle,
  type MixItem,
  type ProfileItem,
  type ReleaseItem,
} from '../../lib/mobileContent';
import {
  loadBackstageOverview,
  loadLiveRooms,
  safeList,
} from './mobileServices';
export type {
  BackstageCommunity,
  BackstageRoom,
  BackstageThread,
  CultureSearchResults,
  LiveRoomItem,
  StageMediaItem,
  VideoItem,
} from './mobileTypes';
import type { CultureSearchResults, CultureTabKey as CultureTabKeyModel, StageMediaItem, BackstageCommunity, LiveRoomItem, VideoItem } from './mobileTypes';

export type CultureTabKey = CultureTabKeyModel;

export function useHomeFeed() {
  return useQuery({
    queryKey: ['culture', 'home-feed'],
    queryFn: () => loadFeedBundle(16),
    staleTime: 1000 * 60 * 2,
  });
}

export function useStageContent() {
  const query = useQuery({
    queryKey: ['culture', 'stage'],
    queryFn: () => loadFeedBundle(18),
    staleTime: 1000 * 60 * 2,
  });

  const media = useMemo<StageMediaItem[]>(() => {
    const bundle = query.data;
    if (!bundle) return [];

    const releases = bundle.releases.map<StageMediaItem>((release) => ({
      id: release.id,
      kind: 'release',
      title: release.title || 'Untitled release',
      creator: release.artist || 'PLUGGD Creator',
      image_url: release.cover_art_url,
      audio_url: release.preview_url || release.audio_url || release.download_url,
      genre: release.genre,
      route: `/release/${release.id}`,
      release,
    }));

    const mixes = bundle.mixes.map<StageMediaItem>((mix) => ({
      id: mix.id,
      kind: 'mix',
      title: mix.title || 'Untitled mix',
      creator: mix.city || 'PLUGGD DJ',
      image_url: mix.cover_url,
      audio_url: mix.audio_url,
      genre: mix.genre_tags?.[0] ?? mix.recording_type,
      city: mix.city,
      route: `/mixes/${mix.id}`,
      mix,
    }));

    return [...releases, ...mixes];
  }, [query.data]);

  return { ...query, media };
}

export function useLiveRooms() {
  return useQuery({
    queryKey: ['culture', 'live-rooms'],
    queryFn: loadLiveRooms,
    staleTime: 1000 * 45,
  });
}

export function useBackstage() {
  return useQuery({
    queryKey: ['culture', 'backstage'],
    queryFn: loadBackstageOverview,
    staleTime: 1000 * 60 * 2,
  });
}

export function useEventLayer(limit = 16) {
  return useQuery({
    queryKey: ['culture', 'events', limit],
    queryFn: async () =>
      safeList<EventItem>(
        supabase
          .from('events')
          .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at')
          .gte('starts_at', new Date().toISOString())
          .order('starts_at', { ascending: true })
          .limit(limit),
      ),
    staleTime: 1000 * 60 * 3,
  });
}

export function useUniversalSearch(term: string) {
  const normalized = term.trim();

  return useQuery({
    queryKey: ['culture', 'search', normalized],
    enabled: normalized.length >= 2,
    queryFn: async (): Promise<CultureSearchResults> => {
      const pattern = `%${normalized.replace(/[%_]/g, '')}%`;
      const [creators, tracks, mixes, beats, videos, events, communityRows, hubRows, users, liveStreams] = await Promise.all([
        safeList<any>(
          (supabase as any)
            .from('profiles')
            .select('user_id,id,full_name,username,avatar_url,user_type,profile_type,is_creator,is_verified,city')
            .or(`full_name.ilike.${pattern},username.ilike.${pattern}`)
            .eq('is_creator', true)
            .limit(12),
        ).then((rows) => rows.map((profile) => ({ ...profile, display_name: null, primary_genre: null }) as ProfileItem)),
        safeList<ReleaseItem>(
          supabase
            .from('releases')
            .select('id,title,artist,cover_art_url,preview_url,download_url,genre,price,download_price,minimum_price,created_at')
            .or(`title.ilike.${pattern},artist.ilike.${pattern},genre.ilike.${pattern}`)
            .order('created_at', { ascending: false })
            .limit(12),
        ),
        safeList<MixItem>(
          (supabase as any)
            .from('mixes')
            .select('id,slug,title,description,cover_url,audio_url,duration_seconds,city,genre_tags,mood_tags,recording_type,event_name,like_count,repost_count,save_count,play_count,published_at,created_at')
            .or(`title.ilike.${pattern},city.ilike.${pattern},event_name.ilike.${pattern}`)
            .limit(12),
        ),
        safeList<BeatItem>(
          (supabase as any)
            .from('beats')
            .select('id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at')
            .eq('is_published', true)
            .or(`title.ilike.${pattern},producer_name.ilike.${pattern},genre.ilike.${pattern},description.ilike.${pattern}`)
            .order('created_at', { ascending: false })
            .limit(12),
        ),
        safeList<VideoItem>(
          (supabase as any)
            .from('videos')
            .select('id,title,description,thumbnail_url,youtube_url,artist_id,created_at')
            .or(`title.ilike.${pattern},description.ilike.${pattern}`)
            .order('created_at', { ascending: false })
            .limit(12),
        ),
        safeList<EventItem>(
          supabase
            .from('events')
            .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at')
            .or(`title.ilike.${pattern},location.ilike.${pattern},description.ilike.${pattern}`)
            .order('starts_at', { ascending: true })
            .limit(12),
        ),
        safeList<any>(
          (supabase as any)
            .from('communities')
            .select('id,creator_id,name,slug,description,tagline,avatar_url,banner_url,cover_image_url,visibility,join_policy,status,is_primary,member_count,created_at,updated_at')
            .eq('status', 'active')
            .or(`name.ilike.${pattern},tagline.ilike.${pattern},description.ilike.${pattern},slug.ilike.${pattern}`)
            .limit(12),
        ).then((rows) =>
          rows.map((hub) => ({
            id: hub.id,
            slug: hub.slug,
            title: hub.name || 'Backstage',
            description: hub.tagline || hub.description,
            cover_image_url: hub.banner_url || hub.cover_image_url,
            avatar_url: hub.avatar_url,
            hub_type: hub.visibility || 'community',
            creator_id: hub.creator_id,
            creator_name: null,
            username: hub.slug,
            member_count: hub.member_count ?? null,
            online_count: null,
            is_verified: null,
            source: 'community',
            last_activity_at: hub.updated_at ?? hub.created_at,
          }) as BackstageCommunity),
        ),
        safeList<any>(
          (supabase as any)
            .from('hubs')
            .select('id,slug,title,subtitle,description,hero_image_url,status,hub_type,created_by,created_at,updated_at')
            .eq('status', 'published')
            .or(`title.ilike.${pattern},subtitle.ilike.${pattern},description.ilike.${pattern},slug.ilike.${pattern}`)
            .limit(12),
        ).then((rows) =>
          rows.map((hub) => ({
            id: hub.id,
            slug: hub.slug,
            title: hub.title || 'Backstage',
            description: hub.subtitle || hub.description,
            cover_image_url: hub.hero_image_url,
            avatar_url: null,
            hub_type: hub.hub_type || 'hub',
            creator_id: hub.created_by,
            creator_name: null,
            username: hub.slug,
            member_count: null,
            online_count: null,
            is_verified: null,
            source: 'hub',
            last_activity_at: hub.updated_at ?? hub.created_at,
          }) as BackstageCommunity),
        ),
        safeList<any>(
          (supabase as any)
            .from('profiles')
            .select('user_id,id,full_name,username,avatar_url,user_type,profile_type,is_creator,is_verified,city')
            .or(`full_name.ilike.${pattern},username.ilike.${pattern}`)
            .limit(12),
        ).then((rows) => rows.map((profile) => ({ ...profile, display_name: null, primary_genre: null }) as ProfileItem)),
        safeList<any>(
          (supabase as any)
            .from('session_rooms')
            .select('id,title,description,status,created_at,agora_live_started_at,host_id')
            .in('status', ['live', 'scheduled'])
            .or(`title.ilike.${pattern},description.ilike.${pattern}`)
            .order('created_at', { ascending: false })
            .limit(12),
        ).then((rows) =>
          rows.map((room) => ({
            id: room.id,
            title: room.title,
            description: room.description,
            status: room.status,
            started_at: room.agora_live_started_at ?? room.created_at,
            creator_id: room.host_id,
          }) as LiveRoomItem),
        ),
      ]);

      const communities = [...communityRows, ...hubRows].slice(0, 16);
      return { creators, tracks, mixes, beats, videos, events, communities, users, liveStreams };
    },
    staleTime: 1000 * 60,
  });
}

export function emptyFeedBundle(): FeedBundle {
  return {
    releases: [],
    beats: [],
    samplePacks: [],
    mixes: [],
    events: [],
    soundboards: [],
    profiles: [],
    posts: [],
    mapPlugs: [],
  };
}
