import * as THREE from 'three';
import {
  VOLCANO_FLEX_HEIGHT_M,
  VOLCANO_FLEX_NAME,
  getVolcanoFlexSite,
} from './volcanoFlexLayout';

export interface VolcanoFlexEnvironment {
  root: THREE.Group;
  update: (dt: number, elapsed: number, speedKmh: number) => void;
  dispose: () => void;
}

const rockPalette = [0x1c1917, 0x292524, 0x3f2d28, 0x231815, 0x4a2c24];

function seeded(index: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function buildOuterShell(
  height: number,
  baseRadius: number,
  topRadius: number,
  gapAngle: number,
  gapHalf: number,
): THREE.BufferGeometry {
  const segments = 64;
  const rings = 26;
  const positions: number[] = [];
  const colors: number[] = [];
  const indices: number[] = [];
  const color = new THREE.Color();

  const buriedBase = -30;
  for (let ring = 0; ring <= rings; ring++) {
    const t = ring / rings;
    const y = buriedBase + t * (height - buriedBase);
    const coneR = THREE.MathUtils.lerp(baseRadius, topRadius, t);
    for (let seg = 0; seg < segments; seg++) {
      const angle = (seg / segments) * Math.PI * 2;
      const angularDistance = Math.abs(
        Math.atan2(Math.sin(angle - gapAngle), Math.cos(angle - gapAngle)),
      );
      const gap = y < 17.5 && angularDistance < gapHalf;
      const jag =
        1 +
        Math.sin(angle * 4.0 + y * 0.045) * 0.055 +
        Math.sin(angle * 9.0 - y * 0.018) * 0.035 +
        (seeded(ring * segments + seg) - 0.5) * 0.024;
      const radius = gap ? coneR * 0.9 : coneR * jag;
      positions.push(Math.cos(angle) * radius, y, Math.sin(angle) * radius);
      color.setHex(rockPalette[(ring + seg) % rockPalette.length]);
      colors.push(color.r, color.g, color.b);
    }
  }

  for (let ring = 0; ring < rings; ring++) {
    const t = (ring + 0.5) / rings;
    const y = t * height;
    for (let seg = 0; seg < segments; seg++) {
      const angle = (seg / segments) * Math.PI * 2;
      const angularDistance = Math.abs(
        Math.atan2(Math.sin(angle - gapAngle), Math.cos(angle - gapAngle)),
      );
      const nextAngle = ((seg + 1) / segments) * Math.PI * 2;
      const nextDistance = Math.abs(
        Math.atan2(Math.sin(nextAngle - gapAngle), Math.cos(nextAngle - gapAngle)),
      );
      if (y < 17.5 && angularDistance < gapHalf && nextDistance < gapHalf) continue;
      const a = ring * segments + seg;
      const b = ring * segments + ((seg + 1) % segments);
      const c = (ring + 1) * segments + seg;
      const d = (ring + 1) * segments + ((seg + 1) % segments);
      indices.push(a, c, b, b, c, d);
    }
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function stationSignTexture(): THREE.Texture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const grad = ctx.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#250b07');
  grad.addColorStop(1, '#090605');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 1024, 256);
  ctx.strokeStyle = '#f97316';
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
 * The complete volcano, artificial lava system, smoke/ember effects and
 * station canopy. The lava is purely visual and never participates in the
 * coaster collision or physics.
 */
export function buildVolcanoFlexEnvironment(): VolcanoFlexEnvironment {
  const site = getVolcanoFlexSite();
  const root = new THREE.Group();
  root.name = 'volcano-flex-environment';
  root.position.set(site.mountain.x, site.mountain.y, site.mountain.z);

  const height = VOLCANO_FLEX_HEIGHT_M;
  const stationDirection = new THREE.Vector3(
    site.station.x - site.mountain.x,
    0,
    site.station.z - site.mountain.z,
  );
  const gapAngle = Math.atan2(stationDirection.z, stationDirection.x);

  const rockMat = new THREE.MeshStandardMaterial({
    vertexColors: true,
    roughness: 0.96,
    metalness: 0.03,
    flatShading: true,
    side: THREE.DoubleSide,
  });
  const outer = new THREE.Mesh(
    buildOuterShell(height, 55, 19, gapAngle, 0.18),
    rockMat,
  );
  outer.name = 'volcano-outer-shell';
  outer.castShadow = true;
  outer.receiveShadow = true;
  root.add(outer);

  const chamberMat = new THREE.MeshStandardMaterial({
    color: 0x2a1712,
    emissive: 0x180603,
    emissiveIntensity: 0.38,
    roughness: 0.88,
    metalness: 0.06,
    side: THREE.BackSide,
  });
  const chamber = new THREE.Mesh(
    new THREE.CylinderGeometry(18, 52, height + 29, 64, 18, true),
    chamberMat,
  );
  chamber.name = 'volcano-inner-chamber';
  chamber.position.y = (height - 30) * 0.5;
  root.add(chamber);

  // Jagged interior buttresses make the chamber read as volcanic rock rather
  // than a smooth cylinder when the train passes close to the wall.
  const buttressMat = new THREE.MeshStandardMaterial({
    color: 0x3a211b,
    roughness: 0.93,
    flatShading: true,
  });
  for (let i = 0; i < 18; i++) {
    const angle = (i / 18) * Math.PI * 2 + 0.14;
    const buttress = new THREE.Mesh(
      new THREE.ConeGeometry(3.2 + seeded(i) * 2.1, 36 + seeded(i + 20) * 55, 5),
      buttressMat,
    );
    const radius = 39 - (i % 3) * 2.5;
    buttress.position.set(
      Math.cos(angle) * radius,
      22 + seeded(i + 9) * 150,
      Math.sin(angle) * radius,
    );
    buttress.rotation.z = (seeded(i + 4) - 0.5) * 0.28;
    root.add(buttress);
  }

  const craterRim = new THREE.Mesh(
    new THREE.TorusGeometry(19.2, 2.4, 8, 48),
    new THREE.MeshStandardMaterial({
      color: 0x2c1914,
      emissive: 0x7c2d12,
      emissiveIntensity: 0.55,
      roughness: 0.8,
    }),
  );
  craterRim.name = 'volcano-crater-rim';
  craterRim.rotation.x = Math.PI / 2;
  craterRim.position.y = height - 0.4;
  root.add(craterRim);

  const lavaMat = new THREE.MeshStandardMaterial({
    color: 0xff6a00,
    emissive: 0xff3d00,
    emissiveIntensity: 2.1,
    roughness: 0.22,
    metalness: 0.04,
  });
  lavaMat.name = 'volcano-lava-material';
  const lavaPool = new THREE.Mesh(new THREE.CircleGeometry(25, 48), lavaMat);
  lavaPool.name = 'volcano-lava-pool';
  lavaPool.rotation.x = -Math.PI / 2;
  lavaPool.position.y = 0.55;
  root.add(lavaPool);

  const lavaRiverPoints = [
    new THREE.Vector3(-24, 1.1, 2),
    new THREE.Vector3(-8, 1.2, 14),
    new THREE.Vector3(15, 1.05, 8),
    new THREE.Vector3(34, 0.9, 24),
  ];
  const lavaRiver = new THREE.Mesh(
    new THREE.TubeGeometry(
      new THREE.CatmullRomCurve3(lavaRiverPoints),
      52,
      1.15,
      8,
      false,
    ),
    lavaMat,
  );
  lavaRiver.name = 'volcano-lava-river';
  root.add(lavaRiver);

  const lavaFallCurve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(25, height - 30, -10),
    new THREE.Vector3(31, 170, -5),
    new THREE.Vector3(27, 90, 3),
    new THREE.Vector3(21, 2, 7),
  ]);
  const lavaFallMat = new THREE.MeshStandardMaterial({
    color: 0xff7a18,
    emissive: 0xff3100,
    emissiveIntensity: 2.6,
    roughness: 0.25,
  });
  const lavaFall = new THREE.Mesh(
    new THREE.TubeGeometry(lavaFallCurve, 72, 1.05, 8, false),
    lavaFallMat,
  );
  lavaFall.name = 'volcano-lava-fall';
  root.add(lavaFall);

  // Glowing fissures crawl up the chamber walls.
  const crackPositions: number[] = [];
  for (let i = 0; i < 90; i++) {
    const angle = seeded(i + 100) * Math.PI * 2;
    const y = 5 + seeded(i + 300) * (height - 24);
    const innerRadius = THREE.MathUtils.lerp(51, 18.6, y / height) - 0.2;
    const len = 2.5 + seeded(i + 500) * 8;
    crackPositions.push(
      Math.cos(angle) * innerRadius,
      y,
      Math.sin(angle) * innerRadius,
      Math.cos(angle + 0.018) * innerRadius + Math.cos(angle) * len * 0.18,
      Math.min(height - 8, y + len),
      Math.sin(angle + 0.018) * innerRadius + Math.sin(angle) * len * 0.18,
    );
  }
  const crackGeo = new THREE.BufferGeometry();
  crackGeo.setAttribute('position', new THREE.Float32BufferAttribute(crackPositions, 3));
  const cracks = new THREE.LineSegments(
    crackGeo,
    new THREE.LineBasicMaterial({
      color: 0xff7a18,
      transparent: true,
      opacity: 0.9,
    }),
  );
  cracks.name = 'volcano-glowing-cracks';
  root.add(cracks);

  // Embers swirl inside the chamber and stream from the crater.
  const emberCount = 520;
  const emberPositions = new Float32Array(emberCount * 3);
  const emberSpeed = new Float32Array(emberCount);
  for (let i = 0; i < emberCount; i++) {
    const angle = seeded(i + 900) * Math.PI * 2;
    const radius = 8 + seeded(i + 1100) * 42;
    emberPositions[i * 3] = Math.cos(angle) * radius;
    emberPositions[i * 3 + 1] = seeded(i + 1300) * height;
    emberPositions[i * 3 + 2] = Math.sin(angle) * radius;
    emberSpeed[i] = 1.2 + seeded(i + 1500) * 4.4;
  }
  const emberGeo = new THREE.BufferGeometry();
  emberGeo.setAttribute('position', new THREE.BufferAttribute(emberPositions, 3));
  const embers = new THREE.Points(
    emberGeo,
    new THREE.PointsMaterial({
      color: 0xffb066,
      size: 0.72,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      sizeAttenuation: true,
    }),
  );
  embers.name = 'volcano-embers';
  root.add(embers);

  const smokeCount = 180;
  const smokePositions = new Float32Array(smokeCount * 3);
  for (let i = 0; i < smokeCount; i++) {
    smokePositions[i * 3] = (seeded(i + 2100) - 0.5) * 56;
    smokePositions[i * 3 + 1] = height + seeded(i + 2200) * 58;
    smokePositions[i * 3 + 2] = (seeded(i + 2300) - 0.5) * 56;
  }
  const smokeGeo = new THREE.BufferGeometry();
  smokeGeo.setAttribute('position', new THREE.BufferAttribute(smokePositions, 3));
  const smoke = new THREE.Points(
    smokeGeo,
    new THREE.PointsMaterial({
      color: 0x57534e,
      size: 9.5,
      transparent: true,
      opacity: 0.19,
      depthWrite: false,
      sizeAttenuation: true,
    }),
  );
  smoke.name = 'volcano-smoke';
  root.add(smoke);

  // Simulated eruptions: physical-looking lava bombs launched from the crater.
  const bombCount = 28;
  const bombs = new THREE.InstancedMesh(
    new THREE.DodecahedronGeometry(1.4, 0),
    new THREE.MeshBasicMaterial({ color: 0xff5a12 }),
    bombCount,
  );
  bombs.name = 'volcano-eruption-bombs';
  bombs.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  root.add(bombs);
  const bombState = Array.from({ length: bombCount }, (_, i) => ({
    x: (seeded(i + 3000) - 0.5) * 18,
    y: -999,
    z: (seeded(i + 3100) - 0.5) * 18,
    vx: 0,
    vy: 0,
    vz: 0,
    life: 0,
  }));
  let eruptionTimer = 5.5;
  let eruptionFlash = 0;
  const dummy = new THREE.Object3D();

  const chamberGlow = new THREE.PointLight(0xff4d00, 4.2, 115, 1.8);
  chamberGlow.name = 'volcano-chamber-glow';
  chamberGlow.position.set(0, 24, 0);
  root.add(chamberGlow);
  const craterGlow = new THREE.PointLight(0xff7a18, 5.6, 170, 1.7);
  craterGlow.name = 'volcano-crater-glow';
  craterGlow.position.set(0, height + 3, 0);
  root.add(craterGlow);
  const lavaGlow = new THREE.PointLight(0xff9a3c, 3.1, 52, 1.8);
  lavaGlow.name = 'volcano-lava-glow';
  lavaGlow.position.set(0, 2.5, 0);
  root.add(lavaGlow);

  // Blacked-out tunnel mouth and an outward-facing arch at the launch portal.
  const portal = new THREE.Group();
  portal.name = 'volcano-launch-portal';
  const portalX = site.station.x - site.mountain.x;
  const portalZ = site.station.z - site.mountain.z;
  portal.position.set(portalX * 0.84, 5.4, portalZ * 0.84);
  portal.lookAt(
    site.station.x - site.mountain.x,
    portal.position.y,
    site.station.z - site.mountain.z,
  );
  const tunnel = new THREE.Mesh(
    new THREE.CylinderGeometry(6.2, 6.2, 34, 22, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x090707,
      roughness: 1,
      metalness: 0,
      side: THREE.BackSide,
    }),
  );
  tunnel.rotation.x = Math.PI / 2;
  tunnel.position.z = -12;
  portal.add(tunnel);
  const arch = new THREE.Mesh(
    new THREE.TorusGeometry(6.6, 0.8, 8, 28, Math.PI),
    new THREE.MeshStandardMaterial({
      color: 0x44403c,
      emissive: 0x3b1108,
      emissiveIntensity: 0.5,
      roughness: 0.72,
      metalness: 0.5,
    }),
  );
  arch.rotation.z = Math.PI;
  arch.position.z = 2;
  portal.add(arch);
  root.add(portal);

  // Queue canopy and VOLCANO FLEX marquee at the boarding station.
  const stationGroup = new THREE.Group();
  stationGroup.name = 'volcano-flex-station';
  // The train leaves the 10-ft survey point heading east. Centre the canopy
  // over that boarding spur so no roof or post overhangs the waterpark deck.
  stationGroup.position.set(
    site.station.x - site.mountain.x + 8,
    site.station.y - site.mountain.y,
    site.station.z - site.mountain.z,
  );
  const ironMat = new THREE.MeshStandardMaterial({
    color: 0x1c1917,
    roughness: 0.4,
    metalness: 0.8,
  });
  // The coaster-station structure supplies the roof, deck and air gates. The
  // themed group adds the oversized marquee and its support masts so the
  // attraction reads from across the waterpark without a second roof.
  // A gantry straddles the boarding spur. Every leg is at least 6 m off the
  // centreline, so the train and its over-shoulder restraints never clip them.
  for (const mx of [-6.2, 6.2]) {
    for (const mz of [-6.6, 6.6]) {
      const mast = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 8.8, 8), ironMat);
      mast.position.set(mx, 4.4, mz);
      mast.castShadow = true;
      stationGroup.add(mast);
    }
    const crossbar = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 13.4), ironMat);
    crossbar.position.set(mx, 8.72, 0);
    stationGroup.add(crossbar);
  }
  const signTexture = stationSignTexture();
  if (signTexture) {
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 3.5),
      new THREE.MeshBasicMaterial({ map: signTexture, toneMapped: false }),
    );
    sign.name = 'volcano-flex-sign';
    sign.position.set(0, 6.9, 0);
    stationGroup.add(sign);
    const signBack = new THREE.Mesh(
      new THREE.BoxGeometry(14.5, 4, 0.18),
      ironMat,
    );
    signBack.position.set(0, 6.9, -0.12);
    stationGroup.add(signBack);
  }
  const stationLamp = new THREE.PointLight(0xff8a3d, 1.8, 26, 1.8);
  stationLamp.position.set(0, 4.4, 0);
  stationGroup.add(stationLamp);
  root.add(stationGroup);

  const dummyMatrix = new THREE.Matrix4();
  const resetEruption = () => {
    for (const bomb of bombState) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 8 + Math.random() * 14;
      bomb.x = Math.cos(angle) * (3 + Math.random() * 10);
      bomb.z = Math.sin(angle) * (3 + Math.random() * 10);
      bomb.y = height + 2;
      bomb.vx = Math.cos(angle) * speed;
      bomb.vz = Math.sin(angle) * speed;
      bomb.vy = 18 + Math.random() * 24;
      bomb.life = 3.4 + Math.random() * 2.8;
    }
    eruptionFlash = 1;
  };

  const update = (dt: number, elapsed: number, speedKmh: number) => {
    const pulse = 1.8 + Math.sin(elapsed * 1.7) * 0.25 + Math.sin(elapsed * 5.3) * 0.08;
    lavaMat.emissiveIntensity = pulse + eruptionFlash * 2.2;
    lavaFallMat.emissiveIntensity = pulse + 0.5;
    chamberMat.emissiveIntensity = 0.28 + Math.sin(elapsed * 0.9) * 0.06;
    chamberGlow.intensity = 3.5 + Math.sin(elapsed * 1.4) * 0.5 + eruptionFlash * 6;
    lavaGlow.intensity = 2.5 + Math.sin(elapsed * 2.1) * 0.3;
    craterGlow.intensity = 5 + eruptionFlash * 14;
    stationLamp.intensity = 1.45 + Math.sin(elapsed * 2.5) * 0.15;
    eruptionFlash = Math.max(0, eruptionFlash - dt * 0.65);

    const emberAttr = embers.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < emberCount; i++) {
      const idx = i * 3;
      emberAttr.array[idx + 1] += emberSpeed[i] * dt;
      emberAttr.array[idx] += Math.sin(elapsed * 2 + i) * dt * 0.65;
      emberAttr.array[idx + 2] += Math.cos(elapsed * 1.7 + i * 0.7) * dt * 0.65;
      if (emberAttr.array[idx + 1] > height + 8) {
        emberAttr.array[idx + 1] = 2 + seeded(i + Math.floor(elapsed)) * 14;
      }
    }
    emberAttr.needsUpdate = true;

    const smokeAttr = smoke.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < smokeCount; i++) {
      const idx = i * 3;
      smokeAttr.array[idx + 1] += dt * (1.4 + (i % 7) * 0.16);
      smokeAttr.array[idx] += Math.sin(elapsed * 0.3 + i) * dt * 1.6;
      if (smokeAttr.array[idx + 1] > height + 96) {
        smokeAttr.array[idx + 1] = height + 4;
      }
    }
    smokeAttr.needsUpdate = true;
    smoke.rotation.y = elapsed * 0.014;
    smoke.material.opacity = 0.16 + Math.min(0.08, speedKmh * 0.00012);

    eruptionTimer -= dt;
    if (eruptionTimer <= 0) {
      resetEruption();
      eruptionTimer = 11.5 + Math.random() * 7;
    }

    let bombWrite = 0;
    for (const bomb of bombState) {
      if (bomb.life > 0) {
        bomb.life -= dt;
        bomb.vy -= 9.81 * dt;
        bomb.x += bomb.vx * dt;
        bomb.y += bomb.vy * dt;
        bomb.z += bomb.vz * dt;
        if (bomb.y < 1.4) {
          bomb.life = 0;
          bomb.y = -999;
        }
      }
      dummy.position.set(bomb.x, bomb.y, bomb.z);
      dummy.scale.setScalar(bomb.life > 0 ? 1 + Math.sin(elapsed * 14 + bombWrite) * 0.12 : 0.001);
      dummy.updateMatrix();
      dummyMatrix.copy(dummy.matrix);
      bombs.setMatrixAt(bombWrite++, dummyMatrix);
    }
    bombs.instanceMatrix.needsUpdate = true;
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

  return { root, update, dispose };
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
