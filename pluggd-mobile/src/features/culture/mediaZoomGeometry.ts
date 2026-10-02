export const MAX_MEDIA_ZOOM = 4;

function bound(value: number, minimum: number, maximum: number) {
  'worklet';
  return Math.min(maximum, Math.max(minimum, value));
}

/** Dimensions of contain-fitted artwork, excluding its letterbox area. */
export function containedMediaSize(width: number, height: number, aspectRatio: number) {
  'worklet';
  const ratio = Number.isFinite(aspectRatio) && aspectRatio > 0 ? aspectRatio : 1;
  const fittedWidth = Math.min(Math.max(0, width), Math.max(0, height) * ratio);
  return { width: fittedWidth, height: fittedWidth / ratio };
}

/** Keep the actual image edge inside the viewport, not the letterbox edge. */
export function boundedMediaTransform(
  scale: number,
  x: number,
  y: number,
  imageWidth: number,
  imageHeight: number,
  viewportWidth: number,
  viewportHeight: number,
) {
  'worklet';
  const zoom = bound(scale, 1, MAX_MEDIA_ZOOM);
  const limitX = Math.max(0, (imageWidth * zoom - viewportWidth) / 2);
  const limitY = Math.max(0, (imageHeight * zoom - viewportHeight) / 2);
  return { scale: zoom, x: limitX === 0 ? 0 : bound(x, -limitX, limitX), y: limitY === 0 ? 0 : bound(y, -limitY, limitY) };
}

/** A normal-size horizontal swipe pages; a zoomed drag only moves the image. */
export function mediaPageDirection(scale: number, translationX: number, translationY: number): -1 | 0 | 1 {
  'worklet';
  if (scale > 1.01 || Math.abs(translationX) < 48 || Math.abs(translationX) <= Math.abs(translationY) * 1.25) return 0;
  return translationX > 0 ? -1 : 1;
}
