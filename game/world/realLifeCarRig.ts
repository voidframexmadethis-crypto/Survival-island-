import * as THREE from 'three';
import { ensureGeometryHasUv, getCrossDrilledRotorTexture } from './textures';

export type VehicleArchetype =
  | 'mclaren'
  | 'chevy_tahoe'
  | 'cadillac'
  | 'donk'
  | 'slab'
  | 'lowrider'
  | 'generic_car';

export interface GarageCarVisualConfig {
  id: string;
  displayName: string;
  archetype: VehicleArchetype;
  paintColor: string;
  secondaryColor?: string;
  rimColor?: string;
  underglowColor?: string;
  wheelRadius: number;
  wheelWidth: number;
  wheelBaseZ: number;
  trackWidthX: number;
  hasSubwooferWall?: boolean;
  liveryText?: {
    title: string;
    badge?: string;
    accentColor: string;
  };
}

export interface RealLifeCarRig {
  root: THREE.Group;
  bodyGroup: THREE.Group;
  wheels: THREE.Group[];
  subCones: THREE.Mesh[];
  dispose: () => void;
}

export function normalizeCarArchetype(rawNameOrId: string): VehicleArchetype {
  const s = rawNameOrId.toLowerCase();
  if (s.includes('mclaren') || s.includes('720s') || s.includes('supercar')) return 'mclaren';
  if (s.includes('tahoe') || s.includes('subwoofer') || s.includes('savage life')) return 'chevy_tahoe';
  if (s.includes('cadillac') || s.includes('coupe') || s.includes('deville') || s.includes('caddy')) return 'cadillac';
  if (s.includes('donk')) return 'donk';
  if (s.includes('slab')) return 'slab';
  if (s.includes('lowrider') || s.includes('hydraul')) return 'lowrider';
  return 'generic_car';
}

export function buildSilhouetteGeometry(archetype: VehicleArchetype): THREE.ExtrudeGeometry {
  const shape = new THREE.Shape();

  if (archetype === 'mclaren') {
    // Low-slung wedge supercar profile with sculpted wheel arch cutouts
    shape.moveTo(-2.18, 0.34);
    shape.lineTo(-1.72, 0.34);
    shape.absarc(-1.32, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(0.92, 0.32);
    shape.absarc(1.38, 0.36, 0.42, Math.PI, 0, true);
    shape.lineTo(2.22, 0.3);
    shape.quadraticCurveTo(2.34, 0.44, 2.26, 0.52);
    shape.quadraticCurveTo(1.55, 0.72, 0.85, 0.76);
    shape.quadraticCurveTo(0.45, 0.98, 0.12, 1.13);
    shape.lineTo(-0.82, 1.15);
    shape.quadraticCurveTo(-1.45, 0.96, -1.82, 0.86);
    shape.lineTo(-2.18, 0.78);
    shape.closePath();
  } else if (archetype === 'chevy_tahoe') {
    // Full-size SUV with bold nose, sculpted wheel openings, upright cabin, and squared rear cargo hatch
    shape.moveTo(-2.38, 0.4);
    shape.lineTo(-1.82, 0.4);
    shape.absarc(-1.32, 0.44, 0.52, Math.PI, 0, true);
    shape.lineTo(0.9, 0.4);
    shape.absarc(1.44, 0.44, 0.52, Math.PI, 0, true);
    shape.lineTo(2.4, 0.42);
    shape.quadraticCurveTo(2.48, 0.72, 2.42, 0.94);
    shape.lineTo(1.16, 1.04);
    shape.quadraticCurveTo(0.84, 1.32, 0.58, 1.5);
    shape.lineTo(-2.26, 1.52);
    shape.quadraticCurveTo(-2.42, 1.44, -2.4, 1.34);
    shape.closePath();
  } else if (archetype === 'cadillac' || archetype === 'lowrider' || archetype === 'slab') {
    // Long classic cruiser / coupe / slab profile with wheel arch flares, sculpted hood, and rear deck
    shape.moveTo(-2.45, 0.38);
    shape.lineTo(-1.72, 0.38);
    shape.absarc(-1.24, 0.4, 0.44, Math.PI, 0, true);
    shape.lineTo(0.92, 0.38);
    shape.absarc(1.38, 0.4, 0.44, Math.PI, 0, true);
    shape.lineTo(2.44, 0.38);
    shape.quadraticCurveTo(2.52, 0.64, 2.45, 0.86);
    shape.quadraticCurveTo(1.55, 0.93, 0.76, 0.94);
    shape.quadraticCurveTo(0.42, 1.2, 0.16, 1.34);
    shape.lineTo(-1.14, 1.34);
    shape.quadraticCurveTo(-1.44, 1.12, -1.68, 0.94);
    shape.lineTo(-2.45, 0.88);
    shape.closePath();
  } else if (archetype === 'donk') {
    // Raised classic body with tall wheel arch clearance
    shape.moveTo(-2.28, 0.56);
    shape.lineTo(-1.72, 0.56);
    shape.absarc(-1.24, 0.56, 0.5, Math.PI, 0, true);
    shape.lineTo(0.88, 0.56);
    shape.absarc(1.36, 0.56, 0.5, Math.PI, 0, true);
    shape.lineTo(2.26, 0.56);
    shape.quadraticCurveTo(2.34, 0.8, 2.28, 1.04);
    shape.lineTo(0.72, 1.12);
    shape.quadraticCurveTo(0.42, 1.36, 0.16, 1.52);
    shape.lineTo(-1.1, 1.52);
    shape.quadraticCurveTo(-1.42, 1.3, -1.62, 1.12);
    shape.lineTo(-2.28, 1.06);
    shape.closePath();
  } else {
    // Balanced modern sedan / coupe profile
    shape.moveTo(-2.15, 0.36);
    shape.lineTo(-1.68, 0.36);
    shape.absarc(-1.22, 0.38, 0.42, Math.PI, 0, true);
    shape.lineTo(0.84, 0.36);
    shape.absarc(1.28, 0.38, 0.42, Math.PI, 0, true);
    shape.lineTo(2.16, 0.36);
    shape.quadraticCurveTo(2.24, 0.62, 2.18, 0.84);
    shape.lineTo(0.7, 0.92);
    shape.quadraticCurveTo(0.38, 1.15, 0.1, 1.3);
    shape.lineTo(-1.05, 1.3);
    shape.quadraticCurveTo(-1.35, 1.1, -1.56, 0.9);
    shape.lineTo(-2.15, 0.84);
    shape.closePath();
  }

  const width = archetype === 'chevy_tahoe' || archetype === 'slab' ? 1.88 : 1.74;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelSegments: 4,
    steps: 1,
    bevelSize: 0.06,
    bevelThickness: 0.06,
  });

  geo.rotateY(-Math.PI / 2);
  geo.translate(width * 0.5, 0, 0);
  return ensureGeometryHasUv(geo) as THREE.ExtrudeGeometry;
}

function createLiveryTexture(
  title: string,
  badge: string | undefined,
  accentColor: string,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = '#11141b';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = accentColor;
  ctx.fillRect(0, 336, canvas.width, 26);

  ctx.fillStyle = '#ffffff';
  ctx.font = '900 66px Impact, Arial Black, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title.toUpperCase(), canvas.width / 2, 165);

  if (badge) {
    ctx.fillStyle = accentColor;
    ctx.fillRect(canvas.width / 2 - 220, 205, 440, 92);
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 54px Impact, Arial Black, sans-serif';
    ctx.fillText(badge.toUpperCase(), canvas.width / 2, 270);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

export function buildRealLifeCarRig(config: GarageCarVisualConfig): RealLifeCarRig {
  const root = new THREE.Group();
  const bodyGroup = new THREE.Group();
  root.add(bodyGroup);

  const disposables: Array<{ dispose: () => void }> = [];
  const isPearl = config.archetype === 'cadillac';

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: config.paintColor,
    metalness: isPearl ? 0.35 : 0.7,
    roughness: isPearl ? 0.14 : 0.16,
    clearcoat: 1.0,
    clearcoatRoughness: 0.06,
    envMapIntensity: 1.45,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: config.rimColor ?? '#f8fafc',
    metalness: 0.96,
    roughness: 0.06,
    envMapIntensity: 1.65,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: config.secondaryColor ?? '#1a1e26',
    metalness: 0.82,
    roughness: 0.22,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0b1420',
    metalness: 0.16,
    roughness: 0.05,
    clearcoat: 1.0,
    clearcoatRoughness: 0.04,
    transparent: true,
    opacity: 0.56,
  });
  const leatherMat = new THREE.MeshStandardMaterial({
    color: isPearl ? '#e7dcc8' : '#18181b',
    roughness: 0.58,
    metalness: 0.08,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#111215',
    metalness: 0.08,
    roughness: 0.84,
  });
  const rotorTex = typeof document !== 'undefined' ? getCrossDrilledRotorTexture() : null;
  const rotorMat = new THREE.MeshStandardMaterial({
    color: '#cbd5e1',
    map: rotorTex,
    metalness: 0.86,
    roughness: 0.28,
  });
  const caliperMat = new THREE.MeshPhysicalMaterial({
    color: config.archetype === 'mclaren' ? '#f97316' : config.archetype === 'cadillac' ? '#a3e635' : '#ef4444',
    metalness: 0.45,
    roughness: 0.22,
    clearcoat: 0.85,
  });
  const subBoxMat = new THREE.MeshStandardMaterial({
    color: '#0c0d10',
    metalness: 0.2,
    roughness: 0.65,
  });
  const subConeMat = new THREE.MeshStandardMaterial({
    color: '#252934',
    metalness: 0.35,
    roughness: 0.45,
  });
  const headlightMat = new THREE.MeshStandardMaterial({
    color: '#e0f2fe',
    emissive: '#bae6fd',
    emissiveIntensity: 1.75,
    roughness: 0.14,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 1.5,
    roughness: 0.18,
  });

  disposables.push(
    paintMat,
    chromeMat,
    trimMat,
    glassMat,
    leatherMat,
    tireMat,
    rotorMat,
    caliperMat,
    subBoxMat,
    subConeMat,
    headlightMat,
    taillightMat,
  );

  // Sculpted contoured car body silhouette with beveled wheel arches
  const bodyGeo = buildSilhouetteGeometry(config.archetype);
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyGroup.add(bodyMesh);
  disposables.push(bodyGeo);

  // Tinted windshield canopy / window band + chrome side molding
  const isSuv = config.archetype === 'chevy_tahoe';
  const isWedge = config.archetype === 'mclaren';
  const bodyW = isSuv || config.archetype === 'slab' ? 1.88 : 1.74;
  const glassW = bodyW - 0.12;
  const glassGeo = new THREE.BoxGeometry(
    glassW,
    isWedge ? 0.24 : 0.32,
    isSuv ? 1.95 : 1.28,
  );
  const glassMesh = new THREE.Mesh(glassGeo, glassMat);
  glassMesh.position.set(
    0,
    isWedge ? 0.91 : isSuv ? 1.24 : config.archetype === 'donk' ? 1.32 : 1.12,
    isSuv ? -0.42 : -0.25,
  );
  bodyGroup.add(glassMesh);
  disposables.push(glassGeo);

  // Bolstered leather seats & steering wheel visible inside cabin
  const seatGeo = new THREE.BoxGeometry(0.46, 0.44, 0.44);
  const headrestGeo = new THREE.BoxGeometry(0.24, 0.15, 0.1);
  const seatY = isWedge ? 0.68 : isSuv ? 0.88 : 0.82;
  [-0.4, 0.4].forEach((sx) => {
    const seat = new THREE.Mesh(seatGeo, leatherMat);
    seat.position.set(sx, seatY, -0.18);
    seat.rotation.x = -0.14;
    const hr = new THREE.Mesh(headrestGeo, leatherMat);
    hr.position.set(sx, seatY + 0.26, -0.24);
    bodyGroup.add(seat, hr);
  });
  const steerGeo = new THREE.TorusGeometry(0.14, 0.022, 6, 16);
  const steerWheel = new THREE.Mesh(steerGeo, chromeMat);
  steerWheel.position.set(-0.4, seatY + 0.18, 0.26);
  steerWheel.rotation.x = 0.45;
  bodyGroup.add(steerWheel);
  disposables.push(seatGeo, headrestGeo, steerGeo);

  // Chrome side spear molding & door handles
  const spearGeo = new THREE.BoxGeometry(bodyW + 0.14, 0.036, 3.8);
  const sideSpear = new THREE.Mesh(spearGeo, isWedge ? trimMat : chromeMat);
  sideSpear.position.set(0, isWedge ? 0.54 : isSuv ? 0.72 : 0.66, 0.02);
  bodyGroup.add(sideSpear);
  disposables.push(spearGeo);

  // LED Headlights & Taillights
  const hlGeo = new THREE.BoxGeometry(0.32, 0.09, 0.07);
  const frontZ = isWedge ? 2.24 : isSuv ? 2.43 : 2.42;
  const rearZ = isWedge ? -2.16 : isSuv ? -2.4 : -2.42;
  const hlY = isWedge ? 0.48 : isSuv ? 0.74 : config.archetype === 'donk' ? 0.84 : 0.66;
  [-0.58, 0.58].forEach((hx) => {
    const hl = new THREE.Mesh(hlGeo, headlightMat);
    hl.position.set(hx, hlY, frontZ);
    bodyGroup.add(hl);
  });
  const tlGeo = new THREE.BoxGeometry(1.42, 0.08, 0.07);
  const tailBar = new THREE.Mesh(tlGeo, taillightMat);
  tailBar.position.set(0, hlY + 0.06, rearZ);
  bodyGroup.add(tailBar);
  disposables.push(hlGeo, tlGeo);

  // Mirror chrome bumpers + dual chrome exhaust tips
  const bumperGeo = new THREE.BoxGeometry(config.trackWidthX + 0.14, 0.2, 0.22);
  const bumperMat = isWedge ? trimMat : chromeMat;
  const frontLip = new THREE.Mesh(bumperGeo, bumperMat);
  frontLip.position.set(0, isWedge ? 0.34 : 0.44, frontZ - 0.12);
  const rearLip = new THREE.Mesh(bumperGeo, bumperMat);
  rearLip.position.set(0, isWedge ? 0.38 : 0.46, rearZ + 0.12);
  bodyGroup.add(frontLip, rearLip);
  disposables.push(bumperGeo);

  const exhaustGeo = new THREE.CylinderGeometry(0.048, 0.048, 0.26, 12);
  exhaustGeo.rotateX(Math.PI / 2);
  [-0.54, 0.54].forEach((ex) => {
    const tip = new THREE.Mesh(exhaustGeo, chromeMat);
    tip.position.set(ex, isWedge ? 0.38 : 0.36, rearZ - 0.04);
    bodyGroup.add(tip);
  });
  disposables.push(exhaustGeo);

  if (config.archetype === 'mclaren') {
    const wingGeo = new THREE.BoxGeometry(1.92, 0.06, 0.32);
    const wing = new THREE.Mesh(wingGeo, trimMat);
    wing.position.set(0, 1.02, -2.02);
    wing.rotation.x = 0.14;
    const pylonGeo = new THREE.BoxGeometry(0.06, 0.22, 0.22);
    [-0.52, 0.52].forEach((px) => {
      const pylon = new THREE.Mesh(pylonGeo, trimMat);
      pylon.position.set(px, 0.9, -1.98);
      bodyGroup.add(pylon);
    });
    bodyGroup.add(wing);
    disposables.push(wingGeo, pylonGeo);
  }

  // Optional side livery (e.g., SAVAGE LIFE GAMING + SUBSCRIBE)
  if (config.liveryText) {
    const tex = createLiveryTexture(
      config.liveryText.title,
      config.liveryText.badge,
      config.liveryText.accentColor,
    );
    const liveryMat = tex
      ? new THREE.MeshStandardMaterial({
          map: tex,
          roughness: 0.28,
          metalness: 0.25,
          polygonOffset: true,
          polygonOffsetFactor: -1,
          polygonOffsetUnits: -1,
        })
      : new THREE.MeshStandardMaterial({
          color: config.liveryText.accentColor,
          roughness: 0.28,
          metalness: 0.25,
        });
    const planeGeo = new THREE.PlaneGeometry(2.3, 0.56);
    const halfW = config.trackWidthX * 0.5 + 0.08;

    const leftSide = new THREE.Mesh(planeGeo, liveryMat);
    leftSide.position.set(-halfW, 0.74, -0.4);
    leftSide.rotation.y = -Math.PI / 2;

    const rightSide = new THREE.Mesh(planeGeo, liveryMat);
    rightSide.position.set(halfW, 0.74, -0.4);
    rightSide.rotation.y = Math.PI / 2;

    bodyGroup.add(leftSide, rightSide);
    if (tex) disposables.push(tex);
    disposables.push(liveryMat, planeGeo);
  }

  // Optional rear subwoofer wall (no backseat Tahoe build)
  const subCones: THREE.Mesh[] = [];
  if (config.hasSubwooferWall) {
    const wallGeo = new THREE.BoxGeometry(1.66, 0.72, 0.52);
    const wall = new THREE.Mesh(wallGeo, subBoxMat);
    wall.position.set(0, 0.94, -0.88);
    bodyGroup.add(wall);

    const coneGeo = new THREE.CylinderGeometry(0.23, 0.11, 0.14, 24);
    coneGeo.rotateX(Math.PI / 2);

    const coords: Array<[number, number]> = [
      [-0.42, 1.14],
      [0.42, 1.14],
      [-0.42, 0.74],
      [0.42, 0.74],
    ];
    for (const [x, y] of coords) {
      const cone = new THREE.Mesh(coneGeo, subConeMat);
      cone.position.set(x, y, -0.6);
      cone.userData.baseZ = -0.6;
      bodyGroup.add(cone);
      subCones.push(cone);
    }
    disposables.push(wallGeo, coneGeo);
  }

  // Optional neon underglow bar
  if (config.underglowColor) {
    const glowMat = new THREE.MeshStandardMaterial({
      color: config.underglowColor,
      emissive: config.underglowColor,
      emissiveIntensity: 1.9,
      roughness: 0.2,
    });
    const glowGeo = new THREE.BoxGeometry(config.trackWidthX * 0.86, 0.03, config.wheelBaseZ * 1.9);
    const glowBar = new THREE.Mesh(glowGeo, glowMat);
    glowBar.position.set(0, 0.24, 0);
    bodyGroup.add(glowBar);
    disposables.push(glowMat, glowGeo);
  }

  // Four Oversized Multi-Spoke Chrome Wheels + Cross-Drilled Brake Rotors & Painted Calipers
  const wheels: THREE.Group[] = [];
  const outerR = config.wheelRadius;
  const rimR = outerR * 0.76;
  const wWidth = config.wheelWidth;

  const tireTreadGeo = new THREE.CylinderGeometry(outerR, outerR, wWidth, 28, 1, true);
  tireTreadGeo.rotateZ(Math.PI / 2);
  const tireSideGeo = new THREE.TorusGeometry(outerR * 0.88, (outerR - rimR) * 0.56, 10, 28);
  tireSideGeo.rotateY(Math.PI / 2);

  const rimLipGeo = new THREE.TorusGeometry(rimR, 0.028, 10, 28);
  rimLipGeo.rotateY(Math.PI / 2);
  const rimBarrelGeo = new THREE.CylinderGeometry(rimR, rimR, wWidth * 0.88, 24, 1, true);
  rimBarrelGeo.rotateZ(Math.PI / 2);

  const rotorGeo = new THREE.CylinderGeometry(rimR * 0.78, rimR * 0.78, 0.028, 24);
  rotorGeo.rotateZ(Math.PI / 2);
  ensureGeometryHasUv(rotorGeo);

  const caliperGeo = new THREE.BoxGeometry(0.075, rimR * 0.44, rimR * 0.24);
  const spokeGeo = new THREE.BoxGeometry(0.045, rimR * 0.92, 0.048);
  const hubCapGeo = new THREE.CylinderGeometry(rimR * 0.22, rimR * 0.24, wWidth * 0.22, 16);
  hubCapGeo.rotateZ(Math.PI / 2);

  const halfTrack = config.trackWidthX * 0.5;
  const wheelOffsets: Array<[number, number, number, -1 | 1]> = [
    [-halfTrack, outerR, config.wheelBaseZ, -1],
    [halfTrack, outerR, config.wheelBaseZ, 1],
    [-halfTrack, outerR, -config.wheelBaseZ, -1],
    [halfTrack, outerR, -config.wheelBaseZ, 1],
  ];

  for (const [wx, wy, wz, side] of wheelOffsets) {
    const cornerRoot = new THREE.Group();
    cornerRoot.position.set(wx, wy, wz);

    // Stationary cross-drilled rotor & painted brake caliper behind spokes
    const rotor = new THREE.Mesh(rotorGeo, rotorMat);
    rotor.position.x = -side * (wWidth * 0.08);
    const caliper = new THREE.Mesh(caliperGeo, caliperMat);
    caliper.position.set(-side * (wWidth * 0.06), rimR * 0.36, -rimR * 0.38);
    caliper.rotation.x = 0.45;
    cornerRoot.add(rotor, caliper);

    const spinPivot = new THREE.Group();
    const tireTread = new THREE.Mesh(tireTreadGeo, tireMat);
    tireTread.castShadow = true;
    const sidewallOut = new THREE.Mesh(tireSideGeo, tireMat);
    sidewallOut.position.x = side * (wWidth * 0.42);
    const sidewallIn = new THREE.Mesh(tireSideGeo, tireMat);
    sidewallIn.position.x = -side * (wWidth * 0.42);

    const rimBarrel = new THREE.Mesh(rimBarrelGeo, trimMat);
    const rimLip = new THREE.Mesh(rimLipGeo, chromeMat);
    rimLip.position.x = side * (wWidth * 0.44);
    const hubCap = new THREE.Mesh(hubCapGeo, chromeMat);
    hubCap.position.x = side * (wWidth * 0.32);

    spinPivot.add(tireTread, sidewallOut, sidewallIn, rimBarrel, rimLip, hubCap);

    // 7 sculpted chrome spokes
    for (let s = 0; s < 7; s++) {
      const a = (s / 7) * Math.PI * 2;
      const spoke = new THREE.Mesh(spokeGeo, chromeMat);
      spoke.position.set(
        side * (wWidth * 0.28),
        Math.cos(a) * (rimR * 0.48),
        Math.sin(a) * (rimR * 0.48),
      );
      spoke.rotation.x = a;
      spinPivot.add(spoke);
    }

    cornerRoot.add(spinPivot);
    root.add(cornerRoot);
    wheels.push(spinPivot);
  }

  disposables.push(
    tireTreadGeo,
    tireSideGeo,
    rimLipGeo,
    rimBarrelGeo,
    rotorGeo,
    caliperGeo,
    spokeGeo,
    hubCapGeo,
  );

  return {
    root,
    bodyGroup,
    wheels,
    subCones,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

