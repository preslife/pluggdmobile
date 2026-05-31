import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tabRoute = read('app/(tabs)/community.tsx');
const topRoute = read('app/community.tsx');
const screen = read('src/features/community-feed/CommunityFeedScreen.tsx');
const service = read('src/features/community-feed/communityFeedService.ts');
const types = read('src/features/community-feed/communityFeedTypes.ts');
const composer = read('src/features/community-feed/CommunityComposer.tsx');
const interstitials = read('src/features/community-feed/CommunityFeedInterstitials.tsx');
const switcher = read('src/features/community-feed/CommunityInternalSwitcher.tsx');
const socialCard = read('src/features/culture/MobileSocialPostCard.tsx');
const socialService = read('src/features/culture/mobileSocial.ts');
const createPost = read('app/create-post.tsx');
const hashtagRoute = read('app/hashtag/[tag].tsx');

assert.match(tabRoute, /CommunityFeedScreen/, 'Community tab must render CommunityFeedScreen');
assert.match(topRoute, /CommunityFeedScreen/, 'Top-level /community must render CommunityFeedScreen');
assert.doesNotMatch(tabRoute + topRoute, /CommunityParityScreen/, 'Community primary route must not render generic CommunityParityScreen');

for (const token of [
  'MobileStoriesRail',
  'CommunityComposer',
  'CommunityInternalSwitcher',
  'CommunityBottomDockControls',
  'MobileSocialPostCard',
  'RefreshControl',
  'FlatList',
  'loadCommunityFeedBundle',
  'FEED_FILTERS',
  'All',
  'Threads',
  'Media',
  'Reposts',
  'Activity',
]) {
  assert.match(screen + types, new RegExp(escapeRegExp(token)), `CommunityFeedScreen must include ${token}`);
}

for (const token of [
  'Community Prompt',
  'Live Now',
  'Who To Follow',
  'Trending Boards',
  'Nearby Events',
  'Community Radio',
]) {
  assert.match(interstitials, new RegExp(escapeRegExp(token)), `Community feed interstitials must include ${token}`);
}

for (const token of ['Feed', 'Communities', 'Boards', 'Explore', 'Stories', 'Create Post', 'Nearby']) {
  assert.match(switcher + types, new RegExp(escapeRegExp(token)), `Community internal controls must include ${token}`);
}

for (const token of [
  'loadMobileSocialFeed',
  'loadCommunityBoards',
  'loadCommunityParity',
  'fn_for_you_feed',
  'social_posts',
  'social_post_destinations',
]) {
  assert.match(service + socialService, new RegExp(escapeRegExp(token)), `Community feed data must use ${token}`);
}

for (const token of [
  'toggleSocialLike',
  'toggleSocialBookmark',
  'toggleSocialRepost',
  'voteMobilePoll',
  'reportSocialPost',
  'Share.share',
  '/post/',
  '/hashtag/',
]) {
  assert.match(socialCard + socialService, new RegExp(escapeRegExp(token)), `Social post card/service must support ${token}`);
}

for (const token of ['Start a post', 'Sign in to post', '/auth/login', '/create-post']) {
  assert.match(composer, new RegExp(escapeRegExp(token)), `Community composer must include ${token}`);
}

for (const token of [
  'attachmentType',
  'releaseId',
  'beatId',
  'galleryId',
  'mixId',
  'linkPreview',
  'MobileFeedAttachmentCard',
]) {
  assert.match(createPost, new RegExp(escapeRegExp(token)), `Create post route must support attached content via ${token}`);
}

assert.match(hashtagRoute, /loadMobileSocialFeed|CommunityFeedScreen/, 'Hashtag route must use the social feed implementation');

assert.doesNotMatch(
  screen + composer + interstitials + switcher + socialCard + createPost,
  /backend contract|unsupported payment|native translation|App Review|Apple-backed|web-only|current backend|mobile backend|\bcontract\b|\bbackend\b/i,
  'Community feed public UI must not expose internal implementation copy',
);

console.log('mobile community feed contract verified');
