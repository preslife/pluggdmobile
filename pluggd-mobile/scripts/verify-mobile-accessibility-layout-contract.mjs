import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const role = read('app/auth/role.tsx');
const fanSetup = read('app/auth/fan-setup.tsx');
const creatorOnboarding = read('app/creator/onboarding.tsx');
const studio = read('src/features/studio/StudioScreens.tsx');
const creatorUpload = read('app/creator/upload.tsx');
const creatorEvents = read('app/creator/events.tsx');

assert.match(
  role,
  /usesAccessibilityLayout[\s\S]*maxFontSizeMultiplier=\{1\.3\}/,
  'role selection must use an accessibility-specific composition and bounded display type',
);
assert.match(
  fanSetup,
  /Shape your feed[\s\S]*maxFontSizeMultiplier|style=\{styles\.title\} maxFontSizeMultiplier=\{1\.3\}/,
  'fan setup must keep its display heading composed at accessibility sizes',
);
assert.match(
  creatorOnboarding,
  /Set up your PLUGGD space[\s\S]*maxFontSizeMultiplier|style=\{styles\.title\} maxFontSizeMultiplier=\{1\.3\}/,
  'creator onboarding must keep its display heading composed at accessibility sizes',
);
assert.match(
  studio,
  /function Text\(\{ maxFontSizeMultiplier = 1\.25/,
  'the dense Studio workspace must bound Dynamic Type consistently across its modules',
);
assert.match(
  creatorUpload,
  /function Text\(\{ maxFontSizeMultiplier = 1\.3[\s\S]*maxFontSizeMultiplier=\{1\.4\}/,
  'creator uploads must bound both display type and form input scaling',
);
assert.match(
  creatorEvents,
  /function Text\(\{ maxFontSizeMultiplier = 1\.3[\s\S]*function TextInput\(\{ maxFontSizeMultiplier = 1\.4/,
  'creator event management must bound display and form type without disabling Dynamic Type',
);

console.log('mobile accessibility layout contract verified');
