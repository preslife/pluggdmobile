import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');

const route = read('app/studio/videos/index.tsx');
const screen = read('src/features/studio/StudioVideoScreen.tsx');
const service = read('src/features/studio/videoCatalogService.ts');
const studioData = read('src/features/studio/studio-data.ts');
const studioScreens = read('src/features/studio/StudioScreens.tsx');
const tvService = read('src/features/video/pluggdTvService.ts');
const tvRoute = read('app/pluggd-tv.tsx');
const liveScreen = read('src/features/live/live-culture-screen.tsx');

assert.match(route, /StudioVideoScreen/, 'Videos must use a thin native Expo route');
assert.match(screen, /<CreatorAccessGate>/, 'video management must require creator access');
assert.match(studioData, /id: 'videos'[\s\S]*route: '\/studio\/videos'[\s\S]*presentationMode: 'native'[\s\S]*status: 'limited'/, 'Videos must be a genuine native Studio module');
assert.match(studioScreens, /STUDIO_MENU_NATIVE_ROUTE_PATHS[\s\S]*'\/studio\/videos'/, 'the Studio section drawer must allowlist the native Videos route');
assert.match(studioData, /from\('creator_videos'\)[\s\S]*\.eq\('user_id', userId\)/, 'Studio counts must query only the signed-in creator videos');

assert.match(service, /from\('creator_videos'\)[\s\S]*\.eq\('user_id', user\.id\)/, 'video catalogue reads and writes must remain exact-owner scoped');
assert.match(service, /Choose a video file or add a supported YouTube URL/, 'a private draft must have a real file or supported YouTube source');
assert.match(service, /Only HTTPS YouTube/, 'linked video sources must be HTTPS and host allowlisted');
assert.match(service, /path = `\$\{user\.id\}\//, 'file uploads must use the authenticated owner folder');
assert.match(service, /uploadFileToSupabaseStorage\(\{ bucket: 'videos', path/, 'file uploads must use the established video bucket');
assert.match(service, /is_published: false/, 'new creator videos must always start as non-public drafts');
assert.match(service, /if \(createdId\)[\s\S]*\.delete\(\)[\s\S]*if \(createdPaths\.length\)[\s\S]*\.remove\(createdPaths\)/, 'partial draft creation must compensate only newly created rows and objects');
assert.match(service, /replaceStudioVideoAsset[\s\S]*is_published: false[\s\S]*if \(result\.error\)[\s\S]*\.remove\(\[path\]\)/, 'video replacement must return the record to draft and compensate a failed new upload');
assert.match(service, /setStudioVideoPublished[\s\S]*select\('id'\)\.single\(\)/, 'publication must wait for backend acknowledgement');

assert.match(screen, /Public profile/, 'public presentation must be a separate explicit action');
assert.match(screen, /buildEmbeddedStudioRoute\('\/studio\/videos', 'Advanced Video Studio', '\/studio\/videos'\)/, 'advanced tools must open the exact allowlisted authenticated Studio module');
assert.match(screen, /if \(!saved\) return/, 'a failed save must keep the creator form open for recovery');
assert.doesNotMatch(screen + studioData, />Preview<|Desktop Tools/, 'Videos must not use legacy Preview or Desktop Tools semantics');
assert.doesNotMatch(service, /service_role|SUPABASE_SERVICE_ROLE/, 'native video management must never contain a service-role credential');

assert.match(tvService, /from\('creator_videos'\)[\s\S]*\.eq\('is_published', true\)/, 'PLUGGD TV must never expose private creator video drafts');
assert.match(tvService, /from\('videos'\)/, 'PLUGGD TV must retain curated editorial videos alongside creator videos');
assert.match(tvRoute, /loadPluggdTvFeed/, 'PLUGGD TV must be a real data-backed public route');
assert.match(tvRoute, /router\.push\(`\/videos\/\$\{video\.id\}`/, 'PLUGGD TV cards must open the existing playable video detail route');
assert.match(liveScreen, /PluggdTvEntry[\s\S]*router\.push\('\/pluggd-tv'/, 'Live must expose a working PLUGGD TV destination');
assert.match(screen, /eligible for PLUGGD TV/, 'Video publishing must explain its real public destination');

console.log('PASS mobile native video catalogue contract');
