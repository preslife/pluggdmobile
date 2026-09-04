import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const route = read('app/studio/financials/index.tsx');
const screen = read('src/features/studio/StudioFinancialsScreen.tsx');
const service = read('src/features/studio/studioFinancialsService.ts');
const registry = read('src/features/studio/studio-data.ts');
const studioScreens = read('src/features/studio/StudioScreens.tsx');

assert.match(route, /StudioFinancialsScreen/, 'Financials must have a thin native Expo route');
assert.match(screen, /CreatorAccessGate/, 'Financials must retain creator access control');
assert.match(screen, /availableCredits/, 'native Financials must show the verified available Wallet balance');
assert.match(screen, /Recent activity/, 'native Financials must show owner Wallet activity');
assert.match(screen, /Transfers & cash-outs/, 'native Financials must expose real payout lifecycle state');
assert.match(screen, /router\.push\('\/wallet'/, 'common cash actions must route through the existing native Wallet');
assert.match(screen, /buildEmbeddedStudioRoute\('\/studio\/financials'/, 'advanced Financials must use the exact secure Studio module');
assert.match(screen, /Open secure Financials for tax details, statements, exports, bank details, identity checks and payout settings/, 'protected financial controls must state the native/advanced boundary in plain language');
assert.doesNotMatch(screen, /cashOutCredits|purchaseCredits|request_creator_wallet_cashout/, 'the Financials summary must remain read-only');

const financialStart = registry.indexOf("id: 'financials'");
const financialEnd = registry.indexOf('\n  },', financialStart);
const financialDefinition = registry.slice(financialStart, financialEnd);
assert.ok(financialStart >= 0 && financialEnd > financialStart, 'Financials must exist in the authoritative Studio registry');
assert.match(financialDefinition, /route: '\/studio\/financials'/, 'Financials must open its native owner summary');
assert.match(financialDefinition, /studioPath: '\/studio\/financials'/, 'Financials must retain its exact advanced Studio path');
assert.match(financialDefinition, /presentationMode: 'native'/, 'Financials common work must be native');
assert.doesNotMatch(financialDefinition, /route: '\/wallet'/, 'Financials must not collapse into the consumer Wallet route');
assert.match(studioScreens, /'\/studio\/financials'/, 'the Studio drawer must allow the native Financials route');

assert.match(service, /\.rpc\('get_wallet_balance', \{ p_user_id: user\.id \}\)/, 'Wallet balance must use the authenticated user identifier');
assert.match(service, /\.from\('wallet_ledger'\)[\s\S]*\.eq\('user_id', user\.id\)/, 'Wallet activity must be owner scoped');
assert.match(service, /\.from\('payout_records'\)[\s\S]*\.eq\('user_id', user\.id\)/, 'payout records must be owner scoped');
assert.match(service, /\.from\('creator_wallet_cashouts'\)[\s\S]*\.eq\('creator_id', user\.id\)/, 'creator cash-outs must be owner scoped');
assert.match(service, /Promise\.allSettled/, 'Financials must preserve honest partial-data states');
assert.match(service, /partialErrors/, 'partial-data failures must be visible to the creator');
assert.doesNotMatch(service, /\.insert\(|\.update\(|\.upsert\(|\.delete\(|service_role/, 'Financials source verification must be read-only and client safe');

console.log('PASS mobile Studio Financials owner contract');
