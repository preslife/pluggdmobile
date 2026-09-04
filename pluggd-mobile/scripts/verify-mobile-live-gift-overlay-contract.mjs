import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const scriptsDirectory = dirname(fileURLToPath(import.meta.url));
const mobileRoot = resolve(scriptsDirectory, '..');

function source(path) {
  return readFileSync(resolve(mobileRoot, path), 'utf8');
}

function expect(condition, message) {
  if (!condition) throw new Error(`live gift overlay contract failed: ${message}`);
}

function loadTypeScriptModule(path, mocks = {}) {
  const output = ts.transpileModule(source(path), {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: path,
    reportDiagnostics: true,
  });
  const diagnostics = output.diagnostics ?? [];
  expect(diagnostics.length === 0, `${path} did not transpile cleanly`);

  const module = { exports: {} };
  const localRequire = (specifier) => {
    if (Object.hasOwn(mocks, specifier)) return mocks[specifier];
    return require(specifier);
  };
  const evaluate = new Function('require', 'module', 'exports', output.outputText);
  evaluate(localRequire, module, module.exports);
  return module.exports;
}

const presentation = loadTypeScriptModule('src/features/live/liveGiftPresentation.ts');
const queue = loadTypeScriptModule('src/features/live/useLiveGiftQueue.ts', {
  react: {
    useCallback: (callback) => callback,
    useEffect: () => undefined,
    useReducer: () => [queue.createLiveGiftQueueState(), () => undefined],
  },
});

const catalog = [
  presentation.normalizeLiveGiftCatalogItem({
    id: 'gift-fire',
    slug: 'fire',
    label: 'Fire',
    description: 'Light up the room',
    credit_cost: 40,
    thumbnail_url: 'https://media.example/fire.png',
    animation_url: 'https://media.example/fire.json',
  }),
].filter(Boolean);
const catalogById = presentation.liveGiftCatalogLookup(catalog);
const event = presentation.normalizeLiveGiftEvent({
  id: 'event-a',
  room_id: 'room-a',
  gift_id: 'gift-fire',
  sender_id: 'sender-a',
  quantity: 2,
  total_credits: 80,
  animation_variant: 'burst',
  created_at: '2026-08-25T12:00:00.000Z',
}, catalogById);

expect(event?.gift?.label === 'Fire', 'gift_id did not hydrate from the room catalogue');
expect(event?.animation_variant === 'burst', 'animation_variant was lost during normalisation');
expect(event?.quantity === 2 && event?.total_credits === 80, 'quantity or fixed-price total was changed');
expect(
  presentation.normalizeLiveGiftEvent({ room_id: 'room-a', sender_id: 'sender-a' }, catalogById) === null,
  'an event without a durable ID was accepted',
);
const unknownEvent = presentation.normalizeLiveGiftEvent({
  id: 'event-unknown',
  room_id: 'room-a',
  gift_id: 'gift-missing',
  sender_id: 'sender-b',
  quantity: 1,
  total_credits: 10,
  created_at: '2026-08-25T12:00:01.000Z',
}, catalogById);
expect(unknownEvent?.gift === null, 'unknown gift metadata was invented');
expect(presentation.liveGiftSenderName(event, 'sender-a', {}) === 'You', 'sender self-label is not You');
expect(
  presentation.liveGiftSenderName(event, 'viewer-a', { 'sender-a': { username: 'selector' } }) === 'selector',
  'resolved sender profile was not used',
);
expect(
  presentation.liveGiftSenderName(event, 'viewer-a', {}) === 'A supporter',
  'unresolved sender exposed something other than the restrained supporter fallback',
);
expect(presentation.safeGiftAssetUrl('https://media.example/gift.png') !== null, 'valid HTTPS thumbnail was rejected');
expect(presentation.safeGiftAssetUrl('http://media.example/gift.png') === null, 'insecure gift media was accepted');
expect(presentation.safeGiftAssetUrl('javascript:alert(1)') === null, 'unsafe gift media was accepted');
expect(presentation.isGiftCatalogRpcUnavailable({ code: 'PGRST202' }), 'schema-cache unavailable RPC was not classified');
expect(presentation.isGiftCatalogRpcUnavailable({ code: '42883' }), 'undefined RPC was not classified');
expect(
  !presentation.isGiftCatalogRpcUnavailable({ code: '42501', message: 'permission denied' }),
  'permission failure was incorrectly allowed to fall back to a global catalogue',
);

function giftEvent(id) {
  return { ...event, id, created_at: `2026-08-25T12:00:${id.padStart(2, '0')}.000Z` };
}

let queueState = queue.createLiveGiftQueueState();
queueState = queue.reduceLiveGiftQueue(queueState, { type: 'enqueue', event: giftEvent('01') });
queueState = queue.reduceLiveGiftQueue(queueState, { type: 'enqueue', event: giftEvent('02') });
queueState = queue.reduceLiveGiftQueue(queueState, { type: 'enqueue', event: giftEvent('03') });
queueState = queue.reduceLiveGiftQueue(queueState, { type: 'enqueue', event: giftEvent('02') });
expect(queueState.active?.id === '01', 'first gift is not the active FIFO event');
expect(queueState.pending.map((item) => item.id).join(',') === '02,03', 'queue order or durable-ID dedupe failed');
queueState = queue.reduceLiveGiftQueue(queueState, { type: 'complete', eventId: '01' });
expect(queueState.active?.id === '02' && queueState.pending[0]?.id === '03', 'completion did not advance FIFO order');

let cappedState = queue.createLiveGiftQueueState();
for (let index = 0; index < 27; index += 1) {
  cappedState = queue.reduceLiveGiftQueue(cappedState, {
    type: 'enqueue',
    event: giftEvent(String(index + 10)),
  });
}
expect(cappedState.pending.length === queue.MAX_PENDING_LIVE_GIFTS, 'pending queue is not capped at 20');
expect(cappedState.seenEventIds.size === 27, 'overflow events were not durably marked as handled');
cappedState = queue.reduceLiveGiftQueue(cappedState, { type: 'clear' });
expect(!cappedState.active && cappedState.pending.length === 0 && cappedState.seenEventIds.size === 0, 'queue clear retained stale room state');
let seededState = queue.reduceLiveGiftQueue(queue.createLiveGiftQueueState(), { type: 'seed', eventIds: ['history-a'] });
seededState = queue.reduceLiveGiftQueue(seededState, { type: 'enqueue', event: giftEvent('history-a') });
expect(seededState.active === null, 'initial history replayed as a new shared effect');

const liveScreen = source('src/screens/LiveSessionScreen.tsx');
const loadGifts = liveScreen.slice(
  liveScreen.indexOf('const loadGifts = useCallback'),
  liveScreen.indexOf('const setupReactions = useCallback'),
);
expect(loadGifts.includes("rpc('get_live_room_gift_catalog'"), 'room-scoped catalogue RPC is missing');
expect(loadGifts.includes('isGiftCatalogRpcUnavailable'), 'global fallback is not limited to genuine RPC unavailability');
expect(loadGifts.includes('gift_id') && loadGifts.includes('animation_variant'), 'event selects omit gift metadata keys');
expect(loadGifts.includes('seedSeenGifts'), 'initial event history can replay through the overlay');
expect(loadGifts.includes('void receiveGiftEvent(payload.new)'), 'realtime INSERT does not use canonical hydration');
expect(liveScreen.includes('await receiveGiftEvent((data as any).event, gift)'), 'send response bypasses shared dedupe/hydration');
expect(liveScreen.includes("kind: 'live_gift'"), 'commerce policy guard was removed');
expect(liveScreen.includes("supabase.functions.invoke('send-live-gift'"), 'authenticated gift function path was removed');
expect(liveScreen.includes('idempotency_key: idempotencyKey'), 'per-attempt idempotency key was removed');
expect(liveScreen.includes('<LiveGiftOverlay'), 'shared native overlay is not mounted');
expect(liveScreen.indexOf('<LiveGiftOverlay') < liveScreen.indexOf('<View style={[styles.topOverlay'), 'shared overlay is not below interactive controls');
expect(liveScreen.includes('<LiveGiftArtwork gift={gift}'), 'native tray still ignores catalogue artwork');
expect(!liveScreen.includes('giftConfirmation'), 'old competing sender-only overlay remains mounted');

const overlay = source('src/features/live/LiveGiftOverlay.tsx');
expect(overlay.includes('pointerEvents="none"'), 'overlay can intercept Live controls');
expect(overlay.includes('AccessibilityInfo.announceForAccessibility'), 'durable event has no accessibility announcement');
expect(overlay.includes('importantForAccessibility="no-hide-descendants"'), 'visual overlay can steal screen-reader focus');
expect(overlay.includes('safeGiftAssetUrl'), 'thumbnail URL is not validated');
expect(overlay.includes('onError={() => setThumbnailFailed(true)}'), 'thumbnail failure has no deterministic fallback');
expect(overlay.includes('reducedMotion'), 'Reduce Motion has no static presentation path');
expect(!/lottie|svgaplayer|<Video|expo-video/i.test(overlay), 'unapproved native player or media effect entered Build 8');

console.log('mobile Live Gifts shared-overlay contract passed (catalogue, hydration, dedupe, FIFO/cap, fallback and accessibility)');
