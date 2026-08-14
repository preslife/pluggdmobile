import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const discoveryModel = read('src/features/discovery/discoveryModel.ts');
const discover = read('src/features/discovery/MusicDiscoveryDiscover.tsx');
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

function requireText(source, text, message) {
  if (!source.includes(text)) throw new Error(message);
}

requireText(discoveryModel, 'isPlayable: boolean', 'Discovery items must expose an explicit playable result.');
requireText(discoveryModel, "playAction: 'play' | 'unavailable'", 'Discovery play and destination actions must be separate.');
requireText(discoveryModel, 'buildRankedDiscoveryItems', 'Charts must use a measured ranking function.');
requireText(discover, "router.push(`/live/session?roomId=", 'Live Discover cards must deep-link to their selected room.');
requireText(discover, "router.push('/live/create'", 'Discover must route Start a room to Live creation.');
requireText(discover, "router.push(item.destinationRoute", 'Discover artwork must open the item destination.');
requireText(playback, 'isPlayableTrack', 'The global player must retain URL validation.');
requireText(playback, 'tracks.filter(isPlayableTrack)', 'The global queue must reject non-audio catalogue metadata.');

requireText(carnival, '<CarnivalMap', 'Carnival must provide an interactive native map.');
requireText(carnival, 'Build My Carnival', 'Carnival must provide a route builder.');
requireText(carnival, 'Save road pack offline', 'Carnival must provide offline essentials.');
requireText(carnival, 'No crowd-density or unofficial live-status claims', 'Carnival must reject invented live signals.');
requireText(carnivalService, "schemaVersion !== 1", 'Carnival must fail closed on unsupported bundle versions.');
requireText(carnivalService, 'buildCarnivalRoute', 'Carnival routes must be deterministic and persisted.');

requireText(live, 'idempotency_key: idempotencyKey', 'Live gifts must send an idempotency key.');
requireText(live, 'Hosts cannot send gifts to their own live room', 'The live UI must prevent self-gifting.');
requireText(live, 'Every gift has a fixed credit price', 'The gift tray must explain its fixed-value economy.');
requireText(live, 'useReducedMotion()', 'Gift confirmation must respect Reduce Motion.');
requireText(config, "buildNumber: process.env.IOS_BUILD_NUMBER ?? '5'", 'The v5 branch must default to iOS build 5.');
requireText(dock, "'/hubs'", 'Carnival hubs must belong to the Discover navigation family.');
requireText(chrome, "normalized.startsWith('/carnival/')", 'Focused Carnival reader routes must not collide with global chrome.');
requireText(publicAudienceFilters, 'NON_PUBLIC_PROFILE_NAMES', 'Private reviewer identities must be excluded from public recommendations.');
requireText(communityFeed, 'isPublicProfileName(card.title)', 'Community recommendations must apply the public-profile filter.');
requireText(liveLobby, '!isPublicProfileName(name)', 'Live creator recommendations must apply the public-profile filter.');

console.log('PLUGGD iOS v5 Discover, Carnival and Live contract verified');
