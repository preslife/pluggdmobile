import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import * as ts from 'typescript';

const repoRoot = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, repoRoot), 'utf8');

function listSourceFiles(dir) {
  const absolute = new URL(dir, repoRoot).pathname;
  const files = [];

  for (const entry of readdirSync(absolute)) {
    if (entry === 'node_modules' || entry.startsWith('.')) continue;
    const path = join(absolute, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      files.push(...listSourceFiles(`${dir}/${entry}`));
    } else if (/\.(tsx|ts)$/.test(entry)) {
      files.push(path);
    }
  }

  return files;
}

const interactiveTags = new Set(['Pressable', 'TouchableOpacity']);
const missingHandlers = [];

for (const file of ['app', 'src', 'components'].flatMap(listSourceFiles)) {
  const source = readFileSync(file, 'utf8');
  const tree = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  const visit = (node) => {
    if (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) {
      const tagName = node.tagName.getText(tree).split('.')[0];
      if (interactiveTags.has(tagName)) {
        const hasOnPress = node.attributes.properties.some(
          (property) => ts.isJsxAttribute(property) && property.name.getText(tree) === 'onPress',
        );

        if (!hasOnPress) {
          const position = tree.getLineAndCharacterOfPosition(node.getStart(tree));
          missingHandlers.push(`${file.replace(repoRoot.pathname, '')}:${position.line + 1}`);
        }
      }
    }

    ts.forEachChild(node, visit);
  };

  visit(tree);
}

assert.deepEqual(missingHandlers, [], `Interactive React Native controls must declare an onPress handler:\n${missingHandlers.join('\n')}`);

const fanSetup = read('app/auth/fan-setup.tsx');
assert.match(fanSetup, /from\('profiles'\)/, 'fan setup suggested creators must load from profiles');
assert.match(fanSetup, /from\('user_follows'\)/, 'fan setup follows must write to user_follows');
assert.doesNotMatch(fanSetup, /SUGGESTED_CREATORS|Maya Sol|Kairo Beats|Selecta Nia/, 'fan setup must not ship hardcoded fake creators');

const login = read('app/auth/login.tsx');
const signup = read('app/auth/signup.tsx');
assert.doesNotMatch(login + signup, /SocialButton|or continue with/, 'auth must not show OAuth buttons unless a provider is wired');
assert.match(login, /resetPasswordForEmail/, 'forgot password must call the Supabase reset flow');

const samplePack = read('app/sample-pack/[id].tsx');
assert.match(samplePack, /from\('sample_pack_purchases'\)/, 'sample pack claim flow must use sample_pack_purchases');
assert.match(samplePack, /router\.push\('\/wallet'/, 'paid sample pack path must route to wallet credits instead of external checkout');

const soundboard = read('app/soundboards/[id].tsx');
assert.match(soundboard, /from\('user_follows'\)/, 'soundboard follow button must follow the linked creator');

assert.match(read('app/social/notifications.tsx'), /href="\/notifications"/, 'legacy social notifications route must go directly to Activity');
assert.match(read('app/social/inbox.tsx'), /href="\/notifications"/, 'legacy inbox route must go directly to Activity until inbox is backed');
assert.match(read('app/settings/index.tsx'), /\/creator-mode/, 'Settings must route creator tools to mobile Creator Mode, not desktop dashboard');

for (const legacyRoute of [
  'app/(tabs)/explore.tsx',
  'app/(tabs)/drops.tsx',
  'app/(tabs)/marketplace.tsx',
  'app/(tabs)/mixes.tsx',
  'app/(tabs)/events.tsx',
  'app/(tabs)/wallet.tsx',
  'app/(tabs)/community.tsx',
  'app/(tabs)/soundboards.tsx',
  'app/(tabs)/profile.tsx',
  'app/(tabs)/social/hub.tsx',
  'app/(tabs)/social/inbox.tsx',
  'app/(tabs)/social/notifications.tsx',
  'app/commerce/crowdfunding.tsx',
  'app/commerce/license-preview.tsx',
  'app/commerce/orders.tsx',
  'app/gamification/battles.tsx',
  'app/gamification/courses.tsx',
  'app/gamification/quests.tsx',
  'app/live/qa.tsx',
  'app/pro/collab.tsx',
  'app/pro/epk.tsx',
  'app/creator/analytics.tsx',
  'app/creator/audience.tsx',
  'app/creator/licensing.tsx',
  'app/creator/payouts.tsx',
  'app/creator/upload.tsx',
]) {
  assert.match(read(legacyRoute), /<Redirect href=/, `${legacyRoute} must intentionally redirect instead of exposing a stale placeholder screen`);
}

console.log('mobile action wiring contract verified');
