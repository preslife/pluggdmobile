import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
const ts = require('typescript');
function load(path, mocks = {}) {
  const source = readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');
  const result = ts.transpileModule(source, { fileName: path, reportDiagnostics: true,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } });
  assert.equal(result.diagnostics?.filter((item) => item.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext(result.outputText, { module, exports: module.exports, Date, Set, Map, Error, Promise, console,
    require(name) { assert.ok(Object.hasOwn(mocks, name), `Unexpected import: ${name}`); return mocks[name]; } }, { filename: path });
  return module.exports;
}
const features = load('src/lib/planFeatures.ts');
let cases = 0;
async function check(label, run) { await run(); cases += 1; console.log(`PASS ${label}`); }
const plain = (value) => JSON.parse(JSON.stringify(value));

await check('all 17 canonical feature thresholds across Free, Starter, Creator and Pro', () => {
  const ranks = { free: 0, starter: 1, creator: 2, pro: 3 };
  assert.equal(Object.keys(features.PLAN_FEATURE_MINIMUM_TIER).length, 17);
  for (const [feature, minimum] of Object.entries(features.PLAN_FEATURE_MINIMUM_TIER)) {
    for (const [tier, rank] of Object.entries(ranks)) assert.equal(features.planAllowsFeature(tier, feature), rank >= ranks[minimum]);
  }
  assert.equal(features.planAllowsFeature('unexpected', 'sell_merch'), false);
  assert.deepEqual(plain(features.readPlanRequirement({ hint: 'plan_required:creator:sell_tickets' })), { tier: 'creator', feature: 'sell_tickets' });
});

let listingCalls = [];
let hidden = ['review'];
let pro = ['pro-a', { pro_member_ids: 'pro-b' }];
let failListing = null;
const listings = load('src/lib/creatorListings.ts', { './supabase': { supabase: {
  async rpc(name, args) { listingCalls.push([name, args]); return name === failListing ? { error: {} } : { data: name === 'hidden_listing_ids' ? hidden : pro }; },
} } });
await check('hidden reviewers excluded; Pro first; original order and canonical user identities retained', async () => {
  const rows = [{ user_id: 'ordinary-a' }, { user_id: 'review' }, { user_id: 'pro-b', id: 'different-profile-id' }, { user_id: 'ordinary-b' }, { user_id: 'pro-a' }];
  const result = await listings.prepareCreatorListings(rows);
  assert.deepEqual(plain(result.map((row) => row.user_id)), ['pro-b', 'pro-a', 'ordinary-a', 'ordinary-b']);
  assert.equal(result[0].id, 'different-profile-id');
  assert.equal(result[0].is_pro, true);
  assert.equal(rows[2].is_pro, undefined);
  assert.ok(!listingCalls[0][1].p_user_ids.includes('different-profile-id'));
});
await check('listing metadata covers more than 1000 candidates without truncation', async () => {
  listingCalls = []; hidden = []; pro = [];
  const result = await listings.prepareCreatorListings(Array.from({ length: 1001 }, (_, index) => ({ user_id: `u${index}` })));
  assert.equal(result.length, 1001);
  assert.deepEqual(listingCalls.map((call) => call[1].p_user_ids.length).sort((a, b) => a - b), [1, 1, 1000, 1000]);
});
await check('hidden lookup failure withholds public listings', async () => {
  failListing = 'hidden_listing_ids';
  await assert.rejects(listings.prepareCreatorListings([{ user_id: 'review' }]), /listings could not be checked/);
});
await check('Pro lookup failure keeps safe listings without an invented label', async () => {
  failListing = 'pro_member_ids'; hidden = ['review'];
  const result = await listings.prepareCreatorListings([{ user_id: 'ordinary' }, { user_id: 'review' }]);
  assert.deepEqual(plain(result), [{ user_id: 'ordinary', is_pro: false }]);
});

let allowance = 5;
let used = 4;
let permitted = true;
let failPlan = false;
const planCalls = [];
const access = load('src/lib/creatorPlanAccess.ts', { './planFeatures': features, './supabase': { supabase: {
  async rpc(name, args) { planCalls.push([name, args]); return failPlan ? { error: {} } : { data: name === 'plan_allows' ? permitted : allowance }; },
  from(table) {
    planCalls.push(['from', table]);
    return { select(...args) { planCalls.push(['select', args]); return this; }, eq(...args) { planCalls.push(['eq', args]); return this; },
      async gte(...args) { planCalls.push(['gte', args]); return { count: used }; } };
  },
} } });
await check('feature gate follows server decisions, including admin and promotional access', async () => {
  await access.requireCreatorPlanFeature('actor', 'sell_tickets');
  assert.deepEqual(plain(planCalls[0]), ['plan_allows', { p_user_id: 'actor', p_feature: 'sell_tickets' }]);
  permitted = false;
  await assert.rejects(access.requireCreatorPlanFeature('actor', 'sell_tickets'), /Available on the Creator plan/);
});
await check('plan lookup error fails before any save', async () => {
  failPlan = true;
  await assert.rejects(access.requireCreatorPlanFeature('actor', 'sell_tickets'), /plan could not be checked/);
  failPlan = false;
});
await check('monthly boundary, UTC scope and exact owner count match release rules', async () => {
  planCalls.length = 0;
  await access.requireCreatorMonthlyAllowance('actor', 'release');
  assert.deepEqual(plain(planCalls[0]), ['plan_monthly_limit', { p_user_id: 'actor', p_key: 'max_releases_per_month' }]);
  assert.ok(planCalls.some(([kind, args]) => kind === 'eq' && args[0] === 'user_id' && args[1] === 'actor'));
  const now = new Date();
  assert.equal(planCalls.find(([kind]) => kind === 'gte')[1][1], new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString());
  used = 5;
  await assert.rejects(access.requireCreatorMonthlyAllowance('actor', 'release'), /5 releases a month/);
});
await check('unlimited skips count, collaboration threshold uses its own configured key', async () => {
  allowance = -1; planCalls.length = 0;
  await access.requireCreatorMonthlyAllowance('actor', 'release');
  assert.equal(planCalls.length, 1);
  allowance = 1; used = 1; planCalls.length = 0;
  await assert.rejects(access.requireCreatorMonthlyAllowance('actor', 'collaboration'), /1 collaboration post a month/);
  assert.equal(planCalls[0][1].p_key, 'max_collab_posts_per_month');
});
await check('missing usage evidence does not silently permit another upload', async () => {
  used = null;
  await assert.rejects(access.requireCreatorMonthlyAllowance('actor', 'release'), /allowance could not be checked/);
});

let analyticsTier = 'starter';
let tableReads = [];
const today = new Date().toISOString().slice(0, 10);
const metric = { metric_date: today, sales_revenue_cents: 100, plays_count: 8, post_likes: 3, audience_geo: { GB: 2 }, retention_30d: 20 };
const analytics = load('src/features/studio/studioAnalyticsService.ts', {
  '../../lib/creatorPlanAccess': {
    async requireCreatorPlanFeature() { if (analyticsTier === 'free') throw new Error('Available on the Starter plan or above.'); },
    async creatorPlanAllows() { return analyticsTier === 'creator'; },
  },
  '../../lib/supabase': { supabase: {
    auth: { async getUser() { return { data: { user: { id: 'actor' } } }; } },
    from(table) {
      const record = { table, select: null }; tableReads.push(record);
      const query = {
        select(columns) { record.select = columns; return this; }, eq() { return this; }, gte() { return this; }, order() { return this; }, limit() { return this; }, in() { return this; },
        then(resolve) { return Promise.resolve({ data: table === 'creator_metrics' ? [metric] : [], count: 0 }).then(resolve); },
      };
      return query;
    },
  } },
});
await check('Free analytics stops before metrics reads', async () => {
  analyticsTier = 'free'; tableReads = [];
  await assert.rejects(analytics.loadStudioAnalytics(7), /Starter/);
  assert.equal(tableReads.length, 0);
});
await check('Starter receives sales and plays without querying audience sources', async () => {
  analyticsTier = 'starter'; tableReads = [];
  const result = await analytics.loadStudioAnalytics(7);
  assert.equal(result.audienceAccess, false);
  assert.equal(result.summary.plays, 8);
  assert.equal(result.summary.revenueCents, 100);
  assert.equal(tableReads.length, 1);
  assert.doesNotMatch(tableReads[0].select, /audience_geo|post_likes|retention/);
});
await check('Creator receives audience metrics using owner-scoped sources', async () => {
  analyticsTier = 'creator'; tableReads = [];
  const result = await analytics.loadStudioAnalytics(7);
  assert.equal(result.audienceAccess, true);
  assert.equal(result.audience.retention30d, 20);
  assert.equal(result.summary.engagement, 3);
  assert.ok(tableReads.some((record) => record.table === 'connect_card_events'));
});
console.log(`${cases} native creator parity behavior cases passed (mocked account/network boundaries; no purchases or production writes).`);
