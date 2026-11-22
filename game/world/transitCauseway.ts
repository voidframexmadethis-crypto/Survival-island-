import * as THREE from 'three';
import {
  CAUSEWAY_GATEWAY_POINT,
  CAUSEWAY_HALF_WIDTH,
  CAUSEWAY_ISLAND_POINT,
  CAUSEWAY_LENGTH,
  CAUSEWAY_SIGNS,
  CAUSEWAY_WIDTH,
  sampleCausewayFrame,
} from '../systems/islandMainlandTransit';
import { getTerrainHeight } from './terrain';

export interface TransitCausewayHandles {
  group: THREE.Group;
  gatewayPos: THREE.Vector3;
  islandPos: THREE.Vector3;
  length: number;
}

function createSignTexture(title: string, subtitle: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#10202a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = '#fbbf24';
  ctx.lineWidth = 12;
  ctx.strokeRect(12, 12, canvas.width - 24, canvas.height - 24);
  ctx.fillStyle = '#fef3c7';
  ctx.textAlign = 'center';
  ctx.font = '900 92px sans-serif';
  ctx.fillText(title, canvas.width * 0.5, 154);
  ctx.fillStyle = '#7dd3fc';
  ctx.font = '700 42px sans-serif';
  ctx.fillText(subtitle, canvas.width * 0.5, 236);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Elevated coastal causeway from the Crescent City terminal to the island
 * ferry pier. The deck is intentionally low and wide: a drivable plate-girder
 * bridge, not a decorative landmark the player can fall through.
 */
export function buildTransitCauseway(): TransitCausewayHandles {
  const group = new THREE.Group();
  group.name = 'island-mainland-causeway';

  const deckMat = new THREE.MeshStandardMaterial({
    color: 0x3c464b,
    roughness: 0.9,
    metalness: 0.06,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x9aa3a8,
    roughness: 0.86,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x5f6b73,
    roughness: 0.48,
    metalness: 0.62,
  });
  const timberMat = new THREE.MeshStandardMaterial({
    color: 0x4b3827,
    roughness: 0.94,
  });
  const laneMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    emissive: 0x64748b,
    emissiveIntensity: 0.08,
    roughness: 0.7,
  });
  const amberMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.2,
    roughness: 0.35,
  });
  const cyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.1,
    roughness: 0.32,
  });

  const box = (
    width: number,
    height: number,
    depth: number,
    x: number,
    y: number,
    z: number,
    yaw: number,
    material: THREE.Material,
  ) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), material);
    mesh.position.set(x, y, z);
    mesh.rotation.y = yaw;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    return mesh;
  };

  const step = 4.2;
  let previous = sampleCausewayFrame(0);
  for (let distance = step; distance <= CAUSEWAY_LENGTH; distance += step) {
    const frame = sampleCausewayFrame(Math.min(CAUSEWAY_LENGTH, distance));
    const dx = frame.x - previous.x;
    const dz = frame.z - previous.z;
    const segmentLength = Math.max(0.1, Math.hypot(dx, dz));
    const yaw = Math.atan2(dx, dz);
    const cx = (frame.x + previous.x) * 0.5;
    const cz = (frame.z + previous.z) * 0.5;
    const cy = (frame.y + previous.y) * 0.5;

    box(
      CAUSEWAY_WIDTH,
      0.34,
      segmentLength + 0.12,
      cx,
      cy - 0.17,
      cz,
      yaw,
      deckMat,
    );
    box(0.42, 0.3, segmentLength + 0.12, cx - Math.cos(yaw) * CAUSEWAY_HALF_WIDTH, cy + 0.02, cz + Math.sin(yaw) * CAUSEWAY_HALF_WIDTH, yaw, concreteMat);
    box(0.42, 0.3, segmentLength + 0.12, cx + Math.cos(yaw) * CAUSEWAY_HALF_WIDTH, cy + 0.02, cz - Math.sin(yaw) * CAUSEWAY_HALF_WIDTH, yaw, concreteMat);

    // Side railings, broken into short runs so the bridge still reads at speed.
    for (const side of [-1, 1]) {
      const sideX = cx + Math.cos(yaw) * side * (CAUSEWAY_HALF_WIDTH - 0.28);
      const sideZ = cz - Math.sin(yaw) * side * (CAUSEWAY_HALF_WIDTH - 0.28);
      box(0.09, 1.0, 0.09, sideX, cy + 0.55, sideZ, yaw, steelMat);
      box(0.08, 0.08, segmentLength + 0.1, sideX, cy + 1.06, sideZ, yaw, steelMat);
    }

    // Dashed centerline.
    const dashIndex = Math.floor(distance / step);
    if (dashIndex % 3 === 0) {
      box(0.14, 0.025, 2.0, cx, cy + 0.012, cz, yaw, laneMat);
    }

    // Trestle supports under the raised deck.
    if (dashIndex % 2 === 0) {
      for (const side of [-1, 1]) {
        const supportX = cx + Math.cos(yaw) * side * 3.7;
        const supportZ = cz - Math.sin(yaw) * side * 3.7;
        const ground = getTerrainHeight(supportX, supportZ);
        const height = Math.max(0.35, cy - ground);
        const piling = new THREE.Mesh(
          new THREE.CylinderGeometry(0.16, 0.21, height, 6),
          timberMat,
        );
        piling.position.set(supportX, ground + height * 0.5, supportZ);
        piling.castShadow = true;
        group.add(piling);
      }
    }

    previous = frame;
  }

  const addSign = (
    distance: number,
    title: string,
    subtitle: string,
    faceBack: boolean,
  ) => {
    const frame = sampleCausewayFrame(distance);
    const yaw = frame.yaw;
    const crossX = Math.cos(yaw);
    const crossZ = -Math.sin(yaw);
    for (const side of [-1, 1]) {
      box(0.16, 4.1, 0.16, frame.x + crossX * side * 5.8, frame.y + 2.05, frame.z + crossZ * side * 5.8, yaw, steelMat);
    }
    box(11.8, 0.18, 0.16, frame.x, frame.y + 4.08, frame.z, yaw, steelMat);
    box(8.9, 2.35, 0.18, frame.x, frame.y + 3.1, frame.z, yaw, amberMat);

    const tex = createSignTexture(title, subtitle);
    const panelMat = tex
      ? new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.62,
          metalness: 0.04,
          emissive: 0x0f172a,
          emissiveIntensity: 0.18,
          side: THREE.DoubleSide,
        })
      : new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          roughness: 0.65,
          side: THREE.DoubleSide,
        });
    const frontAngle = yaw + (faceBack ? Math.PI : 0);
    const panel = new THREE.Mesh(new THREE.PlaneGeometry(8.5, 2.08), panelMat);
    panel.position.set(
      frame.x + Math.sin(frontAngle) * 0.12,
      frame.y + 3.1,
      frame.z + Math.cos(frontAngle) * 0.12,
    );
    panel.rotation.y = frontAngle;
    panel.castShadow = false;
    group.add(panel);

    // A second face keeps the sign readable from both bridge directions.
    const backPanel = panel.clone();
    backPanel.position.set(
      frame.x - Math.sin(frontAngle) * 0.12,
      frame.y + 3.1,
      frame.z - Math.cos(frontAngle) * 0.12,
    );
    backPanel.rotation.y = frontAngle + Math.PI;
    group.add(backPanel);
  };

  addSign(10, CAUSEWAY_SIGNS.island.title, CAUSEWAY_SIGNS.island.subtitle, true);
  addSign(CAUSEWAY_LENGTH - 10, CAUSEWAY_SIGNS.mainland.title, CAUSEWAY_SIGNS.mainland.subtitle, false);
  addSign(CAUSEWAY_LENGTH * 0.52, 'COASTAL CAUSEWAY', 'Island Landing ↔ Crescent City', false);

  // Glowing portal markers at both approaches.
  const addWaypointArch = (distance: number, material: THREE.Material) => {
    const frame = sampleCausewayFrame(distance);
    for (const side of [-1, 1]) {
      const x = frame.x + Math.cos(frame.yaw) * side * 4.7;
      const z = frame.z - Math.sin(frame.yaw) * side * 4.7;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 3.4, 8), steelMat);
      post.position.set(x, frame.y + 1.7, z);
      group.add(post);
      const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), material);
      beacon.position.set(x, frame.y + 3.5, z);
      group.add(beacon);
    }
    const arch = new THREE.Mesh(new THREE.TorusGeometry(4.7, 0.13, 8, 30, Math.PI), material);
    arch.position.set(frame.x, frame.y + 3.4, frame.z);
    arch.rotation.y = frame.yaw;
    group.add(arch);
  };
  addWaypointArch(4, cyanMat);
  addWaypointArch(CAUSEWAY_LENGTH - 4, amberMat);

  // Roadside lamps keep the bridge legible at night with only a few meshes.
  for (let distance = 24; distance < CAUSEWAY_LENGTH - 16; distance += 32) {
    const frame = sampleCausewayFrame(distance);
    const sideX = frame.x + Math.cos(frame.yaw) * 5.45;
    const sideZ = frame.z - Math.sin(frame.yaw) * 5.45;
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 4.4, 7), steelMat);
    pole.position.set(sideX, frame.y + 2.2, sideZ);
    group.add(pole);
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.2, 0.42), cyanMat);
    lamp.position.set(sideX, frame.y + 4.45, sideZ);
    group.add(lamp);
  }

  return {
    group,
    gatewayPos: new THREE.Vector3(
      CAUSEWAY_GATEWAY_POINT.x,
      getTerrainHeight(CAUSEWAY_GATEWAY_POINT.x, CAUSEWAY_GATEWAY_POINT.z) + 0.5,
      CAUSEWAY_GATEWAY_POINT.z,
    ),
    islandPos: new THREE.Vector3(
      CAUSEWAY_ISLAND_POINT.x,
      getTerrainHeight(CAUSEWAY_ISLAND_POINT.x, CAUSEWAY_ISLAND_POINT.z) + 0.5,
      CAUSEWAY_ISLAND_POINT.z,
    ),
    length: CAUSEWAY_LENGTH,
  };
}
