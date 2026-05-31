import type { BackstageBoard, MobileSocialPost } from '../culture/mobileTypes';
import type { ParityCard } from '../parity/appWideParityServices';

export type CommunityTabKey = 'feed' | 'communities' | 'boards' | 'explore';

export type CommunityFeedFilterKey = 'all' | 'threads' | 'media' | 'reposts' | 'activity';

export type CommunityFeedFilter = {
  key: CommunityFeedFilterKey;
  label: string;
  description: string;
};

export type CommunityInterstitialKind =
  | 'prompt'
  | 'live_now'
  | 'who_to_follow'
  | 'trending_boards'
  | 'nearby_events'
  | 'community_radio';

export type CommunityFeedBundle = {
  posts: MobileSocialPost[];
  boards: BackstageBoard[];
  communities: ParityCard[];
  exploreCards: ParityCard[];
  liveNow: ParityCard[];
  nearbyEvents: ParityCard[];
  whoToFollow: ParityCard[];
  radio: ParityCard[];
  prompt: {
    id: string;
    title: string;
    subtitle: string;
    route: string;
  };
};

export type MobileFeedAttachmentType = 'release' | 'beat' | 'gallery' | 'mix' | 'event';

export type MobileFeedAttachment = {
  type: MobileFeedAttachmentType;
  id: string;
  title: string;
  subtitle: string;
  imageUrl?: string | null;
  route: string;
};

export const COMMUNITY_TABS: Array<{ key: CommunityTabKey; label: string; icon: string }> = [
  { key: 'feed', label: 'Feed', icon: 'dynamic-feed' },
  { key: 'communities', label: 'Communities', icon: 'groups' },
  { key: 'boards', label: 'Boards', icon: 'forum' },
  { key: 'explore', label: 'Explore', icon: 'explore' },
];

export const FEED_FILTERS: CommunityFeedFilter[] = [
  { key: 'all', label: 'All', description: 'Every community post' },
  { key: 'threads', label: 'Threads', description: 'Discussions and questions' },
  { key: 'media', label: 'Media', description: 'Posts with images, video, audio or shared cards' },
  { key: 'reposts', label: 'Reposts', description: 'Shared posts and quotes' },
  { key: 'activity', label: 'Activity', description: 'Posts connected to boards, creators, events or releases' },
];
