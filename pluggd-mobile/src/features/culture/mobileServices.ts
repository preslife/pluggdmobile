import { supabase } from '../../lib/supabase';
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
  CreatorModePulse,
  EventComment,
  EventCultureCard,
  EventRsvpState,
  LibraryBundle,
  LiveRoomItem,
  SavedContentItem,
  SavedContentKind,
  SocialPostDetail,
  TicketWalletItem,
  WalletEntitlementItem,
} from './mobileTypes';

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

function looksUuid(value?: string | null) {
  return !!value && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function communityTitle(row: any) {
  return String(row.name || row.title || row.slug || 'Backstage');
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
    title: row.title || row.content || 'Backstage thread',
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
    active_users: row.participant_count ?? row.max_members ?? null,
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

function mapLiveRoom(row: any): LiveRoomItem {
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
    replay_url: row.replay_url ?? null,
    thumbnail_url: row.thumbnail_url ?? null,
    creator_id: row.host_id ?? row.creator_id ?? null,
    backstage_id: row.community_id ?? null,
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
        .select('id,title,description,status,viewer_count,scheduled_for,started_at,replay_url,thumbnail_url,creator_id')
        .in('status', ['live', 'scheduled', 'replay'])
        .order('started_at', { ascending: false })
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

  const merged = [...taggedSessionRooms, ...taggedLiveSessions, ...taggedScheduledSessions, ...taggedCommunityRooms].map(mapLiveRoom);
  const seen = new Set<string>();
  return merged.filter((room) => {
    if (!room.id || seen.has(room.id)) return false;
    seen.add(room.id);
    return true;
  });
}

export async function loadBackstageOverview(): Promise<BackstageOverview> {
  const userId = await getCurrentUserId();
  const memberships = await loadMemberships(userId);
  const membershipByCommunity = new Map(memberships.map((item) => [item.community_id, item]));

  const [bundle, communityRows, hubRows, threadRows, postRows, roomRows, communityEventRows, challengeRows] = await Promise.all([
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
        .select('id,content,title,user_id,images,video,audio,post_type,likes_count,reposts_count,comments_count,is_deleted,community_id,created_at')
        .eq('is_deleted', false)
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
      posts: [],
      threads: [],
      rooms: [],
      events: [],
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

  const [posts, rooms, events, challenges, dropsBundle] = await Promise.all([
    safeList<SocialPostItem>(
      (supabase as any)
        .from('social_posts')
        .select('id,content,title,user_id,images,video,audio,post_type,likes_count,reposts_count,comments_count,is_deleted,community_id,created_at')
        .eq('community_id', communityRow.id)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(50),
    ),
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
    loadFeedBundle(10),
  ]);

  const challengeThreads = challenges.map(mapThread);
  return {
    community: mapCommunity(communityRow, membership),
    membership,
    posts,
    threads: [...posts.map(mapThread), ...challengeThreads],
    rooms: rooms.map(mapRoom),
    events: events.map(mapCommunityEvent),
    drops: [...dropsBundle.releases, ...dropsBundle.beats, ...dropsBundle.mixes].slice(0, 12),
  };
}

export async function joinBackstage(communityId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to join this Backstage.' };
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
  if (!userId) return { success: false, error: 'Sign in to leave this Backstage.' };
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
      error: 'This content type needs the saved-content backend migration deployed before it can be saved.',
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
      ? safeList<ProfileItem>((supabase as any).from('profiles').select('id,user_id,username,full_name,display_name,avatar_url,bio,profile_type,user_type,is_creator,is_verified,city').in('user_id', followedIds))
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
        title: community ? communityTitle(community) : 'Joined Backstage',
        subtitle: community?.tagline || community?.description || 'Backstage community',
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
          title: community ? communityTitle(community) : item.metadata?.title || 'Saved Backstage',
          subtitle: community?.tagline || community?.description || item.metadata?.subtitle || 'Backstage community',
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

export async function loadPostDetail(postId: string): Promise<SocialPostDetail> {
  const userId = await getCurrentUserId();
  const [post, comments, like] = await Promise.all([
    safeMaybe<SocialPostItem>(
      (supabase as any)
        .from('social_posts')
        .select('id,content,title,user_id,images,video,audio,post_type,likes_count,reposts_count,comments_count,is_deleted,community_id,created_at')
        .eq('id', postId)
        .maybeSingle(),
    ),
    safeList<any>((supabase as any).from('comments').select('id,post_id,user_id,content,created_at').eq('post_id', postId).order('created_at', { ascending: false }).limit(100)),
    userId ? safeMaybe<any>((supabase as any).from('likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle()) : Promise.resolve(null),
  ]);
  return { post, comments, liked: !!like?.id };
}

export async function toggleLike(postId: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to like this post.' };
  const existing = await safeMaybe<any>((supabase as any).from('likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle());
  if (existing?.id) {
    const { error } = await (supabase as any).from('likes').delete().eq('id', existing.id);
    return error ? { success: false, error: error.message } : { success: true, liked: false };
  }
  const { error } = await (supabase as any).from('likes').insert({ post_id: postId, user_id: userId });
  return error ? { success: false, error: error.message } : { success: true, liked: true };
}

export async function addComment(postId: string, content: string) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to comment.' };
  const trimmed = content.trim();
  if (!trimmed) return { success: false, error: 'Write a comment first.' };
  const { error } = await (supabase as any).from('comments').insert({ post_id: postId, user_id: userId, content: trimmed });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function createSocialPost(input: {
  content: string;
  title?: string | null;
  postType?: string | null;
  communityId?: string | null;
}) {
  const userId = await getCurrentUserId();
  if (!userId) return { success: false, error: 'Sign in to create a post.' };
  const content = input.content.trim();
  if (!content) return { success: false, error: 'Write something before posting.' };

  const { data, error } = await (supabase as any)
    .from('social_posts')
    .insert({
      content,
      title: input.title?.trim() || null,
      post_type: input.postType || 'post',
      community_id: input.communityId || null,
      user_id: userId,
      is_deleted: false,
    })
    .select('id')
    .single();

  return error
    ? { success: false, error: error.message }
    : { success: true, id: (data as { id?: string } | null)?.id ?? null };
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

export async function loadUnreadNotifications() {
  const count = await (supabase as any).rpc('notifications_unread_count');
  return typeof count.data === 'number' ? count.data : 0;
}

export async function issueTicketEntryToken(ticketOrderId: string) {
  const { data, error } = await (supabase as any).rpc('issue_ticket_entry_token', {
    p_ticket_order_id: ticketOrderId,
  });
  if (error) return { success: false, error: error.message };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.payload) return { success: false, error: 'Ticket token was not returned by the backend.' };
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
