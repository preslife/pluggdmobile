import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import ts from 'typescript';

const source = readFileSync(
  new URL('../src/lib/notificationUrlPolicy.ts', import.meta.url),
  'utf8',
);
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;
const policy = await import(`data:text/javascript;base64,${Buffer.from(transpiled).toString('base64')}`);

const hosts = new Set(['pluggd.fm', 'www.pluggd.fm']);

assert.equal(policy.matchesAllowedNotificationUrl('/notifications', hosts), true);
assert.equal(policy.matchesAllowedNotificationUrl('/events/example?source=push', hosts), true);
assert.equal(policy.matchesAllowedNotificationUrl('/admin', hosts), false);
assert.equal(policy.matchesAllowedNotificationUrl('//evil.example/notifications', hosts), false);
assert.equal(policy.matchesAllowedNotificationUrl('/../notifications', hosts), false);
assert.equal(policy.matchesAllowedNotificationUrl('/%2e%2e/notifications', hosts), false);
assert.equal(policy.matchesAllowedNotificationUrl('https://pluggd.fm/notifications', hosts), true);
assert.equal(policy.matchesAllowedNotificationUrl('https://www.pluggd.fm/events/example', hosts), true);
assert.equal(policy.matchesAllowedNotificationUrl('https://evil.example/notifications', hosts), false);
assert.equal(policy.matchesAllowedNotificationUrl('javascript:alert(1)', hosts), false);
assert.equal(policy.matchesAllowedNotificationUrl('pluggd://notifications', hosts), true);

assert.equal(policy.notificationOpenTarget('/notifications'), 'pluggd://notifications');
assert.equal(
  policy.notificationOpenTarget('/events/example?source=push'),
  'pluggd://events/example?source=push',
);
assert.equal(
  policy.notificationOpenTarget('https://pluggd.fm/notifications'),
  'https://pluggd.fm/notifications',
);

console.log('mobile notification link contract verified');
