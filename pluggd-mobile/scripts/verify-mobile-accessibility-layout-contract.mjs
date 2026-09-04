import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const role = read('app/auth/role.tsx');
const fanSetup = read('app/auth/fan-setup.tsx');
const creatorOnboarding = read('app/creator/onboarding.tsx');
const studio = read('src/features/studio/StudioScreens.tsx');
const creatorUpload = read('app/creator/upload.tsx');
const creatorEvents = read('app/creator/events.tsx');

const sourceRoot = fileURLToPath(new URL('..', import.meta.url));
const sourceDirectories = ['app', 'components', 'src'];
const tsxFiles = [];

function collectTsxFiles(relativeDirectory) {
  const directory = `${sourceRoot}/${relativeDirectory}`;
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const relativePath = `${relativeDirectory}/${entry.name}`;
    if (entry.isDirectory()) collectTsxFiles(relativePath);
    if (entry.isFile() && entry.name.endsWith('.tsx')) tsxFiles.push(relativePath);
  }
}

sourceDirectories.forEach(collectTsxFiles);

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

const inaccessiblePressables = [];
for (const path of tsxFiles) {
  const source = read(path);
  for (const match of source.matchAll(/<Pressable\b[\s\S]*?>/g)) {
    const openingTag = match[0];
    if (!openingTag.includes('onPress=')) continue;
    if (openingTag.includes('accessibilityRole=')) continue;
    if (openingTag.includes('accessible={false}')) continue;
    const line = source.slice(0, match.index).split('\n').length;
    inaccessiblePressables.push(`${path}:${line}`);
  }
}
assert.deepEqual(
  inaccessiblePressables,
  [],
  `interactive Pressables must expose an accessibility role: ${inaccessiblePressables.join(', ')}`,
);

console.log('mobile accessibility layout contract verified');
