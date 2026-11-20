import * as THREE from 'three';

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
    // Low-slung wedge supercar profile
    shape.moveTo(-2.15, 0.34);
    shape.lineTo(2.2, 0.3);
    shape.lineTo(2.28, 0.5);
    shape.lineTo(0.85, 0.74);
    shape.lineTo(0.12, 1.12);
    shape.lineTo(-0.82, 1.14);
    shape.lineTo(-1.78, 0.86);
    shape.lineTo(-2.18, 0.76);
    shape.closePath();
  } else if (archetype === 'chevy_tahoe') {
    // Full-size SUV with bold nose, upright cabin, and squared rear cargo hatch
    shape.moveTo(-2.38, 0.42);
    shape.lineTo(2.38, 0.42);
    shape.lineTo(2.42, 0.92);
    shape.lineTo(1.15, 1.02);
    shape.lineTo(0.58, 1.48);
    shape.lineTo(-2.26, 1.5);
    shape.lineTo(-2.4, 1.38);
    shape.closePath();
  } else if (archetype === 'cadillac' || archetype === 'lowrider' || archetype === 'slab') {
    // Long classic cruiser / coupe / slab profile with distinct hood, cabin, and rear deck
    shape.moveTo(-2.45, 0.38);
    shape.lineTo(2.42, 0.38);
    shape.lineTo(2.46, 0.84);
    shape.lineTo(0.75, 0.92);
    shape.lineTo(0.15, 1.34);
    shape.lineTo(-1.15, 1.34);
    shape.lineTo(-1.68, 0.94);
    shape.lineTo(-2.45, 0.88);
    shape.closePath();
  } else if (archetype === 'donk') {
    // Raised classic body with tall wheel arch clearance
    shape.moveTo(-2.25, 0.56);
    shape.lineTo(2.25, 0.56);
    shape.lineTo(2.28, 1.02);
    shape.lineTo(0.72, 1.1);
    shape.lineTo(0.15, 1.52);
    shape.lineTo(-1.1, 1.52);
    shape.lineTo(-1.62, 1.12);
    shape.lineTo(-2.25, 1.06);
    shape.closePath();
  } else {
    // Balanced modern sedan / coupe profile
    shape.moveTo(-2.15, 0.36);
    shape.lineTo(2.15, 0.36);
    shape.lineTo(2.2, 0.82);
    shape.lineTo(0.7, 0.9);
    shape.lineTo(0.1, 1.3);
    shape.lineTo(-1.05, 1.3);
    shape.lineTo(-1.55, 0.9);
    shape.lineTo(-2.15, 0.84);
    shape.closePath();
  }

  const width = archetype === 'chevy_tahoe' || archetype === 'slab' ? 1.88 : 1.74;
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: width,
    bevelEnabled: true,
    bevelSegments: 3,
    steps: 1,
    bevelSize: 0.05,
    bevelThickness: 0.05,
  });

  geo.rotateY(-Math.PI / 2);
  geo.translate(width * 0.5, 0, 0);
  return geo;
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

  const paintMat = new THREE.MeshPhysicalMaterial({
    color: config.paintColor,
    metalness: 0.5,
    roughness: 0.22,
    clearcoat: 0.95,
    clearcoatRoughness: 0.07,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: config.secondaryColor ?? '#1a1e26',
    metalness: 0.72,
    roughness: 0.34,
  });
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#0b1420',
    metalness: 0.12,
    roughness: 0.06,
    clearcoat: 1.0,
    transparent: true,
    opacity: 0.76,
  });
  const tireMat = new THREE.MeshStandardMaterial({
    color: '#131417',
    metalness: 0.05,
    roughness: 0.86,
  });
  const rimMat = new THREE.MeshStandardMaterial({
    color: config.rimColor ?? '#e2e8f0',
    metalness: 0.9,
    roughness: 0.18,
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
    emissive: '#7dd3fc',
    emissiveIntensity: 1.5,
    roughness: 0.18,
  });
  const taillightMat = new THREE.MeshStandardMaterial({
    color: '#ef4444',
    emissive: '#dc2626',
    emissiveIntensity: 1.4,
    roughness: 0.2,
  });

  disposables.push(
    paintMat,
    trimMat,
    glassMat,
    tireMat,
    rimMat,
    subBoxMat,
    subConeMat,
    headlightMat,
    taillightMat,
  );

  // Sculpted car body silhouette
  const bodyGeo = buildSilhouetteGeometry(config.archetype);
  const bodyMesh = new THREE.Mesh(bodyGeo, paintMat);
  bodyMesh.castShadow = true;
  bodyMesh.receiveShadow = true;
  bodyGroup.add(bodyMesh);
  disposables.push(bodyGeo);

  // Tinted windshield canopy / window band for authentic car silhouette readability
  const isSuv = config.archetype === 'chevy_tahoe';
  const isWedge = config.archetype === 'mclaren';
  const glassW = (isSuv || config.archetype === 'slab' ? 1.88 : 1.74) - 0.12;
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

  // Headlight & Taillight accents
  const hlGeo = new THREE.BoxGeometry(0.32, 0.08, 0.06);
  const frontZ = isWedge ? 2.22 : isSuv ? 2.41 : 2.38;
  const rearZ = isWedge ? -2.14 : isSuv ? -2.38 : -2.38;
  const hlY = isWedge ? 0.48 : isSuv ? 0.72 : config.archetype === 'donk' ? 0.82 : 0.64;
  [-0.58, 0.58].forEach((hx) => {
    const hl = new THREE.Mesh(hlGeo, headlightMat);
    hl.position.set(hx, hlY, frontZ);
    bodyGroup.add(hl);
  });
  const tlGeo = new THREE.BoxGeometry(1.42, 0.075, 0.06);
  const tailBar = new THREE.Mesh(tlGeo, taillightMat);
  tailBar.position.set(0, hlY + 0.06, rearZ);
  bodyGroup.add(tailBar);
  disposables.push(hlGeo, tlGeo);

  // Lower splitter / bumper trim & rear wing for supercars
  const bumperGeo = new THREE.BoxGeometry(config.trackWidthX + 0.08, 0.24, 0.24);
  const frontLip = new THREE.Mesh(bumperGeo, trimMat);
  frontLip.position.set(0, config.archetype === 'mclaren' ? 0.34 : 0.46, 2.25);
  const rearLip = new THREE.Mesh(bumperGeo, trimMat);
  rearLip.position.set(0, config.archetype === 'mclaren' ? 0.4 : 0.48, -2.25);
  bodyGroup.add(frontLip, rearLip);
  disposables.push(bumperGeo);

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
    const halfW = config.trackWidthX * 0.5 + 0.06;

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

  // Four wheels sized to the car's archetype
  const wheels: THREE.Group[] = [];
  const tireGeo = new THREE.CylinderGeometry(
    config.wheelRadius,
    config.wheelRadius,
    config.wheelWidth,
    24,
  );
  tireGeo.rotateZ(Math.PI / 2);
  const rimGeo = new THREE.CylinderGeometry(
    config.wheelRadius * 0.64,
    config.wheelRadius * 0.64,
    config.wheelWidth + 0.02,
    16,
  );
  rimGeo.rotateZ(Math.PI / 2);

  const halfTrack = config.trackWidthX * 0.5;
  const wheelOffsets: Array<[number, number, number]> = [
    [-halfTrack, config.wheelRadius, config.wheelBaseZ],
    [halfTrack, config.wheelRadius, config.wheelBaseZ],
    [-halfTrack, config.wheelRadius, -config.wheelBaseZ],
    [halfTrack, config.wheelRadius, -config.wheelBaseZ],
  ];

  for (const [wx, wy, wz] of wheelOffsets) {
    const pivot = new THREE.Group();
    pivot.position.set(wx, wy, wz);
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;
    const rim = new THREE.Mesh(rimGeo, rimMat);
    pivot.add(tire, rim);
    root.add(pivot);
    wheels.push(pivot);
  }

  disposables.push(tireGeo, rimGeo);

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
