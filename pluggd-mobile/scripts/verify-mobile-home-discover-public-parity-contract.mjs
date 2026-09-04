import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const service = read('src/features/discovery/publicDiscoveryFeatures.ts');
const home = read('src/features/home/MusicDiscoveryHome.tsx');
const discover = read('src/features/discovery/DiscoveryExperience.tsx');
const destinations = read('src/features/discovery/publicDestinations.ts');

assert.match(service, /fetchPublishedOpportunities\(100\)/, 'public features must load enough verified open Opportunities for meaningful aggregate totals');
assert.match(service, /\.from\('store_products'\)/, 'public Store features must use the canonical Store product table');
assert.match(service, /\.eq\('is_active', true\)/, 'Store features must be active');
assert.match(service, /\.eq\('visibility', 'public'\)/, 'Store features must be public');
assert.match(service, /\.eq\('moderation_status', 'approved'\)/, 'Store features must be approved');
assert.doesNotMatch(service, /matchScore|match_score|user_opportunities|\.insert\(|\.update\(|\.upsert\(|\.delete\(/, 'public features must not invent personal matches or mutate rows');

assert.match(home, /loadPublicDiscoveryFeatures/, 'Home must consume the shared public feature service');
assert.match(home, /title="Opportunities"/, 'Home must expose a first-class Opportunities section');
assert.match(home, /title="New in Store"/, 'Home must expose public new goods');
assert.match(home, /router\.push\('\/opportunities'/, 'Home Opportunities must open the established native route');
assert.match(home, /router\.push\('\/market'/, 'Home Store must open the established native market');
assert.ok(home.indexOf('title="From THE PLUG"') < home.indexOf('title="Opportunities"'), 'Home must preserve the approved editorial story before Opportunities');
assert.doesNotMatch(home, /you match|match score|matched for you/i, 'Home must not claim an unauthenticated or uncomputed opportunity match');

assert.match(discover, /FILTERS = \['For you'/, 'Discover must retain personalised For You filtering');
assert.match(discover, /PUBLIC_DESTINATIONS/, 'Discover must retain the two-tap destination registry');
assert.match(discover, /Open doors for your next move/, 'Discover must provide a rich Opportunities feature');
assert.doesNotMatch(discover, /New goods on PLUGGD|Return to your Library/, 'Discover must not duplicate Home Store goods or the Library gateway');
assert.match(destinations, /id: 'store'[^\n]+route: '\/market'/, 'Discover must retain a concise Store world');
assert.doesNotMatch(destinations, /id: '(?:maps|library)'/, 'Discover must not invent Maps or Library destinations; Maps belongs to Community and Library remains in the account menu');
assert.match(destinations, /dj: require\('[^']*pluggd-dj-discover-banner\.png'/, 'Discover must use the approved PLUGGD DJ banner through the iOS-safe pixel-equivalent asset');
assert.match(discover, /navigate\('\/dj'\)/, 'Discover PLUGGD DJ must open the real native route');
assert.match(discover, /navigate\('\/opportunities'\)/, 'Discover Opportunities must open the established route');

console.log('PASS mobile Home and Discover public parity contract');
