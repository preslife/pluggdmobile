// @ts-nocheck -- Compiled separately for the local WebView visual renderer.
import * as THREE from "three";
import { progressToYaw } from "./deckMotion.renderer";

/**
 * The record that sits on the supplied deck: a black vinyl with fine grooves,
 * visible gaps at the mix's real track changes and the mix's cover art on the
 * centre label. It is parented to PlatterPivot so it spins with the platter,
 * and its playing surface sits exactly at the calibrated stylus contact height,
 * so the arm choreography and contact calibration are unchanged.
 */

// Measured on the supplied model: LogoMat reaches 0.308 from the spindle and the
// platter rim starts at 0.298, so the record stops just inside the rim.
const RECORD_RADIUS = 0.297;
const LABEL_RADIUS = 0.096;
const RECORD_THICKNESS = 0.0034;
const LABEL_LIFT = 0.00015;
const TEXTURE_SIZE = 1024;

type Rig = {
  platter: { pivot: number[] };
  nodes: Record<string, string>;
  tonearm: {
    pivot: number[];
    stylusLocal: number[];
    loweredLift: number;
    outerAngle: number;
    innerAngle: number;
    contact?: { recordNode?: string; recordSurfaceY?: number };
  };
};

export type RecordArtwork = { cover: string | null; chapters: number[] };

/** Distance from the spindle to the stylus tip when lowered at a given mix progress. */
function grooveRadius(progress: number, rig: Rig) {
  const [x, y, z] = rig.tonearm.stylusLocal;
  const [px, , pz] = rig.tonearm.pivot;
  const lift = rig.tonearm.loweredLift;
  const yaw = progressToYaw(progress, rig);
  const liftedZ = y * Math.sin(lift) + z * Math.cos(lift);
  const wx = px + x * Math.cos(yaw) + liftedZ * Math.sin(yaw);
  const wz = pz - x * Math.sin(yaw) + liftedZ * Math.cos(yaw);
  return Math.hypot(wx - rig.platter.pivot[0], wz - rig.platter.pivot[2]);
}

function drawGrooves(canvas: HTMLCanvasElement, rig: Rig, chapters: number[]) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const size = canvas.width;
  const centre = size / 2;
  const scale = centre / RECORD_RADIUS;
  context.clearRect(0, 0, size, size);
  context.fillStyle = "#0b0b0c";
  context.beginPath();
  context.arc(centre, centre, centre, 0, Math.PI * 2);
  context.fill();

  const outer = grooveRadius(0, rig) * scale;
  const inner = grooveRadius(1, rig) * scale;
  // Fine concentric grooves across the playable band.
  context.lineWidth = 1;
  for (let radius = inner, index = 0; radius <= outer; radius += 1.6, index += 1) {
    context.strokeStyle = index % 2 ? "rgba(255,255,255,0.075)" : "rgba(0,0,0,0.6)";
    context.beginPath();
    context.arc(centre, centre, radius, 0, Math.PI * 2);
    context.stroke();
  }
  // Smooth, slightly glossier bands: the lead-in, the run-out and each real track change.
  const band = (radius: number, width: number, alpha: number) => {
    context.strokeStyle = `rgba(150,150,155,${alpha})`;
    context.lineWidth = width;
    context.beginPath();
    context.arc(centre, centre, radius, 0, Math.PI * 2);
    context.stroke();
  };
  band((outer + centre) / 2, Math.max(1, centre - outer), 0.06);
  band((inner + LABEL_RADIUS * scale) / 2, Math.max(1, inner - LABEL_RADIUS * scale), 0.05);
  for (const progress of chapters) {
    if (progress <= 0.005 || progress >= 0.995) continue;
    band(grooveRadius(progress, rig) * scale, 4, 0.24);
  }
  // A soft sheen across the record, as studio lights catch real vinyl.
  const sheen = context.createLinearGradient(0, 0, size, size);
  sheen.addColorStop(0.35, "rgba(255,255,255,0)");
  sheen.addColorStop(0.5, "rgba(255,255,255,0.08)");
  sheen.addColorStop(0.65, "rgba(255,255,255,0)");
  context.fillStyle = sheen;
  context.beginPath();
  context.arc(centre, centre, outer, 0, Math.PI * 2);
  context.arc(centre, centre, inner, 0, Math.PI * 2, true);
  context.fill();
}

function drawLabel(canvas: HTMLCanvasElement, image: HTMLImageElement | null) {
  const context = canvas.getContext("2d");
  if (!context) return;
  const size = canvas.width;
  const centre = size / 2;
  context.clearRect(0, 0, size, size);
  context.save();
  context.beginPath();
  context.arc(centre, centre, centre, 0, Math.PI * 2);
  context.clip();
  if (image) {
    // Cover-fit the artwork into the round label.
    const ratio = Math.max(size / image.naturalWidth, size / image.naturalHeight);
    const width = image.naturalWidth * ratio;
    const height = image.naturalHeight * ratio;
    context.drawImage(image, centre - width / 2, centre - height / 2, width, height);
  } else {
    context.fillStyle = "#d7e769";
    context.fillRect(0, 0, size, size);
    context.fillStyle = "#15180d";
    context.font = `700 ${Math.round(size * 0.13)}px Satoshi, Arial, sans-serif`;
    context.textAlign = "center";
    context.textBaseline = "middle";
    context.fillText("PLUGGD", centre, centre - size * 0.17);
  }
  context.restore();
  // A thin printed rim and the spindle hole, as on a pressed label.
  context.strokeStyle = "rgba(0,0,0,0.35)";
  context.lineWidth = size * 0.012;
  context.beginPath();
  context.arc(centre, centre, centre - context.lineWidth / 2, 0, Math.PI * 2);
  context.stroke();
  context.fillStyle = "#050505";
  context.beginPath();
  context.arc(centre, centre, size * 0.045, 0, Math.PI * 2);
  context.fill();
}

function loadImage(url: string, signal: { cancelled: boolean }) {
  return new Promise<HTMLImageElement | null>((resolve) => {
    const image = new Image();
    // Required to draw remote artwork into a WebGL texture.
    image.crossOrigin = "anonymous";
    image.decoding = "async";
    image.onload = () => resolve(signal.cancelled ? null : image);
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export function createVinylRecord(root: THREE.Object3D, platter: THREE.Object3D, rig: Rig, anisotropy: number, onChange: () => void) {
  const surfaceY = rig.tonearm.contact?.recordSurfaceY ?? 0.23238;
  // The record covers the logo mat; hiding the mat keeps its raised edges from showing through.
  const mat = root.getObjectByName(rig.tonearm.contact?.recordNode ?? "LogoMat");
  if (mat) mat.visible = false;

  const grooveCanvas = document.createElement("canvas");
  grooveCanvas.width = grooveCanvas.height = TEXTURE_SIZE;
  drawGrooves(grooveCanvas, rig, []);
  const grooveTexture = new THREE.CanvasTexture(grooveCanvas);
  grooveTexture.colorSpace = THREE.SRGBColorSpace;
  grooveTexture.anisotropy = anisotropy;

  const labelCanvas = document.createElement("canvas");
  labelCanvas.width = labelCanvas.height = 512;
  drawLabel(labelCanvas, null);
  const labelTexture = new THREE.CanvasTexture(labelCanvas);
  labelTexture.colorSpace = THREE.SRGBColorSpace;
  labelTexture.anisotropy = anisotropy;

  const edge = new THREE.MeshStandardMaterial({ color: 0x0a0a0b, roughness: 0.5, metalness: 0.05 });
  const face = new THREE.MeshStandardMaterial({ map: grooveTexture, roughness: 0.36, metalness: 0.08 });
  const disc = new THREE.Mesh(new THREE.CylinderGeometry(RECORD_RADIUS, RECORD_RADIUS, RECORD_THICKNESS, 160, 1, false), [edge, face, edge]);
  disc.name = "VinylRecord";
  const label = new THREE.Mesh(
    new THREE.CircleGeometry(LABEL_RADIUS, 96),
    new THREE.MeshStandardMaterial({ map: labelTexture, roughness: 0.62, metalness: 0 }),
  );
  label.name = "VinylLabel";
  label.rotation.x = -Math.PI / 2;
  label.position.y = RECORD_THICKNESS / 2 + LABEL_LIFT;

  const record = new THREE.Group();
  record.name = "VinylRecordAssembly";
  record.add(disc, label);
  const [cx, , cz] = rig.platter.pivot;
  record.position.set(cx, surfaceY - RECORD_THICKNESS / 2, cz);
  root.add(record);
  root.updateMatrixWorld(true);
  // Keep the world placement while handing ownership to the spinning platter.
  platter.attach(record);

  let request = { cancelled: false };
  let chaptersKey = "";
  let coverKey: string | null | undefined;

  return {
    set({ cover, chapters }: RecordArtwork) {
      const nextChapters = chapters.map((value) => value.toFixed(4)).join(",");
      if (nextChapters !== chaptersKey) {
        chaptersKey = nextChapters;
        drawGrooves(grooveCanvas, rig, chapters);
        grooveTexture.needsUpdate = true;
        onChange();
      }
      if (cover === coverKey) return;
      coverKey = cover;
      request.cancelled = true;
      const current = { cancelled: false };
      request = current;
      drawLabel(labelCanvas, null);
      labelTexture.needsUpdate = true;
      onChange();
      if (!cover) return;
      void loadImage(cover, current).then((image) => {
        if (current.cancelled || !image) return;
        try {
          drawLabel(labelCanvas, image);
          labelTexture.needsUpdate = true;
        } catch {
          // Artwork without cross-origin access cannot be drawn; the PLUGGD label stays.
          drawLabel(labelCanvas, null);
          labelTexture.needsUpdate = true;
        }
        onChange();
      });
    },
    cancel() {
      request.cancelled = true;
    },
  };
}
