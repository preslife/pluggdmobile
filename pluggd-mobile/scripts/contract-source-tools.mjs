import assert from 'node:assert/strict';
import ts from 'typescript';

export function sourceAst(source) {
  return ts.createSourceFile('screen.tsx', source, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
}

export function jsxOpenings(source, name) {
  const result = [];
  const ast = sourceAst(source);
  function visit(node) {
    if ((ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) && node.tagName.getText(ast) === name) result.push(node);
    ts.forEachChild(node, visit);
  }
  visit(ast);
  return result;
}

export function jsxAttribute(node, name) {
  return node.attributes.properties.find((property) => ts.isJsxAttribute(property) && property.name.getText() === name);
}

export function namedDeclaration(source, name) {
  let result;
  function visit(node) {
    if ((ts.isVariableDeclaration(node) || ts.isFunctionDeclaration(node)) && node.name?.getText() === name) result = node;
    ts.forEachChild(node, visit);
  }
  visit(sourceAst(source));
  assert.ok(result, `source must retain ${name}`);
  return result;
}

export function evaluateExpression(expression, bindings = {}) {
  const compiled = ts.transpileModule(`return (${expression});`, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
  }).outputText;
  return Function(...Object.keys(bindings), compiled)(...Object.values(bindings));
}

export function sourceFunction(source, name, bindings = {}) {
  const node = namedDeclaration(source, name);
  return evaluateExpression(ts.isFunctionDeclaration(node) ? node.getText().replace(/^export\s+/, '') : node.initializer.getText(), bindings);
}

// Execute the actual signup handlers without React or a network client. Each
// provider must reject missing/underage DOB before any identity call, and accept
// the real inclusive 16th-birthday boundary with persisted ISO calendar DOB.
export async function assertSignupBirthDateGate(source) {
  class FixedDate extends Date {
    constructor(...args) { super(...(args.length ? args : [2026, 9, 2, 12])); }
  }
  const maximumBirthDate = sourceFunction(source, 'latestEligibleBirthDate', { Date: FixedDate, MINIMUM_AGE: 16 })();
  assert.equal(maximumBirthDate.getFullYear(), 2010);
  assert.equal(maximumBirthDate.getMonth(), 9);
  assert.equal(maximumBirthDate.getDate(), 2);
  const storageDate = sourceFunction(source, 'formatBirthDateForStorage');
  const ageExpression = namedDeclaration(source, 'ageConfirmed').initializer.getText();
  const cases = [
    { date: null, eligible: false },
    { date: new Date(2010, 9, 3, 12), eligible: false },
    { date: new Date(2010, 9, 2, 12), eligible: true },
    { date: new Date(2010, 9, 1, 12), eligible: true },
  ];
  for (const { date: dateOfBirth, eligible } of cases) {
    const ageConfirmed = evaluateExpression(ageExpression, { dateOfBirth, maximumBirthDate });
    assert.equal(ageConfirmed, eligible, 'signup age calculation must fail closed and include the 16th birthday');
    for (const name of ['handleSignUp', 'handleAppleSignUp', 'handleGoogleSignUp']) {
      const identityCalls = [], errors = [];
      const handler = sourceFunction(source, name, {
        dateOfBirth, ageConfirmed, MINIMUM_AGE: 16, LAUNCH_ACCESS_REQUIRED: false,
        email: 'fixture@example.test', accessCode: '', password: 'fixture-not-a-real-password', fullName: 'Fixture',
        setLoading: () => {}, setError: (message) => errors.push(message), clearLaunchAccessNotice: async () => {},
        formatBirthDateForStorage: storageDate, Date,
        supabase: { auth: {
          signUp: async (input) => { identityCalls.push(input); return { data: { user: null }, error: null }; },
          getUser: async () => ({ data: { user: null }, error: null }),
        } },
        signInWithApple: async (input) => identityCalls.push(input), signInWithGoogle: async (input) => identityCalls.push(input),
        isAppleSignInCancellation: () => false, isGoogleSignInCancellation: () => false,
        router: { replace: () => {} },
      });
      await handler();
      assert.equal(identityCalls.length, eligible ? 1 : 0, `${name} must gate identity calls on eligible DOB`);
      assert.equal(errors.some(Boolean), !eligible, `${name} must explain an ineligible DOB without silently swallowing an error`);
      if (eligible && name === 'handleSignUp') {
        assert.equal(identityCalls[0].options.data.minimum_age_confirmed, true);
        assert.equal(identityCalls[0].options.data.date_of_birth, storageDate(dateOfBirth));
      } else if (eligible) assert.equal(identityCalls[0].minimumAgeConfirmed, true);
    }
  }
  const picker = jsxOpenings(source, 'DateTimePicker');
  assert.equal(picker.length, 1, 'signup must retain a real native date picker');
  assert.match(jsxAttribute(picker[0], 'maximumDate')?.getText() ?? '', /maximumBirthDate/);
  assert.match(jsxAttribute(picker[0], 'minimumDate')?.getText() ?? '', /minimumBirthDate/);
  assert.ok(jsxOpenings(source, 'Pressable').some((node) =>
    jsxAttribute(node, 'accessibilityRole')?.initializer?.text === 'button'
    && /Choose date of birth/.test(jsxAttribute(node, 'accessibilityLabel')?.getText() ?? '')
    && /openDatePicker/.test(jsxAttribute(node, 'onPress')?.getText() ?? '')),
  'the date selector must retain its explicit accessible action');
}

export function assertCommunityFeedComposition(source) {
  const feedList = jsxOpenings(source, 'FlatList').find((node) => jsxAttribute(node, 'data')?.getText() === 'data={feedRows}');
  assert.ok(feedList, 'the main feed must render its real virtualised rows');
  assert.match(jsxAttribute(feedList, 'ListHeaderComponent')?.getText() ?? '', /<MobileStoriesRail\b/,
    'stories must lead the main feed list');
  assert.equal(jsxAttribute(feedList, 'stickyHeaderIndices')?.getText(), 'stickyHeaderIndices={[1]}',
    'the switcher must stick immediately after the stories header');
  const expression = namedDeclaration(source, 'feedRows').initializer.getText();
  for (const posts of [[], [{ id: 'first' }, { id: 'second' }]]) {
    const rows = evaluateExpression(expression, { posts, useMemo: (factory) => factory() });
    assert.deepEqual(rows.slice(0, 2).map((row) => row.kind), ['switcher', 'filters']);
    assert.deepEqual(rows.slice(2).map((row) => row.kind), posts.length ? ['post', 'post'] : ['empty']);
    if (posts.length) assert.deepEqual(rows.slice(2).map((row) => row.post.id), ['first', 'second']);
  }
  for (const name of ['boardRows', 'communityRows']) {
    const list = jsxOpenings(source, 'FlatList').find((node) => jsxAttribute(node, 'data')?.getText() === `data={${name}}`);
    assert.ok(list, `${name} must retain its dedicated list`);
    assert.doesNotMatch(jsxAttribute(list, 'ListHeaderComponent')?.getText() ?? '', /MobileStoriesRail/,
      'the stories rail must not displace dedicated Boards/Communities indexes');
  }
}
