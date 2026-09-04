import { useEffect } from 'react';
import { Dimensions, Platform } from 'react-native';

/**
 * The app runs portrait-first on compact devices (app config orientation is
 * "default" so the root can unlock large Android windows at runtime).
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
 * Keep the compact phone experience portrait-first while allowing Android
 * tablets and unfolded devices to participate fully in rotation, resize and
 * multi-window. Using the shortest window edge avoids treating an ordinary
 * phone in landscape as a tablet.
 */
export function applyAdaptiveAppOrientation(shortestWindowEdgeDp: number) {
  const orientation = screenOrientation();
  if (!orientation) return;

  try {
    if (Platform.OS === 'android' && shortestWindowEdgeDp >= 600) {
      void orientation.unlockAsync().catch(() => undefined);
      return;
    }
    void orientation.lockAsync(orientation.OrientationLock.PORTRAIT_UP).catch(() => undefined);
  } catch {
    // Rotation support is progressive enhancement; launch remains primary.
  }
}

function restoreAdaptiveAppOrientation() {
  const window = Dimensions.get('window');
  applyAdaptiveAppOrientation(Math.min(window.width, window.height));
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
        restoreAdaptiveAppOrientation();
      } catch {
        // no-op
      }
    };
  }, []);
}
