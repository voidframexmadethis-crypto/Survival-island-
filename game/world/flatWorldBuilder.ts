import * as THREE from 'three';
import { FlatSurfaceStyle } from '../types';
import { HouseStationTarget } from './models';
import { FLAT_GROUND_Y, FLAT_PLAYABLE_MAX_RADIUS } from './terrain';

export interface FlatWorldHandles {
  flatGroup: THREE.Group;
  groundMesh: THREE.Mesh;
  flatStations: HouseStationTarget[];
  tvScreenMat: THREE.MeshStandardMaterial;
  tvScreenMesh: THREE.Mesh;
  tvWorldPos: THREE.Vector3;
  setSurfaceStyle: (style: FlatSurfaceStyle) => void;
  setVisible: (visible: boolean) => void;
  dispose: () => void;
}

function createTurfGridTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Sunlit grass base with subtle organic turf variation
  ctx.fillStyle = '#5f9a45';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4200; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 2.5;
    ctx.fillStyle =
      Math.random() > 0.5
        ? 'rgba(126, 178, 86, 0.28)'
        : 'rgba(67, 118, 45, 0.25)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Clean 4-subdivision park layout grid (every 4m & major 16m lines at repeat 45)
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  ctx.lineWidth = 2;
  const step = size / 4;
  for (let i = 0; i <= 4; i++) {
    const p = i * step;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(45, 45);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

function createConcretePlazaTexture(
  renderer: THREE.WebGLRenderer,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#9aa3ad';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 4500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const v = 138 + Math.floor(Math.random() * 44);
    ctx.fillStyle = `rgba(${v},${v + 2},${v + 5},0.35)`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Theme-park concrete tile expansion seams
  const sub = size / 4;
  for (let gx = 0; gx < 4; gx++) {
    for (let gy = 0; gy < 4; gy++) {
      if ((gx + gy) % 2 === 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.06)';
        ctx.fillRect(gx * sub, gy * sub, sub, sub);
      }
    }
  }
  ctx.strokeStyle = 'rgba(51, 65, 85, 0.35)';
  ctx.lineWidth = 3;
  for (let i = 0; i <= 4; i++) {
    const p = i * sub;
    ctx.beginPath();
    ctx.moveTo(p, 0);
    ctx.lineTo(p, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, p);
    ctx.lineTo(size, p);
    ctx.stroke();
  }

  ctx.strokeStyle = 'rgba(245, 158, 11, 0.28)';
  ctx.lineWidth = 4;
  ctx.strokeRect(2, 2, size - 4, size - 4);

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(45, 45);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function buildFlatWorld(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
): FlatWorldHandles {
  const flatGroup = new THREE.Group();
  flatGroup.name = 'FlatParkWorld';
  flatGroup.visible = false;

  const turfTex = createTurfGridTexture(renderer);
  const concreteTex = createConcretePlazaTexture(renderer);

  const groundMat = new THREE.MeshStandardMaterial({
    map: turfTex,
    roughness: 0.86,
    metalness: 0.04,
  });

  const groundGeo = new THREE.PlaneGeometry(720, 720, 1, 1);
  groundGeo.rotateX(-Math.PI / 2);
  const groundMesh = new THREE.Mesh(groundGeo, groundMat);
  groundMesh.position.set(0, FLAT_GROUND_Y, 0);
  groundMesh.receiveShadow = true;
  flatGroup.add(groundMesh);

  // Subtle Perimeter Park Boundary Markers at FLAT_PLAYABLE_MAX_RADIUS
  const perimeterMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0x78350f,
    emissiveIntensity: 0.35,
    roughness: 0.4,
    metalness: 0.5,
  });
  const pillarGeo = new THREE.CylinderGeometry(0.18, 0.22, 1.8, 8);
  const markerCount = 32;
  for (let i = 0; i < markerCount; i++) {
    const a = (i / markerCount) * Math.PI * 2;
    const post = new THREE.Mesh(pillarGeo, perimeterMat);
    post.position.set(
      Math.cos(a) * (FLAT_PLAYABLE_MAX_RADIUS + 2),
      FLAT_GROUND_Y + 0.9,
      Math.sin(a) * (FLAT_PLAYABLE_MAX_RADIUS + 2),
    );
    flatGroup.add(post);
  }

  // Open-Air Park Hub & Music Pro Pavilion at (0, FLAT_GROUND_Y, -18)
  const hubX = 0;
  const hubZ = -18;
  const pavilion = new THREE.Group();
  pavilion.position.set(hubX, FLAT_GROUND_Y, hubZ);

  const plazaDeckMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.65,
    metalness: 0.2,
  });
  const woodDeckMat = new THREE.MeshStandardMaterial({
    color: 0x78492a,
    roughness: 0.72,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    roughness: 0.35,
    metalness: 0.78,
  });
  const neonTrimMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 1.25,
    roughness: 0.25,
  });

  const pad = new THREE.Mesh(new THREE.BoxGeometry(16, 0.16, 10), plazaDeckMat);
  pad.position.set(0, 0.08, 0);
  pad.receiveShadow = true;
  pavilion.add(pad);

  const stageFloor = new THREE.Mesh(new THREE.BoxGeometry(14.8, 0.06, 8.8), woodDeckMat);
  stageFloor.position.set(0, 0.19, 0);
  stageFloor.receiveShadow = true;
  pavilion.add(stageFloor);

  // 4 corner canopy columns + overhead roof frame
  const colGeo = new THREE.CylinderGeometry(0.18, 0.2, 4.2, 10);
  [
    [-7.1, -4.1],
    [7.1, -4.1],
    [-7.1, 4.1],
    [7.1, 4.1],
  ].forEach(([cx, cz]) => {
    const col = new THREE.Mesh(colGeo, steelMat);
    col.position.set(cx, 2.25, cz);
    col.castShadow = true;
    pavilion.add(col);
  });

  const roof = new THREE.Mesh(new THREE.BoxGeometry(15.6, 0.28, 9.6), steelMat);
  roof.position.set(0, 4.45, 0);
  roof.castShadow = true;
  pavilion.add(roof);

  const roofTrim = new THREE.Mesh(new THREE.BoxGeometry(15.7, 0.09, 9.7), neonTrimMat);
  roofTrim.position.set(0, 4.3, 0);
  pavilion.add(roofTrim);

  // Music Pro Workstation Desk (left side of pavilion)
  const desk = new THREE.Mesh(new THREE.BoxGeometry(3.1, 0.88, 1.15), steelMat);
  desk.position.set(-4.1, 0.66, -1.8);
  desk.castShadow = true;
  pavilion.add(desk);

  const synthMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    emissive: 0x6366f1,
    emissiveIntensity: 0.45,
    roughness: 0.3,
    metalness: 0.5,
  });
  const synthKeys = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.12, 0.56), synthMat);
  synthKeys.position.set(-4.1, 1.16, -1.75);
  pavilion.add(synthKeys);

  // Studio Drums Pad Kit (center-left)
  const drumPad = new THREE.Mesh(
    new THREE.CylinderGeometry(0.65, 0.7, 0.65, 12),
    new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.38, metalness: 0.45 }),
  );
  drumPad.position.set(-1.1, 0.54, -2.0);
  pavilion.add(drumPad);

  // Park Lounge Sofa facing Smart TV (center-right)
  const sofaMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.8 });
  const sofaBase = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.55, 1.05), sofaMat);
  sofaBase.position.set(3.4, 0.48, 0.5);
  const sofaBack = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.72, 0.25), sofaMat);
  sofaBack.position.set(3.4, 0.9, 0.92);
  pavilion.add(sofaBase, sofaBack);

  // Smart TV Wall Display (right side of pavilion, facing +Z toward sofa)
  const tvBezel = new THREE.Mesh(new THREE.BoxGeometry(3.8, 2.15, 0.16), steelMat);
  tvBezel.position.set(3.4, 2.0, -3.5);
  tvBezel.castShadow = true;
  pavilion.add(tvBezel);

  const tvScreenMat = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    emissive: 0xffffff,
    emissiveIntensity: 0.9,
    roughness: 0.15,
    metalness: 0.18,
  });
  const tvScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(3.52, 1.92), tvScreenMat);
  tvScreenMesh.position.set(3.4, 2.0, -3.41);
  pavilion.add(tvScreenMesh);

  const pavilionLight = new THREE.PointLight(0xfef3c7, 2.2, 22, 1.5);
  pavilionLight.position.set(0, 4.0, 0);
  pavilion.add(pavilionLight);

  flatGroup.add(pavilion);
  scene.add(flatGroup);

  const tvWorldPos = new THREE.Vector3(hubX + 3.4, FLAT_GROUND_Y + 2.0, hubZ - 3.41);

  const flatStations: HouseStationTarget[] = [
    {
      id: 'flat_music_studio',
      kind: 'house_music_studio',
      label: 'Open Music Pro Studio',
      sublabel: 'Beats, Keyboard & DAW Mixer',
      x: hubX - 4.1,
      y: FLAT_GROUND_Y + 0.22,
      z: hubZ - 1.5,
      range: 3.4,
    },
    {
      id: 'flat_studio_drums',
      kind: 'house_studio_drums',
      label: 'Play Park Drum Kit',
      sublabel: 'Step Sequencer & Sampler',
      x: hubX - 1.1,
      y: FLAT_GROUND_Y + 0.22,
      z: hubZ - 1.6,
      range: 3.0,
    },
    {
      id: 'flat_smart_tv',
      kind: 'house_tv',
      label: 'Watch Park Smart TV',
      sublabel: 'YouTube, Channels & Local Video',
      x: hubX + 3.4,
      y: FLAT_GROUND_Y + 0.22,
      z: hubZ - 2.3,
      range: 3.8,
    },
    {
      id: 'flat_couch',
      kind: 'house_couch',
      label: 'Sit on Park Lounge Sofa',
      sublabel: 'Watch Park TV & Relax',
      x: hubX + 3.4,
      y: FLAT_GROUND_Y + 0.22,
      z: hubZ + 0.5,
      range: 2.8,
      sitX: hubX + 3.4,
      sitY: FLAT_GROUND_Y + 0.48,
      sitZ: hubZ + 0.45,
      sitYaw: 0,
    },
  ];

  let currentStyle: FlatSurfaceStyle = 'turf_grid';

  return {
    flatGroup,
    groundMesh,
    flatStations,
    tvScreenMat,
    tvScreenMesh,
    tvWorldPos,
    setSurfaceStyle: (style: FlatSurfaceStyle) => {
      if (style === currentStyle) return;
      currentStyle = style;
      groundMat.map = style === 'concrete_plaza' ? concreteTex : turfTex;
      groundMat.needsUpdate = true;
    },
    setVisible: (visible: boolean) => {
      flatGroup.visible = visible;
    },
    dispose: () => {
      scene.remove(flatGroup);
      turfTex.dispose();
      concreteTex.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      perimeterMat.dispose();
      pillarGeo.dispose();
      plazaDeckMat.dispose();
      woodDeckMat.dispose();
      steelMat.dispose();
      neonTrimMat.dispose();
      synthMat.dispose();
      sofaMat.dispose();
      tvScreenMat.dispose();
    },
  };
}
