import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

function load(path, dependencies = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const module = { exports: {} };
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(compiled.diagnostics?.length ?? 0, 0, `${path}: invalid TypeScript`);
  vm.runInNewContext(compiled.outputText, {
    module, exports: module.exports, URL, URLSearchParams, Error,
    require(name) {
      assert.ok(name in dependencies, `Unexpected dependency: ${name}`);
      return dependencies[name];
    },
  }, { filename: path });
  return module.exports;
}

const helper = load('src/features/auth/google-auth-session-url.ts');
const callback = 'pluggd://auth/callback';
const providerUrl = `https://qkwvqmubhyondemhasjp.supabase.co/auth/v1/authorize?${new URLSearchParams({
  provider: 'google', redirect_to: callback, prompt: 'select_account',
})}`;
const iosUrl = helper.googleAuthSessionUrl(providerUrl, callback, 'ios');
assert.equal(new URL(iosUrl).origin, 'https://pluggd.fm');
assert.equal(new URL(iosUrl).pathname, '/auth/mobile/google');
assert.equal(iosUrl.includes('supabase'), false);
assert.equal(new URL(iosUrl).search, new URL(providerUrl).search);
assert.equal(helper.googleAuthSessionUrl(providerUrl, callback, 'android'), providerUrl);
const pkce = new URL(providerUrl);
pkce.searchParams.set('code_challenge', 'a'.repeat(43));
pkce.searchParams.set('code_challenge_method', 's256');
assert.equal(new URL(helper.googleAuthSessionUrl(pkce.href, callback, 'ios')).search, pkce.search);
for (const url of [
  'not-a-url',
  providerUrl.replace('https://', 'http://'),
  providerUrl.replace('qkwvqmubhyondemhasjp.supabase.co', 'attacker.example'),
  providerUrl.replace('/authorize?', '/token?'),
  providerUrl.replace('provider=google', 'provider=apple'),
  providerUrl.replace('https://', 'https://unexpected@'),
  `${providerUrl}#access_token=unexpected`,
]) {
  assert.throws(() => helper.googleAuthSessionUrl(url, callback, 'ios'), /could not be started/);
}
assert.throws(() => helper.googleAuthSessionUrl(providerUrl, 'pluggd://other', 'ios'), /could not be started/);

function flow({ platform = 'ios', browser = { type: 'success', url: `${callback}?code=returned-code` }, url = providerUrl } = {}) {
  const calls = [];
  const user = { created_at: '2020-01-01T00:00:00Z', user_metadata: { retained: true } };
  const supabase = { auth: {
    async signInWithOAuth(options) { calls.push(['oauth', options]); return { data: { url }, error: null }; },
    async exchangeCodeForSession(code) { calls.push(['exchange', code]); return { data: { user }, error: null }; },
    async setSession(tokens) { calls.push(['session', tokens]); return { data: { user }, error: null }; },
    async updateUser(metadata) { calls.push(['metadata', metadata]); return { error: null }; },
  } };
  const auth = load('src/features/auth/google-sign-in.ts', {
    'expo-linking': { createURL: path => { assert.equal(path, 'auth/callback'); return callback; } },
    'expo-web-browser': {
      maybeCompleteAuthSession() {},
      WebBrowserPresentationStyle: { PAGE_SHEET: 'pageSheet' },
      async openAuthSessionAsync(...args) { calls.push(['browser', ...args]); return browser; },
    },
    'react-native': { Platform: { OS: platform } },
    '../../lib/supabase': { supabase },
    './google-auth-session-url': helper,
    './social-auth-consent': {
      requireSocialAuthConsent(consent) { if (!consent.minimumAgeConfirmed) throw new Error('Consent required'); },
    },
  });
  return { auth, calls };
}

for (const platform of ['ios', 'android']) {
  const { auth, calls } = flow({ platform });
  assert.equal((await auth.signInWithGoogle({ minimumAgeConfirmed: true })).isNewUser, false);
  const browser = calls.find(call => call[0] === 'browser');
  assert.equal(browser[1], platform === 'ios' ? iosUrl : providerUrl);
  assert.equal(browser[2], callback);
  assert.equal(browser[3].preferEphemeralSession, false);
  assert.equal(calls.find(call => call[0] === 'oauth')[1].options.skipBrowserRedirect, true);
  assert.equal(calls.find(call => call[0] === 'exchange')[1], 'returned-code');
  assert.equal(calls.find(call => call[0] === 'metadata')[1].data.retained, true);
}
for (const type of ['cancel', 'dismiss']) {
  const { auth, calls } = flow({ browser: { type } });
  await assert.rejects(auth.signInWithGoogle({ minimumAgeConfirmed: true }), error => auth.isGoogleSignInCancellation(error));
  assert.equal(calls.some(call => ['exchange', 'session', 'metadata'].includes(call[0])), false);
}
const implicit = flow({ browser: { type: 'success', url: `${callback}#access_token=fixture-access&refresh_token=fixture-refresh` } });
await implicit.auth.signInWithGoogle({ minimumAgeConfirmed: true });
assert.equal(implicit.calls.find(call => call[0] === 'session')[1].access_token, 'fixture-access');
assert.equal(implicit.calls.some(call => call[0] === 'exchange'), false);
const denied = flow({ browser: { type: 'success', url: `${callback}?error_description=Access%20denied` } });
await assert.rejects(denied.auth.signInWithGoogle({ minimumAgeConfirmed: true }), /Access denied/);
assert.equal(denied.calls.some(call => call[0] === 'metadata'), false);
const noConsent = flow();
await assert.rejects(noConsent.auth.signInWithGoogle({ minimumAgeConfirmed: false }), /Consent required/);
assert.equal(noConsent.calls.length, 0);
const invalidUrl = flow({ url: 'https://attacker.example/authorize' });
await assert.rejects(invalidUrl.auth.signInWithGoogle({ minimumAgeConfirmed: true }), /could not be started/);
assert.equal(invalidUrl.calls.some(call => call[0] === 'browser'), false);

console.log('Google auth session verified: branded iOS entry, unchanged Android, PKCE parameters, consent, code/token returns and cancellation.');
