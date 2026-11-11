// @ts-nocheck -- Compiled separately for the local WebView visual renderer.
import * as THREE from "three";
import { DEFAULT_VIEW_ANGLE, clampViewAngle } from "./deckViewSettings.renderer";

export { DEFAULT_VIEW_ANGLE, MIN_VIEW_ANGLE, MAX_VIEW_ANGLE, clampViewAngle } from "./deckViewSettings.renderer";

const TARGET = new THREE.Vector3(0, 0.135, 0.01);
const DISTANCE = Math.hypot(1.315, 1.84);

/** Match the supplied reference with a lower, front-facing perspective. */
export function createDeckCamera(aspect = 1.27, angle = DEFAULT_VIEW_ANGLE) {
  const camera = new THREE.PerspectiveCamera(30, aspect, 0.01, 10);
  return frameDeckCamera(camera, aspect, angle);
}

/** Move only the camera. The calibrated deck, arm pivots and audio stay fixed. */
export function frameDeckCamera(camera, aspect, angle = camera.userData.deckViewAngle ?? DEFAULT_VIEW_ANGLE) {
  const ratio = Number.isFinite(aspect) && aspect > 0 ? aspect : 1.27;
  const elevation = clampViewAngle(angle);
  const radians = THREE.MathUtils.degToRad(elevation);
  const viewHeight = Math.max(0.82, 1.28 / ratio);
  camera.aspect = ratio;
  camera.fov = THREE.MathUtils.radToDeg(2 * Math.atan(viewHeight / (2 * DISTANCE)));
  camera.position.set(TARGET.x, TARGET.y + DISTANCE * Math.sin(radians), TARGET.z + DISTANCE * Math.cos(radians));
  camera.lookAt(TARGET);
  camera.userData.deckViewAngle = elevation;
  camera.updateProjectionMatrix();
  // Hit targets are projected before rendering, including on the initial frame.
  camera.updateMatrixWorld(true);
  return camera;
}
