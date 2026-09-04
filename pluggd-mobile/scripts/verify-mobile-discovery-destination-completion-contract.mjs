import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const identity = read('src/features/culture/publicCreatorIdentity.ts');
const publicAudienceFilters = read('src/lib/publicAudienceFilters.ts');
const social = read('src/features/culture/mobileSocial.ts');
const socialCard = read('src/features/culture/MobileSocialPostCard.tsx');
const socialViewer = read('src/features/culture/MobileSocialMediaViewer.tsx');
const discover = read('src/features/discovery/DiscoveryExperience.tsx');
const discoveryModel = read('src/features/discovery/discoveryModel.ts');
const returnBar = read('src/features/discovery/DiscoveryReturnBar.tsx');
const miniPlayer = read('components/MiniPlayer.tsx');
const mixes = read('src/features/editorial/MixesWorldScreen.tsx');
const soundboards = read('src/features/editorial/SoundboardsIndexScreen.tsx');
const releases = read('src/features/editorial/ListeningFloorScreen.tsx');
const live = read('src/features/live/live-culture-screen.tsx');
const plug = read('src/features/editorial/ThePlugIndexScreen.tsx');
const themeTokens = read('src/design/tokens.ts');
const beatPlug = read('src/features/editorial/BeatPlugScreen.tsx');
const opportunities = read('src/features/opportunities/OpportunityScreens.tsx');
const directory = read('src/features/directory/CreatorDirectoryScreen.tsx');
const community = read('src/features/community-feed/CommunityFeedScreen.tsx');
const store = read('src/features/editorial/MarketStoreScreen.tsx');
const maps = read('src/features/maps/MapSignalsScreen.tsx');
const library = read('app/library.tsx');
const postDetail = read('app/post/[id].tsx');
const search = read('src/features/search/search-discovery-screen.tsx');
const stageData = read('src/features/culture/useCultureData.ts');
const stage = read('src/features/stage/stage-discovery-screen.tsx');
const backstage = read('src/features/backstage/backstage-world-screen.tsx');
const connectCard = read('src/features/connect/ConnectCardScreen.tsx');
const parityServices = read('src/features/parity/appWideParityServices.ts');

const identitySources = [identity, social, socialCard, socialViewer, discover, discoveryModel, releases, beatPlug, store, live, postDetail, search, stageData, stage, backstage, connectCard, parityServices];
for (const source of identitySources) {
  assert.doesNotMatch(source, /PLUGGD [Uu]ser/, 'Creator-facing content must never regress to a PLUGGD user label');
}
assert.ok(identity.indexOf("readIdentityRows('social_author_profiles'") < identity.indexOf("readIdentityRows('public_profiles'"), 'Social public identity must remain the first authority');
assert.ok(identity.indexOf("readIdentityRows('public_profiles'") < identity.indexOf("readIdentityRows('profiles'"), 'Public creator identity must resolve before authenticated profile fallback');
assert.match(social, /loadPublicCreatorIdentityMap/, 'Community posts and comments must use the shared public creator identity adapter');
assert.match(publicAudienceFilters, /isNonPublicTestProfileName/, 'Public feeds must retain an explicit review-test identity filter');
assert.match(social, /filter\(\(row\) => !isNonPublicTestIdentity/, 'Community posts must exclude non-public review-test identities');
assert.match(social, /if \(isNonPublicTestIdentity\(profile\)\) return \[\]/, 'Community comments must exclude non-public review-test identities');
assert.match(discover, /loadMobileSocialFeed\(\{ mode: 'trending', limit: 6 \}\)/, 'Community Pulse must continue to use real public social content');
assert.doesNotMatch(discoveryModel, /PLUGGD community|PLUGGD creator|PLUGGD producer/i, 'Discovery catalogue cards must not manufacture generic creator credits');

assert.match(returnBar, /router\.replace\('\/discover'(?: as any)?\)/, 'Back to Discovery must return to the canonical Discovery route');
assert.match(returnBar, /minHeight:\s*44/, 'Back to Discovery must retain a 44pt target');
for (const [name, source] of [
  ['Mixes', mixes],
  ['Soundboards', soundboards],
  ['Releases', releases],
  ['Live', live],
  ['THE PLUG', plug],
  ['BeatPlug', beatPlug],
  ['Opportunities', opportunities],
  ['Creators', directory],
  ['Community', community],
  ['Store', store],
  ['Maps', maps],
  ['Library', library],
]) {
  assert.match(source, /DiscoveryHeader backToDiscovery|<DiscoveryReturnBar/, `${name} must expose Back to Discovery`);
}

assert.match(miniPlayer, /if \(!isPlaying \|\| shouldDefaultCollapseMiniPlayer\(normalizedPathname\)\)/, 'Route changes may collapse a paused or route-sensitive player');
assert.doesNotMatch(miniPlayer, /setCollapsed\(routeRequiresCollapsedPlayer\(pathname\)\)/, 'Route changes must not automatically re-expand a user-collapsed player');

assert.ok((mixes.match(/contentContainerStyle=\{styles\.horizontalRail\}/g) ?? []).length >= 5, 'Mixes must retain at least five adaptive horizontal destination rails');
assert.match(directory, /DISCOVERY_DESTINATION_ART\.creators[\s\S]*Creators to know now/i, 'Creators must retain the artwork-led directory hero and featured rail');
assert.match(directory, /CreatorGalleryCard[\s\S]*numColumns=\{2\}/, 'Creators must retain the two-column public profile gallery');
assert.match(library, /DISCOVERY_DESTINATION_ART\.library[\s\S]*Continue discovering[\s\S]*Browse Market/, 'Library must retain its artwork-led hero with real destinations');
assert.match(library, /LibraryShelf[\s\S]*horizontal/, 'Library collections must remain artwork shelves rather than a plain stack');
assert.match(themeTokens, /export const pluggdLight[\s\S]*background:\s*'#FFF8ED'[\s\S]*canvas:\s*'#FFF8ED'/, 'Editorial Light must retain the cream magazine canvas');
assert.match(plug, /usePluggdTheme[\s\S]*backgroundColor:\s*theme\.colors\.background/, 'THE PLUG must use the resolved appearance canvas');
assert.match(plug, /CURRENT EDITION[\s\S]*LEAD DISPATCH[\s\S]*IN THIS EDITION/, 'THE PLUG must retain its magazine hierarchy');
assert.match(store, /creator_merchandise'[\s\S]*select\('id,user_id,[\s\S]*loadPublicCreatorIdentityMap/, 'Creator merchandise must resolve its public owner identity');
assert.match(store, /sample_packs'[\s\S]*select\('id,user_id,owner_id,[\s\S]*creator_identity/, 'Sample packs must resolve their public owner identity');
assert.match(soundboards, /loadPublicCreatorIdentityMap/, 'Soundboards must credit the public board creator');
assert.doesNotMatch(stageData, /PLUGGD Creator|PLUGGD DJ/, 'Stage feed data must omit unresolved credits instead of inventing a platform creator');
assert.doesNotMatch(stage, /creator:\s*(?:release\.artist|mix\.event_name[^\n]*mix\.city)[^\n]*(?:PLUGGD Creator|PLUGGD DJ)/, 'Stage cards must not manufacture release or mix creator credits');
assert.match(backstage, /isPublicProfileName\(profileName\(profile\)\)/, 'Backstage creator recommendations must exclude unresolved and test identities');
assert.match(parityServices, /publicProfileCards[\s\S]*isPublicProfileName\(card\.title\)/, 'Shared parity recommendations must expose only real public creator names');
assert.doesNotMatch(connectCard, /PLUGGD Creator/, 'Connect Card must use its canonical public slug rather than an invented creator identity');
assert.doesNotMatch([mixes, soundboards, releases, live, plug, beatPlug, opportunities, directory, community, store, maps, library].join('\n'), /EventsBoardScreen/, 'The destination completion lane must not absorb the separately owned Events redesign');

console.log('PLUGGD native Discovery destination completion contract passed');
