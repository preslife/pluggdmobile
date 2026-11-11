/** Playhead/chapter zero is a real timestamp, unlike an unknown duration. */
export function roomTimestamp(seconds: number | null | undefined): string {
  if (typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0) return '--:--';
  const whole = Math.floor(seconds); return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`;
}
export type RoomTab = 'listen' | 'tracklist' | 'room';
export type RoomView = { tab: RoomTab; angle: number; draft: string; position: number; placed: boolean };
const empty = (): RoomView => ({ tab: 'listen', angle: 35.5, draft: '', position: 0, placed: false });

/** Bounded, memory-only view state. A new account/session discards every draft;
 * no private metadata, signed URL or capability is persisted. */
export class RoomViewCache {
  private identity = '';
  private rows = new Map<string, { value: RoomView; at: number }>();
  constructor(private now = Date.now) {}
  private bind(identity: string) {
    if (identity !== this.identity) { this.identity = identity; this.rows.clear(); }
  }
  read(identity: string, mixId: string): RoomView {
    this.bind(identity);
    const row = this.rows.get(mixId);
    if (!row || this.now() - row.at > 30 * 60_000) { this.rows.delete(mixId); return empty(); }
    return { ...row.value };
  }
  write(identity: string, mixId: string, patch: Partial<RoomView>) {
    const value = { ...this.read(identity, mixId), ...patch };
    if (!['listen', 'tracklist', 'room'].includes(value.tab)) value.tab = 'listen';
    value.angle = Number.isFinite(value.angle) ? Math.max(25, Math.min(65, value.angle)) : 35.5;
    value.position = Number.isFinite(value.position) ? Math.max(0, value.position) : 0;
    value.draft = String(value.draft).slice(0, 500);
    value.placed = value.placed === true;
    this.rows.delete(mixId); this.rows.set(mixId, { value, at: this.now() });
    while (this.rows.size > 8) this.rows.delete(this.rows.keys().next().value!);
  }
  clear() { this.identity = ''; this.rows.clear(); }
}
export const roomViewState = new RoomViewCache();

/** Keep at most one in-flight seek and its latest successor. A source/session
 * change discards queued work rather than seeking a newly selected track. */
export function createRoomSeekQueue(input: { current: () => boolean; seek: (seconds: number) => Promise<void>; failed: () => void }) {
  let disposed = false;
  let running = false;
  let pending: number | null = null;
  const drain = async () => {
    if (running) return;
    running = true;
    try {
      while (!disposed && input.current() && pending !== null) {
        const seconds = pending; pending = null;
        try { await input.seek(seconds); }
        catch { if (!disposed && input.current()) input.failed(); pending = null; }
      }
    } finally { running = false; if (!input.current() || disposed) pending = null; }
  };
  return {
    get busy() { return running; },
    request(seconds: number) {
      if (disposed || !input.current() || !Number.isFinite(seconds) || seconds < 0) return;
      pending = seconds; void drain();
    },
    cancel() { pending = null; },
    dispose() { disposed = true; pending = null; },
  };
}
