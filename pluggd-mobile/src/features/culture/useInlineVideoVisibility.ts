import { useIsFocused } from '@react-navigation/native';
import { useEffect, useId, useRef, useState, useSyncExternalStore } from 'react';
import { AppState, Dimensions, type View } from 'react-native';
import { chooseInlineVideo, type VideoFrame } from './inlineVideoVisibility';

const entries = new Map<string, { view: View; preferred: boolean }>();
const listeners = new Set<() => void>();
const suspensions = new Set<string>();
let selected: string | null = null;
let timer: ReturnType<typeof setInterval> | undefined;
let measuring = false;
function publish(next: string | null) {
  if (next === selected) return;
  selected = next;
  listeners.forEach(listener => listener());
}
function measure() {
  if (measuring) return;
  if (suspensions.size || AppState.currentState !== 'active') { publish(null); return; }
  measuring = true;
  const frames: VideoFrame[] = [];
  const snapshot = [...entries];
  let remaining = snapshot.length;
  const finish = () => {
    if (--remaining > 0) return;
    measuring = false;
    publish(suspensions.size || AppState.currentState !== 'active' ? null : chooseInlineVideo(frames.filter(frame => entries.has(frame.id)), Dimensions.get('window').height));
  };
  if (!remaining) { measuring = false; publish(null); return; }
  // One measurement pass covers post cards in all feed/profile/thread lists.
  for (const [id, entry] of snapshot) {
    let settled = false;
    const complete = (y?: number, height?: number) => {
      if (settled) return;
      settled = true;
      clearTimeout(timeout);
      if (y !== undefined && height !== undefined && entries.get(id) === entry) frames.push({ id, y, height, preferred: entry.preferred });
      finish();
    };
    const timeout = setTimeout(() => complete(), 200);
    try { entry.view.measureInWindow((_x, y, _width, height) => complete(y, height)); }
    catch { complete(); }
  }
}
function subscribe(listener: () => void) { listeners.add(listener); return () => { listeners.delete(listener); }; }

export function useInlineVideoVisibility(blocked: boolean) {
  const id = useId();
  const view = useRef<View>(null);
  const focused = useIsFocused();
  const [foreground, setForeground] = useState(AppState.currentState === 'active');
  const activeId = useSyncExternalStore(subscribe, () => selected, () => null);
  useEffect(() => {
    const sub = AppState.addEventListener('change', state => {
      setForeground(state === 'active');
      if (state !== 'active') publish(null);
    });
    return () => sub.remove();
  }, []);
  useEffect(() => {
    if (!focused || !foreground || blocked || !view.current) return;
    entries.set(id, { view: view.current, preferred: false });
    if (!timer) timer = setInterval(measure, 250);
    measure();
    return () => {
      entries.delete(id);
      if (selected === id) publish(null);
      if (!entries.size) { clearInterval(timer); timer = undefined; }
    };
  }, [id, focused, foreground, blocked]);
  return {
    view,
    active: focused && foreground && !blocked && activeId === id,
    requestPlay: () => {
      for (const [entryId, entry] of entries) entry.preferred = entryId === id;
      measure();
    },
  };
}

// A full-screen image/video modal leaves its underlying navigation screen focused.
export function useSuspendInlineVideos(active: boolean) {
  const id = useId();
  useEffect(() => {
    if (!active) return;
    suspensions.add(id);
    publish(null);
    return () => { suspensions.delete(id); measure(); };
  }, [id, active]);
}
