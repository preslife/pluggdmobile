import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const stageRoute = read('app/(tabs)/stage.tsx');
const exploreRoute = read('app/(tabs)/explore.tsx');
const dockSource = read('components/PluggdDock.tsx');
const tabsSource = read('app/(tabs)/_layout.tsx');
const chromeSource = read('components/AppChrome.tsx');
const genrePath = new URL('../app/genre/[genre].tsx', import.meta.url);

assert.match(stageRoute, /<Redirect href="\/explore" \/>/, 'Legacy Stage tab route must redirect to Explore');
assert.match(exploreRoute, /ExploreParityScreen/, 'Explore tab route must render the primary discovery surface');
assert.ok(existsSync(genrePath), 'Genre detail route must remain available from Explore');

assert.match(dockSource, /label:\s*'Explore'[\s\S]*route:\s*'\/explore'/, 'Explore must be the primary discovery tab');
assert.match(dockSource, /aliases:[\s\S]*'\/stage'/, 'Stage links must remain active aliases for Explore');
assert.doesNotMatch(dockSource, /label:\s*'Stage'|route:\s*'\/stage'/, 'Stage must not remain a primary bottom tab');

assert.match(tabsSource, /name="stage"[\s\S]*href:\s*null/, 'Stage compatibility route must stay hidden from the tab bar');
assert.doesNotMatch(tabsSource, /title:\s*"Stage"/, 'Tabs layout must not expose Stage as a primary title');
assert.match(chromeSource, /normalized === '\/stage'/, 'Legacy Stage route must still avoid duplicate global chrome while redirecting');

for (const token of [
  'ContinueListening',
  'FeaturedHero',
  'SwipeBeatsPromo',
  'TRENDING NOW',
  'NEW DROPS / RELEASES',
  'BEATS / PRODUCER DROPS',
  'GENRE HUBS',
]) {
  assert.match(
    read('src/features/stage/stage-discovery-screen.tsx'),
    new RegExp(escapeRegExp(token)),
    `Retained Stage discovery component must still include ${token} until fully migrated into Explore`,
  );
}

console.log('mobile stage compatibility contract verified');
