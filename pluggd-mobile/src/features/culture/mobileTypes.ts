import type {
  BeatItem,
  EventItem,
  MixItem,
  ProfileItem,
  ReleaseItem,
  SamplePackItem,
  SocialPostItem,
} from '../../lib/mobileContent';

export type CultureTabKey = 'home' | 'stage' | 'live' | 'backstage' | 'my-pluggd';

export type BackstageMembership = {
  id: string;
  community_id: string;
  user_id: string;
  role: string;
  status: string;
  xp?: number | null;
  level?: number | null;
  joined_at?: string | null;
  last_active_at?: string | null;
};

export type SocialDestinationType =
  | 'global_feed'
  | 'board'
  | 'user_profile'
  | 'creator_community'
  | 'release'
  | 'beat'
  | 'mix'
  | 'event'
  | 'challenge';

export type SocialPostType =
  | 'post'
  | 'discussion'
  | 'question'
  | 'beat_feedback'
  | 'track_feedback'
  | 'collab_request'
  | 'announcement'
  | 'challenge'
  | 'poll'
  | 'resource'
  | 'release'
  | 'beat'
  | 'mix'
  | 'event';

export type MobileSocialDestinationInput = {
  destination_type: SocialDestinationType;
  destination_id: string;
};

export type MobileSocialDestination = MobileSocialDestinationInput & {
  label: string;
  route?: string | null;
};

export type MobilePollOption = {
  id: string;
  text: string;
  votes?: number;
};

export type MobilePollState = {
  question?: string;
  options?: MobilePollOption[];
  total_votes?: number;
  multiple_choice?: boolean;
};

export type MobileSocialPostPreview = {
  id: string;
  user_id: string;
  content: string;
  post_type: SocialPostType;
  destinations: MobileSocialDestination[];
  images: string[];
  video: string | null;
  audio: string | null;
  audio_duration: number;
  gif: string | null;
  link_preview: Record<string, unknown> | null;
  hashtags: string[];
  mentions: string[];
  poll: MobilePollState | null;
  thread_id: string | null;
  parent_id: string | null;
  is_repost: boolean;
  is_quote: boolean;
  original_post_id: string | null;
  likes_count: number;
  reposts_count: number;
  comments_count: number;
  bookmarks_count: number;
  created_at: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  liked?: boolean;
  bookmarked?: boolean;
  reposted?: boolean;
  poll_vote_option_id?: string | null;
};

export type MobileSocialPost = MobileSocialPostPreview & {
  original_post?: MobileSocialPostPreview | null;
};

export type MobileSocialComment = {
  id: string;
  user_id: string;
  post_id: string;
  content: string;
  created_at: string;
  display_name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
};

export type MobileThreadDetail = {
  post: MobileSocialPost | null;
  threadPosts: MobileSocialPost[];
  comments: MobileSocialComment[];
};

export type MobileSocialInteractionState = {
  liked: boolean;
  bookmarked: boolean;
  reposted: boolean;
  likes_count: number;
  bookmarks_count: number;
  reposts_count: number;
  comments_count: number;
};

export type BackstageBoard = {
  id: string;
  slug: string;
  name: string;
  description?: string | null;
  category?: string | null;
  icon?: string | null;
  is_featured?: boolean | null;
  sort_order?: number | null;
  joined?: boolean;
  route: string;
};

export type BackstageDestinationFeed = {
  destination: MobileSocialDestinationInput;
  posts: MobileSocialPost[];
};

export type BackstageBoardDetail = {
  board: BackstageBoard | null;
  member_count: number;
  is_member: boolean;
  posts: MobileSocialPost[];
};

export type ComposerDestination = MobileSocialDestinationInput & {
  label: string;
};

export type BackstageCommunity = {
  id: string;
  slug?: string | null;
  title: string;
  description?: string | null;
  cover_image_url?: string | null;
  avatar_url?: string | null;
  hub_type?: string | null;
  creator_id?: string | null;
  creator_name?: string | null;
  username?: string | null;
  member_count?: number | null;
  online_count?: number | null;
  is_verified?: boolean | null;
  last_activity_at?: string | null;
  membership?: BackstageMembership | null;
  source?: 'community' | 'hub';
};

export type BackstageThread = {
  id: string;
  slug?: string | null;
  title: string;
  body?: string | null;
  category?: string | null;
  author_name?: string | null;
  author_handle?: string | null;
  created_at?: string | null;
  like_count?: number | null;
  comment_count?: number | null;
  is_pinned?: boolean | null;
  is_locked?: boolean | null;
  attached_release_id?: string | null;
  attached_event_id?: string | null;
  community_id?: string | null;
  route?: string | null;
};

export type BackstageRoom = {
  id: string;
  community_id?: string | null;
  title: string;
  description?: string | null;
  status?: string | null;
  room_type?: string | null;
  active_users?: number | null;
  created_at?: string | null;
};

export type BackstageCommunityEvent = {
  id: string;
  community_id: string;
  title: string;
  description?: string | null;
  starts_at?: string | null;
  ends_at?: string | null;
  location?: string | null;
  event_type?: string | null;
  meeting_url?: string | null;
  replay_url?: string | null;
};

export type BackstageOverview = {
  communities: BackstageCommunity[];
  joinedCommunities: BackstageCommunity[];
  boards: BackstageBoard[];
  threads: BackstageThread[];
  rooms: BackstageRoom[];
  events: EventItem[];
  communityEvents: BackstageCommunityEvent[];
  moments: SocialPostItem[];
  challenges: BackstageThread[];
};

export type BackstageDetail = {
  community: BackstageCommunity | null;
  membership: BackstageMembership | null;
  boards: BackstageBoard[];
  posts: SocialPostItem[];
  socialPosts?: MobileSocialPost[];
  threads: BackstageThread[];
  rooms: BackstageRoom[];
  events: BackstageCommunityEvent[];
  soundboards: Array<{
    id: string;
    title: string;
    cover_image_url?: string | null;
    item_count?: number | null;
    created_at?: string | null;
  }>;
  drops: Array<ReleaseItem | BeatItem | MixItem>;
};

export type EventRsvpState = 'going' | 'interested' | 'cancelled' | 'none';

export type EventComment = {
  id: string;
  event_id: string;
  user_id: string;
  parent_id?: string | null;
  body: string;
  deleted_at?: string | null;
  created_at: string;
  author?: Pick<ProfileItem, 'user_id' | 'username' | 'full_name' | 'avatar_url'> | null;
};

export type EventCultureCard = EventItem & {
  rsvp_status?: EventRsvpState;
  has_ticket?: boolean;
  has_order?: boolean;
};

export type TicketWalletItem = {
  id: string;
  source: 'event_tickets' | 'ticket_orders';
  event_id: string;
  event_title: string;
  event_image_url?: string | null;
  venue?: string | null;
  starts_at?: string | null;
  status: string;
  ticket_type?: string | null;
  qr_code_data?: string | null;
};

export type SocialPostDetail = {
  post: MobileSocialPost | null;
  threadPosts?: MobileSocialPost[];
  comments: MobileSocialComment[];
  liked: boolean;
  bookmarked?: boolean;
  reposted?: boolean;
};

export type SocialEngagementState = {
  liked: boolean;
  like_count: number;
  comment_count: number;
  repost_count: number;
};

export type SavedContentKind =
  | 'release'
  | 'beat'
  | 'sample_pack'
  | 'mix'
  | 'playlist'
  | 'event'
  | 'community'
  | 'video'
  | 'profile'
  | 'live_room'
  | 'post'
  | 'soundboard';

export type SavedContentItem = {
  id: string;
  kind: SavedContentKind;
  title: string;
  subtitle?: string | null;
  imageUrl?: string | null;
  route: string;
  source:
    | 'favorites'
    | 'saved_content'
    | 'event_rsvps'
    | 'community_members'
    | 'user_follows'
    | 'release_purchases'
    | 'release_plays'
    | 'sample_pack_purchases'
    | 'ticket_orders'
    | 'local-unavailable';
};

export type StageMediaItem = {
  id: string;
  kind: 'release' | 'mix' | 'video' | 'playlist';
  title: string;
  creator: string;
  image_url?: string | null;
  audio_url?: string | null;
  genre?: string | null;
  city?: string | null;
  route: string;
  release?: ReleaseItem;
  mix?: MixItem;
};

export type LiveRoomItem = {
  id: string;
  source?: 'session_room' | 'live_session' | 'scheduled_session' | 'community_room';
  title: string | null;
  description?: string | null;
  status?: string | null;
  category?: string | null;
  viewer_count?: number | null;
  scheduled_for?: string | null;
  started_at?: string | null;
  replay_url?: string | null;
  thumbnail_url?: string | null;
  creator_id?: string | null;
  creator_name?: string | null;
  creator_username?: string | null;
  creator_avatar_url?: string | null;
  backstage_id?: string | null;
};

export type VideoItem = {
  id: string;
  title: string | null;
  description?: string | null;
  thumbnail_url?: string | null;
  youtube_url?: string | null;
  artist_id?: string | null;
  created_at?: string | null;
};

export type CreatorModePulse = {
  followers: number;
  mentions: number;
  comments: number;
  reposts: number;
  communityActivity: number;
  liveActivity: number;
  ticketSummary: number;
  latestPurchases: number;
  gifts: number;
};

export type WalletEntitlementItem = {
  id: string;
  kind: 'release' | 'beat' | 'sample_pack' | 'ticket' | 'credits';
  title: string;
  status: string;
  acquired_at?: string | null;
  route?: string | null;
};

export type StoryDestination = {
  type: 'global' | 'creator' | 'community' | 'event' | 'profile';
  id?: string | null;
  label?: string | null;
  route?: string | null;
};

export type MobileStory = {
  id: string;
  user_id: string;
  media_url?: string | null;
  thumbnail_url?: string | null;
  media_type?: 'image' | 'video' | 'audio' | 'text' | string | null;
  caption?: string | null;
  duration_seconds?: number | null;
  created_at?: string | null;
  expires_at?: string | null;
  viewed?: boolean;
  destination?: StoryDestination | null;
  author?: Pick<ProfileItem, 'user_id' | 'username' | 'full_name' | 'avatar_url'> | null;
};

export type MyPluggdHubStats = {
  members: number;
  active_week?: number | null;
  streak_days?: number | null;
  xp?: number | null;
  live_count: number;
  contest_count: number;
};

export type MyPluggdAnnouncement = {
  id?: string | null;
  text: string;
};

export type MyPluggdContest = {
  id: string;
  title: string;
  cover?: string | null;
  entrants?: number | null;
  ends_at?: string | null;
  route: string;
};

export type MyPluggdPrompt = {
  text: string;
  tag?: string | null;
  cta_text?: string | null;
  cta_route?: string | null;
};

export type MyPluggdRadio = {
  listeners: number;
  now?: {
    id: string;
    title: string;
    artist?: string | null;
    cover?: string | null;
    audio_url?: string | null;
  } | null;
};

export type MyPluggdHub = {
  stats: MyPluggdHubStats;
  announcements: MyPluggdAnnouncement[];
  contests: MyPluggdContest[];
  trending: Array<{ tag: string; count: number }>;
  prompt?: MyPluggdPrompt | null;
  radio?: MyPluggdRadio | null;
  events: EventItem[];
};

export type FanMapPlug = {
  id: string;
  display_name: string;
  city: string;
  country: string;
  lat: number;
  lng: number;
  message?: string | null;
  tip_amount?: number | null;
  creator_id?: string | null;
  user_id?: string | null;
  avatar_url?: string | null;
  username?: string | null;
  profile_slug?: string | null;
  is_creator?: boolean | null;
  is_featured?: boolean | null;
  created_at?: string | null;
};

export type FanMapContext = {
  plugs: FanMapPlug[];
  stats: {
    total: number;
    countries: number;
    featured: number;
  };
};

export type StoryViewerState = {
  stories: MobileStory[];
  activeIndex: number;
  canCreate: boolean;
  creationUnavailableReason?: string | null;
};

export type PlaylistTrack = {
  id: string;
  playlist_id: string;
  release_id?: string | null;
  beat_id?: string | null;
  mix_id?: string | null;
  position?: number | null;
  added_at?: string | null;
  title: string;
  creator?: string | null;
  image_url?: string | null;
  audio_url?: string | null;
  route: string;
};

export type MobilePlaylist = {
  id: string;
  slug?: string | null;
  name: string;
  description?: string | null;
  cover_url?: string | null;
  owner_id?: string | null;
  owner_name?: string | null;
  is_public?: boolean | null;
  visibility?: string | null;
  track_count?: number | null;
  follower_count?: number | null;
  followed?: boolean;
  route: string;
  tracks?: PlaylistTrack[];
};

export type PlaylistActionState = {
  supported: boolean;
  success: boolean;
  followed?: boolean;
  added?: boolean;
  playlist?: MobilePlaylist | null;
  error?: string | null;
};

export type LiveSessionChatMessage = {
  id: string;
  session_id?: string | null;
  room_id?: string | null;
  user_id: string;
  message: string;
  created_at: string;
  author?: Pick<ProfileItem, 'user_id' | 'username' | 'full_name' | 'avatar_url'> | null;
};

export type LiveReaction = {
  id: string;
  session_id?: string | null;
  room_id?: string | null;
  user_id: string;
  reaction: string;
  created_at: string;
};

export type LiveGift = {
  id: string;
  session_id?: string | null;
  room_id?: string | null;
  sender_id: string;
  recipient_id?: string | null;
  gift_type?: string | null;
  credits_amount?: number | null;
  created_at: string;
};

export type LiveRecording = {
  id: string;
  session_id?: string | null;
  room_id?: string | null;
  title?: string | null;
  thumbnail_url?: string | null;
  playback_url?: string | null;
  duration_seconds?: number | null;
  created_at?: string | null;
};

export type EventDiscussionThread = {
  event_id: string;
  comments: EventComment[];
  socialPosts: MobileSocialPost[];
  backstageRoute?: string | null;
};

export type EventAttendanceState = {
  event_id: string;
  rsvp_status: EventRsvpState;
  going_count?: number | null;
  online_count?: number | null;
  attendees: Array<Pick<ProfileItem, 'user_id' | 'username' | 'full_name' | 'avatar_url'>>;
};

export type VenueSummary = {
  id?: string | null;
  name?: string | null;
  city?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  route?: string | null;
};

export type PromoterSummary = {
  id?: string | null;
  name?: string | null;
  username?: string | null;
  avatar_url?: string | null;
  route?: string | null;
};

export type SoundboardItemDetail = {
  id: string;
  soundboard_id: string;
  item_type: 'audio' | 'note' | 'image' | 'link' | 'poll' | string;
  title?: string | null;
  description?: string | null;
  content_text?: string | null;
  media_url?: string | null;
  external_url?: string | null;
  duration_seconds?: number | null;
  plays_count?: number | null;
  likes_count?: number | null;
  comments_count?: number | null;
  reactions?: SoundboardItemReaction[];
  comments?: MobileSocialComment[];
};

export type SoundboardItemReaction = {
  id: string;
  soundboard_item_id: string;
  user_id: string;
  reaction_type: string;
  created_at?: string | null;
};

export type MobileNotification = {
  id: string;
  type?: string | null;
  title?: string | null;
  body?: string | null;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at?: string | null;
  route?: string | null;
};

export type InboxThread = {
  id: string;
  title: string;
  participant_count?: number | null;
  unread_count?: number | null;
  last_message?: string | null;
  updated_at?: string | null;
  route: string;
};

export type PushRegistrationState = {
  supported: boolean;
  registered: boolean;
  token?: string | null;
  error?: string | null;
};

export type StorefrontItem = {
  id: string;
  creator_id?: string | null;
  title: string;
  description?: string | null;
  image_url?: string | null;
  price_cents?: number | null;
  currency?: string | null;
  kind?: 'merch' | 'digital' | 'ticket' | 'membership' | 'tip' | string | null;
  route?: string | null;
  purchaseSupported: boolean;
};

export type CreatorSupportOption = {
  id: string;
  creator_id: string;
  title: string;
  description?: string | null;
  credits_amount?: number | null;
  price_cents?: number | null;
  route?: string | null;
  supported: boolean;
};

export type MembershipSummary = {
  id: string;
  creator_id?: string | null;
  title: string;
  description?: string | null;
  price_cents?: number | null;
  currency?: string | null;
  member_count?: number | null;
  is_member?: boolean;
  route?: string | null;
};

export type FanIdentitySummary = {
  user_id: string;
  badges: Array<{ id: string; title: string; image_url?: string | null; awarded_at?: string | null }>;
  rewards: Array<{ id: string; title: string; description?: string | null; status?: string | null }>;
  joinedCommunities: BackstageCommunity[];
  attendedEvents: EventItem[];
  challengeVotes: ChallengeVoteState[];
  leaderboardRank?: number | null;
};

export type ChallengeVoteState = {
  id: string;
  challenge_id: string;
  user_id: string;
  option_id?: string | null;
  entry_id?: string | null;
  created_at?: string | null;
};

export type CreatorProfileBundle = {
  profile: ProfileItem | null;
  followerCount: number;
  isFollowing: boolean;
  releases: ReleaseItem[];
  mixes: MixItem[];
  beats: BeatItem[];
  samplePacks: SamplePackItem[];
  soundboards: Array<{
    id: string;
    title: string;
    cover_image_url?: string | null;
    item_count?: number | null;
    created_at?: string | null;
  }>;
  events: EventItem[];
  liveRooms: LiveRoomItem[];
  communities: BackstageCommunity[];
  stories: MobileStory[];
  clips: VideoItem[];
  playlists: MobilePlaylist[];
  storefront: StorefrontItem[];
  memberships: MembershipSummary[];
};

export type CultureSearchResults = {
  creators: ProfileItem[];
  tracks: ReleaseItem[];
  mixes: MixItem[];
  beats: BeatItem[];
  videos: VideoItem[];
  events: EventItem[];
  communities: BackstageCommunity[];
  users: ProfileItem[];
  liveStreams: LiveRoomItem[];
  posts: MobileSocialPost[];
  boards: BackstageBoard[];
  hashtags: string[];
  playlists: MobilePlaylist[];
  stories: MobileStory[];
  storefront: StorefrontItem[];
  memberships: MembershipSummary[];
};

export type LibraryBundle = {
  saved: SavedContentItem[];
  purchases: SavedContentItem[];
  tickets: TicketWalletItem[];
  entitlements: WalletEntitlementItem[];
};
