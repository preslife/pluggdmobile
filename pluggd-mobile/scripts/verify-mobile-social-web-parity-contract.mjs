import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const social = read('src/features/culture/mobileSocial.ts');
const services = read('src/features/culture/mobileServices.ts');
const postRoute = read('app/post/[id].tsx');
const composer = read('app/create-post.tsx');
const home = read('src/features/home/live-music-dashboard-home.tsx');
const discover = read('src/features/parity/appWideParityServices.ts');
const communityRoute = read('app/community.tsx');
const communityTabRoute = read('app/(tabs)/community.tsx');
const parityScreens = read('src/features/parity/AppWideParityScreens.tsx');
const socialCard = read('src/features/culture/MobileSocialPostCard.tsx');
const boardRoute = read('app/community/boards/[slug].tsx');
const backstageDetail = read('app/backstage/[id].tsx');
const storiesRail = read('src/features/culture/MobileStoriesRail.tsx');
const storyRoute = read('app/story/[id].tsx');
const dock = read('components/PluggdDock.tsx');
const header = read('components/MobileHeader.tsx');

for (const token of [
  "from('social_post_destinations')",
  "from('social_comments')",
  "from('social_likes')",
  "from('social_bookmarks')",
  "from('social_reposts')",
  "from('social_poll_votes')",
  "rpc('vote_social_poll'",
  "rpc('fn_for_you_feed'",
  "from('community_boards')",
  "from('community_board_members')",
]) {
  assert.match(social, new RegExp(escapeRegExp(token)), `${token} must remain part of the mobile web-parity social layer`);
}

for (const token of [
  "from('social_stories')",
  "rpc('mark_story_viewed'",
  "rpc('can_create_social_story'",
  'createMobileStory',
  'loadMobileStoryDeck',
  'uploadSocialMediaAsset',
  "rpc('get_fan_map_plugs'",
  "rpc('get_fan_map_stats'",
  "from('fan_map_plugs')",
]) {
  assert.match(social + services, new RegExp(escapeRegExp(token)), `${token} must remain part of the mobile community/story/fan-map layer`);
}

for (const token of ['hashtag', 'focusPostId', "'trending'", 'fn_for_you_feed']) {
  assert.match(social, new RegExp(token), `social feed service must support ${token}`);
}

assert.doesNotMatch(services, /from\('comments'\)|from\('likes'\)/, 'mobile social routes must not use stale generic comments/likes tables');

for (const token of [
  'loadThreadDetail',
  'MobileSocialPostCard',
  'toggleSocialBookmark',
  'toggleSocialRepost',
  'voteMobilePoll',
  'social_comments',
]) {
  assert.match(postRoute + social, new RegExp(token), `${token} must be wired into the thread/post route`);
}

for (const token of [
  'social_post_destinations',
  'destinationType',
  'boardId',
  'quotePostId',
  'creator_community',
  'uploadSocialMediaAsset',
  'ImagePicker.launchImageLibraryAsync',
  'DocumentPicker.getDocumentAsync',
  'pollQuestion',
  'pollOptions',
  'multiple_choice',
  'poll: pollPayload',
]) {
  assert.match(composer + social, new RegExp(token), `${token} must be represented in the mobile composer/destination flow`);
}

for (const token of [
  'createMobileStory',
  'ImagePicker.launchImageLibraryAsync',
  'DocumentPicker.getDocumentAsync',
  'Your story',
  '24h posts',
]) {
  assert.match(storiesRail, new RegExp(token), `Stories rail must provide web-parity story creation support for ${token}`);
}

for (const token of [
  'expo-video',
  'VideoView',
  'useVideoPlayer',
  'loadMobileStoryDeck',
  'markMobileStoryViewed',
  'usePlayback',
  'Audio story',
]) {
  assert.match(storyRoute, new RegExp(token), `Story viewer must support real media deck behavior for ${token}`);
}

assert.doesNotMatch(storiesRail, /if \(!stories\.length\) return null/, 'Stories rail must always expose the current user create-story slot');
assert.doesNotMatch(composer + storiesRail, /Media upload needs the mobile storage contract|Story creation needs the mobile media upload contract confirmed/, 'Social composer/stories must not ship as lightweight storage placeholders');

assert.match(communityRoute, /CommunityParityScreen/, 'top-level Community route must render the web-source Community surface');
assert.match(communityTabRoute, /CommunityParityScreen/, 'tab Community route must render the web-source Community surface');

for (const token of [
  'loadCommunityParity',
  'Stories and moments',
  'Community prompt',
  'Feed',
  'Boards and hubs',
  'Live now and nearby events',
  'Contests',
  'Crowdfund',
  'From THE PLUG',
  'Community radio',
  'Who to follow',
  'Community soundboards',
]) {
  assert.match(discover, new RegExp(escapeRegExp(token)), `Community parity payload must expose ${token}`);
}

for (const token of ['socialPostCard', 'communityFeatureCard', 'RailCard', 'WEB_PARITY_ASSETS']) {
  assert.match(parityScreens + discover, new RegExp(token), `Community surface must use premium web-parity presentation for ${token}`);
}

for (const token of ['boards', 'Board', 'MobileSocialPostCard']) {
  assert.match(boardRoute + services, new RegExp(token), `Community board routes must keep ${token}`);
}

for (const token of ['thread.route', 'board.route']) {
  assert.match(backstageDetail + services, new RegExp(token), `Community compatibility detail must keep ${token}`);
}

for (const token of [
  'MediaGrid',
  'AudioAttachment',
  'LinkPreview',
  'PollCard',
  'toggleSocialLike',
  'toggleSocialBookmark',
  'toggleSocialRepost',
  'voteMobilePoll',
]) {
  assert.match(socialCard, new RegExp(token), `Social post card must support ${token}`);
}

assert.doesNotMatch(
  `${dock}\n${header}\n${communityRoute}\n${communityTabRoute}\n${discover}\n${parityScreens}`,
  /MyPLUGGD|My PLUGGD|MY PLUGGD|label:\s*'Backstage'|Open Backstage|Find your Backstage/,
  'visible Community/nav surfaces must not reintroduce MyPLUGGD or Backstage branding',
);

assert.doesNotMatch(
  home,
  /MobileStoriesRail|SocialFeedSection|MobileSocialPostCard|loadMobileSocialFeed|ComposerEntry|create-post/,
  'Home must remain the public front door; dense social feed, stories and composer belong in Community',
);

console.log('mobile social/community web parity contract verified');
