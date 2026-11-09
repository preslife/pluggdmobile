let attached = 0;
const listeners = new Set<() => void>();
export const playbackServiceAttached = (): boolean => attached > 0;
export function subscribePlaybackService(listener: () => void): () => void {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
export function attachPlaybackService(): () => void {
  attached++;
  for (const listener of listeners) listener();
  let released = false;
  return () => {
    if (released) return;
    released = true;
    attached--;
    for (const listener of listeners) listener();
  };
}
