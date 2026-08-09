import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import ts from 'typescript';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const read = (path) => readFileSync(resolve(root, path), 'utf8');

function listFilesRecursively(directory) {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? listFilesRecursively(path) : [path];
  });
}

function loadPureTypeScriptModule(path) {
  const output = ts.transpileModule(read(path), {
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
  }).outputText;
  const module = { exports: {} };
  Function('module', 'exports', output)(module, module.exports);
  return module.exports;
}

const packageJson = JSON.parse(read('package.json'));
assert.match(packageJson.dependencies['@sentry/react-native'], /^~7\.2\.0$/);

const appConfig = read('app.config.ts');
const metroConfig = read('metro.config.js');
const layout = read('app/_layout.tsx');
const observability = read('src/lib/observability.ts');
const readiness = read('docs/google-play/RELEASE_READINESS.md');

assert.match(appConfig, /'@sentry\/react-native'/);
assert.match(metroConfig, /getSentryExpoConfig\(__dirname/);
assert.doesNotMatch(metroConfig, /withSentryConfig\(nativeWindConfig/);
assert.match(metroConfig, /includeWebReplay:\s*false/);
assert.match(layout, /initializeObservability\(\)/);
assert.match(layout, /export default observeRootComponent\(Layout\)/);
assert.match(observability, /process\.env\.EXPO_PUBLIC_SENTRY_DSN\?\.trim\(\)/);
assert.match(observability, /sendDefaultPii:\s*false/);
assert.match(observability, /attachScreenshot:\s*false/);
assert.match(observability, /attachViewHierarchy:\s*false/);
assert.match(readiness, /SENTRY_AUTH_TOKEN/);
assert.match(readiness, /controlled test event/);

const { sanitizeObservabilityBreadcrumb, sanitizeObservabilityUrl } =
  loadPureTypeScriptModule('src/lib/observabilityPolicy.ts');

assert.equal(
  sanitizeObservabilityUrl('https://pluggd.fm/auth/callback?access_token=secret#session'),
  'https://pluggd.fm/auth/callback',
);
assert.equal(
  sanitizeObservabilityUrl('pluggd://auth/callback?code=secret'),
  'pluggd://auth/callback',
);
assert.deepEqual(
  sanitizeObservabilityBreadcrumb({
    category: 'http',
    data: {
      method: 'POST',
      url: 'https://pluggd.fm/functions/v1/verify?purchase_token=secret',
      authorization: 'Bearer secret',
      email: 'fan@example.com',
    },
  }),
  {
    category: 'http',
    data: {
      method: 'POST',
      url: 'https://pluggd.fm/functions/v1/verify',
    },
  },
);

// A serializer identity check cannot prove compatibility with Expo's custom
// serializer. Exercise the real production Android/Hermes export pipeline and
// require the Sentry Debug ID on the generated source map.
const outputDirectory = mkdtempSync(join(tmpdir(), 'pluggd-android-observability-'));
try {
  const expoCli = resolve(root, 'node_modules/expo/bin/cli');
  execFileSync(
    process.execPath,
    [
      expoCli,
      'export',
      '--platform',
      'android',
      '--source-maps',
      '--output-dir',
      outputDirectory,
      '--clear',
    ],
    {
      cwd: root,
      encoding: 'utf8',
      env: { ...process.env, CI: '1', FORCE_COLOR: '0' },
      maxBuffer: 20 * 1024 * 1024,
      stdio: ['ignore', 'pipe', 'pipe'],
    },
  );

  const files = listFilesRecursively(outputDirectory);
  const androidBundle = files.find((path) => /\/android\/index-[\da-f]+\.(?:hbc|js)$/.test(path));
  const sourceMapPath = files.find((path) => /\/android\/index-[\da-f]+\.(?:hbc|js)\.map$/.test(path));

  assert.ok(androidBundle, 'Android export must produce a Hermes or JavaScript bundle.');
  assert.ok(sourceMapPath, 'Android export must produce a source map.');

  const sourceMap = JSON.parse(readFileSync(sourceMapPath, 'utf8'));
  assert.match(
    sourceMap.debugId,
    /^[\da-f]{8}-[\da-f]{4}-4[\da-f]{3}-[89ab][\da-f]{3}-[\da-f]{12}$/i,
    'Sentry Debug ID must survive NativeWind and Expo serialization.',
  );
  assert.ok(
    sourceMap.sources.some((source) => source.endsWith('/src/lib/observability.ts')),
    'The uploaded map must include PLUGGD observability TypeScript sources.',
  );
} finally {
  rmSync(outputDirectory, { recursive: true, force: true });
}

console.log('Mobile observability contract: PASS');
