#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const failures = [];

function expectFile(file) {
  if (!fs.existsSync(path.join(root, file))) failures.push(`Missing required file: ${file}`);
}

function expectIncludes(file, tokens) {
  const source = read(file);
  for (const token of tokens) {
    if (!source.includes(token)) failures.push(`${file} is missing ${token}`);
  }
}

function expectMissing(file) {
  if (fs.existsSync(path.join(root, file))) failures.push(`${file} must not exist`);
}

expectFile('docs/PLUGGD_IOS_WEB_PARITY_PHASE_2_TASKS_2026-05-16.md');
expectFile('app/story/[id].tsx');
expectFile('app/playlists/[id].tsx');
expectFile('app/inbox.tsx');

expectIncludes('src/features/culture/mobileTypes.ts', [
  'MobileStory',
  'MobilePlaylist',
  'CreatorProfileBundle',
  'LiveSessionChatMessage',
  'EventDiscussionThread',
  'SoundboardItemDetail',
  'MobileNotification',
  'InboxThread',
  'StorefrontItem',
  'FanIdentitySummary',
]);

expectIncludes('src/features/culture/mobileServices.ts', [
  'social_stories',
  'mark_story_viewed',
  'can_create_social_story',
  'loadMyPluggdHub',
  'loadFanMapContext',
  'fn_hub_payload',
  'get_fan_map_plugs',
  'get_fan_map_stats',
  'fan_map_plugs',
  'playlist_items',
  'playlist_tracks',
  'loadCreatorProfileBundle',
  'loadEventCultureContext',
  'soundboard_item_reactions',
  'soundboard_item_comments',
  'increment_soundboard_item_play',
  'loadMobileNotifications',
  'loadInboxThreads',
  'registerPushToken',
  'loadFanIdentitySummary',
]);

expectIncludes('src/features/mypluggd/my-pluggd-screen.tsx', [
  'MobileStoriesRail',
  'CompactComposer',
  'loadMobileSocialFeed',
  'loadFanMapContext',
  'createFanMapPlug',
  'loadCommunityBoards',
  'loadLibraryBundle',
  'loadMobileNotifications',
  'loadInboxThreads',
  'Feed',
  'Circles',
  'Library',
  'Activity',
  'Fan Map',
]);

expectIncludes('src/features/search/search-discovery-screen.tsx', [
  'Playlists',
  'Stories',
  'Store',
  'Memberships',
  'PlaylistRow',
  'StoryRow',
  'StoreRow',
  'MembershipRow',
]);

expectIncludes('src/features/profiles/PublicCreatorProfileScreen.tsx', [
  'loadCreatorProfileBundle',
  'Creator moments',
  'Store / Support',
  'Membership',
  'Community',
]);

expectIncludes('app/events/[id].tsx', [
  'loadEventCultureContext',
  'Who’s going',
  'Community hub',
  'Open social thread',
  'QR appears only when a real payload exists',
]);

expectIncludes('app/soundboards/[id].tsx', [
  'loadSoundboardItemDetails',
  'toggleSoundboardItemReaction',
  'addSoundboardItemComment',
  'addSoundboardComment',
  'logSoundboardItemPlay',
]);

expectIncludes('app/badges.tsx', [
  'loadFanIdentitySummary',
  'Joined communities',
  'Attended events',
]);

expectIncludes('app/notifications.tsx', [
  'loadMobileNotifications',
  'markMobileNotificationRead',
]);

expectIncludes('app/social/inbox.tsx', ['/inbox']);
expectMissing('app/(tabs)/social/inbox.tsx');

if (failures.length) {
  console.error('Phase 2 web-parity contract failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Phase 2 web-parity contract passed.');
