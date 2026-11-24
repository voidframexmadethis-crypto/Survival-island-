import * as THREE from 'three';
import {
  COASTER_RELOCATION_FEET,
  COASTER_RELOCATION_METERS,
  MANSION_MAIDS,
  type MaidDefinition,
} from '../systems/mansionMaids';
import {
  getTerrainHeight,
  HILL_HOUSE_Y,
  PREMADE_MANSION_FLOOR_Y,
  PREMADE_MANSION_POS,
  PREMADE_MANSION_TOP_FLOOR_Y,
  PREMADE_MANSION_UPPER_FLOOR_Y,
} from './terrain';
import type { HouseStationTarget } from './models';

export interface MansionMaidHandle {
  definition: MaidDefinition;
  group: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  startX: number;
  startY: number;
  startZ: number;
}

export interface MansionDoorHandle {
  id: string;
  pivot: THREE.Group;
  /** First point kept for compatibility; use `colliders` for the full leaf. */
  collider: { x: number; z: number; radius: number };
  /** A closed leaf is a line of overlapping colliders, not one point. */
  colliders: { x: number; z: number; radius: number; minY?: number; maxY?: number }[];
  openAngle: number;
  closedAngle: number;
  open: boolean;
}

export interface MansionWardrobeHandle {
  id: string;
  pivot: THREE.Group;
  openAngle: number;
  open: boolean;
}

export interface MansionLightHandle {
  id: string;
  material: THREE.MeshStandardMaterial;
  on: boolean;
}

export interface PremadeMansionHandles {
  group: THREE.Group;
  colliders: { x: number; z: number; radius: number; minY?: number; maxY?: number }[];
  stations: HouseStationTarget[];
  maids: MansionMaidHandle[];
  doors: MansionDoorHandle[];
  wardrobes: MansionWardrobeHandle[];
  lights: MansionLightHandle[];
  coasterDisplay: THREE.Group;
  coasterBase: { x: number; y: number; z: number };
  poolWaterMat: THREE.MeshStandardMaterial;
}

/** One continuous mansion: the original hilltop shell + grand main block +
 * south garden atrium + north recreation wing + west bowling wing. */
export const MANSION_LAYOUT = {
  bedrooms: 16,
  bathrooms: 16,
  kitchens: 2,
  gameRoom: true,
  bowling: true,
  indoorPool: true,
  outdoorPool: true,
} as const;

const FLOOR_GAP = 3.6;
const GROUND_Y = PREMADE_MANSION_FLOOR_Y - HILL_HOUSE_Y;
const SECOND_Y = PREMADE_MANSION_UPPER_FLOOR_Y - HILL_HOUSE_Y;
const THIRD_Y = PREMADE_MANSION_TOP_FLOOR_Y - HILL_HOUSE_Y;
const WALL_H = 10.8;
const HALF_W = 13.2;
const HALF_D = 9.2;

export function createPremadeMansion(): PremadeMansionHandles {
  const group = new THREE.Group();
  group.name = 'unified-luxury-mansion';
  group.userData.mansion = {
    ...MANSION_LAYOUT,
    originalShell: 'hilltop-house',
    wings: ['original-south-wing', 'garden-atrium', 'main-block', 'north-recreation-wing', 'west-bowling-wing'],
  };
  group.position.set(PREMADE_MANSION_POS.x, HILL_HOUSE_Y, PREMADE_MANSION_POS.z);

  const colliders: { x: number; z: number; radius: number; minY?: number; maxY?: number }[] = [];
  const stations: HouseStationTarget[] = [];
  const doors: MansionDoorHandle[] = [];
  const wardrobes: MansionWardrobeHandle[] = [];
  const lights: MansionLightHandle[] = [];
  const worldX = PREMADE_MANSION_POS.x;
  const worldZ = PREMADE_MANSION_POS.z;
  const stationAt = (
    id: string,
    kind: HouseStationTarget['kind'],
    label: string,
    sublabel: string,
    lx: number,
    ly: number,
    lz: number,
    range = 2.6,
    sit?: { x: number; z: number; yaw: number },
  ) => {
    stations.push({
      id,
      kind,
      label,
      sublabel,
      x: worldX + lx,
      y: HILL_HOUSE_Y + ly,
      z: worldZ + lz,
      range,
      ...(sit
        ? {
            sitX: worldX + sit.x,
            sitY: HILL_HOUSE_Y + ly + 0.12,
            sitZ: worldZ + sit.z,
            sitYaw: sit.yaw,
          }
        : {}),
    });
  };

  // ---------- materials ----------
  const detailTexture = (
    paint: (ctx: CanvasRenderingContext2D) => void,
    repeatX = 4,
    repeatY = 4,
  ): THREE.CanvasTexture | null => {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;
    paint(ctx);
    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(repeatX, repeatY);
    texture.colorSpace = THREE.SRGBColorSpace;
    texture.anisotropy = 4;
    return texture;
  };
  const stuccoTexture = detailTexture((ctx) => {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 1800; i++) {
      const shade = 226 + Math.floor(Math.random() * 22);
      ctx.fillStyle = `rgba(${shade},${shade - 3},${shade - 8},${0.08 + Math.random() * 0.12})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1 + Math.random() * 3, 1 + Math.random() * 3);
    }
    ctx.strokeStyle = 'rgba(120,110,96,.12)';
    ctx.lineWidth = 0.7;
    for (let i = 0; i < 9; i++) {
      ctx.beginPath();
      let x = Math.random() * 256;
      let y = Math.random() * 256;
      ctx.moveTo(x, y);
      for (let j = 0; j < 5; j++) {
        x += (Math.random() - 0.5) * 24;
        y += Math.random() * 16;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, 5, 5);
  const stoneTexture = detailTexture((ctx) => {
    ctx.fillStyle = '#d7d1c5';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 32) {
      const offset = (y / 32) % 2 ? 24 : 0;
      for (let x = -48; x < 256; x += 48) {
        const shade = 168 + Math.floor(Math.random() * 34);
        ctx.fillStyle = `rgb(${shade},${shade - 4},${shade - 12})`;
        ctx.fillRect(x + offset + 1, y + 1, 46, 30);
        ctx.strokeStyle = 'rgba(60,56,50,.35)';
        ctx.strokeRect(x + offset + 0.5, y + 0.5, 47, 31);
      }
    }
    for (let i = 0; i < 700; i++) {
      ctx.fillStyle = `rgba(70,64,55,${Math.random() * 0.12})`;
      ctx.fillRect(Math.random() * 256, Math.random() * 256, 1.5, 1.5);
    }
  }, 3, 3);
  const roofTexture = detailTexture((ctx) => {
    ctx.fillStyle = '#8b9294';
    ctx.fillRect(0, 0, 256, 256);
    for (let y = 0; y < 256; y += 18) {
      for (let x = -18; x < 256; x += 30) {
        const offset = (y / 18) % 2 ? 15 : 0;
        const shade = 92 + Math.floor(Math.random() * 34);
        ctx.fillStyle = `rgb(${shade},${shade + 7},${shade + 8})`;
        ctx.fillRect(x + offset + 1, y + 1, 28, 16);
      }
      ctx.fillStyle = 'rgba(22,28,30,.4)';
      ctx.fillRect(0, y + 16, 256, 2);
    }
  }, 6, 8);
  const marbleTexture = detailTexture((ctx) => {
    ctx.fillStyle = '#fffdf8';
    ctx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 10; i++) {
      ctx.strokeStyle = `rgba(${70 + Math.random() * 50},${70 + Math.random() * 40},${70 + Math.random() * 40},${0.05 + Math.random() * 0.12})`;
      ctx.lineWidth = 0.5 + Math.random() * 1.8;
      ctx.beginPath();
      let x = Math.random() * 256;
      let y = Math.random() * 256;
      ctx.moveTo(x, y);
      for (let j = 0; j < 6; j++) {
        x += (Math.random() - 0.5) * 48;
        y += Math.random() * 30;
        ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
  }, 4, 4);
  const woodTexture = detailTexture((ctx) => {
    ctx.fillStyle = '#d9ab7c';
    ctx.fillRect(0, 0, 256, 256);
    for (let x = 0; x < 256; x += 32) {
      const shade = 122 + Math.floor(Math.random() * 42);
      ctx.fillStyle = `rgb(${shade + 38},${shade},${shade - 38})`;
      ctx.fillRect(x + 1, 0, 30, 256);
      ctx.fillStyle = 'rgba(42,24,10,.35)';
      ctx.fillRect(x, 0, 1.5, 256);
      for (let i = 0; i < 12; i++) {
        ctx.strokeStyle = `rgba(55,30,12,${0.05 + Math.random() * 0.08})`;
        ctx.beginPath();
        const sx = x + 3 + Math.random() * 24;
        ctx.moveTo(sx, 0);
        ctx.bezierCurveTo(sx + 4, 80, sx - 5, 160, sx + 2, 256);
        ctx.stroke();
      }
    }
  }, 5, 5);
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x958b7d,
    map: stoneTexture,
    roughness: 0.93,
  });
  const stuccoMat = new THREE.MeshStandardMaterial({
    color: 0xf0e7d8,
    map: stuccoTexture,
    roughness: 0.74,
  });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x3f2d20, roughness: 0.72 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x2f3437, roughness: 0.62, metalness: 0.18 });
  const marbleMat = new THREE.MeshStandardMaterial({
    color: 0xe8e2d9,
    map: marbleTexture,
    roughness: 0.18,
    metalness: 0.08,
  });
  const woodFloorMat = new THREE.MeshStandardMaterial({
    color: 0x9a6330,
    map: woodTexture,
    roughness: 0.62,
  });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0xa8d8f0,
    transparent: true,
    opacity: 0.34,
    roughness: 0.06,
    metalness: 0.15,
    depthWrite: false,
  });
  const goldMat = new THREE.MeshStandardMaterial({ color: 0xc9a227, roughness: 0.25, metalness: 0.88 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd7dde2, roughness: 0.16, metalness: 0.94 });
  const blackMat = new THREE.MeshStandardMaterial({ color: 0x141414, roughness: 0.55 });
  const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.5 });
  const stoneTrimMat = new THREE.MeshStandardMaterial({
    color: 0xd3c6b1,
    map: stoneTexture,
    roughness: 0.82,
  });
  const shutterMat = new THREE.MeshStandardMaterial({ color: 0x233832, roughness: 0.86 });
  const copperMat = new THREE.MeshStandardMaterial({ color: 0x8a5a35, roughness: 0.42, metalness: 0.75 });
  const roofTileMat = new THREE.MeshStandardMaterial({
    color: 0x4a5457,
    map: roofTexture,
    roughness: 0.82,
    metalness: 0.06,
  });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xd9e6ea, roughness: 0.28 });
  const carpetMat = new THREE.MeshStandardMaterial({ color: 0x3f2a3a, roughness: 0.95 });
  const poolMat = new THREE.MeshStandardMaterial({
    color: 0x1aa3c9,
    emissive: 0x0a5f7a,
    emissiveIntensity: 0.55,
    transparent: true,
    opacity: 0.82,
    roughness: 0.08,
    metalness: 0.15,
  });
  const bedFabricColors = [
    0x8c1c13, 0x1e3a8a, 0x166534, 0x7c2d12, 0x6b21a8, 0x0f766e, 0x9f1239, 0x1e293b,
    0x7f1d1d, 0x1d4ed8, 0x065f46, 0x92400e, 0x581c87, 0x115e59, 0xbe123c, 0x334155,
  ];
  const bedFabricMats = bedFabricColors.map(
    (color) => new THREE.MeshStandardMaterial({ color, roughness: 0.9 }),
  );
  const lampMat = new THREE.MeshStandardMaterial({
    color: 0xffe8b8,
    emissive: 0xffc46b,
    emissiveIntensity: 1.2,
    roughness: 0.4,
  });
  const tvScreenMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x2563eb,
    emissiveIntensity: 0.6,
    roughness: 0.2,
  });

  const addBox = (
    parent: THREE.Object3D,
    material: THREE.Material,
    sx: number,
    sy: number,
    sz: number,
    x: number,
    y: number,
    z: number,
    cast = true,
  ): THREE.Mesh => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z);
    mesh.castShadow = cast;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  const addWindow = (
    parent: THREE.Object3D,
    x: number,
    y: number,
    z: number,
    width: number,
    height: number,
    axis: 'x' | 'z',
    shutters = false,
  ) => {
    const thickness = 0.08;
    const frame = new THREE.Mesh(
      new THREE.BoxGeometry(
        axis === 'z' ? width + 0.34 : thickness + 0.16,
        height + 0.34,
        axis === 'z' ? thickness + 0.16 : width + 0.34,
      ),
      trimMat,
    );
    frame.position.set(x, y, z);
    frame.castShadow = true;
    const pane = new THREE.Mesh(
      new THREE.BoxGeometry(
        axis === 'z' ? width : thickness,
        height,
        axis === 'z' ? thickness : width,
      ),
      glassMat,
    );
    pane.position.set(x, y, z);
    parent.add(frame, pane);
    // Muntins, stone sill and a projecting lintel give every opening real depth.
    const barMat = chromeMat;
    for (const offset of [-0.5, 0, 0.5]) {
      const vertical = offset === 0;
      const bar = new THREE.Mesh(
        new THREE.BoxGeometry(
          axis === 'z' ? (vertical ? 0.055 : width * 0.96) : 0.045,
          vertical ? height * 0.96 : 0.055,
          axis === 'z' ? 0.045 : vertical ? 0.055 : width * 0.96,
        ),
        barMat,
      );
      bar.position.set(
        axis === 'z' ? x : x + 0.025,
        y + (vertical ? 0 : offset * height),
        axis === 'z' ? z + 0.025 : z,
      );
      parent.add(bar);
    }
    const sill = new THREE.Mesh(
      new THREE.BoxGeometry(
        axis === 'z' ? width + 0.5 : thickness + 0.2,
        0.12,
        axis === 'z' ? thickness + 0.2 : width + 0.5,
      ),
      stoneTrimMat,
    );
    sill.position.set(x, y - height / 2 - 0.13, z);
    sill.castShadow = true;
    const lintel = new THREE.Mesh(
      new THREE.BoxGeometry(
        axis === 'z' ? width + 0.62 : thickness + 0.28,
        0.17,
        axis === 'z' ? thickness + 0.28 : width + 0.62,
      ),
      stoneTrimMat,
    );
    lintel.position.set(x, y + height / 2 + 0.16, z);
    lintel.castShadow = true;
    parent.add(sill, lintel);
    if (shutters) {
      for (const side of [-1, 1]) {
        const shutter = new THREE.Mesh(
          new THREE.BoxGeometry(
            axis === 'z' ? width * 0.42 : 0.08,
            height * 0.94,
            axis === 'z' ? 0.08 : width * 0.42,
          ),
          shutterMat,
        );
        shutter.position.set(
          axis === 'z' ? x + side * (width * 0.68 + 0.06) : x + 0.09,
          y,
          axis === 'z' ? z + 0.09 : z + side * (width * 0.68 + 0.06),
        );
        shutter.castShadow = true;
        parent.add(shutter);
      }
    }
  };

  const addHipRoof = (
    parent: THREE.Object3D,
    material: THREE.Material,
    width: number,
    depth: number,
    rise: number,
    x: number,
    y: number,
    z: number,
  ): THREE.Mesh => {
    const w = Math.max(width, depth);
    const d = Math.min(width, depth);
    const halfW = w / 2;
    const halfD = d / 2;
    const ridge = Math.max(0, (w - d) / 2);
    const vertices = new Float32Array([
      -halfW, 0, halfD,
      halfW, 0, halfD,
      -ridge, rise, 0,
      ridge, rise, 0,
      halfW, 0, -halfD,
      -halfW, 0, -halfD,
    ]);
    const indices = [
      0, 1, 3, 0, 3, 2, // front slope
      4, 5, 2, 4, 2, 3, // back slope
      5, 0, 2, // left hip
      1, 4, 3, // right hip
    ];
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    geometry.setAttribute(
      'uv',
      new THREE.BufferAttribute(
        new Float32Array([0, 0, 1, 0, 0.5, 1, 0.5, 1, 1, 1, 0, 1]),
        2,
      ),
    );
    geometry.setIndex(indices);
    geometry.computeVertexNormals();
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    // Deep eave and copper gutter read at a distance and catch the sun.
    addBox(parent, copperMat, width + 1.2, 0.16, depth + 1.2, x, y - 0.06, z);
    addBox(parent, copperMat, Math.max(2.4, width - depth) + 1.4, 0.12, 0.2, x, y + rise + 0.02, z);
    return mesh;
  };

  const addBalustrade = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    y: number,
    height = 1.05,
  ) => {
    const dx = x2 - x1;
    const dz = z2 - z1;
    const length = Math.hypot(dx, dz);
    const count = Math.max(2, Math.ceil(length / 0.62));
    const angle = Math.atan2(dz, dx);
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      addBox(
        group,
        stoneTrimMat,
        0.16,
        height,
        0.16,
        x1 + dx * t,
        y + height / 2,
        z1 + dz * t,
      );
    }
    const rail = addBox(group, stoneTrimMat, length, 0.14, 0.24, (x1 + x2) / 2, y + height, (z1 + z2) / 2);
    rail.rotation.y = -angle;
    const base = addBox(group, stoneTrimMat, length, 0.15, 0.26, (x1 + x2) / 2, y + 0.08, (z1 + z2) / 2);
    base.rotation.y = -angle;
  };

  const addColliderLine = (
    x1: number,
    z1: number,
    x2: number,
    z2: number,
    radius = 0.3,
    spacing = 0.78,
    minY?: number,
    maxY?: number,
  ) => {
    const length = Math.hypot(x2 - x1, z2 - z1);
    const count = Math.max(1, Math.ceil(length / spacing));
    for (let i = 0; i <= count; i++) {
      const t = i / count;
      colliders.push({
        x: worldX + x1 + (x2 - x1) * t,
        z: worldZ + z1 + (z2 - z1) * t,
        radius,
        ...(minY !== undefined ? { minY: HILL_HOUSE_Y + minY } : {}),
        ...(maxY !== undefined ? { maxY: HILL_HOUSE_Y + maxY } : {}),
      });
    }
  };

  const addSwingDoor = (
    id: string,
    x: number,
    y: number,
    z: number,
    width: number,
    axis: 'x' | 'z',
    openAngle: number,
    material: THREE.Material = trimMat,
  ): MansionDoorHandle => {
    const pivot = new THREE.Group();
    pivot.name = id;
    pivot.position.set(x, y, z);
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(
        axis === 'x' ? width : 0.09,
        2.35,
        axis === 'x' ? 0.09 : width,
      ),
      material,
    );
    panel.position.set(
      axis === 'x' ? width / 2 : 0,
      1.175,
      axis === 'x' ? 0 : width / 2,
    );
    panel.castShadow = true;
    panel.receiveShadow = true;
    const inset = new THREE.Mesh(
      new THREE.BoxGeometry(
        axis === 'x' ? width * 0.68 : 0.03,
        1.15,
        axis === 'x' ? 0.03 : width * 0.68,
      ),
      goldMat,
    );
    inset.position.set(
      axis === 'x' ? width / 2 : 0.06,
      1.2,
      axis === 'x' ? 0.06 : width / 2,
    );
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 6), goldMat);
    knob.position.set(
      axis === 'x' ? width * 0.86 : 0.09,
      1.08,
      axis === 'x' ? 0.09 : width * 0.86,
    );
    pivot.add(panel, inset, knob);
    pivot.traverse((child) => {
      child.userData.noStaticMerge = true;
      child.userData.dynamic = true;
    });
    group.add(pivot);
    const minY = HILL_HOUSE_Y + y - 0.1;
    const maxY = HILL_HOUSE_Y + y + 2.5;
    const leafSegments = Math.max(3, Math.ceil(width / 0.28));
    const leafColliders: { x: number; z: number; radius: number; minY: number; maxY: number }[] = [];
    for (let i = 0; i < leafSegments; i++) {
      const t = (i + 0.5) / leafSegments;
      leafColliders.push({
        x: worldX + x + (axis === 'x' ? width * t : 0),
        z: worldZ + z + (axis === 'z' ? width * t : 0),
        radius: 0.3,
        minY,
        maxY,
      });
    }
    colliders.push(...leafColliders);
    doors.push({
      id,
      pivot,
      collider: leafColliders[0],
      colliders: leafColliders,
      openAngle,
      closedAngle: 0,
      open: false,
    });
    return doors[doors.length - 1];
  };

  const buildWall = (
    axis: 'x' | 'z',
    fixed: number,
    start: number,
    end: number,
    openings: { center: number; width: number; bottom: number; top: number }[],
    material: THREE.Material = stuccoMat,
    height = WALL_H,
    baseY = 0,
  ) => {
    const wallT = 0.34;
    const sorted = [...openings].sort((a, b) => a.center - b.center);
    const segment = (
      a: number,
      b: number,
      y0: number,
      y1: number,
    ) => {
      if (b - a <= 0.01 || y1 - y0 <= 0.01) return;
      const mid = (a + b) / 2;
      addBox(
        group,
        material,
        axis === 'x' ? b - a : wallT,
        y1 - y0,
        axis === 'x' ? wallT : b - a,
        axis === 'x' ? mid : fixed,
        baseY + y0 + (y1 - y0) / 2,
        axis === 'x' ? fixed : mid,
      );
    };
    let cursor = start;
    for (const o of sorted) {
      const left = o.center - o.width / 2;
      const right = o.center + o.width / 2;
      if (left > cursor) segment(cursor, left, 0, height);
      if (o.bottom > 0) {
        segment(left, right, 0, o.bottom);
        addColliderLine(
          axis === 'x' ? left : fixed,
          axis === 'x' ? fixed : left,
          axis === 'x' ? right : fixed,
          axis === 'x' ? fixed : right,
          0.42,
          0.55,
          baseY,
          baseY + o.bottom,
        );
      }
      if (o.top < height) {
        segment(left, right, o.top, height);
        addColliderLine(
          axis === 'x' ? left : fixed,
          axis === 'x' ? fixed : left,
          axis === 'x' ? right : fixed,
          axis === 'x' ? fixed : right,
          0.42,
          0.55,
          baseY + o.top,
          baseY + height,
        );
      }
      cursor = Math.max(cursor, right);
    }
    if (cursor < end) segment(cursor, end, 0, height);
    // Structural side colliders on the solid runs. A lean collider keeps the
    // doorway itself clear while the dense spacing still makes the wall solid.
    let runStart = start;
    for (const o of sorted) {
      const left = o.center - o.width / 2;
      if (left > runStart) {
        addColliderLine(
          axis === 'x' ? runStart : fixed,
          axis === 'x' ? fixed : runStart,
          axis === 'x' ? left : fixed,
          axis === 'x' ? fixed : left,
          0.12,
          0.7,
          baseY,
          baseY + height,
        );
      }
      runStart = Math.max(runStart, o.center + o.width / 2);
    }
    if (runStart < end) {
      addColliderLine(
        axis === 'x' ? runStart : fixed,
        axis === 'x' ? fixed : runStart,
        axis === 'x' ? end : fixed,
        axis === 'x' ? fixed : end,
        0.12,
        0.7,
        baseY,
        baseY + height,
      );
    }
  };

  // ---------- shell ----------
  addBox(group, stoneMat, 28.4, 1.2, 20.4, 0, -0.48, 0);
  // Main floor is split around the indoor pool so the pool is a real basin,
  // not water painted on top of a slab.
  addBox(group, marbleMat, 20.8, 0.18, 18.4, 2.8, 0, 0, false);
  addBox(group, marbleMat, 1.0, 0.18, 18.4, -12.7, 0, 0, false);
  addBox(group, marbleMat, 4.6, 0.18, 4.2, -9.9, 0, -7.1, false);
  addBox(group, marbleMat, 4.6, 0.18, 3.8, -9.9, 0, 7.3, false);
  addBox(group, woodFloorMat, 13.0, 0.2, 17.9, 6.4, 0.02, 0, false);
  addBox(group, carpetMat, 12.6, 0.16, 10.4, 0, 0.03, 3.0, false);

  // Real wall openings: pavilion, stair doors, balconies and the south atrium.
  buildWall('x', -HALF_D, -HALF_W, HALF_W, [
    { center: 0, width: 4.0, bottom: 0, top: 3.25 },
  ]);
  buildWall('x', HALF_D, -HALF_W, HALF_W, [
    { center: 0, width: 4.8, bottom: 0, top: 3.2 },
    { center: 5.7, width: 2.0, bottom: 7.2, top: 9.7 },
  ]);
  buildWall('z', -HALF_W, -HALF_D, HALF_D, [
    { center: 0, width: 2.2, bottom: 3.6, top: 6.3 },
    { center: 6.25, width: 2.2, bottom: 0, top: 3.15 },
  ]);
  buildWall('z', HALF_W, -HALF_D, HALF_D, [
    // Second-storey stair door (south end of the corridor) and the third-floor
    // landing door (north end). They align with the east exterior flight.
    { center: 2.0, width: 1.5, bottom: 3.6, top: 6.3 },
    { center: -1.5, width: 1.5, bottom: 7.2, top: 9.7 },
    { center: 6.7, width: 2.8, bottom: 0, top: 2.6 },
  ]);
  // Spandrel between the second and third floor stair doors.
  addBox(group, stuccoMat, 0.34, 0.9, 2.2, HALF_W, 6.75, 0);
  addBox(group, stuccoMat, 0.34, 0.9, 2.2, -HALF_W, 6.75, 0);

  // Block courses, quoins and a deep dentil cornice.
  addBox(group, stoneTrimMat, HALF_W * 2 + 0.18, 0.9, HALF_D * 2 + 0.18, 0, 0.12, 0, false);
  for (const [x, z] of [
    [-HALF_W, -HALF_D],
    [HALF_W, -HALF_D],
    [-HALF_W, HALF_D],
    [HALF_W, HALF_D],
  ] as const) {
    for (let i = 0; i < 11; i++) {
      addBox(group, stoneTrimMat, 0.78, 0.48, 0.78, x, 0.24 + i * 1.02, z, false);
    }
  }
  for (let i = 0; i < 34; i++) {
    const x = -HALF_W + 0.4 + i * 0.78;
    addBox(group, stoneTrimMat, 0.34, 0.32, 0.32, x, WALL_H - 0.12, HALF_D + 0.27, false);
    addBox(group, stoneTrimMat, 0.34, 0.32, 0.32, x, WALL_H - 0.12, -HALF_D - 0.27, false);
  }
  for (const y of [FLOOR_GAP - 0.24, FLOOR_GAP * 2 - 0.24, WALL_H - 0.28]) {
    addBox(group, stoneTrimMat, HALF_W * 2 + 0.72, 0.24, 0.34, 0, y, HALF_D + 0.2, false);
    addBox(group, stoneTrimMat, HALF_W * 2 + 0.72, 0.24, 0.34, 0, y, -HALF_D - 0.2, false);
    addBox(group, stoneTrimMat, 0.34, 0.24, HALF_D * 2 + 0.72, HALF_W + 0.2, y, 0, false);
    addBox(group, stoneTrimMat, 0.34, 0.24, HALF_D * 2 + 0.72, -HALF_W - 0.2, y, 0, false);
  }

  // Multiple roof planes with dormers, chimneys and copper details.
  addHipRoof(group, roofTileMat, 29.2, 21.2, 4.35, 0, WALL_H + 0.05, 0);
  addBox(group, trimMat, 27.2, 0.26, 19.2, 0, WALL_H + 0.05, 0, false);
  for (const [x, z, w, d] of [
    [-8.2, -7.2, 2.3, 2.6],
    [-2.8, -7.2, 2.3, 2.6],
    [2.8, -7.2, 2.3, 2.6],
    [8.2, -7.2, 2.3, 2.6],
    [-8.2, 7.2, 2.3, 2.6],
    [8.2, 7.2, 2.3, 2.6],
  ] as const) {
    addBox(group, stoneTrimMat, w, 2.2, d, x, WALL_H + 1.1, z);
    addHipRoof(group, roofTileMat, w + 0.5, d + 0.5, 0.9, x, WALL_H + 2.2, z);
    addWindow(group, x, WALL_H + 1.26, z + (z > 0 ? d / 2 + 0.02 : -d / 2 - 0.02), 1.2, 1.1, 'z', false);
  }
  for (const [x, z, height] of [
    [-10.5, 5.5, 4.5],
    [10.5, 5.5, 5.2],
    [-10.5, -5.2, 5.0],
    [10.5, -5.2, 4.4],
  ] as const) {
    addBox(group, stoneMat, 1.45, height, 1.45, x, WALL_H + height / 2, z);
    addBox(group, stoneTrimMat, 1.75, 0.24, 1.75, x, WALL_H + height + 0.08, z);
    addBox(group, blackMat, 0.72, 0.24, 0.72, x, WALL_H + height + 0.24, z, false);
  }

  // Third-floor and second-floor slab edges.
  addBox(group, marbleMat, 26.4, 0.22, 18.4, 0, FLOOR_GAP, 0, false);
  addBox(group, marbleMat, 26.4, 0.22, 18.4, 0, FLOOR_GAP * 2, 0, false);

  // Windows on every storey, with stone surrounds and garden shutters below.
  for (const y of [1.55, 1.55 + FLOOR_GAP, 1.55 + FLOOR_GAP * 2]) {
    for (const x of [-9.4, -4.7, 0, 4.7, 9.4]) {
      if (y < 2 && x === 0) continue;
      addWindow(group, x, y, -HALF_D + 0.02, 1.8, 1.7, 'z', y < 2);
    }
    for (const z of [-6.4, -2.4, 3.0]) {
      addWindow(group, -HALF_W + 0.02, y, z, 1.6, 1.7, 'x', y < 2);
      addWindow(group, HALF_W - 0.02, y, z, 1.6, 1.7, 'x', y < 2);
    }
    for (const x of [-9.4, -4.7, 4.7, 9.4]) {
      addWindow(group, x, y, HALF_D - 0.02, 1.8, 1.7, 'z', y < 2);
    }
  }
  // Tall glazed garden doors at ground level.
  for (const z of [-7.4, -4.0, 7.4]) {
    addBox(group, glassMat, 0.06, 2.5, 2.1, -HALF_W - 0.02, 1.32, z, false);
    addBox(group, trimMat, 0.16, 2.7, 2.35, -HALF_W - 0.06, 1.4, z);
  }
  addBox(group, glassMat, 0.06, 2.5, 2.8, HALF_W + 0.02, 1.32, 6.7, false);
  addBox(group, trimMat, 0.16, 2.7, 3.0, HALF_W + 0.06, 1.4, 6.7);

  // South threshold into the garden atrium.
  addBox(group, stoneTrimMat, 6.2, 0.24, 1.2, 0, 0.12, HALF_D + 0.58);
  addBox(group, trimMat, 4.7, 0.34, 0.28, 0, 3.25, HALF_D);
  addBox(group, trimMat, 0.26, 3.2, 0.3, -2.35, 1.6, HALF_D);
  addBox(group, trimMat, 0.26, 3.2, 0.3, 2.35, 1.6, HALF_D);
  addBox(group, trimMat, 0.16, 2.9, 0.14, -1.15, 1.48, HALF_D - 0.02);
  addBox(group, trimMat, 0.16, 2.9, 0.14, 1.15, 1.48, HALF_D - 0.02);
  const glassDoorL = addBox(group, glassMat, 2.2, 2.7, 0.08, -1.15, 1.45, HALF_D, false);
  const glassDoorR = addBox(group, glassMat, 2.2, 2.7, 0.08, 1.15, 1.45, HALF_D, false);
  glassDoorL.castShadow = false;
  glassDoorR.castShadow = false;

  // South garden atrium: the missing physical link between the original
  // hilltop shell and the main mansion. It is a real room, not a gap.
  const atriumZ0 = HALF_D;
  const atriumZ1 = 12.8;
  addBox(group, stoneMat, 16.8, 0.4, atriumZ1 - atriumZ0 + 0.6, 0, -0.18, (atriumZ0 + atriumZ1) / 2);
  addBox(group, marbleMat, 16.4, 0.16, atriumZ1 - atriumZ0, 0, 0.02, (atriumZ0 + atriumZ1) / 2, false);
  addBox(group, stuccoMat, 0.38, 7.3, atriumZ1 - atriumZ0, -8.2, 3.65, (atriumZ0 + atriumZ1) / 2);
  addBox(group, stuccoMat, 0.38, 7.3, atriumZ1 - atriumZ0, 8.2, 3.65, (atriumZ0 + atriumZ1) / 2);
  addBox(group, stuccoMat, 16.8, 3.9, 0.4, 0, 5.35, atriumZ1);
  addBox(group, glassMat, 5.4, 2.8, 0.08, -5.2, 1.6, atriumZ1 - 0.02, false);
  addBox(group, glassMat, 5.4, 2.8, 0.08, 5.2, 1.6, atriumZ1 - 0.02, false);
  addBox(group, trimMat, 4.6, 0.22, 0.24, 0, 3.08, atriumZ1 - 0.05);
  addBox(group, glassMat, 15.2, 3.0, 0.06, 0, 7.0, atriumZ1 - 0.02, false);
  addBox(group, trimMat, 0.34, 7.4, 0.32, -8.2, 3.7, atriumZ1);
  addBox(group, trimMat, 0.34, 7.4, 0.32, 8.2, 3.7, atriumZ1);
  for (const x of [-6.4, -3.2, 0, 3.2, 6.4]) {
    addBox(group, stoneTrimMat, 0.38, 7.3, 0.5, x, 3.65, atriumZ1 + 0.08, false);
  }
  addBox(group, glassMat, 15.9, 0.08, atriumZ1 - atriumZ0 - 0.5, 0, 7.28, (atriumZ0 + atriumZ1) / 2, false);
  addBox(group, trimMat, 16.4, 0.24, atriumZ1 - atriumZ0, 0, 7.34, (atriumZ0 + atriumZ1) / 2);
  for (const side of [-1, 1]) {
    addBox(group, marbleMat, 0.7, 2.9, 0.7, side * 6.9, 1.45, atriumZ1 - 0.55);
    addBox(group, goldMat, 0.82, 0.16, 0.82, side * 6.9, 2.9, atriumZ1 - 0.55);
    addColliderLine(side * 8.2, atriumZ0, side * 8.2, atriumZ1, 0.3, 0.7);
  }
  stationAt(
    'mansion_garden_atrium',
    'house_couch',
    'Rest in the Garden Atrium',
    'Skylit link between the original house and the grand mansion',
    0,
    0,
    10.9,
    3.2,
    { x: 0, z: 10.6, yaw: 0 },
  );

  // Glazed west gallery: the original hilltop shell and the relocated bowling
  // wing are physically joined here, with no gap or second front door.
  const galX0 = -12.8;
  const galX1 = -5.4;
  const galZ0 = 18.0;
  const galZ1 = 20.6;
  addBox(group, stoneMat, galX1 - galX0 + 0.6, 0.5, galZ1 - galZ0 + 0.6, (galX0 + galX1) / 2, -0.22, (galZ0 + galZ1) / 2);
  addBox(group, marbleMat, galX1 - galX0, 0.16, galZ1 - galZ0, (galX0 + galX1) / 2, 0.03, (galZ0 + galZ1) / 2, false);
  for (const z of [galZ0, galZ1]) {
    addBox(group, stuccoMat, galX1 - galX0, 3.4, 0.3, (galX0 + galX1) / 2, 1.7, z);
    addColliderLine(galX0, z, galX1, z, 0.28, 0.75, 0, 3.5);
    for (let x = galX0 + 0.8; x < galX1 - 0.4; x += 1.45) {
      addBox(group, glassMat, 1.05, 1.75, 0.05, x, 1.85, z + (z === galZ0 ? 0.17 : -0.17), false);
      addBox(group, trimMat, 1.18, 0.12, 0.12, x, 2.78, z + (z === galZ0 ? 0.2 : -0.2));
    }
  }
  addBox(group, roofMat, galX1 - galX0 + 0.6, 0.24, galZ1 - galZ0 + 0.7, (galX0 + galX1) / 2, 3.48, (galZ0 + galZ1) / 2);
  addBox(group, trimMat, galX1 - galX0 + 0.4, 0.18, 0.22, (galX0 + galX1) / 2, 3.32, galZ0);
  addBox(group, trimMat, galX1 - galX0 + 0.4, 0.18, 0.22, (galX0 + galX1) / 2, 3.32, galZ1);
  for (const x of [galX0 + 0.6, galX1 - 0.6]) {
    addBox(group, stoneTrimMat, 0.55, 3.3, 0.55, x, 1.65, galZ0 + 0.3);
    addBox(group, stoneTrimMat, 0.55, 3.3, 0.55, x, 1.65, galZ1 - 0.3);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), lampMat);
    globe.position.set(x, 2.55, (galZ0 + galZ1) / 2);
    group.add(globe);
  }
  stationAt(
    'mansion_bowling_gallery',
    'house_couch',
    'Walk the Bowling Gallery',
    'Glazed link from the original house into the regulation lane',
    -9.1,
    0,
    19.3,
    2.8,
  );
  for (const [z, label] of [
    [-4.6, 'Marble Gallery'],
    [0.2, 'Grand Stair Terrace'],
    [4.8, 'East Loggia'],
  ] as const) {
    addBox(group, stoneTrimMat, 3.8, 0.2, 3.2, -15.0, SECOND_Y - 0.08, z);
    addBox(group, stoneTrimMat, 3.6, 0.2, 3.0, 15.0, THIRD_Y - 0.08, z);
    addBox(group, stoneTrimMat, 2.0, 0.14, 0.2, -15.0, SECOND_Y + 0.02, z + 1.55, false);
    addBox(group, stoneTrimMat, 2.0, 0.14, 0.2, 15.0, THIRD_Y + 0.02, z + 1.55, false);
  }

  // East second-floor balcony and south third-floor balcony.
  addBox(group, stoneTrimMat, 3.4, 0.22, 5.4, 14.9, SECOND_Y - 0.1, 3.55);
  addBalustrade(16.55, 0.9, 16.55, 6.2, SECOND_Y - 0.02, 1.05);
  addBalustrade(13.25, 6.2, 16.55, 6.2, SECOND_Y - 0.02, 1.05);
  addBalustrade(13.25, 0.9, 16.55, 0.9, SECOND_Y - 0.02, 1.05);
  for (const z of [1.7, 3.0, 4.3, 5.6]) {
    addBox(group, glassMat, 0.07, 2.25, 1.05, 13.22, SECOND_Y + 1.3, z, false);
    addBox(group, trimMat, 0.13, 2.45, 1.2, 13.16, SECOND_Y + 1.3, z);
  }
  addBox(group, stoneTrimMat, 3.6, 0.22, 3.0, 5.7, THIRD_Y - 0.1, 10.55);
  addBalustrade(3.95, 11.95, 7.45, 11.95, THIRD_Y - 0.02, 1.05);
  addBalustrade(3.95, 9.25, 3.95, 11.95, THIRD_Y - 0.02, 1.05);
  addBalustrade(7.45, 9.25, 7.45, 11.95, THIRD_Y - 0.02, 1.05);
  for (const x of [4.7, 5.7, 6.7]) {
    addBox(group, glassMat, 1.0, 2.2, 0.07, x, THIRD_Y + 1.25, 9.22, false);
    addBox(group, trimMat, 1.12, 2.4, 0.13, x, THIRD_Y + 1.25, 9.16);
  }

  // Storey-to-storey stone stairs on the west and east facades. Doors land in
  // the central corridors, not inside bedrooms.
  const addStair = (
    x0: number,
    z0: number,
    z1: number,
    fromY: number,
    toY: number,
    width: number,
    steps: number,
  ) => {
    const run = (z1 - z0) / steps;
    const rise = (toY - fromY) / steps;
    for (let i = 0; i < steps; i++) {
      addBox(
        group,
        marbleMat,
        width,
        Math.max(0.12, rise),
        Math.abs(run) + 0.04,
        x0,
        fromY + (i + 0.5) * rise,
        z0 + (i + 0.5) * run,
      );
      addBox(group, stoneTrimMat, width + 0.12, 0.1, Math.abs(run) + 0.04, x0, fromY + (i + 0.5) * rise + rise * 0.48, z0 + (i + 0.5) * run, false);
    }
    for (const side of [-1, 1]) {
      addBox(group, stoneTrimMat, 0.16, 1.1, Math.abs(z1 - z0) + 1.0, x0 + side * (width / 2 + 0.12), (fromY + toY) / 2 + 0.55, (z0 + z1) / 2);
      addBox(group, stoneTrimMat, 0.3, 0.18, Math.abs(z1 - z0) + 1.2, x0 + side * (width / 2 + 0.12), (fromY + toY) / 2 + 1.1, (z0 + z1) / 2);
    }
    // Stone parapets are visual; the stair mouths stay open at both ends.
  };
  addStair(-15.0, 6.2, 0.0, GROUND_Y, SECOND_Y, 3.4, 18);
  addStair(15.0, 2.0, -1.5, SECOND_Y, THIRD_Y, 3.4, 18);
  addBox(group, marbleMat, 3.6, 0.2, 2.4, -15.0, SECOND_Y - 0.08, -0.4);
  addBox(group, marbleMat, 3.6, 0.2, 1.2, 15.0, THIRD_Y - 0.08, -1.5);
  addBalustrade(-16.75, -0.8, -16.75, 1.0, SECOND_Y - 0.02, 1.0);
  addBalustrade(15.0, -1.7, 16.75, -1.7, THIRD_Y - 0.02, 1.0);

  // ---------- ground floor: indoor pool ----------
  addBox(group, tileMat, 0.85, 0.12, 18.0, -12.72, 0.12, 0, false);
  addBox(group, tileMat, 0.75, 0.12, 18.0, -7.24, 0.12, 0, false);
  addBox(group, tileMat, 4.6, 0.12, 4.0, -9.9, 0.12, -7.1, false);
  addBox(group, tileMat, 4.6, 0.12, 3.7, -9.9, 0.12, 7.3, false);
  // Recessed, swimmable basin with steps and a tiled floor.
  addBox(group, poolMat, 4.6, 0.06, 10.4, -9.9, -0.2, 0.2, false);
  addBox(group, tileMat, 4.6, 0.3, 10.4, -9.9, -1.82, 0.2, false);
  addBox(group, tileMat, 4.9, 1.85, 0.34, -9.9, -0.92, -5.05, false);
  addBox(group, tileMat, 4.9, 1.85, 0.34, -9.9, -0.92, 5.45, false);
  addBox(group, tileMat, 0.34, 1.85, 10.8, -12.35, -0.92, 0.2, false);
  addBox(group, tileMat, 0.34, 1.85, 10.8, -7.45, -0.92, 0.2, false);
  for (let i = 0; i < 3; i++) {
    addBox(group, whiteMat, 1.1, 0.24, 2.0, -7.15, -0.36 - i * 0.52, -3.3 + i * 1.05, false);
  }
  for (const [x, z, sx, sz] of [
    [-9.9, -5.2, 5.2, 0.34],
    [-9.9, 5.6, 5.2, 0.34],
    [-12.2, 0.2, 0.34, 11.1],
    [-7.6, 0.2, 0.34, 11.1],
  ] as const) {
    addBox(group, whiteMat, sx, 0.12, sz, x, 0.02, z);
  }
  for (const z of [-3.4, 1.2, 5.0]) {
    addBox(group, whiteMat, 0.9, 0.08, 1.9, -7.1, 0.05, z, false);
    addBox(group, chromeMat, 0.06, 0.55, 0.06, -7.1, 0.32, z + 0.8);
  }
  // Glass pool gallery wall with a central doorway.
  addBox(group, stuccoMat, 0.24, 3.3, 6.4, -6.55, 1.7, -5.4);
  addBox(group, stuccoMat, 0.24, 3.3, 5.4, -6.55, 1.7, 5.9);
  addBox(group, stuccoMat, 0.24, 0.8, 5.6, -6.55, 2.9, 0.2);
  addBox(group, glassMat, 0.06, 2.4, 5.4, -6.55, 1.5, 0.15, false);
  stationAt(
    'mansion_indoor_pool',
    'house_pool',
    'Swim in the Indoor Pool',
    'Heated 12-metre pool inside the glass gallery',
    -9.9,
    GROUND_Y,
    0.2,
    3.4,
  );
  stationAt(
    'mansion_indoor_pool_exit',
    'house_pool_exit',
    'Climb Out of the Indoor Pool',
    'Use the tiled pool steps',
    -6.9,
    GROUND_Y,
    0.2,
    4.5,
  );

  // ---------- ground floor: two music lounges ----------
  const addLounge = (originX: number, accent: number, label: string, stationId: string) => {
    const accentMat = new THREE.MeshStandardMaterial({
      color: accent,
      emissive: accent,
      emissiveIntensity: 0.5,
      roughness: 0.35,
    });
    addBox(group, woodFloorMat, 6.3, 0.14, 8.0, originX, 0.11, -4.9);
    addBox(group, accentMat, 3.4, 0.08, 0.24, originX, 2.65, -8.85, false);
    addBox(group, blackMat, 4.6, 0.32, 1.15, originX, 0.34, -8.15);
    addBox(group, accentMat, 3.8, 0.1, 0.7, originX, 0.55, -8.1, false);
    for (const side of [-1, 1]) {
      addBox(group, blackMat, 0.7, 1.5, 0.7, originX + side * 2.55, 0.86, -8.2);
      addBox(group, chromeMat, 0.5, 0.5, 0.5, originX + side * 2.55, 1.65, -8.2);
    }
    addBox(group, trimMat, 1.4, 0.8, 0.65, originX, 0.55, -6.75);
    addBox(group, accentMat, 1.2, 0.06, 0.5, originX, 0.98, -6.75, false);
    for (const side of [-1, 1]) {
      addBox(group, trimMat, 0.14, 0.1, 0.14, originX + side * 0.42, 1.0, -6.9, false);
    }
    // Wrap-around lounge seating.
    for (const [x, z, sx, sz] of [
      [originX, -4.8, 4.2, 0.9],
      [originX - 2.35, -2.9, 0.95, 3.6],
      [originX + 2.35, -2.9, 0.95, 3.6],
    ] as const) {
      const sofa = addBox(group, accentMat, sx, 0.55, sz, x, 0.4, z);
      sofa.userData.noShadowCast = false;
      addBox(group, carpetMat, sx * 0.85, 0.22, sz * 0.72, x, 0.78, z, false);
    }
    addBox(group, trimMat, 2.2, 0.34, 1.2, originX, 0.3, -1.2);
    stationAt(
      stationId,
      'house_music_studio',
      label,
      'Turntables, live speakers and lounge seating',
      originX,
      GROUND_Y,
      -6.9,
      3.4,
    );
  };
  addLounge(-4.4, 0xd946ef, 'Music Lounge A · Neon Room', 'mansion_music_lounge_a');
  addLounge(4.4, 0x38bdf8, 'Music Lounge B · Blue Room', 'mansion_music_lounge_b');

  // Talking lounge with a conversation pit and fireplace.
  addBox(group, carpetMat, 8.4, 0.08, 4.6, 0, 0.11, 2.9, false);
  addBox(group, trimMat, 0.7, 1.5, 4.8, -4.9, 0.85, 2.9);
  addBox(group, blackMat, 0.9, 0.9, 2.6, -4.9, 0.55, 2.9);
  const fireMat = new THREE.MeshStandardMaterial({
    color: 0xff8a3d,
    emissive: 0xff6a00,
    emissiveIntensity: 1.5,
    roughness: 0.4,
  });
  addBox(group, fireMat, 0.18, 0.55, 1.7, -4.49, 0.55, 2.9, false);
  for (const [x, z, sx, sz] of [
    [0, 4.7, 6.2, 0.95],
    [0, 1.1, 6.2, 0.95],
    [-3.1, 2.9, 0.95, 3.2],
  ] as const) {
    addBox(group, carpetMat, sx, 0.6, sz, x, 0.4, z);
    addBox(group, whiteMat, sx * 0.82, 0.24, sz * 0.72, x, 0.78, z, false);
  }
  addBox(group, trimMat, 2.6, 0.36, 1.3, 0.4, 0.28, 2.9);
  stationAt(
    'mansion_talking_lounge',
    'house_couch',
    'Sit in the Talking Lounge',
    'Conversation pit, fireplace and coffee table',
    0.6,
    GROUND_Y,
    2.9,
    3.2,
    { x: 0.6, z: 3.35, yaw: 0 },
  );

  // ---------- ground floor: kitchen and dining ----------
  addBox(group, tileMat, 6.2, 0.12, 18.0, 9.8, 0.12, 0, false);
  addBox(group, blackMat, 0.9, 0.9, 0.75, 8.0, 0.55, -8.2);
  addBox(group, chromeMat, 0.95, 0.05, 0.8, 8.0, 1.02, -8.2, false);
  for (const dx of [-0.28, 0.28]) {
    addBox(group, fireMat, 0.2, 0.05, 0.2, 8.0 + dx, 1.06, -8.2, false);
  }
  addBox(group, chromeMat, 1.2, 2.0, 0.85, 12.3, 1.0, -8.1);
  addBox(group, trimMat, 1.3, 2.1, 0.18, 12.3, 1.1, -7.65);
  addBox(group, marbleMat, 4.6, 0.12, 1.4, 9.9, 0.98, -2.0);
  addBox(group, trimMat, 4.6, 0.92, 1.4, 9.9, 0.46, -2.0);
  for (const x of [7.2, 9.2, 11.2, 12.6]) {
    addBox(group, chromeMat, 0.55, 0.04, 0.4, x, 1.06, -8.25, false);
  }
  for (const z of [-5.4, -3.4]) {
    addBox(group, whiteMat, 0.55, 0.1, 0.4, 9.9, 1.06, z, false);
  }
  addBox(group, trimMat, 0.3, 0.5, 16.0, 12.8, 0.35, 0);
  for (let i = 0; i < 5; i++) {
    const pot = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.16, 0.24, 10), chromeMat);
    pot.position.set(10.4, 1.55, -8.5);
    pot.rotation.z = Math.PI / 2;
    group.add(pot);
    pot.translateX(i * 0.55 - 1.1);
  }
  stationAt(
    'mansion_kitchen',
    'house_stove',
    'Cook in the Mansion Kitchen',
    'Professional range, island and walk-in pantry',
    9.9,
    GROUND_Y,
    -2.0,
    3.0,
  );

  // Dining table under a chandelier.
  addBox(group, trimMat, 7.4, 0.24, 2.5, 9.6, 0.85, 5.0);
  for (const x of [6.5, 8.6, 10.7, 12.7]) {
    for (const side of [-1, 1]) {
      addBox(group, trimMat, 0.55, 0.9, 0.55, x, 0.45, 5.0 + side * 1.85);
      addBox(group, whiteMat, 0.45, 0.15, 0.45, x, 0.97, 5.0 + side * 1.85, false);
    }
  }
  for (let i = 0; i < 8; i++) {
    const cone = new THREE.Mesh(new THREE.ConeGeometry(0.32, 0.5, 8), lampMat);
    cone.position.set(-3.2 + i * 0.92, 2.95, 5.0);
    cone.rotation.x = Math.PI;
    group.add(cone);
  }
  stationAt(
    'mansion_dining',
    'house_couch',
    'Dine in the Grand Dining Room',
    'Seats eight beneath a crystal chandelier',
    9.6,
    GROUND_Y,
    5.0,
    2.8,
    { x: 9.6, z: 6.5, yaw: Math.PI },
  );

  // ---------- east motor court and detailing bay ----------
  addBox(group, stoneMat, 9.6, 0.1, 16.2, 18.4, 0.06, 0.4, false);
  addBox(group, tileMat, 8.8, 0.06, 15.2, 18.4, 0.11, 0.4, false);
  const addDisplayCar = (cx: number, cz: number, paint: number, trunkSpeakers: boolean) => {
    const paintMat = new THREE.MeshStandardMaterial({ color: paint, roughness: 0.3, metalness: 0.45 });
    const car = new THREE.Group();
    addBox(car, paintMat, 4.8, 0.55, 2.1, 0, 0.55, 0);
    addBox(car, paintMat, 2.3, 0.55, 1.85, -0.2, 1.08, 0);
    addBox(car, glassMat, 2.1, 0.4, 1.72, -0.2, 1.15, 0, false);
    for (const side of [-1, 1]) {
      for (const front of [-1, 1]) {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.34, 0.22, 12), blackMat);
        wheel.rotation.z = Math.PI / 2;
        wheel.position.set(front * 1.55, 0.34, side * 1.02);
        car.add(wheel);
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.24, 10), chromeMat);
        hub.rotation.z = Math.PI / 2;
        hub.position.set(front * 1.55, 0.34, side * 1.02);
        car.add(hub);
      }
    }
    const headMat = new THREE.MeshStandardMaterial({
      color: 0xfff6d5,
      emissive: 0xffe9a8,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });
    for (const side of [-1, 1]) {
      addBox(car, headMat, 0.1, 0.24, 0.42, 2.41, 0.62, side * 0.66, false);
      addBox(car, fireMat, 0.1, 0.2, 0.36, -2.41, 0.62, side * 0.66, false);
    }
    if (trunkSpeakers) {
      addBox(car, trimMat, 1.3, 0.45, 0.5, -1.7, 0.98, 0.2);
      for (const side of [-1, 1]) {
        const speaker = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.08, 12), chromeMat);
        speaker.rotation.x = Math.PI / 2;
        speaker.position.set(-1.7 + side * 0.36, 1.24, 0.5);
        car.add(speaker);
      }
    }
    // Visible hydraulic pump rack behind each display car.
    for (const side of [-1, 1]) {
      const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.8, 10), chromeMat);
      pump.position.set(-1.9, 1.35, side * 0.62);
      car.add(pump);
      const tank = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.34, 10), goldMat);
      tank.position.set(-1.9, 1.05, side * 0.62);
      car.add(tank);
    }
    car.position.set(cx, 0.12, cz);
    group.add(car);
    colliders.push({ x: worldX + cx, z: worldZ + cz, radius: 2.3 });
  };
  addDisplayCar(18.2, -5.5, 0x111827, true);
  addDisplayCar(18.2, 2.4, 0x1f2937, false);

  // Hydraulic service rack, speaker test bench and headlight aiming wall.
  addBox(group, trimMat, 1.4, 1.8, 0.7, 18.2, 1.0, -3.7);
  for (const side of [-1, 1]) {
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 1.4, 10), chromeMat);
    pump.position.set(18.2 + side * 0.34, 1.1, -3.7);
    group.add(pump);
    const hose = new THREE.Mesh(new THREE.TorusGeometry(0.26, 0.035, 8, 14, Math.PI), blackMat);
    hose.rotation.x = Math.PI / 2;
    hose.position.set(18.2 + side * 0.34, 0.72, -3.7);
    group.add(hose);
  }
  addBox(group, blackMat, 1.8, 2.0, 0.8, 16.8, 1.1, 4.4);
  for (const side of [-1, 1]) {
    const speaker = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.26, 0.12, 14), chromeMat);
    speaker.rotation.z = Math.PI / 2;
    speaker.position.set(16.8 + side * 0.3, 1.4, 4.82);
    group.add(speaker);
  }
  addBox(group, stuccoMat, 6.2, 2.6, 0.24, 18.2, 1.5, -7.2);
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(
      new THREE.CylinderGeometry(0.22, 0.22, 0.12, 14),
      new THREE.MeshStandardMaterial({
        color: 0xfff6d5,
        emissive: 0xffe9a8,
        emissiveIntensity: 1.6,
        roughness: 0.2,
      }),
    );
    lamp.rotation.x = Math.PI / 2;
    lamp.position.set(18.2 + side * 1.2, 1.55, -7.02);
    group.add(lamp);
  }

  // ---------- north garden pavilion: second kitchen, tiki bar, library, study ----------
  const pavZ0 = -21.2;
  const pavZ1 = -9.2;
  addBox(group, marbleMat, 26.4, 0.18, pavZ1 - pavZ0, 0, 0.0, (pavZ0 + pavZ1) / 2, false);
  buildWall('x', pavZ0, -13.4, 13.4, [
    { center: 0, width: 4.2, bottom: 0, top: 2.9 },
  ], stuccoMat, 3.5);
  addBox(group, stuccoMat, 0.34, 3.5, pavZ1 - pavZ0, -13.2, 1.75, (pavZ0 + pavZ1) / 2);
  addBox(group, stuccoMat, 0.34, 3.5, pavZ1 - pavZ0, 13.2, 1.75, (pavZ0 + pavZ1) / 2);
  addBox(group, roofMat, 27.0, 0.3, pavZ1 - pavZ0 + 0.5, 0, 3.55, (pavZ0 + pavZ1) / 2);
  addBox(group, trimMat, 26.8, 0.22, 0.24, 0, 3.25, pavZ0 + 0.2);
  addBox(group, trimMat, 4.4, 0.26, 0.3, 0, 2.9, pavZ0 + 0.1);
  for (const x of [-9.2, -4.6, 0, 4.6, 9.2]) {
    addWindow(group, x, 1.6, pavZ0 + 0.02, 1.8, 1.6, 'z');
  }
  for (const z of [-18.3, -14.0, -11.0]) {
    addWindow(group, -13.18, 1.6, z, 1.5, 1.6, 'x');
    addWindow(group, 13.18, 1.6, z, 1.5, 1.6, 'x');
  }
  // Wide open archway between the pavilion and the main mansion.
  buildWall('x', pavZ1, -13.4, 13.4, [
    { center: 0, width: 4.2, bottom: 0, top: 2.9 },
  ], stuccoMat, 3.5);
  addBox(group, glassMat, 4.2, 2.75, 0.06, 0, 1.4, pavZ1 + 0.17, false);
  addBox(group, trimMat, 4.5, 0.26, 0.2, 0, 2.9, pavZ1 + 0.17);
  // Internal subdivisions have real door openings, so every pavilion room is
  // reachable from every other one.
  for (const x of [-4.5, 1.5, 6.5]) {
    buildWall('z', x, pavZ0, pavZ1, [
      { center: -15.1, width: 2.2, bottom: 0, top: 2.55 },
    ], stuccoMat, 2.9);
  }
  buildWall('x', -14.5, 6.5, 12.5, [
    { center: 9.5, width: 2.0, bottom: 0, top: 2.55 },
  ], stuccoMat, 2.9);

  // Garden living room (functional second living room).
  addBox(group, carpetMat, 7.4, 0.07, 9.6, -8.7, 0.11, -15.4, false);
  for (const [x, z, sx, sz] of [
    [-8.7, -11.4, 6.0, 0.95],
    [-8.7, -19.2, 6.0, 0.95],
    [-12.0, -15.3, 0.95, 6.8],
  ] as const) {
    addBox(group, trimMat, sx, 0.6, sz, x, 0.4, z);
    addBox(group, whiteMat, sx * 0.84, 0.22, sz * 0.7, x, 0.78, z, false);
  }
  addBox(group, trimMat, 2.6, 0.35, 1.4, -8.7, 0.28, -15.2);
  addBox(group, blackMat, 3.0, 1.65, 0.16, -8.7, 1.85, -20.9);
  addBox(group, tvScreenMat, 2.7, 1.4, 0.04, -8.7, 1.85, -20.8, false);
  stationAt(
    'hill_house_living_garden',
    'house_couch',
    'Garden Living Room',
    'Second functional living room with fireplace TV',
    -8.7,
    GROUND_Y,
    -15.2,
    3.1,
    { x: -8.7, z: -14.1, yaw: 0 },
  );

  // Library with floor-to-ceiling shelves.
  addBox(group, carpetMat, 5.6, 0.07, 10.2, -1.5, 0.11, -15.2, false);
  for (let shelf = 0; shelf < 4; shelf++) {
    const z = -19.8 + shelf * 2.4;
    addBox(group, trimMat, 5.2, 2.6, 0.6, -1.5, 1.3, z);
    for (let row = 0; row < 4; row++) {
      for (let book = 0; book < 11; book++) {
        addBox(
          group,
          bedFabricMats[(row * 11 + book + shelf) % bedFabricMats.length],
          0.12,
          0.36,
          0.42,
          -3.9 + book * 0.44,
          0.5 + row * 0.55,
          z + 0.36,
          false,
        );
      }
    }
  }
  addBox(group, trimMat, 1.5, 0.45, 1.2, 0.2, 0.28, -13.4);
  addBox(group, carpetMat, 0.9, 0.5, 0.9, 0.2, 0.7, -13.4);
  addBox(group, lampMat, 0.18, 0.32, 0.18, 0.2, 1.4, -13.4, false);
  stationAt(
    'hill_house_library',
    'house_couch',
    'Read in the Library',
    'Floor-to-ceiling shelves and reading chair',
    0.2,
    GROUND_Y,
    -13.4,
    2.8,
    { x: 0.2, z: -13.5, yaw: 0 },
  );

  // Study with desk and built-in bookcase.
  addBox(group, carpetMat, 4.2, 0.07, 10.2, 4.0, 0.11, -15.2, false);
  addBox(group, trimMat, 2.8, 0.12, 1.2, 4.0, 0.9, -17.2);
  addBox(group, trimMat, 0.16, 0.85, 1.1, 4.0, 0.46, -17.2);
  addBox(group, trimMat, 0.8, 1.0, 0.8, 4.0, 0.52, -15.9);
  addBox(group, trimMat, 0.7, 2.5, 3.6, 5.6, 1.25, -12.8);
  for (let i = 0; i < 3; i++) {
    addBox(group, bedFabricMats[i + 3], 0.1, 0.36, 0.5, 5.25, 0.55 + i * 0.62, -13.7, false);
  }
  addBox(group, lampMat, 0.16, 0.28, 0.16, 4.75, 1.15, -16.8, false);
  stationAt(
    'hill_house_study',
    'house_couch',
    'Study at the Writing Desk',
    'Private study with desk, chair and bookshelf',
    4.0,
    GROUND_Y,
    -15.9,
    2.7,
    { x: 4.0, z: -15.9, yaw: 0 },
  );

  // Summer kitchen (second, separate kitchen) and tiki bar.
  addBox(group, tileMat, 5.8, 0.08, 5.6, 9.6, 0.12, -17.6, false);
  addBox(group, trimMat, 5.6, 0.9, 1.2, 9.6, 0.46, -19.8);
  addBox(group, marbleMat, 5.8, 0.12, 1.4, 9.6, 0.98, -19.8);
  addBox(group, blackMat, 0.9, 0.8, 0.7, 8.1, 0.55, -19.8);
  for (const dx of [-0.25, 0.25]) {
    addBox(group, fireMat, 0.18, 0.05, 0.18, 8.1 + dx, 1.04, -19.8, false);
  }
  addBox(group, chromeMat, 1.1, 1.9, 0.8, 12.2, 0.98, -19.8);
  addBox(group, marbleMat, 2.8, 0.12, 1.1, 10.4, 0.98, -16.6);
  addBox(group, trimMat, 2.8, 0.9, 1.1, 10.4, 0.46, -16.6);
  addBox(group, chromeMat, 0.5, 0.05, 0.4, 10.4, 1.06, -16.6, false);
  stationAt(
    'hill_house_summer_kitchen',
    'house_stove',
    'Cook in the Summer Kitchen',
    'Second full kitchen with range, prep island and refrigerator',
    10.4,
    GROUND_Y,
    -16.6,
    2.9,
  );

  // Thatched tiki bar with milk, food and stools.
  addBox(group, tileMat, 5.8, 0.08, 4.6, 9.6, 0.12, -11.6, false);
  addBox(group, trimMat, 5.4, 1.1, 0.9, 9.6, 0.6, -13.4);
  addBox(group, marbleMat, 5.7, 0.12, 1.1, 9.6, 1.2, -13.4);
  for (const x of [7.5, 9.1, 10.7, 12.3]) {
    addBox(group, trimMat, 0.5, 0.85, 0.5, x, 0.45, -11.7);
  }
  for (let i = 0; i < 4; i++) {
    addBox(group, roofMat, 5.8, 0.18, 0.9, 9.6, 3.15 + i * 0.12, -12.4 + i * 0.9);
  }
  for (let i = 0; i < 7; i++) {
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.24, 8),
      new THREE.MeshStandardMaterial({
        color: [0x38bdf8, 0xf59e0b, 0x22c55e, 0xef4444][i % 4],
        roughness: 0.25,
      }),
    );
    bottle.position.set(7.4 + i * 0.62, 1.38, -13.55);
    group.add(bottle);
  }
  addBox(group, whiteMat, 0.32, 0.55, 0.32, 12.0, 1.45, -13.55, false);
  addBox(group, whiteMat, 0.18, 0.1, 0.1, 11.92, 1.79, -13.55, false);
  addBox(group, goldMat, 0.22, 0.22, 0.22, 8.7, 1.36, -12.9, false);
  stationAt(
    'hill_house_tiki_bar',
    'house_fridge',
    'Order at the Tiki Bar',
    'Tropical bar with milk, food and cold drinks',
    9.6,
    GROUND_Y,
    -12.7,
    2.7,
  );

  // ---------- 16 guest suites across the second and third storeys ----------
  const roomCenters = [-9.3, -3.1, 3.1, 9.3];
  const suiteBoundaries = [-12.4, -6.2, 0, 6.2, 12.4];
  let suiteNumber = 1;
  for (const [floorIndex, floorY] of [
    [2, SECOND_Y],
    [3, THIRD_Y],
  ] as const) {
    // Corridor carpet and skirting.
    addBox(group, carpetMat, 25.6, 0.06, 4.4, 0, floorY + 0.04, 0, false);
    addBox(group, trimMat, 25.6, 0.16, 0.18, 0, floorY + 0.12, 2.35, false);
    addBox(group, trimMat, 25.6, 0.16, 0.18, 0, floorY + 0.12, -2.35, false);
    for (const side of [-1, 1] as const) {
      // Corridor wall with a real doorway into every suite.
      buildWall(
        'x',
        side * 2.65,
        -12.8,
        12.8,
        roomCenters.map((cx) => ({
          center: cx,
          width: 1.5,
          bottom: 0,
          top: 2.32,
        })),
        stuccoMat,
        2.9,
        floorY,
      );
      // Full-height party walls make all sixteen bedrooms private.
      const pz0 = Math.min(side * 2.65, side * 9.2);
      const pz1 = Math.max(side * 2.65, side * 9.2);
      for (const boundary of suiteBoundaries) {
        buildWall('z', boundary, pz0, pz1, [], stuccoMat, 2.9, floorY);
      }
      for (let col = 0; col < 4; col++) {
        const x = roomCenters[col];
        const z = side * 6;
        const fabric = bedFabricMats[suiteNumber - 1];
        const room = new THREE.Group();
        room.position.set(0, floorY, 0);
        room.name = `mansion-suite-${suiteNumber}`;
        group.add(room);
        addBox(room, carpetMat, 5.45, 0.05, 5.25, x, 0.03, z, false);
        // Door surround and operating door.
        addBox(group, trimMat, 0.14, 2.55, 0.2, x - 0.79, floorY + 1.27, side * 2.59);
        addBox(group, trimMat, 0.14, 2.55, 0.2, x + 0.79, floorY + 1.27, side * 2.59);
        addBox(group, goldMat, 1.82, 0.16, 0.22, x, floorY + 2.53, side * 2.59);
        const suiteDoorId = `mansion_suite_${suiteNumber}_door`;
        addSwingDoor(
          suiteDoorId,
          x - 0.7,
          floorY + 0.04,
          side * 2.64,
          1.4,
          'x',
          side === -1 ? 1.35 : -1.35,
        );
        stationAt(
          suiteDoorId,
          'house_door',
          `Open / Close Suite ${suiteNumber} Door`,
          'Private bedroom door · E to operate',
          x,
          floorY,
          side * 2.2,
          2.0,
        );
        // Bed against the outer wall, headboard facing the corridor.
        const bedZ = side < 0 ? -7.3 : 7.3;
        addBox(room, trimMat, 2.5, 0.34, 1.9, x - 0.9, 0.24, bedZ);
        addBox(room, fabric, 2.32, 0.28, 1.72, x - 0.9, 0.55, bedZ);
        addBox(room, whiteMat, 2.2, 0.12, 0.55, x - 0.9, 0.72, bedZ + side * 0.5, false);
        addBox(room, trimMat, 2.55, 1.15, 0.14, x - 0.9, 0.6, bedZ + side * 0.98);
        for (const dx of [-0.65, 0.65]) {
          const pillow = addBox(room, whiteMat, 0.62, 0.14, 0.48, x - 0.9 + dx, 0.74, bedZ - side * 0.45, false);
          pillow.rotation.x = side * 0.04;
        }
        const suiteLampMat = lampMat.clone();
        for (const dx of [-1.95, 0.15]) {
          addBox(room, trimMat, 0.52, 0.55, 0.5, x + dx, 0.3, bedZ + side * 0.8);
          const lamp = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.2, 0.34, 10), suiteLampMat);
          lamp.position.set(x + dx, 0.74, bedZ + side * 0.8);
          lamp.castShadow = false;
          room.add(lamp);
        }
        lights.push({
          id: `mansion_suite_${suiteNumber}_light`,
          material: suiteLampMat,
          on: true,
        });
        stationAt(
          `mansion_suite_${suiteNumber}_light`,
          'house_light',
          `Toggle Suite ${suiteNumber} Lighting`,
          'Bedside lamps and reading lights',
          x - 1.9,
          floorY,
          bedZ + side * 0.8,
          2.2,
        );

        // Enclosed en-suite bathroom with a real door, shower, WC and basin.
        const bathX = x + 1.85;
        const bathZ = side * 4.4;
        addBox(room, tileMat, 2.05, 0.05, 2.3, bathX, 0.04, bathZ, false);
        addBox(room, tileMat, 1.9, 0.06, 0.04, bathX, 0.3, bathZ + side * 1.12, false);
        // Outer, inner and east walls.
        addBox(room, glassMat, 2.05, 2.3, 0.07, bathX, 1.18, bathZ + side * 1.15, false);
        addBox(room, glassMat, 2.05, 2.3, 0.07, bathX, 1.18, bathZ - side * 1.15, false);
        addBox(room, glassMat, 0.07, 2.3, 2.3, bathX + 1.02, 1.18, bathZ, false);
        addColliderLine(bathX - 1.02, bathZ - side * 1.15, bathX + 1.02, bathZ - side * 1.15, 0.16, 0.45, floorY, floorY + 2.35);
        // West wall is split around a wide, genuinely passable door opening.
        const bathDoorWidth = 1.15;
        const bathDoorCenter = bathZ - 0.05;
        const bathDoorZ = bathDoorCenter - bathDoorWidth / 2;
        const bathSegA =
          side > 0
            ? [3.25, bathDoorCenter - bathDoorWidth / 2]
            : [bathDoorCenter + bathDoorWidth / 2, -3.25];
        const bathSegB =
          side > 0
            ? [bathDoorCenter + bathDoorWidth / 2, 5.55]
            : [-5.55, bathDoorCenter - bathDoorWidth / 2];
        addBox(room, glassMat, 0.07, 2.3, bathSegA[1] - bathSegA[0], bathX - 1.02, 1.18, (bathSegA[0] + bathSegA[1]) / 2);
        addBox(room, glassMat, 0.07, 2.3, bathSegB[1] - bathSegB[0], bathX - 1.02, 1.18, (bathSegB[0] + bathSegB[1]) / 2);
        addColliderLine(bathX - 1.02, bathSegA[0], bathX - 1.02, bathSegA[1], 0.06, 0.3, floorY, floorY + 2.35);
        addColliderLine(bathX - 1.02, bathSegB[0], bathX - 1.02, bathSegB[1], 0.06, 0.3, floorY, floorY + 2.35);
        addColliderLine(bathX + 1.02, bathZ - 1.15, bathX + 1.02, bathZ + 1.15, 0.08, 0.35, floorY, floorY + 2.35);
        addColliderLine(bathX - 1.02, bathZ + side * 1.15, bathX + 1.02, bathZ + side * 1.15, 0.08, 0.35, floorY, floorY + 2.35);
        const bathDoorId = `mansion_suite_${suiteNumber}_bath_door`;
        addSwingDoor(
          bathDoorId,
          bathX - 1.01,
          floorY + 0.04,
          bathDoorZ,
          bathDoorWidth,
          'z',
          1.35,
          glassMat,
        );
        stationAt(
          bathDoorId,
          'house_door',
          `Open / Close Suite ${suiteNumber} Bathroom Door`,
          'Frosted-glass en-suite door',
          bathX - 1.45,
          floorY,
          bathZ,
          1.9,
        );
        // Shower, WC and vanity.
        addBox(room, whiteMat, 0.82, 0.08, 0.82, bathX + 0.48, 0.05, bathZ + side * 0.55);
        addBox(room, chromeMat, 0.04, 2.0, 0.82, bathX + 0.08, 1.18, bathZ + side * 0.55, false);
        addBox(room, chromeMat, 0.06, 1.75, 0.06, bathX + 0.85, 1.05, bathZ + side * 0.92);
        const showerHead = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 0.04, 12), chromeMat);
        showerHead.position.set(bathX + 0.82, 1.96, bathZ + side * 0.92);
        room.add(showerHead);
        addBox(room, whiteMat, 0.55, 0.5, 0.62, bathX + 0.44, 0.28, bathZ - side * 0.55);
        addBox(room, whiteMat, 0.55, 0.55, 0.24, bathX + 0.44, 0.65, bathZ - side * 0.8);
        addBox(room, trimMat, 0.9, 0.82, 0.5, bathX - 0.26, 0.42, bathZ + side * 0.78);
        addBox(room, whiteMat, 0.74, 0.09, 0.38, bathX - 0.26, 0.87, bathZ + side * 0.78, false);
        const mirror = addBox(room, chromeMat, 0.62, 0.7, 0.025, bathX - 0.26, 1.55, bathZ + side * 1.02, false);
        mirror.material = chromeMat;
        stationAt(
          `mansion_suite_${suiteNumber}_wc`,
          'house_toilet',
          `Use Suite ${suiteNumber} Private WC`,
          'Enclosed toilet · E to sit',
          bathX + 0.44,
          floorY,
          bathZ - side * 0.55,
          1.7,
          { x: bathX + 0.44, z: bathZ - side * 0.2, yaw: side < 0 ? 0 : Math.PI },
        );
        stationAt(
          `mansion_suite_${suiteNumber}_sink`,
          'house_sink',
          `Use Suite ${suiteNumber} Vanity`,
          'Drink fresh water and refill bottles',
          bathX - 0.26,
          floorY,
          bathZ + side * 0.78,
          1.7,
        );
        stationAt(
          `mansion_suite_${suiteNumber}_bath`,
          'house_shower',
          `Shower in Suite ${suiteNumber} Bathroom`,
          'Walk-in rain shower · restores health and stamina',
          bathX + 0.56,
          floorY,
          bathZ + side * 0.55,
          1.9,
        );

        // Walk-in wardrobe with two operating doors.
        const wardrobeZ = z + (side < 0 ? 0.2 : -0.2);
        addBox(room, trimMat, 0.72, 2.25, 2.5, x - 2.45, 1.12, wardrobeZ);
        addBox(room, goldMat, 0.06, 2.18, 2.42, x - 2.08, 1.1, wardrobeZ, false);
        const wardrobePivot = new THREE.Group();
        wardrobePivot.position.set(x - 2.04, floorY + 0.08, wardrobeZ - 1.22);
        const wardrobePanel = addBox(wardrobePivot, trimMat, 0.07, 2.04, 1.18, 0, 1.02, 0.59);
        wardrobePanel.castShadow = true;
        addBox(wardrobePivot, goldMat, 0.09, 0.5, 0.08, 0.06, 1.03, 1.06, false);
        wardrobePivot.traverse((child) => {
          child.userData.noStaticMerge = true;
          child.userData.dynamic = true;
        });
        group.add(wardrobePivot);
        const wardrobeId = `mansion_suite_${suiteNumber}_wardrobe`;
        wardrobes.push({
          id: wardrobeId,
          pivot: wardrobePivot,
          openAngle: side === -1 ? 1.48 : -1.48,
          open: false,
        });
        stationAt(
          wardrobeId,
          'house_wardrobe',
          `Open Suite ${suiteNumber} Wardrobe`,
          'Store, retrieve and wear clothing or equipment',
          x - 1.9,
          floorY,
          wardrobeZ,
          2.0,
        );

        // Luggage bench, rug and framed art.
        addBox(room, trimMat, 1.5, 0.45, 0.5, x + 1.7, 0.25, side * 3.7);
        const art = new THREE.Mesh(
          new THREE.BoxGeometry(1.6, 0.9, 0.06),
          new THREE.MeshStandardMaterial({
            color: bedFabricColors[suiteNumber - 1],
            roughness: 0.7,
          }),
        );
        art.position.set(x, 1.9, side * 8.95);
        room.add(art);
        addBox(room, goldMat, 1.78, 0.08, 0.1, x, 2.42, side * 8.92, false);
        addBox(room, goldMat, 1.78, 0.08, 0.1, x, 1.38, side * 8.92, false);

        stationAt(
          `mansion_suite_${suiteNumber}_bed`,
          'house_bed',
          `Sleep in Mansion Suite ${suiteNumber}`,
          `${floorIndex === 2 ? 'Second' : 'Third'} storey · king bed and en-suite`,
          x - 0.9,
          floorY,
          bedZ + side * 0.2,
          3.0,
        );
        suiteNumber += 1;
      }
    }
  }

  // Third-floor landing lounge.
  addBox(group, carpetMat, 5.0, 0.06, 3.4, 0, THIRD_Y + 0.04, 0, false);
  for (const side of [-1, 1]) {
    addBox(group, trimMat, 2.0, 0.55, 0.9, side * 2.2, THIRD_Y + 0.35, 0.2);
    addBox(group, whiteMat, 1.8, 0.2, 0.74, side * 2.2, THIRD_Y + 0.6, 0.2, false);
  }
  addBox(group, trimMat, 1.4, 0.3, 0.8, 0, THIRD_Y + 0.22, 0.2);

  // ---------- north recreation wing: game room, arcade, Xbox, theatre ----------
  const recZ0 = -35.4;
  const recZ1 = -21.2;
  addBox(group, stoneMat, 27.0, 1.1, 14.8, 0, -0.44, (recZ0 + recZ1) / 2);
  addBox(group, woodFloorMat, 26.4, 0.18, 14.2, 0, 0.02, (recZ0 + recZ1) / 2, false);
  addBox(group, carpetMat, 13.2, 0.08, 13.0, -6.2, 0.12, (recZ0 + recZ1) / 2, false);
  buildWall('x', recZ0, -13.2, 13.2, [
    { center: -8.0, width: 2.2, bottom: 0.9, top: 3.7 },
    { center: 0, width: 2.2, bottom: 0.9, top: 3.7 },
    { center: 8.0, width: 2.2, bottom: 0.9, top: 3.7 },
  ], stuccoMat, 4.8);
  buildWall('x', recZ1, -13.2, 13.2, [
    { center: 0, width: 4.2, bottom: 0, top: 2.9 },
  ], stuccoMat, 4.8);
  buildWall('z', -13.2, recZ0, recZ1, [
    { center: -31.6, width: 2.2, bottom: 0, top: 2.7 },
  ], stuccoMat, 4.8);
  buildWall('z', 13.2, recZ0, recZ1, [
    { center: -28.2, width: 2.8, bottom: 0, top: 2.7 },
  ], stuccoMat, 4.8);
  addBox(group, stuccoMat, 26.8, 0.65, 0.34, 0, 4.15, recZ1);
  addHipRoof(group, roofTileMat, 28.8, 16.6, 3.1, 0, 4.8, (recZ0 + recZ1) / 2);
  addBox(group, stoneTrimMat, 26.8, 0.26, 0.4, 0, 4.72, recZ1 + 0.12);
  addBox(group, stoneTrimMat, 26.8, 0.26, 0.4, 0, 4.72, recZ0 - 0.12);
  for (const x of [-10.4, -5.2, 0, 5.2, 10.4]) {
    addWindow(group, x, 2.35, recZ0 + 0.02, 2.4, 2.0, 'z', false);
  }
  for (const z of [-33.3, -28.2, -23.1]) {
    addWindow(group, -13.18, 2.35, z, 1.8, 2.0, 'x', false);
    addWindow(group, 13.18, 2.35, z, 1.8, 2.0, 'x', false);
  }
  addBox(group, glassMat, 2.8, 2.65, 0.07, 13.18, 1.36, -28.2, false);
  addBox(group, trimMat, 3.0, 0.24, 0.16, 13.12, 2.72, -28.2);
  for (const x of [-11.4, -7.6, -3.8, 0, 3.8, 7.6, 11.4]) {
    addBox(group, trimMat, 0.28, 4.6, 0.28, x, 2.3, recZ1 + 2.2);
    addBox(group, goldMat, 0.4, 0.16, 0.4, x, 4.55, recZ1 + 2.2);
  }
  // Coffered ceiling and warm/cool light mix.
  for (const z of [-33.0, -28.2, -23.4]) {
    addBox(group, trimMat, 26.0, 0.18, 0.28, 0, 4.48, z);
  }
  for (const x of [-8.8, -4.4, 0, 4.4, 8.8]) {
    addBox(group, trimMat, 0.24, 0.18, 13.0, x, 4.48, -28.3);
  }
  for (const [x, z] of [[-6.2, -28.2], [2.0, -28.2], [9.0, -28.2]]) {
    const pendant = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.26, 0.5, 12),
      lampMat,
    );
    pendant.position.set(x, 3.62, z);
    group.add(pendant);
    addBox(group, copperMat, 0.05, 0.85, 0.05, x, 4.12, z, false);
  }

  // Regulation-size pool table with rails, pockets, balls and cues.
  const feltMat = new THREE.MeshStandardMaterial({ color: 0x0f5a42, roughness: 0.95 });
  const railMat2 = new THREE.MeshStandardMaterial({ color: 0x5b2f19, roughness: 0.5 });
  addBox(group, railMat2, 3.3, 0.24, 1.9, 2.1, 0.82, -28.2);
  addBox(group, feltMat, 2.9, 0.06, 1.5, 2.1, 0.96, -28.2, false);
  for (const [x, z] of [[-0.45, -0.7], [0.45, -0.7], [-0.45, 0.7], [0.45, 0.7]]) {
    addBox(group, railMat2, 0.18, 0.78, 0.18, 2.1 + x, 0.42, -28.2 + z);
  }
  for (const [dx, dz] of [[-1.62, -0.92], [0, -0.92], [1.62, -0.92], [-1.62, 0.92], [0, 0.92], [1.62, 0.92]]) {
    const pocket = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.08, 12), blackMat);
    pocket.position.set(2.1 + dx, 0.98, -28.2 + dz);
    group.add(pocket);
  }
  const ballColors = [0xf8fafc, 0xfacc15, 0x1d4ed8, 0xdc2626, 0x7c3aed, 0xf97316, 0x15803d, 0x7f1d1d, 0x111827];
  for (let i = 0; i < 15; i++) {
    const ball = new THREE.Mesh(
      new THREE.SphereGeometry(0.055, 12, 10),
      new THREE.MeshStandardMaterial({ color: ballColors[i % ballColors.length], roughness: 0.22, metalness: 0.1 }),
    );
    ball.position.set(2.7 + (i % 5) * 0.12, 1.02, -28.2 + (i % 3) * 0.08 - ((i % 5) % 2) * 0.04);
    group.add(ball);
  }
  addBox(group, trimMat, 0.08, 0.08, 2.7, 4.2, 1.02, -29.6);
  stationAt(
    'mansion_pool_table',
    'house_pool_table',
    'Play the Mansion Pool Table',
    'Full 8-ball table · aim, break and pot balls',
    3.9,
    GROUND_Y,
    -28.2,
    3.0,
  );
  // Spectator chairs and trophy cabinet.
  for (const x of [0.2, 3.9]) {
    addBox(group, bedFabricMats[0], 1.1, 0.5, 1.0, x, 0.42, -25.9);
    addBox(group, trimMat, 1.1, 0.9, 0.16, x, 0.75, -25.45);
  }
  addBox(group, trimMat, 2.8, 2.6, 0.45, -2.0, 1.3, -34.9);
  for (let i = 0; i < 3; i++) {
    addBox(group, goldMat, 0.45, 0.6, 0.22, -3.0 + i * 0.9, 1.45, -34.62, false);
  }

  // Arcade bank with glowing, individually usable cabinets.
  const makeArcadeScreen = (name: string, color: string): THREE.MeshBasicMaterial => {
    if (typeof document === 'undefined') {
      return new THREE.MeshBasicMaterial({ color: 0x0f172a });
    }
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 96;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#070b1a';
      ctx.fillRect(0, 0, 128, 96);
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      for (let i = 0; i < 10; i++) {
        ctx.fillStyle = i % 2 ? color : '#f8fafc';
        ctx.fillRect(12 + i * 10, 40 + (i % 3) * 8, 7, 7);
      }
      ctx.fillStyle = color;
      ctx.font = 'bold 13px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(name, 64, 76);
    }
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
  };
  const arcadeDefs = [
    ['NIGHT RUNNER', '#22d3ee'],
    ['BAYOU BLASTER', '#f97316'],
    ['NEON KART', '#a855f7'],
    ['GATOR PANIC', '#22c55e'],
  ] as const;
  arcadeDefs.forEach(([name, color], i) => {
    const cz = -32.9 + i * 2.15;
    const neon = new THREE.MeshStandardMaterial({
      color: new THREE.Color(color),
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.85,
      roughness: 0.35,
    });
    addBox(group, blackMat, 1.25, 2.0, 0.78, -11.75, 1.12, cz);
    addBox(group, neon, 1.05, 0.3, 0.08, -11.75, 2.0, cz + 0.37, false);
    for (const side of [-1, 1]) {
      addBox(group, neon, 0.08, 1.15, 0.08, -11.75 + side * 0.52, 1.7, cz + 0.37, false);
    }
    const screen = new THREE.Mesh(new THREE.PlaneGeometry(0.92, 0.62), makeArcadeScreen(name, color));
    screen.position.set(-11.75, 1.62, cz + 0.405);
    group.add(screen);
    addBox(group, chromeMat, 0.95, 0.12, 0.42, -11.75, 1.03, cz + 0.52);
    const stick = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.2, 8), blackMat);
    stick.position.set(-12.0, 1.18, cz + 0.55);
    group.add(stick);
    for (let b = 0; b < 3; b++) {
      const button = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.04, 10), neon);
      button.position.set(-11.65 + b * 0.13, 1.11, cz + 0.55);
      group.add(button);
    }
    stationAt(
      `mansion_arcade_${i + 1}`,
      'house_arcade',
      `Play ${name}`,
      'Arcade cabinet · real playable mini-game',
      -10.9,
      GROUND_Y,
      cz,
      2.1,
    );
  });
  const arcadeGlow = new THREE.PointLight(0x38bdf8, 1.4, 9, 1.6);
  arcadeGlow.position.set(-9.8, 3.0, -29.0);
  group.add(arcadeGlow);

  // Xbox lounge with a huge interactive TV, console, controllers and sofas.
  addBox(group, trimMat, 4.6, 2.5, 0.3, 8.8, 2.2, -35.0);
  addBox(group, blackMat, 4.15, 2.1, 0.12, 8.8, 2.2, -34.8);
  const gameScreenMat = new THREE.MeshStandardMaterial({
    color: 0x0b1220,
    emissive: 0x1d4ed8,
    emissiveIntensity: 0.55,
    roughness: 0.22,
  });
  addBox(group, gameScreenMat, 3.9, 1.9, 0.04, 8.8, 2.2, -34.73, false);
  addBox(group, blackMat, 0.95, 0.18, 0.55, 8.8, 0.52, -34.25);
  addBox(group, new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.35 }), 0.68, 0.04, 0.38, 8.8, 0.63, -34.25, false);
  addBox(group, chromeMat, 0.07, 0.06, 0.32, 9.0, 0.68, -34.25, false);
  for (const [x, z, yaw] of [[8.0, -32.3, 0], [9.8, -32.3, 0]] as const) {
    const controller = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.2), blackMat);
    controller.position.set(x, 0.63, z);
    controller.rotation.y = yaw;
    group.add(controller);
  }
  for (const side of [-1, 1]) {
    addBox(group, bedFabricMats[3], 2.3, 0.55, 1.1, 8.8 + side * 2.2, 0.45, -30.4);
    addBox(group, trimMat, 2.3, 0.85, 0.2, 8.8 + side * 2.2, 0.75, -29.9);
    addBox(group, trimMat, 2.3, 0.35, 0.2, 8.8 + side * 2.2, 0.72, -30.9);
  }
  addBox(group, trimMat, 3.2, 0.35, 1.6, 8.8, 0.36, -28.8);
  addBox(group, carpetMat, 6.3, 0.06, 4.0, 8.8, 0.13, -31.0, false);
  stationAt(
    'mansion_xbox',
    'house_xbox',
    'Use the Mansion Xbox',
    'Console dashboard and playable couch game',
    8.8,
    GROUND_Y,
    -34.0,
    3.0,
  );
  stationAt(
    'mansion_game_room_tv',
    'house_tv',
    'Watch the Game Room TV',
    'Interactive television · channels and streaming',
    9.5,
    GROUND_Y,
    -33.0,
    3.0,
  );

  // Home theatre / lounge on the west side.
  addBox(group, trimMat, 8.0, 2.9, 0.28, -7.0, 2.0, recZ0 + 0.25);
  addBox(group, blackMat, 7.55, 2.55, 0.1, -7.0, 2.0, recZ0 + 0.45);
  const cinemaMat = new THREE.MeshStandardMaterial({
    color: 0x1e1b4b,
    emissive: 0x4338ca,
    emissiveIntensity: 0.45,
    roughness: 0.25,
  });
  addBox(group, cinemaMat, 7.2, 2.25, 0.04, -7.0, 2.0, recZ0 + 0.52, false);
  for (let row = 0; row < 2; row++) {
    for (const x of [-9.4, -7.0, -4.6]) {
      addBox(group, bedFabricMats[5], 1.55, 0.6, 1.25, x, 0.45, -32.8 + row * 2.0);
      addBox(group, trimMat, 1.55, 0.9, 0.2, x, 0.75, -33.35 + row * 2.0);
    }
  }
  stationAt(
    'mansion_home_theatre',
    'house_couch',
    'Sit in the Mansion Theatre',
    'Ten-seat private cinema with 4K screen',
    -7.0,
    GROUND_Y,
    -31.4,
    2.8,
    { x: -7.0, z: -31.0, yaw: 0 },
  );

  // A wet bar / lounge at the pavilion threshold.
  addBox(group, trimMat, 5.4, 1.1, 1.1, 3.2, 0.62, -22.2);
  addBox(group, marbleMat, 5.6, 0.14, 1.25, 3.2, 1.22, -22.2);
  for (const x of [1.5, 3.2, 4.9]) {
    addBox(group, trimMat, 0.55, 0.9, 0.55, x, 0.45, -20.6);
  }
  for (let i = 0; i < 5; i++) {
    const bottle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.05, 0.05, 0.28, 8),
      new THREE.MeshStandardMaterial({ color: [0x22d3ee, 0xf59e0b, 0x22c55e, 0xef4444, 0xa855f7][i], roughness: 0.22 }),
    );
    bottle.position.set(1.2 + i * 0.55, 1.43, -22.45);
    group.add(bottle);
  }
  stationAt(
    'mansion_game_lounge',
    'house_couch',
    'Relax in the Games Lounge',
    'Wet bar, pool table, arcade and console lounge',
    3.2,
    GROUND_Y,
    -22.9,
    3.0,
    { x: 3.2, z: -22.6, yaw: 0 },
  );

  // ---------- outdoor swimming pool and terrace ----------
  const poolCx = 23.0;
  const poolCz = -28.4;
  addBox(group, stoneMat, 4.4, 0.28, 15.4, 16.4, 0.06, -28.3, false);
  addBox(group, stoneMat, 4.8, 0.28, 15.4, 29.9, 0.06, -28.3, false);
  addBox(group, stoneMat, 9.0, 0.28, 3.0, 23.0, 0.06, -34.6, false);
  addBox(group, stoneMat, 9.0, 0.28, 3.0, 23.0, 0.06, -22.0, false);
  addBox(group, tileMat, 5.6, 0.04, 13.8, 16.0, 0.24, -28.3, false);
  addBox(group, tileMat, 5.0, 0.04, 13.8, 30.3, 0.24, -28.3, false);
  addBox(group, tileMat, 9.6, 0.04, 4.3, 23.2, 0.24, -35.1, false);
  addBox(group, tileMat, 9.6, 0.04, 4.3, 23.2, 0.24, -21.5, false);
  addBox(group, poolMat, 9.0, 0.06, 9.5, poolCx, -0.2, poolCz, false);
  // Basin walls and floor.
  addBox(group, tileMat, 9.6, 1.8, 0.45, poolCx, -1.0, poolCz - 5.0, false);
  addBox(group, tileMat, 9.6, 1.8, 0.45, poolCx, -1.0, poolCz + 5.0, false);
  addBox(group, tileMat, 0.45, 1.8, 10.0, poolCx - 4.8, -1.0, poolCz, false);
  addBox(group, tileMat, 0.45, 1.8, 10.0, poolCx + 4.8, -1.0, poolCz, false);
  addBox(group, tileMat, 9.2, 0.3, 9.7, poolCx, -1.85, poolCz, false);
  addBox(group, whiteMat, 9.7, 0.16, 0.5, poolCx, 0.28, poolCz - 5.05);
  addBox(group, whiteMat, 9.7, 0.16, 0.5, poolCx, 0.28, poolCz + 5.05);
  addBox(group, whiteMat, 0.5, 0.16, 10.1, poolCx - 4.85, 0.28, poolCz);
  addBox(group, whiteMat, 0.5, 0.16, 10.1, poolCx + 4.85, 0.28, poolCz);
  // Steps into the shallow end.
  for (let i = 0; i < 3; i++) {
    addBox(group, whiteMat, 2.6, 0.22, 1.1, 18.9, -0.35 - i * 0.45, -31.8 + i * 0.9, false);
  }
  stationAt(
    'mansion_outdoor_pool',
    'house_pool',
    'Swim in the Outdoor Pool',
    'Enter the heated pool · swim, dive and surface for air',
    18.9,
    GROUND_Y,
    -31.8,
    3.0,
  );
  stationAt(
    'mansion_pool_exit',
    'house_pool_exit',
    'Climb Out of the Pool',
    'Use the shallow-end steps',
    17.6,
    GROUND_Y,
    -28.4,
    4.5,
  );
  // Loungers, cabanas and pergola.
  for (let i = 0; i < 4; i++) {
    addBox(group, whiteMat, 0.9, 0.28, 2.1, 28.4, 0.35, -33.5 + i * 2.1);
    addBox(group, whiteMat, 0.9, 0.18, 0.65, 28.4, 0.56, -34.35 + i * 2.1);
    addBox(group, chromeMat, 0.06, 0.34, 0.06, 28.0, 0.2, -33.0 + i * 2.1);
    addBox(group, chromeMat, 0.06, 0.34, 0.06, 28.8, 0.2, -33.0 + i * 2.1);
  }
  for (const z of [-34.2, -22.6]) {
    addBox(group, trimMat, 5.0, 0.2, 3.0, 16.2, 3.0, z);
    for (const x of [14.0, 18.4]) {
      addBox(group, stoneTrimMat, 0.28, 3.0, 0.28, x, 1.5, z);
    }
    addBox(group, whiteMat, 4.4, 0.14, 2.5, 16.2, 0.23, z, false);
  }
  for (const [x, z] of [[15.0, -35.6], [31.0, -35.6], [15.0, -21.0], [31.0, -21.0], [31.8, -28.3]]) {
    const planter = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.85, 12), stoneTrimMat);
    planter.position.set(x, 0.63, z);
    group.add(planter);
    const topiary = new THREE.Mesh(new THREE.SphereGeometry(0.72, 14, 12), new THREE.MeshStandardMaterial({ color: 0x1f5a37, roughness: 0.9 }));
    topiary.position.set(x, 1.55, z);
    group.add(topiary);
  }
  addBox(group, stoneTrimMat, 9.5, 0.22, 9.9, 23.0, 0.1, -40.2);
  addBox(group, poolMat, 5.2, 0.06, 5.2, 23.0, 0.24, -40.2, false);
  for (const [x, z] of [[20.6, -40.2], [25.4, -40.2], [23.0, -42.8], [23.0, -37.6]]) {
    addBox(group, stoneTrimMat, 0.5, 0.7, 0.5, x, 0.45, z);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 8), lampMat);
    orb.position.set(x, 0.9, z);
    group.add(orb);
  }

  // ---------- arrival court, fountain, landscaping and exterior lighting ----------
  addBox(group, stoneMat, 8.4, 0.12, 6.8, 18.6, 0.07, 6.5, false);
  addBox(group, stoneTrimMat, 2.8, 0.5, 2.8, 18.6, 0.3, 6.5);
  addBox(group, poolMat, 2.2, 0.06, 2.2, 18.6, 0.56, 6.5, false);
  const fountainColumn = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.36, 1.7, 12), stoneTrimMat);
  fountainColumn.position.set(18.6, 1.35, 6.5);
  group.add(fountainColumn);
  const fountainBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.95, 0.55, 0.28, 18), stoneTrimMat);
  fountainBowl.position.set(18.6, 2.18, 6.5);
  group.add(fountainBowl);
  addBox(group, poolMat, 0.16, 1.0, 0.16, 18.6, 2.75, 6.5, false);
  for (const side of [-1, 1]) {
    addBox(group, stoneTrimMat, 0.75, 3.6, 0.75, 14.0, 1.8, 6.5 + side * 2.3);
    addBox(group, goldMat, 0.95, 0.18, 0.95, 14.0, 3.62, 6.5 + side * 2.3);
  }
  addBox(group, roofMat, 4.8, 0.36, 5.4, 15.0, 4.0, 6.5);
  addBox(group, goldMat, 4.9, 0.06, 5.5, 15.0, 3.83, 6.5, false);
  // Clipped hedge along the arrival court.
  for (let i = 0; i < 7; i++) {
    const z = 2.0 + i * 2.15;
    addBox(group, new THREE.MeshStandardMaterial({ color: 0x1f4d2e, roughness: 0.95 }), 1.8, 0.9, 0.8, 23.6, 0.45, z);
  }
  for (let i = 0; i < 5; i++) {
    const z = -18 + i * 7.2;
    addBox(group, stoneMat, 1.0, 0.12, 5.8, 13.2, 0.1, z, false);
    addBox(group, stoneTrimMat, 0.7, 3.0, 0.7, 12.8, 1.5, z - 2.6);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), lampMat);
    globe.position.set(12.8, 3.15, z - 2.6);
    group.add(globe);
  }
  // Formal parterre garden with flowers and topiary.
  for (let i = 0; i < 6; i++) {
    const x = -6.0 + (i % 3) * 6.0;
    const z = -44.0 + Math.floor(i / 3) * 4.8;
    addBox(group, stoneTrimMat, 5.0, 0.24, 3.9, x, 0.1, z, false);
    addBox(group, new THREE.MeshStandardMaterial({ color: 0x153b27, roughness: 0.96 }), 4.5, 0.45, 3.4, x, 0.3, z, false);
    for (let f = 0; f < 8; f++) {
      const flower = new THREE.Mesh(
        new THREE.SphereGeometry(0.11, 7, 6),
        new THREE.MeshStandardMaterial({ color: [0xf472b6, 0xfacc15, 0xf8fafc, 0xa855f7][f % 4], roughness: 0.7 }),
      );
      flower.position.set(x - 1.7 + (f % 4) * 1.1, 0.58, z - 1.0 + Math.floor(f / 4) * 1.8);
      group.add(flower);
    }
  }
  // Driveway lamps follow the existing hill ramp down to the east.
  for (let i = 0; i < 6; i++) {
    const wx = -69.5 + i * 2.3;
    const wz = 128 - 3.7;
    const gy = getTerrainHeight(wx, wz) - HILL_HOUSE_Y;
    addBox(group, stoneTrimMat, 0.42, 2.1, 0.42, wx - worldX, gy + 1.05, wz - worldZ);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.17, 10, 8), lampMat);
    globe.position.set(wx - worldX, gy + 2.25, wz - worldZ);
    group.add(globe);
    addColliderLine(wx - worldX, wz - worldZ, wx - worldX, wz - worldZ, 0.35, 1);
  }
  for (const [x, z] of [[-14.5, -19.5], [14.5, -19.5], [-14.5, 10.5], [14.5, 10.5]]) {
    addBox(group, stoneTrimMat, 0.45, 2.8, 0.45, x, 1.4, z);
    const globe = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), lampMat);
    globe.position.set(x, 3.0, z);
    group.add(globe);
  }
  const exteriorLight = new THREE.PointLight(0xffd6a0, 2.2, 28, 1.6);
  exteriorLight.position.set(0, 5.0, 14.5);
  group.add(exteriorLight);

  // ---------- maid NPCs ----------
  const maids: MansionMaidHandle[] = [];
  const makeMaid = (definition: MaidDefinition): MansionMaidHandle => {
    const maid = new THREE.Group();
    maid.name = `mansion-maid-${definition.id}`;
    const skirtMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.82 });
    const blouseMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
    const apronMat = new THREE.MeshStandardMaterial({
      color: definition.uniform === 'detailer' ? 0x334155 : 0xffffff,
      roughness: 0.75,
    });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x8d5524, roughness: 0.72 });
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x1a1210, roughness: 0.9 });
    const shoeMat = new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.6 });

    const legs = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.62, 0.28), skirtMat);
    legs.position.y = 0.31;
    const skirt = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.5, 10), skirtMat);
    skirt.position.y = 0.72;
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.58, 0.3), blouseMat);
    torso.position.y = 1.18;
    const apron = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.66, 0.08), apronMat);
    apron.position.set(0, 0.98, 0.17);
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.2, 14, 12), skinMat);
    head.position.y = 1.66;
    const hair = new THREE.Mesh(new THREE.SphereGeometry(0.21, 12, 10), hairMat);
    hair.scale.set(1.05, 0.9, 1.02);
    hair.position.set(0, 1.72, -0.03);
    const bun = new THREE.Mesh(new THREE.SphereGeometry(0.11, 10, 8), hairMat);
    bun.position.set(0, 1.84, -0.16);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 0.1, 12), apronMat);
    cap.position.y = 1.86;
    const shoulderL = new THREE.Group();
    shoulderL.position.set(-0.33, 1.38, 0);
    const armL = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.15), blouseMat);
    armL.position.y = -0.27;
    const handL = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), skinMat);
    handL.position.y = -0.56;
    shoulderL.add(armL, handL);
    const shoulderR = new THREE.Group();
    shoulderR.position.set(0.33, 1.38, 0);
    const armR = new THREE.Mesh(new THREE.BoxGeometry(0.15, 0.55, 0.15), blouseMat);
    armR.position.y = -0.27;
    const handR = new THREE.Mesh(new THREE.SphereGeometry(0.085, 8, 8), skinMat);
    handR.position.y = -0.56;
    shoulderR.add(armR, handR);
    maid.add(legs, skirt, torso, apron, head, hair, bun, cap, shoulderL, shoulderR);

    // Role prop in the right hand.
    if (definition.uniform === 'classic') {
      const tray = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.035, 14), chromeMat);
      tray.position.set(0.06, -0.62, 0.16);
      shoulderR.add(tray);
      const glass = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.16, 8), glassMat);
      glass.position.set(0.06, -0.52, 0.16);
      shoulderR.add(glass);
    } else if (definition.uniform === 'housekeeping' || definition.uniform === 'laundry') {
      const broom = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3, 6), trimMat);
      broom.position.set(0.06, -0.88, 0.18);
      broom.rotation.z = 0.16;
      shoulderR.add(broom);
      const headBroom = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.18), goldMat);
      headBroom.position.set(0.17, -1.5, 0.18);
      shoulderR.add(headBroom);
    } else if (definition.uniform === 'detailer') {
      const rag = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.06, 0.26), apronMat);
      rag.position.set(0.04, -0.6, 0.1);
      shoulderR.add(rag);
      const spray = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.28, 8), apronMat);
      spray.position.set(-0.26, -0.5, 0.08);
      shoulderL.add(spray);
    } else {
      const wrench = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.46, 0.05), chromeMat);
      wrench.position.set(0.04, -0.84, 0.12);
      shoulderR.add(wrench);
    }

    for (const object of [maid]) {
      object.traverse((child) => {
        child.userData.noStaticMerge = true;
        child.userData.dynamic = true;
        if (child instanceof THREE.Mesh) {
          child.castShadow = true;
          child.receiveShadow = false;
        }
      });
    }
    const start = definition.route[0];
    maid.position.set(start.x, start.y, start.z);
    group.add(maid);
    const handle: MansionMaidHandle = {
      definition,
      group: maid,
      armL: shoulderL,
      armR: shoulderR,
      startX: start.x,
      startY: start.y,
      startZ: start.z,
    };
    maids.push(handle);
    return handle;
  };
  for (const definition of MANSION_MAIDS) makeMaid(definition);

  // ---------- superhuman coaster display on the east lawn ----------
  const coasterDisplay = new THREE.Group();
  coasterDisplay.name = 'mansion-coaster-display';
  const coasterX = 16.4;
  const coasterZ = 7.4;
  coasterDisplay.position.set(coasterX, GROUND_Y, coasterZ);
  const railMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4, metalness: 0.5 });
  const railDark = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.5, metalness: 0.55 });
  for (const side of [-1, 1]) {
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.14, 7.0), railMat);
    rail.position.set(side * 0.55, 0.55, 0);
    coasterDisplay.add(rail);
  }
  for (let i = 0; i < 5; i++) {
    const z = -3.0 + i * 1.5;
    const support = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.55 + i * 0.16, 0.14), railDark);
    support.position.set(0, (0.55 + i * 0.16) / 2, z);
    coasterDisplay.add(support);
    const tie = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.09, 0.12), railDark);
    tie.position.set(0, 0.55 + i * 0.16, z);
    coasterDisplay.add(tie);
  }
  const car = new THREE.Group();
  const carBody = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.5, 1.6), railMat);
  carBody.position.y = 0.96;
  const carNose = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.14, 0.5), railDark);
  carNose.position.set(0, 0.76, 0.95);
  car.add(carBody, carNose);
  for (const side of [-1, 1]) {
    for (const z of [-0.5, 0.5]) {
      const wheel = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.1, 10), railDark);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(side * 0.6, 0.72, z);
      car.add(wheel);
    }
  }
  coasterDisplay.add(car);
  const coasterSign = new THREE.Mesh(
    new THREE.BoxGeometry(3.0, 0.5, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0xf97316,
      emissive: 0x9a3412,
      emissiveIntensity: 0.4,
      roughness: 0.4,
    }),
  );
  coasterSign.position.set(0, 2.1, -3.4);
  coasterDisplay.add(coasterSign);
  coasterDisplay.traverse((object) => {
    object.userData.noStaticMerge = true;
    object.userData.dynamic = true;
  });
  group.add(coasterDisplay);
  stationAt(
    'mansion_maid_feat',
    'house_couch',
    'Watch Bianca Move the Coaster',
    `One hand · ${COASTER_RELOCATION_METERS.toFixed(1)} m (${COASTER_RELOCATION_FEET.toLocaleString()} ft) away from the waterpark`,
    16.4,
    GROUND_Y,
    7.4,
    3.2,
  );

  return {
    group,
    colliders,
    stations,
    maids,
    doors,
    wardrobes,
    lights,
    coasterDisplay,
    coasterBase: { x: coasterX, y: GROUND_Y, z: coasterZ },
    poolWaterMat: poolMat,
  };
}
