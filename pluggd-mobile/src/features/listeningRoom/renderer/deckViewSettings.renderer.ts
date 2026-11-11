// @ts-nocheck -- Compiled separately for the local WebView visual renderer.
// Kept separate from Three.js so the controls do not eagerly load the renderer.
export const DEFAULT_VIEW_ANGLE = 35.5;
export const MIN_VIEW_ANGLE = 25;
export const MAX_VIEW_ANGLE = 65;

export function clampViewAngle(value) {
  return Number.isFinite(value)
    ? Math.max(MIN_VIEW_ANGLE, Math.min(MAX_VIEW_ANGLE, value))
    : DEFAULT_VIEW_ANGLE;
}
