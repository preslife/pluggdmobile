import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const tabRoute = read('app/(tabs)/community.tsx');
const topRoute = read('app/community.tsx');
const screen = read('src/features/community-feed/CommunityFeedScreen.tsx');
const service = read('src/features/community-feed/communityFeedService.ts');
const types = read('src/features/community-feed/communityFeedTypes.ts');
const interstitials = read('src/features/community-feed/CommunityFeedInterstitials.tsx');
const switcher = read('src/features/community-feed/CommunityInternalSwitcher.tsx');
const socialCard = read('src/features/culture/MobileSocialPostCard.tsx');
const socialService = read('src/features/culture/mobileSocial.ts');
const mobileServices = read('src/features/culture/mobileServices.ts');
const attachmentCard = read('src/features/community-feed/MobileFeedAttachmentCard.tsx');
const profileScreen = read('src/features/profiles/PublicCreatorProfileScreen.tsx');
const createPost = read('app/create-post.tsx');
const hashtagRoute = read('app/hashtag/[tag].tsx');

assert.match(tabRoute, /CommunityFeedScreen/, 'Community tab must render CommunityFeedScreen');
assert.match(topRoute, /CommunityFeedScreen/, 'Top-level /community must render CommunityFeedScreen');
assert.doesNotMatch(tabRoute + topRoute, /CommunityParityScreen/, 'Community primary route must not render generic CommunityParityScreen');

for (const token of [
  'MobileStoriesRail',
  'CommunityInternalSwitcher',
  'CommunityBottomDockControls',
  'MobileSocialPostCard',
  'RefreshControl',
  'FlatList',
  'loadCommunityFeedBundle',
  'FEED_FILTERS',
  'Latest',
  'Threads',
  'Media',
  'Reposts',
  'Activity',
]) {
  assert.match(screen + types, new RegExp(escapeRegExp(token)), `CommunityFeedScreen must include ${token}`);
}
for (const token of ['Feed', 'Boards', 'Post', 'Explore', 'Maps', 'postIconShell', '/create-post', '/maps']) {
  assert.match(switcher, new RegExp(escapeRegExp(token)), `Community dock must include ${token}`);
}
assert.match(switcher, /!isPost \? \([\s\S]*?<Text maxFontSizeMultiplier=\{1\.2\}/, 'center Post action must remain icon-only instead of adding an off-centre caption');
assert.match(switcher, /<View key=\{item\.id\} style=\{styles\.dockSlot\}>[\s\S]*?<Pressable/, 'Community dock actions must be contained by stable layout slots');
assert.match(switcher, /dockSlot:\s*\{[\s\S]*?flex: 1[\s\S]*?minWidth: 0/, 'Community dock must reserve one equal-width flex slot for each of its five actions');
assert.match(switcher, /dockItem:\s*\{[\s\S]*?width: '100%'/, 'Each Community dock action must fill its equal-width slot');
assert.match(switcher, /dockLabel:\s*\{[\s\S]*?width: '100%'[\s\S]*?textAlign: 'center'/, 'Community dock labels must share their icon slot centre');
assert.match(switcher, /maxFontSizeMultiplier=\{1\.2\}[\s\S]*?styles\.dockLabel/, 'Community dock labels must remain readable inside the fixed five-part control at accessibility text sizes');
assert.match(switcher, /postButtonDepth:\s*\{[\s\S]*?top: 40[\s\S]*?width: 50[\s\S]*?height: 14/, 'Community create action must use the founder-approved clipped lower sidewall instead of a second disc');
assert.match(switcher, /postIconShell:\s*\{[\s\S]*?width: 50[\s\S]*?height: 50[\s\S]*?zIndex: 1/, 'Community create action face must cover the sidewall except at its lower depth edge');
assert.doesNotMatch(switcher, /postButtonBevel/, 'Community create action must not regress to the concentric-circle bevel');

for (const token of [
  'Community Prompt',
  'Live Now',
  'Who To Follow',
  'Trending Boards',
  'Nearby Events',
  'Community Radio',
  'THE PLUG',
  'Read all',
]) {
  assert.match(interstitials, new RegExp(escapeRegExp(token)), `Community feed interstitials must include ${token}`);
}

for (const token of ['Feed', 'Communities', 'Boards', 'Explore', 'Stories', 'Create Post', 'Nearby', 'THE PLUG']) {
  assert.match(switcher + types, new RegExp(escapeRegExp(token)), `Community internal controls must include ${token}`);
}

assert.match(service, /loadHomeEditorialStories/, 'Community must load the same approved editorial source as THE PLUG');
assert.match(screen, /kind="the_plug"/, 'Community must place THE PLUG inside the social discovery sequence');
assert.match(service, /loadMobileSocialFeed\(\{ mode: 'latest'/, 'Community must request the latest social feed instead of an opaque ranked order');
assert.match(service, /orderCommunityPostsNewestFirst/, 'Community must defensively keep posts newest-first after enrichment');
assert.match(service, /createdAtMs\(right\) - createdAtMs\(left\)/, 'Community ordering must compare post timestamps in descending order');
assert.ok(
  screen.indexOf('<MobileStoriesRail') > 0 &&
    screen.indexOf('<MobileStoriesRail') < screen.indexOf('<CommunityInternalSwitcher') &&
    screen.indexOf('<CommunityInternalSwitcher') < screen.indexOf('<MobileSocialPostCard'),
  'Community must lead directly with stories and feed navigation before social posts',
);

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

assert.doesNotMatch(screen + switcher, /What's happening in your world|SCENES IN MOTION|Follow the conversations, works in progress/, 'Community must not spend feed space on redundant heading or composer prompt copy');

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

for (const token of [
  'creator_gallery_items',
  'gallery_item',
  'profileGalleryRoute',
  'tab=gallery',
  'galleryItem',
]) {
  assert.match(mobileServices + types + attachmentCard, new RegExp(escapeRegExp(token)), `Gallery share attachments must use web-backed creator gallery support via ${token}`);
}

for (const token of ['galleryItems', 'useLocalSearchParams', 'galleryItem', 'custom_url']) {
  assert.match(profileScreen, new RegExp(escapeRegExp(token)), `Creator profile must support gallery route parity via ${token}`);
}

assert.match(hashtagRoute, /loadMobileSocialFeed|CommunityFeedScreen/, 'Hashtag route must use the social feed implementation');

assert.doesNotMatch(
  screen + interstitials + switcher + socialCard + createPost,
  /backend contract|unsupported payment|native translation|App Review|Apple-backed|web-only|current backend|mobile backend|\bcontract\b|\bbackend\b/i,
  'Community feed public UI must not expose internal implementation copy',
);

console.log('mobile community feed contract verified');
