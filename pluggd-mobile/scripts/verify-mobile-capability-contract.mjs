import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const capabilities = read('src/features/culture/mobileCapabilities.ts');
const services = read('src/features/culture/mobileServices.ts');
const types = read('src/features/culture/mobileTypes.ts');

for (const token of [
  'MobileCapabilityMap',
  'creatorCommunities',
  'communityMemberships',
  'eventRsvps',
  'eventComments',
  'ticketOrders',
  'genericSavedContent',
  'nativeTicketCheckout',
]) {
  assert.match(capabilities, new RegExp(token), `capability map must define ${token}`);
}

for (const typeName of [
  'BackstageMembership',
  'BackstageCommunity',
  'BackstageThread',
  'BackstageRoom',
  'EventRsvpState',
  'TicketWalletItem',
  'SocialPostDetail',
  'SavedContentItem',
  'CreatorModePulse',
  'WalletEntitlementItem',
]) {
  assert.match(types, new RegExp(`type ${typeName}|interface ${typeName}`), `mobileTypes must expose ${typeName}`);
}

for (const fn of [
  'loadBackstageOverview',
  'loadBackstageDetail',
  'joinBackstage',
  'leaveBackstage',
  'loadEventDetail',
  'setEventRsvp',
  'loadWalletTickets',
  'loadLibraryBundle',
  'loadPostDetail',
  'toggleLike',
  'addComment',
  'toggleSavedContent',
  'loadCreatorModePulse',
]) {
  assert.match(services, new RegExp(`export async function ${fn}`), `mobileServices must export ${fn}`);
}

assert.match(services, /from\('communities'\)/, 'Backstage must use live creator communities');
assert.match(services, /from\('community_members'\)/, 'Backstage join state must use community_members');
assert.match(services, /from\('event_rsvps'\)/, 'Event RSVP must use event_rsvps');
assert.match(services, /from\('event_comments'\)/, 'Event discussion must use event_comments');
assert.match(services, /from\('ticket_orders'\)/, 'Wallet tickets must inspect ticket_orders for QR payloads');
assert.match(capabilities, /nativeTicketCheckout:\s*'unavailable'/, 'Native ticket checkout must remain unavailable until compliance path exists');
assert.match(capabilities, /reminders:\s*'available'/, 'Event and scheduled-live reminders must be available now that backend rows and local notifications are wired');
assert.match(capabilities, /genericSavedContent:\s*'available'/, 'Generic saved-content must be available through the mobile saved_content contract');
assert.match(capabilities, /dynamicQr:\s*'available'/, 'Dynamic ticket entry payloads must be available through the rotating token contract');
assert.match(capabilities, /pushTokens:\s*'available'/, 'Mobile push-token delivery must be backed by the mobile_push_tokens contract');
assert.match(services, /rpc\('toggle_saved_content'/, 'Generic saved content must use the backend RPC');
assert.match(services, /rpc\('set_live_room_reminder'/, 'Room-keyed live reminders must use the room reminder RPC');
assert.match(services, /rpc\('issue_ticket_entry_token'/, 'Ticket wallet must issue dynamic entry tokens through the backend');
assert.match(services, /rpc\('verify_ticket_entry_token'/, 'Ticket scanner must verify dynamic entry tokens through the backend');
assert.match(services, /rpc\('create_mobile_clip_record'/, 'Mobile clip upload must create backend clip records');

console.log('mobile capability contract verified');
