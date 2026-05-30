import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('../components/MobileHeader.tsx', import.meta.url), 'utf8');

for (const token of [
  'publicProfileRoute',
  "`/creator/${profile.username}`",
  "`/u/${profile.username}`",
  "    : '/edit-profile';",
  "label: 'Studio'",
  "label: 'Account hub'",
  "label: profile?.username ? 'Public page' : 'Edit profile'",
  "label: 'PLUGGD Progress'",
  "label: 'Wallet / Earnings'",
  "label: 'Wallet / Credits'",
  "label: 'Analytics'",
  "label: 'Settings'",
  "label: 'Connect Card'",
  "label: 'Become a Creator'",
  "label: 'Sign out'",
]) {
  assert.match(source, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `Account menu must include ${token}`);
}

assert.doesNotMatch(source, /MyPLUGGD|route:\s*'\/my-pluggd'/, 'Account menu must not expose MyPLUGGD');
assert.doesNotMatch(source, /label:\s*'My Profile'[\s\S]*route:\s*'\/profile'/, 'Account menu must not show My Profile when it would duplicate the private profile route');
assert.doesNotMatch(source, /label:\s*'Wallet'[,}]/, 'Wallet label must follow web AccountMenu copy: Wallet / Credits or Wallet / Earnings');
assert.doesNotMatch(source, /label:\s*'Badges \/ Rewards'/, 'Progress should use web AccountMenu copy: PLUGGD Progress');

console.log('mobile account menu web parity contract verified');
