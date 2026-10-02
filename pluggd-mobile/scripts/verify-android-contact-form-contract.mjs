import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');
const config = read('app.config.ts');
const screen = read('src/features/connect/ConnectCardScreen.tsx');
const patch = read('patches/expo-contacts+15.0.11.patch');
const packageJson = JSON.parse(read('package.json'));

for (const permission of ['READ_CONTACTS', 'WRITE_CONTACTS']) {
  assert(config.includes(`'android.permission.${permission}'`), `${permission} must remain blocked`);
}
assert.equal(packageJson.dependencies['expo-contacts'], '~15.0.11');
assert.equal(packageJson.scripts.postinstall, 'patch-package');
assert(screen.includes('Contacts.presentFormAsync(null, {'), 'Only a new-contact system form is used');
assert(!screen.includes('Contacts.requestPermissionsAsync'), 'Saving a Connect Card must not ask for address-book access');
assert(patch.includes('-      ensureReadPermission()'), 'Unconditional read permission gate must be removed');
assert.match(patch, /if \(contactId != null\) \{[\s\S]*\+        ensureReadPermission\(\)/, 'Existing-contact lookup remains permission protected');
assert(!patch.includes('/ios/'), 'The contacts patch must not modify iOS');
console.log('Android Connect Card permission contract: PASS (native system-form device test remains required)');
