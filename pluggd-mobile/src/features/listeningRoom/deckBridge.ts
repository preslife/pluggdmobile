/** Small, versioned data-only bridge. The WebView never owns an audio player. */
export const DECK_BRIDGE_VERSION = 1;
export type DeckSnapshot = {
  kind: 'state'; version: 1; session: string; mixId: string; sequence: number;
  position: number; duration: number; playing: boolean; engaged: boolean;
  visible: boolean; reducedMotion: boolean; cueRequestId: number | null; parkRequestId: number | null;
  coverUrl: string | null; viewAngle: number; chapters: number[];
};
export type DeckEvent = { version: 1; session: string; mixId: string; sequence: number } & (
  { kind: 'ready' } | { kind: 'seek'; seconds: number } |
  { kind: 'cueReady'; requestId: number } | { kind: 'error'; message: string }
);
const record = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;
export const validCueId = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0;
export function coverImageUrl(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 8192) return null;
  try { const url = new URL(value); return url.protocol === 'https:' && !url.username && !url.password ? value : null; } catch { return null; }
}
export const clampViewAngle = (value: number) => Number.isFinite(value) ? Math.max(25, Math.min(65, value)) : 35.5;
export function isDeckSnapshot(value: unknown): value is DeckSnapshot {
  if (!record(value) || value.kind !== 'state' || value.version !== 1 || typeof value.session !== 'string' || value.session.length > 160 ||
      typeof value.mixId !== 'string' || value.mixId.length > 200 || !validCueId(value.sequence) ||
      typeof value.duration !== 'number' || !Number.isFinite(value.duration) || value.duration < 0 ||
      typeof value.position !== 'number' || !Number.isFinite(value.position) || value.position < 0 || value.position > value.duration ||
      !['playing', 'engaged', 'visible', 'reducedMotion'].every(key => typeof value[key] === 'boolean') ||
      !(value.cueRequestId === null || validCueId(value.cueRequestId)) ||
      !(value.parkRequestId === null || validCueId(value.parkRequestId)) ||
      !(value.coverUrl === null || coverImageUrl(value.coverUrl) === value.coverUrl) ||
      typeof value.viewAngle !== 'number' || !Number.isFinite(value.viewAngle) || value.viewAngle < 25 || value.viewAngle > 65 ||
      !Array.isArray(value.chapters) || value.chapters.length > 300 || !value.chapters.every(v => typeof v === 'number' && Number.isFinite(v) && v >= 0 && v <= Number(value.duration))) return false;
  return true;
}
export function parseDeckEvent(raw: string): DeckEvent | null {
  if (raw.length > 4096) return null;
  let value: unknown; try { value = JSON.parse(raw); } catch { return null; }
  if (!record(value) || value.version !== 1 || typeof value.session !== 'string' || value.session.length > 160 ||
      typeof value.mixId !== 'string' || value.mixId.length > 200 || !validCueId(value.sequence)) return null;
  if (value.kind === 'ready') return value as DeckEvent;
  if (value.kind === 'seek' && typeof value.seconds === 'number' && Number.isFinite(value.seconds) && value.seconds >= 0) return value as DeckEvent;
  if (value.kind === 'cueReady' && validCueId(value.requestId)) return value as DeckEvent;
  if (value.kind === 'error' && typeof value.message === 'string' && value.message.length <= 300) return value as DeckEvent;
  return null;
}
/** A cancelled cue cannot be revived by an identical snapshot after backgrounding. */
export function createCueGate() {
  let source = ''; let current: number | null = null; let pending: number | null = null;
  const spent = new Set<number>();
  return {
    sync(nextSource: string, requestId: number | null, visible: boolean) {
      if (source !== nextSource) { source = nextSource; current = null; pending = null; spent.clear(); }
      if (current !== requestId) { if (current !== null) spent.add(current); current = requestId; }
      if (!visible) { if (requestId !== null) spent.add(requestId); pending = null; }
      else pending = requestId !== null && !spent.has(requestId) ? requestId : null;
    },
    touchdown(placed: boolean, phase: string): number | null {
      if (!placed || phase !== 'tracking' || pending === null) return null;
      const id = pending; spent.add(id); pending = null; return id;
    },
    get pending() { return pending; },
  };
}
