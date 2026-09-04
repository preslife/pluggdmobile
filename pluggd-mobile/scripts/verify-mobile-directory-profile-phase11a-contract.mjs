import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => readFileSync(join(root, relativePath), 'utf8');

const service = read('src/features/directory/creatorDirectoryService.ts');
const directory = read('src/features/directory/CreatorDirectoryScreen.tsx');
const editor = read('src/features/profile/edit-profile-screen.tsx');
const publicProfile = read('src/features/profiles/PublicCreatorProfileScreen.tsx');

const creatorTabIndex = directory.indexOf("{ id: 'creator', label: 'PLUGGD Creators' }");
const artistTabIndex = directory.indexOf("{ id: 'artist', label: 'Artists' }");
assert.ok(creatorTabIndex >= 0 && creatorTabIndex < artistTabIndex, 'PLUGGD Creators must be the first/default directory tab');
assert.match(directory, /useState<CreatorDirectoryTab>\('creator'\)/, 'PLUGGD Creators must be selected by default');
assert.match(directory, /CREATORS TO KNOW NOW[\s\S]*ScrollView horizontal/, 'the artwork-led featured creator rail must remain');
assert.match(directory, /numColumns=\{2\}/, 'the compact two-column creator gallery must remain');
assert.match(directory, /usePluggdTheme\(\)[\s\S]*StatusBar style=\{theme\.scheme/, 'the directory must use the shared semantic theme and status-bar mode');
assert.doesNotMatch(directory, /accessibilityRole="tablist"/, 'the tabs must not be grouped into one inaccessible iOS element');
assert.match(directory, /accessible[\s\S]*accessibilityRole="button"[\s\S]*accessibilityLabel=\{`\$\{item\.label\} tab`\}[\s\S]*accessibilityHint=\{`Show \$\{item\.label\} in the creator directory`\}[\s\S]*accessibilityState=\{\{ selected \}\}/, 'each directory tab must remain an individually actionable, labelled, described and selected category control');
assert.match(directory, /pointerEvents="none"[\s\S]*accessibilityElementsHidden[\s\S]*importantForAccessibility="no-hide-descendants"[\s\S]*height: insets\.top[\s\S]*backgroundColor: theme\.colors\.background/, 'scrolled directory content must be masked below the status-bar safe area');
assert.match(directory, /DIRECTORY_MAX_FONT_MULTIPLIER = 1\.25[\s\S]*NativeText[\s\S]*maxFontSizeMultiplier=\{DIRECTORY_MAX_FONT_MULTIPLIER\}[\s\S]*NativeTextInput[\s\S]*maxFontSizeMultiplier=\{DIRECTORY_MAX_FONT_MULTIPLIER\}/, 'directory text and search input must retain bounded Dynamic Type scaling');
assert.doesNotMatch(directory, /MusicBrainz|musicbrainz|claim this artist|unclaimed/i, 'the native directory must not expose provenance or unsafe unclaimed messaging');

const industryClassifierIndex = service.indexOf("if (userType === 'industry'");
const creatorClassifierIndex = service.indexOf('if (row.is_creator === true');
const artistClassifierIndex = service.indexOf("if (userType === 'artist'");
assert.ok(industryClassifierIndex >= 0 && industryClassifierIndex < creatorClassifierIndex, 'explicit Industry profiles must remain in Industry');
assert.ok(creatorClassifierIndex >= 0 && creatorClassifierIndex < artistClassifierIndex, 'creator flags must outrank generic artist metadata');
assert.match(service, /CREATOR_DIRECTORY_PAGE_SIZE = 100[\s\S]*select\('\*', \{ count: 'exact' \}\)[\s\S]*order\('user_id'[\s\S]*order\('id'[\s\S]*range\(from, to\)/, 'directory loading must use deterministic exact-count pagination');
assert.match(service, /dedupeCreatorDirectoryRows[\s\S]*Map<string[\s\S]*rowIdentity/, 'directory rows must be deduplicated by exact source identity');
assert.match(service, /left\.displayName\.localeCompare[\s\S]*left\.userId\.localeCompare/, 'directory ordering must have a stable identity tie-breaker');
assert.doesNotMatch(service, /\.limit\(160\)|Math\.random/, 'directory results must not be truncated or randomly ordered');
assert.doesNotMatch(service, /from\('artists'\)|claimed_profile_id|claimed_by_user_id|MusicBrainz|musicbrainz/i, 'native routing must not infer catalogue claims or expose import provenance');

assert.match(editor, /select\('embed_settings'\)[\s\S]*currentEmbedSettings[\s\S]*\.\.\.currentEmbedSettings[\s\S]*profile_visibility:[\s\S]*\.\.\.currentProfileVisibility[\s\S]*show_play_counts: showPlayCounts/, 'privacy saving must merge the latest profile JSON instead of replacing it');
assert.match(editor, /useState\(true\)[\s\S]*show_play_counts !== false/, 'public play counts must default to visible unless explicitly disabled');
assert.match(editor, /accessibilityLabel="Show public play counts"/, 'the owner control must expose an accessible label');
assert.match(editor, /private Studio analytics remain available/, 'public privacy must remain separate from Studio analytics');

assert.match(publicProfile, /shouldShowPublicPlayCounts[\s\S]*show_play_counts !== false/, 'public play-count visibility must default to true');
assert.match(publicProfile, /showPlayCounts && totalPlays > 0/, 'hero plays must respect owner privacy');
assert.match(publicProfile, /\.\.\.\(showPlayCounts \? \[\{ label: 'Total plays', value: totalPlays \}\] : \[\]\)/, 'About plays must respect owner privacy');
const releaseMapping = publicProfile.match(/setReleases\([\s\S]*?\n\s*setMixes\(/)?.[0] || '';
assert.match(releaseMapping, /credits_price[\s\S]*`\$\{creditsRequired\.toLocaleString\('en-GB'\)\} credits`/, 'release cards must label the server-authoritative credits requirement');
assert.doesNotMatch(releaseMapping, /formatCreatorMoney|commercePrice/, 'release cards must not fall back to raw cash pricing');
assert.match(publicProfile, /StatusBar style=\{profile \? 'light' : theme\.scheme/, 'non-immersive public-profile states must use the semantic status-bar mode');
assert.match(publicProfile, /CREATOR_PROFILE_MAX_FONT_MULTIPLIER = 1\.25[\s\S]*NativeText[\s\S]*maxFontSizeMultiplier=\{CREATOR_PROFILE_MAX_FONT_MULTIPLIER\}[\s\S]*NativeTextInput[\s\S]*maxFontSizeMultiplier=\{CREATOR_PROFILE_MAX_FONT_MULTIPLIER\}/, 'creator profile text and catalogue search must retain bounded Dynamic Type scaling');

console.log('PLUGGD mobile Phase 11A directory and public-profile contract verified');
