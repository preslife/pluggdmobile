import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const mobileHeader = read('components/MobileHeader.tsx');
const discoveryHeader = read('src/features/discovery/DiscoveryHeader.tsx');
const miniPlayer = read('components/MiniPlayer.tsx');
const glassMiniPlayer = read('components/liquid-glass/GlassMiniPlayer.tsx');
const glassDock = read('components/liquid-glass/GlassDock.tsx');
const player = read('app/player.tsx');
const playbackService = read('src/features/playback/publicPlaybackService.ts');
const provider = read('src/context/PlaybackProvider.tsx');

for (const source of [mobileHeader, discoveryHeader]) {
  assert.match(source, /accessibilityLabel="Search PLUGGD"/, 'shared headers must retain the Search route action');
  assert.match(source, /Open notifications/, 'shared headers must expose the notifications action');
  assert.match(source, /accessibilityLabel="Open account menu"/, 'shared headers must retain the account action');
  assert.match(source, /height:\s*44/, 'shared header controls must use accessible 44-point targets');
  assert.match(source, /size=\{36\}/, 'shared header avatars must retain their founder-approved 36-point visible size inside accessible targets without clipping');
  assert.match(source, /Open PLUGGD Live/, 'shared headers must retain the Live route action');
}

assert.match(mobileHeader, /avatarTap:\s*\{[\s\S]*?width:\s*44,[\s\S]*?height:\s*44,[\s\S]*?alignItems:\s*'center',[\s\S]*?justifyContent:\s*'center',[\s\S]*?\}/, 'the shared 36-point avatar must remain centred in its 44-point target');
assert.doesNotMatch(mobileHeader, /avatarTap:\s*\{[^}]*translateY:\s*-1/, 'the shared header avatar must not be pulled into the clipped rounded edge');
assert.match(glassDock, /tabRow:\s*\{[\s\S]*?height:\s*60,[\s\S]*?transform:\s*\[\{\s*translateY:\s*5\s*\}\]/, 'the complete public dock row must use the approved five-point optical centring in every appearance');
assert.doesNotMatch(glassDock, /tabRowLight|light\s*&&\s*styles\.tabRow/, 'dock centring must not be limited to Editorial Light');
assert.match(glassDock, /height:\s*60\s*\+\s*bottomInset/, 'dock optical centring must preserve the safe-area shell height');
assert.match(glassDock, /tabPressable:\s*\{[\s\S]*?height:\s*54/, 'dock optical centring must preserve 54-point press targets');

assert.match(provider, /closePlayer:\s*\(\)\s*=>\s*Promise<void>/, 'playback context must expose a distinct close action');
assert.match(provider, /const closePlayer[\s\S]*TrackPlayer\.reset\(\)[\s\S]*setQueue\(\[\]\)[\s\S]*originalQueue\.current = \[\]/, 'close must stop media and clear the active queue context');
assert.match(miniPlayer, /shouldDefaultCollapseMiniPlayer\(normalizedPathname\)/, 'route-aware mini-player presentation must remain the single default-collapse decision');
for (const routeAssertion of [
  /pathname\.startsWith\('\/soundboards\/'\)/,
  /pathname === '\/releases'/,
  /pathname\.startsWith\('\/release\/'\)/,
  /pathname === '\/store'/,
  /pathname === '\/market'/,
  /pathname\.startsWith\('\/market\/'\)/,
  /pathname === '\/sample-packs'/,
  /pathname\.startsWith\('\/sample-pack\/'\)/,
  /pathname\.startsWith\('\/product\/'\)/,
]) {
  assert.match(miniPlayer, routeAssertion, 'Soundboard, Release and Store routes must default to the compact player for visible-action clearance');
}
assert.match(miniPlayer, /text: 'Close player'[\s\S]*void closePlayer\(\)/, 'deliberate options-menu close must use the shared stop-and-clear action');
assert.match(miniPlayer, /<View pointerEvents="box-none" style=\{styles\.wrap\}>/, 'the transparent mini-player wrapper must not intercept visible Store content outside the player');
assert.doesNotMatch(miniPlayer, /Lyrics \/ BarFlow|tool:\s*'barflow'/, 'the player must not expose internal or unverified lyrics actions');

assert.match(glassMiniPlayer, /<View pointerEvents="box-none" style=\{styles\.pressable\}>/, 'the expanded player outer margin must pass taps through to underlying visible content');
assert.match(glassMiniPlayer, /<View pointerEvents="box-none" style=\{styles\.collapsedWrap\}>/, 'the collapsed player wrapper must capture only its visible expand control');
assert.match(glassMiniPlayer, /accessibilityLabel="Collapse mini player"/, 'collapse must remain separate from close');
assert.match(glassMiniPlayer, /accessibilityLabel="Expand mini player"/, 'collapsed player must remain recoverable');
assert.doesNotMatch(glassMiniPlayer, /accessibilityLabel="Close player and stop playback"/, 'the easy-to-hit visible X must not sit beside collapse');
assert.match(glassMiniPlayer, /identityAction:\s*\{[\s\S]*width:\s*44,[\s\S]*height:\s*44/, 'expanded player actions must meet the 44-point target minimum');
assert.doesNotMatch(glassMiniPlayer, /collapsedClose:/, 'collapsed player must not expose an adjacent destructive close control');

assert.match(player, /accessibilityLabel="Minimise player"/, 'full player minimise must remain distinct from close');
assert.match(player, /accessibilityLabel="Open player options"[\s\S]*onPress=\{openPlayerOptions\}/, 'full player must expose its deliberate options menu in every layout');
assert.match(player, /Player options[\s\S]*Close player[\s\S]*dismissPlayer/, 'destructive close must remain inside the deliberate options menu');
assert.match(player, /await closePlayer\(\)/, 'full player close must use the shared stop-and-clear action');
assert.match(player, /const isCompactPortrait = !isLandscape && width <= 400 && height <= 700/, 'full player must identify the 375x667 compact portrait layout without changing normal-width presentation');
assert.match(player, /isCompactPortrait && styles\.compactHeroArt/, 'compact full player must reduce artwork height so primary controls remain above the home safe area');
assert.match(player, /compactHeroArt:\s*\{[^}]*width:\s*210,[^}]*height:\s*210,[^}]*alignSelf:\s*'center'/, 'compact full-player artwork must preserve its square composition while leaving room for the complete playback control row');
assert.match(player, /isCompactPortrait && styles\.compactControls/, 'compact full player must apply the dedicated control-row clearance rhythm');
assert.match(player, /compactPlayButton:\s*\{[^}]*width:\s*64,[^}]*height:\s*64/, 'compact primary playback must remain visually prominent while fitting the viewport');
assert.match(playbackService, /from\('soundboard_items'\)[\s\S]*waveform_data/, 'Soundboard waveform must come from the real item field through the shared playback service');
assert.match(playbackService, /rpc\('get_public_playback_metadata'/, 'track, beat and mix waveforms must use the public-safe canonical metadata interface');
assert.match(player, /RealWaveform[\s\S]*progressPercent[\s\S]*onPress=\{onSeek\}/, 'real waveform must reflect playback progress and support seeking');
assert.match(player, /waveformBars\.length > 0[\s\S]*Seek playback/, 'tracks without real waveform data must retain an honest progress rail');
assert.doesNotMatch(player, /Math\.random|mockWaveform|fakeWaveform|generatedWaveform/i, 'player must not fabricate waveform amplitudes');
assert.match(playbackService, /from\('published_track_lyrics'\)[\s\S]*\.eq\('track_id', trackId\)/, 'published lyrics must come from the real selected-track field');
assert.match(player, /enabled:\s*Boolean\(currentTrack\?\.trackId\)/, 'lyrics lookup must run only for the selected release track');
assert.match(player, /Lyrics haven’t been published for this release\./, 'missing lyrics must have an honest absence state');
assert.doesNotMatch(player, /generateLyrics|mockLyrics|placeholder lyrics/i, 'player must not fabricate lyrics');

console.log('mobile global shell and player contract verified');
