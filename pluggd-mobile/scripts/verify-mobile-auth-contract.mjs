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
assert.ok(
  existsSync(pathFor('src/features/auth/apple-sign-in.ts')),
  'mobile auth must have a native Sign in with Apple service',
);
assert.ok(
  existsSync(pathFor('components/AppleSignInButton.tsx')),
  'mobile auth must use Apple’s official authentication button',
);

const launchAccessSource = read('src/features/auth/launch-access.ts');
const appleAuthSource = read('src/features/auth/apple-sign-in.ts');
const googleAuthSource = read('src/features/auth/google-sign-in.ts');
const socialConsentSource = read('src/features/auth/social-auth-consent.ts');
const appleButtonSource = read('components/AppleSignInButton.tsx');
const authProviderSource = read('src/context/AuthProvider.tsx');
const loginSource = read('app/auth/login.tsx');
const signupSource = read('app/auth/signup.tsx');
const appConfigSource = read('app.config.ts');

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
  assert.match(source, /AppleSignInButton/, `${name} screen must expose native Apple authentication`);
}

assert.match(appConfigSource, /usesAppleSignIn:\s*true/, 'iOS must declare Sign in with Apple');
assert.match(appConfigSource, /expo-apple-authentication/, 'Expo must install the Apple authentication capability');
assert.match(appleButtonSource, /AppleAuthenticationButton/, 'Apple auth must use Apple’s official button');
assert.match(appleAuthSource, /getRandomBytesAsync/, 'Apple auth must generate a cryptographic nonce and state');
assert.match(appleAuthSource, /CryptoDigestAlgorithm\.SHA256/, 'Apple auth must hash the nonce sent to Apple');
assert.match(appleAuthSource, /credential\.state !== expectedState/, 'Apple auth must verify returned state');
assert.match(appleAuthSource, /signInWithIdToken/, 'Apple identity tokens must be verified by Supabase Auth');
assert.match(appleAuthSource, /nonce:\s*rawNonce/, 'Supabase must receive the unhashed nonce for verification');
assert.match(appleAuthSource, /full_name/, 'Apple’s one-time full name must be persisted');

for (const [provider, source] of [
  ['Apple', appleAuthSource],
  ['Google', googleAuthSource],
]) {
  assert.match(source, /consent:\s*SocialAuthConsent/, `${provider} auth must require an explicit consent object`);
  assert.match(source, /requireSocialAuthConsent\(consent\)/, `${provider} auth must enforce consent before OAuth`);
}
assert.match(
  socialConsentSource,
  /if \(!consent\.minimumAgeConfirmed\)/,
  'social OAuth must fail closed without explicit minimum-age confirmation',
);
assert.match(signupSource, /accessibilityRole="checkbox"/, 'signup must expose an accessible explicit age checkbox');
assert.match(signupSource, /minimumAgeConfirmed:\s*ageConfirmed/, 'signup social auth must pass the user-controlled age state');
assert.match(loginSource, /performGoogleLogin\(true\)/, 'Google login must start only from the explicit confirmation action');
assert.match(loginSource, /performAppleLogin\(true\)/, 'Apple login must start only from the explicit confirmation action');

console.log('mobile auth contract verified');
