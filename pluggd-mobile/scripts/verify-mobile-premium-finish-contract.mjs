import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const primitives = read('components/PluggdPrimitives.tsx');
const home = read('src/features/home/live-music-dashboard-home.tsx');
const parityScreens = read('src/features/parity/AppWideParityScreens.tsx');
const createSheet = read('components/CreateActionSheet.tsx');
const accountHeader = read('components/MobileHeader.tsx');
const dock = read('components/PluggdDock.tsx');

for (const exportName of [
  'PremiumScreenBackdrop',
  'PremiumScreenHeader',
  'PremiumHeroCard',
  'PremiumMediaRail',
  'PremiumListRow',
  'PremiumEmptyState',
]) {
  assert.match(primitives, new RegExp(`export function ${exportName}`), `${exportName} must exist as a shared premium screen primitive`);
}

for (const token of [
  'expo-linear-gradient',
  'PluggdImage',
  'theme.colors.artworkBase',
  'borderRadius: pluggdRadii.sheet',
  'minHeight: 44',
  'fontVariant',
]) {
  assert.match(primitives, new RegExp(escapeRegExp(token)), `premium primitives must include ${token}`);
}

assert.match(home, /PremiumScreenBackdrop/, 'Home must use the shared premium backdrop');
assert.match(parityScreens, /LinearGradient[\s\S]*PluggdImage[\s\S]*Hero[\s\S]*SectionBlock/, 'Discover, Community, Events and Market must use the artwork-led parity shell');

assert.match(home, /PremiumHeroCard/, 'Home must use the shared premium hero for the front-door spotlight');
for (const exportName of ['DiscoverParityScreen', 'CommunityParityScreen', 'EventsParityScreen', 'MarketParityScreen']) {
  assert.match(parityScreens, new RegExp(`export function ${exportName}`), `${exportName} must remain a premium web-parity surface`);
}
assert.match(createSheet, /hasCreatorAccess[\s\S]*router\.push\('\/create'|Become a Creator|Studio/, 'Create must be exposed through role-aware floating action, not a dock tab');
for (const accountRoute of ['Wallet / Credits', 'Wallet / Earnings', 'Memberships', 'Tickets', 'Settings', 'Inbox', 'Activity']) {
  assert.match(accountHeader, new RegExp(escapeRegExp(accountRoute)), `Account menu must retain ${accountRoute}`);
}

for (const label of ['Home', 'Discover', 'Community', 'Events', 'Market']) {
  assert.match(dock, new RegExp(`label:\\s*'${label}'`), `premium finish must keep ${label} in the locked web-parity dock`);
}
assert.doesNotMatch(dock, /label:\s*'(Explore|Create|Profile|Stage|Live|Backstage|MyPLUGGD|Search)'/, 'premium finish must not regress the locked web-parity dock');
assert.doesNotMatch(home + parityScreens + createSheet + accountHeader, /generic card-heavy|Lorem|\bFictional\b|\bTicketmaster\b|\bSpotify\b|\bTikTok\b|\bDICE\b/i, 'finished core surfaces must avoid placeholder or third-party mockup language');

console.log('mobile premium finish contract verified');
