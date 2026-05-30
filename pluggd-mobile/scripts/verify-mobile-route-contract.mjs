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
for (const label of ['Overview', 'Music', 'Beats', 'Soundboards', 'Gallery', 'Videos', 'Community', 'Shop', 'Shows', 'Live', 'About']) {
  assert.match(publicProfileSource, new RegExp(`label:\\s*'${label}'`), `creator profile must mirror web tab ${label}`);
}
for (const table of ['profiles', 'releases', 'beats', 'sample_packs', 'soundboards', 'user_follows']) {
  assert.match(publicProfileSource + mobileServices, new RegExp(`from\\('${table}'`), `public creator profile bundle must query ${table}`);
}

for (const route of ['app/u/[username].tsx', 'app/creator/[username].tsx', 'app/user/[userId].tsx']) {
  assert.doesNotMatch(read(route), /Redirect/, `${route} must render the shared profile screen, not redirect`);
}

console.log('mobile route contract verified');
