import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const hook = readFileSync(new URL('../src/hooks/useSubscription.ts', import.meta.url), 'utf8');
const source = ts.createSourceFile('useSubscription.ts', hook, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS);
const nodes = [];
function visit(node) { nodes.push(node); ts.forEachChild(node, visit); }
visit(source);
const namedFunction = (name) => nodes.find((node) => ts.isFunctionDeclaration(node) && node.name?.text === name);
const declaration = (name, within = nodes) => within.find((node) => ts.isVariableDeclaration(node) && node.name.getText(source) === name);
const descendants = (parent) => {
  const result = [];
  function walk(node) { result.push(node); ts.forEachChild(node, walk); }
  walk(parent);
  return result;
};
const helper = namedFunction('isElapsedGoogleMembershipForPresentation');
const refresh = declaration('refreshMemberships')?.initializer;
const recovery = namedFunction('recoverServerVerifiedMembership');
const restore = declaration('restoreSubscriptions')?.initializer?.arguments?.[0];
assert.ok(helper && refresh && recovery, 'actual hook eligibility and both consuming paths must exist');
assert.ok(restore && ts.isArrowFunction(restore), 'failure regression must execute the actual Restore callback');
const refreshNodes = descendants(refresh);
const recoveryNodes = descendants(recovery);
const rows = declaration('rows', refreshNodes)?.initializer;
const periodEnd = declaration('periodEnd', recoveryNodes)?.initializer;
const remainsEntitled = declaration('remainsEntitled', recoveryNodes)?.initializer;
const success = recoveryNodes.find((node) => ts.isIfStatement(node) && node.expression.getText(source).includes('remainsEntitled'))?.expression;
assert.ok(rows && periodEnd && remainsEntitled && success, 'test must execute actual refresh and recovery decision expressions');

const clockCalls = (within) => within.filter((node) => ts.isCallExpression(node) && node.expression.getText(source) === 'Date.now');
assert.equal(clockCalls(descendants(helper)).length, 0, 'eligibility helper must use its captured clock');
assert.equal(clockCalls(refreshNodes).length, 1, 'refresh must capture now once for its row batch');
assert.equal(declaration('now', refreshNodes)?.initializer?.getText(source), 'Date.now()');
assert.ok(refresh.arguments?.[1]?.elements?.some((node) => node.getText(source) === 'adapter?.provider'),
  'refresh callback must track adapter provider, including initial null-to-Google readiness');
const recoveryNow = declaration('now', recoveryNodes);
const recoveryLoop = recoveryNodes.find((node) => ts.isForOfStatement(node));
const rowObservation = recoveryNodes.find((node) => ts.isVariableDeclaration(node) &&
  node.name.getText(source).includes('data: subscription') && node.initializer?.getText(source).includes('await query.maybeSingle()'));
assert.ok(recoveryNow && recoveryLoop && rowObservation, 'recovery clock must be tied to an observed row');
assert.equal(recoveryNow.initializer?.getText(source), 'Date.now()');
assert.strictEqual(recoveryNow.parent.parent.parent, recoveryLoop.statement, 'Google eligibility clock must be captured inside each retry iteration');
assert.ok(recoveryNow.getStart(source) > rowObservation.getEnd(), 'capture must occur after the awaited row query, not before retry delays');
assert.match(remainsEntitled.getText(source), /periodEnd > Date\.now\(\)/, 'legacy cancelled-future comparison must stay unchanged');
assert.equal(clockCalls(descendants(remainsEntitled)).length, 1, 'cancelled-future decision must retain its own current clock');
assert.equal(clockCalls(recoveryNodes).length, 2, 'recovery has one captured Google clock and the unchanged cancelled-future clock');
assert.equal(nodes.filter((node) => ts.isCallExpression(node) && node.expression.getText(source) === 'isElapsedGoogleMembershipForPresentation').length, 2,
  'both refresh and recovery must use the same eligibility predicate');
const fanRow = nodes.find((node) => ts.isTypeAliasDeclaration(node) && node.name.text === 'FanSubscriptionRow');
assert.ok(fanRow?.type.members?.some((member) => member.name?.getText(source) === 'billing_provider'), 'row type must carry explicit provider provenance');
const selects = nodes.filter((node) => ts.isCallExpression(node) && ts.isPropertyAccessExpression(node.expression) && node.expression.name.text === 'select')
  .map((node) => node.arguments[0]?.getText(source) ?? '');
assert.ok(selects.some((select) => select.includes('id,creator_id,tier_id,apple_sku,billing_provider,')), 'refresh must select explicit provider');
assert.ok(selects.some((select) => select.includes('id,status,current_period_end,apple_sku,billing_provider,metadata')), 'recovery must select explicit provider');

function execute(body, params, args) {
  const output = ts.transpileModule(`${helper.getText(source)}
    function run(${params.join(',')}) { ${body} }`, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  return Function(`${output}; return run;`)()(...args);
}
const now = Date.parse('2026-10-04T00:00:00.000Z');
const old = new Date(now - 1).toISOString();
const future = new Date(now + 1).toISOString();
const row = (extra = {}) => ({ id: 'fixture', status: 'active', billing_provider: 'google_play', current_period_end: old, ...extra });
const omitted = (subscription, platform = 'android', provider = 'google') => execute(
  'return isElapsedGoogleMembershipForPresentation(subscription, platform, provider, now);',
  ['subscription', 'platform', 'provider', 'now'], [subscription, platform, provider, now],
);
const recover = (subscription, platform = 'android', provider = 'google', clocks = {}) => {
  class LegacyDecisionDate extends Date { static now() { return clocks.cancelledNow ?? now; } }
  return execute(
    `const periodEnd = ${periodEnd.getText(source)};
     const remainsEntitled = ${remainsEntitled.getText(source)};
     return Boolean(${success.getText(source)});`,
    ['subscription', 'Platform', 'billing', 'now', 'Date'],
    [subscription, { OS: platform }, { provider }, clocks.googleNow ?? now, LegacyDecisionDate],
  );
};
const currentRows = (data, platform = 'android', provider = 'google') => execute(
  `return ${rows.getText(source)};`, ['data', 'Platform', 'adapter', 'now'], [data, { OS: platform }, provider ? { provider } : null, now],
);

for (const end of [old, new Date(now).toISOString()]) {
  const subscription = row({ current_period_end: end });
  assert.equal(omitted(subscription), true);
  assert.equal(recover(subscription), false, 'elapsed Google active row cannot recover a rejected/missing receipt');
  assert.deepEqual(currentRows([subscription]), [], 'elapsed row must not block rejoin as current UI');
}
for (const end of [future, null, '', 'invalid-date']) {
  const subscription = row({ current_period_end: end });
  assert.equal(omitted(subscription), false);
  assert.equal(recover(subscription), true, 'future/unknown dates must keep previous recovery behavior');
  assert.strictEqual(currentRows([subscription])[0], subscription);
}
const grace = row({ id: 'grace', status: 'past_due' });
assert.equal(omitted(grace), false);
assert.equal(recover(grace), true, 'explicit past_due grace must survive an old period end');
assert.strictEqual(currentRows([grace])[0], grace);
for (const provider of ['apple', 'stripe', 'admin', null, undefined]) {
  const subscription = row({ billing_provider: provider });
  assert.equal(omitted(subscription), false, 'other/unknown row providers must not be changed');
  assert.equal(recover(subscription), true);
  assert.strictEqual(currentRows([subscription])[0], subscription);
}
for (const [platform, provider] of [['ios', 'google'], ['ios', 'apple'], ['web', 'google'], ['android', 'apple'], ['android', null]]) {
  assert.equal(omitted(row(), platform, provider), false);
  assert.equal(recover(row(), platform, provider), true);
  assert.equal(currentRows([row()], platform, provider).length, 1);
}
assert.equal(recover(row({ status: 'cancelled', current_period_end: future })), true, 'cancelled-future recovery remains allowed');
for (const [platform, provider] of [['ios', 'apple'], ['android', 'google'], ['android', 'apple']]) {
  assert.equal(recover(row({ status: 'cancelled', current_period_end: future }), platform, provider,
    { googleNow: now, cancelledNow: now + 2 }), false, 'cancelled access must use Date.now(), not an earlier Google eligibility clock');
}
for (const end of [old, new Date(now).toISOString(), null, 'invalid-date']) {
  assert.equal(recover(row({ status: 'cancelled', current_period_end: end })), false);
}
assert.equal(recover(row({ status: 'expired', current_period_end: future })), false);
assert.equal(recover(null), false);
const expired = Object.freeze(row({ id: 'elapsed' }));
const active = Object.freeze(row({ id: 'future', current_period_end: future }));
assert.deepEqual(currentRows([expired, grace, active]).map((entry) => entry.id), ['grace', 'future']);
assert.equal(expired.status, 'active', 'presentation filtering must not rewrite the stored status');

// Execute the complete actual recovery function with two delayed row
// observations. Only local fixtures are used; no Supabase or store calls run.
const observations = [
  { subscription: row({ id: 'elapsed-after-delay', current_period_end: new Date(now + 10).toISOString() }), clock: now + 20 },
  { subscription: row({ id: 'future-on-second-observation', current_period_end: new Date(now + 40).toISOString() }), clock: now + 30 },
];
const observationEvents = [];
let observedClock = now;
let observedRows = 0;
class ObservationDate extends Date {
  static now() { observationEvents.push('clock'); return observedClock; }
}
const queryFixture = {
  select() { return this; }, eq() { return this; }, in() { return this; },
  order() { return this; }, limit() { return this; }, contains() { return this; },
  async maybeSingle() {
    const observation = observations[observedRows++];
    assert.ok(observation, 'recovery must not make unbounded fixture queries');
    observationEvents.push('query');
    observedClock = observation.clock;
    return { data: observation.subscription, error: null };
  },
};
const recoverObservedRows = execute(`return ${recovery.getText(source)};`,
  ['Date', 'SERVER_RECONCILIATION_DELAYS_MS', 'waitForProductRetry', 'supabase', 'session', 'billing', 'purchase', 'Platform'], [
    ObservationDate, [0, 1], async () => observationEvents.push('wait'),
    { from: () => queryFixture }, { user: { id: 'fixture-fan' } }, { provider: 'google' },
    { productId: 'fixture-product' }, { OS: 'android' },
  ]);
const observedRecovery = await recoverObservedRows();
assert.equal(observedRecovery?.subscription_id, 'future-on-second-observation', 'elapsed decision must use the newly observed row clock, not a pre-delay clock');
assert.deepEqual(observationEvents, ['wait', 'query', 'clock', 'wait', 'query', 'clock'], 'each Google active observation must capture one clock only after its row query');

async function runRestore({ platform = 'android', provider = 'google', verificationError = null, refreshError = null } = {}) {
  let refreshCount = 0;
  const errors = [];
  const restoring = [];
  const adapter = {
    provider,
    getAvailablePurchases: async () => [{ productId: 'membership-fixture', purchaseState: 'purchased' }],
    finishTransaction: async () => assert.fail('fixture must not acknowledge or buy a purchase'),
  };
  const callback = execute(`return ${restore.getText(source)};`,
    ['adapter', 'Platform', 'knownProductIds', 'validateReceipt', 'refreshMemberships', 'setError', 'setRestoring'], [
      adapter,
      { OS: platform },
      { current: new Set(['membership-fixture']) },
      async () => {
        if (verificationError) throw verificationError;
        return { finishRequired: false };
      },
      async () => {
        refreshCount += 1;
        if (refreshError) throw refreshError;
      },
      (error) => errors.push(error),
      (state) => restoring.push(state),
    ]);
  await callback();
  assert.deepEqual(restoring, [true, false], 'Restore busy state must always settle');
  return { refreshCount, errors };
}
const originalError = new Error('original fixture verification failure');
for (const refreshError of [null, new Error('secondary fixture refresh failure')]) {
  const result = await runRestore({ verificationError: originalError, refreshError });
  assert.equal(result.refreshCount, 1, 'failed Android Google Restore must attempt exactly one UI refresh');
  assert.deepEqual(result.errors, [null, originalError.message], 'refresh must not replace or hide the original Restore error');
}
for (const [platform, provider] of [['ios', 'apple'], ['ios', 'google'], ['android', 'apple'], ['web', 'google']]) {
  const result = await runRestore({ platform, provider, verificationError: originalError });
  assert.equal(result.refreshCount, 0, 'other platform/provider failure paths must remain unchanged');
  assert.deepEqual(result.errors, [null, originalError.message]);
}
const successResult = await runRestore();
assert.equal(successResult.refreshCount, 1, 'normal Restore must keep its existing single refresh');
assert.deepEqual(successResult.errors, [null]);
const refreshFailure = new Error('fixture original refresh failure');
const failedNormalRefresh = await runRestore({ refreshError: refreshFailure });
assert.equal(failedNormalRefresh.refreshCount, 1, 'a failed normal refresh must not be retried by the error path');
assert.deepEqual(failedNormalRefresh.errors, [null, refreshFailure.message]);

console.log('Android membership current UI/recovery eligibility: PASS (explicit Google active elapsed only; grace/Apple/other/null/future preserved; per-observation Google clock; unchanged cancelled-future clock; adapter dependency)');
console.log('Android Google failed Restore UI refresh: PASS (one refresh, original error retained, iOS/other paths unchanged)');
