import { useEffect } from 'react';
import { Platform } from 'react-native';

/**
 * The app runs portrait-first (app config orientation is "default" so iOS
 * allows runtime rotation; the root layout locks portrait on launch).
 * Listening-room surfaces opt into rotation with the hook below.
 *
 * expo-screen-orientation is only touched when the native module is actually
 * present. Importing it at module scope threw "Cannot find native module
 * 'ExpoScreenOrientation'" on any binary built before the dependency was
 * added, and because the root layout imports this file, that killed the app on
 * launch — no sign-in screen, just a redbox. The throw comes out of Expo's
 * native-module proxy and is not reliably catchable around the import, so the
 * availability check has to happen first: globalThis.expo.modules is a plain
 * object lookup that cannot throw.
 *
 * Rotation is polish. Losing it must never cost the app its launch.
 */
type ScreenOrientationModule = typeof import('expo-screen-orientation');

let resolved: ScreenOrientationModule | null | undefined;

function nativeModulePresent(): boolean {
  const modules = (globalThis as { expo?: { modules?: Record<string, unknown> } }).expo?.modules;
  return Boolean(modules && modules.ExpoScreenOrientation);
}

function screenOrientation(): ScreenOrientationModule | null {
  if (resolved !== undefined) return resolved;
  if (Platform.OS === 'web' || !nativeModulePresent()) {
    resolved = null;
    return resolved;
  }
  try {
    resolved = require('expo-screen-orientation') as ScreenOrientationModule;
  } catch {
    resolved = null;
  }
  return resolved;
}

export function lockAppPortrait() {
  const orientation = screenOrientation();
  if (!orientation) return;
  try {
    void orientation.lockAsync(orientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
  } catch {
    // Native module went away mid-session; portrait is the default anyway.
  }
}

/**
 * Frees rotation while the screen is mounted — turning the phone
 * sideways enters the wide listening-room layout — and returns the app
 * to portrait when the screen unmounts.
 */
export function useListeningRoomOrientation() {
  useEffect(() => {
    const orientation = screenOrientation();
    if (!orientation) return;
    try {
      void orientation.unlockAsync().catch(() => undefined);
    } catch {
      return;
    }
    return () => {
      try {
        void orientation.lockAsync(orientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
      } catch {
        // no-op
      }
    };
  }, []);
}
