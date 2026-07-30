import { loadCommunityBoards, loadMobileSocialFeed } from '../culture/mobileSocial';
import type { MobileSocialPost } from '../culture/mobileTypes';
import { loadCommunityParity, type ParityCard, type ParityPayload } from '../parity/appWideParityServices';
import { loadHomeEditorialStories } from '../home/homeDiscoveryData';
import type { CommunityFeedBundle, CommunityFeedFilterKey } from './communityFeedTypes';

function hasMedia(post: MobileSocialPost) {
  return Boolean(post.images?.length || post.video || post.audio || post.gif || post.link_preview);
}

function isThread(post: MobileSocialPost) {
  return ['discussion', 'question', 'beat_feedback', 'track_feedback', 'collab_request'].includes(post.post_type);
}

function hasActivity(post: MobileSocialPost) {
  return post.destinations.some((destination) => destination.destination_type !== 'global_feed');
}

function createdAtMs(post: MobileSocialPost) {
  const value = Date.parse(post.created_at);
  return Number.isFinite(value) ? value : 0;
}

export function orderCommunityPostsNewestFirst(posts: MobileSocialPost[]) {
  return [...posts].sort((left, right) => {
    const timestampDifference = createdAtMs(right) - createdAtMs(left);
    return timestampDifference || right.id.localeCompare(left.id);
  });
}

export function filterCommunityPosts(posts: MobileSocialPost[], filter: CommunityFeedFilterKey, hashtag?: string | null) {
  const scoped = hashtag
    ? posts.filter((post) => post.hashtags.some((tag) => tag.toLowerCase() === hashtag.toLowerCase().replace(/^#/, '')))
    : posts;

  if (filter === 'threads') return scoped.filter(isThread);
  if (filter === 'media') return scoped.filter(hasMedia);
  if (filter === 'reposts') return scoped.filter((post) => post.is_repost || post.is_quote);
  if (filter === 'activity') return scoped.filter(hasActivity);
  return scoped;
}

function bySection(payload: ParityPayload, id: string) {
  return payload.sections.find((section) => section.id === id)?.items ?? [];
}

function matchingSections(payload: ParityPayload, terms: string[]) {
  const matches: ParityCard[] = [];
  for (const section of payload.sections) {
    const haystack = `${section.id} ${section.title}`.toLowerCase();
    if (terms.some((term) => haystack.includes(term.toLowerCase()))) {
      matches.push(...section.items);
    }
  }
  return matches;
}

function uniqueCards(cards: ParityCard[]) {
  const seen = new Set<string>();
  return cards.filter((card) => {
    const key = `${card.kind}:${card.id}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export async function loadCommunityFeedBundle(): Promise<CommunityFeedBundle> {
  const [posts, boards, parity, stories] = await Promise.all([
    loadMobileSocialFeed({ mode: 'latest', limit: 36 }),
    loadCommunityBoards(),
    loadCommunityParity(),
    loadHomeEditorialStories(8),
  ]);

  const liveNow = bySection(parity, 'events').filter((item) => /live|room|event/i.test(`${item.eyebrow} ${item.title} ${item.subtitle}`));
  const nearbyEvents = bySection(parity, 'events');
  const whoToFollow = bySection(parity, 'creators');
  const radio = bySection(parity, 'radio');
  const editorials: ParityCard[] = stories.map((story) => ({
    id: story.id,
    title: story.title || 'THE PLUG dispatch',
    subtitle: story.excerpt || 'Independent music, culture and scene reporting.',
    eyebrow: story.tags?.[0] || 'THE PLUG',
    route: `/plug/${story.id}`,
    imageUrl: story.featured_image_url,
    metric: story.created_at ? new Date(story.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : null,
    kind: 'editorial',
  }));
  const communities = uniqueCards([...bySection(parity, 'hubs'), ...matchingSections(parity, ['community', 'hub'])]).slice(0, 18);
  const exploreCards = uniqueCards([...editorials, ...parity.sections.flatMap((section) => section.items)]).slice(0, 30);

  return {
    posts: orderCommunityPostsNewestFirst(posts),
    boards,
    communities,
    exploreCards,
    liveNow,
    nearbyEvents,
    whoToFollow,
    radio,
    editorials,
    prompt: {
      id: 'community-prompt',
      title: 'What are you listening to?',
      subtitle: 'Start a thread, share a release, or post a moment from the scene.',
      route: '/create-post',
    },
  };
}
