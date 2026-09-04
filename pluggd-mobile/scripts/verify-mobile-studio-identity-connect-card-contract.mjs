import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const publicProfile = read('src/features/profile/edit-profile-screen.tsx');
const service = read('src/features/studio/connectCardEditorService.ts');
const editor = read('src/features/studio/StudioConnectCardEditorScreen.tsx');
const route = read('app/studio/connect-card/edit.tsx');
const studio = read('src/features/studio/StudioScreens.tsx');

assert.match(publicProfile, /select\('user_id,username,full_name,bio,avatar_url,cover_image_url,profile_type,website_url,instagram_url,twitter_url,youtube_url,tiktok_url,soundcloud_url,spotify_url,embed_settings'\)/, 'native public identity must load common owner fields and the bounded profile-visibility preference');
assert.match(publicProfile, /folder: 'profile\/cover'/, 'native public identity must support real cover-image upload');
assert.match(publicProfile, /website_url: normaliseProfileUrl\(website\)[\s\S]*spotify_url: normaliseProfileUrl\(spotify\)[\s\S]*\.eq\('user_id', user\.id\)/, 'common identity links must save only to the authenticated profile');

assert.match(route, /StudioConnectCardEditorScreen/, 'Connect Card editor must use a thin native Expo route');
assert.match(editor, /Identity & links[\s\S]*Services & rates/, 'routine Card identity and service work must be native');
assert.match(editor, /Open public Connect Card[\s\S]*\/connect\/\$\{profile\.slug\}/, 'public Card viewing must be a separate explicit action');
assert.match(editor, /buildEmbeddedStudioRoute\('\/studio\/connect-card', 'Connect Card', '\/studio\/connect-card'\)/, 'advanced Card controls must use the exact secure Studio module');

assert.match(service, /from\('connect_profiles'\)[\s\S]*\.eq\('user_id', userId\)\.maybeSingle\(\)/, 'Connect Card identity reads must be exact-owner scoped');
assert.match(service, /from\('connect_services'\)[\s\S]*\.eq\('user_id', userId\)/, 'Connect Card service reads must be exact-owner scoped');
assert.match(service, /rpc\('check_connect_slug_available'[\s\S]*p_current_user_id: userId/, 'Connect Card slug uniqueness must use the established safe RPC');
assert.match(service, /from\('connect_profiles'\)[\s\S]*\.upsert\(payload, \{ onConflict: 'user_id' \}\)[\s\S]*data\?\.user_id !== userId/, 'Connect Card saves must upsert by owner and confirm ownership');
assert.match(service, /from\('connect_services'\)\.update\(payload\)\.eq\('id', draft\.id\)\.eq\('user_id', userId\)/, 'service updates must constrain both service and owner');
assert.match(service, /from\('connect_services'\)[\s\S]*\.delete\(\)[\s\S]*\.eq\('id', serviceId\)[\s\S]*\.eq\('user_id', userId\)/, 'service removal must constrain both service and owner');

assert.match(studio, /id: 'page'[\s\S]*buildEmbeddedStudioRoute\('\/studio\/my-pluggd\/page', 'Public Page Builder', '\/studio\/my-pluggd'\)/, 'My PLUGGD Page management must open the exact authenticated page builder');
assert.match(studio, /id: 'connect-card'[\s\S]*route: '\/studio\/connect-card\/edit'/, 'My PLUGGD Card management must open the native owner editor');
assert.match(studio, /id: 'embeds'[\s\S]*buildEmbeddedStudioRoute\('\/studio\/my-pluggd\/embeds'/, 'specialist embed tools must remain in exact secure Studio');
assert.doesNotMatch(studio, /id: 'page'[\s\S]{0,250}route: publicRoute/, 'owner Page management must never route to a public creator page');
assert.doesNotMatch(service + editor, /service_role|SUPABASE_SERVICE_ROLE|access_token|refresh_token/, 'native owner editing must never contain privileged credentials or URL tokens');

console.log('PASS mobile Studio identity and Connect Card contract');
