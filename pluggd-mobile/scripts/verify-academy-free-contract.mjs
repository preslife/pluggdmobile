import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(import.meta.url);
const ts = require('typescript');
const loaded = new Map();
function load(name) {
  if (loaded.has(name)) return loaded.get(name);
  const filename = path.join(root, 'src/features/academy', `${name}.ts`);
  const source = fs.readFileSync(filename, 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  assert.equal(compiled.diagnostics?.filter(item => item.category === ts.DiagnosticCategory.Error).length, 0);
  const module = { exports: {} };
  vm.runInNewContext(compiled.outputText, { module, exports: module.exports, URL, require: id => {
    assert.ok(id.startsWith('./'), `No external dependency or live client is allowed in this behavioural test: ${id}`);
    return load(id.slice(2));
  } }, { filename });
  loaded.set(name, module.exports); return module.exports;
}
const contracts = load('contracts'); const { createAcademyApi, AcademyUnavailableError } = load('academyApi');
const { nativeLessonText, practiceQuestions } = load('lessonText');
const id = '00000000-0000-4000-8000-000000000001';
const lessonId = '00000000-0000-4000-8000-000000000002';
const actor = '00000000-0000-4000-8000-000000000003';
const other = '00000000-0000-4000-8000-000000000004';
const free = { id, slug: 'free-skills', title: 'Free skills', visibility: 'public', published_at: '2026-11-01', price_cents: 0, pricing: null, lesson_count: 1 };
const access = { granted: true, required_tier: 'free', requires_purchase: false, requires_membership: false };
const lesson = { id: lessonId, title: 'Lesson one', content: { markdown: '# A real lesson\n\nRead this.' } };
const legacy = { id, title: 'Legacy free course', is_published: true, is_free: true, price: 0, access_unavailable: false, is_pro_only: null, one_time_price: null };
const progress = { user_id: actor, course_id: id, completed_lesson_ids: [lessonId], last_lesson_id: lessonId, percent_complete: 100 };
const ok = data => ({ data, error: null });
const missing = () => ({ data: null, error: { code: 'P0001', message: 'course_not_found' } });
let assertions = 0;
function test(name, fn) { return Promise.resolve().then(fn).then(() => { assertions++; console.log(`PASS ${name}`); }); }
function api(handler) {
  const calls = [];
  const rpc = async (name, args) => { calls.push({ name, args }); return handler(name, args); };
  const scope = async (actor, run) => run({ rpc, resumeLms: (courseId, lessonId) => rpc('resume_lms_only', { p_user_id: actor, p_course_id: courseId, p_lesson_id: lessonId }) });
  return { calls, service: createAcademyApi(rpc, scope) };
}

await test('strict free admission rejects paid, unknown pricing, memberships, drafts and private content independently of entitlements', () => {
  assert.equal(contracts.isStrictlyFreeLms(free), true);
  for (const patch of [{ price_cents: 1 }, { price_cents: null }, { pricing: undefined }, { published_at: null }, { visibility: 'private' },
    { pricing: { is_membership_only: true, required_tier: 'free', one_time_price_cents: 0 } },
    { pricing: { is_membership_only: false, required_tier: 'pro', one_time_price_cents: 0 } },
    { pricing: { is_membership_only: false, required_tier: 'free', one_time_price_cents: 10 } }]) {
    assert.equal(contracts.isStrictlyFreeLms({ ...free, ...patch }), false);
  }
  assert.equal(contracts.isStrictlyFreeLegacy(legacy), true);
  for (const patch of [{ is_free: false }, { price: 10 }, { is_published: false }, { is_pro_only: true }, { one_time_price: 2 }, { access_unavailable: true }]) {
    assert.equal(contracts.isStrictlyFreeLegacy({ ...legacy, ...patch, access_kind: 'management' }), false);
  }
});
await test('catalogue confirms zero-price LMS pricing before retaining metadata and never loads lesson bodies', async () => {
  const { service, calls } = api((name, args) => {
    if (name === 'get_lms_courses') return ok([free, { ...free, slug: 'members-only' }, { ...free, slug: 'paid', price_cents: 200 }]);
    if (name === 'get_lms_course_detail') return ok({ course: args.p_slug === 'members-only' ? { ...free, pricing: { is_membership_only: true } } : free, access });
    if (name === 'get_legacy_course_catalogue') return ok([legacy, { ...legacy, id: other, is_free: false, price: 20, access_kind: 'purchase' }]);
    assert.fail(name);
  });
  const result = await service.catalogue();
  assert.equal(result.courses.length, 2);
  assert.equal(result.nextOffset, null);
  assert.ok(calls.filter(call => call.name === 'get_lms_course_detail').every(call => call.args.p_include_lessons === false));
  assert.ok(!JSON.stringify(result).includes('pricing'));
});
await test('paid owner and website-buyer direct links are unavailable before requesting lessons', async () => {
  for (const extra of [{ purchased: true }, { has_manual_grant: true }]) {
    const { service, calls } = api(() => ok({ course: { ...free, price_cents: 300 }, access: { ...access, ...extra } }));
    await assert.rejects(service.detail('paid'), AcademyUnavailableError);
    assert.equal(calls.length, 1); assert.equal(calls[0].args.p_include_lessons, false);
  }
});
await test('pricing and access are rechecked in the actual lesson response', async () => {
  const { service } = api((_name, args) => ok({ course: args.p_include_lessons ? { ...free, price_cents: 500 } : free, access, lessons: [lesson] }));
  await assert.rejects(service.detail('free-skills'), AcademyUnavailableError);
});
await test('UUID-shaped LMS slugs keep precedence; only explicit LMS not-found can enter legacy', async () => {
  const first = api((name) => { assert.equal(name, 'get_lms_course_detail'); return ok({ course: { ...free, slug: id }, access, lessons: [lesson] }); });
  assert.equal((await first.service.detail(id)).course.system, 'lms');
  for (const error of [{ code: '42501', message: 'denied' }, { code: 'P0001', message: 'different_failure' }, { code: '500', message: 'offline' }]) {
    const { service, calls } = api(() => ({ data: null, error }));
    await assert.rejects(service.detail(id)); assert.equal(calls.length, 1);
  }
});
await test('free legacy text lesson IDs are supported and paid legacy body is never requested', async () => {
  const setup = api(name => name === 'get_lms_course_detail' ? missing() : name === 'get_legacy_course_catalogue' ? ok([legacy])
    : ok({ course: legacy, access: { granted: true, kind: 'management' }, lessons: [{ ...lesson, id: 'lesson-text-1', content: 'Lesson body' }] }));
  const detail = await setup.service.detail(id); assert.equal(detail.lessons[0].id, 'lesson-text-1');
  const denied = api(name => name === 'get_lms_course_detail' ? missing() : ok([{ ...legacy, price: 30, is_free: false, access_kind: 'management' }]));
  await assert.rejects(denied.service.detail(id), AcademyUnavailableError);
  assert.ok(!denied.calls.some(call => call.name === 'get_legacy_course_reader'));
});
await test('progress responses must belong to this account, course and lesson set', () => {
  const lessons = contracts.parseLessons([lesson], 'lms');
  assert.equal(contracts.parseProgress(progress, actor, id, lessons).percent, 100);
  for (const patch of [{ user_id: other }, { course_id: other }, { completed_lesson_ids: ['unknown'] }, { completed_lesson_ids: [lessonId, lessonId] }, { last_lesson_id: 'unknown' }, { percent_complete: NaN }]) {
    assert.throws(() => contracts.parseProgress({ ...progress, ...patch }, actor, id, lessons));
  }
});
await test('LMS visits use resume-only transport and never rewrite completion', async () => {
  const { service, calls } = api((name) => name === 'get_lms_course_detail' ? ok({ course: free, access, lessons: [lesson] }) : ok(progress));
  const detail = await service.detail('free-skills');
  const result = await service.save(actor, detail, lessonId, null);
  assert.equal(result.completed[0], lessonId);
  const write = calls.find(call => call.name === 'resume_lms_only');
  assert.equal(write.args.p_user_id, actor); assert.equal(write.args.p_lesson_id, lessonId);
  assert.ok(!calls.some(call => call.name === 'record_lms_lesson_progress' || call.name === 'get_lms_course_progress'));
  assert.ok(!('p_completed' in write.args));
});
await test('course changing to paid stops a progress write', async () => {
  let paid = false;
  const { service, calls } = api(() => ok({ course: { ...free, price_cents: paid ? 100 : 0 }, access, lessons: [lesson] }));
  const detail = await service.detail('free-skills'); paid = true;
  await assert.rejects(service.save(actor, detail, lessonId, true), AcademyUnavailableError);
  assert.ok(!calls.some(call => call.name.startsWith('record_')));
});
await test('legacy visits preserve completion while completion and undo use the existing web contract', async () => {
  let completed = []; const textId = 'intro-lesson';
  const { service, calls } = api((name, args) => {
    if (name === 'get_lms_course_detail') return missing();
    if (name === 'get_legacy_course_catalogue') return ok([legacy]);
    if (name === 'get_legacy_course_reader') return ok({ course: legacy, access: { granted: true }, lessons: [{ id: textId, title: 'Introduction', content: 'Read me' }] });
    if (name === 'record_legacy_lesson_progress') {
      assert.equal(args.p_user_id, actor);
      if (args.p_completed !== null) completed = args.p_completed ? [textId] : [];
    }
    return ok({ ...progress, completed_lesson_ids: completed, last_lesson_id: textId, percent_complete: completed.length ? 100 : 0 });
  });
  const detail = await service.detail(id);
  assert.equal((await service.save(actor, detail, textId, true)).percent, 100);
  assert.equal((await service.save(actor, detail, textId, null)).percent, 100);
  assert.equal((await service.save(actor, detail, textId, false)).percent, 0);
  assert.equal(calls.filter(call => call.name === 'record_legacy_lesson_progress').length, 3);
});
await test('failed writes and wrong-account results never report saved completion', async () => {
  for (const errorCase of ['network', 'account-switch']) {
    const { service } = api((name) => name === 'get_lms_course_detail' ? ok({ course: free, access, lessons: [lesson] })
      : name === 'record_lms_lesson_progress' ? errorCase === 'network' ? { data: null, error: { message: 'offline' } } : ok({ ...progress, user_id: other })
        : ok(progress));
    const detail = await service.detail('free-skills');
    await assert.rejects(service.save(actor, detail, lessonId, true));
  }
});
await test('a page with only paid courses still exposes the next page; server search remains scoped', async () => {
  const { service, calls } = api((name) => name === 'get_lms_courses' ? ok(Array.from({ length: 24 }, () => ({ ...free, price_cents: 50 }))) : ok([]));
  const result = await service.catalogue(24, ' Studio ');
  assert.equal(result.courses.length, 0); assert.equal(result.nextOffset, 48);
  assert.equal(calls[0].args.p_query, 'studio'); assert.equal(calls[0].args.p_offset, 24);
  assert.equal(calls.length, 1);
});
await test('untrusted resources remain inert and HTML never enters a web view', () => {
  for (const url of ['javascript:alert(1)', '//evil.example', 'https://user:secret@example.com', 'https://example.com/a b', 'file:///private/tmp/a', 'https:\\example.com']) assert.equal(contracts.safeAcademyUrl(url), undefined);
  assert.equal(contracts.safeAcademyUrl('/lesson/resource.pdf'), 'https://pluggd.fm/lesson/resource.pdf');
  assert.equal(nativeLessonText({ body: '<p>Safe &amp; readable</p><script>bad()</script><style>bad{}</style><p>Next</p>', format: 'html' }), 'Safe & readable\n\nNext');
  assert.equal(practiceQuestions({ body: '{"questions":[{"question":"Why?","options":[1]}]}' }), null);
});
await test('reader lifecycle isolates accounts and refreshes website progress on foreground', () => {
  const source = fs.readFileSync(path.join(root, 'src/features/academy/AcademyScreens.tsx'), 'utf8');
  assert.match(source, /key=\{`\$\{user\?\.id \?\? 'guest'\}:\$\{identifier\}`\}/);
  assert.match(source, /\['academy', actor, 'progress'/);
  assert.match(source, /active\.current\) \{ client\.setQueryData/);
  assert.match(source, /AppState\.addEventListener\('change'/);
  assert.match(source, /gcTime: 0/);
  assert.doesNotMatch(source, /WebView|checkout|buy course|purchase course/i);
  const menu = fs.readFileSync(path.join(root, 'components/AccountMenuButton.tsx'), 'utf8');
  assert.match(menu, /label: 'Academy', detail: 'Free courses and your progress', route: '\/learn'/);
});
console.log(`Free Academy behavioural contracts: ${assertions} checks passed. No live reads or writes.`);
