import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const accountMenu = read('components/AccountMenuButton.tsx');
const discoveryHeader = read('src/features/discovery/DiscoveryHeader.tsx');
const fanHub = read('src/features/mypluggd/my-pluggd-screen.tsx');
const navigation = read('src/lib/mobileNavigation.ts');
const roleSelection = read('app/auth/role.tsx');
const studio = read('src/features/studio/StudioScreens.tsx');

assert.match(discoveryHeader, /AccountMenuButton/, 'Discovery header avatar must open the shared account menu');
assert.match(fanHub, /AccountMenuButton/, 'My PLUGGD avatar must open the shared account menu');
assert.match(accountMenu, /if \(creatorAccess\)[\s\S]*label: 'Studio'/, 'Studio account action must be creator-only');
assert.match(accountMenu, /else \{[\s\S]*label: 'Become a Creator'[\s\S]*route: '\/auth\/role'/, 'Fans must be routed into role setup instead of Studio');

assert.match(navigation, /selectedRoles\.length > 0[\s\S]*return Array\.from\(new Set\(selectedRoles\)\)/, 'Explicit onboarding roles must override stale legacy creator flags');
assert.match(navigation, /if \(profileType\)[\s\S]*\[profileType\]/, 'An explicit Fan profile type must not be unioned with old creator metadata');
assert.match(roleSelection, /\.from\('profile_roles'\)[\s\S]*\.delete\(\)[\s\S]*\.eq\('user_id', userId\)/, 'Role changes must remove obsolete role rows before saving the new set');

assert.match(studio, /function StudioExitButton[\s\S]*accessibilityLabel="Exit Studio"[\s\S]*router\.replace\('\/'/, 'Every Studio shell must provide a deterministic exit to PLUGGD');
assert.match(studio, /AccountMenuButton context="studio"/, 'Studio account pill must be interactive and open the canonical account menu');
assert.match(studio, /if \(!query\.data\.creatorAccess\) return <AccessState/, 'Studio routes must fail closed when creator access is absent');

console.log('mobile account and Studio navigation contract verified');
