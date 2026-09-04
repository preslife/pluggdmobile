import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url).pathname;
const pathFor = (path) => join(root, path);
const read = (path) => readFileSync(pathFor(path), 'utf8');

const requiredRoutes = [
  'app/auth/access-code.tsx',
  'app/(tabs)/stage.tsx',
  'app/(tabs)/live/index.tsx',
  'app/(tabs)/backstage.tsx',
  'app/(tabs)/my-pluggd.tsx',
  'app/backstage/[id].tsx',
  'app/u/[username].tsx',
  'app/creator/[username].tsx',
  'app/user/[userId].tsx',
  'app/notifications.tsx',
  'app/settings/index.tsx',
  'app/search.tsx',
  'app/profile.tsx',
  'app/edit-profile.tsx',
  'app/creator-mode.tsx',
  'app/tickets.tsx',
  'app/purchases.tsx',
  'app/badges.tsx',
  'app/following.tsx',
];

for (const route of requiredRoutes) {
  assert.ok(existsSync(pathFor(route)), `${route} must exist`);
}

const publicProfileSource = read('src/features/profiles/PublicCreatorProfileScreen.tsx');
const mobileServices = read('src/features/culture/mobileServices.ts');
assert.match(publicProfileSource, /loadCreatorProfileBundle/, 'public creator profile must use the shared creator profile bundle service');
for (const label of ['Overview', 'Music', 'Beats', 'Soundboards', 'Gallery', 'Videos', 'Community', 'Membership', 'Shop', 'Shows', 'Live', 'About']) {
  assert.match(publicProfileSource, new RegExp(`label:\\s*'${label}'`), `creator profile must mirror web tab ${label}`);
}
for (const table of ['profiles', 'releases', 'beats', 'sample_packs', 'soundboards', 'user_follows']) {
  assert.match(publicProfileSource + mobileServices, new RegExp(`from\\('${table}'`), `public creator profile bundle must query ${table}`);
}
assert.match(
  mobileServices,
  /loadCreatorMemberships\(profileId, ownerId, viewerId\)/,
  'creator profile membership discovery must query tiers by profile id, route by creator user id and resolve viewer membership state',
);

for (const route of ['app/u/[username].tsx', 'app/creator/[username].tsx', 'app/user/[userId].tsx']) {
  assert.doesNotMatch(read(route), /Redirect/, `${route} must render the shared profile screen, not redirect`);
}

for (const route of [
  'app/beat/[id].tsx',
  'app/backstage/[id].tsx',
  'app/community/boards/[slug].tsx',
  'app/community/events/[id].tsx',
  'app/events/[id].tsx',
  'app/genre/[genre].tsx',
  'app/membership/index.tsx',
  'app/playlists/[id].tsx',
  'app/post/[id].tsx',
  'app/product/[id].tsx',
  'app/release/[id].tsx',
  'app/sample-pack/[id].tsx',
  'app/settings/index.tsx',
  'app/soundboards/[id].tsx',
  'app/tickets.tsx',
  'app/videos/[id].tsx',
]) {
  const source = read(route);
  assert.match(source, /useBottomChromeInset/, `${route} must reserve the shared player and dock inset`);
  assert.match(source, /router\.canGoBack\(\)/, `${route} must provide a safe exit for cold deep links`);
}

for (const route of [
  'app/hashtag/[tag].tsx',
  'app/library.tsx',
  'app/settings/blocked-accounts.tsx',
  'app/settings/data-export.tsx',
  'app/settings/privacy.tsx',
]) {
  assert.match(read(route), /useBottomChromeInset/, `${route} must reserve the shared player and dock inset`);
}

const publicProfile = read('src/features/profiles/PublicCreatorProfileScreen.tsx');
assert.match(publicProfile, /useBottomChromeInset/, 'public profiles must reserve the shared player and dock inset');
assert.match(publicProfile, /router\.canGoBack\(\)/, 'public profile deep links must always expose a working exit');

console.log('mobile route contract verified');
