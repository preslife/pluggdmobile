import type {
  BeatItem,
  EventItem,
  MixItem,
  ProfileItem,
  ReleaseItem,
  SamplePackItem,
  SocialPostItem,
} from '../../lib/mobileContent';

export type CultureTabKey = 'home' | 'stage' | 'live' | 'backstage' | 'search';

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
  posts: SocialPostItem[];
  threads: BackstageThread[];
  rooms: BackstageRoom[];
  events: BackstageCommunityEvent[];
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
  post: SocialPostItem | null;
  comments: Array<{
    id: string;
    post_id: string;
    user_id: string;
    content: string;
    created_at: string;
  }>;
  liked: boolean;
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
};

export type LibraryBundle = {
  saved: SavedContentItem[];
  purchases: SavedContentItem[];
  tickets: TicketWalletItem[];
  entitlements: WalletEntitlementItem[];
};
