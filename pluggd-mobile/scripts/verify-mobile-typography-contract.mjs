import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const exists = (path) => existsSync(new URL(path, root));

const requiredFonts = [
  'assets/fonts/Pluggdsans5-Regular.otf',
  'assets/fonts/Satoshi-Light.otf',
  'assets/fonts/Satoshi-Regular.otf',
  'assets/fonts/Satoshi-Medium.otf',
  'assets/fonts/Satoshi-Bold.otf',
  'assets/fonts/Satoshi-Black.otf',
];

for (const font of requiredFonts) {
  assert.equal(exists(font), true, `${font} must exist`);
}

const typography = read('src/design/typography.ts');
const tokens = read('src/design/tokens.ts');
const layout = read('app/_layout.tsx');
const primitives = read('components/PluggdPrimitives.tsx');
const home = read('src/features/home/live-music-dashboard-home.tsx');
const live = read('src/features/live/live-culture-screen.tsx');
const studio = read('src/features/studio/StudioScreens.tsx');
const liquidSectionHeader = read('components/liquid-glass/SectionHeader.tsx');
const liquidGlassSheet = read('components/liquid-glass/GlassSheet.tsx');
const liquidHeroCard = read('components/liquid-glass/GlassHeroCard.tsx');
const packageJson = read('package.json');

assert.match(typography, /appTitle:\s*'Sora-ExtraBold'/, 'page/app titles must use the same Sora display family as web');
assert.match(typography, /displaySemiBold:\s*'Sora-SemiBold'/, 'Sora SemiBold display font must be exposed');
assert.match(typography, /displayBold:\s*'Sora-Bold'/, 'Sora Bold display font must be exposed');
assert.match(typography, /displayExtraBold:\s*'Sora-ExtraBold'/, 'Sora ExtraBold display font must be exposed');
assert.match(typography, /brandDisplay:\s*'PluggdSans5-Regular'/, 'legacy PLUGGD display font must only remain as an explicit brand alias');
assert.match(typography, /satoshiBlack:\s*'Satoshi-Black'/, 'hero/section typography must expose Satoshi Black');
assert.match(typography, /satoshiBold:\s*'Satoshi-Bold'/, 'CTA typography must expose Satoshi Bold');
assert.match(typography, /interSemiBold:\s*'Inter-SemiBold'/, 'Backstage forum/user-count updates must expose real Inter Semi-Bold');
assert.match(typography, /system:\s*undefined/, 'body typography must preserve native system font usage');
assert.doesNotMatch(typography, /Neue Montreal|Neue Haas Grotesk|ABC Diatype Monument/, 'old font plan must not remain active');
assert.doesNotMatch(typography, /StyleSheet as any\)\.create|TextInput\.defaultProps|Text\.defaultProps/, 'typography must not monkey-patch React Native globals');

for (const family of ['PluggdSans5-Regular', 'Satoshi-Light', 'Satoshi-Regular', 'Satoshi-Medium', 'Satoshi-Bold', 'Satoshi-Black']) {
  assert.match(layout, new RegExp(`${family}`), `${family} must be loaded in app/_layout.tsx`);
}
assert.match(packageJson, /@expo-google-fonts\/inter/, 'Inter font package must be installed for Backstage Semi-Bold text');
assert.match(layout, /Inter_600SemiBold/, 'Inter Semi-Bold font must be imported from @expo-google-fonts/inter');
assert.match(layout, /"Inter-SemiBold":\s*Inter_600SemiBold/, 'Inter Semi-Bold must be loaded through expo-font');
assert.match(packageJson, /@expo-google-fonts\/sora/, 'Sora font package must be installed to match web display typography');
for (const [importName, family] of [
  ['Sora_600SemiBold', 'Sora-SemiBold'],
  ['Sora_700Bold', 'Sora-Bold'],
  ['Sora_800ExtraBold', 'Sora-ExtraBold'],
]) {
  assert.match(layout, new RegExp(importName), `${importName} must be imported from @expo-google-fonts/sora`);
  assert.match(layout, new RegExp(`"${family}":\\s*${importName}`), `${family} must be loaded through expo-font`);
}

assert.match(tokens, /PLUGGD_ORANGE\s*=\s*'#FF5A00'/, 'canonical app orange must be #FF5A00');
assert.match(tokens, /PLUGGD_LIGHT_ORANGE\s*=\s*'#E84F00'/, 'light mode orange must be contrast-adjusted');
assert.match(tokens, /PLUGGD_BACKSTAGE_VIOLET\s*=\s*PLUGGD_VIOLET/, 'Backstage must expose a dedicated violet sub-accent token');
assert.match(tokens, /#08080C/, 'dark canvas token must be present');
assert.match(tokens, /#F7F7F9/, 'light canvas token must be present');

for (const primitive of ['PluggdTitle', 'PluggdHeading', 'PluggdSectionTitle', 'PluggdBody', 'PluggdMeta', 'PluggdCTA']) {
  assert.match(primitives, new RegExp(`export const ${primitive}`), `${primitive} text primitive must be exported`);
}

assert.match(primitives, /headerTitle:\s*{[^}]*fontFamily:\s*pluggdFonts\.displayExtraBold/s, 'premium primitive page titles must use Sora ExtraBold');
assert.match(primitives, /heroTitle:\s*{[^}]*fontFamily:\s*pluggdFonts\.displayBold/s, 'premium primitive hero titles must use Sora Bold');
assert.match(primitives, /railTitle:\s*{[^}]*fontFamily:\s*pluggdFonts\.displayBold/s, 'premium primitive section titles must use Sora Bold');
assert.match(home, /editorialTitle:\s*{[^}]*fontFamily:\s*pluggdFonts\.displayExtraBold/s, 'home hero heading must use Sora ExtraBold');
assert.match(home, /sectionTitle:\s*{[^}]*fontFamily:\s*pluggdFonts\.displayBold/s, 'home section headings must use Sora Bold');
assert.match(live, /focusTitle:\s*{[^}]*fontFamily:\s*pluggdFonts\.displayBold/s, 'live focus heading must use Sora Bold');
assert.match(studio, /sectionTitle:\s*{[^}]*fontFamily:\s*pluggdFonts\.displayBold/s, 'studio section headings must use Sora Bold');
assert.match(liquidSectionHeader, /title:\s*{[^}]*fontFamily:\s*pluggdFonts\.displayBold/s, 'liquid section heading must use Sora Bold');
assert.match(liquidGlassSheet, /title:\s*{[^}]*fontFamily:\s*pluggdFonts\.displayBold/s, 'liquid sheet heading must use Sora Bold');
assert.match(liquidHeroCard, /title:\s*{[^}]*fontFamily:\s*pluggdFonts\.displayBold/s, 'liquid hero heading must use Sora Bold');

console.log('mobile typography contract verified');
