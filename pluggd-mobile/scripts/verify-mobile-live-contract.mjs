import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const liveRoute = read('app/(tabs)/live/index.tsx');
const liveSource = read('src/features/live/live-culture-screen.tsx');
const liveFeedSource = read('app/live/feed.tsx');
const liveSessionSource = read('src/screens/LiveSessionScreen.tsx');
const liveCreateSource = read('app/live/create.tsx');
const services = read('src/features/culture/mobileServices.ts');
const chromeSource = read('components/AppChrome.tsx') + read('src/lib/appChromeVisibility.ts');
const homeSource = read('src/features/home/MusicDiscoveryHome.tsx');
const discoverSource = read('src/features/discovery/DiscoveryExperience.tsx');
const publicDestinationsSource = read('src/features/discovery/publicDestinations.ts');
const discoveryHeaderSource = read('src/features/discovery/DiscoveryHeader.tsx');
const mobileHeaderSource = read('components/MobileHeader.tsx') + read('components/AccountMenuButton.tsx');
const studioSource = read('src/features/studio/StudioScreens.tsx');
const liveManagerSource = read('../supabase/functions/manage-live-sessions/index.ts');
const legacyLiveManagerSource = read('../supabase/functions/manage-live-session/index.ts');
const webLiveStudioSource = read('../src/components/CreatorStudio/modules/LiveModule.tsx');

assert.match(liveRoute, /LiveCultureScreen/, 'Live tab must use the dedicated premium Live screen');
assert.ok(existsSync(new URL('../app/live/feed.tsx', import.meta.url)), 'Live swipe feed route must exist');

for (const label of [
  'LIVE',
  'FEATURED LIVE',
  'Community Rooms',
  'Listening Parties',
  'Studio / Cook-up',
  'Event-linked',
  'TONIGHT',
  'THIS WEEK',
  'Open Live Feed',
  'REPLAYS + CLIPS',
  'FEATURED LIVE CREATORS',
  'Nothing live or scheduled yet',
  'DROP IN TOGETHER',
  'HEAR IT FIRST',
  'BUILD IN PUBLIC',
  'FROM THE CROWD',
]) {
  assert.match(liveSource, new RegExp(label.replace(/[+]/g, '\\+')), `${label} must be present in the Live experience`);
}

assert.doesNotMatch(liveSource, /Nothing scheduled/, 'Live category cards must not repeat the global empty status.');
assert.match(liveSource, /if \(!source\) \{[\s\S]*<View[\s\S]*accessible/, 'Empty Live categories must remain descriptive non-buttons.');

for (const hook of ['useLiveRooms', 'useEventLayer', 'useBackstage', 'useHomeFeed', 'usePlayback']) {
  assert.match(liveSource, new RegExp(hook), `${hook} must power Live with real app data`);
}

for (const mapper of [
  'isRealLiveRoom',
  'isReplayRoom',
  'isUpcomingRoom',
  'isCommunityRoom',
  'isListeningParty',
  'isStudioSession',
  'isEventLinkedRoom',
  'isEventLinkedLive',
  'mapCreators',
  'replayTrack',
  'eventCountdown',
]) {
  assert.match(liveSource, new RegExp(mapper), `${mapper} must wire Live UI to backend models`);
}

for (const color of ['#0a0806', '#171310', '#241d15', '#ff6600', '#FF4757']) {
  assert.match(liveSource, new RegExp(color), `${color} Live design token must be used`);
}

for (const action of [
  "go('/notifications'",
  "go('/search'",
  "router.push('/live/feed'",
  "router.push({ pathname: '/live/session'",
  "router.push(`/backstage/${source.room.backstage_id}`",
  'playback.playTrack(track)',
  'setEventReminder',
  'setScheduledSessionReminder',
  'loadReminderState',
  'toggleProfileFollow',
  'openRoom',
  'toggleFollow',
]) {
  assert.match(liveSource, new RegExp(action.replace(/[/'(){}$.[\]`]/g, '\\$&')), `${action} action must be wired`);
}

for (const token of [
  "from('session_rooms')",
  "from('live_sessions')",
  "from('community_collab_rooms')",
  "from('session_messages')",
  'loadLiveRoomMessagePreview',
  'creator_username',
]) {
  assert.match(services, new RegExp(token.replace(/[()']/g, '\\$&')), `${token} must back the Live data layer`);
}

for (const token of [
  'loadLiveRoomMessagePreview',
  'PanResponder',
  'Close live feed',
  'Join Live Room',
  "router.push({ pathname: '/live/session'",
  'There are no verified live sessions right now',
]) {
  assert.match(liveFeedSource, new RegExp(token.replace(/[()']/g, '\\$&')), `${token} must be wired in the full-screen Live Feed`);
}

for (const action of ['openRoomSafety', 'showReportActions', 'Block host', 'Safety']) {
  assert.match(liveSessionSource, new RegExp(action.replace(/[?'()]/g, '\\$&')), `${action} live-session moderation action must be wired`);
}

assert.match(
  liveSessionSource,
  /const \[controlSheet, setControlSheet\] = useState<'stage' \| 'host' \| null>\(null\)/,
  'Live stage and host management must use one mutually exclusive control-sheet state',
);
assert.match(
  liveSessionSource,
  /<Modal[\s\S]*?visible=\{controlSheet !== null\}[\s\S]*?controlSheet === 'stage'[\s\S]*?controlSheet === 'host'/,
  'Live stage requests and host controls must render in the shared sheet rather than stack over video',
);
assert.match(
  liveSessionSource,
  /const openControlSheet = \(sheet: 'stage' \| 'host'\)[\s\S]*?setCommentComposerOpen\(false\)[\s\S]*?setGiftTrayOpen\(false\)[\s\S]*?setControlSheet\(sheet\)/,
  'Opening Live management must dismiss the composer and gift tray before showing one sheet',
);
assert.match(
  liveSessionSource,
  /const openGiftTray = \(\)[\s\S]*?setCommentComposerOpen\(false\)[\s\S]*?setControlSheet\(null\)[\s\S]*?setGiftTrayOpen\(true\)/,
  'Opening Live gifts must dismiss other compact overlays',
);
assert.match(liveSessionSource, /<KeyboardAvoidingView[\s\S]*?style=\{styles\.controlSheetKeyboard\}/, 'Live control sheets must remain keyboard-safe');
assert.match(liveSessionSource, /accessibilityLabel="Leave live room"/, 'Live top overlay must keep an immediate close action');
assert.match(liveSessionSource, /<DockIconButton icon="card-giftcard"[\s\S]*?<DockIconButton icon="groups"[\s\S]*?<DockIconButton icon="ios-share"[\s\S]*?<DockIconButton icon="more-horiz"/, 'Audience gifts, stage, share and safety must remain lightweight bottom actions beside comments');
assert.doesNotMatch(liveSessionSource, /<RailButton|label="Like"/, 'Live must not restore the boxed right rail or duplicate visible Like control');
assert.match(liveSessionSource, /if \(!isHost\) void sendReaction\('heart'\)/, 'Audience media tap must keep the realtime heart reaction');
assert.match(liveSessionSource, /profiles![\s\S]*?is_verified[\s\S]*?verification_status/, 'Live host identity must request real verification fields');
assert.match(liveSessionSource, /const hostIsVerified = session\?\.profiles\?\.is_verified === true/, 'Live verified state must come from a real boolean profile field');
assert.match(liveSessionSource, /\{hostIsVerified \? <MaterialIcons name="verified"[\s\S]*?: null\}/, 'Live must hide the verified badge unless the host is actually verified');
assert.doesNotMatch(liveSessionSource, /stagePanelOpen|setStagePanelOpen/, 'Live must not retain the old in-flow stage panel state');

const bottomOverlayStart = liveSessionSource.indexOf('<View style={[styles.bottomOverlay');
const bottomOverlayEnd = liveSessionSource.indexOf('</KeyboardAvoidingView>', bottomOverlayStart);
assert.ok(bottomOverlayStart >= 0 && bottomOverlayEnd > bottomOverlayStart, 'Live compact bottom overlay bounds must be discoverable');
const bottomOverlaySource = liveSessionSource.slice(bottomOverlayStart, bottomOverlayEnd);
assert.doesNotMatch(bottomOverlaySource, /runtimeGrid|stageRequestButton|hostRequestRow|End live session/, 'Live bottom overlay must not stack host or stage-management panels over video');
assert.match(bottomOverlaySource, /liveChatFeed[\s\S]*?commentComposerOpen[\s\S]*?Open comment composer/, 'Live bottom overlay must remain focused on comments and the composer');

for (const token of [
  "rpc('update_live_runtime_preferences'",
  "functions.invoke('live-runtime-ops'",
  "rpc('withdraw_live_stage_request'",
  "rpc('remove_live_stage_participant'",
  'start_recording',
  'stop_recording',
  'start_restream',
  'stop_restream',
  'Broadcast controls',
]) {
  assert.match(liveSessionSource, new RegExp(token.replace(/[()']/g, '\\$&')), `${token} must be wired for mobile Live host/runtime parity`);
}

assert.match(liveSource, /ScrollView\s+horizontal/, 'Live must use horizontal shelves');
assert.match(liveSource, /RefreshControl/, 'Live must support pull-to-refresh for live Supabase data');
assert.match(liveSource, /Animated\.loop/, 'Live focus card must include subtle media motion');
assert.match(liveSource, /WEB_PARITY_ASSETS\.liveHero/, 'Live must use the bundled PLUGGD Live artwork when a real featured image is unavailable');
for (const fallback of ['intimateCrowdHero', 'warmListeningRoom', 'bedroomStudio', 'phoneStage']) {
  assert.match(liveSource, new RegExp(`WEB_PARITY_ASSETS\\.${fallback}`), `${fallback} must provide a real bundled category fallback`);
}
assert.match(liveSource, /style=\{styles\.categoryGrid\}[\s\S]*?Community Rooms[\s\S]*?Listening Parties[\s\S]*?Studio \/ Cook-up[\s\S]*?Event-linked/, 'Live discovery categories must render as the approved 2x2 image-led grid');
assert.match(liveSource, /style=\{\(\{ pressed \}\) => \[styles\.categoryTile, \{ width: size, height: size \}/, 'Live discovery tiles must use one bounded size for equal width and height at normal and compact widths');
assert.match(liveSource, /title="Event-linked"[^\n]*fallbackSource=\{WEB_PARITY_ASSETS\.phoneStage\}/, 'The Event-linked tile must use real bundled event photography without an embedded wordmark');
assert.match(liveSource, /if \(!source\) \{[\s\S]*?<View[\s\S]*?accessible[\s\S]*?style=\{\[styles\.categoryTile, \{ width: size, height: size \}\]\}/, 'Empty category tiles must remain honest descriptive non-actions');
assert.match(liveSource, /const live = liveNow\[0\][\s\S]*?const upcoming = upcomingRooms\[0\][\s\S]*?const event = eventLinked/, 'Featured Live must prefer a real live room, then a real upcoming room, then a real upcoming event');
assert.match(liveSource, /const tonight = useMemo[\s\S]*?isSameLocalDay[\s\S]*?const thisWeek = useMemo/, 'Tonight and This Week must be derived from real scheduled timestamps');
assert.match(liveSource, /\{tonight\.length > 0 \?[\s\S]*?\{thisWeek\.length > 0 \?/, 'Unsupported empty schedule sections must be omitted');
assert.match(liveSource, /Notify me about \$\{title\}[\s\S]*?toggleScheduleReminder/, 'Real scheduled rows must retain working reminder actions');
const liveScreenRender = liveSource.slice(liveSource.indexOf('export function LiveCultureScreen'));
assert.doesNotMatch(liveScreenRender, /<FilterPills/, 'The selected Live lobby must not restore the old pill-filter strip');
assert.match(chromeSource, /DEDICATED_HEADER_EXACT[\s\S]*'\/live'/, 'Live should own its own header');
assert.match(chromeSource, /<MiniPlayer\s*\/>/, 'Global MiniPlayer must remain available on Live when media is active');
assert.match(homeSource, /accessibilityLabel="Enter PLUGGD Live"/, 'Home must retain an always-present public Live gateway');
assert.match(homeSource, /onAction=\{\(\) => router\.push\('\/live'/, 'Home Happening now header must enter Live');
assert.match(discoverSource, /accessibilityLabel="Open PLUGGD Live"/, 'Discover must expose Live above the first discovery grid');
assert.match(discoverSource, /PUBLIC_DESTINATIONS/, 'Discover worlds must use the authoritative public destination registry');
assert.match(publicDestinationsSource, /id: 'live'[\s\S]*?title: 'Live'[\s\S]*?route: '\/live'/, 'The public destination registry must include the full Live destination');
assert.match(discoveryHeaderSource, /accessibilityLabel="Open PLUGGD Live"[\s\S]*?router\.push\('\/live'/, 'Primary discovery surfaces must retain a one-tap Live gateway');
assert.match(mobileHeaderSource, /accessibilityLabel="Open PLUGGD Live"[\s\S]*?router\.push\('\/live'/, 'Every public surface must retain a one-tap global Live gateway');
assert.match(mobileHeaderSource, /label: 'Go Live'[\s\S]*?route: '\/live\/create'/, 'Creator account navigation must expose Go Live');
assert.match(mobileHeaderSource, /label: 'Create'[\s\S]*?route: '\/create'/, 'Creator account navigation must expose the mobile Create hub');
assert.match(liveSource, /accessibilityLabel="Go Live"[\s\S]*?user \? '\/live\/create' : '\/auth\/login'/, 'Live header must provide an authenticated host gateway');
assert.match(studioSource, /route: '\/live\/create'/, 'Creator Studio must retain its Live creation route');
assert.match(liveCreateSource, /functions\.invoke[\s\S]*?'manage-live-sessions'/, 'Mobile broadcast creation must use the authenticated Live manager');
assert.doesNotMatch(liveCreateSource, /from\('session_rooms'\)[\s\S]*?\.insert/, 'Mobile broadcast creation must not bypass server validation with a direct room insert');
assert.match(liveCreateSource, /type LiveDiscoveryCategory = 'community_room' \| 'listening_party' \| 'studio_cook_up' \| 'event_linked'/, 'Create Live must keep discovery category separate from technical live_mode');
for (const category of ['Community Room', 'Listening Party', 'Studio / Cook-up', 'Event-linked']) {
  assert.match(liveCreateSource, new RegExp(category.replace(/[ /-]/g, '\\$&')), `${category} must be an explicit creator discovery choice`);
}
assert.match(liveCreateSource, /mode_config:[\s\S]*discovery_category: discoveryCategory[\s\S]*linked_event_id: linkedEventId/, 'Create Live must persist structured discovery category and real event identity in mode_config');
assert.match(liveCreateSource, /loadEligibleLiveEvents[\s\S]*discoveryCategory === 'event_linked' && !linkedEventId[\s\S]*disabled=\{saving \|\| permissionBusy \|\| \(discoveryCategory === 'event_linked' && !linkedEventId\)\}/, 'Event-linked creation must require selecting a real eligible event before the room action is enabled');
assert.match(services, /select\('id,title,description,status,created_at,scheduled_for,agora_live_started_at,agora_live_ended_at,host_id,is_public,live_mode,mode_config,participant_count'\)/, 'Live discovery must load structured mode_config alongside technical live_mode');
assert.match(services, /discovery_category: discoveryCategory[\s\S]*linked_event_id: normalizeText\(modeConfig\.linked_event_id\)/, 'Live room mapping must expose the explicit category and validated linked event separately');
assert.match(liveSource, /if \(room\.discovery_category\) return room\.discovery_category === 'community_room'[\s\S]*if \(room\.discovery_category\) return room\.discovery_category === 'listening_party'[\s\S]*if \(room\.discovery_category\) return room\.discovery_category === 'studio_cook_up'/, 'Viewer classification must prefer explicit category before legacy keyword fallback');
assert.match(liveSource, /eventLinkedRooms[\s\S]*isEventLinkedRoom[\s\S]*categorySources[\s\S]*Event-linked/, 'Validated event-linked rooms must render in the dedicated image-led category');
assert.match(liveManagerSource, /allowedDiscoveryCategories[\s\S]*normalizeModeConfig[\s\S]*\.from\("events"\)[\s\S]*\.eq\("created_by", hostId\)[\s\S]*mode_config: modeConfig/, 'the authenticated manager must validate event ownership and persist only supported discovery categories');
assert.match(legacyLiveManagerSource, /auth\.getUser\(token\)/, 'Legacy web Live management must authenticate the bearer token');
assert.match(legacyLiveManagerSource, /const userId = auth\.userId/, 'Legacy web Live management must derive ownership from the authenticated user');
assert.doesNotMatch(webLiveStudioSource, /userId:\s*user\.id/, 'Web Live Studio must not submit client-owned identity fields');

assert.doesNotMatch(liveSource, /go\('\/wallet'|account-balance-wallet|Open wallet/, 'Live top bar must not include Wallet');
assert.doesNotMatch(liveSource, /MobileStoriesRail|MobileSocialPostCard|CompactComposer|ComposerEntry|full social feed|stories rail/, 'Live must not include social feed, stories or composer UI');
assert.doesNotMatch(liveSource, /creator dashboard|Creator Mode|admin dashboard/i, 'Live must not expose creator admin dashboard UI');
assert.doesNotMatch(
  liveSource,
  /SECTION 1|SECTION 2|SECTION 3|SECTION 4|SECTION 5|SECTION 6|ELIAS THORNE|12\.4K|LIVE FROM THE UNDERGROUND|Cookup Session|Open Verse Feedback|Studio Breakdown|Listening Party|Live DJ Set|Warehouse Livestream|Producer Lounge|Fictional/,
  'Live source must not hardcode mockup labels or fake creator/session content',
);

assert.doesNotMatch(liveSource, /😀|😃|😄|😁|🎵|🎧|🎟|💬|❤️|🔥|✨/, 'production UI must not use emoji icons');

console.log('mobile live contract verified');
