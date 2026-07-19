import { useEffect } from 'react';
import { Platform } from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';

/**
 * The app runs portrait-first (app.json orientation is "default" so iOS
 * allows runtime rotation; the root layout locks portrait on launch).
 * Listening-room surfaces opt into rotation with the hook below.
 */
export function lockAppPortrait() {
  if (Platform.OS === 'web') return;
  void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
}

/**
 * Frees rotation while the screen is mounted — turning the phone
 * sideways enters the wide listening-room layout — and returns the app
 * to portrait when the screen unmounts.
 */
export function useListeningRoomOrientation() {
  useEffect(() => {
    if (Platform.OS === 'web') return;
    void ScreenOrientation.unlockAsync().catch(() => undefined);
    return () => {
      void ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
    };
  }, []);
}
