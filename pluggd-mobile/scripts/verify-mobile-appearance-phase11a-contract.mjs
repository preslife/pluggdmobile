import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptsDirectory, '..');

function fail(message) {
  console.error(`appearance contract failed: ${message}`);
  process.exit(1);
}

function expect(condition, message) {
  if (!condition) fail(message);
}

function source(path) {
  const absolute = resolve(mobileRoot, path);
  expect(existsSync(absolute), `missing ${path}`);
  return readFileSync(absolute, 'utf8');
}

function pngDimensions(path) {
  const absolute = resolve(mobileRoot, path);
  expect(existsSync(absolute), `missing ${path}`);
  const bytes = readFileSync(absolute);
  expect(bytes.subarray(1, 4).toString('ascii') === 'PNG', `${path} is not a PNG`);
  return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
}

function walk(directory) {
  return readdirSync(directory)
    .flatMap((entry) => {
      const absolute = resolve(directory, entry);
      return statSync(absolute).isDirectory() ? walk(absolute) : [absolute];
    });
}

function rgb(hex) {
  const value = hex.replace('#', '');
  expect(value.length === 6, `invalid colour ${hex}`);
  return [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16) / 255);
}

function blend(foreground, background, alpha) {
  return foreground.map((channel, index) => channel * alpha + background[index] * (1 - alpha));
}

function luminance(color) {
  const channels = (typeof color === 'string' ? rgb(color) : color).map((channel) => (
    channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4
  ));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrast(foreground, background) {
  const foregroundLuminance = luminance(foreground);
  const backgroundLuminance = luminance(background);
  return (Math.max(foregroundLuminance, backgroundLuminance) + 0.05)
    / (Math.min(foregroundLuminance, backgroundLuminance) + 0.05);
}

function expectContrast(foreground, background, threshold, label) {
  const ratio = contrast(foreground, background);
  expect(ratio >= threshold, `${label} contrast is ${ratio.toFixed(2)}; expected at least ${threshold.toFixed(1)}`);
}

const manifest = source('docs/APPEARANCE_MANIFEST.md');
const inventoryMatch = manifest.match(/<!-- route-inventory:start -->([\s\S]*?)<!-- route-inventory:end -->/);
expect(inventoryMatch, 'appearance manifest has no exact route inventory block');
const manifestRoutes = [...inventoryMatch[1].matchAll(/^- `([^`]+)`$/gm)].map((match) => match[1]);
const duplicateRoutes = manifestRoutes.filter((route, index) => manifestRoutes.indexOf(route) !== index);
expect(duplicateRoutes.length === 0, `appearance manifest repeats ${duplicateRoutes.join(', ')}`);

const appRoot = resolve(mobileRoot, 'app');
const filesystemRoutes = walk(appRoot)
  .filter((path) => path.endsWith('.tsx'))
  .map((path) => relative(mobileRoot, path).replaceAll('\\', '/'))
  .sort();
const documentedRoutes = [...manifestRoutes].sort();
const missingRoutes = filesystemRoutes.filter((route) => !documentedRoutes.includes(route));
const staleRoutes = documentedRoutes.filter((route) => !filesystemRoutes.includes(route));
expect(missingRoutes.length === 0, `appearance manifest misses ${missingRoutes.join(', ')}`);
expect(staleRoutes.length === 0, `appearance manifest contains stale routes ${staleRoutes.join(', ')}`);

for (const route of filesystemRoutes) {
  const contents = source(route);
  const lineCount = contents.split('\n').length;
  if (lineCount > 15) {
    expect(contents.includes('usePluggdTheme'), `${route} is a direct screen/layout without semantic theme ownership`);
  } else {
    expect(!contents.includes('StyleSheet.create'), `${route} is documented as a thin entry but creates its own styles`);
    for (const match of contents.matchAll(/from\s+['"](\.{1,2}\/[^'"]+)['"]/g)) {
      const base = resolve(dirname(resolve(mobileRoot, route)), match[1]);
      const delegate = [`${base}.tsx`, resolve(base, 'index.tsx')].find((candidate) => existsSync(candidate));
      if (!delegate) continue;
      const delegatePath = relative(mobileRoot, delegate).replaceAll('\\', '/');
      if (delegatePath === 'src/features/discovery/MusicDiscoveryDiscover.tsx') continue;
      expect(
        readFileSync(delegate, 'utf8').includes('usePluggdTheme'),
        `${route} delegates visible chrome to ${delegatePath} without semantic theme ownership`,
      );
    }
  }
}

const delegatedScreenAuthorities = [
  'components/CreatorAccessGate.tsx',
  'src/commerce/CheckoutStatusScreen.tsx',
  'src/features/carnival/CarnivalHubScreen.tsx',
  'src/features/connect/ConnectCardScreen.tsx',
  'src/features/culture/CultureScreens.tsx',
  'src/features/editorial/BeatPlugScreen.tsx',
  'src/features/editorial/ListeningFloorScreen.tsx',
  'src/features/editorial/MarketStoreScreen.tsx',
  'src/features/editorial/MixesWorldScreen.tsx',
  'src/features/editorial/ThePlugIndexScreen.tsx',
  'src/features/maps/MapSignalsScreen.tsx',
  'src/features/opportunities/OpportunityScreens.tsx',
  'src/features/parity/AppWideParityScreens.tsx',
  'src/features/search/search-discovery-screen.tsx',
  'src/features/live/live-culture-screen.tsx',
  'src/features/studio/OwnerCatalogScreen.tsx',
  'src/features/studio/SplitEngineScreens.tsx',
  'src/features/studio/StudioBrowserScreen.tsx',
  'src/features/studio/StudioCommerceScreen.tsx',
  'src/features/studio/StudioConnectCardEditorScreen.tsx',
  'src/features/studio/StudioFinancialsScreen.tsx',
  'src/features/studio/StudioVideoScreen.tsx',
  'src/screens/LiveSessionScreen.tsx',
];
for (const authority of delegatedScreenAuthorities) {
  expect(source(authority).includes('usePluggdTheme'), `${authority} is a delegated screen without semantic theme ownership`);
}

const provider = source('src/design/usePluggdTheme.ts');
for (const required of [
  "export type PluggdThemeMode = 'system' | 'light' | 'dark'",
  "const THEME_MODE_KEY = 'pluggd.themeMode'",
  'useColorScheme()',
  'AsyncStorage.getItem(THEME_MODE_KEY)',
  'AsyncStorage.setItem(THEME_MODE_KEY, nextMode)',
  "mode === 'system'",
  'isHydrated',
  'Settings.set({ [THEME_MODE_KEY]: mode })',
  "Appearance.setColorScheme(mode === 'system' ? null : mode)",
  "Platform.OS !== 'ios'",
]) {
  expect(provider.includes(required), `appearance provider is missing ${required}`);
}

const appDelegate = source('ios/Pluggd/AppDelegate.swift');
for (const required of [
  'private static let appearanceModeKey = "pluggd.themeMode"',
  'UserDefaults.standard.string(forKey: Self.appearanceModeKey)',
  'window?.overrideUserInterfaceStyle = .light',
  'window?.overrideUserInterfaceStyle = .dark',
  'window?.overrideUserInterfaceStyle = .unspecified',
  'window?.backgroundColor = pluggdLaunchSurfaceColor',
  'rootView.backgroundColor = pluggdLaunchSurfaceColor',
]) {
  expect(appDelegate.includes(required), `native launch appearance is missing ${required}`);
}
expect(
  appDelegate.indexOf('window?.overrideUserInterfaceStyle') < appDelegate.indexOf('factory.startReactNative'),
  'persisted native appearance must be applied before the React window starts',
);
expect(
  appDelegate.indexOf('window?.backgroundColor = pluggdLaunchSurfaceColor') < appDelegate.indexOf('factory.startReactNative'),
  'neutral launch colour must be applied before the React window starts',
);

const splashBackground = JSON.parse(source('ios/Pluggd/Images.xcassets/SplashScreenBackground.colorset/Contents.json'));
expect(splashBackground.colors.length === 1, 'native splash background must remain appearance-neutral instead of following a stale system snapshot');
expect(splashBackground.colors[0].color.components.red === '1.000', 'native splash must use PLUGGD orange');
expect(splashBackground.colors[0].color.components.green === '0.400', 'native splash must use PLUGGD orange');
const splashLogo = JSON.parse(source('ios/Pluggd/Images.xcassets/SplashScreenLogo.colorset/Contents.json'));
expect(splashLogo.colors.length === 1, 'native splash wordmark must remain appearance-neutral');
expect(splashLogo.colors[0].color.components.red === '0.0941176470588235', 'native splash wordmark must use high-contrast ink');
const splashImage = JSON.parse(source('ios/Pluggd/Images.xcassets/SplashScreenLegacy.imageset/Contents.json'));
expect(splashImage.properties?.['template-rendering-intent'] === 'template', 'native splash wordmark must use the adaptive template tint');
for (const [path, expectedWidth, expectedHeight] of [
  ['ios/Pluggd/Images.xcassets/SplashScreenLegacy.imageset/image.png', 300, 106],
  ['ios/Pluggd/Images.xcassets/SplashScreenLegacy.imageset/image@2x.png', 600, 211],
  ['ios/Pluggd/Images.xcassets/SplashScreenLegacy.imageset/image@3x.png', 900, 317],
]) {
  const [width, height] = pngDimensions(path);
  expect(width === expectedWidth && height === expectedHeight, `${path} must be a correctly scaled launch rendition`);
}
const splashStoryboard = source('ios/Pluggd/SplashScreen.storyboard');
expect(splashStoryboard.includes('<color key="tintColor" red="0.0941176470588235" green="0.0392156862745098" blue="0.0078431372549020" alpha="1"'), 'native splash does not encode the high-contrast ink tint directly');
expect(splashStoryboard.includes('<color key="backgroundColor" red="1" green="0.4" blue="0" alpha="1"'), 'native splash does not encode the neutral PLUGGD orange canvas directly');
expect(splashStoryboard.includes('firstAttribute="centerX" secondItem="EXPO-ContainerView" secondAttribute="centerX"'), 'native splash wordmark must remain horizontally centred');
expect(splashStoryboard.includes('firstAttribute="centerY" secondItem="EXPO-ContainerView" secondAttribute="centerY"'), 'native splash wordmark must remain vertically centred');
expect(splashStoryboard.includes('firstAttribute="width" constant="240"'), 'native splash wordmark must remain inside the 240-point safe lockup');
expect(splashStoryboard.includes('secondAttribute="height" multiplier="150:53"'), 'native splash wordmark must preserve the supplied aspect ratio');
expect(!splashStoryboard.includes('firstAttribute="leading" secondItem="EXPO-ContainerView"'), 'native splash wordmark must not be stretched to the launch-screen edges');
const appConfig = source('app.config.ts');
expect(appConfig.includes("backgroundColor: '#FF6600'"), 'future native generation must preserve the appearance-neutral PLUGGD launch canvas');

const rootLayout = source('app/_layout.tsx');
expect(rootLayout.includes('<PluggdThemeProvider>'), 'root layout does not own the appearance provider');
expect(rootLayout.includes('if (!isHydrated) return null'), 'saved appearance can flash before hydration');
expect(rootLayout.includes("theme.scheme === 'dark' ? 'light' : 'dark'"), 'status bar does not follow the resolved appearance');
expect(rootLayout.includes('SystemUI.setBackgroundColorAsync(theme.colors.background)'), 'native root background does not follow appearance');
expect(
  /maxFontSizeMultiplier=\{1\.25\}[\s\S]*?numberOfLines=\{1\}[\s\S]*?>\s*PLUGGD\s*<\/Text>/.test(rootLayout),
  'React font-gate wordmark can wrap or exceed its bounded accessibility size',
);

const settings = source('app/settings/index.tsx');
for (const label of ['System', 'Editorial Light', 'Night']) {
  expect(settings.includes(`label: '${label}'`), `Settings is missing ${label}`);
}
expect(settings.includes('accessibilityRole="radiogroup"'), 'appearance chooser is not an accessible radio group');
expect(settings.includes('accessibilityRole="radio"'), 'appearance options are not accessible radio controls');
expect(settings.includes('accessibilityState={{ selected, checked: selected }}'), 'appearance selected state is not exposed');

const tokens = source('src/design/tokens.ts');
for (const literal of [
  "accent: '#B13A00'",
  "accentFill: PLUGGD_LIGHT_ORANGE",
  "accentText: '#B13A00'",
  "onAccent: '#180A02'",
  "background: '#FFF8ED'",
  "surface: '#F4E7D2'",
  "surfaceAlt: '#ECDDCA'",
  "text: '#22170F'",
  "textSecondary: '#49382C'",
  "textMuted: '#6B584A'",
  "textSubtle: '#745E4F'",
  "controlBorder: '#956E52'",
  "danger: '#B42318'",
  "success: '#08713B'",
  "controlBorder: '#716B74'",
]) {
  expect(tokens.includes(literal), `semantic palette is missing ${literal}`);
}

const semanticSources = walk(mobileRoot)
  .filter((path) => /\.(?:ts|tsx)$/.test(path))
  .filter((path) => !path.includes('/node_modules/'));
for (const absolute of semanticSources) {
  const contents = readFileSync(absolute, 'utf8');
  const path = relative(mobileRoot, absolute).replaceAll('\\', '/');
  expect(
    !/backgroundColor:\s*(?:theme\.)?colors\.accent(?:[,}\s]|$)/.test(contents),
    `${path} uses editorial accent as a filled background; use accentFill with onAccent instead`,
  );
}

const lightCanvases = ['#FFF8ED', '#F4E7D2', '#ECDDCA'];
for (const canvas of lightCanvases) {
  expectContrast('#22170F', canvas, 4.5, `Editorial Light primary ink on ${canvas}`);
  expectContrast('#49382C', canvas, 4.5, `Editorial Light secondary ink on ${canvas}`);
  expectContrast('#B13A00', canvas, 4.5, `Editorial Light orange editorial text on ${canvas}`);
  expectContrast('#B42318', canvas, 4.5, `Editorial Light danger text on ${canvas}`);
  expectContrast('#08713B', canvas, 4.5, `Editorial Light success text on ${canvas}`);
}
expectContrast('#6B584A', '#F4E7D2', 4.5, 'Editorial Light muted copy');
expectContrast('#745E4F', '#ECDDCA', 4.5, 'Editorial Light subtle copy');
expectContrast('#180A02', '#E84F00', 4.5, 'Editorial Light primary control text');
expectContrast('#956E52', '#ECDDCA', 3, 'Editorial Light control outline');

const darkBackground = rgb('#090705');
const darkSurface = blend(rgb('#121114'), darkBackground, 0.36);
expectContrast(blend(rgb('#FFFFFF'), darkSurface, 0.96), darkSurface, 4.5, 'Night primary copy');
expectContrast(blend(rgb('#FFFFFF'), darkSurface, 0.72), darkSurface, 4.5, 'Night secondary copy');
expectContrast(blend(rgb('#FFFFFF'), darkSurface, 0.46), darkSurface, 4.5, 'Night muted copy');
expectContrast('#FF6600', darkSurface, 4.5, 'Night orange editorial text');
expectContrast('#180A02', '#FF6600', 4.5, 'Night primary control text');
expectContrast('#716B74', darkSurface, 3, 'Night control outline');

const primitives = source('components/PluggdPrimitives.tsx');
expect(primitives.includes('theme.colors.accentFill'), 'primary primitive does not use accentFill');
expect(primitives.includes('theme.colors.onAccent'), 'primary primitive does not use onAccent');
expect(primitives.includes('theme.colors.controlBorder'), 'secondary primitive does not use controlBorder');
expect(/hitTarget:\s*\{[\s\S]*?minWidth:\s*44,[\s\S]*?minHeight:\s*44,/.test(primitives), 'shared hit target is smaller than 44 by 44 points');

const targetContracts = [
  ['app/(tabs)/live/_layout.tsx', /contentStyle:\s*\{\s*backgroundColor:\s*theme\.colors\.background\s*\}/],
  ['app/auth/access-code.tsx', /backButton:\s*\{[\s\S]*?width:\s*44,[\s\S]*?height:\s*44,/],
  ['app/auth/login.tsx', /topButton:\s*\{[\s\S]*?minHeight:\s*44,[\s\S]*?modeButton:\s*\{[\s\S]*?minHeight:\s*44,/],
  ['app/auth/signup.tsx', /topButton:\s*\{[\s\S]*?minHeight:\s*44,[\s\S]*?modeButton:\s*\{[\s\S]*?minHeight:\s*44,/],
  ['app/auth/role.tsx', /secondaryChip:\s*\{[\s\S]*?minHeight:\s*44,/],
  ['app/auth/fan-setup.tsx', /followButton:\s*\{[\s\S]*?minHeight:\s*44,/],
  ['app/settings/data-export.tsx', /back:\s*\{\s*width:\s*44,\s*height:\s*44,/],
  ['app/wallet.tsx', /infoButton:\s*\{[\s\S]*?width:\s*44,[\s\S]*?height:\s*44,/],
  ['app/backstage/[id].tsx', /backButton:\s*\{\s*width:\s*44,\s*height:\s*44,[\s\S]*?joinButton:\s*\{\s*minHeight:\s*44,/],
  ['app/membership/[creatorId].tsx', /billingPeriodButton:\s*\{[\s\S]*?minHeight:\s*44,/],
  ['app/player.tsx', /progressWrap:\s*\{\s*height:\s*44,/],
  ['app/soundboards/[id].tsx', /seekTarget:\s*\{[^}]*height:\s*44/],
  ['components/ContentUI.tsx', /minWidth:\s*44,[\s\S]*?minHeight:\s*44/],
  ['components/PluggdTopNavigation.tsx', /width:\s*44,[\s\S]*?height:\s*44/],
  ['src/features/discovery/DiscoveryHeader.tsx', /logoButton:\s*\{[^}]*height:\s*44/],
  ['src/features/discovery/DiscoveryExperience.tsx', /seeAllButton:\s*\{[^}]*minWidth:\s*44,[^}]*minHeight:\s*44/],
  ['src/features/home/MusicDiscoveryHome.tsx', /seeAllButton:\s*\{[^}]*minWidth:\s*44,[^}]*minHeight:\s*44/],
  ['src/features/community-feed/CommunityFeedScreen.tsx', /filterTab:\s*\{[^}]*minWidth:\s*44,[^}]*minHeight:\s*44/],
  ['src/features/culture/MobileSocialPostCard.tsx', /minWidth:\s*44,[\s\S]*?minHeight:\s*44/],
  ['src/features/studio/StudioScreens.tsx', /studioMenuTap:\s*\{[\s\S]*?width:\s*44,[\s\S]*?height:\s*44,[\s\S]*?studioExitButton:\s*\{[\s\S]*?width:\s*44,[\s\S]*?height:\s*44,/],
  ['src/features/mypluggd/my-pluggd-screen.tsx', /feedSwitchButton:\s*\{[^}]*minHeight:\s*44[\s\S]*?filterPill:\s*\{[^}]*minHeight:\s*44/],
  ['src/features/profile/my-profile-screen.tsx', /accessibilityLabel="Edit profile photo" hitSlop=\{5\}/],
  ['src/features/profiles/PublicCreatorProfileScreen.tsx', /style=\{\[styles\.rowPlay,[^\]]+\]\}[\s\S]*?hitSlop=\{3\}[\s\S]*?styles\.cardPlay/],
];
for (const [path, pattern] of targetContracts) {
  expect(pattern.test(source(path)), `${path} is missing its recorded 44-point target contract`);
}

const wallet = source('app/wallet.tsx');
expect(wallet.includes('backgroundColor: theme.colors.surface, borderColor: theme.colors.danger'), 'Wallet error state does not follow the resolved semantic appearance');
expect(wallet.includes('color={theme.colors.danger}'), 'Wallet error icon does not use the semantic danger colour');

const studio = source('src/features/studio/StudioScreens.tsx');
expect(studio.includes('style={[styles.root, { backgroundColor: theme.colors.background }]}'), 'Studio shell does not use the resolved semantic canvas');
expect(studio.includes("<StatusBar style={theme.scheme === 'dark' ? 'light' : 'dark'} />"), 'Studio shell status bar does not follow the resolved appearance');
expect(studio.includes('colorScheme={theme.scheme}'), 'Studio dock does not follow the resolved appearance');
const myPluggd = source('src/features/mypluggd/my-pluggd-screen.tsx');
expect(myPluggd.includes('accessibilityLabel={`Open ${plug.display_name}`} hitSlop={8}'), 'My PLUGGD map markers do not expose a 44-point hit area');

const discoverEntry = source('src/features/discovery/MusicDiscoveryDiscover.tsx');
expect(/export function MusicDiscoveryDiscover\(\)\s*\{\s*return <DiscoveryExperience\s*\/>;\s*\}/.test(discoverEntry), 'Discover does not resolve to the accepted DiscoveryExperience');
expect(discoverEntry.includes('export function LegacyMusicDiscoveryDiscover'), 'legacy Discover recovery source was unexpectedly removed');
for (const route of ['app/discover.tsx', 'app/(tabs)/discover.tsx']) {
  expect(!source(route).includes('LegacyMusicDiscoveryDiscover'), `${route} reaches the legacy Discover screen`);
}

for (const phrase of [
  'These are not whole-screen exemptions',
  'Home artwork-backed feature cards',
  'Discover spotlights',
  'MobileSocialMediaViewer',
  'inner Mapbox/Apple map canvas',
  'Full-player/mini-player artwork',
  'cold launch with no Night flash',
]) {
  expect(manifest.includes(phrase), `appearance manifest is missing the boundary: ${phrase}`);
}

console.log(`mobile appearance Phase 11A contract passed (${filesystemRoutes.length} Expo entries, three modes, semantic route chrome, AA palette and 44-point shared controls)`);
