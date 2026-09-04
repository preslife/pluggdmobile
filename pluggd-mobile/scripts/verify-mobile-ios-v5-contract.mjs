import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const discoveryModel = read('src/features/discovery/discoveryModel.ts');
const discover = read('src/features/discovery/DiscoveryExperience.tsx');
const playback = read('src/context/PlaybackProvider.tsx');
const carnival = read('src/features/carnival/CarnivalHubScreen.tsx');
const carnivalService = read('src/features/carnival/carnivalService.ts');
const live = read('src/screens/LiveSessionScreen.tsx');
const config = read('app.config.ts');
const dock = read('components/PluggdDock.tsx');
const chrome = read('src/lib/appChromeVisibility.ts');
const publicAudienceFilters = read('src/lib/publicAudienceFilters.ts');
const communityFeed = read('src/features/community-feed/communityFeedService.ts');
const liveLobby = read('src/features/live/live-culture-screen.tsx');
const liveGiftOverlay = read('src/features/live/LiveGiftOverlay.tsx');

function requireText(source, text, message) {
  if (!source.includes(text)) throw new Error(message);
}

requireText(discoveryModel, 'isPlayable: boolean', 'Discovery items must expose an explicit playable result.');
requireText(discoveryModel, "playAction: 'play' | 'unavailable'", 'Discovery play and destination actions must be separate.');
requireText(discoveryModel, 'buildRankedDiscoveryItems', 'Charts must use a measured ranking function.');
requireText(discover, "navigate(`/live/session?roomId=", 'Live Discover cards must deep-link to their selected room.');
requireText(discover, "navigate('/live/create'", 'Discover must route Start a room to Live creation.');
requireText(discover, "router.push(item.destinationRoute", 'Discover artwork must open the item destination.');
requireText(playback, 'isPlayableTrack', 'The global player must retain URL validation.');
requireText(playback, 'tracks.filter(isPlayableTrack)', 'The global queue must reject non-audio catalogue metadata.');

requireText(carnival, '<CarnivalMap', 'Carnival must provide an interactive native map.');
requireText(carnival, 'Build My Carnival', 'Carnival must provide a route builder.');
requireText(carnival, 'Save road pack offline', 'Carnival must provide offline essentials.');
requireText(carnival, 'No crowd-density or unofficial live-status claims', 'Carnival must reject invented live signals.');
requireText(carnivalService, "[1, 2].includes(data.schemaVersion)", 'Carnival must accept v1/v2 and fail closed on unsupported bundle versions.');
requireText(carnivalService, 'buildCarnivalRoute', 'Carnival routes must be deterministic and persisted.');

requireText(live, 'idempotency_key: idempotencyKey', 'Live gifts must send an idempotency key.');
requireText(live, 'Hosts cannot send gifts to their own live room', 'The live UI must prevent self-gifting.');
requireText(live, 'Every gift has a fixed credit price', 'The gift tray must explain its fixed-value economy.');
requireText(live, 'useReducedMotion()', 'Gift effects must respect Reduce Motion.');
requireText(live, 'useSafeAreaInsets()', 'The live gift tray must respect the physical device safe area.');
requireText(live, "behavior={Platform.OS === 'ios' ? 'padding' : undefined}", 'The deliberately opened comment composer must remain visible above the iOS keyboard.');
requireText(live, 'Live video. Tap to send a heart', 'The open live canvas must send a visible heart reaction when tapped.');
requireText(live, 'pointerEvents="none" style={styles.topGradient}', 'Decorative gradients must not intercept live-canvas taps.');
requireText(live, '<FloatingReaction', 'Live likes must provide visible floating reaction feedback.');
requireText(live, 'Open comment composer', 'Live must keep comment entry behind an explicit viewer action.');
requireText(live, 'autoFocus', 'The comment composer must focus only after it has been explicitly mounted.');
requireText(live, '<DockIconButton icon="card-giftcard" label="Send gift" onPress={openGiftTray} />', 'The fan-only bottom Live actions must expose Gifts without showing the tray.');
requireText(live, 'if (isHost) {', 'The role-correct Live UI must block host self-gifting.');
requireText(live, 'giftCatalogGrid', 'The gift tray must present a polished visual gift grid.');
requireText(live, '<LiveGiftArtwork gift={gift}', 'The gift tray must render canonical catalogue artwork.');
requireText(liveGiftOverlay, "import { LinearGradient } from 'expo-linear-gradient'", 'Live gift artwork must have an offline-safe visual treatment.');
requireText(liveGiftOverlay, "icon: 'celebration'", 'The applause gift must render a distinct presentation even when remote artwork is unavailable.');
requireText(liveGiftOverlay, 'safeGiftAssetUrl', 'Remote gift thumbnails must retain a safe native fallback.');
requireText(live, 'session-room-status-', 'Live viewers must subscribe to the room ending in real time.');
requireText(live, 'pollRoomStatus', 'Live viewers must retain a polling fallback when room-table Realtime is unavailable.');
requireText(live, 'if (error) throw error;', 'Ending a live must surface backend failures instead of silently navigating away.');
const giftTraySource = live.slice(live.indexOf('function LiveGiftTray'), live.indexOf('function DockIconButton'));
if (giftTraySource.includes('<TextInput')) throw new Error('Opening the gift tray must not summon a keyboard.');
requireText(config, "buildNumber: process.env.IOS_BUILD_NUMBER ?? '13'", 'The approved release branch must default to replacement iOS build 13.');
requireText(dock, "'/hubs'", 'Carnival hubs must belong to the Discover navigation family.');
requireText(chrome, "normalized.startsWith('/carnival/')", 'Focused Carnival reader routes must not collide with global chrome.');
requireText(publicAudienceFilters, 'NON_PUBLIC_TEST_PROFILE_NAMES', 'Private reviewer identities must be excluded from public recommendations.');
requireText(communityFeed, 'isPublicProfileName(card.title)', 'Community recommendations must apply the public-profile filter.');
requireText(liveLobby, '!isPublicProfileName(name)', 'Live creator recommendations must apply the public-profile filter.');

console.log('PLUGGD iOS Discover, Carnival and Live contract verified for integrated Build 8');
