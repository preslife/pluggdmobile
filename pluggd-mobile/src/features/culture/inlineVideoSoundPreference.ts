import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
import { create } from 'zustand';

const KEY = 'pluggd:community-video-muted:v1';
export const useInlineVideoSoundPreference = create<{ muted: boolean; ready: boolean }>(() => ({ muted: false, ready: false }));
let hydration: Promise<void> | undefined;
let revision = 0;
let writes = Promise.resolve();

export function hydrateInlineVideoSoundPreference() {
  if (useInlineVideoSoundPreference.getState().ready) return Promise.resolve();
  if (!hydration) {
    const request = revision;
    hydration = AsyncStorage.getItem(KEY).then(value => {
      useInlineVideoSoundPreference.setState(request === revision ? { muted: value !== null && value !== 'false', ready: true } : { ready: true });
    }).catch(() => {
      // An unread preference must not produce an unexpected audible preview.
      useInlineVideoSoundPreference.setState(request === revision ? { muted: true, ready: true } : { ready: true });
    });
  }
  return hydration;
}

export async function setInlineVideoUserMuted(muted: boolean) {
  const current = useInlineVideoSoundPreference.getState();
  if (current.ready && current.muted === muted) return;
  const request = ++revision;
  useInlineVideoSoundPreference.setState({ muted, ready: true });
  writes = writes.catch(() => undefined).then(() => AsyncStorage.setItem(KEY, String(muted)));
  try { await writes; }
  catch {
    if (request === revision) Alert.alert('Sound preference not saved', 'Your choice applies for now, but couldn’t be saved for your next visit. Please try again.');
  }
}
