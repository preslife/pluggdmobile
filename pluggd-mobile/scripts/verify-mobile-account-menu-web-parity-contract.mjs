import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const header = readFileSync(new URL('../components/MobileHeader.tsx', import.meta.url), 'utf8');
const source = readFileSync(new URL('../components/AccountMenuButton.tsx', import.meta.url), 'utf8');

assert.match(header, /AccountMenuButton/, 'Every shared mobile header avatar must open the canonical account menu');

for (const token of [
  'publicProfileRoute',
  "`/creator/${profile.username}`",
  "`/u/${profile.username}`",
  "    : '/edit-profile';",
  "label: 'Go Live'",
  "route: '/live/create'",
  "label: 'Create'",
  "route: '/create'",
  "label: 'Studio'",
  "label: 'My PLUGGD'",
  "route: '/my-pluggd'",
  "label: profile?.username ? 'Public page' : 'Edit profile'",
  "label: 'PLUGGD Progress'",
  "label: 'Wallet / Earnings'",
  "label: 'Wallet / Credits'",
  "label: 'Library'",
  "route: '/library'",
  "label: 'Purchases & Access'",
  "route: '/purchases'",
  "label: 'Memberships'",
  "label: 'Tickets'",
  "label: 'Restore Purchases'",
  "label: 'Analytics'",
  "label: 'Settings'",
  "label: 'Connect Card'",
  "label: 'Become a Creator'",
  "label: 'Sign out'",
  "label: 'Back to PLUGGD'",
]) {
  assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Account menu must include ${token}`);
}

assert.doesNotMatch(source, /label:\s*'My Profile'[\s\S]*route:\s*'\/profile'/, 'Account menu must not show My Profile when it would duplicate the private profile route');
assert.doesNotMatch(source, /label:\s*'Wallet'[,}]/, 'Wallet label must follow web AccountMenu copy: Wallet / Credits or Wallet / Earnings');
assert.doesNotMatch(source, /label:\s*'Badges \/ Rewards'/, 'Progress should use web AccountMenu copy: PLUGGD Progress');
assert.match(source, /creatorAccess[\s\S]*label: 'Studio'/, 'Studio must only be added for creator-capable accounts');
assert.match(source, /else \{[\s\S]*label: 'Become a Creator'[\s\S]*route: '\/auth\/role'/, 'Fan accounts must receive creator onboarding instead of Studio');

console.log('mobile account menu web parity contract verified');
