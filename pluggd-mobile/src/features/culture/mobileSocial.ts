import { supabase } from '../../lib/supabase';
import type {
  BackstageBoard,
  BackstageBoardDetail,
  ComposerDestination,
  MobilePollState,
  MobileSocialComment,
  MobileSocialDestination,
  MobileSocialDestinationInput,
  MobileSocialPost,
  MobileSocialPostPreview,
  MobileThreadDetail,
  SocialDestinationType,
  SocialPostType,
} from './mobileTypes';

type SupabaseErrorLike = { code?: string; message?: string } | null | undefined;
type SocialPostRow = Record<string, any>;
type ProfileRow = { user_id: string; full_name: string | null; username: string | null; avatar_url: string | null };
type DestinationRow = { post_id: string; destination_type: string; destination_id: string; created_at?: string | null };
type InteractionRow = { post_id: string };
type PollVoteRow = { post_id: string; option_id: string };

export type MobileSocialFeedMode = 'for-you' | 'latest' | 'following' | 'backstage' | 'trending';

const VALID_POST_TYPES = new Set<SocialPostType>([
  'post',
  'discussion',
  'question',
  'beat_feedback',
  'track_feedback',
  'collab_request',
  'announcement',
  'challenge',
  'poll',
  'resource',
  'release',
  'beat',
  'mix',
  'event',
]);

const DESTINATION_TYPES = new Set<SocialDestinationType>([
  'global_feed',
  'board',
  'user_profile',
  'creator_community',
  'release',
  'beat',
  'mix',
  'event',
  'challenge',
]);

async function currentUserId() {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function isDuplicateError(error: SupabaseErrorLike) {
  return error?.code === '23505' || /duplicate key|unique constraint/i.test(error?.message || '');
}

async function safeList<T>(query: PromiseLike<{ data: unknown; error: SupabaseErrorLike }>, fallback: T[] = []) {
  const { data, error } = await query;
  if (error || !Array.isArray(data)) return fallback;
  return data as T[];
}

async function safeMaybe<T>(query: PromiseLike<{ data: unknown; error: SupabaseErrorLike }>, fallback: T | null = null) {
  const { data, error } = await query;
  if (error || !data || Array.isArray(data)) return fallback;
  return data as T;
}

function normalizePostType(value?: string | null): SocialPostType {
  if (value && VALID_POST_TYPES.has(value as SocialPostType)) return value as SocialPostType;
  return 'post';
}

function normalizeDestinationType(value?: string | null): SocialDestinationType | null {
  if (value && DESTINATION_TYPES.has(value as SocialDestinationType)) return value as SocialDestinationType;
  return null;
}

function normalizePoll(value: unknown): MobilePollState | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  return value as MobilePollState;
}

function cleanContent(value: string) {
  return value.trim().slice(0, 500);
}

function extractHashtags(content: string) {
  return Array.from(new Set((content.match(/#\w+/g) || []).map((tag) => tag.slice(1).toLowerCase())));
}

function extractMentions(content: string) {
  return Array.from(new Set((content.match(/@\w+/g) || []).map((mention) => mention.slice(1).toLowerCase())));
}

function defaultDestinations(userId: string): ComposerDestination[] {
  return [
    { destination_type: 'global_feed', destination_id: 'community', label: 'Community Feed' },
    { destination_type: 'user_profile', destination_id: userId, label: 'Profile' },
  ];
}

function dedupeDestinations(destinations: MobileSocialDestinationInput[]) {
  const seen = new Set<string>();
  return destinations.filter((destination) => {
    if (!normalizeDestinationType(destination.destination_type) || !destination.destination_id?.trim()) return false;
    const key = `${destination.destination_type}:${destination.destination_id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function buildDestinationMap(postIds: string[]) {
  const destinationMap = new Map<string, MobileSocialDestination[]>();
  const ids = Array.from(new Set(postIds.filter(Boolean)));
  if (!ids.length) return destinationMap;

  const rows = await safeList<DestinationRow>(
    (supabase as any)
      .from('social_post_destinations')
      .select('post_id,destination_type,destination_id,created_at')
      .in('post_id', ids),
  );

  const boardIds = Array.from(new Set(rows.filter((row) => row.destination_type === 'board').map((row) => row.destination_id)));
  const communityIds = Array.from(new Set(rows.filter((row) => row.destination_type === 'creator_community').map((row) => row.destination_id)));

  const [boards, communities] = await Promise.all([
    boardIds.length
      ? safeList<any>((supabase as any).from('community_boards').select('id,slug,name').in('id', boardIds))
      : Promise.resolve([]),
    communityIds.length
      ? safeList<any>((supabase as any).from('communities').select('id,slug,name').in('id', communityIds))
      : Promise.resolve([]),
  ]);

  const boardById = new Map(boards.map((board) => [board.id, board]));
  const communityById = new Map(communities.map((community) => [community.id, community]));

  for (const row of rows) {
    const type = normalizeDestinationType(row.destination_type);
    if (!type) continue;

    const existing = destinationMap.get(row.post_id) || [];
    let label = 'PLUGGD';
    let route: string | null = null;

    if (type === 'global_feed') {
      label = 'Community Feed';
      route = '/community';
    } else if (type === 'user_profile') {
      label = 'Profile';
    } else if (type === 'board') {
      const board = boardById.get(row.destination_id);
      label = board?.name || 'Community Board';
      route = board?.slug ? `/community/boards/${board.slug}` : null;
    } else if (type === 'creator_community') {
      const community = communityById.get(row.destination_id);
      label = community?.name || 'Creator Community';
      route = `/backstage/${community?.slug || row.destination_id}`;
    } else if (type === 'release') {
      label = 'Release';
      route = `/release/${row.destination_id}`;
    } else if (type === 'beat') {
      label = 'Beat';
      route = `/beat/${row.destination_id}`;
    } else if (type === 'mix') {
      label = 'Mix';
      route = `/mixes/${row.destination_id}`;
    } else if (type === 'event') {
      label = 'Event';
      route = `/events/${row.destination_id}`;
    } else if (type === 'challenge') {
      label = 'Challenge';
      route = '/community';
    }

    if (!existing.some((item) => item.destination_type === type && item.destination_id === row.destination_id)) {
      existing.push({ destination_type: type, destination_id: row.destination_id, label, route });
      destinationMap.set(row.post_id, existing);
    }
  }

  return destinationMap;
}

async function loadProfiles(userIds: string[]) {
  const ids = Array.from(new Set(userIds.filter(Boolean)));
  if (!ids.length) return new Map<string, ProfileRow>();
  const rows = await safeList<ProfileRow>(
    supabase
      .from('profiles')
      .select('user_id,full_name,username,avatar_url')
      .in('user_id', ids),
  );
  return new Map(rows.map((profile) => [profile.user_id, profile]));
}

async function loadInteractionSets(userId: string | null, postIds: string[]) {
  const empty = {
    liked: new Set<string>(),
    bookmarked: new Set<string>(),
    reposted: new Set<string>(),
    pollVotes: new Map<string, string>(),
  };
  if (!userId || postIds.length === 0) return empty;

  const ids = Array.from(new Set(postIds.filter(Boolean)));
  const [likes, bookmarks, reposts, pollVotes] = await Promise.all([
    safeList<InteractionRow>((supabase as any).from('social_likes').select('post_id').eq('user_id', userId).in('post_id', ids)),
    safeList<InteractionRow>((supabase as any).from('social_bookmarks').select('post_id').eq('user_id', userId).in('post_id', ids)),
    safeList<InteractionRow>((supabase as any).from('social_reposts').select('post_id').eq('user_id', userId).in('post_id', ids)),
    safeList<PollVoteRow>((supabase as any).from('social_poll_votes').select('post_id,option_id').eq('user_id', userId).in('post_id', ids)),
  ]);

  return {
    liked: new Set(likes.map((row) => row.post_id)),
    bookmarked: new Set(bookmarks.map((row) => row.post_id)),
    reposted: new Set(reposts.map((row) => row.post_id)),
    pollVotes: new Map(pollVotes.map((row) => [row.post_id, row.option_id])),
  };
}

function mapPostPreview(
  row: SocialPostRow,
  profile: ProfileRow | undefined,
  destinationMap: Map<string, MobileSocialDestination[]>,
  interactions: Awaited<ReturnType<typeof loadInteractionSets>>,
): MobileSocialPostPreview {
  const actionPostId = row.is_repost && row.original_post_id ? row.original_post_id : row.id;
  return {
    id: row.id,
    user_id: row.user_id,
    content: row.content || row.title || '',
    post_type: normalizePostType(row.post_type),
    destinations: destinationMap.get(row.id) || [],
    images: Array.isArray(row.images) ? row.images : [],
    video: row.video ?? null,
    audio: row.audio ?? null,
    audio_duration: Number(row.audio_duration ?? 0),
    gif: row.gif ?? null,
    link_preview: row.link_preview && typeof row.link_preview === 'object' ? row.link_preview : null,
    hashtags: Array.isArray(row.hashtags) ? row.hashtags : [],
    mentions: Array.isArray(row.mentions) ? row.mentions : [],
    poll: normalizePoll(row.poll),
    thread_id: row.thread_id ?? null,
    parent_id: row.parent_id ?? null,
    is_repost: Boolean(row.is_repost),
    is_quote: Boolean(row.is_quote),
    original_post_id: row.original_post_id ?? null,
    likes_count: Number(row.likes_count ?? 0),
    reposts_count: Number(row.reposts_count ?? 0),
    comments_count: Number(row.comments_count ?? 0),
    bookmarks_count: Number(row.bookmarks_count ?? 0),
    created_at: row.created_at || new Date().toISOString(),
    display_name: profile?.full_name || profile?.username || 'PLUGGD user',
    username: profile?.username || null,
    avatar_url: profile?.avatar_url || null,
    liked: interactions.liked.has(actionPostId),
    bookmarked: interactions.bookmarked.has(actionPostId),
    reposted: interactions.reposted.has(actionPostId),
    poll_vote_option_id: interactions.pollVotes.get(actionPostId) ?? null,
  };
}

async function enrichPosts(rows: SocialPostRow[], userId: string | null): Promise<MobileSocialPost[]> {
  if (!rows.length) return [];
  const originalIds = Array.from(new Set(rows.map((row) => row.original_post_id).filter(Boolean)));
  const originals = originalIds.length
    ? await safeList<SocialPostRow>((supabase as any).from('social_posts').select('*').in('id', originalIds))
    : [];

  const allRows = [...rows, ...originals];
  const profileMap = await loadProfiles(allRows.map((row) => row.user_id));
  const destinationMap = await buildDestinationMap(allRows.map((row) => row.id));
  const interactions = await loadInteractionSets(userId, allRows.map((row) => row.id));

  const originalMap = new Map<string, MobileSocialPostPreview>();
  for (const original of originals) {
    originalMap.set(original.id, mapPostPreview(original, profileMap.get(original.user_id), destinationMap, interactions));
  }

  return rows.map((row) => ({
    ...mapPostPreview(row, profileMap.get(row.user_id), destinationMap, interactions),
    original_post: row.original_post_id ? originalMap.get(row.original_post_id) ?? null : null,
  }));
}

async function postsByIds(postIds: string[]) {
  const ids = Array.from(new Set(postIds.filter(Boolean)));
  if (!ids.length) return [];
  const rows = await safeList<SocialPostRow>((supabase as any).from('social_posts').select('*').in('id', ids));
  const position = new Map(ids.map((id, index) => [id, index]));
  return rows.sort((a, b) => (position.get(a.id) ?? Number.MAX_SAFE_INTEGER) - (position.get(b.id) ?? Number.MAX_SAFE_INTEGER));
}

async function loadDestinationPostRows(destination: MobileSocialDestinationInput, limit: number) {
  const rows = await safeList<DestinationRow>(
    (supabase as any)
      .from('social_post_destinations')
      .select('post_id,destination_type,destination_id,created_at')
      .eq('destination_type', destination.destination_type)
      .eq('destination_id', destination.destination_id)
      .order('created_at', { ascending: false })
      .limit(limit),
  );
  return postsByIds(rows.map((row) => row.post_id));
}

async function loadBackstagePostRows(userId: string | null, limit: number) {
  if (!userId) return [];
  const memberships = await safeList<{ community_id: string }>(
    (supabase as any)
      .from('community_members')
      .select('community_id')
      .eq('user_id', userId)
      .in('status', ['active', 'pending', 'muted'])
      .limit(100),
  );
  const communityIds = memberships.map((row) => row.community_id).filter(Boolean);
  if (!communityIds.length) return [];
  const rows = await safeList<DestinationRow>(
    (supabase as any)
      .from('social_post_destinations')
      .select('post_id,destination_type,destination_id,created_at')
      .eq('destination_type', 'creator_community')
      .in('destination_id', communityIds)
      .order('created_at', { ascending: false })
      .limit(limit),
  );
  return postsByIds(rows.map((row) => row.post_id));
}

export async function loadMobileSocialFeed(options: {
  mode?: MobileSocialFeedMode;
  destination?: MobileSocialDestinationInput | null;
  hashtag?: string | null;
  focusPostId?: string | null;
  limit?: number;
} = {}) {
  const userId = await currentUserId();
  const mode = options.mode || 'for-you';
  const limit = options.limit ?? 20;
  let rows: SocialPostRow[] = [];

  if (options.destination) {
    rows = await loadDestinationPostRows(options.destination, limit);
  } else if ((mode === 'for-you' || mode === 'trending') && !options.hashtag) {
    const { data, error } = await (supabase as any).rpc('fn_for_you_feed', {
      p_user_id: userId,
      p_limit: limit,
      p_before: null,
    });
    rows = !error && Array.isArray(data) ? data : [];
  } else if (mode === 'following' && userId) {
    const follows = await safeList<{ following_id: string }>(
      (supabase as any).from('user_follows').select('following_id').eq('follower_id', userId),
    );
    const followingIds = follows.map((row) => row.following_id).filter(Boolean);
    rows = followingIds.length
      ? await safeList<SocialPostRow>(
          (supabase as any)
            .from('social_posts')
            .select('*')
            .is('parent_id', null)
            .is('community_id', null)
            .in('user_id', followingIds)
            .order('created_at', { ascending: false })
            .limit(limit),
        )
      : [];
  } else if (mode === 'backstage') {
    rows = await loadBackstagePostRows(userId, limit);
  }

  if (options.hashtag) {
    rows = await safeList<SocialPostRow>(
      (supabase as any)
        .from('social_posts')
        .select('*')
        .contains('hashtags', [options.hashtag.toLowerCase().replace(/^#/, '')])
        .is('parent_id', null)
        .order(mode === 'trending' ? 'engagement_score' : 'created_at', { ascending: false })
        .limit(limit),
    );
  }

  if (!rows.length && mode !== 'following' && !options.destination) {
    rows = await safeList<SocialPostRow>(
      (supabase as any)
        .from('social_posts')
        .select('*')
        .is('parent_id', null)
        .order('created_at', { ascending: false })
        .limit(limit),
    );
  }

  if (options.focusPostId && !rows.some((row) => row.id === options.focusPostId)) {
    const focused = await safeMaybe<SocialPostRow>(
      (supabase as any).from('social_posts').select('*').eq('id', options.focusPostId).maybeSingle(),
    );
    if (focused && !focused.parent_id) rows = [focused, ...rows];
  }

  return enrichPosts(rows.filter((row) => !row.parent_id), userId);
}

export async function loadThreadDetail(postId: string): Promise<MobileThreadDetail> {
  const userId = await currentUserId();
  const focused = await safeMaybe<SocialPostRow>((supabase as any).from('social_posts').select('*').eq('id', postId).maybeSingle());
  if (!focused) return { post: null, threadPosts: [], comments: [] };

  const threadId = focused.thread_id || focused.id;
  const threadRows = await safeList<SocialPostRow>(
    (supabase as any)
      .from('social_posts')
      .select('*')
      .or(`id.eq.${threadId},thread_id.eq.${threadId}`)
      .order('created_at', { ascending: true }),
    [focused],
  );
  const enrichedThread = await enrichPosts(threadRows.length ? threadRows : [focused], userId);
  const post = enrichedThread.find((item) => item.id === focused.id) ?? (await enrichPosts([focused], userId))[0] ?? null;
  const comments = await loadSocialComments(focused.id);
  return { post, threadPosts: enrichedThread, comments };
}

export async function loadSocialComments(postId: string): Promise<MobileSocialComment[]> {
  const rows = await safeList<any>(
    (supabase as any)
      .from('social_comments')
      .select('id,user_id,post_id,content,created_at')
      .eq('post_id', postId)
      .order('created_at', { ascending: true })
      .limit(120),
  );
  const profileMap = await loadProfiles(rows.map((row) => row.user_id));
  return rows.map((row) => {
    const profile = profileMap.get(row.user_id);
    return {
      id: row.id,
      user_id: row.user_id,
      post_id: row.post_id,
      content: row.content || '',
      created_at: row.created_at,
      display_name: profile?.full_name || profile?.username || 'PLUGGD user',
      username: profile?.username || null,
      avatar_url: profile?.avatar_url || null,
    };
  });
}

export async function addSocialComment(postId: string, content: string) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Sign in to reply.' };
  const body = cleanContent(content);
  if (!body) return { success: false, error: 'Write a reply first.' };
  const { error } = await (supabase as any).from('social_comments').insert({ post_id: postId, user_id: userId, content: body });
  return error ? { success: false, error: error.message } : { success: true };
}

export async function toggleSocialLike(postId: string) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Sign in to like posts.' };
  const existing = await safeMaybe<any>((supabase as any).from('social_likes').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle());
  if (existing?.id) {
    const { error } = await (supabase as any).from('social_likes').delete().eq('id', existing.id);
    return error ? { success: false, error: error.message } : { success: true, liked: false };
  }
  const { error } = await (supabase as any).from('social_likes').insert({ post_id: postId, user_id: userId });
  return error && !isDuplicateError(error) ? { success: false, error: error.message } : { success: true, liked: true };
}

export async function toggleSocialBookmark(postId: string) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Sign in to save posts.' };
  const existing = await safeMaybe<any>((supabase as any).from('social_bookmarks').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle());
  if (existing?.id) {
    const { error } = await (supabase as any).from('social_bookmarks').delete().eq('id', existing.id);
    return error ? { success: false, error: error.message } : { success: true, bookmarked: false };
  }
  const { error } = await (supabase as any).from('social_bookmarks').insert({ post_id: postId, user_id: userId });
  return error && !isDuplicateError(error) ? { success: false, error: error.message } : { success: true, bookmarked: true };
}

export async function toggleSocialRepost(postId: string) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Sign in to repost.' };
  const existing = await safeMaybe<any>((supabase as any).from('social_reposts').select('id').eq('post_id', postId).eq('user_id', userId).maybeSingle());
  if (existing?.id) {
    const { error } = await (supabase as any).from('social_reposts').delete().eq('id', existing.id);
    if (error) return { success: false, error: error.message };
    await (supabase as any).from('social_posts').delete().eq('user_id', userId).eq('is_repost', true).eq('original_post_id', postId);
    return { success: true, reposted: false };
  }

  const { error } = await (supabase as any).from('social_reposts').insert({ post_id: postId, user_id: userId });
  if (error && !isDuplicateError(error)) return { success: false, error: error.message };

  const existingRepost = await safeList<any>(
    (supabase as any)
      .from('social_posts')
      .select('id')
      .eq('user_id', userId)
      .eq('is_repost', true)
      .eq('original_post_id', postId)
      .limit(1),
  );
  if (!existingRepost.length) {
    const { error: repostPostError } = await (supabase as any).from('social_posts').insert({
      user_id: userId,
      content: '',
      post_type: 'post',
      images: [],
      video: null,
      audio: null,
      audio_duration: 0,
      gif: null,
      poll: null,
      hashtags: [],
      mentions: [],
      is_repost: true,
      original_post_id: postId,
    });
    if (repostPostError && !isDuplicateError(repostPostError)) return { success: false, error: repostPostError.message };
  }

  return { success: true, reposted: true };
}

export async function createMobileSocialPost(input: {
  content: string;
  postType?: SocialPostType | string | null;
  destinations?: MobileSocialDestinationInput[];
  images?: string[];
  video?: string | null;
  audio?: string | null;
  audioDuration?: number | null;
  gif?: string | null;
  poll?: MobilePollState | null;
  linkPreview?: Record<string, unknown> | null;
  isQuote?: boolean;
  originalPostId?: string | null;
}) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Sign in to create a post.' };
  const content = cleanContent(input.content);
  const hasPayload = Boolean(
    content ||
      input.images?.length ||
      input.video ||
      input.audio ||
      input.gif ||
      input.poll ||
      input.linkPreview ||
      input.originalPostId,
  );
  if (!hasPayload) return { success: false, error: 'Write something or attach media before posting.' };

  const postType = normalizePostType(input.postType);
  const scopedDestinations = input.destinations?.length ? input.destinations : [];
  const destinations = dedupeDestinations(scopedDestinations.length ? [...scopedDestinations, ...defaultDestinations(userId)] : defaultDestinations(userId));
  const communityDestination = destinations.find((destination) => destination.destination_type === 'creator_community');

  const { data, error } = await (supabase as any)
    .from('social_posts')
    .insert({
      user_id: userId,
      content,
      post_type: input.poll ? 'poll' : postType,
      images: input.images || [],
      video: input.video || null,
      audio: input.audio || null,
      audio_duration: input.audioDuration || 0,
      gif: input.gif || null,
      poll: input.poll || null,
      link_preview: input.linkPreview || null,
      hashtags: extractHashtags(content),
      mentions: extractMentions(content),
      is_repost: false,
      is_quote: Boolean(input.isQuote),
      original_post_id: input.originalPostId || null,
      community_id: communityDestination?.destination_id || null,
      community_visibility: communityDestination ? 'members' : 'public',
    })
    .select('id')
    .single();

  if (error) return { success: false, error: error.message };
  const postId = (data as { id?: string } | null)?.id;
  if (!postId) return { success: false, error: 'Post created but no id was returned.' };

  const destinationRows = destinations.map((destination) => ({
    post_id: postId,
    destination_type: destination.destination_type,
    destination_id: destination.destination_id,
  }));
  if (destinationRows.length) {
    const { error: destinationError } = await (supabase as any).from('social_post_destinations').insert(destinationRows);
    if (destinationError && input.destinations?.length) {
      await (supabase as any).from('social_posts').delete().eq('id', postId).eq('user_id', userId);
      return { success: false, error: destinationError.message };
    }
  }

  return { success: true, id: postId };
}

export async function createQuotePost(input: { content: string; originalPostId: string; destinations?: MobileSocialDestinationInput[] }) {
  return createMobileSocialPost({
    content: input.content,
    originalPostId: input.originalPostId,
    isQuote: true,
    destinations: input.destinations,
  });
}

export async function voteMobilePoll(postId: string, optionId: string) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Sign in to vote.' };
  const { data, error } = await (supabase as any).rpc('vote_social_poll', {
    p_post_id: postId,
    p_option_id: optionId,
  });
  if (error) return { success: false, error: error.message };
  const row = data && typeof data === 'object' ? data as any : {};
  return { success: true, poll: row.poll as MobilePollState | undefined, selectedOptionId: row.selected_option_id || optionId };
}

export async function loadCommunityBoards(): Promise<BackstageBoard[]> {
  const userId = await currentUserId();
  const [boards, memberships] = await Promise.all([
    safeList<any>(
      (supabase as any)
        .from('community_boards')
        .select('id,slug,name,description,category,icon,is_featured,sort_order')
        .eq('is_active', true)
        .order('sort_order', { ascending: true })
        .limit(80),
    ),
    userId
      ? safeList<any>((supabase as any).from('community_board_members').select('board_id').eq('user_id', userId).limit(200))
      : Promise.resolve([]),
  ]);
  const joined = new Set(memberships.map((row) => row.board_id));
  return boards.map((board) => ({
    id: board.id,
    slug: board.slug,
    name: board.name || 'Community Board',
    description: board.description || null,
    category: board.category || null,
    icon: board.icon || null,
    is_featured: board.is_featured ?? null,
    sort_order: board.sort_order ?? null,
    joined: joined.has(board.id),
    route: `/community/boards/${board.slug}`,
  }));
}

export async function loadCommunityBoardDetail(slug: string): Promise<BackstageBoardDetail> {
  const userId = await currentUserId();
  const board = await safeMaybe<any>(
    (supabase as any)
      .from('community_boards')
      .select('id,slug,name,description,category,icon,is_featured,sort_order')
      .eq('slug', slug)
      .eq('is_active', true)
      .maybeSingle(),
  );

  if (!board?.id) {
    return { board: null, member_count: 0, is_member: false, posts: [] };
  }

  const [countResult, membership, feed] = await Promise.all([
    (supabase as any)
      .from('community_board_members')
      .select('user_id', { count: 'exact', head: true })
      .eq('board_id', board.id),
    userId
      ? safeMaybe<any>(
          (supabase as any)
            .from('community_board_members')
            .select('board_id')
            .eq('board_id', board.id)
            .eq('user_id', userId)
            .maybeSingle(),
        )
      : Promise.resolve(null),
    loadBackstageDestinationFeed({ destination_type: 'board', destination_id: board.id }),
  ]);

  return {
    board: {
      id: board.id,
      slug: board.slug,
      name: board.name || 'Community Board',
      description: board.description || null,
      category: board.category || null,
      icon: board.icon || null,
      is_featured: board.is_featured ?? null,
      sort_order: board.sort_order ?? null,
      joined: Boolean(membership),
      route: `/community/boards/${board.slug}`,
    },
    member_count: Number(countResult?.count ?? 0),
    is_member: Boolean(membership),
    posts: feed.posts,
  };
}

export async function joinCommunityBoard(boardId: string) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Sign in to join this board.' };
  const { error } = await (supabase as any).from('community_board_members').insert({ board_id: boardId, user_id: userId });
  return error && !isDuplicateError(error) ? { success: false, error: error.message } : { success: true };
}

export async function leaveCommunityBoard(boardId: string) {
  const userId = await currentUserId();
  if (!userId) return { success: false, error: 'Sign in to leave this board.' };
  const { error } = await (supabase as any)
    .from('community_board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('user_id', userId);
  return error ? { success: false, error: error.message } : { success: true };
}

export async function loadBackstageDestinationFeed(destination: MobileSocialDestinationInput) {
  const userId = await currentUserId();
  const rows = await loadDestinationPostRows(destination, 40);
  return { destination, posts: await enrichPosts(rows, userId) };
}

export async function searchSocialContent(term: string) {
  const normalized = term.trim();
  if (normalized.length < 2) return { posts: [] as MobileSocialPost[], boards: [] as BackstageBoard[], hashtags: [] as string[] };
  const safeTerm = normalized.replace(/[%_]/g, '');
  const pattern = `%${safeTerm}%`;
  const userId = await currentUserId();

  const [postRows, hashtagRows, boards] = await Promise.all([
    safeList<SocialPostRow>(
      (supabase as any)
        .from('social_posts')
        .select('*')
        .or(`content.ilike.${pattern}`)
        .order('created_at', { ascending: false })
        .limit(16),
    ),
    safeList<any>(
      (supabase as any)
        .from('social_trending_hashtags')
        .select('tag,post_count')
        .ilike('tag', pattern.replace(/#/g, ''))
        .limit(12),
    ),
    loadCommunityBoards().then((items) =>
      items.filter((board) =>
        `${board.name} ${board.description || ''} ${board.category || ''} ${board.slug}`.toLowerCase().includes(safeTerm.toLowerCase()),
      ).slice(0, 12),
    ),
  ]);

  return {
    posts: await enrichPosts(postRows.filter((row) => !row.parent_id), userId),
    boards,
    hashtags: hashtagRows.map((row) => String(row.tag || '')).filter(Boolean),
  };
}
