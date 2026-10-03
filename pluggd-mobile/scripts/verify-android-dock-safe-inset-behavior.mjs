import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as jsxRuntime from 'react/jsx-runtime';
import ts from 'typescript';

// Execute the actual compact shell, navigation switch, dock and GlassDock.
// Native hosts/hooks are inert fixtures: this proves component style/route
// output and layout arithmetic, not Yoga, screenshots or native touch safety.
const read = (file) => readFileSync(new URL(`../${file}`, import.meta.url), 'utf8');
function loadSource(file, imports = {}, source = read(file)) {
  const compiled = ts.transpileModule(source, {
    fileName: file,
    compilerOptions: {
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
  }).outputText;
  const module = { exports: {} };
  const requireMock = (id) => {
    if (id === 'react/jsx-runtime') return jsxRuntime;
    assert.ok(Object.hasOwn(imports, id), `Unexpected external import ${id} in ${file}`);
    return imports[id];
  };
  Function('module', 'exports', 'require', compiled)(module, module.exports, requireMock);
  return module.exports;
}

const fixture = { bottom: 0, pathname: '/discover', pushes: [], haptics: 0 };
const native = {
  Platform: { OS: 'android' },
  View: 'View', Text: 'Text', Pressable: 'Pressable',
  StyleSheet: {
    create: (styles) => styles,
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  },
};
const router = {
  usePathname: () => fixture.pathname,
  useRouter: () => ({ push: (route) => fixture.pushes.push(route) }),
};
const safeArea = { useSafeAreaInsets: () => ({ top: 0, left: 0, right: 0, bottom: fixture.bottom }) };
const glassFile = 'components/liquid-glass/GlassDock.tsx';
const glassImports = {
  'react-native': native,
  '@expo/vector-icons': { MaterialIcons: 'MaterialIcons' },
  '../../src/design/haptics': { selectionHaptic: () => { fixture.haptics += 1; } },
  '../../src/design/liquidGlassTokens': { liquidGlassRadii: { xxl: 28 } },
  './GlassPanel': { GlassPanel: 'GlassPanel' },
  './LiftSurface': { LiftSurface: 'LiftSurface' },
  '../../src/design/usePluggdTheme': {
    usePluggdTheme: () => ({ colors: { accentText: '#ff6b00', textMuted: '#888888' } }),
  },
};
const glass = loadSource(glassFile, glassImports);
const dock = loadSource('components/PluggdDock.tsx', {
  'react-native': native,
  'expo-router': router,
  'react-native-safe-area-context': safeArea,
  './liquid-glass': glass,
});
const adaptiveHooks = {
  useAdaptiveNavigationMode: () => 'compact',
  useAdaptiveNavigationLayout: () => ({ mode: 'compact', widthClass: 'compact' }),
};
const adaptive = loadSource('components/AdaptivePluggdNavigation.tsx', {
  '../src/design/adaptiveNavigation': adaptiveHooks,
  './PluggdDock': dock,
  './PluggdTopNavigation': { PluggdTopNavigation: 'PluggdTopNavigation' },
});
const visibility = loadSource('src/lib/appChromeVisibility.ts');
const chrome = loadSource('components/AppChrome.tsx', {
  'react-native': native,
  'expo-router': router,
  'react-native-safe-area-context': safeArea,
  '../src/design/adaptiveNavigation': adaptiveHooks,
  '../src/lib/appChromeVisibility': visibility,
  './AdaptivePluggdNavigation': adaptive,
  './MiniPlayer': { default: 'MiniPlayer' },
  './MobileHeader': { MobileHeader: 'MobileHeader' },
});

function elements(root) {
  const result = [];
  function visit(node) {
    if (Array.isArray(node)) { node.forEach(visit); return; }
    if (!node || typeof node !== 'object' || !node.props) return;
    if (typeof node.type === 'function') { visit(node.type(node.props)); return; }
    result.push(node);
    visit(node.props.children);
  }
  visit(root);
  return result;
}
function style(value) {
  return Array.isArray(value) ? Object.assign({}, ...value.map(style)) : (value || {});
}
function geometry(root, platform, bottomInset) {
  const nodes = elements(root);
  const row = nodes.find((node) => node.type === 'View' && style(node.props.style).flexDirection === 'row');
  assert.ok(row, 'actual dock must render its control row');
  const rowStyle = style(row.props.style);
  const shell = nodes.find((node) => node.type === 'View'
    && style(node.props.style).height === 60 + bottomInset
    && !style(node.props.style).flexDirection);
  assert.ok(shell, 'actual dock must retain its full safe-inset shell');
  const panel = nodes.find((node) => node.type === 'GlassPanel');
  assert.equal(style(panel.props.style).height, '100%', 'glass material must still fill the shell');
  assert.equal(rowStyle.height, 60);
  assert.equal(rowStyle.paddingVertical, 3);
  const translation = rowStyle.transform[0].translateY;
  assert.equal(translation, platform === 'android' ? 0 : bottomInset / 2);
  const controls = nodes.filter((node) => node.type === 'Pressable');
  assert.equal(controls.length, 5, 'all five real navigation actions must remain present');
  for (const control of controls) {
    assert.equal(style(control.props.style({ pressed: false })).height, 54);
    const controlBottom = translation + rowStyle.paddingVertical + 54;
    if (platform === 'android') {
      assert.ok(controlBottom <= style(shell.props.style).height - bottomInset,
        'the entire Android 54-point press target must remain above safe-bottom material');
    }
  }
  if (platform === 'android') {
    assert.equal(translation + rowStyle.height, style(shell.props.style).height - bottomInset);
  } else {
    assert.equal(style(shell.props.style).height - translation - rowStyle.height, translation,
      'iOS/web optical-centering clearance must remain exactly unchanged');
  }
  return { nodes, controls };
}

const labels = ['Home', 'Discover', 'Community', 'Events', 'Store'];
const routes = ['/', '/discover', '/community', '/events', '/market'];
assert.deepEqual(dock.CORE_TABS.map((item) => item.label), labels);
assert.deepEqual(dock.CORE_TABS.map((item) => item.route), routes);
const directItems = dock.CORE_TABS.map((item) => ({ ...item, onPress() {} }));
for (const platform of ['android', 'ios', 'web']) {
  native.Platform.OS = platform;
  for (const bottomInset of [0, 18, 48]) {
    geometry(glass.GlassDock({ items: directItems, bottomInset }), platform, bottomInset);
    fixture.bottom = bottomInset;
    const { nodes, controls } = geometry(chrome.AppChrome(), platform, Math.max(bottomInset, 18));
    const anchor = nodes.find((node) => style(node.props.style).position === 'absolute'
      && node.props.pointerEvents === 'box-none');
    assert.equal(style(anchor.props.style).bottom, 0, 'compact chrome must retain its existing screen-edge anchor');
    assert.equal(style(anchor.props.style).paddingBottom, undefined, 'safe inset must not be double-applied to the shell');
    assert.equal(visibility.bottomChromeInsetForLayout({
      safeBottom: bottomInset, bottomHidden: false, wideTopNavigation: false, hasCurrentTrack: false,
    }), 65 + Math.max(bottomInset, 18) + 24, 'scroll reservation must retain the same full shell height');
    assert.deepEqual(controls.map((node) => node.props.accessibilityLabel), labels.map((label) => `${label} tab`));
    assert.deepEqual(controls.map((node) => node.props.testID), labels.map((label) => `dock-tab-${label.toLowerCase()}`));
    assert.deepEqual(controls.map((node) => node.props.accessibilityState.selected), [false, true, false, false, false]);
    fixture.pushes = [];
    const hapticsBefore = fixture.haptics;
    controls.forEach((control) => control.props.onPress());
    assert.deepEqual(fixture.pushes, routes);
    assert.equal(fixture.haptics - hapticsBefore, 5, 'navigation haptics must remain intact');
  }
  geometry(glass.GlassDock({ items: directItems }), platform, 10);
}

// Sensitivity check: the formerly shared half-inset shift must fail this gate
// on Android. This mutation exists only in memory; no app file is rewritten.
native.Platform.OS = 'android';
const source = read(glassFile);
const oldShift = source.replace(/Platform\.OS === 'android' \? 0 : bottomInset \/ 2/, 'bottomInset / 2');
assert.notEqual(oldShift, source, 'sensitivity fixture must actually restore the previous defective shift');
const mutant = loadSource(glassFile, glassImports, oldShift);
for (const bottomInset of [18, 48]) {
  assert.throws(() => geometry(mutant.GlassDock({ items: directItems, bottomInset }), 'android', bottomInset),
    assert.AssertionError, 'the previous Android safe-inset regression must be caught');
}

console.log('Android dock safe-inset component/layout behavior: PASS (native rendered/touch proof remains separate)');
