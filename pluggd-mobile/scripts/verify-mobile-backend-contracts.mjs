import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const mobileRoot = new URL('../', import.meta.url);
const workspaceRoot = new URL('../', mobileRoot);
const readMobile = (path) => readFileSync(new URL(path, mobileRoot), 'utf8');
const readWorkspace = (path) => readFileSync(new URL(path, workspaceRoot), 'utf8');

const migration = readWorkspace('supabase/migrations/20260515073614_mobile_gap_contracts.sql');
const pushFunction = readWorkspace('supabase/functions/send-push-notification/index.ts');
const services = readMobile('src/features/culture/mobileServices.ts');
const localNotifications = readMobile('src/lib/localNotifications.ts');
const tickets = readMobile('app/tickets.tsx');
const ticketScan = readMobile('app/ticket-scan.tsx');
const uploadClip = readMobile('app/upload-clip.tsx');

for (const token of [
  'CREATE TABLE IF NOT EXISTS public.saved_content',
  'CREATE OR REPLACE FUNCTION public.toggle_saved_content',
  'ADD COLUMN IF NOT EXISTS room_id uuid',
  'CREATE OR REPLACE FUNCTION public.set_live_room_reminder',
  'CREATE TABLE IF NOT EXISTS public.mobile_push_tokens',
  'CREATE OR REPLACE FUNCTION public.upsert_mobile_push_token',
  "VALUES ('mobile-clips', 'mobile-clips', true)",
  'CREATE TABLE IF NOT EXISTS public.mobile_clips',
  'CREATE OR REPLACE FUNCTION public.create_mobile_clip_record',
  'CREATE TABLE IF NOT EXISTS public.ticket_entry_tokens',
  'CREATE OR REPLACE FUNCTION public.issue_ticket_entry_token',
  'CREATE OR REPLACE FUNCTION public.verify_ticket_entry_token',
]) {
  assert.match(migration, new RegExp(token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')), `mobile backend migration must include ${token}`);
}

for (const policy of [
  'saved_content_select_own',
  'live_session_reminders_select_own',
  'mobile_push_tokens_select_own',
  'mobile_clips_public_published',
  'ticket_entry_tokens_select_own',
]) {
  assert.match(migration, new RegExp(policy), `${policy} RLS policy must be present`);
}

assert.match(pushFunction, /mobile_push_tokens/, 'push function must read native mobile push tokens');
assert.match(pushFunction, /https:\/\/exp\.host\/--\/api\/v2\/push\/send/, 'push function must deliver through Expo push for native devices');
assert.match(pushFunction, /web_push_subscriptions/, 'push function must preserve existing web push delivery');

assert.match(services, /rpc\('toggle_saved_content'/, 'mobile saved service must use generic saved RPC');
assert.match(services, /rpc\('set_live_room_reminder'/, 'mobile live reminders must use room-keyed RPC');
assert.match(services, /rpc\('issue_ticket_entry_token'/, 'wallet tickets must issue dynamic ticket tokens');
assert.match(services, /rpc\('verify_ticket_entry_token'/, 'scanner must verify dynamic ticket tokens');
assert.match(services, /rpc\('create_mobile_clip_record'/, 'clip upload must create clip metadata through RPC');

assert.match(localNotifications, /upsert_mobile_push_token/, 'local notification service must register push tokens');
assert.match(tickets, /issueTicketEntryToken/, 'tickets screen must expose dynamic entry token generation');
assert.match(tickets, /QRCode/, 'tickets screen must render real QR codes from dynamic/static payloads');
assert.match(ticketScan, /verifyTicketEntryToken/, 'ticket scanner must verify rotating entry payloads');
assert.match(uploadClip, /mobile-clips/, 'clip upload route must use the mobile-clips bucket');

console.log('mobile backend contracts verified');
