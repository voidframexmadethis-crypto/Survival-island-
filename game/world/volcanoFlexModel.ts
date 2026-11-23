import * as THREE from 'three';
import {
  VOLCANO_FLEX_HEIGHT_M,
  VOLCANO_FLEX_LOCAL_CHAMBER,
  VOLCANO_FLEX_NAME,
  getVolcanoFlexSite,
} from './volcanoFlexLayout';

export interface VolcanoFlexEnvironment {
  root: THREE.Group;
  update: (dt: number, elapsed: number, speedKmh: number) => void;
  /** Hides the costly palms, elevator and detail lighting at long range. */
  setDetailVisible: (visible: boolean) => void;
  dispose: () => void;
}

function seeded(index: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

interface BeamSpec {
  start: THREE.Vector3;
  end: THREE.Vector3;
  radius: number;
}

const UP = new THREE.Vector3(0, 1, 0);

function makeBeamInstances(
  beams: BeamSpec[],
  material: THREE.Material,
  name: string,
): THREE.InstancedMesh {
  const geometry = new THREE.CylinderGeometry(1, 1, 1, 6);
  const mesh = new THREE.InstancedMesh(geometry, material, beams.length);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  const midpoint = new THREE.Vector3();
  const direction = new THREE.Vector3();
  const quaternion = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const matrix = new THREE.Matrix4();
  beams.forEach((beam, index) => {
    direction.subVectors(beam.end, beam.start);
    const length = direction.length();
    if (length < 0.001) return;
    midpoint.addVectors(beam.start, beam.end).multiplyScalar(0.5);
    quaternion.setFromUnitVectors(UP, direction.normalize());
    scale.set(beam.radius, length, beam.radius);
    matrix.compose(midpoint, quaternion, scale);
    mesh.setMatrixAt(index, matrix);
  });
  mesh.instanceMatrix.needsUpdate = true;
  return mesh;
}

function buildPalmTree(
  index: number,
  height: number,
  trunkMaterial: THREE.Material,
  frondMaterial: THREE.Material,
): THREE.Group {
  const palm = new THREE.Group();
  palm.name = `tower-palm-${index}`;
  const lean = (seeded(index + 41) - 0.5) * 0.16;
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.11, 0.26, height, 7),
    trunkMaterial,
  );
  trunk.position.y = height * 0.5;
  trunk.rotation.z = lean;
  trunk.castShadow = true;
  palm.add(trunk);

  const crown = new THREE.Group();
  crown.position.set(Math.sin(lean) * -height * 0.5, height, 0);
  palm.add(crown);
  const frondGeometry = new THREE.ConeGeometry(0.38, 4.1 + seeded(index) * 1.2, 3);
  for (let i = 0; i < 9; i++) {
    const frond = new THREE.Mesh(frondGeometry, frondMaterial);
    const angle = (i / 9) * Math.PI * 2 + seeded(index + 70) * 0.5;
    frond.position.set(Math.cos(angle) * 1.45, 0.12 - (i % 2) * 0.18, Math.sin(angle) * 1.45);
    frond.rotation.order = 'YXZ';
    frond.rotation.y = -angle;
    frond.rotation.z = -Math.PI * 0.43 - (i % 3) * 0.08;
    frond.scale.z = 0.34;
    frond.castShadow = true;
    crown.add(frond);
  }
  const coconuts = new THREE.Mesh(
    new THREE.SphereGeometry(0.16, 7, 6),
    trunkMaterial,
  );
  coconuts.position.y = -0.2;
  crown.add(coconuts);
  return palm;
}

function stationSignTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#1b0b0b');
  grad.addColorStop(1, '#05070b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#e11d2f';
  ctx.lineWidth = 9;
  ctx.strokeRect(8, 8, 1008, 240);
  ctx.fillStyle = '#fff7ed';
  ctx.font = '900 106px Impact, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(VOLCANO_FLEX_NAME, 512, 103);
  ctx.fillStyle = '#fb923c';
  ctx.font = '700 34px monospace';
  ctx.fillText('900 FT · 15 INVERSIONS · LSM LAUNCH', 512, 193);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * A 900-ft steel-and-glass observation tower with a blue-lit crown. The
 * existing coaster spiral wraps the outside of the slim central core, so the
 * red track is the dominant silhouette. Everything here is decorative and
 * never participates in the coaster collision or physics.
 */
export function buildVolcanoFlexEnvironment(): VolcanoFlexEnvironment {
  const site = getVolcanoFlexSite();
  const root = new THREE.Group();
  root.name = 'volcano-flex-environment';
  root.position.set(site.mountain.x, site.mountain.y, site.mountain.z);
  const detail = new THREE.Group();
  detail.name = 'tower-detail';
  root.add(detail);

  const height = VOLCANO_FLEX_HEIGHT_M;
  const crownFloorY = VOLCANO_FLEX_LOCAL_CHAMBER.ascentTop + 3.2;
  const crownTopY = crownFloorY + 9.2;
  const stationLocal = new THREE.Vector3(
    site.station.x - site.mountain.x,
    site.station.y - site.mountain.y,
    site.station.z - site.mountain.z,
  );

  const whiteSteel = new THREE.MeshStandardMaterial({
    color: 0xe9eef3,
    roughness: 0.32,
    metalness: 0.72,
  });
  const paleSteel = new THREE.MeshStandardMaterial({
    color: 0xb9c6d2,
    roughness: 0.42,
    metalness: 0.62,
  });
  const redSteel = new THREE.MeshStandardMaterial({
    color: 0xd21f2b,
    roughness: 0.3,
    metalness: 0.62,
  });
  const darkSteel = new THREE.MeshStandardMaterial({
    color: 0x25303c,
    roughness: 0.38,
    metalness: 0.78,
  });
  const concrete = new THREE.MeshStandardMaterial({
    color: 0xd4dae0,
    roughness: 0.86,
    metalness: 0.05,
  });
  const coreGlass = new THREE.MeshPhysicalMaterial({
    color: 0xa8c7dc,
    metalness: 0.08,
    roughness: 0.08,
    transmission: 0.52,
    transparent: true,
    opacity: 0.58,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const crownGlass = new THREE.MeshPhysicalMaterial({
    color: 0x172b46,
    emissive: 0x2f6fa8,
    emissiveIntensity: 0.45,
    metalness: 0.24,
    roughness: 0.12,
    transmission: 0.28,
    transparent: true,
    opacity: 0.76,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const blueGlow = new THREE.MeshStandardMaterial({
    color: 0x7dc8ff,
    emissive: 0x3b9cff,
    emissiveIntensity: 1.9,
    roughness: 0.22,
    metalness: 0.18,
  });
  const warmGlow = new THREE.MeshStandardMaterial({
    color: 0xffc181,
    emissive: 0xff7a2f,
    emissiveIntensity: 1.45,
    roughness: 0.3,
  });
  const beaconGlow = new THREE.MeshStandardMaterial({
    color: 0xff6b6b,
    emissive: 0xff1f2d,
    emissiveIntensity: 2.8,
    roughness: 0.2,
  });
  const canopyGlass = new THREE.MeshPhysicalMaterial({
    color: 0x162638,
    emissive: 0x154d70,
    emissiveIntensity: 0.25,
    metalness: 0.2,
    roughness: 0.16,
    transparent: true,
    opacity: 0.62,
    side: THREE.DoubleSide,
    depthWrite: false,
  });

  // Broad plaza and a low glass lobby anchor the tower in the island.
  const foundation = new THREE.Mesh(
    new THREE.CylinderGeometry(25, 27, 1.4, 64),
    concrete,
  );
  foundation.name = 'tower-foundation';
  foundation.position.y = -0.2;
  foundation.receiveShadow = true;
  root.add(foundation);

  const plazaRim = new THREE.Mesh(
    new THREE.TorusGeometry(24.3, 0.28, 8, 72),
    redSteel,
  );
  plazaRim.name = 'tower-plaza-rim';
  plazaRim.rotation.x = Math.PI / 2;
  plazaRim.position.y = 0.52;
  root.add(plazaRim);

  const lobby = new THREE.Mesh(
    new THREE.CylinderGeometry(11.2, 11.8, 10.5, 48, 1, true),
    coreGlass,
  );
  lobby.name = 'tower-lobby-glass';
  lobby.position.y = 5.3;
  root.add(lobby);
  const lobbyLamp = new THREE.PointLight(0xffc18f, 2.4, 34, 1.8);
  lobbyLamp.name = 'tower-lobby-glow';
  lobbyLamp.position.set(0, 6, 0);
  root.add(lobbyLamp);
  const lobbyBand = new THREE.Mesh(
    new THREE.TorusGeometry(10.6, 0.16, 6, 48),
    warmGlow,
  );
  lobbyBand.rotation.x = Math.PI / 2;
  lobbyBand.position.y = 9.6;
  root.add(lobbyBand);

  // Slim central lift shaft. The elevator cab travels inside the glass.
  const elevatorShaft = new THREE.Mesh(
    new THREE.CylinderGeometry(3.15, 3.15, crownFloorY - 8, 28, 1, true),
    coreGlass,
  );
  elevatorShaft.name = 'tower-glass-core';
  elevatorShaft.position.y = 8 + (crownFloorY - 8) * 0.5;
  root.add(elevatorShaft);

  const guideBeams: BeamSpec[] = [];
  for (let i = 0; i < 4; i++) {
    const angle = (i / 4) * Math.PI * 2 + Math.PI / 4;
    guideBeams.push({
      start: new THREE.Vector3(Math.cos(angle) * 3.55, 4, Math.sin(angle) * 3.55),
      end: new THREE.Vector3(Math.cos(angle) * 3.55, crownFloorY, Math.sin(angle) * 3.55),
      radius: 0.1,
    });
  }
  const guides = makeBeamInstances(guideBeams, whiteSteel, 'tower-elevator-guides');
  detail.add(guides);

  const elevator = new THREE.Group();
  elevator.name = 'tower-elevator-car';
  const cab = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 2.2, 4.5, 16),
    paleSteel,
  );
  elevator.add(cab);
  const cabBand = new THREE.Mesh(
    new THREE.CylinderGeometry(2.24, 2.24, 1.25, 16, 1, true),
    blueGlow,
  );
  cabBand.position.y = 0.8;
  elevator.add(cabBand);
  const cabRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.25, 0.28, 16),
    redSteel,
  );
  cabRoof.position.y = 2.38;
  elevator.add(cabRoof);
  elevator.position.set(0, 9, 0);
  detail.add(elevator);

  // White space-frame cage: tapered columns, rings and alternating X braces.
  const lattice = new THREE.Group();
  lattice.name = 'tower-lattice';
  root.add(lattice);
  const latticeBottom = 3;
  const latticeTop = crownFloorY - 4;
  const baseRadius = 9.6;
  const topRadius = 7.1;
  const levels = 14;
  const sides = 12;
  const columnBeams: BeamSpec[] = [];
  const braceBeams: BeamSpec[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    columnBeams.push({
      start: new THREE.Vector3(
        Math.cos(angle) * baseRadius,
        latticeBottom,
        Math.sin(angle) * baseRadius,
      ),
      end: new THREE.Vector3(
        Math.cos(angle) * topRadius,
        latticeTop,
        Math.sin(angle) * topRadius,
      ),
      radius: 0.11,
    });
  }
  for (let level = 0; level < levels; level++) {
    const t0 = level / levels;
    const t1 = (level + 1) / levels;
    const y0 = THREE.MathUtils.lerp(latticeBottom, latticeTop, t0);
    const y1 = THREE.MathUtils.lerp(latticeBottom, latticeTop, t1);
    const r0 = THREE.MathUtils.lerp(baseRadius, topRadius, t0);
    const r1 = THREE.MathUtils.lerp(baseRadius, topRadius, t1);
    for (let i = 0; i < sides; i++) {
      const a0 = (i / sides) * Math.PI * 2;
      const a1 = ((i + 1) / sides) * Math.PI * 2;
      braceBeams.push({
        start: new THREE.Vector3(Math.cos(a0) * r0, y0, Math.sin(a0) * r0),
        end: new THREE.Vector3(Math.cos(a1) * r1, y1, Math.sin(a1) * r1),
        radius: 0.055,
      });
      braceBeams.push({
        start: new THREE.Vector3(Math.cos(a1) * r0, y0, Math.sin(a1) * r0),
        end: new THREE.Vector3(Math.cos(a0) * r1, y1, Math.sin(a0) * r1),
        radius: 0.055,
      });
    }
  }
  lattice.add(makeBeamInstances(columnBeams, whiteSteel, 'tower-lattice-columns'));
  lattice.add(makeBeamInstances(braceBeams, paleSteel, 'tower-lattice-braces'));

  const ringGeometry = new THREE.TorusGeometry(1, 0.009, 6, 64);
  const ringInstances = new THREE.InstancedMesh(
    ringGeometry,
    whiteSteel,
    levels + 1,
  );
  ringInstances.name = 'tower-lattice-rings';
  const ringMatrix = new THREE.Matrix4();
  const ringQuaternion = new THREE.Quaternion().setFromEuler(
    new THREE.Euler(Math.PI / 2, 0, 0),
  );
  for (let level = 0; level <= levels; level++) {
    const t = level / levels;
    const radius = THREE.MathUtils.lerp(baseRadius, topRadius, t);
    ringMatrix.compose(
      new THREE.Vector3(0, THREE.MathUtils.lerp(latticeBottom, latticeTop, t), 0),
      ringQuaternion,
      new THREE.Vector3(radius, radius, radius),
    );
    ringInstances.setMatrixAt(level, ringMatrix);
  }
  ringInstances.instanceMatrix.needsUpdate = true;
  lattice.add(ringInstances);

  // Red pylons echo the coaster structure where the tower meets the plaza.
  const pylonBeams: BeamSpec[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 + Math.PI / 12;
    pylonBeams.push({
      start: new THREE.Vector3(Math.cos(angle) * 16, 0.4, Math.sin(angle) * 16),
      end: new THREE.Vector3(Math.cos(angle) * 8.4, 38, Math.sin(angle) * 8.4),
      radius: 0.34,
    });
  }
  const pylons = makeBeamInstances(pylonBeams, redSteel, 'tower-base-pylons');
  root.add(pylons);

  // Blue-lit circular observation deck with a white picket crown.
  const crown = new THREE.Group();
  crown.name = 'tower-observation-crown';
  root.add(crown);
  const supportBeams: BeamSpec[] = [];
  for (let i = 0; i < sides; i++) {
    const angle = (i / sides) * Math.PI * 2;
    supportBeams.push({
      start: new THREE.Vector3(Math.cos(angle) * 7.3, crownFloorY - 10, Math.sin(angle) * 7.3),
      end: new THREE.Vector3(Math.cos(angle) * 13.4, crownFloorY, Math.sin(angle) * 13.4),
      radius: 0.15,
    });
  }
  crown.add(makeBeamInstances(supportBeams, whiteSteel, 'tower-crown-supports'));

  const deck = new THREE.Mesh(
    new THREE.CylinderGeometry(15.2, 13.6, 1.2, 64),
    whiteSteel,
  );
  deck.position.y = crownFloorY - 0.4;
  deck.castShadow = true;
  deck.receiveShadow = true;
  crown.add(deck);
  const deckUnderside = new THREE.Mesh(
    new THREE.TorusGeometry(14.4, 0.24, 8, 72),
    blueGlow,
  );
  deckUnderside.name = 'tower-crown-ring';
  deckUnderside.rotation.x = Math.PI / 2;
  deckUnderside.position.y = crownFloorY - 1.0;
  crown.add(deckUnderside);

  const observationGlass = new THREE.Mesh(
    new THREE.CylinderGeometry(12.8, 12.4, 6, 48, 1, true),
    crownGlass,
  );
  observationGlass.name = 'tower-crown-glass';
  observationGlass.position.y = crownFloorY + 3;
  crown.add(observationGlass);

  const mullionBeams: BeamSpec[] = [];
  for (let i = 0; i < 28; i++) {
    const angle = (i / 28) * Math.PI * 2;
    mullionBeams.push({
      start: new THREE.Vector3(Math.cos(angle) * 12.95, crownFloorY + 0.1, Math.sin(angle) * 12.95),
      end: new THREE.Vector3(Math.cos(angle) * 12.55, crownFloorY + 5.9, Math.sin(angle) * 12.55),
      radius: 0.07,
    });
  }
  crown.add(makeBeamInstances(mullionBeams, whiteSteel, 'tower-crown-mullions'));

  const crownFloorLight = new THREE.Mesh(
    new THREE.CylinderGeometry(12.2, 12.2, 0.08, 48),
    blueGlow,
  );
  crownFloorLight.name = 'tower-crown-floor-light';
  crownFloorLight.position.y = crownFloorY + 0.08;
  crown.add(crownFloorLight);

  const crownRoof = new THREE.Mesh(
    new THREE.CylinderGeometry(14.8, 14.6, 0.72, 64),
    whiteSteel,
  );
  crownRoof.position.y = crownFloorY + 6.35;
  crownRoof.castShadow = true;
  crown.add(crownRoof);
  const crownCap = new THREE.Mesh(
    new THREE.ConeGeometry(14.1, 2.9, 64),
    whiteSteel,
  );
  crownCap.position.y = crownFloorY + 8.15;
  crownCap.castShadow = true;
  crown.add(crownCap);
  const crownCapRim = new THREE.Mesh(
    new THREE.TorusGeometry(14.55, 0.18, 8, 72),
    blueGlow,
  );
  crownCapRim.rotation.x = Math.PI / 2;
  crownCapRim.position.y = crownFloorY + 6.68;
  crown.add(crownCapRim);

  const crownGlow = new THREE.PointLight(0x72b8ff, 8, 170, 1.7);
  crownGlow.name = 'tower-crown-glow';
  crownGlow.position.set(0, crownFloorY + 3.2, 0);
  crown.add(crownGlow);

  // A slender mast carries the structure to the original 900-ft height.
  const mastHeight = height - crownTopY;
  const mast = new THREE.Mesh(
    new THREE.CylinderGeometry(0.32, 0.62, mastHeight, 10),
    whiteSteel,
  );
  mast.name = 'tower-top-mast';
  mast.position.y = crownTopY + mastHeight * 0.5;
  mast.castShadow = true;
  root.add(mast);
  const mastRings = new THREE.Group();
  mastRings.name = 'tower-mast-rings';
  detail.add(mastRings);
  for (let i = 1; i <= 7; i++) {
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(0.8 - i * 0.045, 0.045, 5, 20),
      paleSteel,
    );
    ring.rotation.x = Math.PI / 2;
    ring.position.y = crownTopY + (mastHeight * i) / 8;
    mastRings.add(ring);
  }
  const beacon = new THREE.Mesh(
    new THREE.SphereGeometry(0.34, 10, 8),
    beaconGlow,
  );
  beacon.name = 'tower-top-beacon';
  beacon.position.y = height;
  root.add(beacon);
  const beaconLight = new THREE.PointLight(0xff3040, 3.2, 46, 1.8);
  beaconLight.name = 'tower-beacon-light';
  beaconLight.position.y = height;
  detail.add(beaconLight);

  // Red launch arch where the train leaves the station spur and enters the
  // tower's spiral. Its opening matches the launch track height and clearance.
  const portal = new THREE.Group();
  portal.name = 'tower-launch-portal';
  const tunnel = new THREE.Mesh(
    new THREE.CylinderGeometry(5.7, 5.7, 18, 28, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x080b10,
      roughness: 0.94,
      metalness: 0.04,
      side: THREE.BackSide,
    }),
  );
  tunnel.rotation.z = Math.PI / 2;
  tunnel.position.set(-10.5, 4.1, -20);
  portal.add(tunnel);
  const portalRing = new THREE.Mesh(
    new THREE.TorusGeometry(6.15, 0.52, 10, 42),
    redSteel,
  );
  portalRing.name = 'tower-launch-ring';
  portalRing.rotation.y = Math.PI / 2;
  portalRing.position.set(-19.2, 4.4, -20);
  portal.add(portalRing);
  const portalGlowMat = new THREE.MeshStandardMaterial({
    color: 0xff9b83,
    emissive: 0xff3b2f,
    emissiveIntensity: 1.6,
    roughness: 0.24,
  });
  const portalLightRing = new THREE.Mesh(
    new THREE.TorusGeometry(5.45, 0.12, 6, 42),
    portalGlowMat,
  );
  portalLightRing.rotation.y = Math.PI / 2;
  portalLightRing.position.set(-19.28, 4.4, -20);
  portal.add(portalLightRing);
  const portalLight = new THREE.PointLight(0xff5a43, 2.6, 30, 1.8);
  portalLight.position.set(-18, 5, -20);
  portal.add(portalLight);
  root.add(portal);

  // Curved red station canopy over the boarding spur.
  const stationGroup = new THREE.Group();
  stationGroup.name = 'volcano-flex-station';
  stationGroup.position.set(stationLocal.x + 8, stationLocal.y, stationLocal.z);
  const canopyPositions: number[] = [];
  const canopyIndices: number[] = [];
  const canopyCols = 12;
  const canopyRows = 12;
  const canopyHalfX = 9.5;
  const canopyHalfZ = 10.5;
  for (let xi = 0; xi <= canopyCols; xi++) {
    const x = THREE.MathUtils.lerp(-canopyHalfX, canopyHalfX, xi / canopyCols);
    for (let zi = 0; zi <= canopyRows; zi++) {
      const z = THREE.MathUtils.lerp(-canopyHalfZ, canopyHalfZ, zi / canopyRows);
      const y = 8.25 + Math.cos((z / canopyHalfZ) * Math.PI * 0.5) * 1.55;
      canopyPositions.push(x, y, z);
    }
  }
  for (let xi = 0; xi < canopyCols; xi++) {
    for (let zi = 0; zi < canopyRows; zi++) {
      const a = xi * (canopyRows + 1) + zi;
      const b = a + canopyRows + 1;
      canopyIndices.push(a, b, a + 1, b, b + 1, a + 1);
    }
  }
  const canopyGeometry = new THREE.BufferGeometry();
  canopyGeometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(canopyPositions, 3),
  );
  canopyGeometry.setIndex(canopyIndices);
  canopyGeometry.computeVertexNormals();
  const canopy = new THREE.Mesh(canopyGeometry, canopyGlass);
  canopy.name = 'tower-station-canopy';
  canopy.castShadow = true;
  stationGroup.add(canopy);

  for (const ribX of [-9.5, -6.4, -3.2, 0, 3.2, 6.4, 9.5]) {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 12; i++) {
      const z = THREE.MathUtils.lerp(-canopyHalfZ, canopyHalfZ, i / 12);
      points.push(
        new THREE.Vector3(
          ribX,
          8.25 + Math.cos((z / canopyHalfZ) * Math.PI * 0.5) * 1.55 + 0.06,
          z,
        ),
      );
    }
    const rib = new THREE.Mesh(
      new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points), 18, 0.17, 6, false),
      redSteel,
    );
    stationGroup.add(rib);
  }
  for (const edgeZ of [-canopyHalfZ, canopyHalfZ]) {
    const edge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.19, canopyHalfX * 2, 8),
      redSteel,
    );
    edge.rotation.z = Math.PI / 2;
    edge.position.set(0, 8.32, edgeZ);
    stationGroup.add(edge);
    const led = new THREE.Mesh(
      new THREE.BoxGeometry(canopyHalfX * 2, 0.12, 0.08),
      blueGlow,
    );
    led.position.set(0, 8.05, edgeZ);
    stationGroup.add(led);
  }
  for (const sx of [-9.1, 9.1]) {
    for (const sz of [-8.2, 8.2]) {
      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.14, 0.22, 8.3, 8),
        whiteSteel,
      );
      post.position.set(sx, 4.15, sz);
      post.castShadow = true;
      stationGroup.add(post);
    }
  }

  const signTexture = stationSignTexture();
  if (signTexture) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 3.5),
      new THREE.MeshBasicMaterial({
        map: signTexture,
        toneMapped: false,
        side: THREE.DoubleSide,
      }),
    );
    sign.name = 'volcano-flex-sign';
    sign.position.set(0, 6.35, canopyHalfZ + 0.35);
    stationGroup.add(sign);
    const signBack = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 4, 0.18),
      darkSteel,
    );
    signBack.position.set(0, 6.35, canopyHalfZ + 0.18);
    stationGroup.add(signBack);
  }
  const stationLamp = new THREE.PointLight(0xffb377, 2.2, 30, 1.8);
  stationLamp.position.set(0, 5.2, 0);
  stationGroup.add(stationLamp);
  root.add(stationGroup);

  // Palms and low blue plaza lights soften the base of the steel structure.
  const palms = new THREE.Group();
  palms.name = 'tower-palms';
  detail.add(palms);
  const trunkMaterial = new THREE.MeshStandardMaterial({
    color: 0x765239,
    roughness: 0.9,
  });
  const frondMaterial = new THREE.MeshStandardMaterial({
    color: 0x2d6b3b,
    roughness: 0.82,
    side: THREE.DoubleSide,
  });
  const palmCrowns: THREE.Group[] = [];
  const palmAngles = [0.25, 0.95, 1.7, 2.4, 3.15, 3.85, 4.55, 5.3];
  palmAngles.forEach((angle, index) => {
    const radius = 29.5 + seeded(index + 8) * 4;
    const palm = buildPalmTree(
      index,
      10.5 + seeded(index + 4) * 4.4,
      trunkMaterial,
      frondMaterial,
    );
    palm.position.set(
      Math.cos(angle) * radius,
      0,
      Math.sin(angle) * radius,
    );
    palm.rotation.y = seeded(index + 19) * Math.PI * 2;
    palms.add(palm);
    const crown = palm.children.find((child) => child.type === 'Group');
    if (crown instanceof THREE.Group) palmCrowns.push(crown);
  });
  for (let i = 0; i < 2; i++) {
    const palm = buildPalmTree(
      20 + i,
      9.5 + i * 2.2,
      trunkMaterial,
      frondMaterial,
    );
    palm.position.set(
      stationLocal.x + (i === 0 ? 18 : -12),
      0,
      stationLocal.z + (i === 0 ? 18 : -17),
    );
    palms.add(palm);
  }

  const plazaLights = new THREE.Group();
  plazaLights.name = 'tower-plaza-lights';
  detail.add(plazaLights);
  for (let i = 0; i < 10; i++) {
    const angle = (i / 10) * Math.PI * 2 + 0.18;
    const lampGroup = new THREE.Group();
    lampGroup.position.set(Math.cos(angle) * 22.6, 0, Math.sin(angle) * 22.6);
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.07, 0.1, 1.65, 6),
      whiteSteel,
    );
    pole.position.y = 0.82;
    lampGroup.add(pole);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      blueGlow,
    );
    lamp.position.y = 1.72;
    lampGroup.add(lamp);
    plazaLights.add(lampGroup);
  }

  const update = (dt: number, elapsed: number, speedKmh: number) => {
    const pulse = 0.5 + 0.5 * Math.sin(elapsed * 1.35);
    crownGlass.emissiveIntensity = 0.32 + pulse * 0.22;
    blueGlow.emissiveIntensity = 1.55 + pulse * 1.1;
    crownGlow.intensity = 6.5 + pulse * 2.4;
    lobbyLamp.intensity = 2.1 + Math.sin(elapsed * 2.1) * 0.24;
    stationLamp.intensity = 1.9 + Math.sin(elapsed * 2.5) * 0.16;
    portalGlowMat.emissiveIntensity =
      1.25 + Math.min(1.6, speedKmh * 0.005) + pulse * 0.45;
    portalLight.intensity = 2.2 + Math.min(2.6, speedKmh * 0.009);
    const beaconPulse = Math.max(0, Math.sin(elapsed * 2.4)) ** 8;
    beaconGlow.emissiveIntensity = 1.4 + beaconPulse * 5.5;
    beaconLight.intensity = 1.2 + beaconPulse * 7;

    const cycle = (elapsed % 34) / 34;
    const lift = 1 - Math.abs(cycle * 2 - 1);
    elevator.position.y = 9 + lift * (crownFloorY - 18);
    elevator.rotation.y += dt * 0.16;

    palmCrowns.forEach((crownGroup, index) => {
      crownGroup.rotation.z = Math.sin(elapsed * 0.55 + index * 1.4) * 0.035;
    });
  };

  const setDetailVisible = (visible: boolean) => {
    detail.visible = visible;
  };

  const dispose = () => {
    root.traverse((object) => {
      if (object instanceof THREE.Mesh || object instanceof THREE.Points || object instanceof THREE.LineSegments) {
        object.geometry?.dispose();
        const material = object.material;
        if (Array.isArray(material)) material.forEach((m) => m.dispose());
        else material?.dispose();
      }
    });
    root.parent?.remove(root);
  };

  return { root, update, setDetailVisible, dispose };
}

/** Detailed five-car train with an armored Vader-inspired lead car. */
export function buildVolcanoFlexTrainCar(index: number, front: boolean): THREE.Group {
  const car = new THREE.Group();
  car.name = front ? 'volcano-flex-lead-car' : `volcano-flex-car-${index}`;
  const armor = new THREE.MeshStandardMaterial({
    color: 0x0b0b0d,
    roughness: 0.18,
    metalness: 0.9,
  });
  const steel = new THREE.MeshStandardMaterial({
    color: 0x3f3f46,
    roughness: 0.28,
    metalness: 0.95,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: 0xc2410c,
    emissive: 0xff3d00,
    emissiveIntensity: 1.2,
    roughness: 0.32,
    metalness: 0.72,
  });
  const seatMat = new THREE.MeshStandardMaterial({
    color: 0x1a1110,
    roughness: 0.62,
    metalness: 0.08,
  });
  const lensMat = new THREE.MeshStandardMaterial({
    color: 0x220202,
    emissive: 0xff1a00,
    emissiveIntensity: 2.8,
    roughness: 0.13,
    metalness: 0.4,
  });

  const chassis = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.22, 2.18), steel);
  chassis.position.y = 0.12;
  chassis.castShadow = true;
  car.add(chassis);

  const belly = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.2, 1.5), armor);
  belly.position.set(0, -0.04, 0);
  car.add(belly);

  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.34, 2.0), armor);
    skirt.position.set(side * 0.72, 0.12, 0);
    skirt.rotation.z = side * -0.13;
    car.add(skirt);
    const glowStrip = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.055, 1.52), trim);
    glowStrip.position.set(side * 0.78, 0.29, 0.06);
    car.add(glowStrip);
  }

  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.2, 0.2, 0.12, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    for (const axleZ of [-0.76, 0.76]) {
      for (const offset of [-0.11, 0.11]) {
        const wheel = new THREE.Mesh(wheelGeo, steel);
        wheel.name = 'coaster-wheel';
        wheel.position.set(side * 0.6, 0.01, axleZ + offset);
        wheel.userData.radius = 0.2;
        car.add(wheel);
        wheels.push(wheel);
      }
    }
  }
  for (const side of [-1, 1]) {
    for (const axleZ of [-0.76, 0.76]) {
      const housing = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.28, 0.34), armor);
      housing.position.set(side * 0.62, 0.16, axleZ);
      car.add(housing);
    }
  }
  car.userData.wheels = wheels;

  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.12, 1.78), armor);
  floor.position.y = 0.36;
  car.add(floor);

  for (const seatX of [-0.3, 0.3]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.18, 0.5), seatMat);
    seat.name = 'coaster-seat';
    seat.position.set(seatX, 0.55, -0.05);
    car.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.7, 0.16), armor);
    back.name = 'seat-back';
    back.position.set(seatX, 0.91, -0.36);
    back.rotation.x = -0.14;
    car.add(back);
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.16), seatMat);
    headrest.name = 'headrest';
    headrest.position.set(seatX, 1.3, -0.44);
    car.add(headrest);

    // Over-the-shoulder restraint with a locking lap bar.
    for (const s of [-1, 1]) {
      const upright = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.66, 8), steel);
      upright.position.set(seatX + s * 0.27, 1.03, -0.18);
      upright.rotation.x = -0.1;
      car.add(upright);
    }
    const overhead = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.68, 8), steel);
    overhead.name = 'over-shoulder-restraint';
    overhead.rotation.z = Math.PI / 2;
    overhead.position.set(seatX, 1.34, 0.06);
    car.add(overhead);
    const lapBar = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.075, 0.11), trim);
    lapBar.name = 'lap-bar';
    lapBar.position.set(seatX, 0.77, 0.23);
    car.add(lapBar);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.1, 0.08), lensMat);
    buckle.name = 'restraint-lock';
    buckle.position.set(seatX, 0.81, 0.28);
    car.add(buckle);
  }

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.34, 0.36, 0.48), armor);
  nose.position.set(0, 0.6, 1.0);
  nose.rotation.x = -0.12;
  car.add(nose);

  const headlampMat = new THREE.MeshStandardMaterial({
    color: 0xfff2d6,
    emissive: 0xffb066,
    emissiveIntensity: 2.2,
    roughness: 0.2,
  });
  for (const x of [-0.45, 0.45]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.08, 10, 8), headlampMat);
    lamp.position.set(x, 0.35, 1.15);
    car.add(lamp);
  }

  if (front) {
    const mask = new THREE.Group();
    mask.name = 'vader-mask';
    mask.position.set(0, 0.85, 1.0);
    mask.rotation.x = -0.1;

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(0.44, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.68),
      armor,
    );
    dome.scale.set(1.06, 0.92, 1.08);
    dome.position.y = 0.14;
    mask.add(dome);

    const faceplate = new THREE.Mesh(new THREE.BoxGeometry(0.52, 0.5, 0.18), armor);
    faceplate.position.set(0, -0.03, 0.27);
    faceplate.rotation.x = -0.13;
    mask.add(faceplate);

    for (const side of [-1, 1]) {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.115, 14, 10), lensMat);
      eye.name = 'vader-eye-lens';
      eye.scale.set(1.58, 0.58, 0.45);
      eye.position.set(side * 0.17, 0.09, 0.39);
      eye.rotation.z = side * 0.2;
      mask.add(eye);
      const brow = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.08, 0.08), armor);
      brow.position.set(side * 0.17, 0.2, 0.4);
      brow.rotation.z = side * -0.25;
      mask.add(brow);
      const cheek = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.42, 5), armor);
      cheek.position.set(side * 0.28, -0.2, 0.31);
      cheek.rotation.z = side * -0.45;
      mask.add(cheek);
      const tusk = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.05, 0.24, 6), steel);
      tusk.position.set(side * 0.24, -0.35, 0.37);
      tusk.rotation.z = side * -0.25;
      mask.add(tusk);
    }

    const grille = new THREE.Mesh(new THREE.ConeGeometry(0.18, 0.36, 4), steel);
    grille.name = 'vader-breathing-grille';
    grille.rotation.x = -0.18;
    grille.position.set(0, -0.24, 0.41);
    mask.add(grille);
    for (let i = 0; i < 3; i++) {
      const slot = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.025, 0.03), lensMat);
      slot.position.set(0, -0.12 - i * 0.07, 0.45);
      mask.add(slot);
    }
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.2, 0.2), steel);
    crest.position.set(0, 0.43, 0.02);
    mask.add(crest);
    car.add(mask);
  }

  car.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });
  return car;
}
