import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { evaluateExpression, jsxAttribute, jsxOpenings, sourceFunction } from './contract-source-tools.mjs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

// The old regex both missed real violations after style callbacks and falsely
// flagged roles following onPress callbacks. Prove the scanner sees both cases.
const sample = `<><Pressable style={({ pressed }) => [pressed && {}]} onPress={() => {}} />
  <Pressable onPress={() => {}} accessibilityRole="button" />
  <Pressable accessibilityRole="tab" onPress={() => {}} /></>`;
const nodes = jsxOpenings(sample, 'Pressable');
assert.equal(nodes.length, 3);
assert.equal(nodes.filter((node) => jsxAttribute(node, 'onPress') && !jsxAttribute(node, 'accessibilityRole')).length, 1);

// Execute the actual shared screen-reader seek handler, including endpoints and
// a zero-duration item. These are local pure fixtures, not TalkBack/device proof.
const seekSource = read('src/components/PlaybackSeekBar.tsx');
for (const duration of [0, 10, 100, 3600]) {
  for (const position of [0, duration / 2, duration]) {
    for (const actionName of ['increment', 'decrement']) {
      const ratios = [];
      const action = sourceFunction(seekSource, 'handleAccessibilityAction', { duration, position, onSeek: (ratio) => ratios.push(ratio) });
      action({ nativeEvent: { actionName } });
      if (duration === 0) assert.deepEqual(ratios, []);
      else {
        assert.equal(ratios.length, 1);
        assert.ok(ratios[0] >= 0 && ratios[0] <= 1);
        assert.ok(actionName === 'increment' ? ratios[0] >= position / duration : ratios[0] <= position / duration);
        if (position === 0 && actionName === 'decrement') assert.equal(ratios[0], 0);
        if (position === duration && actionName === 'increment') assert.equal(ratios[0], 1);
      }
    }
  }
}

// Public reviewer filtering intentionally permits a viewer to see their own
// private posts; anonymous/other viewers must never see those test identities.
const social = read('src/features/culture/mobileSocial.ts');
const publicPostPredicate = social.match(/\(row\) => (row\.user_id === userId \|\| !isNonPublicTestIdentity\(profileMap\.get\(row\.user_id\)\)\))/)?.[1];
assert.ok(publicPostPredicate, 'posts must retain the owned-or-public identity predicate');
const profileMap = new Map([['reviewer', { full_name: 'Apple App Review' }], ['artist', { full_name: 'Actual Artist' }]]);
const isNonPublicTestIdentity = sourceFunction(social, 'isNonPublicTestIdentity', { isNonPublicTestProfileName: (name) => name === 'Apple App Review' });
for (const [owner, viewer, expected] of [['reviewer', null, false], ['reviewer', 'artist', false], ['reviewer', 'reviewer', true], ['artist', null, true]]) {
  assert.equal(evaluateExpression(publicPostPredicate, { row: { user_id: owner }, userId: viewer, profileMap, isNonPublicTestIdentity }), expected);
}

console.log('PASS source scanner regression, actual seek-handler boundary and public/owned reviewer filtering fixtures; not rendered/native evidence.');
