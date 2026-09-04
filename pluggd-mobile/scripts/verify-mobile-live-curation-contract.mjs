import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const curation = read('src/features/discovery/siteCuration.ts');
const eventsData = read('src/features/events/eventDiscoveryData.ts');
const homeData = read('src/features/home/homeDiscoveryData.ts');
const home = read('src/features/home/MusicDiscoveryHome.tsx');
const discover = read('src/features/discovery/DiscoveryExperience.tsx');
const events = read('src/features/editorial/EventsBoardScreen.tsx');
const plug = read('src/features/editorial/ThePlugIndexScreen.tsx');

assert.match(curation, /get_discover_featured_items/, 'iOS must consume the public admin curation RPC');
for (const placement of ['homepage_hero', 'homepage_editorial', 'hero_rotation', 'what_moving_now', 'featured_event', 'homepage_event']) {
  assert.match(`${curation}\n${home}\n${discover}\n${events}`, new RegExp(placement), `iOS must wire ${placement}`);
}
for (const type of ['release', 'beat', 'mix', 'soundboard', 'event', 'article', 'promo']) {
  assert.match(curation, new RegExp(`'${type}'`), `curation hydration must understand ${type}`);
}
assert.match(home, /const featured = useMemo\(\(\) => selectDailyFeature\(items\)/, 'Home must preserve its original independent Featured Track selector');
assert.match(home, /const movingFeature = useMemo\([\s\S]*homepageHero\.data[\s\S]*isPlayableDiscoveryItem/, 'Home admin hero curation must hydrate the separate Moving module');
assert.match(home, /homepageEvents\.data[\s\S]*\.event/, 'Home Happening Now must prefer homepage event curation');
assert.match(eventsData, /isHappeningNowEvent/, 'Home event curation must still pass the truthful current-time eligibility contract');
assert.match(homeData, /loadCuratedPublicItems\('homepage_editorial'/, 'Home THE PLUG must use its explicit admin placement');
assert.match(homeData, /loadThePlugEditorialStories\(Math\.max/, 'Home editorial must retain approved organic fallback');
assert.doesNotMatch(homeData, /not\('featured_image_url', 'is', null\)/, 'THE PLUG must not hide valid published stories that lack hero artwork');
assert.match(plug, /loadThePlugEditorialStories\(100\)/, 'THE PLUG index must request the complete approved public set');
assert.match(plug, /filter\(\(story\) => story\.is_featured\)[\s\S]*feature_rank/, 'THE PLUG lead must follow the admin feature flag and rank');

assert.match(eventsData, /buildQuery\(from, from \+ pageSize - 1\)[\s\S]*?\.range\(from, to\)/, 'events must page beyond PostgREST default and screen limits');
assert.match(eventsData, /ends_at\.gte[\s\S]*ends_at\.is\.null[\s\S]*starts_at\.gte/, 'ongoing and upcoming event windows must both remain eligible');
assert.match(events, /loadPublicEventDiscovery[\s\S]*includePastSince: TAKEOVER_COLLECTION_QUERY_FLOOR/, 'Events must consume the complete canonical public event layer, including its bounded takeover window');
assert.match(events, /loadCuratedPublicItems\('featured_event'/, 'Event Spotlight must follow admin feature curation');
assert.match(events, /Show 8 more events[\s\S]*REMAINING/, 'the complete event set must be progressively reachable in the accepted eight-card board rhythm');
assert.match(discover, /publicEvents\.data\?\.length[\s\S]*live and upcoming events/, 'Discover must report the complete active event count');
assert.match(discover, /heroRotation\.data[\s\S]*organicItems/, 'Discover must order exact admin hero items before organic fallback');

console.log('mobile live data and admin curation contract verified');
