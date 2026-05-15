import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const pathFor = (path) => join(root.pathname, path);
const read = (path) => readFileSync(pathFor(path), 'utf8');

assert.ok(
  existsSync(pathFor('src/features/auth/launch-access.ts')),
  'mobile auth must have a launch access service',
);

const launchAccessSource = read('src/features/auth/launch-access.ts');
const authProviderSource = read('src/context/AuthProvider.tsx');
const loginSource = read('app/auth/login.tsx');
const signupSource = read('app/auth/signup.tsx');

for (const rpc of [
  'platform_validate_access_code',
  'platform_redeem_access_code',
  'platform_user_has_launch_access',
  'preaccess_sync_profile_from_submission',
]) {
  assert.match(launchAccessSource, new RegExp(rpc), `${rpc} must be wired in mobile launch access service`);
}

for (const symbol of [
  'normalizeAccessCode',
  'storePendingAccessCode',
  'consumePendingAccessCode',
  'enforceLaunchAccess',
]) {
  assert.match(launchAccessSource, new RegExp(`export (async )?(function|const) ${symbol}`), `${symbol} must be exported`);
}

assert.match(
  authProviderSource,
  /enforceLaunchAccess/,
  'AuthProvider must enforce launch access before accepting a session',
);
assert.match(
  authProviderSource,
  /launchAccessNotice/,
  'AuthProvider must expose launch access denial notice to auth screens',
);

for (const [name, source] of [
  ['login', loginSource],
  ['signup', signupSource],
]) {
  assert.match(source, /Access code/, `${name} screen must include an access-code field`);
  assert.match(source, /storePendingAccessCode/, `${name} screen must store pending access code before auth`);
}

console.log('mobile auth contract verified');
