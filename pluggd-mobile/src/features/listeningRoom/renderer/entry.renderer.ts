// @ts-nocheck -- Browser target; bundled independently of the native application.
import { createDeckScene } from './createDeckScene.renderer';
import { createCueGate, isDeckSnapshot } from '../deckBridge';
import modelBase64 from './model.generated';
import configuration from '../../../../assets/listening-room/rig-config.json';

const stage = document.getElementById('deck');
const canvas = document.getElementById('surface');
const armHandle = document.getElementById('arm');
const recordHandle = document.getElementById('record');
const startButton = document.getElementById('start');
let state = null, scene = null, starting = false, disposed = false, readySent = false;
let lastArtwork = '', lastSeekAt = 0, pendingSeek = null, seekTimer = null, touchedSource = '';
const cue = createCueGate();
const controller = new AbortController();
let eventSequence = 0;
let parkLatched = false, parkAcknowledged = false;
function post(event) {
  if (!state || disposed) return;
  window.ReactNativeWebView?.postMessage(JSON.stringify({ version: 1, session: state.session, mixId: state.mixId, sequence: ++eventSequence, ...event }));
}
function fail() { post({ kind: 'error', message: 'The 3D deck could not open. Please try again.' }); }
function sourceKey() { return state ? `${state.session}:${state.mixId}` : ''; }
function clearSeek() { if (seekTimer) clearTimeout(seekTimer); seekTimer = null; pendingSeek = null; }
function flushSeek() {
  if (!pendingSeek) return;
  const item = pendingSeek; clearSeek();
  if (state.visible && item.source === sourceKey()) { lastSeekAt = performance.now(); post({ kind: 'seek', seconds: item.seconds }); }
}
function seek(seconds) {
  if (!state?.visible || !Number.isFinite(seconds)) return;
  pendingSeek = { source: sourceKey(), seconds: Math.max(0, Math.min(state.duration, seconds)) };
  if (performance.now() - lastSeekAt >= 100) flushSeek();
  else if (!seekTimer) seekTimer = setTimeout(flushSeek, 100 - (performance.now() - lastSeekAt));
}
function artwork() {
  if (!scene || !state) return;
  const key = JSON.stringify([state.coverUrl, state.duration, state.chapters]);
  if (key === lastArtwork) return;
  lastArtwork = key;
  scene.setRecord({ cover: state.coverUrl, chapters: state.duration > 0 ? state.chapters.map(s => s / state.duration) : [] });
}
async function initialise() {
  if (scene || starting || disposed || !state) return;
  starting = true;
  try {
    const binary = atob(modelBase64); const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    scene = await createDeckScene({
      stage, canvas, armHandle, recordHandle, startButton, modelBytes: bytes.buffer, configuration,
      signal: controller.signal, getEnvironment: () => ({ visible: Boolean(state?.visible), reducedMotion: Boolean(state?.reducedMotion) }),
      getPlayer: () => ({
        duration: state.duration, time: state.position, source: sourceKey(),
        playing: !parkLatched && (state.playing || cue.pending !== null), loading: cue.pending !== null,
        forcePark: parkLatched,
        engaged: state.engaged || touchedSource === sourceKey(),
        ended: state.duration > 0 && state.position >= state.duration && !state.playing && cue.pending === null,
        seek,
      }),
      onGestureEnd: flushSeek, onError: fail,
      onState: pose => {
        if (!state?.visible) return;
        const requestId = cue.touchdown(pose.placed, pose.phase);
        if (requestId !== null) { touchedSource = sourceKey(); post({ kind: 'cueReady', requestId }); }
      },
    });
    if (disposed) { scene.dispose(); return; }
    scene.setViewAngle(state.viewAngle); artwork();
    if (!state.visible) scene.suspend();
    readySent = true; post({ kind: 'ready' });
  } catch (error) { if (!disposed && error?.name !== 'AbortError') fail(); }
}
window.PLUGGDDeckReceive = incoming => {
  if (disposed || !isDeckSnapshot(incoming)) return;
  if (state && incoming.session === state.session && incoming.sequence <= state.sequence) return;
  const changed = !state || incoming.session !== state.session || incoming.mixId !== state.mixId;
  const requestChanged = !state || incoming.cueRequestId !== state.cueRequestId;
  const parkChanged = incoming.parkRequestId !== null && (!state || incoming.parkRequestId !== state.parkRequestId);
  if (changed || !incoming.visible || requestChanged || parkChanged) { clearSeek(); scene?.cancelGesture(); }
  if (changed) { touchedSource = ''; lastArtwork = ''; parkLatched = false; parkAcknowledged = false; }
  if (parkChanged) { parkLatched = true; parkAcknowledged = false; touchedSource = ''; }
  // Stale native progress during async pause/seek cannot re-engage a stopped arm.
  if (parkLatched && !parkChanged) {
    if (incoming.cueRequestId !== null || (parkAcknowledged && (incoming.playing || incoming.engaged))) parkLatched = false;
  }
  if (parkLatched && !incoming.playing && !incoming.engaged && incoming.position < 0.05) {
    parkAcknowledged = true;
  }
  if (incoming.cueRequestId === null) touchedSource = '';
  state = incoming;
  cue.sync(sourceKey(), parkLatched ? null : state.cueRequestId, state.visible);
  if (!scene) { void initialise(); return; }
  scene.setViewAngle(state.viewAngle); artwork();
  if (!state.visible) scene.suspend(); else scene.invalidate();
  if (changed && readySent) post({ kind: 'ready' });
};
function suspend() {
  if (!state) return;
  cue.sync(sourceKey(), state.cueRequestId, false); clearSeek(); scene?.suspend();
}
document.addEventListener('visibilitychange', () => { if (document.hidden) suspend(); });
window.addEventListener('pagehide', suspend);
window.addEventListener('beforeunload', () => { disposed = true; clearSeek(); controller.abort(); scene?.dispose(); });
window.addEventListener('error', fail);
