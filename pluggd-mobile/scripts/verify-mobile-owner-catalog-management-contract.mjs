import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const route = read('app/studio/catalog/[kind]/[id].tsx');
const screen = read('src/features/studio/OwnerCatalogScreen.tsx');
const service = read('src/features/studio/ownerCatalogService.ts');
const studioData = read('src/features/studio/studio-data.ts');

assert.match(route, /OwnerCatalogScreen/, 'owner catalogue route must remain a thin native route');
assert.match(screen, /<CreatorAccessGate>/, 'owner catalogue management must require creator access');
assert.match(studioData, /route: `\/studio\/catalog\/release\/\$\{item\.id\}`/, 'owned releases must route to their native owner workspace');
assert.match(studioData, /route: `\/studio\/catalog\/beat\/\$\{item\.id\}`/, 'owned beats must route to their native owner workspace');
assert.match(studioData, /route: `\/studio\/catalog\/mix\/\$\{item\.id\}`/, 'owned mixes must route to their native owner workspace');
assert.match(studioData, /from\('mixes'\)[\s\S]*\.eq\('owner_user_id', userId\)/, 'Studio must query mixes by their canonical owner column');

assert.match(service, /\.eq\(ownerColumn, userId\)\.maybeSingle\(\)/, 'workspace loads must confirm exact authenticated ownership');
assert.match(service, /liveEdit[\s\S]*status: 'submitted'[\s\S]*approved: false[\s\S]*visibility_status: 'staged'/, 'editing a public release must return it to moderation');
assert.match(service, /distribution_rights_confirmed[\s\S]*status: 'submitted'/, 'release submission must require confirmed distribution rights');
assert.match(service, /moderation_status === 'approved'[\s\S]*is_published: true/, 'beats must only publish directly after moderation approval');
assert.match(service, /moderation_status: 'under_review'/, 'unapproved beats must enter moderation rather than bypass it');
assert.match(service, /status: 'published'[\s\S]*published_at: new Date\(\)\.toISOString\(\)/, 'mix publication must receive backend-confirmed published state');
assert.match(service, /status: 'archived'[\s\S]*visibility: 'private'/, 'mix removal must use the real reversible archive state');
assert.match(service, /status: 'hidden'[\s\S]*visibility_status: 'hidden'/, 'release removal must use the existing hidden state');
assert.match(service, /duplicateOwnerCatalogRecord[\s\S]*status: 'draft'/, 'duplication must create private drafts');
assert.match(service, /trackResult\.error[\s\S]*from\('releases'\)\.delete/, 'partial release duplication must compensate only the newly created copy');

assert.match(screen, /Replace artwork[\s\S]*Replace audio/, 'owner workspace must expose real asset replacement');
assert.match(screen, /New track title[\s\S]*Choose audio and add track/, 'release management must add real tracks with audio');
assert.match(screen, /Move .* up|keyboard-arrow-up/, 'release management must expose track ordering');
assert.match(screen, /Distribution rights confirmed/, 'release management must expose rights confirmation');
assert.match(screen, /Available licence tiers/, 'beat management must expose licence configuration');
assert.match(screen, /Remove from public[\s\S]*reversible/, 'public removal must be explicitly reversible');
assert.match(screen, /Duplicate as draft/, 'owner catalogues must expose safe duplication');
assert.match(screen, /View public presentation/, 'public viewing must remain a separate explicit action');
assert.doesNotMatch(screen + studioData, />Preview<|Desktop Tools/, 'Studio owner flows must not use legacy Preview or Desktop Tools semantics');
assert.doesNotMatch(service, /service_role|SUPABASE_SERVICE_ROLE/, 'native owner management must never contain a service-role credential');

console.log('PASS mobile owner catalog management contract');
