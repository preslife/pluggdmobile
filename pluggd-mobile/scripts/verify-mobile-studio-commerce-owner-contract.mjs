import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const route = read('app/studio/commerce/index.tsx');
const screen = read('src/features/studio/StudioCommerceScreen.tsx');
const service = read('src/features/studio/studioCommerceService.ts');
const registry = read('src/features/studio/studio-data.ts');
const studio = read('src/features/studio/StudioScreens.tsx');

assert.match(route, /StudioCommerceScreen/, 'Commerce must use a thin native Expo route');
assert.match(screen, /<CreatorAccessGate>/, 'native commerce management must require creator access');
assert.match(screen, /Store[\s\S]*Memberships[\s\S]*Packs/, 'owner commerce must expose Store, Memberships and Pack summaries');
assert.match(screen, /Your shop controls stay separate from checkout[\s\S]*never starts a purchase[\s\S]*App Store checkout/, 'shop controls must state the consumer-purchase boundary in creator-facing language');
assert.match(screen, /\/product\/\$\{product\.id\}[\s\S]*\/membership\/\$\{workspace\.userId\}[\s\S]*\/sample-pack\/\$\{pack\.id\}/, 'public viewing must be separate and explicit for each commerce family');
assert.match(screen, /buildEmbeddedStudioRoute\('\/studio\/store'[\s\S]*buildEmbeddedStudioRoute\('\/studio\/memberships\/plans'[\s\S]*buildEmbeddedStudioRoute\('\/studio\/catalog\?tab=sound-packs'/, 'advanced Store, membership and Pack tools must use exact secure Studio paths');

assert.match(registry, /id: 'store'[\s\S]*route: '\/studio\/commerce\?tab=store'[\s\S]*studioPath: '\/studio\/store'[\s\S]*presentationMode: 'native'[\s\S]*status: 'limited'/, 'Store must use native common work with an exact advanced path');
assert.match(registry, /id: 'memberships'[\s\S]*route: '\/studio\/commerce\?tab=memberships'[\s\S]*studioPath: '\/studio\/memberships\/plans'[\s\S]*presentationMode: 'native'[\s\S]*status: 'limited'/, 'Memberships must use native common work with an exact advanced path');
assert.match(registry, /id: 'sound_packs'[\s\S]*route: '\/studio\/commerce\?tab=packs'[\s\S]*studioPath: '\/studio\/catalog\?tab=sound-packs'[\s\S]*presentationMode: 'native'[\s\S]*status: 'limited'/, 'Packs must use native common work with an exact advanced path');
assert.match(registry, /id: 'merch'[\s\S]*route: '\/studio\/commerce\?tab=store'[\s\S]*studioPath: '\/studio\/catalog\?tab=merch'[\s\S]*presentationMode: 'native'[\s\S]*status: 'limited'/, 'Merchandise must use native common work with exact advanced inventory tools');
assert.match(studio, /STUDIO_MENU_NATIVE_ROUTE_PATHS[\s\S]*'\/studio\/commerce'/, 'the native Studio drawer must allowlist owner commerce');

assert.match(service, /from\('store_products'\)[\s\S]*\.eq\('creator_id', userId\)/, 'Store products must load only for the authenticated creator');
assert.match(service, /from\('membership_tiers'\)[\s\S]*\.eq\('owner_type', 'profile'\)\.eq\('owner_id', profileId\)/, 'Membership tiers must load by exact authenticated profile owner');
assert.match(service, /from\('sample_packs'\)[\s\S]*\.eq\('user_id', userId\)/, 'Packs must load only for the authenticated creator');
assert.match(service, /submitStoreProductForReview[\s\S]*from\('store_submissions'\)[\s\S]*status: 'submitted'[\s\S]*data\.status !== 'submitted'/, 'Store publication must use the review contract and wait for acknowledgement');
assert.match(service, /hideStoreProduct[\s\S]*visibility: 'hidden'[\s\S]*\.eq\('creator_id', userId\)[\s\S]*data\.visibility !== 'hidden'/, 'Store hiding must be exact-owner and backend-confirmed');
assert.match(service, /setMembershipTierActive[\s\S]*\.eq\('owner_type', 'profile'\)[\s\S]*\.eq\('owner_id', profileId\)[\s\S]*data\.status !== status/, 'Membership state must be exact-owner and backend-confirmed');
assert.match(service, /setSamplePackActive[\s\S]*approval_status !== 'approved'[\s\S]*\.eq\('user_id', userId\)[\s\S]*data\.is_active !== active/, 'Pack activation must require approval, exact ownership and acknowledgement');
assert.doesNotMatch(service + screen, /openURL\([^)]*(checkout|purchase)|stripe\.checkout|service_role|SUPABASE_SERVICE_ROLE/, 'owner commerce must not expose external digital checkout or privileged credentials');

console.log('PASS mobile Studio commerce owner contract');
