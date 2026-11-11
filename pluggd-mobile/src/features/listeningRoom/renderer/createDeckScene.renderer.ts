// Adapted from PLUGGD web approved deck (1e1d9bf26); local visual renderer only.
// @ts-nocheck -- DOM/Three renderer is bundled and checked separately from native TypeScript.
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { createArmMotion, progressToYaw, yawToProgress, wrapAngle } from "./deckMotion.renderer";
import { createDeckCamera, frameDeckCamera, DEFAULT_VIEW_ANGLE, clampViewAngle } from "./deckView.renderer";
import { createVinylRecord, type RecordArtwork } from "./vinylRecord.renderer";
import { roundPlatterRim } from "./roundPlatter.renderer";

const TAU = Math.PI * 2;
const finite = (value, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clampTime = (value, duration) => Math.max(0, Math.min(duration, finite(value)));

function releaseModel(root: any) {
  const textures = new Set<any>();
  const materials = new Set<any>();
  const geometries = new Set<any>();
  root?.traverse((object) => {
    if (object.geometry) geometries.add(object.geometry);
    for (const material of (Array.isArray(object.material) ? object.material : [object.material])) {
      if (!material) continue;
      materials.add(material);
      for (const value of Object.values(material) as any[]) if (value?.isTexture) textures.add(value);
    }
  });
  for (const geometry of geometries) geometry.dispose();
  for (const material of materials) material.dispose();
  for (const texture of textures) {
    texture.source?.data?.close?.();
    texture.dispose();
  }
}

/**
 * A visual controller for the supplied GLB. This module never owns an audio
 * element and never changes play intent when seeking. Native clients can reuse
 * the rig and deckMotion module with their existing playback provider.
 */
export async function createDeckScene({
  stage, canvas, armHandle, recordHandle, startButton, getPlayer,
  modelBytes, configuration, getEnvironment, onGestureEnd, onState, onError, signal,
}) {
  if (signal.aborted) throw new DOMException("Aborted", "AbortError");
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "low-power" });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setClearColor(0x000000, 0);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.16;
  const scene = new THREE.Scene();
  scene.add(new THREE.HemisphereLight(0xffffff, 0x777969, 2.6));
  const key = new THREE.DirectionalLight(0xfff5e9, 2.4);
  key.position.set(-1.2, 3, 2);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xe3eeff, 1.25);
  fill.position.set(2, 1.7, -1.5);
  scene.add(fill);
  let viewAngle = DEFAULT_VIEW_ANGLE;
  const camera = createDeckCamera(1.27, viewAngle);
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
  const hitPoint = new THREE.Vector3();
  const headWorld = new THREE.Vector3();
  const headLocal = new THREE.Vector3();
  const projection = new THREE.Vector3();
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const reducedMotion = () => getEnvironment().reducedMotion;
  const abortListener = () => dispose();
  let root, rig, platter, yaw, lift, motion, armMeshes = [];
  let vinyl: ReturnType<typeof createVinylRecord> | null = null;
  let pendingArtwork: RecordArtwork | null = null;
  let ready = false, disposed = false, visible = true, frame = 0;
  let lastFrame = 0, rotation = 0, gesture = null, lastState = "";
  let width = 0, height = 0;
  let debugFrame = 0;
  const originalButtonPosition = new THREE.Vector3(-0.4207, 0.202, 0.3077);

  function playerState() {
    const player = getPlayer();
    const duration = Math.max(0, finite(player.duration));
    const audio = player.audioRef?.current;
    const time = clampTime(audio && audio.readyState >= 1 ? audio.currentTime : player.time, duration);
    return {
      player, duration, time,
      progress: duration ? time / duration : 0,
      playing: Boolean(player.playing && !player.error),
      ended: Boolean(audio ? audio.ended : player.ended || (duration > 0 && time >= duration)),
      failed: Boolean(player.error),
      running: Boolean(player.playing && !player.loading && !player.error && !player.forcePark),
      forcePark: Boolean(player.forcePark),
      source: player.mediaProps?.src ?? player.source ?? player.sourceName,
      // A part-played mix keeps its arm on the groove for that moment.
      holdAtTime: Boolean(player.engaged) && !(audio ? audio.ended : player.ended),
    };
  }

  function setState(phase, extra = {}) {
    const next = JSON.stringify({ phase, ...extra });
    if (disposed) return;
    if (lastState === next) { onState({ phase, ...extra }); return; }
    lastState = next;
    stage.dataset.armPhase = phase;
    onState({ phase, ...extra });
  }

  function screenPoint(world) {
    projection.copy(world).project(camera);
    return { x: (projection.x + 1) * width / 2, y: (1 - projection.y) * height / 2 };
  }

  function placeHandle(element, world) {
    const p = screenPoint(world);
    element.style.transform = `translate(${p.x}px, ${p.y}px) translate(-50%, -50%)`;
  }

  function resize() {
    if (disposed) return;
    const rect = stage.getBoundingClientRect();
    width = rect.width;
    height = rect.height;
    if (width <= 0 || height <= 0) return;
    frameDeckCamera(camera, width / height, viewAngle);
    stage.dataset.viewAngle = String(viewAngle);
    renderer.setSize(width, height, false);
    invalidate();
  }

  function setViewAngle(angle) {
    if (disposed) return viewAngle;
    const next = clampViewAngle(angle);
    if (next === viewAngle) return viewAngle;
    // A gesture's pointer mapping belongs to the camera it started with.
    cancelGesture();
    viewAngle = next;
    frameDeckCamera(camera, height > 0 ? width / height : 1.27, viewAngle);
    stage.dataset.viewAngle = String(viewAngle);
    invalidate();
    return viewAngle;
  }

  function invalidate() {
    if (!disposed && ready && visible && getEnvironment().visible && !document.hidden && width > 0 && height > 0 && !frame)
      frame = requestAnimationFrame(draw);
  }

  function draw(milliseconds) {
    frame = 0;
    if (disposed || !ready || !visible || !getEnvironment().visible || document.hidden || !width || !height) return;
    const delta = lastFrame ? Math.min((milliseconds - lastFrame) / 1000, 0.05) : 0;
    lastFrame = milliseconds;
    const state = playerState();
    if (gesture && (gesture.source !== state.source || gesture.duration !== state.duration)) cancelGesture();
    const pose = motion.update({
      now: milliseconds / 1000,
      playing: state.playing,
      progress: state.progress,
      ended: state.ended,
      failed: state.failed,
      source: state.source,
      reducedMotion: reducedMotion(),
      dragYaw: gesture?.kind === "arm" ? gesture.yaw : null,
      holdAtTime: state.holdAtTime,
      forcePark: state.forcePark,
    });
    yaw.rotation.y = pose.yaw;
    lift.rotation.x = pose.lift;
    if (state.running && !reducedMotion() && gesture?.kind !== "record")
      rotation = (rotation - delta * TAU * (33 + 1 / 3) / 60) % TAU;
    platter.rotation.y = rotation;
    root.updateMatrixWorld(true);
    lift.localToWorld(headWorld.copy(headLocal));
    placeHandle(armHandle, headWorld);
    placeHandle(startButton, originalButtonPosition);
    const centre = new THREE.Vector3(...rig.platter.pivot);
    placeHandle(recordHandle, centre);
    const edgeX = screenPoint(new THREE.Vector3(centre.x + 0.31, centre.y, centre.z));
    const edgeZ = screenPoint(new THREE.Vector3(centre.x, centre.y, centre.z + 0.31));
    const middle = screenPoint(centre);
    recordHandle.style.width = `${Math.abs(edgeX.x - middle.x) * 2}px`;
    recordHandle.style.height = `${Math.abs(edgeZ.y - middle.y) * 2}px`;
    renderer.render(scene, camera);
    if (stage.dataset.modelReady !== "true") stage.dataset.modelReady = "true";
    const phase = gesture?.kind === "arm" ? "held" : pose.phase;
    setState(phase, { placed: pose.placed, dragging: gesture?.kind ?? null, reducedMotion: reducedMotion() });
    // Expose only visual measurements; useful to integration checks and support.
    if (milliseconds - debugFrame > 80) {
      debugFrame = milliseconds;
      stage.dataset.armYaw = pose.yaw.toFixed(6);
      stage.dataset.armLift = pose.lift.toFixed(6);
      stage.dataset.platterAngle = rotation.toFixed(6);
      stage.dataset.triangles = String(renderer.info.render.triangles);
      stage.dataset.drawCalls = String(renderer.info.render.calls);
    }
    if (pose.moving || gesture || (state.running && !reducedMotion())) invalidate();
  }

  function rayAt(event) {
    const rect = stage.getBoundingClientRect();
    if (!rect.width || !rect.height) return false;
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, 1 - (event.clientY - rect.top) / rect.height * 2);
    raycaster.setFromCamera(pointer, camera);
    return true;
  }

  function pointOnPlane(event, y) {
    if (!rayAt(event)) return null;
    plane.constant = -y;
    return raycaster.ray.intersectPlane(plane, hitPoint);
  }

  function cancelGesture() {
    const previous = gesture;
    gesture = null;
    if (previous && stage.hasPointerCapture(previous.id)) stage.releasePointerCapture(previous.id);
    stage.classList.remove("is-gesturing", "is-arm-gesturing");
    invalidate();
  }

  function down(event) {
    if (!getEnvironment().visible || !ready || disposed || gesture || event.button !== 0 || event.isPrimary === false) return;
    if (event.target.closest("button")) return;
    const state = playerState();
    if (!state.duration) return;
    root.updateMatrixWorld(true);
    lift.localToWorld(headWorld.copy(headLocal));
    if (!rayAt(event)) return;
    const armHit = armHandle.contains(event.target) || raycaster.intersectObjects(armMeshes, false).length > 0;
    const pivot = rig.tonearm.pivot;
    if (armHit) {
      const point = pointOnPlane(event, headWorld.y);
      if (!point) return;
      gesture = {
        kind: "arm", id: event.pointerId, source: state.source, duration: state.duration,
        startX: event.clientX, startY: event.clientY, planeY: headWorld.y,
        startPointerAngle: Math.atan2(point.x - pivot[0], point.z - pivot[2]),
        startYaw: yaw.rotation.y, yaw: yaw.rotation.y, moved: false,
        enteredRecord: yaw.rotation.y <= rig.tonearm.outerAngle,
      };
      armHandle.focus({ preventScroll: true });
      stage.classList.add("is-arm-gesturing");
    } else {
      const point = pointOnPlane(event, rig.platter.pivot[1]);
      if (!point) return;
      const dx = point.x - rig.platter.pivot[0];
      const dz = point.z - rig.platter.pivot[2];
      if (Math.hypot(dx, dz) > rig.platter.radius || Math.hypot(dx, dz) < 0.055) return;
      gesture = {
        kind: "record", id: event.pointerId, source: state.source, duration: state.duration,
        startX: event.clientX, startY: event.clientY, moved: false,
        angle: Math.atan2(dx, dz), position: state.time,
      };
      recordHandle.focus({ preventScroll: true });
    }
    event.preventDefault();
    event.stopPropagation();
    stage.setPointerCapture(event.pointerId);
    stage.classList.add("is-gesturing");
    invalidate();
  }

  function move(event) {
    const active = gesture;
    if (!active || active.id !== event.pointerId) return;
    const state = playerState();
    if (active.source !== state.source || active.duration !== state.duration) return cancelGesture();
    event.preventDefault();
    if (!active.moved && Math.hypot(event.clientX - active.startX, event.clientY - active.startY) < 3) return;
    active.moved = true;
    if (active.kind === "arm") {
      const point = pointOnPlane(event, active.planeY);
      const pivot = rig.tonearm.pivot;
      if (!point || Math.hypot(point.x - pivot[0], point.z - pivot[2]) < 0.055) return;
      const angle = Math.atan2(point.x - pivot[0], point.z - pivot[2]);
      active.yaw = Math.max(rig.tonearm.innerAngle, Math.min(rig.tonearm.restAngle,
        active.startYaw + wrapAngle(angle - active.startPointerAngle)));
      if (active.yaw <= rig.tonearm.outerAngle || active.enteredRecord) {
        active.enteredRecord = true;
        state.player.seek(yawToProgress(active.yaw, rig) * state.duration);
      }
    } else {
      const point = pointOnPlane(event, rig.platter.pivot[1]);
      if (!point) return;
      const dx = point.x - rig.platter.pivot[0];
      const dz = point.z - rig.platter.pivot[2];
      const angle = Math.atan2(dx, dz);
      if (Math.hypot(dx, dz) < 0.055) { active.angle = angle; return; }
      const delta = wrapAngle(angle - active.angle);
      active.angle = angle;
      rotation += delta;
      // A clockwise turn advances two minutes, independent of view angle.
      active.position = clampTime(active.position - delta / TAU * 120, state.duration);
      state.player.seek(active.position);
    }
    invalidate();
  }

  function up(event) {
    if (gesture?.id === event.pointerId) { onGestureEnd(); cancelGesture(); }
  }

  function contextLost(event) {
    event.preventDefault();
    dispose();
    onError(new Error("3D graphics were interrupted. The standard deck remains available."));
  }

  function visibilityChanged() {
    if (document.hidden) { cancelGesture(); if (frame) cancelAnimationFrame(frame); frame = 0; }
    else { lastFrame = 0; invalidate(); }
  }

  function motionPreferenceChanged() { invalidate(); }
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(stage);
  const intersectionObserver = new IntersectionObserver((entries) => {
    visible = entries[0]?.isIntersecting ?? true;
    if (visible) { lastFrame = 0; resize(); }
    else { cancelGesture(); if (frame) cancelAnimationFrame(frame); frame = 0; }
  }, { threshold: 0 });
  intersectionObserver.observe(stage);
  stage.addEventListener("pointerdown", down);
  stage.addEventListener("pointermove", move);
  stage.addEventListener("pointerup", up);
  stage.addEventListener("pointercancel", up);
  stage.addEventListener("lostpointercapture", up);
  canvas.addEventListener("webglcontextlost", contextLost);
  document.addEventListener("visibilitychange", visibilityChanged);
  window.addEventListener("blur", cancelGesture);
  reduced.addEventListener("change", motionPreferenceChanged);
  signal.addEventListener("abort", abortListener, { once: true });

  function dispose() {
    if (disposed) return;
    cancelGesture();
    vinyl?.cancel();
    disposed = true;
    if (frame) cancelAnimationFrame(frame);
    frame = 0;
    resizeObserver.disconnect();
    intersectionObserver.disconnect();
    stage.removeEventListener("pointerdown", down);
    stage.removeEventListener("pointermove", move);
    stage.removeEventListener("pointerup", up);
    stage.removeEventListener("pointercancel", up);
    stage.removeEventListener("lostpointercapture", up);
    canvas.removeEventListener("webglcontextlost", contextLost);
    document.removeEventListener("visibilitychange", visibilityChanged);
    window.removeEventListener("blur", cancelGesture);
    reduced.removeEventListener("change", motionPreferenceChanged);
    signal.removeEventListener("abort", abortListener);
    releaseModel(root);
    renderer.dispose();
    renderer.forceContextLoss();
    scene.clear();
  }

  try {
    rig = configuration;
    const bytes = modelBytes;
    const loader = new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
    const model = await loader.parseAsync(bytes, "");
    root = model.scene;
    if (disposed || signal.aborted) { releaseModel(root); root = null; throw new DOMException("Aborted", "AbortError"); }
    platter = root.getObjectByName(rig.nodes.platter);
    yaw = root.getObjectByName(rig.nodes.yaw);
    lift = root.getObjectByName(rig.nodes.lift);
    if (!platter || !yaw || !lift) throw new Error("The deck is missing its animation pivots.");
    let atlasLoaded = false;
    root.traverse((object) => { if (object.isMesh && object.material?.map) atlasLoaded = true; });
    if (!atlasLoaded) throw new Error("The approved deck texture could not be decoded.");
    root.traverse((object) => {
      if (object.isMesh && object.material?.map)
        object.material.map.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
    });
    lift.traverse((object) => { if (object.isMesh) armMeshes.push(object); });
    headLocal.fromArray(rig.tonearm.headshellLocal);
    motion = createArmMotion(rig);
    scene.add(root);
    const roundness = roundPlatterRim(platter);
    if (roundness) stage.dataset.platterRimSpread = `${roundness.before.toFixed(4)}->${roundness.after.toFixed(4)}`;
    vinyl = createVinylRecord(root, platter, rig, Math.min(4, renderer.capabilities.getMaxAnisotropy()), invalidate);
    if (pendingArtwork) vinyl.set(pendingArtwork);
    ready = true;
    stage.dataset.modelVariant = "mobile";
    resize();
    invalidate();
    return {
      invalidate,
      cancelGesture,
      suspend() { cancelGesture(); if (frame) cancelAnimationFrame(frame); frame = 0; lastFrame = 0; },
      setViewAngle,
      /** The mix's cover art and real chapter starts (0–1) for the record on the platter. */
      setRecord(artwork: RecordArtwork) {
        pendingArtwork = artwork;
        vinyl?.set(artwork);
      },
      dispose,
      /** Geometry-only helpers for integration tooling; they do not seek/play. */
      projectGroove(progress) {
        const angle = progressToYaw(progress, rig);
        const point = new THREE.Vector3(...rig.tonearm.headshellLocal);
        point.applyAxisAngle(new THREE.Vector3(1, 0, 0), rig.tonearm.raisedLift);
        point.applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        point.add(new THREE.Vector3(...rig.tonearm.pivot));
        return screenPoint(point);
      },
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
