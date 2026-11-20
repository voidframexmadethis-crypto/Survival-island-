import * as THREE from 'three';
import {
  MultiverseUniverse,
  SpacePlanet,
  SpaceStar,
} from '../systems/multiverseSpace';

export interface SaturnVRocketHandles {
  root: THREE.Group;
  rocketBody: THREE.Group;
  stage1Group: THREE.Group;
  flameGroup: THREE.Group;
}

export interface SpacePlanetArenaHandles {
  root: THREE.Group;
  ufoGroup: THREE.Group | null;
  rocketBody: THREE.Group | null;
  stage1Group: THREE.Group | null;
  rocketFlame: THREE.Object3D | null;
  dispose: () => void;
}

/**
 * Huge Multi-Stage Saturn V ("Saturn Five") Rocket + Launch Pad & Red Umbilical Tower
 * Includes a walkable ground-level boarding bay & illuminated control console.
 */
export function buildSaturnVRocket(options?: {
  withLaunchTower?: boolean;
}): SaturnVRocketHandles {
  const withTower = options?.withLaunchTower ?? true;
  const root = new THREE.Group();

  const whiteHullMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.34,
    metalness: 0.18,
  });
  const blackRollMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    roughness: 0.48,
    metalness: 0.25,
  });
  const darkMetalMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.42,
    metalness: 0.78,
  });
  const redTowerMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.52,
    metalness: 0.42,
  });
  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x64748b,
    roughness: 0.88,
    metalness: 0.06,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.5,
    metalness: 0.2,
  });
  const glowCyanMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x38bdf8,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });

  // 1. Concrete Launch Pad & Blast Trench Base
  const pad = new THREE.Mesh(
    new THREE.CylinderGeometry(8.5, 9.6, 0.7, 12),
    concreteMat,
  );
  pad.position.y = 0.35;
  pad.receiveShadow = true;
  root.add(pad);

  const hazardRing = new THREE.Mesh(
    new THREE.RingGeometry(6.8, 7.5, 24),
    hazardMat,
  );
  hazardRing.rotation.x = -Math.PI / 2;
  hazardRing.position.y = 0.72;
  root.add(hazardRing);

  // 4 Hold-Down Support Arms around Rocket Base
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2 + Math.PI / 4;
    const arm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 2.2, 1.4), darkMetalMat);
    arm.position.set(Math.cos(a) * 3.1, 1.6, Math.sin(a) * 3.1);
    arm.rotation.y = -a;
    root.add(arm);
  }

  // 2. Saturn V Rocket Body (24m tall!)
  const rocketBody = new THREE.Group();
  rocketBody.position.y = 2.0;

  // Stage 1 (S-IC) Group so it can cleanly separate at 45% orbit altitude!
  const stage1Group = new THREE.Group();
  rocketBody.add(stage1Group);

  // 5 Massive F-1 Rocket Engine Nozzles
  const nozzleCoords: [number, number][] = [
    [0, 0],
    [1.45, 0],
    [-1.45, 0],
    [0, 1.45],
    [0, -1.45],
  ];
  nozzleCoords.forEach(([nx, nz]) => {
    const nozzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.42, 0.72, 1.4, 12),
      darkMetalMat,
    );
    nozzle.position.set(nx, -0.55, nz);
    stage1Group.add(nozzle);
  });

  // Glowing Exhaust Flame Plume Group (pulses softly on pad & roars on launch!)
  const flameGroup = new THREE.Group();
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xff8c1a,
    transparent: true,
    opacity: 0.75,
  });
  const coreFlame = new THREE.Mesh(
    new THREE.ConeGeometry(1.5, 2.6, 12),
    flameMat,
  );
  coreFlame.rotation.x = Math.PI;
  coreFlame.position.y = -1.7;
  flameGroup.add(coreFlame);
  rocketBody.add(flameGroup);

  // Stage 1 (S-IC): Lower Black-and-White Roll Pattern + 4 Huge Stabilizer Fins
  const s1Lower = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.45, 3.6, 18),
    blackRollMat,
  );
  s1Lower.position.y = 1.9;
  const s1Upper = new THREE.Mesh(
    new THREE.CylinderGeometry(2.35, 2.35, 5.4, 18),
    whiteHullMat,
  );
  s1Upper.position.y = 6.4;
  stage1Group.add(s1Lower, s1Upper);

  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 2;
    const fin = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 2.8, 2.2),
      blackRollMat,
    );
    fin.position.set(Math.sin(a) * 2.95, 1.4, Math.cos(a) * 2.95);
    fin.rotation.y = a;
    stage1Group.add(fin);
  }

  // Boardable Interior Crew Entry Hatch & Illuminated Console at Stage 1 Base!
  const hatchFrame = new THREE.Mesh(
    new THREE.BoxGeometry(1.6, 2.3, 0.6),
    darkMetalMat,
  );
  hatchFrame.position.set(0, 1.4, 2.38);
  const hatchGlow = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 1.85, 0.14),
    glowCyanMat,
  );
  hatchGlow.position.set(0, 1.4, 2.64);
  stage1Group.add(hatchFrame, hatchGlow);

  // Interstage Black Band + Stage 2 (S-II)
  const interstage1 = new THREE.Mesh(
    new THREE.CylinderGeometry(2.38, 2.38, 1.3, 18),
    blackRollMat,
  );
  interstage1.position.y = 9.7;
  const stage2 = new THREE.Mesh(
    new THREE.CylinderGeometry(2.15, 2.35, 5.4, 18),
    whiteHullMat,
  );
  stage2.position.y = 13.0;
  const usaBand = new THREE.Mesh(
    new THREE.CylinderGeometry(2.18, 2.18, 0.45, 18),
    redTowerMat,
  );
  usaBand.position.y = 14.4;
  rocketBody.add(interstage1, stage2, usaBand);

  // Stage 3 (S-IVB) + Service Module + Command Capsule + Launch Escape Tower
  const interstage2 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.65, 2.15, 1.4, 16),
    blackRollMat,
  );
  interstage2.position.y = 16.4;
  const stage3 = new THREE.Mesh(
    new THREE.CylinderGeometry(1.55, 1.65, 3.2, 16),
    whiteHullMat,
  );
  stage3.position.y = 18.7;
  const capsule = new THREE.Mesh(
    new THREE.ConeGeometry(1.45, 2.4, 16),
    whiteHullMat,
  );
  capsule.position.y = 21.5;
  const escapeTower = new THREE.Mesh(
    new THREE.CylinderGeometry(0.14, 0.24, 2.8, 10),
    whiteHullMat,
  );
  escapeTower.position.y = 23.8;
  const escapeTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.24, 0.65, 10),
    redTowerMat,
  );
  escapeTip.position.y = 25.4;
  rocketBody.add(interstage2, stage3, capsule, escapeTower, escapeTip);

  root.add(rocketBody);

  // 3. Red Steel Launch Umbilical Tower & Crew Boarding Gantry
  if (withTower) {
    const towerX = -6.2;
    const towerH = 24.5;
    [-1.1, 1.1].forEach((tx) => {
      [-1.1, 1.1].forEach((tz) => {
        const leg = new THREE.Mesh(
          new THREE.BoxGeometry(0.28, towerH, 0.28),
          redTowerMat,
        );
        leg.position.set(towerX + tx, towerH * 0.5 + 0.6, tz);
        root.add(leg);
      });
    });
    for (let lv = 0; lv < 7; lv++) {
      const plat = new THREE.Mesh(
        new THREE.BoxGeometry(2.6, 0.2, 2.6),
        darkMetalMat,
      );
      plat.position.set(towerX, 3.2 + lv * 3.3, 0);
      root.add(plat);
    }
    // Crew Access Swing-Arm Gantry connecting tower to Saturn V hatch
    const gantry = new THREE.Mesh(
      new THREE.BoxGeometry(4.4, 0.65, 1.2),
      redTowerMat,
    );
    gantry.position.set(-3.4, 19.8, 0);
    root.add(gantry);

    // Ground boarding ramp up to the hatch
    const ramp = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.22, 4.2),
      darkMetalMat,
    );
    ramp.position.set(0, 0.9, 5.2);
    ramp.rotation.x = 0.2;
    root.add(ramp);
  }

  return { root, rocketBody, stage1Group, flameGroup };
}

/**
 * Detailed 3D Alien Flying Saucer UFO (hovering in space OR landed on main island)
 */
export function buildAlienUfoMesh(options?: {
  withTractorBeam?: boolean;
}): THREE.Group {
  const g = new THREE.Group();
  const hullMat = new THREE.MeshStandardMaterial({
    color: 0x94a3b8,
    metalness: 0.92,
    roughness: 0.16,
  });
  const darkRingMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    metalness: 0.8,
    roughness: 0.28,
  });
  const domeMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 0.85,
    roughness: 0.12,
    metalness: 0.2,
    transparent: true,
    opacity: 0.85,
  });
  const rimLightMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 1.9,
    roughness: 0.2,
  });

  const saucerTop = new THREE.Mesh(
    new THREE.CylinderGeometry(2.2, 4.4, 0.95, 24),
    hullMat,
  );
  saucerTop.position.y = 0.45;
  const saucerBottom = new THREE.Mesh(
    new THREE.CylinderGeometry(4.4, 1.9, 0.85, 24),
    darkRingMat,
  );
  saucerBottom.position.y = -0.45;
  const cockpitDome = new THREE.Mesh(
    new THREE.SphereGeometry(1.85, 20, 14, 0, Math.PI * 2, 0, Math.PI * 0.55),
    domeMat,
  );
  cockpitDome.position.y = 0.85;
  g.add(saucerTop, saucerBottom, cockpitDome);

  // 12 Glowing Rim Lights
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 8, 8),
      rimLightMat,
    );
    bulb.position.set(Math.cos(a) * 4.2, 0.02, Math.sin(a) * 4.2);
    g.add(bulb);
  }

  if (options?.withTractorBeam !== false) {
    const beamMat = new THREE.MeshBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.22,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const beam = new THREE.Mesh(
      new THREE.ConeGeometry(3.4, 10, 18, 1, true),
      beamMat,
    );
    beam.position.y = -5.6;
    g.add(beam);
  }

  return g;
}

/**
 * Playable 3D Space Planet Surface Arena (with starfield, glowing host star, ringed neighbor planet,
 * biome craters/crystals, landed Saturn V Rocket, and optional hovering UFO!)
 */
export function buildSpacePlanetArena(
  planet: SpacePlanet,
  star: SpaceStar,
  universe: MultiverseUniverse,
  spawnUfo: boolean,
): SpacePlanetArenaHandles {
  const root = new THREE.Group();
  const baseColor = new THREE.Color(planet.color || '#38bdf8');
  const groundColor = baseColor.clone().multiplyScalar(0.55);

  // 1. Planetary Surface Disc (radius 95m)
  const groundMat = new THREE.MeshStandardMaterial({
    color: groundColor,
    roughness: 0.88,
    metalness: 0.08,
  });
  const ground = new THREE.Mesh(
    new THREE.CylinderGeometry(95, 95, 1.2, 48),
    groundMat,
  );
  ground.geometry.computeBoundingBox();
  ground.geometry.computeBoundingSphere();
  ground.position.y = -0.6;
  ground.receiveShadow = true;
  ground.userData.isSpacePlanetGround = true;
  root.add(ground);

  // 2. Biome Surface Formations (Craters, Glowing Alien Crystals, Spires)
  const accentMat = new THREE.MeshStandardMaterial({
    color: baseColor,
    emissive: baseColor,
    emissiveIntensity:
      planet.biome.includes('crystal') ||
      planet.biome.includes('bio') ||
      planet.biome.includes('glow')
        ? 0.9
        : 0.18,
    roughness: 0.45,
    metalness: 0.25,
  });
  const craterMat = new THREE.MeshStandardMaterial({
    color: groundColor.clone().multiplyScalar(0.7),
    roughness: 0.92,
  });

  for (let i = 0; i < 36; i++) {
    const s = Math.sin((i + 1) * 77.13 + (planet.orbitDist || 50)) * 10000;
    const rFrac = s - Math.floor(s);
    const angle = (i / 36) * Math.PI * 2 + rFrac * 0.4;
    const dist = 16 + rFrac * 68;
    const x = Math.cos(angle) * dist;
    const z = Math.sin(angle) * dist;
    if (Math.hypot(x, z + 14) < 12) continue; // Keep Saturn V pad clear!

    if (i % 3 === 0) {
      // Crater rim
      const rim = new THREE.Mesh(
        new THREE.TorusGeometry(2.4 + rFrac * 3.2, 0.42, 8, 18),
        craterMat,
      );
      rim.rotation.x = Math.PI / 2;
      rim.position.set(x, 0.12, z);
      root.add(rim);
    } else {
      // Alien crystal / rock spire
      const h = 2.2 + rFrac * 6.5;
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(0.9 + rFrac * 1.1, h, 6),
        accentMat,
      );
      spire.position.set(x, h * 0.46, z);
      spire.rotation.set((rFrac - 0.5) * 0.2, rFrac * Math.PI, (0.5 - rFrac) * 0.2);
      root.add(spire);
    }
  }

  // 3. Deep Space Starfield Dome
  const starCount = 700;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const u = Math.sin(i * 12.9898) * 43758.5453;
    const v = Math.sin(i * 78.233) * 43758.5453;
    const theta = (u - Math.floor(u)) * Math.PI * 2;
    const phi = Math.acos(Math.max(0.08, v - Math.floor(v)));
    const rad = 240;
    starPositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = rad * Math.cos(phi);
    starPositions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 1.6,
    sizeAttenuation: true,
  });
  const starField = new THREE.Points(starGeo, starMat);
  root.add(starField);

  // 4. Giant Glowing Host Star & Neighboring Ringed Planet in the Sky
  const hostStarMesh = new THREE.Mesh(
    new THREE.SphereGeometry(18, 20, 20),
    new THREE.MeshBasicMaterial({ color: star.color || '#ffdd66' }),
  );
  hostStarMesh.position.set(95, 115, -155);
  root.add(hostStarMesh);

  const neighborGroup = new THREE.Group();
  const neighborMat = new THREE.MeshStandardMaterial({
    color: universe.nebulaColor || '#4c2282',
    emissive: universe.nebulaColor || '#4c2282',
    emissiveIntensity: 0.45,
    roughness: 0.55,
  });
  const neighborBody = new THREE.Mesh(
    new THREE.SphereGeometry(14, 20, 20),
    neighborMat,
  );
  neighborGroup.add(neighborBody);
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(18, 26, 32),
    new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
    }),
  );
  ring.rotation.x = Math.PI * 0.42;
  neighborGroup.add(ring);
  neighborGroup.position.set(-110, 88, -140);
  root.add(neighborGroup);

  // 5. Landed Saturn V Rocket right at the Landing Zone (z = -14)
  const saturn = buildSaturnVRocket({ withLaunchTower: false });
  saturn.root.position.set(0, 0, -14);
  root.add(saturn.root);

  // 6. Optional Hovering Alien UFO Encounter
  let ufoGroup: THREE.Group | null = null;
  if (spawnUfo) {
    ufoGroup = buildAlienUfoMesh({ withTractorBeam: true });
    ufoGroup.position.set(18, 12, -26);
    root.add(ufoGroup);
  }

  return {
    root,
    ufoGroup,
    rocketBody: saturn.rocketBody,
    stage1Group: saturn.stage1Group,
    rocketFlame: saturn.flameGroup,
    dispose: () => {
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh || obj instanceof THREE.Points) {
          obj.geometry?.dispose();
          if (Array.isArray(obj.material)) {
            obj.material.forEach((m) => m.dispose());
          } else {
            obj.material?.dispose();
          }
        }
      });
    },
  };
}
