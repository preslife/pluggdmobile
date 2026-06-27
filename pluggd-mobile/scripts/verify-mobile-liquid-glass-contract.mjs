import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const exists = (path) => existsSync(new URL(path, root));
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const componentDir = new URL('components/liquid-glass/', root);
assert.ok(exists('src/design/liquidGlassTokens.ts'), 'liquid glass token file must exist');
assert.ok(exists('components/liquid-glass/index.ts'), 'liquid glass component barrel must exist');

const requiredComponents = [
  'LiquidBackground.tsx',
  'LiftSurface.tsx',
  'GlassPanel.tsx',
  'GlassPillTabs.tsx',
  'GlassIconButton.tsx',
  'GlassHeroCard.tsx',
  'GlassRailCard.tsx',
  'GlassAlbumArt.tsx',
  'GlassTrackCard.tsx',
  'GlassAvatar.tsx',
  'GlassStoryRing.tsx',
  'GlassComposer.tsx',
  'GlassFeedPost.tsx',
  'GlassMiniPlayer.tsx',
  'GlassDock.tsx',
  'GlassSheet.tsx',
  'SectionHeader.tsx',
];

const files = new Set(readdirSync(componentDir));
for (const file of requiredComponents) {
  assert.ok(files.has(file), `components/liquid-glass/${file} must exist`);
}

const tokens = read('src/design/liquidGlassTokens.ts');
for (const token of ['liquidGlassColors', 'liquidGlassRadii', 'liquidGlassElevation', 'liquidGlassIntensity']) {
  assert.match(tokens, new RegExp(escapeRegExp(token)), `liquid glass tokens must export ${token}`);
}

const layout = read('app/_layout.tsx');
const primitives = read('components/PluggdPrimitives.tsx');
const dock = read('components/PluggdDock.tsx');
const miniPlayer = read('components/MiniPlayer.tsx');
const createSheet = read('components/CreateActionSheet.tsx');
const accountHeader = read('components/MobileHeader.tsx');
const parityScreens = read('src/features/parity/AppWideParityScreens.tsx');
const community = read('src/features/community-feed/CommunityFeedScreen.tsx');
const composer = read('src/features/community-feed/CommunityComposer.tsx');
const glassComposer = read('components/liquid-glass/GlassComposer.tsx');
const stories = read('src/features/culture/MobileStoriesRail.tsx');
const socialCard = read('src/features/culture/MobileSocialPostCard.tsx');

assert.match(layout + primitives, /LiquidBackground/, 'app layout or shared backdrop must use LiquidBackground');
assert.match(dock, /GlassDock/, 'global dock must use GlassDock');
assert.match(miniPlayer, /GlassMiniPlayer/, 'mini player must use GlassMiniPlayer');
assert.match(createSheet, /GlassSheet[\s\S]*hasCreatorAccess/, 'create sheet must keep role-aware logic and use GlassSheet');
assert.match(accountHeader, /GlassSheet[\s\S]*Wallet \/ Credits[\s\S]*Activity/, 'account sheet must use glass and keep account routes');

for (const token of ['GlassHeroCard', 'GlassRailCard', 'LiquidBackground', 'SectionHeader']) {
  assert.match(parityScreens, new RegExp(escapeRegExp(token)), `Discover/Events/Market scaffold must use ${token}`);
}

for (const token of ['LiquidBackground', 'GlassPillTabs', 'MobileStoriesRail', 'CommunityComposer', 'MobileSocialPostCard']) {
  assert.match(community, new RegExp(escapeRegExp(token)), `Community feed must include ${token}`);
}

assert.match(composer, /GlassComposer/, 'community composer must use GlassComposer');
assert.match(composer + glassComposer, /Sign in to post/, 'community composer must keep signed-out compose gate');
assert.match(composer + glassComposer, /Start a post/, 'community composer must keep signed-in compose entry');
assert.match(stories, /GlassStoryRing/, 'stories rail must use GlassStoryRing');
assert.match(socialCard, /GlassPanel[\s\S]*toggleSocialLike[\s\S]*toggleSocialBookmark[\s\S]*toggleSocialRepost/, 'social post card must use glass and keep social actions');

for (const label of ['Home', 'Discover', 'Community', 'Events', 'Market']) {
  assert.match(dock, new RegExp(`label:\\s*'${label}'`), `dock must keep ${label}`);
}
assert.doesNotMatch(dock, /label:\s*'(Create|Profile|Live)'/, 'dock must not add Create, Profile, or Live as tabs');

console.log('mobile liquid glass contract verified');
