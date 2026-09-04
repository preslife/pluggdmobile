import assert from 'node:assert/strict';
import fs from 'node:fs';

const shell = fs.readFileSync('src/features/discovery/MusicDiscoveryDiscover.tsx', 'utf8');
const discover = fs.readFileSync('src/features/discovery/DiscoveryExperience.tsx', 'utf8');
const destinations = fs.readFileSync('src/features/discovery/publicDestinations.ts', 'utf8');
const taste = fs.readFileSync('src/features/discovery/discoveryTaste.ts', 'utf8');
const curation = fs.readFileSync('src/features/discovery/siteCuration.ts', 'utf8');
const image = fs.readFileSync('src/components/PluggdImage.tsx', 'utf8');

const requireText = (text, message) => assert.ok(discover.includes(text), message);

assert.match(shell, /return <DiscoveryExperience \/>/, 'the public Discover export must render the repaired experience');

for (const [title, route] of [
  ['Mixes', '/mixes'],
  ['Soundboards', '/soundboards'],
  ['Releases', '/releases'],
  ['Live', '/live'],
  ['THE PLUG', '/plug'],
  ['BeatPlug', '/market/beats'],
  ['Opportunities', '/opportunities'],
]) {
  assert.ok(destinations.includes(`title: '${title}'`), `Discover must expose the ${title} gateway through the authoritative destination registry.`);
  assert.ok(destinations.includes(`route: '${route}'`), `The ${title} gateway must use its working native route.`);
}

for (const key of ['mixes', 'soundboards', 'releases', 'live', 'thePlug', 'beatplug', 'opportunities', 'creators', 'community', 'events', 'store', 'maps', 'library']) {
  assert.match(destinations, new RegExp(`${key}: require\\('\\.\\.\\/\\.\\.\\/\\.\\.\\/assets\\/discovery-destinations\\/`), `${key} must own packaged Discovery artwork`);
}
assert.match(destinations, /mixes: require\('[^']*exec-47622c5f-dae6-4795-966b-499786107612\.png'/, 'DJ and Mixes must use the reviewed white-hands artwork');
assert.match(destinations, /CARNIVAL_HUB_DESTINATION[\s\S]*notting-hill-mas-2023\.webp/, 'the current Carnival Hub artwork must remain unchanged');
assert.doesNotMatch(destinations, /carnival: require\(/, 'Carnival must not receive replacement packaged artwork');
assert.match(discover, /CARNIVAL_2026_FALLBACK_EXPIRES_AT[\s\S]*seasonalCuration\.data\?\.\[0\][\s\S]*CARNIVAL_HUB_DESTINATION\.imageUrl/, 'scheduled seasonal art must win before the bounded unchanged Carnival fallback');
const seasonalFeatureIndex = discover.indexOf('{seasonalFeature ? <FeatureSpotlight');
const destinationNavigationIndex = discover.indexOf('<Text style={styles.sectionEyebrow}>EXPLORE PLUGGD</Text><Text style={styles.sectionTitle}>Every way into the culture</Text>');
const movingFeatureIndex = discover.indexOf('{movingFeature ? <FeatureSpotlight');
assert.ok(seasonalFeatureIndex >= 0 && destinationNavigationIndex > seasonalFeatureIndex && movingFeatureIndex > destinationNavigationIndex, 'Carnival/seasonal spotlight must be the sole feature above permanent navigation and What\'s Moving Now must follow the navigation');
assert.match(discover, /worldArtworkFrame[\s\S]*<Image source=\{world\.artwork\} style=\{styles\.worldImage\} resizeMode="contain"/, 'permanent destination artwork must render inside an explicit fitted frame');
assert.match(discover, /worldImage: \{ width: '100%', height: '100%' \}/, 'the fitted destination image must own explicit frame dimensions rather than intrinsic asset size');
assert.doesNotMatch(discover, /fallbackSource=\{world\.artwork\}[\s\S]{0,160}resizeMode="cover"/, 'permanent destination artwork must not regress to the intrinsic full-bleed cover crop');

assert.match(image, /usingPackagedFallback \? 1 : loaded \? opacity : 0/, 'packaged fallback art must be immediately visible');
for (const placement of ['hero_rotation', 'what_moving_now', 'discover_for_you', 'seasonal_spotlight']) {
  requireText(`loadCuratedPublicItems('${placement}'`, `${placement} must have a separate native query`);
}
assert.match(curation, /loadCuratedTickerItems[\s\S]*get_discover_ticker_items[\s\S]*isSafeInternalRoute/, 'ticker content and promos must resolve through the safe public curation authority');
requireText('tickerCuration.data ?? []', 'scheduled ticker rows must lead the realtime pulse');

requireText('curatedOpeningItems.length ? curatedOpeningItems : organicItems', 'hero_rotation must own the complete opening with an organic empty-placement fallback');
requireText('MORE FROM THIS OPENING', 'the opening continuation rail must be explicitly named');
requireText('MORE FOR YOU', 'personalised recommendations must be a separate section');
assert.match(taste, /user_follows[\s\S]*play_events[\s\S]*release_plays|play_events[\s\S]*release_plays[\s\S]*user_follows/, 'personalisation must use real listening and follow data');
assert.match(taste, /alreadyPlayed[\s\S]*relevance -= 3/, 'already-played content must be down-ranked');

requireText("filter !== 'For you'", 'non-default filters must replace rather than duplicate the default page');
requireText("filter === 'Genres' ? genreDirectory : filter === 'Cities' ? cityDirectory : scenes", 'Scenes, Genres and Cities must own truthful directories');
requireText("if (filter === 'Charts')", 'Charts must own the chart view');
requireText('buildRankedDiscoveryItems(playableItems, 10)', 'Charts must use up to ten measured playable entries');
assert.doesNotMatch(discover, /measuredIds|playableItems\.filter\(\(item\) => !measuredIds/, 'Charts must not pad unmeasured rows into ranks');

assert.doesNotMatch(discover, /New goods on PLUGGD|Return to your Library|contextGrid/, 'duplicate Store, Library and bottom promo modules must be removed');
requireText('FROM THE RACKS', 'older public releases must have a distinct rediscovery shelf');
requireText("navigate('/dj')", 'PLUGGD DJ must open its real route');
requireText('NativeSoundboardCanvas', 'Soundboards must preview their real saved canvases');
requireText(".filter((room) => room.status === 'live')", 'only genuinely live rooms may be labelled live');

requireText(".from('public_profiles')", 'Creator cards must resolve canonical public creator identities');
requireText(".filter((item) => item.kind === 'release' || item.kind === 'beat')", 'Creator matching must start from credited artist and producer names');
requireText(".in('user_id', creditedCreatorIds)", 'Creator cards must resolve catalogue owner identity before relying on display-name matching');
requireText('profilesById.get(item.creatorId)', 'Creator cards must prefer canonical creator ownership over case-sensitive credit strings');
requireText("loadMobileSocialFeed({ mode: 'trending', limit: 6 })", 'Community Pulse must use the real public social feed');
requireText('navigate(`/post/${post.id}`)', 'Community Pulse must retain exact post routes');
assert.doesNotMatch(discover, /download_url|private_url|master_url/, 'Discovery must not expose private or download assets');
assert.match(discover, /minHeight: 44|width: 44, height: 44/, 'new actions must retain 44pt targets');

console.log('PLUGGD native Discovery Phase 10I completion contract passed');
