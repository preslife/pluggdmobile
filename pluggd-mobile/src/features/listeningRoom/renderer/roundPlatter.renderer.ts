// @ts-nocheck -- Compiled separately for the local WebView visual renderer.
import * as THREE from "three";

/**
 * The supplied platter's outer edge is not a true circle around its spin axis
 * (measured on the editable GLB: 0.3526–0.3642 source units, slightly oval with
 * a squarish outline), so it visibly breathes in and out as it turns. Its inner
 * parts are round. At load we move only the vertices in the outer band radially
 * so the edge becomes a circle centred on PlatterPivot. Everything inside
 * RIM_FROM, the texture coordinates and the model file itself are untouched.
 */
const RIM_FROM = 0.335;
const BINS = 180;

type Vertex = { mesh: THREE.Mesh; index: number; x: number; y: number; z: number };

const binOf = (x: number, z: number) => Math.floor(((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * BINS) % BINS;

function outerProfile(vertices: Vertex[]) {
  const outer = new Array<number>(BINS).fill(0);
  for (const vertex of vertices) {
    const bin = binOf(vertex.x, vertex.z);
    outer[bin] = Math.max(outer[bin], Math.hypot(vertex.x, vertex.z));
  }
  // Fill any empty bins from their neighbours, then smooth lightly.
  for (let pass = 0; pass < BINS && outer.some((value) => value === 0); pass += 1) {
    for (let index = 0; index < BINS; index += 1) {
      if (outer[index]) continue;
      outer[index] = Math.max(outer[(index + BINS - 1) % BINS], outer[(index + 1) % BINS]);
    }
  }
  return outer.map((_, index) => (outer[(index + BINS - 1) % BINS] + outer[index] * 2 + outer[(index + 1) % BINS]) / 4);
}

/** Returns the outer-edge spread (max − min radius) before and after, for verification. */
export function roundPlatterRim(pivot: THREE.Object3D, platterName = "Platter") {
  const node = pivot.getObjectByName(platterName);
  if (!node) return null;
  pivot.updateMatrixWorld(true);
  const pivotInverse = pivot.matrixWorld.clone().invert();
  const meshes: THREE.Mesh[] = [];
  node.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) meshes.push(object as THREE.Mesh);
  });
  const vertices: Vertex[] = [];
  const point = new THREE.Vector3();
  for (const mesh of meshes) {
    const toPivot = pivotInverse.clone().multiply(mesh.matrixWorld);
    const position = mesh.geometry.getAttribute("position");
    for (let index = 0; index < position.count; index += 1) {
      point.fromBufferAttribute(position, index).applyMatrix4(toPivot);
      vertices.push({ mesh, index, x: point.x, y: point.y, z: point.z });
    }
  }
  if (!vertices.length) return null;
  const before = outerProfile(vertices);
  const sorted = [...before].sort((a, b) => a - b);
  const target = sorted[Math.floor(sorted.length / 2)];
  if (!(target > RIM_FROM)) return null;

  const outerAt = (x: number, z: number) => {
    const exact = ((Math.atan2(z, x) + Math.PI) / (Math.PI * 2)) * BINS - 0.5;
    const low = Math.floor(exact);
    const weight = exact - low;
    return before[(low + BINS) % BINS] * (1 - weight) + before[(low + 1) % BINS] * weight;
  };

  // Rewrite each mesh's positions as plain floats (the runtime model stores them quantized).
  for (const mesh of meshes) {
    const fromPivot = pivotInverse.clone().multiply(mesh.matrixWorld).invert();
    const source = mesh.geometry.getAttribute("position");
    const positions = new Float32Array(source.count * 3);
    for (let index = 0; index < source.count; index += 1) {
      positions[index * 3] = source.getX(index);
      positions[index * 3 + 1] = source.getY(index);
      positions[index * 3 + 2] = source.getZ(index);
    }
    for (const vertex of vertices) {
      if (vertex.mesh !== mesh) continue;
      const radius = Math.hypot(vertex.x, vertex.z);
      if (radius <= RIM_FROM) continue;
      const outer = Math.max(RIM_FROM + 1e-6, outerAt(vertex.x, vertex.z));
      const rounded = RIM_FROM + (radius - RIM_FROM) * ((target - RIM_FROM) / (outer - RIM_FROM));
      point.set((vertex.x * rounded) / radius, vertex.y, (vertex.z * rounded) / radius).applyMatrix4(fromPivot);
      positions[vertex.index * 3] = point.x;
      positions[vertex.index * 3 + 1] = point.y;
      positions[vertex.index * 3 + 2] = point.z;
    }
    mesh.geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    mesh.geometry.computeBoundingBox();
    mesh.geometry.computeBoundingSphere();
  }

  const after = vertices.map((vertex) => {
    const radius = Math.hypot(vertex.x, vertex.z);
    if (radius <= RIM_FROM) return vertex;
    const outer = Math.max(RIM_FROM + 1e-6, outerAt(vertex.x, vertex.z));
    const rounded = RIM_FROM + (radius - RIM_FROM) * ((target - RIM_FROM) / (outer - RIM_FROM));
    return { ...vertex, x: (vertex.x * rounded) / radius, z: (vertex.z * rounded) / radius };
  });
  const spread = (profile: number[]) => Math.max(...profile) - Math.min(...profile);
  return { before: spread(before), after: spread(outerProfile(after)), radius: target };
}
