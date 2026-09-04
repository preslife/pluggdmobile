import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const studioData = read('src/features/studio/studio-data.ts');
const studioScreens = read('src/features/studio/StudioScreens.tsx');
const studioBrowser = read('src/features/studio/StudioBrowserScreen.tsx');
const modulePreferences = read('src/features/studio/studioModulePreferences.ts');
const authProvider = read('src/context/AuthProvider.tsx');
const browserRoute = read('app/studio/browser.tsx');

for (const [moduleId, studioPath, presentationMode = 'embedded'] of [
  ['venues', '/studio/events?tab=venues'],
  ['event_applications', '/studio/events?tab=applications'],
  ['opportunities', '/studio/opportunities'],
  ['the_plug', '/studio/the-plug'],
  ['analytics_revenue', '/studio/analytics/revenue'],
  ['embeds', '/studio/embeds'],
  ['financials', '/studio/financials', 'native'],
  ['collaborations', '/studio/collaborations/gigs'],
  ['crm', '/studio/crm/contacts'],
  ['store', '/studio/store', 'native'],
  ['storefront', '/studio/storefront/themes'],
  ['memberships', '/studio/memberships/plans', 'native'],
  ['crowdfunding', '/studio/crowdfunding/campaigns'],
  ['courses', '/studio/courses/builder'],
  ['sound_packs', '/studio/catalog?tab=sound-packs', 'native'],
  ['merch', '/studio/catalog?tab=merch', 'native'],
  ['bundles', '/studio/catalog?tab=bundles'],
  ['collectibles', '/studio/catalog?tab=collectibles'],
  ['licenses', '/studio/licenses'],
  ['plugins', '/studio/plugins/connect'],
  ['shows', '/studio/shows'],
  ['partnerships', '/studio/partnerships/marketplace'],
]) {
  const start = studioData.indexOf(`id: '${moduleId}'`);
  const end = studioData.indexOf('\n  },', start);
  assert.ok(start >= 0 && end > start, `${moduleId} must exist in the authoritative native Studio registry`);
  const definition = studioData.slice(start, end);
  assert.ok(definition.includes(`studioPath: '${studioPath}'`), `${moduleId} must target ${studioPath}`);
  assert.ok(
    definition.includes(`presentationMode: '${presentationMode}'`),
    `${moduleId} must use the ${presentationMode} presentation mode`,
  );
  assert.doesNotMatch(definition, /route: '\/(?:market|membership|profile|sample-packs)/, `${moduleId} owner management must not route to a public fan surface`);
}

{
  const start = studioData.indexOf("id: 'videos'");
  const end = studioData.indexOf('\n  },', start);
  const definition = studioData.slice(start, end);
  assert.ok(start >= 0 && end > start, 'videos must exist in the authoritative native Studio registry');
  assert.match(definition, /route: '\/studio\/videos'/, 'frequent video owner actions must open the native Videos workspace');
  assert.match(definition, /studioPath: '\/studio\/videos'/, 'advanced video tools must retain the exact Studio path');
  assert.match(definition, /presentationMode: 'native'/, 'video catalogue and basic publishing must use the native presentation mode');
}

assert.match(studioData, /buildEmbeddedStudioRoute[\s\S]*isAllowlistedStudioPath/, 'embedded routes must be constructed through the allowlisted Studio route builder');
assert.match(studioData, /route: module\.route[\s\S]*status: 'web_only'/, 'advanced Studio actions must retain their working in-app route');
assert.doesNotMatch(studioScreens + studioData, /Desktop Tools|label="Desktop"|desktop Studio/i, 'visible native Studio semantics must not refer to Preview or Desktop tooling');
assert.doesNotMatch(studioScreens, /Linking\.openURL\('https:\/\/pluggd\.fm\/studio/, 'Studio owner actions must never send the creator to Safari');
assert.match(studioScreens, /SectionTitle title="More creator tools"/, 'advanced embedded modules must use creator-facing Studio semantics');

assert.match(modulePreferences, /creator_studio_module_preferences/, 'Studio module preferences must be server backed');
assert.match(modulePreferences, /readLocalStudioModulePreferences/, 'existing local choices must be available for the one-time migration');
assert.match(modulePreferences, /\.upsert\(initialRows, \{ onConflict: 'user_id,module_identifier', ignoreDuplicates: true \}\)/, 'local preferences must initialise the server record once without overwriting another device');
assert.match(modulePreferences, /cacheStudioModulePreferences/, 'server state must retain an offline cache');

assert.match(studioBrowser, /mobile-studio-handoff/, 'native Studio browser must request the route-bound one-time handoff');
assert.match(studioBrowser, /target_path: targetPath/, 'the handoff must be bound to the selected Studio path');
assert.match(studioBrowser, /\/mobile-studio-handoff#\$\{fragment\}/, 'one-time handoff material must remain in the URL fragment');
assert.doesNotMatch(studioBrowser, /access_token|refresh_token/, 'native Studio browser must never place Supabase session tokens in source URLs or storage');
assert.match(studioBrowser, /parsed\.host !== STUDIO_HOST/, 'external hosts must be intercepted');
assert.match(studioBrowser, /parsed\.pathname\.startsWith\('\/auth'\)/, 'expired web sessions must return a deliberate native state');
assert.match(studioBrowser, /onError[\s\S]*onHttpError[\s\S]*onContentProcessDidTerminate/, 'network, HTTP, and renderer failures must all have a recoverable native state');
assert.match(studioBrowser, /width: 44[\s\S]*height: 44/, 'Studio browser chrome controls must preserve 44pt targets');
assert.match(browserRoute, /StudioBrowserScreen/, 'the secure browser must have a dedicated native route');
assert.match(authProvider, /action: 'revoke'/, 'sign-out must revoke outstanding one-time Studio handoffs');

console.log('PLUGGD mobile Studio complete-parity foundation contract verified');
