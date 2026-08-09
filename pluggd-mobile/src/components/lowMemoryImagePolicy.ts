export const LOW_MEMORY_ANDROID_MAX_API = 25;
export const LOW_MEMORY_IMAGE_WIDTH_CAP = 360;
export const LOW_MEMORY_IMAGE_CONCURRENCY = 2;

export function isLowMemoryAndroidImageTarget(platform: string, version: string | number) {
  const api = Number(version);
  return platform === 'android' && Number.isFinite(api) && api <= LOW_MEMORY_ANDROID_MAX_API;
}

export function imageDisplayWidthForDevice(displayWidth: number, lowMemoryTarget: boolean) {
  const validWidth = Number.isFinite(displayWidth) && displayWidth > 0 ? displayWidth : LOW_MEMORY_IMAGE_WIDTH_CAP;
  return lowMemoryTarget ? Math.min(validWidth, LOW_MEMORY_IMAGE_WIDTH_CAP) : validWidth;
}

export type ImageSlotRelease = () => void;
type ImageSlotStart = (release: ImageSlotRelease) => void;

type PendingImageLoad = {
  cancelled: boolean;
  release?: ImageSlotRelease;
  start: ImageSlotStart;
  started: boolean;
};

/**
 * Bounds simultaneous native image/network work on Android 7 devices whose
 * normal app heap can be as small as 48 MB. Loaded images remain cached by the
 * native pipeline; this only prevents a ScrollView full of artwork from
 * starting every TLS request and bitmap decode in the same GC window.
 */
export function createImageLoadScheduler(concurrency = LOW_MEMORY_IMAGE_CONCURRENCY) {
  const limit = Math.max(1, Math.floor(concurrency));
  const pending: PendingImageLoad[] = [];
  let active = 0;

  const pump = () => {
    while (active < limit) {
      const task = pending.shift();
      if (!task) return;
      if (task.cancelled) continue;

      active += 1;
      task.started = true;
      let released = false;
      const release = () => {
        if (released) return;
        released = true;
        active = Math.max(0, active - 1);
        Promise.resolve().then(pump);
      };
      task.release = release;
      task.start(release);
    }
  };

  return {
    schedule(start: ImageSlotStart) {
      const task: PendingImageLoad = { cancelled: false, start, started: false };
      pending.push(task);
      pump();
      return () => {
        task.cancelled = true;
        task.release?.();
      };
    },
    getActiveCount: () => active,
    getPendingCount: () => pending.filter((task) => !task.cancelled).length,
  };
}

export const lowMemoryImageLoadScheduler = createImageLoadScheduler();
