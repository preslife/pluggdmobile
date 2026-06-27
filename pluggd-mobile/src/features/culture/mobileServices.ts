import { supabase } from '../../lib/supabase';
import type { MobileFeedAttachment } from '../community-feed/communityFeedTypes';
import {
  loadFeedBundle,
  type BeatItem,
  type EventItem,
  type MixItem,
  type ProfileItem,
  type ReleaseItem,
  type SamplePackItem,
  type SocialPostItem,
} from '../../lib/mobileContent';
import { MOBILE_CAPABILITIES } from './mobileCapabilities';
import type {
  BackstageCommunity,
  BackstageCommunityEvent,
  BackstageDetail,
  BackstageMembership,
  BackstageOverview,
  BackstageRoom,
  BackstageThread,
  ChallengeVoteState,
  CreatorGalleryItem,
  CreatorProfileBundle,
  CreatorModePulse,
  EventComment,
  EventAttendanceState,
  EventCultureCard,
  EventDiscussionThread,
  FanMapContext,
  FanMapPlug,
  FanIdentitySummary,
  InboxThread,
  EventRsvpState,
  LibraryBundle,
  LiveRoomItem,
  MembershipSummary,
  MobileNotification,
  MobilePollState,
  MobilePlaylist,
  MobileSocialComment,
  MobileStory,
  MyPluggdAnnouncement,
  MyPluggdContest,
  MyPluggdHub,
  PlaylistActionState,
  PlaylistTrack,
  PromoterSummary,
  PushRegistrationState,
  SavedContentItem,
  SavedContentKind,
  SocialPostDetail,
  SoundboardItemDetail,
  SoundboardItemReaction,
  StorefrontItem,
  TicketWalletItem,
  VenueSummary,
  WalletEntitlementItem,
} from './mobileTypes';
import {
  addSocialComment,
  createMobileSocialPost,
  loadBackstageDestinationFeed,
  loadCommunityBoards,
  loadThreadDetail,
  toggleSocialLike,
} from './mobileSocial';

type SupabaseListResult = { data: unknown; error: unknown };

export async function safeList<T>(query: PromiseLike<SupabaseListResult>, fallback: T[] = []) {
  const { data, error } = await query;
  if (error || !Array.isArray(data)) return fallback;
  return data as T[];
}

export async function safeMaybe<T>(query: PromiseLike<{ data: unknown; error: any }>, fallback: T | null = null) {
  const { data, error } = await query;
  if (error || !data || Array.isArray(data)) return fallback;
  return data as T;
}

export async function getCurrentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function normalizeText(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function normalizeCreatorGalleryItem(row: any): CreatorGalleryItem {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    image_url: String(row.image_url || ''),
    title: normalizeText(row.title),
    caption: normalizeText(row.caption),
    category: normalizeText(row.category) || 'studio',
    visibility: normalizeText(row.visibility) || 'public',
    is_featured: Boolean(row.is_featured),
    display_order: Number.isFinite(Number(row.display_order)) ? Number(row.display_order) : 0,
    published_at: normalizeText(row.published_at),
    created_at: normalizeText(row.created_at),
  };
}

function profileGalleryRoute(profile: any | null, userId: string, galleryItemId?: string | null) {
  const handle = normalizeText(profile?.custom_url) || normalizeText(profile?.username) || normalizeText(profile?.slug);
  const baseRoute = handle ? `/creator/${encodeURIComponent(handle)}` : `/user/${encodeURIComponent(userId)}`;
  const params = new URLSearchParams('tab=gallery');
  if (galleryItemId) params.set('galleryItem', galleryItemId);
  return `${baseRoute}?${params.toString()}`;
}

async function loadCreatorGalleryItems(userId: string, limit = 24) {
  const rows = await safeList<any>(
    (supabase as any)
      .from('creator_gallery_items')
      .select('id,user_id,image_url,title,caption,category,visibility,is_featured,display_order,published_at,created_at')
      .eq('user_id', userId)
      .eq('visibility', 'public')
      .order('is_featured', { ascending: false })
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: false })
      .limit(limit),
  );
  return rows.map(normalizeCreatorGalleryItem).filter((item) => item.id && item.user_id && item.image_url);
}

function fileExtension(name?: string | null, mimeType?: string | null) {
  const fromName = name?.split('.').pop()?.replace(/[^a-z0-9]/gi, '').toLowerCase();
  if (fromName) return fromName;
  if (mimeType?.includes('jpeg')) return 'jpg';
  if (mimeType?.includes('png')) return 'png';
  if (mimeType?.includes('gif')) return 'gif';
  if (mimeType?.includes('webp')) return 'webp';
  if (mimeType?.includes('quicktime')) return 'mov';
  if (mimeType?.includes('video')) return 'mp4';
  if (mimeType?.includes('mpeg')) return 'mp3';
  if (mimeType?.includes('wav')) return 'wav';
  if (mimeType?.includes('audio')) return 'm4a';
  return 'bin';
}

export async function uploadSocialMediaAsset(input: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  folder?: string;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to upload media.' };
  const ext = fileExtension(input.fileName, input.mimeType);
  const folder = input.folder || 'posts';
  const storagePath = `${userId}/${folder}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
  try {
    const response = await fetch(input.uri);
    const blob = await response.blob();
    const { error } = await (supabase as any).storage
      .from('social-media')
      .upload(storagePath, blob, {
        contentType: input.mimeType || 'application/octet-stream',
        upsert: false,
      });
    if (error) throw error;
    const { data } = (supabase as any).storage.from('social-media').getPublicUrl(storagePath);
    if (!data?.publicUrl) return { success: false, error: 'Media uploaded but no public URL was returned.' };
    return { success: true, url: data.publicUrl as string, storagePath };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function resolveMobileFeedAttachment(input: {
  attachmentType?: string | null;
  releaseId?: string | null;
  beatId?: string | null;
  galleryId?: string | null;
  mixId?: string | null;
  eventId?: string | null;
}): Promise<MobileFeedAttachment | null> {
  if (input.attachmentType === 'release' && input.releaseId) {
    const release = await safeMaybe<any>(
      (supabase as any)
        .from('releases')
        .select('id,title,artist,cover_art_url')
        .eq('id', input.releaseId)
        .maybeSingle(),
    );
    if (!release) return null;
    return {
      type: 'release',
      id: release.id,
      title: release.title || 'Release',
      subtitle: release.artist || 'PLUGGD release',
      imageUrl: release.cover_art_url || null,
      route: `/release/${release.id}`,
    };
  }

  if (input.attachmentType === 'beat' && input.beatId) {
    const beat = await safeMaybe<any>(
      (supabase as any)
        .from('beats')
        .select('id,title,producer_name,image_url')
        .eq('id', input.beatId)
        .maybeSingle(),
    );
    if (!beat) return null;
    return {
      type: 'beat',
      id: beat.id,
      title: beat.title || 'Beat',
      subtitle: beat.producer_name || 'Producer beat',
      imageUrl: beat.image_url || null,
      route: `/beat/${beat.id}`,
    };
  }

  if (input.attachmentType === 'mix' && input.mixId) {
    const mix = await safeMaybe<any>(
      (supabase as any)
        .from('mixes')
        .select('id,slug,title,cover_url,city')
        .or(`id.eq.${input.mixId},slug.eq.${input.mixId}`)
        .maybeSingle(),
    );
    if (!mix) return null;
    return {
      type: 'mix',
      id: mix.id,
      title: mix.title || 'Mix',
      subtitle: mix.city || 'PLUGGD mix',
      imageUrl: mix.cover_url || null,
      route: `/mixes/${mix.slug || mix.id}`,
    };
  }

  if (input.attachmentType === 'event' && input.eventId) {
    const event = await safeMaybe<any>(
      (supabase as any)
        .from('events')
        .select('id,title,cover_image_url,location,starts_at')
        .eq('id', input.eventId)
        .maybeSingle(),
    );
    if (!event) return null;
    return {
      type: 'event',
      id: event.id,
      title: event.title || 'Event',
      subtitle: [event.location, event.starts_at ? new Date(event.starts_at).toLocaleDateString() : null].filter(Boolean).join(' · ') || 'PLUGGD event',
      imageUrl: event.cover_image_url || null,
      route: `/events/${event.id}`,
    };
  }

  if ((input.attachmentType === 'gallery' || input.attachmentType === 'gallery_item') && input.galleryId) {
    const gallery = await safeMaybe<any>(
      (supabase as any)
        .from('creator_gallery_items')
        .select('id,user_id,image_url,title,caption,category,visibility')
        .eq('id', input.galleryId)
        .eq('visibility', 'public')
        .maybeSingle(),
    );
    if (!gallery) return null;
    const profile = await safeMaybe<any>(
      (supabase as any)
        .from('profiles')
        .select('user_id,username,slug,full_name,display_name,custom_url')
        .eq('user_id', gallery.user_id)
        .maybeSingle(),
    );
    const creatorName = profile?.display_name || profile?.full_name || profile?.username || 'Creator';
    return {
      type: 'gallery_item',
      id: gallery.id,
      title: gallery.title || `${creatorName} gallery`,
      subtitle: gallery.caption || gallery.category || 'Gallery update',
      imageUrl: gallery.image_url || null,
      route: profileGalleryRoute(profile, gallery.user_id, gallery.id),
    };
  }

  return null;
}

export function buildMobileFeedAttachmentLinkPreview(attachment: MobileFeedAttachment) {
  return {
    type: attachment.type,
    id: attachment.id,
    title: attachment.title,
    description: attachment.subtitle,
    image: attachment.imageUrl || null,
    image_url: attachment.imageUrl || null,
    url: attachment.route,
  };
}

function looksUuid(value?: string | null) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function communityTitle(row: any) {
  return String(row.name || row.title || row.slug || 'Community');
}

function mapCommunity(row: any, membership?: BackstageMembership | null): BackstageCommunity {
  return {
    id: row.id,
    slug: row.slug,
    title: communityTitle(row),
    description: row.tagline || row.description || row.subtitle || null,
    cover_image_url: row.banner_url || row.cover_image_url || row.hero_image_url || null,
    avatar_url: row.avatar_url || null,
    hub_type: row.hub_type || row.visibility || 'community',
    creator_id: row.creator_id || row.created_by || null,
    creator_name: null,
    username: row.slug || null,
    member_count: Number.isFinite(Number(row.member_count)) ? Number(row.member_count) : null,
    online_count: row.online_count == null ? null : Number(row.online_count),
    is_verified: row.is_verified ?? null,
    last_activity_at: row.updated_at || row.created_at || null,
    membership: membership ?? null,
    source: row.name ? 'community' : 'hub',
  };
}

function mapThread(row: any): BackstageThread {
  const author = row.author && typeof row.author === 'object' && !Array.isArray(row.author) ? row.author : null;
  return {
    id: row.id,
    slug: row.slug,
    title: row.title || row.content || 'Community thread',
    body: row.body || row.content || null,
    category: row.tag || row.post_type || row.community_visibility || 'Thread',
    author_name: typeof author?.name === 'string' ? author.name : null,
    author_handle: typeof author?.username === 'string' ? author.username : null,
    created_at: row.updated_at || row.created_at,
    like_count: row.like_count ?? row.likes_count ?? null,
    comment_count: row.reply_count ?? row.comments_count ?? null,
    is_pinned: row.is_pinned ?? null,
    is_locked: row.is_locked ?? null,
    attached_release_id: row.attached_release_id ?? null,
    attached_event_id: row.attached_event_id ?? null,
    community_id: row.community_id ?? null,
    route: row.content ? `/post/${row.id}` : row.community_id ? `/backstage/${row.community_id}` : '/backstage',
  };
}

function mapRoom(row: any): BackstageRoom {
  return {
    id: row.id,
    community_id: row.community_id ?? null,
    title: row.title || 'Community room',
    description: row.description || row.brief || null,
    status: row.status || (row.is_active ? 'open' : 'closed'),
    room_type: row.room_type || row.live_mode || null,
    active_users: row.participant_count ?? row.active_users ?? null,
    created_at: row.created_at,
  };
}

function mapCommunityEvent(row: any): BackstageCommunityEvent {
  return {
    id: row.id,
    community_id: row.community_id,
    title: row.title || 'Community event',
    description: row.description || null,
    starts_at: row.start_at || row.starts_at || null,
    ends_at: row.end_at || row.ends_at || null,
    location: row.location || null,
    event_type: row.event_type || null,
    meeting_url: row.meeting_url || null,
    replay_url: row.replay_url || null,
  };
}

function mapLiveRoom(row: any, profile?: ProfileItem | null): LiveRoomItem {
  return {
    id: row.id,
    source: row.__source || 'session_room',
    title: row.title,
    description: row.description,
    status: row.status,
    category: row.live_mode || row.room_type || null,
    viewer_count: row.participant_count ?? row.viewer_count ?? null,
    scheduled_for: row.scheduled_for ?? null,
    started_at: row.agora_live_started_at ?? row.started_at ?? row.created_at,
    replay_url: row.replay_url ?? row.recording_url ?? null,
    thumbnail_url: row.thumbnail_url ?? null,
    creator_id: row.host_id ?? row.creator_id ?? null,
    creator_name: profile?.display_name || profile?.full_name || profile?.username || row.creator_name || null,
    creator_username: profile?.username || row.creator_username || null,
    creator_avatar_url: profile?.avatar_url || row.creator_avatar_url || null,
    backstage_id: row.community_id ?? null,
  };
}

function mapProfile(row: any): ProfileItem {
  return {
    user_id: row.user_id || row.id || null,
    id: row.id || row.user_id || null,
    display_name: row.display_name || row.full_name || row.username || null,
    full_name: row.full_name || row.display_name || null,
    username: row.username || row.slug || null,
    avatar_url: row.avatar_url || null,
    user_type: row.user_type || null,
    profile_type: row.profile_type || null,
    is_creator: row.is_creator ?? null,
    is_verified: row.is_verified ?? row.verified ?? null,
    primary_genre: row.primary_genre || row.genre || null,
    city: row.city || null,
  };
}

async function loadProfileMap(userIds: Array<string | null | undefined>) {
  const ids = Array.from(new Set(userIds.filter(Boolean) as string[]));
  if (!ids.length) return new Map<string, ProfileItem>();
  const rows = await safeList<any>(
    (supabase as any)
      .from('profiles')
      .select('*')
      .in('user_id', ids),
  );
  return new Map(rows.map((row) => [row.user_id || row.id, mapProfile(row)]));
}

function mapStory(row: any, profile?: ProfileItem | null, viewed = false): MobileStory {
  const destinationType = row.destination_type || (row.community_id ? 'community' : row.event_id ? 'event' : row.creator_id ? 'creator' : 'global');
  const destinationId = row.destination_id || row.community_id || row.event_id || row.creator_id || row.user_id || null;
  return {
    id: row.id,
    user_id: row.user_id || row.creator_id || '',
    media_url: row.media_url || row.file_url || row.storage_url || null,
    thumbnail_url: row.thumbnail_url || row.cover_url || row.media_url || null,
    media_type: row.media_type || row.type || null,
    caption: row.caption || row.body || row.content || null,
    duration_seconds: row.duration_seconds ?? row.duration ?? null,
    created_at: row.created_at || null,
    expires_at: row.expires_at || null,
    viewed,
    destination: {
      type: destinationType,
      id: destinationId,
      label: destinationType === 'community' ? 'Community' : destinationType === 'event' ? 'Event' : 'Story',
      route:
        destinationType === 'community' && destinationId
          ? `/backstage/${destinationId}`
          : destinationType === 'event' && destinationId
            ? `/events/${destinationId}`
            : profile?.username
              ? `/creator/${profile.username}`
              : null,
    },
    author: profile
      ? {
          user_id: profile.user_id,
          username: profile.username,
          full_name: profile.full_name || profile.display_name || null,
          avatar_url: profile.avatar_url,
        }
      : null,
  };
}

function mapPlaylist(row: any, owner?: ProfileItem | null, tracks?: PlaylistTrack[]): MobilePlaylist {
  const id = String(row.id);
  return {
    id,
    slug: row.slug || row.share_slug || null,
    name: row.name || row.title || 'Untitled playlist',
    description: row.description || null,
    cover_url: row.cover_url || row.cover_image_url || row.image_url || null,
    owner_id: row.user_id || row.owner_id || row.creator_id || null,
    owner_name: owner?.display_name || owner?.full_name || owner?.username || row.owner_name || null,
    is_public: row.is_public ?? (row.visibility ? row.visibility === 'public' : null),
    visibility: row.visibility || null,
    track_count: row.track_count ?? row.tracks_count ?? (tracks ? tracks.length : null),
    follower_count: row.follower_count ?? row.followers_count ?? null,
    followed: Boolean(row.followed),
    route: `/playlists/${row.slug || id}`,
    tracks,
  };
}

function mapPlaylistTrack(row: any, release?: ReleaseItem | null, beat?: BeatItem | null, mix?: MixItem | null): PlaylistTrack {
  const id = String(row.id || row.release_id || row.beat_id || row.mix_id);
  const sourceTitle = release?.title || beat?.title || mix?.title || row.title || 'Untitled track';
  const creator = release?.artist || beat?.producer_name || mix?.city || row.artist || row.creator_name || null;
  const image = release?.cover_art_url || beat?.image_url || mix?.cover_url || row.image_url || row.cover_url || null;
  const audio = release?.audio_url || release?.preview_url || beat?.audio_url || beat?.tagged_url || mix?.audio_url || row.audio_url || null;
  const route = release?.id
    ? `/release/${release.id}`
    : beat?.id
      ? `/beat/${beat.id}`
      : mix?.id
        ? `/mixes/${mix.id}`
        : '/search';
  return {
    id,
    playlist_id: row.playlist_id,
    release_id: row.release_id || null,
    beat_id: row.beat_id || null,
    mix_id: row.mix_id || null,
    position: row.position ?? row.sort_order ?? null,
    added_at: row.added_at || row.created_at || null,
    title: sourceTitle,
    creator,
    image_url: image,
    audio_url: audio,
    route,
  };
}

async function loadMemberships(userId: string | null) {
  if (!userId) return [] as BackstageMembership[];
  return safeList<BackstageMembership>(
    (supabase as any)
      .from('community_members')
      .select('id,community_id,user_id,role,status,xp,level,joined_at,last_active_at')
      .eq('user_id', userId)
      .in('status', ['active', 'pending', 'muted'])
      .order('updated_at', { ascending: false }),
  );
}

export async function loadLiveRooms() {
  const [sessionRooms, liveSessions, scheduledSessions, communityRooms] = await Promise.all([
    safeList<any>(
      (supabase as any)
        .from('session_rooms')
        .select('id,title,description,status,created_at,scheduled_for,agora_live_started_at,agora_live_ended_at,host_id,is_public,live_mode,participant_count')
        .in('status', ['live', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(24),
    ),
    safeList<any>(
      (supabase as any)
        .from('live_sessions')
        .select('id,title,description,status,scheduled_for,recording_url,thumbnail_url,creator_id,created_at')
        .in('status', ['live', 'scheduled', 'replay'])
        .order('scheduled_for', { ascending: false })
        .limit(24),
    ),
    safeList<any>(
      (supabase as any)
        .from('sessions')
        .select('id,title,description,status,host_id,is_public,scheduled_at,created_at')
        .in('status', ['scheduled', 'live'])
        .order('scheduled_at', { ascending: true })
        .limit(12),
    ),
    safeList<any>(
      (supabase as any)
        .from('community_collab_rooms')
        .select('id,community_id,title,description,brief,room_type,status,is_active,created_at,max_members')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(12),
    ),
  ]);

  const taggedSessionRooms = sessionRooms.map((row) => ({ ...row, __source: 'session_room' }));
  const taggedLiveSessions = liveSessions.map((row) => ({ ...row, __source: 'live_session' }));
  const taggedScheduledSessions = scheduledSessions.map((row) => ({
    ...row,
    __source: 'scheduled_session',
    scheduled_for: row.scheduled_at,
    live_mode: 'scheduled_session',
  }));
  const taggedCommunityRooms = communityRooms.map((row) => ({ ...row, __source: 'community_room' }));

  const rawRows = [...taggedSessionRooms, ...taggedLiveSessions, ...taggedScheduledSessions, ...taggedCommunityRooms];
  const profiles = await loadProfileMap(rawRows.map((row) => row.host_id ?? row.creator_id));
  const merged = rawRows.map((row) => mapLiveRoom(row, profiles.get(row.host_id ?? row.creator_id) ?? null));
  const seen = new Set<string>();
  return merged.filter((room) => {
    if (!room.id || seen.has(room.id)) return false;
    seen.add(room.id);
    return true;
  });
}

export async function loadLiveRoomMessagePreview(roomIds: string[]) {
  const ids = Array.from(new Set(roomIds.filter(Boolean)));
  if (!ids.length) return new Map<string, string>();
  const rows = await safeList<any>(
    (supabase as any)
      .from('session_messages')
      .select('session_id,content,created_at')
      .in('session_id', ids)
      .order('created_at', { ascending: false })
      .limit(80),
  );
  const previews = new Map<string, string>();
  rows.forEach((row) => {
    if (!previews.has(row.session_id) && row.content) previews.set(row.session_id, row.content);
  });
  return previews;
}

export async function loadMobileStories(input: { creatorId?: string | null; communityId?: string | null; eventId?: string | null; limit?: number } = {}) {
  const userId = await getCurrentUserId();
  const rows = await safeList<any>(
    (supabase as any)
      .from('social_stories')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(input.limit ?? 30),
  );
  const now = Date.now();
  const filtered = rows.filter((row) => {
    if (row.expires_at && new Date(row.expires_at).getTime() < now) return false;
    if (input.creatorId && row.user_id !== input.creatorId && row.creator_id !== input.creatorId) return false;
    if (input.communityId && row.community_id !== input.communityId && row.destination_id !== input.communityId) return false;
    if (input.eventId && row.event_id !== input.eventId && row.destination_id !== input.eventId) return false;
    return true;
  });
  const views = userId
    ? await safeList<any>((supabase as any).from('social_story_views').select('story_id').eq('viewer_id', userId).in('story_id', filtered.map((row) => row.id)))
    : [];
  const viewed = new Set(views.map((row) => row.story_id));
  const profiles = await loadProfileMap(filtered.map((row) => row.user_id || row.creator_id));
  return filtered.map((row) => mapStory(row, profiles.get(row.user_id || row.creator_id) ?? null, viewed.has(row.id)));
}

export async function loadMobileStoryDeck(storyId: string) {
  const userId = await getCurrentUserId();
  const seed = await safeMaybe<any>(
    (supabase as any)
      .from('social_stories')
      .select('*')
      .eq('id', storyId)
      .maybeSingle(),
  );

  if (!seed) return loadMobileStories({ limit: 50 });

  const nowIso = new Date().toISOString();
  const authorId = seed.user_id || seed.creator_id;
  const deckRows = authorId
    ? await safeList<any>(
        (supabase as any)
          .from('social_stories')
          .select('*')
          .eq('user_id', authorId)
          .or(`expires_at.is.null,expires_at.gt.${nowIso}`)
          .order('created_at', { ascending: true })
          .limit(30),
      )
    : [seed];
  const rows = deckRows.some((row) => row.id === seed.id) ? deckRows : [seed, ...deckRows];
  const views = userId
    ? await safeList<any>((supabase as any).from('social_story_views').select('story_id').eq('viewer_id', userId).in('story_id', rows.map((row) => row.id)))
    : [];
  const viewed = new Set(views.map((row) => row.story_id));
  const profiles = await loadProfileMap(rows.map((row) => row.user_id || row.creator_id));
  return rows.map((row) => mapStory(row, profiles.get(row.user_id || row.creator_id) ?? null, viewed.has(row.id)));
}

export async function markMobileStoryViewed(storyId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to mark stories as viewed.' };
  const rpcResult = await (supabase as any).rpc('mark_story_viewed', { p_story_id: storyId });
  if (!rpcResult.error) return { success: true };
  const primary = await (supabase as any)
    .from('social_story_views')
    .upsert({ story_id: storyId, viewer_id: userId, viewed_at: new Date().toISOString() }, { onConflict: 'story_id,viewer_id' });
  if (!primary.error) return { success: true };
  const fallback = await (supabase as any)
    .from('social_story_views')
    .upsert({ story_id: storyId, user_id: userId, viewed_at: new Date().toISOString() }, { onConflict: 'story_id,user_id' });
  return fallback.error ? { success: false, error: fallback.error.message } : { success: true };
}

export async function canCreateMobileStory(destination?: { type?: string; id?: string | null }) {
  const userId = await getCurrentUserId();
  if (!userId) return { supported: false, canCreate: false, reason: 'Sign in to create stories.' };
  const { data, error } = await (supabase as any).rpc('can_create_social_story', {
    p_destination_type: destination?.type ?? 'global',
    p_destination_id: destination?.id ?? null,
  });
  if (error) {
    return {
      supported: false,
      canCreate: false,
      reason: 'Story creation is not available right now.',
    };
  }
  return { supported: true, canCreate: Boolean(data), reason: Boolean(data) ? null : 'Story creation is not available for this destination.' };
}

export async function createMobileStory(input: {
  uri: string;
  fileName?: string | null;
  mimeType?: string | null;
  mediaType: 'image' | 'video' | 'audio';
  caption?: string | null;
  durationSeconds?: number | null;
  fileSizeBytes?: number | null;
  destination?: { type?: string | null; id?: string | null };
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to create stories.' };
  const capability = await canCreateMobileStory({
    type: input.destination?.type || undefined,
    id: input.destination?.id ?? null,
  });
  if (capability.supported && !capability.canCreate) {
    return { success: false, error: capability.reason || 'Story creation is not available for this destination.' };
  }
  const upload = await uploadSocialMediaAsset({
    uri: input.uri,
    fileName: input.fileName,
    mimeType: input.mimeType,
    folder: 'story',
  });
  if (!upload.success || !upload.url) return { success: false, error: upload.error || 'Story media could not be uploaded.' };

  const destinationType = input.destination?.type || 'global';
  const destinationId = input.destination?.id || null;
  const basePayload: Record<string, unknown> = {
    user_id: userId,
    media_url: upload.url,
    media_type: input.mediaType,
    caption: input.caption?.trim() || null,
    duration: input.mediaType === 'image' ? 5 : Math.min(Math.max(Math.round(input.durationSeconds || 15), 3), 60),
    file_size_bytes: input.fileSizeBytes || null,
    mime_type: input.mimeType || 'application/octet-stream',
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  };
  const destinationPayload: Record<string, unknown> = {
    destination_type: destinationType,
    destination_id: destinationId,
    community_id: destinationType === 'community' ? destinationId : null,
    event_id: destinationType === 'event' ? destinationId : null,
    creator_id: destinationType === 'creator' ? destinationId : null,
  };

  const insertWithDestination = await (supabase as any)
    .from('social_stories')
    .insert({ ...basePayload, ...destinationPayload })
    .select('id')
    .single();
  if (!insertWithDestination.error) {
    return { success: true, id: insertWithDestination.data?.id as string | undefined };
  }

  const insertBase = await (supabase as any)
    .from('social_stories')
    .insert(basePayload)
    .select('id')
    .single();
  return insertBase.error
    ? { success: false, error: insertBase.error.message }
    : { success: true, id: insertBase.data?.id as string | undefined };
}

function mapHubContest(row: any): MyPluggdContest | null {
  const id = row?.id || row?.slug;
  if (!id) return null;
  return {
    id: String(id),
    title: row.title || row.name || 'Community contest',
    cover: row.cover || row.cover_image_url || row.cover_url || null,
    entrants: row.entrants ?? row.entry_count ?? null,
    ends_at: row.ends_at || row.end_at || null,
    route: row.slug ? `/contests/${row.slug}` : `/contests/${id}`,
  };
}

function mapHubEvent(row: any): EventItem | null {
  if (!row?.id) return null;
  return {
    id: row.id,
    title: row.title || 'Community event',
    description: row.description || null,
    cover_image_url: row.cover_image_url || row.cover || null,
    location: row.location || row.venue || null,
    starts_at: row.starts_at || row.start_at || null,
    ends_at: row.ends_at || row.end_at || null,
    price_cents: row.price_cents ?? null,
    rsvp_count: row.rsvp_count ?? null,
    stream_url: row.stream_url || null,
    playback_url: row.playback_url || null,
    created_at: row.created_at || null,
  };
}

function mapAnnouncement(row: any): MyPluggdAnnouncement | null {
  const text = String(row?.text || row?.body || '').trim();
  if (!text) return null;
  return { id: row?.id || null, text };
}

function mapFanMapPlug(row: any): FanMapPlug | null {
  if (!row?.id || row.lat == null || row.lng == null) return null;
  return {
    id: row.id,
    display_name: row.display_name || row.user || row.username || 'PLUGGD member',
    city: row.city || 'Unknown city',
    country: row.country || 'Unknown country',
    lat: Number(row.lat),
    lng: Number(row.lng),
    message: row.message || null,
    tip_amount: row.tip_amount ?? null,
    creator_id: row.creator_id || null,
    user_id: row.user_id || null,
    avatar_url: row.avatar_url || null,
    username: row.username || row.profile_slug || null,
    profile_slug: row.profile_slug || row.slug || null,
    is_creator: row.is_creator ?? null,
    is_featured: row.is_featured ?? row.featured ?? null,
    created_at: row.created_at || null,
  };
}

export async function loadMyPluggdHub(): Promise<MyPluggdHub> {
  const rpc = await (supabase as any).rpc('fn_hub_payload');
  const payload = !rpc.error && rpc.data && typeof rpc.data === 'object' ? rpc.data as any : {};
  const now = new Date().toISOString();

  const [announcementsRows, promptRows, eventsRows, radioRows, radioQueueRows] = await Promise.all([
    safeList<any>(
      (supabase as any)
        .from('announcements')
        .select('id,text,is_live,starts_at,ends_at,created_at')
        .order('created_at', { ascending: false })
        .limit(3),
    ),
    safeList<any>(
      (supabase as any)
        .from('daily_prompts')
        .select('text,tag,cta_text,cta_href,starts_at,ends_at')
        .order('starts_at', { ascending: false })
        .limit(1),
    ),
    safeList<any>(
      (supabase as any)
        .from('events')
        .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at')
        .gte('starts_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())
        .order('starts_at', { ascending: true })
        .limit(12),
    ),
    safeList<any>(
      (supabase as any)
        .from('radio_state')
        .select('listeners,now_track_id,updated_at')
        .order('updated_at', { ascending: false })
        .limit(1),
    ),
    safeList<any>((supabase as any).from('radio_queue').select('position,track_id').order('position', { ascending: true }).limit(5)),
  ]);

  const announcements = announcementsRows
    .filter((row) => (row.is_live ?? true) && (!row.starts_at || row.starts_at <= now) && (!row.ends_at || row.ends_at >= now))
    .map(mapAnnouncement)
    .filter(Boolean) as MyPluggdAnnouncement[];
  const promptRow = promptRows[0];
  const events = eventsRows.map(mapHubEvent).filter(Boolean) as EventItem[];
  const contests = ((payload.contests || []) as any[]).map(mapHubContest).filter(Boolean) as MyPluggdContest[];
  const liveCount = events.filter((event) => {
    const start = event.starts_at ? new Date(event.starts_at).getTime() : 0;
    const end = event.ends_at ? new Date(event.ends_at).getTime() : start + 2 * 60 * 60 * 1000;
    const nowMs = Date.now();
    return Boolean(event.stream_url || event.playback_url) && start <= nowMs && end >= nowMs;
  }).length;

  let radio: MyPluggdHub['radio'] = null;
  const nowTrackId = radioRows[0]?.now_track_id || radioQueueRows[0]?.track_id || null;
  if (nowTrackId) {
    const track = await safeMaybe<any>(
      (supabase as any)
        .from('tracks')
        .select('id,title,audio_url,release:releases(id,title,artist,cover_art_url)')
        .eq('id', nowTrackId)
        .maybeSingle(),
    );
    radio = {
      listeners: Number(radioRows[0]?.listeners ?? 0),
      now: track
        ? {
            id: track.id,
            title: track.title || track.release?.title || 'Community Radio',
            artist: track.release?.artist || null,
            cover: track.release?.cover_art_url || null,
            audio_url: track.audio_url || null,
          }
        : null,
    };
  }

  return {
    stats: {
      members: Number(payload.stats?.members ?? 0),
      active_week: payload.stats?.active_week ?? null,
      streak_days: payload.stats?.streak_days ?? null,
      xp: payload.stats?.xp ?? null,
      live_count: liveCount,
      contest_count: contests.length,
    },
    announcements,
    contests,
    trending: Array.isArray(payload.trending) ? payload.trending : [],
    prompt: promptRow
      ? {
          text: promptRow.text,
          tag: promptRow.tag ?? null,
          cta_text: promptRow.cta_text ?? null,
          cta_route: promptRow.cta_href ?? null,
        }
      : null,
    radio,
    events,
  };
}

export async function loadFanMapContext(limit = 80): Promise<FanMapContext> {
  const [rpcPlugs, rpcStats] = await Promise.all([
    (supabase as any).rpc('get_fan_map_plugs', { p_limit: limit }),
    (supabase as any).rpc('get_fan_map_stats', {}),
  ]);
  let plugRows = !rpcPlugs.error && Array.isArray(rpcPlugs.data) ? rpcPlugs.data : [];
  if (!plugRows.length) {
    plugRows = await safeList<any>(
      (supabase as any)
        .from('fan_map_plugs')
        .select('id,lat,lng,city,country,display_name,message,tip_amount,is_featured,created_at,creator_id,user_id')
        .order('created_at', { ascending: false })
        .limit(limit),
    );
  }

  const plugs = plugRows.map(mapFanMapPlug).filter(Boolean) as FanMapPlug[];
  const userIds = Array.from(new Set(plugs.map((plug) => plug.user_id || plug.creator_id).filter(Boolean) as string[]));
  const profileMap = await loadProfileMap(userIds);
  const enriched = plugs.map((plug) => {
    const profile = profileMap.get(plug.user_id || plug.creator_id || '');
    return {
      ...plug,
      avatar_url: plug.avatar_url || profile?.avatar_url || null,
      username: plug.username || profile?.username || null,
      profile_slug: plug.profile_slug || profile?.username || null,
      is_creator: plug.is_creator ?? profile?.is_creator ?? null,
    };
  });

  const statsRow = !rpcStats.error && Array.isArray(rpcStats.data) ? rpcStats.data[0] : null;
  const countries = new Set(enriched.map((plug) => plug.country).filter(Boolean));
  return {
    plugs: enriched,
    stats: {
      total: Number(statsRow?.total ?? enriched.length),
      countries: Number(statsRow?.countries ?? countries.size),
      featured: Number(statsRow?.featured ?? enriched.filter((plug) => plug.is_featured).length),
    },
  };
}

export async function createFanMapPlug(input: {
  displayName: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  message?: string | null;
  tipAmount?: number | null;
  creatorId?: string | null;
}): Promise<{ success: boolean; plug?: FanMapPlug; error?: string }> {
  const displayName = input.displayName.trim().slice(0, 80);
  const city = input.city.trim().slice(0, 80);
  const country = input.country.trim().slice(0, 80);
  const message = input.message?.trim().slice(0, 180) || null;

  if (!displayName || !city || !country) {
    return { success: false, error: 'Add your name, city and country to plug in.' };
  }
  if (!Number.isFinite(input.lat) || !Number.isFinite(input.lng)) {
    return { success: false, error: 'Choose your place on the map.' };
  }

  const { data, error } = await (supabase as any).rpc('create_fan_map_plug', {
    p_display_name: displayName,
    p_city: city,
    p_country: country,
    p_lat: input.lat,
    p_lng: input.lng,
    p_message: message,
    p_tip_amount: input.tipAmount ?? null,
    p_creator_id: input.creatorId ?? null,
  });

  if (error) {
    return {
      success: false,
      error: error.message === 'not_authenticated' ? 'Sign in to add yourself to the Fan Map.' : error.message,
    };
  }

  const plug = mapFanMapPlug(data);
  return plug ? { success: true, plug } : { success: false, error: 'Fan Map did not return the new plug.' };
}

export async function loadMobilePlaylists(term?: string | null, limit = 24): Promise<MobilePlaylist[]> {
  const normalized = term?.trim();
  let query = (supabase as any).from('playlists').select('*').order('updated_at', { ascending: false }).limit(limit);
  if (normalized && normalized.length >= 2) {
    const pattern = `%${normalized.replace(/[%_]/g, '')}%`;
    query = query.or(`name.ilike.${pattern},title.ilike.${pattern},description.ilike.${pattern},slug.ilike.${pattern}`);
  }
  let rows = await safeList<any>(query);
  if (!rows.length) {
    let fallback = (supabase as any).from('user_playlists').select('*').order('updated_at', { ascending: false }).limit(limit);
    if (normalized && normalized.length >= 2) {
      const pattern = `%${normalized.replace(/[%_]/g, '')}%`;
      fallback = fallback.or(`name.ilike.${pattern},title.ilike.${pattern},description.ilike.${pattern}`);
    }
    rows = await safeList<any>(fallback);
  }
  const owners = await loadProfileMap(rows.map((row) => row.user_id || row.owner_id || row.creator_id));
  return rows.map((row) => mapPlaylist(row, owners.get(row.user_id || row.owner_id || row.creator_id) ?? null));
}

async function loadPlaylistTracks(playlistId: string): Promise<PlaylistTrack[]> {
  let rows = await safeList<any>(
    (supabase as any)
      .from('playlist_items')
      .select('*')
      .eq('playlist_id', playlistId)
      .order('position', { ascending: true }),
  );
  if (!rows.length) {
    rows = await safeList<any>(
      (supabase as any)
        .from('playlist_tracks')
        .select('*')
        .eq('playlist_id', playlistId)
        .order('position', { ascending: true }),
    );
  }
  const releaseIds = rows.map((row) => row.release_id || row.track_id).filter(Boolean);
  const beatIds = rows.map((row) => row.beat_id).filter(Boolean);
  const mixIds = rows.map((row) => row.mix_id).filter(Boolean);
  const [releases, beats, mixes] = await Promise.all([
    releaseIds.length
      ? safeList<ReleaseItem>(
          supabase
            .from('releases')
            .select('id,title,artist,cover_art_url,audio_url,preview_url,download_url,genre,price,download_price,minimum_price,created_at')
            .in('id', releaseIds),
        )
      : Promise.resolve([]),
    beatIds.length
      ? safeList<BeatItem>(
          (supabase as any)
            .from('beats')
            .select('id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at')
            .in('id', beatIds),
        )
      : Promise.resolve([]),
    mixIds.length
      ? safeList<MixItem>(
          (supabase as any)
            .from('mixes')
            .select('id,slug,title,description,cover_url,audio_url,duration_seconds,city,genre_tags,mood_tags,recording_type,event_name,like_count,repost_count,save_count,play_count,published_at,created_at')
            .in('id', mixIds),
        )
      : Promise.resolve([]),
  ]);
  const releasesById = new Map(releases.map((item) => [item.id, item]));
  const beatsById = new Map(beats.map((item) => [item.id, item]));
  const mixesById = new Map(mixes.map((item) => [item.id, item]));
  return rows.map((row) =>
    mapPlaylistTrack(
      row,
      releasesById.get(row.release_id || row.track_id) ?? null,
      beatsById.get(row.beat_id) ?? null,
      mixesById.get(row.mix_id) ?? null,
    ),
  );
}

export async function loadPlaylistDetail(idOrSlug: string): Promise<MobilePlaylist | null> {
  const byId = looksUuid(idOrSlug)
    ? await safeMaybe<any>((supabase as any).from('playlists').select('*').eq('id', idOrSlug).maybeSingle())
    : null;
  const bySlug = byId
    ? null
    : await safeMaybe<any>((supabase as any).from('playlists').select('*').eq('slug', idOrSlug).maybeSingle());
  const row = byId || bySlug;
  if (!row) return null;
  const [owners, tracks] = await Promise.all([loadProfileMap([row.user_id || row.owner_id || row.creator_id]), loadPlaylistTracks(row.id)]);
  return mapPlaylist(row, owners.get(row.user_id || row.owner_id || row.creator_id) ?? null, tracks);
}

export async function createMobilePlaylist(name: string, description?: string | null): Promise<PlaylistActionState> {
  const userId = await getCurrentUserId();
  if (!userId) return { supported: true, success: false, error: 'Sign in to create playlists.' };
  const trimmed = name.trim();
  if (!trimmed) return { supported: true, success: false, error: 'Name this playlist first.' };
  const { data, error } = await (supabase as any)
    .from('playlists')
    .insert({ user_id: userId, name: trimmed, description: description || null, is_public: false, visibility: 'private' })
    .select('*')
    .maybeSingle();
  if (error) return { supported: false, success: false, error: 'Playlist creation is not available right now.' };
  return { supported: true, success: true, playlist: mapPlaylist(data, null, []) };
}

export async function addReleaseToPlaylist(playlistId: string, releaseId: string): Promise<PlaylistActionState> {
  const userId = await getCurrentUserId();
  if (!userId) return { supported: true, success: false, error: 'Sign in to add tracks.' };
  const { error } = await (supabase as any).from('playlist_items').insert({ playlist_id: playlistId, release_id: releaseId, added_by: userId });
  if (!error) return { supported: true, success: true, added: true };
  const fallback = await (supabase as any).from('playlist_tracks').insert({ playlist_id: playlistId, release_id: releaseId, added_by: userId });
  return fallback.error
    ? { supported: false, success: false, error: 'This track could not be added right now.' }
    : { supported: true, success: true, added: true };
}

export async function togglePlaylistFollow(playlistId: string): Promise<PlaylistActionState> {
  const userId = await getCurrentUserId();
  if (!userId) return { supported: true, success: false, error: 'Sign in to follow playlists.' };
  const existing = await safeMaybe<any>(
    (supabase as any).from('playlist_follows').select('id').eq('playlist_id', playlistId).eq('user_id', userId).maybeSingle(),
  );
  if (existing?.id) {
    const { error } = await (supabase as any).from('playlist_follows').delete().eq('id', existing.id);
    return error ? { supported: false, success: false, error: error.message } : { supported: true, success: true, followed: false };
  }
  const { error } = await (supabase as any).from('playlist_follows').insert({ playlist_id: playlistId, user_id: userId });
  return error
    ? { supported: false, success: false, error: 'This playlist could not be followed right now.' }
    : { supported: true, success: true, followed: true };
}

export async function loadCreatorStorefront(creatorId: string): Promise<StorefrontItem[]> {
  const [storeRows, merchRows] = await Promise.all([
    safeList<any>(
      (supabase as any)
        .from('store_products')
        .select('*')
        .eq('creator_id', creatorId)
        .limit(12),
    ),
    safeList<any>(
      (supabase as any)
        .from('merch_products')
        .select('*')
        .eq('creator_id', creatorId)
        .limit(12),
    ),
  ]);
  return [...storeRows, ...merchRows].map((row) => ({
    id: row.id,
    creator_id: row.creator_id || row.user_id || creatorId,
    title: row.title || row.name || 'Store item',
    description: row.description || null,
    image_url: row.image_url || row.cover_image_url || null,
    price_cents: row.price_cents ?? (row.price ? Number(row.price) * 100 : null),
    currency: row.currency || 'GBP',
    kind: row.kind || row.product_type || 'merch',
    route: row.route || null,
    purchaseSupported: !/digital|credit|unlock/i.test(String(row.kind || row.product_type || '')),
  }));
}

export async function loadCreatorMemberships(creatorId: string): Promise<MembershipSummary[]> {
  const [tierRows, membershipRows] = await Promise.all([
    safeList<any>(
      (supabase as any)
        .from('membership_tiers')
        .select('*')
        .eq('creator_id', creatorId)
        .limit(12),
    ),
    safeList<any>(
      (supabase as any)
        .from('creator_memberships')
        .select('*')
        .eq('creator_id', creatorId)
        .limit(12),
    ),
  ]);
  return [...tierRows, ...membershipRows].map((row) => ({
    id: row.id,
    creator_id: row.creator_id || creatorId,
    title: row.title || row.name || 'Membership',
    description: row.description || row.summary || null,
    price_cents: row.price_cents ?? null,
    currency: row.currency || 'GBP',
    member_count: row.member_count ?? row.members_count ?? null,
    is_member: Boolean(row.is_member),
    route: `/membership/${creatorId}`,
  }));
}

async function loadCreatorEventsForProfile(ownerId: string): Promise<EventItem[]> {
  const selects = 'id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at';
  const columns = ['created_by', 'creator_id', 'user_id', 'promoter_id'];
  const results = await Promise.all(
    columns.map((column) =>
      safeList<EventItem>(
        (supabase as any)
          .from('events')
          .select(selects)
          .eq(column, ownerId)
          .order('starts_at', { ascending: true })
          .limit(12),
      ),
    ),
  );
  const seen = new Set<string>();
  return results.flat().filter((event) => {
    if (!event.id || seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  }).slice(0, 12);
}

async function loadCreatorSoundboardsForProfile(ownerId: string) {
  const selects = 'id,title,cover_image_url,item_count,created_at';
  const results = await Promise.all(
    ['creator_id', 'user_id'].map((column) =>
      safeList<any>(
        (supabase as any)
          .from('soundboards')
          .select(selects)
          .eq(column, ownerId)
          .order('created_at', { ascending: false })
          .limit(12),
      ),
    ),
  );
  const seen = new Set<string>();
  return results.flat().filter((board) => {
    if (!board.id || seen.has(board.id)) return false;
    seen.add(board.id);
    return true;
  }).slice(0, 12);
}

export async function loadCreatorProfileBundle(input: { username?: string | null; userId?: string | null }): Promise<CreatorProfileBundle> {
  const viewerId = await getCurrentUserId();
  const lookupUserId = input.userId || null;
  const lookupUsername = input.username || null;
  let profileRow = lookupUserId
    ? await safeMaybe<any>((supabase as any).from('profiles').select('*').eq('user_id', lookupUserId).maybeSingle())
    : null;
  if (!profileRow && lookupUsername) {
    profileRow = await safeMaybe<any>(
      (supabase as any)
        .from('profiles')
        .select('*')
        .or(`username.eq.${lookupUsername},slug.eq.${lookupUsername},custom_url.eq.${lookupUsername}`)
        .maybeSingle(),
    );
    if (!profileRow) {
      profileRow = await safeMaybe<any>((supabase as any).from('profiles').select('*').eq('username', lookupUsername).maybeSingle());
    }
  }

  if (!profileRow) {
    return {
      profile: null,
      followerCount: 0,
      isFollowing: false,
      releases: [],
      mixes: [],
      beats: [],
      samplePacks: [],
      soundboards: [],
      events: [],
      liveRooms: [],
      communities: [],
      stories: [],
      galleryItems: [],
      clips: [],
      playlists: [],
      storefront: [],
      memberships: [],
    };
  }

  const profile = mapProfile(profileRow);
  const ownerId = profile.user_id || profile.id || '';
  const [
    releases,
    mixes,
    beats,
    samplePacks,
    soundboards,
    events,
    liveRooms,
    communities,
    stories,
    galleryItems,
    clips,
    playlists,
    storefront,
    memberships,
    followerCount,
    following,
  ] = await Promise.all([
    safeList<ReleaseItem>(
      supabase
        .from('releases')
        .select('id,title,artist,cover_art_url,audio_url,preview_url,download_url,genre,price,download_price,minimum_price,created_at')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(12),
    ),
    safeList<MixItem>(
      (supabase as any)
        .from('mixes')
        .select('id,slug,title,description,cover_url,audio_url,duration_seconds,city,genre_tags,mood_tags,recording_type,event_name,like_count,repost_count,save_count,play_count,published_at,created_at')
        .eq('user_id', ownerId)
        .limit(12),
    ),
    safeList<BeatItem>(
      (supabase as any)
        .from('beats')
        .select('id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(12),
    ),
    safeList<SamplePackItem>(
      (supabase as any)
        .from('sample_packs')
        .select('id,title,description,cover_art_url,preview_url,download_url,genre,bpm_range,price,sample_count,tags,total_downloads,created_at')
        .eq('user_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(12),
    ),
    loadCreatorSoundboardsForProfile(ownerId),
    loadCreatorEventsForProfile(ownerId),
    safeList<any>(
      (supabase as any)
        .from('session_rooms')
        .select('id,title,description,status,created_at,scheduled_for,agora_live_started_at,host_id,is_public,live_mode,participant_count')
        .eq('host_id', ownerId)
        .in('status', ['live', 'scheduled'])
        .order('created_at', { ascending: false })
        .limit(8),
    ).then((rows) => rows.map((row) => mapLiveRoom({ ...row, __source: 'session_room' }))),
    safeList<any>(
      (supabase as any)
        .from('communities')
        .select('id,creator_id,name,slug,description,tagline,avatar_url,banner_url,cover_image_url,visibility,join_policy,status,is_primary,member_count,created_at,updated_at')
        .eq('creator_id', ownerId)
        .limit(8),
    ).then((rows) => rows.map((row) => mapCommunity(row, null))),
    loadMobileStories({ creatorId: ownerId, limit: 12 }),
    loadCreatorGalleryItems(ownerId),
    safeList<any>(
      (supabase as any)
        .from('videos')
        .select('id,title,description,thumbnail_url,youtube_url,artist_id,created_at')
        .eq('artist_id', ownerId)
        .order('created_at', { ascending: false })
        .limit(12),
    ),
    loadMobilePlaylists(null, 16).then((rows) => rows.filter((playlist) => playlist.owner_id === ownerId).slice(0, 8)),
    loadCreatorStorefront(ownerId),
    loadCreatorMemberships(ownerId),
    (supabase as any).from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', ownerId),
    viewerId
      ? safeMaybe<any>((supabase as any).from('user_follows').select('id').eq('follower_id', viewerId).eq('following_id', ownerId).maybeSingle())
      : Promise.resolve(null),
  ]);

  return {
    profile,
    followerCount: followerCount.count ?? 0,
    isFollowing: Boolean(following),
    releases,
    mixes,
    beats,
    samplePacks,
    soundboards,
    events,
    liveRooms,
    communities,
    stories,
    galleryItems,
    clips,
    playlists,
    storefront,
    memberships,
  };
}

export async function loadBackstageOverview(): Promise<BackstageOverview> {
  const userId = await getCurrentUserId();
  const memberships = await loadMemberships(userId);
  const membershipByCommunity = new Map(memberships.map((item) => [item.community_id, item]));

  const [bundle, communityRows, hubRows, threadRows, postRows, roomRows, communityEventRows, challengeRows, boards] = await Promise.all([
    loadFeedBundle(16),
    safeList<any>(
      (supabase as any)
        .from('communities')
        .select('id,creator_id,name,slug,description,tagline,avatar_url,banner_url,cover_image_url,visibility,join_policy,status,is_primary,member_count,created_at,updated_at')
        .eq('status', 'active')
        .in('visibility', ['public', 'private'])
        .order('updated_at', { ascending: false })
        .limit(30),
    ),
    safeList<any>(
      (supabase as any)
        .from('hubs')
        .select('id,slug,title,subtitle,description,hero_image_url,status,hub_type,created_by,created_at,updated_at')
        .eq('status', 'published')
        .order('updated_at', { ascending: false })
        .limit(16),
    ),
    safeList<any>(
      (supabase as any)
        .from('view_hub_threads')
        .select('id,title,tag,slug,reply_count,author,updated_at')
        .order('updated_at', { ascending: false })
        .limit(30),
    ),
    safeList<SocialPostItem>(
      (supabase as any)
        .from('social_posts')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(24),
    ),
    safeList<any>(
      (supabase as any)
        .from('community_collab_rooms')
        .select('id,community_id,title,description,brief,room_type,status,is_active,created_at,max_members')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(16),
    ),
    safeList<any>(
      (supabase as any)
        .from('community_events')
        .select('id,community_id,creator_id,title,description,start_at,end_at,event_type,meeting_url,replay_url,location,visibility,is_cancelled,created_at,updated_at')
        .eq('is_cancelled', false)
        .order('start_at', { ascending: true })
        .limit(16),
    ),
    safeList<any>(
      (supabase as any)
        .from('community_challenges')
        .select('id,community_id,title,description,status,entry_count,starts_at,ends_at,visibility,created_at,updated_at')
        .in('status', ['open', 'judging'])
        .order('updated_at', { ascending: false })
        .limit(10),
    ),
    loadCommunityBoards(),
  ]);

  const communities = [
    ...communityRows.map((row) => mapCommunity(row, membershipByCommunity.get(row.id) ?? null)),
    ...hubRows.map((row) => mapCommunity(row, null)),
  ];

  const joinedCommunities = communities.filter((community) => community.membership?.status && community.membership.status !== 'left');

  const challengeThreads = challengeRows.map<BackstageThread>((challenge) => ({
    id: challenge.id,
    title: challenge.title || 'Community challenge',
    body: challenge.description || null,
    category: 'Challenge',
    created_at: challenge.updated_at || challenge.created_at,
    comment_count: challenge.entry_count ?? null,
    community_id: challenge.community_id,
    route: `/backstage/${challenge.community_id}`,
  }));

  return {
    communities,
    joinedCommunities,
    boards,
    threads: [...postRows.map(mapThread), ...threadRows.map(mapThread)].slice(0, 40),
    rooms: roomRows.map(mapRoom),
    events: bundle.events,
    communityEvents: communityEventRows.map(mapCommunityEvent),
    moments: postRows.filter((post: any) => Array.isArray(post.images) || post.video || post.audio),
    challenges: challengeThreads,
  };
}

export async function loadBackstageDetail(idOrSlug: string): Promise<BackstageDetail> {
  const userId = await getCurrentUserId();
  const communityQuery = (supabase as any)
    .from('communities')
    .select('id,creator_id,name,slug,description,tagline,avatar_url,banner_url,cover_image_url,visibility,join_policy,status,is_primary,member_count,created_at,updated_at')
    .eq(looksUuid(idOrSlug) ? 'id' : 'slug', idOrSlug)
    .maybeSingle();
  const communityRow = await safeMaybe<any>(communityQuery);

  if (!communityRow) {
    const hub = await safeMaybe<any>(
      (supabase as any)
        .from('hubs')
        .select('id,slug,title,subtitle,description,hero_image_url,status,hub_type,created_by,created_at,updated_at')
        .eq(looksUuid(idOrSlug) ? 'id' : 'slug', idOrSlug)
        .maybeSingle(),
    );
    return {
      community: hub ? mapCommunity(hub, null) : null,
      membership: null,
      boards: [],
      posts: [],
      socialPosts: [],
      threads: [],
      rooms: [],
      events: [],
      soundboards: [],
      drops: [],
    };
  }

  const membership = userId
    ? await safeMaybe<BackstageMembership>(
        (supabase as any)
          .from('community_members')
          .select('id,community_id,user_id,role,status,xp,level,joined_at,last_active_at')
          .eq('community_id', communityRow.id)
          .eq('user_id', userId)
          .maybeSingle(),
      )
    : null;

  const [destinationFeed, rooms, events, challenges, soundboards, dropsBundle, boards] = await Promise.all([
    loadBackstageDestinationFeed({ destination_type: 'creator_community', destination_id: communityRow.id }),
    safeList<any>(
      (supabase as any)
        .from('community_collab_rooms')
        .select('id,community_id,title,description,brief,room_type,status,is_active,created_at,max_members')
        .eq('community_id', communityRow.id)
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(20),
    ),
    safeList<any>(
      (supabase as any)
        .from('community_events')
        .select('id,community_id,creator_id,title,description,start_at,end_at,event_type,meeting_url,replay_url,location,visibility,is_cancelled,created_at,updated_at')
        .eq('community_id', communityRow.id)
        .eq('is_cancelled', false)
        .order('start_at', { ascending: true })
        .limit(20),
    ),
    safeList<any>(
      (supabase as any)
        .from('community_challenges')
        .select('id,community_id,title,description,status,entry_count,starts_at,ends_at,visibility,created_at,updated_at')
        .eq('community_id', communityRow.id)
        .in('status', ['open', 'judging'])
        .order('updated_at', { ascending: false })
        .limit(20),
    ),
    communityRow.creator_id ? loadCreatorSoundboardsForProfile(communityRow.creator_id) : Promise.resolve([]),
    loadFeedBundle(10),
    loadCommunityBoards(),
  ]);

  const challengeThreads = challenges.map(mapThread);
  return {
    community: mapCommunity(communityRow, membership),
    membership,
    boards,
    posts: destinationFeed.posts.map((post) => ({
      id: post.id,
      body: post.content,
      content: post.content,
      title: post.content,
      user_id: post.user_id,
      destinations: post.destinations.map((destination) => destination.label),
      media_paths: [...post.images, post.video, post.audio].filter(Boolean) as string[],
      images: post.images,
      video: post.video,
      audio: post.audio,
      status: 'published',
      post_type: post.post_type,
      likes_count: post.likes_count,
      reposts_count: post.reposts_count,
      comments_count: post.comments_count,
      is_deleted: false,
      created_at: post.created_at,
    })),
    socialPosts: destinationFeed.posts,
    threads: [...destinationFeed.posts.map(mapThread), ...challengeThreads],
    rooms: rooms.map(mapRoom),
    events: events.map(mapCommunityEvent),
    soundboards,
    drops: [...dropsBundle.releases, ...dropsBundle.beats, ...dropsBundle.mixes].slice(0, 12),
  };
}

export async function joinBackstage(communityId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to join this community.' };
  const { error } = await (supabase as any)
    .from('community_members')
    .upsert(
      {
        community_id: communityId,
        user_id: userId,
        role: 'member',
        status: 'active',
        last_active_at: new Date().toISOString(),
      },
      { onConflict: 'community_id,user_id' },
    );
  return error ? { success: false, error: error.message } : { success: true };
}

export async function leaveBackstage(communityId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to leave this community.' };
  const { error } = await (supabase as any)
    .from('community_members')
    .update({ status: 'left', updated_at: new Date().toISOString() })
    .eq('community_id', communityId)
    .eq('user_id', userId);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function loadEventDetail(eventId: string) {
  const userId = await getCurrentUserId();
  const [event, comments, rsvp, ownedTickets, orders] = await Promise.all([
    safeMaybe<EventItem>(
      supabase
        .from('events')
        .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at')
        .eq('id', eventId)
        .maybeSingle(),
    ),
    safeList<EventComment>(
      (supabase as any)
        .from('event_comments')
        .select('id,event_id,user_id,parent_id,body,edited_at,deleted_at,created_at,updated_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(100),
    ),
    userId
      ? safeMaybe<any>((supabase as any).from('event_rsvps').select('id,status,event_id,user_id').eq('event_id', eventId).eq('user_id', userId).maybeSingle())
      : Promise.resolve(null),
    userId
      ? safeList<any>((supabase as any).from('event_tickets').select('id,event_id,user_id,payment_status,created_at').eq('event_id', eventId).eq('user_id', userId))
      : Promise.resolve([]),
    userId
      ? safeList<any>((supabase as any).from('ticket_orders').select('id,event_id,user_id,status,quantity,total_cents,qr_code_data,created_at').eq('event_id', eventId).eq('user_id', userId))
      : Promise.resolve([]),
  ]);

  const card = event
    ? ({
        ...event,
        rsvp_status: (rsvp?.status as EventRsvpState | undefined) ?? 'none',
        has_ticket: ownedTickets.length > 0,
        has_order: orders.length > 0,
      } satisfies EventCultureCard)
    : null;

  return { event: card, comments, ownedTickets, orders, capabilities: MOBILE_CAPABILITIES.events };
}

export async function loadEventCultureContext(eventId: string): Promise<{
  attendance: EventAttendanceState;
  discussion: EventDiscussionThread;
  venue: VenueSummary | null;
  promoter: PromoterSummary | null;
  stories: MobileStory[];
}> {
  const userId = await getCurrentUserId();
  const [event, rsvps, comments, destinationFeed, stories] = await Promise.all([
    safeMaybe<any>((supabase as any).from('events').select('*').eq('id', eventId).maybeSingle()),
    safeList<any>((supabase as any).from('event_rsvps').select('event_id,user_id,status,created_at').eq('event_id', eventId).in('status', ['going', 'interested']).limit(24)),
    safeList<EventComment>(
      (supabase as any)
        .from('event_comments')
        .select('id,event_id,user_id,parent_id,body,edited_at,deleted_at,created_at,updated_at')
        .eq('event_id', eventId)
        .order('created_at', { ascending: false })
        .limit(80),
    ),
    loadBackstageDestinationFeed({ destination_type: 'event', destination_id: eventId }),
    loadMobileStories({ eventId, limit: 10 }),
  ]);
  const profileMap = await loadProfileMap(rsvps.map((row) => row.user_id));
  const attendees = rsvps
    .map((row) => profileMap.get(row.user_id))
    .filter(Boolean)
    .slice(0, 12)
    .map((profile) => ({
      user_id: profile?.user_id ?? null,
      username: profile?.username ?? null,
      full_name: profile?.full_name ?? profile?.display_name ?? null,
      avatar_url: profile?.avatar_url ?? null,
    }));
  const currentRsvp = userId ? rsvps.find((row) => row.user_id === userId)?.status : null;
  const promoterId = event?.created_by || event?.creator_id || event?.promoter_id || null;
  const promoterProfile = promoterId ? (await loadProfileMap([promoterId])).get(promoterId) : null;
  return {
    attendance: {
      event_id: eventId,
      rsvp_status: (currentRsvp as EventRsvpState | undefined) ?? 'none',
      going_count: Number(event?.rsvp_count ?? rsvps.length),
      online_count: null,
      attendees,
    },
    discussion: {
      event_id: eventId,
      comments,
      socialPosts: destinationFeed.posts,
      backstageRoute: event?.community_id ? `/backstage/${event.community_id}` : null,
    },
    venue: {
      id: event?.venue_id || null,
      name: event?.venue || event?.location || null,
      city: event?.city || null,
      address: event?.address || event?.location || null,
      latitude: event?.latitude ?? null,
      longitude: event?.longitude ?? null,
      route: event?.venue_id ? `/venues/${event.venue_id}` : null,
    },
    promoter: promoterProfile
      ? {
          id: promoterProfile.user_id || promoterProfile.id,
          name: promoterProfile.display_name || promoterProfile.full_name || promoterProfile.username,
          username: promoterProfile.username,
          avatar_url: promoterProfile.avatar_url,
          route: promoterProfile.username ? `/creator/${promoterProfile.username}` : promoterProfile.user_id ? `/user/${promoterProfile.user_id}` : null,
        }
      : null,
    stories,
  };
}

export async function setEventRsvp(eventId: string, status: Exclude<EventRsvpState, 'none'>) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to RSVP.' };
  const { error } = await (supabase as any)
    .from('event_rsvps')
    .upsert({ event_id: eventId, user_id: userId, status, updated_at: new Date().toISOString() }, { onConflict: 'event_id,user_id' });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function loadReminderState() {
  const userId = await getCurrentUserId();
  if (!userId) return { eventStatuses: {} as Record<string, EventRsvpState>, liveSessionIds: [] as string[] };

  const [eventRows, liveRows] = await Promise.all([
    safeList<any>(
      (supabase as any)
        .from('event_rsvps')
        .select('event_id,status')
        .eq('user_id', userId)
        .in('status', ['interested', 'going', 'cancelled']),
    ),
    safeList<any>(
      (supabase as any)
        .from('live_session_reminders')
        .select('session_id,room_id,status')
        .eq('user_id', userId)
        .in('status', ['active', 'scheduled', 'pending']),
    ),
  ]);

  const eventStatuses = eventRows.reduce<Record<string, EventRsvpState>>((statuses, row) => {
    if (row.event_id) statuses[row.event_id] = (row.status as EventRsvpState | undefined) ?? 'none';
    return statuses;
  }, {});

  return {
    eventStatuses,
    liveSessionIds: liveRows.map((row) => row.session_id || row.room_id).filter(Boolean),
  };
}

export async function setEventReminder(eventId: string, enabled: boolean) {
  return setEventRsvp(eventId, enabled ? 'interested' : 'cancelled');
}

export async function setScheduledSessionReminder(input: {
  sessionId: string;
  enabled: boolean;
  sendAt?: string | null;
  title?: string | null;
  source?: LiveRoomItem['source'];
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to set live reminders.' };

  if (input.source === 'session_room') {
    const { data, error } = await (supabase as any).rpc('set_live_room_reminder', {
      p_room_id: input.sessionId,
      p_enabled: input.enabled,
      p_send_at: input.sendAt ?? null,
      p_title: input.title ?? null,
    });
    if (error) return { success: false, error: error.message };
    const row = Array.isArray(data) ? data[0] : data;
    return { success: true, reminded: Boolean(row?.reminded ?? input.enabled) };
  }

  const existing = await safeMaybe<any>(
    (supabase as any)
      .from('live_session_reminders')
      .select('id')
      .eq('user_id', userId)
      .eq('session_id', input.sessionId)
      .maybeSingle(),
  );

  if (!input.enabled) {
    if (!existing?.id) return { success: true, reminded: false };
    const { error } = await (supabase as any)
      .from('live_session_reminders')
      .update({ status: 'cancelled' })
      .eq('id', existing.id);
    return error ? { success: false, error: error.message } : { success: true, reminded: false };
  }

  const sendAt = input.sendAt || new Date(Date.now() + 60 * 60 * 1000).toISOString();
  const payload = {
    user_id: userId,
    session_id: input.sessionId,
    reminder_type: 'push',
    send_at: sendAt,
    status: 'active',
    title: input.title || 'PLUGGD live session',
  };

  const request = existing?.id
    ? (supabase as any).from('live_session_reminders').update(payload).eq('id', existing.id)
    : (supabase as any).from('live_session_reminders').insert(payload);
  const { error } = await request;
  return error ? { success: false, error: error.message } : { success: true, reminded: true };
}

async function toggleGenericSavedContent(kind: SavedContentKind, id: string) {
  const { data, error } = await (supabase as any).rpc('toggle_saved_content', {
    p_content_type: kind,
    p_content_id: id,
  });
  if (error) {
    return {
      success: false,
      supported: false,
      error: 'This item cannot be saved right now.',
    };
  }

  const row = Array.isArray(data) ? data[0] : data;
  return { success: true, saved: Boolean(row?.saved ?? true), supported: true };
}

export async function toggleProfileFollow(profileId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to follow creators.', supported: false };
  if (profileId === userId) return { success: false, error: 'Your own profile is already available from the avatar menu.', supported: true };

  const existing = await safeMaybe<any>(
    (supabase as any)
      .from('user_follows')
      .select('id')
      .eq('follower_id', userId)
      .eq('following_id', profileId)
      .maybeSingle(),
  );
  if (existing?.id) {
    const { error } = await (supabase as any).from('user_follows').delete().eq('id', existing.id);
    return error ? { success: false, error: error.message, supported: true } : { success: true, saved: false, supported: true };
  }

  const { error } = await (supabase as any).from('user_follows').insert({ follower_id: userId, following_id: profileId });
  return error ? { success: false, error: error.message, supported: true } : { success: true, saved: true, supported: true };
}

export async function submitContentReport(input: {
  targetType: 'release' | 'beat' | 'post' | 'profile' | 'comment' | 'blog_post' | 'story';
  targetId: string;
  reason?: string;
  description?: string | null;
  targetOwnerId?: string | null;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to report content.' };
  const { error } = await (supabase as any).from('content_reports').insert({
    reporter_id: userId,
    target_type: input.targetType,
    target_id: input.targetId,
    reason: input.reason || 'other',
    description: input.description || null,
    target_owner_id: input.targetOwnerId || null,
    status: 'pending',
  });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function reportLiveRoom(roomId: string, hostId?: string | null) {
  if (!hostId) return { success: false, error: 'This room does not expose a reportable host profile yet.' };
  return submitContentReport({
    targetType: 'profile',
    targetId: hostId,
    reason: 'other',
    description: `Report submitted from live room ${roomId}.`,
    targetOwnerId: hostId,
  });
}

export async function addEventComment(eventId: string, body: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to comment.' };
  const trimmed = body.trim();
  if (!trimmed) return { success: false, error: 'Write a comment first.' };
  const { error } = await (supabase as any).from('event_comments').insert({ event_id: eventId, user_id: userId, body: trimmed });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function loadSoundboardItemDetails(soundboardId: string): Promise<{
  items: SoundboardItemDetail[];
  boardComments: MobileSocialComment[];
}> {
  const [items, boardComments] = await Promise.all([
    safeList<any>(
      (supabase as any)
        .from('soundboard_items')
        .select('*')
        .eq('soundboard_id', soundboardId)
        .order('is_pinned', { ascending: false })
        .order('position', { ascending: true }),
    ),
    safeList<any>(
      (supabase as any)
        .from('soundboard_comments')
        .select('*')
        .eq('soundboard_id', soundboardId)
        .order('created_at', { ascending: false })
        .limit(40),
    ),
  ]);
  const itemIds = items.map((item) => item.id);
  const [reactions, itemComments] = await Promise.all([
    itemIds.length
      ? safeList<SoundboardItemReaction>(
          (supabase as any)
            .from('soundboard_item_reactions')
            .select('*')
            .in('soundboard_item_id', itemIds)
            .limit(200),
        )
      : Promise.resolve([]),
    itemIds.length
      ? safeList<any>(
          (supabase as any)
            .from('soundboard_item_comments')
            .select('*')
            .in('soundboard_item_id', itemIds)
            .order('created_at', { ascending: false })
            .limit(120),
        )
      : Promise.resolve([]),
  ]);
  const reactionsByItem = reactions.reduce<Record<string, SoundboardItemReaction[]>>((groups, reaction) => {
    groups[reaction.soundboard_item_id] = [...(groups[reaction.soundboard_item_id] || []), reaction];
    return groups;
  }, {});
  const commentsByItem = itemComments.reduce<Record<string, MobileSocialComment[]>>((groups, comment) => {
    const key = comment.soundboard_item_id;
    if (!key) return groups;
    groups[key] = [
      ...(groups[key] || []),
      {
        id: comment.id,
        user_id: comment.user_id,
        post_id: comment.soundboard_item_id,
        content: comment.body || comment.content || '',
        created_at: comment.created_at,
      },
    ];
    return groups;
  }, {});
  return {
    items: items.map((item) => ({
      ...item,
      item_type: item.item_type || 'note',
      reactions: reactionsByItem[item.id] || [],
      comments: commentsByItem[item.id] || [],
    })),
    boardComments: boardComments.map((comment) => ({
      id: comment.id,
      user_id: comment.user_id,
      post_id: comment.soundboard_id,
      content: comment.body || comment.content || '',
      created_at: comment.created_at,
    })),
  };
}

export async function addSoundboardComment(soundboardId: string, body: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to comment.' };
  const trimmed = body.trim();
  if (!trimmed) return { success: false, error: 'Write a comment first.' };
  const { error } = await (supabase as any).from('soundboard_comments').insert({ soundboard_id: soundboardId, user_id: userId, body: trimmed });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function addSoundboardItemComment(itemId: string, body: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to comment.' };
  const trimmed = body.trim();
  if (!trimmed) return { success: false, error: 'Write a comment first.' };
  const { error } = await (supabase as any).from('soundboard_item_comments').insert({ soundboard_item_id: itemId, user_id: userId, body: trimmed });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function toggleSoundboardItemReaction(itemId: string, reactionType = 'fire') {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to react.' };
  const existing = await safeMaybe<any>(
    (supabase as any)
      .from('soundboard_item_reactions')
      .select('id')
      .eq('soundboard_item_id', itemId)
      .eq('user_id', userId)
      .eq('reaction_type', reactionType)
      .maybeSingle(),
  );
  if (existing?.id) {
    const { error } = await (supabase as any).from('soundboard_item_reactions').delete().eq('id', existing.id);
    return error ? { success: false, error: error.message } : { success: true, active: false };
  }
  const { error } = await (supabase as any)
    .from('soundboard_item_reactions')
    .insert({ soundboard_item_id: itemId, user_id: userId, reaction_type: reactionType });
  return error ? { success: false, error: error.message } : { success: true, active: true };
}

export async function logSoundboardItemPlay(itemId: string) {
  const rpc = await (supabase as any).rpc('increment_soundboard_item_play', { p_item_id: itemId });
  if (!rpc.error) return { success: true };
  const { error } = await (supabase as any).from('soundboard_items').update({ last_played_at: new Date().toISOString() }).eq('id', itemId);
  return error ? { success: false, error: rpc.error?.message || error.message } : { success: true };
}

export async function loadWalletTickets(): Promise<TicketWalletItem[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];
  const [tickets, orders] = await Promise.all([
    safeList<any>((supabase as any).from('event_tickets').select('id,event_id,user_id,payment_status,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)),
    safeList<any>((supabase as any).from('ticket_orders').select('id,event_id,user_id,status,quantity,total_cents,qr_code_data,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)),
  ]);

  const eventIds = Array.from(new Set([...tickets, ...orders].map((item) => item.event_id).filter(Boolean)));
  const events = eventIds.length
    ? await safeList<EventItem>(
        supabase
          .from('events')
          .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at')
          .in('id', eventIds),
      )
    : [];
  const eventById = new Map(events.map((event) => [event.id, event]));

  return [
    ...tickets.map<TicketWalletItem>((ticket) => {
      const event = eventById.get(ticket.event_id);
      return {
        id: ticket.id,
        source: 'event_tickets',
        event_id: ticket.event_id,
        event_title: event?.title || 'Event ticket',
        event_image_url: event?.cover_image_url,
        venue: event?.location,
        starts_at: event?.starts_at,
        status: ticket.payment_status || 'confirmed',
      };
    }),
    ...orders.map<TicketWalletItem>((order) => {
      const event = eventById.get(order.event_id);
      return {
        id: order.id,
        source: 'ticket_orders',
        event_id: order.event_id,
        event_title: event?.title || 'Event ticket',
        event_image_url: event?.cover_image_url,
        venue: event?.location,
        starts_at: event?.starts_at,
        status: order.status || 'confirmed',
        ticket_type: order.quantity ? `${order.quantity} ticket${Number(order.quantity) === 1 ? '' : 's'}` : null,
        qr_code_data: order.qr_code_data || null,
      };
    }),
  ];
}

export async function toggleSavedContent(kind: SavedContentKind, id: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to save this item.', supported: false };

  if (kind === 'event') {
    const existing = await safeMaybe<any>(
      (supabase as any)
        .from('event_rsvps')
        .select('id,status')
        .eq('user_id', userId)
        .eq('event_id', id)
        .maybeSingle(),
    );
    const nextStatus = existing?.status === 'interested' || existing?.status === 'going' ? 'cancelled' : 'interested';
    const result = await setEventRsvp(id, nextStatus);
    return result.success
      ? { success: true, saved: nextStatus !== 'cancelled', supported: true }
      : { success: false, error: result.error, supported: true };
  }

  if (kind === 'community') {
    const existing = await safeMaybe<any>(
      (supabase as any)
        .from('community_members')
        .select('id,status')
        .eq('user_id', userId)
        .eq('community_id', id)
        .maybeSingle(),
    );
    const result = existing?.status === 'active' ? await leaveBackstage(id) : await joinBackstage(id);
    return result.success
      ? { success: true, saved: existing?.status !== 'active', supported: true }
      : { success: false, error: result.error, supported: true };
  }

  if (kind === 'profile') {
    return toggleProfileFollow(id);
  }

  if (kind !== 'beat' && kind !== 'release') {
    return toggleGenericSavedContent(kind, id);
  }

  const column = kind === 'beat' ? 'beat_id' : 'release_id';
  const existing = await safeMaybe<any>(
    (supabase as any).from('favorites').select('id').eq('user_id', userId).eq(column, id).maybeSingle(),
  );
  if (existing?.id) {
    const { error } = await (supabase as any).from('favorites').delete().eq('id', existing.id);
    return error ? { success: false, error: error.message, supported: true } : { success: true, saved: false, supported: true };
  }

  const { error } = await (supabase as any).from('favorites').insert({ user_id: userId, [column]: id });
  return error ? { success: false, error: error.message, supported: true } : { success: true, saved: true, supported: true };
}

export async function loadLibraryBundle(): Promise<LibraryBundle> {
  const userId = await getCurrentUserId();
  if (!userId) return { saved: [], purchases: [], tickets: [], entitlements: [] };
  const [favorites, genericSaved, eventRsvps, memberships, follows, releasePurchases, samplePackPurchases, tickets] = await Promise.all([
    safeList<any>((supabase as any).from('favorites').select('id,beat_id,release_id,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(50)),
    safeList<any>((supabase as any).from('saved_content').select('id,content_type,content_id,metadata,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(100)),
    safeList<any>((supabase as any).from('event_rsvps').select('id,event_id,status,created_at,updated_at').eq('user_id', userId).in('status', ['interested', 'going']).order('updated_at', { ascending: false }).limit(50)),
    safeList<any>((supabase as any).from('community_members').select('id,community_id,status,joined_at,last_active_at').eq('user_id', userId).eq('status', 'active').order('last_active_at', { ascending: false }).limit(50)),
    safeList<any>((supabase as any).from('user_follows').select('id,following_id,created_at').eq('follower_id', userId).order('created_at', { ascending: false }).limit(50)),
    safeList<any>((supabase as any).from('release_purchases').select('id,release_id,status,amount_paid,purchased_at').or(`user_id.eq.${userId},purchaser_id.eq.${userId}`).order('purchased_at', { ascending: false }).limit(50)),
    safeList<any>((supabase as any).from('sample_pack_purchases').select('id,sample_pack_id,amount_paid,purchased_at,download_url').eq('user_id', userId).order('purchased_at', { ascending: false }).limit(50)),
    loadWalletTickets(),
  ]);

  const genericByType = genericSaved.reduce<Record<string, any[]>>((groups, item) => {
    const type = String(item.content_type || '');
    if (!groups[type]) groups[type] = [];
    groups[type].push(item);
    return groups;
  }, {});

  const beatIds = Array.from(new Set([...favorites.map((item) => item.beat_id).filter(Boolean), ...(genericByType.beat ?? []).map((item) => item.content_id).filter(Boolean)]));
  const favoriteReleaseIds = favorites.map((item) => item.release_id).filter(Boolean);
  const releaseIds = Array.from(new Set([...favoriteReleaseIds, ...releasePurchases.map((item) => item.release_id).filter(Boolean)]));
  const genericReleaseIds = Array.from(new Set([...(genericByType.release ?? []).map((item) => item.content_id).filter(Boolean), ...(genericByType.mix ?? []).map((item) => item.content_id).filter(Boolean)]));
  const packIds = samplePackPurchases.map((item) => item.sample_pack_id).filter(Boolean);
  const genericPackIds = (genericByType.sample_pack ?? []).map((item) => item.content_id).filter(Boolean);
  const videoIds = (genericByType.video ?? []).map((item) => item.content_id).filter(Boolean);
  const eventIds = Array.from(new Set([...eventRsvps.map((item) => item.event_id).filter(Boolean), ...(genericByType.event ?? []).map((item) => item.content_id).filter(Boolean)]));
  const communityIds = Array.from(new Set([...memberships.map((item) => item.community_id).filter(Boolean), ...(genericByType.community ?? []).map((item) => item.content_id).filter(Boolean)]));
  const followedIds = Array.from(new Set([...follows.map((item) => item.following_id).filter(Boolean), ...(genericByType.profile ?? []).map((item) => item.content_id).filter(Boolean)]));

  const [beats, releases, genericReleases, samplePacks, genericSamplePacks, videos, events, communities, profiles] = await Promise.all([
    beatIds.length
      ? safeList<BeatItem>((supabase as any).from('beats').select('id,title,producer_name,image_url,audio_url,tagged_url,genre,bpm,key,price,description,moods,tags,license_prices,available_licenses,created_at').in('id', beatIds))
      : Promise.resolve([]),
    releaseIds.length
      ? safeList<ReleaseItem>(supabase.from('releases').select('id,title,artist,cover_art_url,preview_url,download_url,genre,price,download_price,minimum_price,created_at').in('id', releaseIds))
      : Promise.resolve([]),
    genericReleaseIds.length
      ? safeList<ReleaseItem>(supabase.from('releases').select('id,title,artist,cover_art_url,preview_url,download_url,genre,price,download_price,minimum_price,created_at').in('id', genericReleaseIds))
      : Promise.resolve([]),
    packIds.length
      ? safeList<SamplePackItem>((supabase as any).from('sample_packs').select('id,title,description,cover_art_url,preview_url,download_url,genre,bpm_range,price,sample_count,tags,total_downloads,created_at').in('id', packIds))
      : Promise.resolve([]),
    genericPackIds.length
      ? safeList<SamplePackItem>((supabase as any).from('sample_packs').select('id,title,description,cover_art_url,preview_url,download_url,genre,bpm_range,price,sample_count,tags,total_downloads,created_at').in('id', genericPackIds))
      : Promise.resolve([]),
    videoIds.length
      ? safeList<any>((supabase as any).from('videos').select('id,title,description,thumbnail_url,youtube_url,artist_id,created_at').in('id', videoIds))
      : Promise.resolve([]),
    eventIds.length
      ? safeList<EventItem>(supabase.from('events').select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at').in('id', eventIds))
      : Promise.resolve([]),
    communityIds.length
      ? safeList<any>((supabase as any).from('communities').select('id,creator_id,name,slug,description,tagline,avatar_url,banner_url,cover_image_url,visibility,join_policy,status,is_primary,member_count,created_at,updated_at').in('id', communityIds))
      : Promise.resolve([]),
    followedIds.length
      ? safeList<ProfileItem>((supabase as any).from('profiles').select('id,user_id,username,full_name,avatar_url,bio,profile_type,user_type,is_creator,is_verified,city').in('user_id', followedIds))
      : Promise.resolve([]),
  ]);

  const beatById = new Map(beats.map((item) => [item.id, item]));
  const releaseById = new Map(releases.map((item) => [item.id, item]));
  const genericReleaseById = new Map(genericReleases.map((item) => [item.id, item]));
  const packById = new Map(samplePacks.map((item) => [item.id, item]));
  const genericPackById = new Map(genericSamplePacks.map((item) => [item.id, item]));
  const videoById = new Map(videos.map((item) => [item.id, item]));
  const eventById = new Map(events.map((item) => [item.id, item]));
  const communityById = new Map(communities.map((item) => [item.id, item]));
  const profileById = new Map(profiles.map((item) => [item.user_id, item]));

  const saved = [
    ...favorites
    .map<SavedContentItem | null>((favorite) => {
      if (favorite.beat_id) {
        const beat = beatById.get(favorite.beat_id);
        return {
          id: favorite.id,
          kind: 'beat',
          title: beat?.title || 'Saved beat',
          subtitle: beat?.producer_name || 'Beat',
          imageUrl: beat?.image_url,
          route: `/beat/${favorite.beat_id}`,
          source: 'favorites',
        };
      }
      if (favorite.release_id) {
        const release = releaseById.get(favorite.release_id);
        return {
          id: favorite.id,
          kind: 'release',
          title: release?.title || 'Saved release',
          subtitle: release?.artist || 'Release',
          imageUrl: release?.cover_art_url,
          route: `/release/${favorite.release_id}`,
          source: 'favorites',
        };
      }
      return null;
    })
      .filter((item): item is SavedContentItem => item != null),
    ...eventRsvps.map<SavedContentItem>((rsvp) => {
      const event = eventById.get(rsvp.event_id);
      return {
        id: rsvp.id,
        kind: 'event',
        title: event?.title || 'Saved event',
        subtitle: event?.location || rsvp.status || 'Event',
        imageUrl: event?.cover_image_url,
        route: `/events/${rsvp.event_id}`,
        source: 'event_rsvps',
      };
    }),
    ...memberships.map<SavedContentItem>((membership) => {
      const community = communityById.get(membership.community_id);
      return {
        id: membership.id,
        kind: 'community',
        title: community ? communityTitle(community) : 'Joined Community',
        subtitle: community?.tagline || community?.description || 'Community',
        imageUrl: community?.avatar_url || community?.banner_url || community?.cover_image_url,
        route: `/backstage/${membership.community_id}`,
        source: 'community_members',
      };
    }),
    ...follows.map<SavedContentItem>((follow) => {
      const profile = profileById.get(follow.following_id);
      return {
        id: follow.id,
        kind: 'profile',
        title: profile?.display_name || profile?.full_name || profile?.username || 'Followed creator',
        subtitle: profile?.username ? `@${profile.username}` : profile?.user_type || 'Creator',
        imageUrl: profile?.avatar_url,
        route: profile?.username ? `/creator/${profile.username}` : `/profile/${follow.following_id}`,
        source: 'user_follows',
      };
    }),
    ...genericSaved.map<SavedContentItem>((item) => {
      const kind = item.content_type as SavedContentKind;
      if (kind === 'release' || kind === 'mix') {
        const release = genericReleaseById.get(item.content_id);
        return {
          id: item.id,
          kind,
          title: release?.title || item.metadata?.title || (kind === 'mix' ? 'Saved mix' : 'Saved release'),
          subtitle: release?.artist || item.metadata?.subtitle || (kind === 'mix' ? 'Mix' : 'Release'),
          imageUrl: release?.cover_art_url || item.metadata?.imageUrl,
          route: `/release/${item.content_id}`,
          source: 'saved_content',
        };
      }
      if (kind === 'beat') {
        const beat = beatById.get(item.content_id);
        return {
          id: item.id,
          kind,
          title: beat?.title || item.metadata?.title || 'Saved beat',
          subtitle: beat?.producer_name || item.metadata?.subtitle || 'Beat',
          imageUrl: beat?.image_url || item.metadata?.imageUrl,
          route: `/beat/${item.content_id}`,
          source: 'saved_content',
        };
      }
      if (kind === 'sample_pack') {
        const pack = genericPackById.get(item.content_id);
        return {
          id: item.id,
          kind,
          title: pack?.title || item.metadata?.title || 'Saved sample pack',
          subtitle: pack?.genre || item.metadata?.subtitle || 'Sample pack',
          imageUrl: pack?.cover_art_url || item.metadata?.imageUrl,
          route: `/sample-pack/${item.content_id}`,
          source: 'saved_content',
        };
      }
      if (kind === 'video') {
        const video = videoById.get(item.content_id);
        return {
          id: item.id,
          kind,
          title: video?.title || item.metadata?.title || 'Saved video',
          subtitle: item.metadata?.subtitle || 'Video',
          imageUrl: video?.thumbnail_url || item.metadata?.imageUrl,
          route: `/search`,
          source: 'saved_content',
        };
      }
      if (kind === 'event') {
        const event = eventById.get(item.content_id);
        return {
          id: item.id,
          kind,
          title: event?.title || item.metadata?.title || 'Saved event',
          subtitle: event?.location || item.metadata?.subtitle || 'Event',
          imageUrl: event?.cover_image_url || item.metadata?.imageUrl,
          route: `/events/${item.content_id}`,
          source: 'saved_content',
        };
      }
      if (kind === 'community') {
        const community = communityById.get(item.content_id);
        return {
          id: item.id,
          kind,
          title: community ? communityTitle(community) : item.metadata?.title || 'Saved Community',
          subtitle: community?.tagline || community?.description || item.metadata?.subtitle || 'Community',
          imageUrl: community?.avatar_url || community?.banner_url || community?.cover_image_url || item.metadata?.imageUrl,
          route: `/backstage/${item.content_id}`,
          source: 'saved_content',
        };
      }
      if (kind === 'profile') {
        const profile = profileById.get(item.content_id);
        return {
          id: item.id,
          kind,
          title: profile?.display_name || profile?.full_name || profile?.username || item.metadata?.title || 'Saved creator',
          subtitle: profile?.username ? `@${profile.username}` : item.metadata?.subtitle || 'Creator',
          imageUrl: profile?.avatar_url || item.metadata?.imageUrl,
          route: profile?.username ? `/creator/${profile.username}` : `/profile/${item.content_id}`,
          source: 'saved_content',
        };
      }
      return {
        id: item.id,
        kind,
        title: item.metadata?.title || `Saved ${kind.replace('_', ' ')}`,
        subtitle: item.metadata?.subtitle || 'Saved',
        imageUrl: item.metadata?.imageUrl,
        route: '/favorites',
        source: 'saved_content',
      };
    }),
  ];

  const purchases = [
    ...releasePurchases.map<SavedContentItem>((purchase) => {
      const release = releaseById.get(purchase.release_id);
      return {
        id: purchase.id,
        kind: 'release',
        title: release?.title || 'Purchased release',
        subtitle: release?.artist || purchase.status || 'Release',
        imageUrl: release?.cover_art_url,
        route: `/release/${purchase.release_id}`,
        source: 'release_purchases',
      };
    }),
    ...samplePackPurchases.map<SavedContentItem>((purchase) => {
      const pack = packById.get(purchase.sample_pack_id);
      return {
        id: purchase.id,
        kind: 'sample_pack',
        title: pack?.title || 'Sample pack',
        subtitle: pack?.genre || 'Sample pack',
        imageUrl: pack?.cover_art_url,
        route: `/sample-pack/${purchase.sample_pack_id}`,
        source: 'sample_pack_purchases',
      };
    }),
  ];

  const entitlements = [
    ...purchases.map<WalletEntitlementItem>((item) => ({
      id: item.id,
      kind: item.kind === 'sample_pack' ? 'sample_pack' : 'release',
      title: item.title,
      status: 'available',
      route: item.route,
    })),
    ...tickets.map<WalletEntitlementItem>((ticket) => ({
      id: ticket.id,
      kind: 'ticket',
      title: ticket.event_title,
      status: ticket.status,
      route: `/events/${ticket.event_id}`,
    })),
  ];

  return { saved, purchases, tickets, entitlements };
}

export async function loadRecentlyPlayedLibraryItems(limit = 12): Promise<SavedContentItem[]> {
  const userId = await getCurrentUserId();
  if (!userId) return [];

  const plays = await safeList<any>(
    (supabase as any)
      .from('release_plays')
      .select('id,release_id,track_id,played_at')
      .eq('user_id', userId)
      .order('played_at', { ascending: false })
      .limit(limit),
  );
  if (!plays.length) return [];

  const releaseIds = Array.from(new Set(plays.map((play) => play.release_id).filter(Boolean)));
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
  for (const track of tracks) {
    if (track.release_id) releaseIds.push(track.release_id);
  }

  const releases = releaseIds.length
    ? await safeList<ReleaseItem>(
        supabase
          .from('releases')
          .select('id,title,artist,cover_art_url,preview_url,download_url,genre,price,download_price,minimum_price,created_at')
          .in('id', Array.from(new Set(releaseIds))),
      )
    : [];
  const releaseById = new Map(releases.map((release) => [release.id, release]));

  return plays
    .map<SavedContentItem | null>((play) => {
      const track = play.track_id ? trackById.get(play.track_id) : null;
      const releaseId = play.release_id || track?.release_id;
      const release = releaseId ? releaseById.get(releaseId) : null;
      if (!releaseId && !track?.id) return null;
      return {
        id: play.id,
        kind: 'release',
        title: track?.title || release?.title || 'Recently played',
        subtitle: release?.artist || 'Recently played',
        imageUrl: release?.cover_art_url,
        route: releaseId ? `/release/${releaseId}` : '/library',
        source: 'release_plays',
      };
    })
    .filter((item): item is SavedContentItem => item != null);
}

export async function loadPostDetail(postId: string): Promise<SocialPostDetail> {
  const detail = await loadThreadDetail(postId);
  const post = detail.post;
  return {
    post,
    threadPosts: detail.threadPosts,
    comments: detail.comments,
    liked: Boolean(post?.liked),
    bookmarked: Boolean(post?.bookmarked),
    reposted: Boolean(post?.reposted),
  };
}

export async function toggleLike(postId: string) {
  return toggleSocialLike(postId);
}

export async function addComment(postId: string, content: string) {
  return addSocialComment(postId, content);
}

export async function createSocialPost(input: {
  content: string;
  title?: string | null;
  postType?: string | null;
  communityId?: string | null;
  destinations?: Array<{ destination_type: any; destination_id: string }>;
  quotePostId?: string | null;
  poll?: MobilePollState | null;
  images?: string[];
  video?: string | null;
  audio?: string | null;
  audioDuration?: number | null;
  linkPreview?: Record<string, unknown> | null;
}) {
  const destinations = input.destinations?.length
    ? input.destinations
    : input.communityId
      ? [{ destination_type: 'creator_community', destination_id: input.communityId }]
      : undefined;
  return createMobileSocialPost({
    content: input.title ? `${input.title.trim()}\n\n${input.content}` : input.content,
    postType: input.postType === 'thread' ? 'discussion' : input.postType,
    destinations,
    originalPostId: input.quotePostId || null,
    isQuote: Boolean(input.quotePostId),
    poll: input.poll || null,
    images: input.images,
    video: input.video,
    audio: input.audio,
    audioDuration: input.audioDuration,
    linkPreview: input.linkPreview,
  });
}

export async function loadCreatorModePulse(userId: string): Promise<CreatorModePulse> {
  const [followers, posts, memberships, rooms, tickets, ledger, metrics] = await Promise.all([
    (supabase as any).from('user_follows').select('id', { count: 'exact', head: true }).eq('following_id', userId),
    safeList<SocialPostItem>((supabase as any).from('social_posts').select('id,content,title,comments_count,reposts_count,likes_count,user_id,created_at').eq('user_id', userId).order('created_at', { ascending: false }).limit(30)),
    (supabase as any).from('community_members').select('id', { count: 'exact', head: true }).eq('user_id', userId).eq('status', 'active'),
    (supabase as any).from('session_rooms').select('id', { count: 'exact', head: true }).eq('host_id', userId).in('status', ['live', 'scheduled']),
    (supabase as any).from('event_tickets').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    safeList<any>((supabase as any).from('wallet_ledger').select('id,kind,amount_credits,created_at').eq('counterparty_user_id', userId).order('created_at', { ascending: false }).limit(20)),
    safeList<any>((supabase as any).from('creator_metrics').select('post_comments,post_likes,comments_count,likes_count,sales_count,sales_revenue_cents').eq('creator_id', userId).order('metric_date', { ascending: false }).limit(1)),
  ]);

  const comments = posts.reduce((sum, post) => sum + Number(post.comments_count ?? 0), 0) + Number(metrics[0]?.post_comments ?? metrics[0]?.comments_count ?? 0);
  const reposts = posts.reduce((sum, post) => sum + Number(post.reposts_count ?? 0), 0);
  const gifts = ledger.filter((entry) => /gift|tip|support/i.test(String(entry.kind))).length;

  return {
    followers: followers.count ?? 0,
    mentions: 0,
    comments,
    reposts,
    communityActivity: memberships.count ?? 0,
    liveActivity: rooms.count ?? 0,
    ticketSummary: tickets.count ?? 0,
    latestPurchases: Number(metrics[0]?.sales_count ?? 0),
    gifts,
  };
}

function routeForNotificationData(row: any) {
  const relatedId = row.related_id || row.target_id || row.entity_id || row.data?.id || null;
  const relatedType = String(row.related_type || row.target_type || row.entity_type || row.type || '').toLowerCase();
  if (!relatedId) return null;
  if (relatedType.includes('event') || relatedType.includes('ticket')) return `/events/${relatedId}`;
  if (relatedType.includes('release') || relatedType.includes('track')) return `/release/${relatedId}`;
  if (relatedType.includes('community') || relatedType.includes('backstage') || relatedType.includes('hub')) return `/backstage/${relatedId}`;
  if (relatedType.includes('board')) return `/community/boards/${relatedId}`;
  if (relatedType.includes('post') || relatedType.includes('thread')) return `/post/${relatedId}`;
  if (relatedType.includes('beat')) return `/beat/${relatedId}`;
  if (relatedType.includes('sample')) return `/sample-pack/${relatedId}`;
  if (relatedType.includes('soundboard')) return `/soundboards/${relatedId}`;
  if (relatedType.includes('live') || relatedType.includes('room')) return `/live/session?roomId=${relatedId}`;
  return null;
}

export async function loadMobileNotifications(limit = 40): Promise<MobileNotification[]> {
  const rpc = await (supabase as any).rpc('notifications_list_recent', { p_limit: limit });
  const rows = !rpc.error && Array.isArray(rpc.data)
    ? rpc.data
    : await safeList<any>(
        (supabase as any)
          .from('notifications')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(limit),
      );
  return rows.map((row: any) => ({
    id: row.id,
    type: row.type || row.notification_type || null,
    title: row.title || row.heading || 'Activity',
    body: row.message || row.body || row.content || null,
    data: row.data || row.payload || null,
    read_at: row.read_at || null,
    created_at: row.created_at || null,
    route: routeForNotificationData(row),
  }));
}

export async function markMobileNotificationRead(notificationId: string) {
  const rpc = await (supabase as any).rpc('notifications_mark_read', { p_notification_id: notificationId });
  if (!rpc.error) return { success: true };
  const { error } = await (supabase as any).from('notifications').update({ read_at: new Date().toISOString() }).eq('id', notificationId);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function loadInboxThreads(limit = 30): Promise<InboxThread[]> {
  const rows = await safeList<any>(
    (supabase as any)
      .from('conversation_threads')
      .select('*')
      .order('updated_at', { ascending: false })
      .limit(limit),
  );
  return rows.map((row) => ({
    id: row.id,
    title: row.title || row.participant_name || 'Conversation',
    participant_count: row.participant_count ?? null,
    unread_count: row.unread_count ?? null,
    last_message: row.last_message || row.preview || null,
    updated_at: row.updated_at || row.created_at || null,
    route: `/inbox/${row.id}`,
  }));
}

export async function registerPushToken(token: string): Promise<PushRegistrationState> {
  const userId = await getCurrentUserId();
  if (!userId) return { supported: true, registered: false, token, error: 'Sign in to register this device.' };
  const { error } = await (supabase as any)
    .from('push_tokens')
    .upsert({ user_id: userId, token, platform: 'ios', updated_at: new Date().toISOString() }, { onConflict: 'user_id,token' });
  return error
    ? { supported: false, registered: false, token, error: 'Notifications could not be enabled right now.' }
    : { supported: true, registered: true, token };
}

export async function loadUnreadNotifications() {
  const count = await (supabase as any).rpc('notifications_unread_count');
  return typeof count.data === 'number' ? count.data : 0;
}

export async function loadFanIdentitySummary(userId?: string | null): Promise<FanIdentitySummary | null> {
  const targetUserId = userId || (await getCurrentUserId());
  if (!targetUserId) return null;
  const [badgeRows, rewardRows, memberships, ticketRows, challengeVotes] = await Promise.all([
    Promise.resolve([] as any[]),
    Promise.resolve([] as any[]),
    loadMemberships(targetUserId),
    safeList<any>((supabase as any).from('ticket_orders').select('event_id,status,created_at').eq('user_id', targetUserId).limit(40)),
    safeList<ChallengeVoteState>((supabase as any).from('challenge_votes').select('*').eq('voter_id', targetUserId).limit(40)),
  ]);
  const [communityRows, eventRows] = await Promise.all([
    memberships.length
      ? safeList<any>((supabase as any).from('communities').select('*').in('id', memberships.map((item) => item.community_id)))
      : Promise.resolve([]),
    ticketRows.length
      ? safeList<EventItem>(
          supabase
            .from('events')
            .select('id,title,description,cover_image_url,location,starts_at,ends_at,price_cents,rsvp_count,stream_url,playback_url,created_at')
            .in('id', ticketRows.map((row) => row.event_id).filter(Boolean)),
        )
      : Promise.resolve([]),
  ]);
  const membershipByCommunity = new Map(memberships.map((item) => [item.community_id, item]));
  return {
    user_id: targetUserId,
    badges: badgeRows.map((row) => ({ id: row.id, title: row.title || row.badge_name || 'Badge', image_url: row.image_url || null, awarded_at: row.awarded_at || row.created_at || null })),
    rewards: rewardRows.map((row) => ({ id: row.id, title: row.title || row.reward_name || 'Reward', description: row.description || null, status: row.status || null })),
    joinedCommunities: communityRows.map((row) => mapCommunity(row, membershipByCommunity.get(row.id) ?? null)),
    attendedEvents: eventRows,
    challengeVotes,
    leaderboardRank: null,
  };
}

export async function issueTicketEntryToken(ticketOrderId: string) {
  const { data, error } = await (supabase as any).rpc('issue_ticket_entry_token', {
    p_ticket_order_id: ticketOrderId,
  });
  if (error) return { success: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.payload) return { success: false, error: 'This ticket cannot generate an entry code right now.' };
  return {
    success: true,
    payload: row.payload as string,
    expiresAt: (row.expires_at as string | undefined) ?? null,
  };
}

export async function verifyTicketEntryToken(payload: string) {
  const { data, error } = await (supabase as any).rpc('verify_ticket_entry_token', {
    p_payload: payload,
  });
  if (error) return { success: false, error: error.message, valid: false };
  const row = Array.isArray(data) ? data[0] : data;
  return {
    success: true,
    valid: Boolean(row?.valid),
    reason: (row?.reason as string | undefined) ?? null,
    ticket: row,
  };
}

export async function createMobileClipRecord(input: {
  storagePath: string;
  caption?: string | null;
  communityId?: string | null;
  eventId?: string | null;
  roomId?: string | null;
  thumbnailPath?: string | null;
  durationSeconds?: number | null;
}) {
  const { data, error } = await (supabase as any).rpc('create_mobile_clip_record', {
    p_storage_path: input.storagePath,
    p_caption: input.caption ?? null,
    p_community_id: input.communityId ?? null,
    p_event_id: input.eventId ?? null,
    p_room_id: input.roomId ?? null,
    p_thumbnail_path: input.thumbnailPath ?? null,
    p_duration_seconds: input.durationSeconds ?? null,
  });
  if (error) return { success: false, error: error.message };
  return { success: true, clipId: data as string | null };
}

export { MOBILE_CAPABILITIES };
