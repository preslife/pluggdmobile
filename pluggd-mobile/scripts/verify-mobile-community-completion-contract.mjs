import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const screen = readFileSync('src/features/community-feed/CommunityFeedScreen.tsx', 'utf8');

const requireText = (text, message) => assert.ok(screen.includes(text), message);

requireText("tab === 'feed' ? <MobileStoriesRail", 'The accepted stories rail must remain limited to the main feed.');
requireText('<MobileSocialPostCard', 'The accepted social feed cards must remain unchanged.');
requireText('kind="the_plug"', 'The accepted feed editorial placement must remain present.');
requireText('kind="live_now"', 'The accepted feed Live placement must remain present.');

requireText("if (tab === 'boards')", 'Boards must have a dedicated index presentation.');
requireText('<BoardIndexRow', 'Boards must render compact forum rows rather than generic feature cards.');
requireText('minHeight: 82', 'Board rows must stay compact and information-dense.');
requireText('Search community boards', 'The board index must provide accessible search.');
requireText('boardCategories.map', 'The board index must expose real category navigation.');
requireText('board.category || \'General\'', 'Board rows must show real category context with an honest fallback.');
requireText('board.joined', 'Board rows must preserve real joined state.');
requireText('board.is_featured', 'Board rows must preserve real featured state.');
requireText('router.push(route as any)', 'Board rows must open their existing native board routes.');

requireText("if (tab === 'explore')", 'Explore must have a dedicated community discovery surface.');
for (const route of ['/live', '/events', '/search', '/soundboards', '/plug', '/maps']) {
  requireText(`navigate('${route}')`, `Explore must expose the working ${route} destination.`);
}
for (const section of ['Active now', 'Communities to join', 'People to know', 'Happening nearby', 'From THE PLUG', 'Community radio']) {
  requireText(`title="${section}"`, `Explore must organise real content into the ${section} rail.`);
}
for (const field of ['liveNow', 'communities', 'whoToFollow', 'nearbyEvents', 'editorials', 'radio']) {
  requireText(`bundle?.${field}`, `Explore must use the real ${field} bundle data.`);
}
requireText('items.filter((item) => Boolean(item.route))', 'Explore cards without a working destination must remain hidden.');
requireText('<ExploreRailCard', 'Explore must use horizontal discovery rails instead of a vertical editorial/feed stack.');
assert.ok(!screen.includes("tab === 'explore'\n          ? (bundle?.exploreCards"), 'Explore must not fall back to the old flat exploreCards stack.');

console.log('PLUGGD native Community completion contract passed');
