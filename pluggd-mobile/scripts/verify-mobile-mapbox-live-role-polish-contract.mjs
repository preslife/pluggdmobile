import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const eas = JSON.parse(read('eas.json'));
const appConfig = read('app.config.ts');
const mapbox = read('src/lib/mapbox.ts');
const live = read('src/screens/LiveSessionScreen.tsx');
const androidMap = read('components/EventsMap.android.tsx');

function resolvedBuildProfile(name, parents = []) {
  assert(!parents.includes(name), 'EAS build profile inheritance must not cycle');
  const profile = eas.build[name];
  assert(Boolean(profile), `EAS build profile ${name} must exist`);
  const inherited = profile.extends ? resolvedBuildProfile(profile.extends, [...parents, name]) : {};
  return { ...inherited, ...profile, env: { ...inherited.env, ...profile.env } };
}
for (const profile of Object.keys(eas.build)) {
  const resolved = resolvedBuildProfile(profile);
  const value = resolved.env?.EXPO_PUBLIC_MAPBOX_TOKEN;
  assert(['development', 'preview', 'production'].includes(resolved.environment), `${profile} must resolve an explicit EAS environment`);
  if (['development', 'preview', 'production'].includes(profile)) assert(resolved.environment === profile, `${profile} must select its matching EAS environment`);
  assert(value === undefined || (typeof value === 'string' && value.startsWith('pk.') && value.length > 40), `${profile} inline token, if supplied, must be a public runtime token`);
  assert(!resolved.env?.RNMAPBOX_MAPS_DOWNLOAD_TOKEN, `${profile} runtime config must never expose the native download secret`);
}
if (process.argv.includes('--candidate-runtime')) {
  const token = process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim();
  assert(typeof token === 'string' && token.startsWith('pk.') && token.length > 40, 'exact candidate runtime must receive a configured public Mapbox token');
  console.log('PASS Mapbox candidate runtime token presence/type (value not printed; artifact/runtime proof remains separate).');
}
assert(appConfig.includes("process.env.EXPO_PUBLIC_MAPBOX_TOKEN?.trim()"), 'Expo config must read only the public runtime token');
assert(appConfig.includes('mapboxRuntimeConfigured: Boolean(MAPBOX_PUBLIC_TOKEN)'), 'Expo config must expose only Mapbox configuration presence');
assert(mapbox.includes("TOKEN: process.env.EXPO_PUBLIC_MAPBOX_TOKEN || ''"), 'mobile geocoder must consume EXPO_PUBLIC_MAPBOX_TOKEN');
assert(!eas.build.production.env.RNMAPBOX_MAPS_DOWNLOAD_TOKEN, 'EAS runtime profiles must not expose the native SDK download secret');
assert(androidMap.includes('if (!MAPBOX_RUNTIME_TOKEN || mapLoadFailed)'), 'credential-free candidates must show the safe map fallback instead of instantiating an unconfigured native map');

assert(live.includes("const isHost = streamRole === 'host'"), 'Live composition must derive the resolved host role');
assert(live.includes('if (isHost) return;'), 'host must be blocked from live-room safety actions');
assert(live.includes("Hosts cannot send gifts to their own live room"), 'host self-gift guard must remain');
assert(!live.includes('<RailButton'), 'boxed right-rail controls must be removed');
assert(!live.includes('label="Like"'), 'visible duplicate Like control must be absent');
assert(live.includes("if (!isHost) void sendReaction('heart')"), 'fan media tap must send the existing heart reaction');
assert(live.includes('<DockIconButton icon="tune" label="Manage live"'), 'host Manage must remain in the bottom action cluster');
assert(live.includes("<DockIconButton icon={muted ? 'mic-off' : 'mic'}"), 'host Mute must remain in the bottom action cluster');
assert(live.includes('<DockIconButton icon="card-giftcard" label="Send gift"'), 'fan Gifts must remain in the bottom action cluster');
assert(live.includes('<DockIconButton icon="more-horiz" label="Live safety"'), 'fan Safety must remain in the bottom overflow action');

assert(live.includes('visible={creatorSheetOpen}'), 'creator identity must open an in-app summary sheet');
assert(live.includes('toggleProfileFollow(session.host_id)'), 'creator sheet must use real follow persistence');
assert(live.includes('View full profile'), 'creator sheet must expose the established full profile route');
assert(live.includes('bio, cover_image_url, slug, profile_type'), 'live room host hydration must include creator summary fields');
assert(live.includes("messages.slice(-4).map"), 'latest persisted/realtime comments must remain over media');
assert(live.includes(".from('session_messages')"), 'real session comment persistence must remain');
assert(live.includes("loadBlockedUserIds()"), 'blocked-user filtering must remain');

for (const required of [
  "fetchLiveToken({ roomId: currentRoomId, role: nextRole })",
  "get_live_room_gift_catalog",
  "send-live-gift",
  "request_live_stage_join",
  "update_live_runtime_preferences",
  "live-runtime-ops",
  "showReportActions({",
  "blockUser(session.host_id",
]) {
  assert(live.includes(required), `preserved Live behaviour missing: ${required}`);
}

assert(live.includes("const previewRole = __DEV__ && preview === 'creator'"), 'role-specific visual fixture must remain development-only');
assert(live.includes("preview.startsWith('audience')"), 'fan visual states must remain development-only');
assert(live.includes('if (previewRole) {') && live.includes('PREVIEW ONLY'), 'development visual fixture must remain guarded and visibly disclosed');

console.log('PASS Mapbox source wiring and role-correct Live polish; candidate runtime token presence requires --candidate-runtime and rendered map proof remains separate.');
