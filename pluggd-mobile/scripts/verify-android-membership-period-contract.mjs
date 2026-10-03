import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const screen = readFileSync(new URL('../app/membership/[creatorId].tsx', import.meta.url), 'utf8');
const source = ts.createSourceFile('membership.tsx', screen, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
let helper;
let periods;
const selections = [];
function visit(node) {
  if (ts.isFunctionDeclaration(node) && node.name?.text === 'membershipBillingPeriodForPlatform') helper = node;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'availableBillingPeriods') periods = node.initializer;
  if (ts.isVariableDeclaration(node) && node.name.getText(source) === 'storeProduct' &&
      node.initializer?.getText(source).startsWith('storeTiers.find(')) selections.push(node.initializer);
  ts.forEachChild(node, visit);
}
visit(source);
assert.ok(helper, 'screen must define the Android-only presentation helper');
assert.ok(periods, 'billing period choices must be derived from the actual catalogue');
assert.equal(selections.length, 2, 'both rendered price and subscribe selection must be exercised');

// Execute the screen's actual helper, catalogue-period expression and both
// product lookups without importing React Native or simulating a purchase.
function evaluate(expression, { platform, products = [], period = 'monthly' } = {}) {
  const output = ts.transpileModule(`${helper.getText(source)}
    function run(storeTiers, tier, selectedBillingPeriod, Platform) { return (${expression}); }`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return Function(`${output}; return run;`)()(products, { id: 'tier' }, period, { OS: platform });
}
const presentation = (basePlanId, platform) =>
  evaluate(`membershipBillingPeriodForPlatform(${JSON.stringify(basePlanId)}, ${JSON.stringify(platform)})`);
for (const platform of ['android', 'ios', 'web']) {
  assert.equal(presentation('monthly', platform), 'monthly');
  assert.equal(presentation('yearly', platform), 'yearly');
  assert.equal(presentation(null, platform), 'monthly');
  assert.equal(presentation('custom-period', platform), 'custom-period', 'unknown IDs must not become selectable monthly plans');
  assert.equal(presentation('annual', platform), platform === 'android' ? 'yearly' : 'annual');
}

const product = (basePlanId, extra = {}) => Object.freeze({
  catalogId: `catalog-${basePlanId ?? 'apple'}`,
  tierId: 'tier', sku: 'creator-membership-fixture', basePlanId,
  offerId: `offer-${basePlanId ?? 'apple'}`, localizedPrice: `store-price-${basePlanId ?? 'apple'}`,
  ...extra,
});
const monthly = product('monthly');
const annual = product('annual');
const yearly = product('yearly');
const apple = product(null);
const differentTier = product('annual', { tierId: 'other-tier', catalogId: 'different-tier' });
const custom = product('custom-period');
const options = (products, platform) => evaluate(periods.getText(source), { products, platform });
assert.deepEqual(options([monthly, annual], 'android'), ['monthly', 'yearly']);
assert.deepEqual(options([monthly, yearly], 'android'), ['monthly', 'yearly']);
assert.deepEqual(options([annual], 'android'), ['yearly']);
assert.deepEqual(options([monthly, annual], 'ios'), ['monthly'], 'iOS annual presentation must remain unchanged');
assert.deepEqual(options([apple], 'ios'), ['monthly']);

for (const selection of selections) {
  const select = (products, platform, period) => evaluate(selection.getText(source), { products, platform, period });
  assert.strictEqual(select([differentTier, monthly, annual], 'android', 'monthly'), monthly);
  const selectedAnnual = select([differentTier, monthly, annual], 'android', 'yearly');
  assert.strictEqual(selectedAnnual, annual, 'yearly presentation must select the exact annual catalogue object');
  assert.equal(selectedAnnual.basePlanId, 'annual', 'provider basePlanId must never be renamed');
  assert.equal(selectedAnnual.catalogId, annual.catalogId);
  assert.equal(selectedAnnual.sku, annual.sku);
  assert.equal(selectedAnnual.offerId, annual.offerId);
  assert.equal(selectedAnnual.localizedPrice, annual.localizedPrice);
  assert.strictEqual(select([monthly, yearly], 'android', 'yearly'), yearly);
  assert.ok(select([custom], 'android', 'monthly') == null);
  assert.strictEqual(select([apple], 'ios', 'monthly'), apple);
  assert.strictEqual(select([monthly, yearly], 'ios', 'yearly'), yearly);
  assert.ok(select([annual], 'ios', 'yearly') == null, 'iOS must not gain the Android annual alias');
  assert.ok(select([annual], 'ios', 'monthly') == null);
}

assert.match(screen, /basePlanId:\s*storeProduct\.basePlanId/, 'policy must receive the exact catalogue ID');
assert.match(screen, /mapping\.basePlanId === storeProduct\.basePlanId/, 'policy matching must retain exact provider identity');
assert.match(screen, /existingMembership\?\.store_base_plan_id === storeProduct\.basePlanId/, 'current-plan matching must retain exact provider identity');
assert.match(screen, /subscribe\(storeProduct\.catalogId\)/, 'subscribe must pass the selected exact catalogue row');
const hook = readFileSync(new URL('../src/hooks/useSubscription.ts', import.meta.url), 'utf8');
assert.match(hook, /adapter\.requestSubscription\(\{[\s\S]*basePlanId:\s*product\.basePlanId/, 'purchase request must preserve the selected provider ID');

console.log('Android membership billing-period presentation: PASS (monthly/yearly/annual, both exact product lookups, unchanged iOS)');
