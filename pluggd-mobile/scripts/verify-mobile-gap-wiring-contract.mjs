import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), 'utf8');

const eventDetail = read('app/events/[id].tsx');
const tickets = read('app/tickets.tsx');
const library = read('app/library.tsx');
const favorites = read('app/favorites.tsx');
const backstageDetail = read('app/backstage/[id].tsx');
const postDetail = read('app/post/[id].tsx');
const createPost = read('app/create-post.tsx');
const player = read('app/player.tsx');
const stage = read('src/features/stage/stage-discovery-screen.tsx');
const live = read('src/features/live/live-culture-screen.tsx');
const notifications = read('app/notifications.tsx');
const ticketScan = read('app/ticket-scan.tsx');
const mobileServices = read('src/features/culture/mobileServices.ts');
const creatorMode = read('src/features/culture/CultureScreens.tsx');
const rootLayout = read('app/_layout.tsx');
const localNotifications = read('src/lib/localNotifications.ts');
const mobileHeader = read('components/MobileHeader.tsx');

assert.match(backstageDetail, /loadBackstageDetail/, 'Backstage detail route must load a selected community detail, not reuse only overview data');
assert.match(backstageDetail, /joinBackstage|leaveBackstage/, 'Backstage detail must expose persisted join or leave actions');
assert.match(backstageDetail, /Posts.*Threads.*Rooms.*Events.*Soundboards.*Drops/s, 'Backstage detail must expose required community tabs');

assert.match(eventDetail, /loadEventDetail/, 'Event detail must use shared event detail service');
assert.match(eventDetail, /setEventRsvp/, 'Event detail must persist RSVP state');
assert.match(eventDetail, /addEventComment/, 'Event detail must use event_comments for discussions');

assert.match(tickets, /loadWalletTickets/, 'Tickets route must read owned tickets/orders');
assert.doesNotMatch(tickets, /useEventLayer/, 'Tickets route must not show generic public events as owned tickets');
assert.match(tickets, /qr_code_data/, 'Tickets route may show QR only from real ticket order payload');
assert.match(tickets, /issueTicketEntryToken/, 'Tickets route must issue dynamic rotating entry payloads when backed');
assert.match(tickets, /QRCode/, 'Tickets route must render real QR codes from static or rotating payloads');

assert.match(library, /loadLibraryBundle/, 'Library route must use account-owned library data');
assert.doesNotMatch(library, /\.from\('releases'\)/, 'Library route must not show generic release catalog rows as owned library');
assert.match(favorites, /loadLibraryBundle/, 'Saved route must use shared saved/library service');

assert.match(postDetail, /loadPostDetail/, 'Post detail route must load post details');
assert.match(postDetail, /toggleLike/, 'Post detail route must wire likes');
assert.match(postDetail, /addComment/, 'Post detail route must wire comments');
assert.match(createPost, /createSocialPost/, 'Create post route must persist social_posts');
assert.match(mobileServices, /from\('social_posts'\)[\s\S]*insert/, 'Create post service must insert into social_posts');

assert.match(player, /toggleSavedContent/, 'Full player save must use shared saved-content service');
assert.match(stage, /toggleSavedContent/, 'Stage save buttons must use shared saved-content service');
assert.match(stage, /loadLibraryBundle/, 'Stage must hydrate saved state from the account library');
assert.match(mobileServices, /release_id/, 'Saved content service must support release favorites where the backend exposes release_id');
assert.match(mobileServices, /rpc\('toggle_saved_content'/, 'Saved content service must use the generic saved-content backend contract');
assert.match(mobileServices, /from\('event_rsvps'\)[\s\S]*interested/, 'Event saves/reminders must persist through RSVP interest');
assert.match(mobileServices, /from\('community_members'\)[\s\S]*(joinBackstage|leaveBackstage)/, 'Community saves must persist through Backstage membership');
assert.match(mobileServices, /from\('user_follows'\)[\s\S]*(follower_id|following_id)/, 'Creator saves must persist through user_follows');
assert.match(mobileServices, /setScheduledSessionReminder/, 'Scheduled session reminders must use the deployed live_session_reminders contract');
assert.match(mobileServices, /rpc\('set_live_room_reminder'/, 'Session-room reminders must persist through the room-keyed reminder backend contract');
assert.match(live, /loadReminderState/, 'Live screen must hydrate real reminder state');
assert.match(live, /setEventReminder/, 'Live event reminders must persist through the event RSVP model');
assert.match(live, /setScheduledSessionReminder/, 'Live scheduled-session reminders must persist when backed by sessions');
assert.match(live, /scheduleEventLocalReminder/, 'Live event reminders must schedule native local notifications when possible');
assert.match(live, /scheduleLiveSessionLocalReminder/, 'Live scheduled-session reminders must schedule native local notifications when possible');
assert.match(eventDetail, /scheduleEventLocalReminder/, 'Event detail RSVP must schedule a native local notification when possible');
assert.match(rootLayout, /configureLocalNotificationHandler/, 'Root layout must configure Expo notification display behavior');
assert.match(rootLayout, /addLocalNotificationResponseListener/, 'Root layout must register notification deep-link handling');
assert.match(localNotifications, /expo-notifications/, 'Local reminder service must use Expo notifications');
assert.match(localNotifications, /scheduleNotificationAsync/, 'Local reminder service must schedule notifications');
assert.match(localNotifications, /cancelScheduledNotificationAsync/, 'Local reminder service must cancel stale notifications');
assert.match(localNotifications, /addNotificationResponseReceivedListener/, 'Local reminder service must handle notification taps');
assert.match(localNotifications, /Linking\.openURL/, 'Notification taps must deep-link back into the app');
assert.match(localNotifications, /SchedulableTriggerInputTypes\.DATE/, 'Local reminders must schedule against real event/session times');
assert.match(localNotifications, /upsert_mobile_push_token/, 'Native push tokens must be registered against the mobile push backend contract');
assert.match(notifications, /loadMobileNotifications/, 'Activity route must use the shared notification/deep-link service');
assert.match(mobileServices, /\/live\/session\?roomId=\$\{relatedId\}/, 'Live notification deep links must pass roomId to the live session route');
assert.match(notifications, /invalidateQueries\(\{\s*queryKey:\s*\['culture',\s*'notifications',\s*'unread'\]/, 'Activity route must refresh unread header badges after read mutations');
assert.match(live, /loadUnreadNotifications/, 'Live header must use real unread notification count');
assert.match(backstageDetail, /loadBackstageDetail/, 'Backstage detail route must load a selected community detail, not reuse only overview data');
const backstageWorld = read('src/features/backstage/backstage-world-screen.tsx');
assert.match(backstageWorld, /loadUnreadNotifications/, 'Backstage header must use real unread notification count');
assert.doesNotMatch(live, /notificationDot/, 'Live header must not show a permanent fake notification dot');
assert.doesNotMatch(backstageWorld, /notificationDot/, 'Backstage header must not show a permanent fake notification dot');
assert.match(creatorMode, /loadCreatorModePulse/, 'Creator Mode activity pulse must use real data service');
assert.match(creatorMode, /\/create-post/, 'Creator Mode post/thread/announcement actions must use the real mobile post composer');
assert.match(creatorMode, /\/upload-clip/, 'Creator Mode clip upload must route to the real mobile clip upload surface');
assert.match(creatorMode, /\/ticket-scan/, 'Creator Mode ticket scanning must route to the real ticket scan/check-in surface');
assert.match(mobileHeader, /route:\s*'\/ticket-scan'/, 'Promoter/venue avatar menu must route ticket scanning to the real scanner');
assert.doesNotMatch(mobileHeader, /mode=scan/, 'Avatar menu must not use stale ticket-scan query routes');
assert.match(ticketScan, /from\('ticket_orders'\)/, 'Ticket scan route must validate real ticket_orders');
assert.match(ticketScan, /qr_code_data/, 'Ticket scan route must verify real QR payload data');
assert.match(ticketScan, /verifyTicketEntryToken/, 'Ticket scan route must verify dynamic rotating ticket payloads');
assert.match(ticketScan, /checked_in_at/, 'Ticket scan route must attempt real check-in state updates');
assert.match(ticketScan, /CameraView/, 'Ticket scan route must expose native camera scanning once expo-camera is installed');
assert.match(ticketScan, /barcodeScannerSettings=\{\{ barcodeTypes: \['qr'\] \}\}/, 'Ticket scan route must scan QR payloads only');
assert.match(ticketScan, /Apple Wallet passes are not available until pass signing is connected/, 'Ticket scan route must keep unsupported Apple Wallet pass features explicit');
assert.match(read('app/upload-clip.tsx'), /createMobileClipRecord/, 'Upload clip route must create a backend mobile clip record');
assert.match(mobileServices, /content_reports/, 'Live/reporting flows must create real content_reports');

console.log('mobile gap wiring contract verified');
