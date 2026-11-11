// @ts-nocheck -- Compiled separately for the local WebView visual renderer.
/** Pure deck choreography. Audio time and playback state always belong to the player. */

export function clamp(value, min = 0, max = 1) {
  if (!Number.isFinite(value)) return min;
  return Math.min(max, Math.max(min, value));
}

/** Normalize a signed angle to [-PI, PI), including pointer crossings at the seam. */
export function wrapAngle(angle) {
  if (!Number.isFinite(angle)) return 0;
  const turn = Math.PI * 2;
  return ((angle + Math.PI) % turn + turn) % turn - Math.PI;
}

const calibration = (rig) => rig.tonearm ?? rig;

export function progressToYaw(progress, rig) {
  const { outerAngle, innerAngle } = calibration(rig);
  return outerAngle + (innerAngle - outerAngle) * clamp(progress);
}

export function yawToProgress(yaw, rig) {
  const { outerAngle, innerAngle } = calibration(rig);
  const sweep = innerAngle - outerAngle;
  return sweep === 0 ? 0 : clamp((yaw - outerAngle) / sweep);
}

// Let the horizontal cue finish before a clearly visible, gentle touchdown.
export const ARM_MOTION_SECONDS = Object.freeze({ lift: 0.20, travel: 0.70, lower: 0.60 });
const POSE_EPSILON = 1e-7;
const SEEK_JUMP_RADIANS = 0.035;
const ease = (value) => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};
const mix = (from, to, amount) => from + (to - from) * amount;

/**
 * rig is the shipped rig-config.json (or its tonearm section).
 * update({ now, playing, progress, ended, failed, source, reducedMotion, dragYaw })
 * takes time in seconds. Arm placement is independent of the platter motor:
 * pausing keeps a placed arm on the record; finishing or changing source parks it.
 * dragYaw is null when no gesture owns the arm. Holding a gesture keeps it raised.
 * A paused seek places the arm at the selected groove without starting audio.
 *
 * pose is a stable object; phase is also exposed through a getter on the controller.
 * moving stays true during transitions and gestures so renderers can request frames.
 */
export type ArmMotionInput = {
  now?: number; playing?: boolean; progress?: number; ended?: boolean; failed?: boolean;
  source?: unknown; reducedMotion?: boolean; dragYaw?: number | null;
  /** The mix has a remembered position (paused part-way): keep the arm on that groove, not the rest. */
  holdAtTime?: boolean;
  /** Explicit native Stop, distinct from a paused mix at the outer groove. */
  forcePark?: boolean;
};

export function createArmMotion(rig) {
  const arm = calibration(rig);
  const pose = { yaw: arm.restAngle, lift: arm.restLift };
  const minYaw = Math.min(arm.restAngle, arm.outerAngle, arm.innerAngle);
  const maxYaw = Math.max(arm.restAngle, arm.outerAngle, arm.innerAngle);
  let phase = 'parked';
  let transition = null;
  let lastNow = null;
  let lastEngaged = false;
  let lastTargetYaw = null;
  let wasDragging = false;
  let placed = false;
  let currentPlaying = false;
  let lastSource;
  let initialized = false;

  const settledPhase = (engaged) => engaged ? (currentPlaying ? 'tracking' : 'paused') : 'parked';

  function result() {
    return { ...pose, phase, placed, moving: transition !== null || phase === 'dragging' };
  }

  function sampleTransition(now) {
    if (!transition) return;
    const { startedAt, fromYaw, fromLift, toYaw, toLift, engaged, liftSeconds, travelSeconds } = transition;
    const elapsed = Math.max(0, now - startedAt);
    const travelEnd = liftSeconds + travelSeconds;
    if (elapsed < liftSeconds) {
      pose.yaw = fromYaw;
      pose.lift = mix(fromLift, arm.raisedLift, ease(elapsed / liftSeconds));
      phase = 'lifting';
    } else if (elapsed < travelEnd) {
      pose.yaw = mix(fromYaw, toYaw, ease((elapsed - liftSeconds) / travelSeconds));
      pose.lift = arm.raisedLift;
      phase = 'travelling';
    } else if (elapsed < travelEnd + ARM_MOTION_SECONDS.lower) {
      pose.yaw = toYaw;
      pose.lift = mix(arm.raisedLift, toLift, ease((elapsed - travelEnd) / ARM_MOTION_SECONDS.lower));
      phase = 'lowering';
    } else {
      pose.yaw = toYaw;
      pose.lift = toLift;
      phase = settledPhase(engaged);
      transition = null;
    }
  }

  function beginTransition(now, engaged, targetYaw) {
    const toYaw = engaged ? targetYaw : arm.restAngle;
    const toLift = engaged ? arm.loweredLift : arm.restLift;
    if (Math.abs(pose.yaw - toYaw) <= POSE_EPSILON && Math.abs(pose.lift - toLift) <= POSE_EPSILON) {
      transition = null;
      pose.yaw = toYaw;
      pose.lift = toLift;
      phase = settledPhase(engaged);
      return;
    }
    transition = {
      startedAt: now,
      fromYaw: pose.yaw,
      fromLift: pose.lift,
      toYaw,
      toLift,
      engaged,
      // A released arm already over its groove should descend immediately.
      // Retargeting an arm that is raised likewise needs no second lift.
      liftSeconds: Math.abs(pose.lift - arm.raisedLift) <= POSE_EPSILON ? 0 : ARM_MOTION_SECONDS.lift,
      travelSeconds: Math.abs(pose.yaw - toYaw) <= POSE_EPSILON ? 0 : ARM_MOTION_SECONDS.travel,
    };
    sampleTransition(now);
  }

  return {
    pose,
    get phase() { return phase; },
    get placed() { return placed; },
    update({ now = 0, playing = false, progress = 0, ended = false, failed = false, source,
      reducedMotion = false, dragYaw = null, holdAtTime = false, forcePark = false }: ArmMotionInput = {}) {
      // A suspended tab can skip frames. Clamp a regressing clock instead of reversing a lift.
      const timestamp = Number.isFinite(now) ? now : (lastNow ?? 0);
      now = lastNow === null ? timestamp : Math.max(lastNow, timestamp);
      currentPlaying = Boolean(playing && !failed && !forcePark);
      const targetYaw = progressToYaw(progress, rig);
      const dragging = Number.isFinite(dragYaw);
      const sourceChanged = initialized && source !== lastSource;
      const positionChanged = lastTargetYaw !== null && Math.abs(targetYaw - lastTargetYaw) > 1e-7;
      const dragOnRecord = dragging && dragYaw >= Math.min(arm.outerAngle, arm.innerAngle)
        && dragYaw <= Math.max(arm.outerAngle, arm.innerAngle);
      if (sourceChanged) placed = false;
      if (ended || failed || forcePark) placed = false;
      else if (currentPlaying || dragOnRecord || (positionChanged && !sourceChanged) || holdAtTime) placed = true;
      const active = placed;
      const placementChanged = active !== lastEngaged;
      const released = wasDragging && !dragging;
      const seekJump = active && !sourceChanged && lastTargetYaw !== null && Math.abs(targetYaw - lastTargetYaw) > SEEK_JUMP_RADIANS;

      // Track small playback advances during a cue. A new seek is sampled at the old
      // target first, then retargeted from the currently rendered pose without a jump.
      if (transition?.engaged && active && !seekJump) transition.toYaw = targetYaw;
      sampleTransition(now);

      if (dragging) {
        transition = null;
        pose.yaw = clamp(dragYaw, minYaw, maxYaw);
        pose.lift = arm.raisedLift;
        phase = 'dragging';
      } else if (reducedMotion) {
        transition = null;
        pose.yaw = active ? targetYaw : arm.restAngle;
        pose.lift = active ? arm.loweredLift : arm.restLift;
        phase = settledPhase(active);
      } else if (!initialized && holdAtTime) {
        // The deck appears with the arm already where the mix is: no cue sweep on first sight.
        transition = null;
        pose.yaw = active ? targetYaw : arm.restAngle;
        pose.lift = active ? arm.loweredLift : arm.restLift;
        phase = settledPhase(active);
      } else if (placementChanged || released || seekJump || sourceChanged) {
        beginTransition(now, active, targetYaw);
      } else if (!transition) {
        pose.yaw = active ? targetYaw : arm.restAngle;
        pose.lift = active ? arm.loweredLift : arm.restLift;
        phase = settledPhase(active);
      }

      lastNow = now;
      lastEngaged = active;
      lastTargetYaw = targetYaw;
      wasDragging = dragging;
      lastSource = source;
      initialized = true;
      return result();
    },
  };
}
