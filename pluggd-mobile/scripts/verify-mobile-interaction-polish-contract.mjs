import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');

const editorial = read('src/features/editorial/EditorialBits.tsx');
const discover = read('src/features/discovery/MusicDiscoveryDiscover.tsx');
const community = read('src/features/community-feed/CommunityFeedScreen.tsx');
const communitySwitcher = read('src/features/community-feed/CommunityInternalSwitcher.tsx');
const store = read('src/features/editorial/MarketStoreScreen.tsx');
const opportunities = read('src/features/opportunities/OpportunityScreens.tsx');
const soundboards = read('src/features/editorial/SoundboardsIndexScreen.tsx');
const soundboardDetail = read('app/soundboards/[id].tsx');
const miniPlayer = read('components/MiniPlayer.tsx');
const glassMiniPlayer = read('components/liquid-glass/GlassMiniPlayer.tsx');
const productDetail = read('app/product/[id].tsx');
const commercePolicy = read('src/commerce/policy.ts');

assert.match(editorial, /useReducedMotion\(\)[\s\S]*?reducedMotion\s*\?\s*undefined/, 'Editorial entrance motion must stop when iOS Reduce Motion is enabled');
assert.match(editorial, /haptic\?: boolean \| 'selection' \| 'impact'/, 'Shared editorial presses must distinguish select and primary feedback');
assert.match(editorial, /haptic === 'impact'\) impactHaptic\(\)[\s\S]*?else if \(haptic\) selectionHaptic\(\)/, 'Shared press feedback must remain restrained and action-specific');

assert.match(discover, /const navigate = \(route: string\)[\s\S]*?selectionHaptic\(\)[\s\S]*?router\.push/, 'Discover navigation must provide selection feedback');
assert.match(discover, /const chooseFilter[\s\S]*?next !== filter\) selectionHaptic\(\)/, 'Discover filter changes must provide one selection tick');
assert.match(discover, /if \(!isPlayableDiscoveryItem\(item\)\)[\s\S]*?selectionHaptic\(\)[\s\S]*?impactHaptic\(\)[\s\S]*?playQueue/, 'Discover must reserve impact feedback for real playback');
assert.doesNotMatch(discover, /onPress=\{\(\) => router\.push/, 'Discover visible navigation must use the feedback-aware route helper');

assert.match(community, /const navigate = \(route: string\)[\s\S]*?selectionHaptic\(\)[\s\S]*?router\.push/, 'Community routes must provide selection feedback');
assert.match(community, /chooseFilter[\s\S]*?chooseBoardCategory/, 'Community feed and board filters must provide selection feedback');
assert.match(communitySwitcher, /CommunityInternalSwitcher[\s\S]*?selectionHaptic\(\)[\s\S]*?item\.action\(\)/, 'Community primary switcher actions must provide selection feedback');
assert.match(communitySwitcher, /CommunityBottomDockControls[\s\S]*?selectionHaptic\(\)[\s\S]*?item\.action\(\)/, 'Community lower shortcuts must provide the same feedback');

assert.match(store, /haptic="impact"[\s\S]*?accessibilityLabel="Explore BeatPlug"/, 'Store primary discovery action must use impact feedback');
assert.match(store, /haptic="impact"[\s\S]*?Open featured product/, 'Store featured product must use primary-action feedback');
assert.match(store, /useBottomChromeInset\(\)[\s\S]*?paddingBottom:\s*bottomInset/, 'Store content must continue to clear the player and dock');

assert.match(opportunities, /function EdPressable[\s\S]*?selectionHaptic\(\)[\s\S]*?onPress\?\./, 'Opportunities visible actions must retain shared selection feedback');
assert.match(opportunities, /safeOpportunityExternalUrl[\s\S]*?Linking\.openURL/, 'Opportunity external actions must validate organiser URLs before opening them');
assert.match(opportunities, /Apply on the official organiser website[\s\S]*?openOfficialUrl/, 'Opportunity apply action must remain wired to the validated official URL');
assert.match(opportunities, /Start preparing this application[\s\S]*?statusMutation\.mutate\('preparing'\)/, 'Opportunity preparation must remain a real state transition');

assert.match(soundboards, /EdPressable[\s\S]*?router\.push\(`\/soundboards\/\$\{board\.slug \|\| board\.id\}`/, 'Soundboard index cards must open their real canvas');
assert.match(soundboardDetail, /resolveSoundboardPlaybackUrl[\s\S]*?playTrack/, 'Soundboard item play must resolve real media before playback');
assert.match(soundboardDetail, /playAll[\s\S]*?playQueue/, 'Soundboard Play all must remain a real queue action');
assert.match(soundboardDetail, /Open Soundboard comments[\s\S]*?setCommentsOpen\(true\)/, 'Soundboard comments must remain functional');

for (const route of [
  'app/search.tsx',
  'app/live/index.tsx',
  'app/live/create.tsx',
  'app/live/session.tsx',
  'app/market/[section].tsx',
  'app/opportunities/index.tsx',
  'app/opportunities/[id].tsx',
  'app/soundboards/index.tsx',
  'app/soundboards/[id].tsx',
  'app/releases/index.tsx',
  'app/plug/index.tsx',
  'app/events/index.tsx',
  'app/maps.tsx',
  'app/sample-packs/index.tsx',
  'app/sample-pack/[id].tsx',
  'app/product/[id].tsx',
  'app/purchases.tsx',
  'app/player.tsx',
]) {
  assert.equal(existsSync(new URL(route, root)), true, `${route} must remain reachable from a visible audited action`);
}

assert.match(glassMiniPlayer, /accessibilityLabel="Collapse mini player"[\s\S]*?onToggleCollapse/, 'Mini player minimise must remain distinct and functional');
assert.match(glassMiniPlayer, /accessibilityLabel="Open player options"[\s\S]*?onMorePress/, 'Mini player options must remain reachable without exposing an adjacent destructive close control');
assert.match(miniPlayer, /text: 'Close player'[\s\S]*?void closePlayer\(\)/, 'Mini player close must remain a deliberate stop-and-clear action in the options menu');
assert.match(glassMiniPlayer, /accessibilityLabel=\{isPlaying \? 'Pause media' : 'Play media'\}[\s\S]*?impactHaptic\(\)/, 'Player play and pause must retain primary feedback');
assert.match(miniPlayer, /const openPlayer[\s\S]*?selectionHaptic\(\)[\s\S]*?pathname: '\/player'/, 'Opening the full player must retain navigation feedback');

assert.match(productDetail, /kind:\s*'physical_merch'[\s\S]*?classification:\s*isPhysical \? 'physical' : 'digital'/, 'Store checkout must send the verified product classification to policy');
assert.match(commercePolicy, /const requiresDigitalStorefront[\s\S]*?if \(requiresDigitalStorefront && billingAdapter && !storefront\)[\s\S]*?return \{ \.\.\.RESTRICTED/, 'Missing external storefront state must continue to fail closed for digital purchases');
assert.match(productDetail, /if \(!product \|\| product\.source !== 'creator_merchandise' \|\| buying \|\| policy\.permittedRail !== 'stripe_checkout'\) return;[\s\S]*?openHostedCheckout\(/, 'Creator merchandise must stop before hosted checkout whenever source or policy denies the purchase');

for (const source of [discover, community, store, opportunities, soundboards]) {
  assert.doesNotMatch(source, /onPress=\{\(\) => \{\s*\}\}|TODO_ACTION|fake action/i, 'Audited public screens must not expose explicit no-op actions');
}

console.log('mobile general interaction polish contract verified');
