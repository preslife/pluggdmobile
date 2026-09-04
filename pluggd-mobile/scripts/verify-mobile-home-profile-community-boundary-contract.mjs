import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const home = read('src/features/home/MusicDiscoveryHome.tsx');
const homeData = read('src/features/home/homeDiscoveryData.ts');
const services = read('src/features/culture/mobileServices.ts');
const types = read('src/features/culture/mobileTypes.ts');
const community = read('app/backstage/[id].tsx');
const profile = read('src/features/profiles/PublicCreatorProfileScreen.tsx');

assert.match(home, /opportunityFrame: \{ width: 220, minWidth: 220, maxWidth: 220, height: 230/, 'Homepage Opportunities must use the narrower bounded rail frame.');
assert.match(home, /opportunitySurface: \{ \.\.\.StyleSheet\.absoluteFillObject/, 'The Opportunities pressable must fill rather than expand its bounded frame.');
assert.match(home, /numberOfLines=\{2\}>\{opportunity\.title\}/, 'Homepage Opportunities must retain readable two-line titles.');
for (const token of ['OpportunityArtwork', 'moneyLabel(opportunity.fundingMax', 'deadlineLabel(opportunity.closesAt)', "kind: 'opportunity'"]) {
  assert.match(home, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Homepage Opportunities must preserve ${token}.`);
}

assert.doesNotMatch(homeData, /ROOM OPEN|room is open/i, 'Homepage must not claim an ordinary community is a live room.');
assert.match(homeData, /community\.username/, 'Next Wave must require a canonical creator handle for a community-backed creator card.');
assert.match(homeData, /label: 'CREATOR COMMUNITY'/, 'Next Wave must label the relationship truthfully.');
assert.match(homeData, /destination: \{ kind: 'creator', username: community\.username! \}/, 'Next Wave communities must open the canonical Creator Profile.');
assert.match(homeData, /if \(seen\.has\(item\.route\)\) return false/, 'Next Wave must deduplicate the same canonical creator destination.');

assert.match(services, /loadCanonicalPublicProfileMap/, 'Community identity must resolve through canonical public profiles.');
assert.match(services, /row\.custom_url \|\| row\.username \|\| row\.slug/, 'Canonical creator routing must honour the public profile handle order.');
assert.match(services, /username: profile\?\.username \|\| null/, 'A community slug must never masquerade as a creator username.');
assert.match(services, /from\('releases'\)[\s\S]*?\.eq\('community_id', communityRow\.id\)[\s\S]*?\.eq\('approved', true\)[\s\S]*?\.eq\('visibility_status', 'visible'\)[\s\S]*?\.limit\(1\)/, 'Community latest music must be bounded, public and explicitly linked by community_id.');
assert.doesNotMatch(services, /loadFeedBundle\(10\)/, 'Community detail must never leak the global release, beat or mix bundle.');
assert.match(types, /liveSessions: LiveRoomItem\[\];[\s\S]*latestRelease: ReleaseItem \| null;/, 'Community detail must expose only the focused live and latest-profile-link contracts.');
assert.doesNotMatch(types, /export type BackstageDetail[\s\S]*?drops:/, 'Community detail must not retain a duplicated Drops catalogue contract.');

assert.match(community, /const TABS = \['Community', 'Live', 'Collabs'\] as const/, 'Community detail must use the approved engagement tabs.');
assert.doesNotMatch(community, /'Soundboards'|'Drops'|Join Room|routeForRoom|routeForDrop/, 'Community detail must contain no duplicate catalogue tabs, fake Join action or self-loop helper.');
assert.match(community, /<MobileSocialPostCard/, 'The combined Community surface must preserve the rich social card.');
assert.match(community, /\) : <EmptyBlock title="No community posts yet"/, 'A latest-content preview must not suppress the honest empty discussion state.');
assert.match(community, /View creator profile/, 'Community identity must visibly return to the canonical Creator Profile.');
assert.match(community, /\?tab=discography/, 'The single latest-content module must link to Creator Profile Music.');
assert.match(community, /room\.source === 'session_room'/, 'Only a real native session room may expose the live-room route.');
assert.match(community, /pathname: '\/live\/session'/, 'A genuine native session must use its exact live route.');
assert.match(community, /router\.push\(`\/community\/events\/\$\{event\.id\}`/, 'Community events must open their exact native detail.');
assert.match(community, /activeTab === 'Collabs'[\s\S]*detail\.data\?\.rooms\.map\(\(room\) => \([\s\S]*<View key=\{room\.id\}/, 'Collaboration rooms must be informational unless a distinct real destination exists.');
assert.match(community, /detail\.isError[\s\S]*primaryLabel="Try again"[\s\S]*detail\.refetch\(\)/, 'Community must expose a deliberate retry state.');

for (const label of ['Overview', 'Music', 'Beats', 'Soundboards', 'Gallery', 'Videos', 'Community', 'Shop', 'Shows', 'Live', 'About']) {
  assert.match(profile, new RegExp(`label: '${label}'`), `Canonical Creator Profile must retain ${label}.`);
}

console.log('PASS mobile Homepage and profile/community boundary contract');
