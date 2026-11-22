import * as THREE from 'three';
import { LOUISIANA_CITY_GROUND_Y } from './louisianaLandmass';

/**
 * Distinct Crescent City neighborhood gateways and street-name blades.
 * The city already has separate building stock, roads and enterable
 * businesses per district; these markers make the neighborhoods legible from
 * the street and from the ferry approach.
 */

interface Neighborhood {
  name: string;
  subtitle: string;
  x: number;
  z: number;
  yaw: number;
  accent: string;
  streets: string[];
}

const NEIGHBORHOODS: readonly Neighborhood[] = [
  {
    name: 'French Quarter',
    subtitle: 'Vieux Carré · Royal & Bourbon',
    x: -150,
    z: 1320,
    yaw: 0,
    accent: '#e0a34b',
    streets: ['Rue Royal', 'Bourbon St', 'Decatur St'],
  },
  {
    name: 'Marigny',
    subtitle: 'Faubourg Marigny · music row',
    x: 185,
    z: 1335,
    yaw: Math.PI * 0.5,
    accent: '#c86b9a',
    streets: ['Frenchmen St', 'Elysian Fields'],
  },
  {
    name: 'Warehouse District',
    subtitle: 'Arts district · riverfront',
    x: 320,
    z: 1450,
    yaw: Math.PI,
    accent: '#5ba7b9',
    streets: ['Tchoupitoulas', 'Julia St'],
  },
  {
    name: 'Garden District',
    subtitle: 'Oak avenues · antebellum rows',
    x: -285,
    z: 1500,
    yaw: 0,
    accent: '#7fa86a',
    streets: ['St. Charles Ave', 'Magazine St'],
  },
  {
    name: 'Riverbend',
    subtitle: 'Carrollton · streetcar terminus',
    x: 40,
    z: 1645,
    yaw: Math.PI,
    accent: '#d97b5b',
    streets: ['Carrollton Ave', 'Oak St'],
  },
  {
    name: 'West Bank',
    subtitle: 'Algiers · ferry landing',
    x: -390,
    z: 1430,
    yaw: Math.PI * 0.5,
    accent: '#9a7cc4',
    streets: ['Opelousas Ave', 'Newton St'],
  },
];

function createSignTexture(title: string, subtitle: string, accent: string): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 320;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#171b1d';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 18;
  ctx.strokeRect(9, 9, canvas.width - 18, canvas.height - 18);
  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, canvas.width, 14);
  ctx.font = '900 78px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8f1de';
  ctx.fillText(title.toUpperCase().slice(0, 28), canvas.width / 2, 142);
  ctx.font = '600 38px sans-serif';
  ctx.fillStyle = accent;
  ctx.fillText(subtitle.toUpperCase().slice(0, 44), canvas.width / 2, 212);
  ctx.font = '700 26px sans-serif';
  ctx.fillStyle = '#b9b2a2';
  ctx.fillText('CRESCENT CITY · LOUISIANA', canvas.width / 2, 270);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

export function buildLouisianaNeighborhoods(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'crescent-city-neighborhood-gateways';
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x24292c, roughness: 0.55, metalness: 0.55 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9b968b, roughness: 0.9 });
  const boxGeo = new THREE.BoxGeometry(1, 1, 1);
  const planeGeo = new THREE.PlaneGeometry(1, 1);
  const addBox = (
    mat: THREE.Material,
    w: number,
    h: number,
    d: number,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D,
  ) => {
    const mesh = new THREE.Mesh(boxGeo, mat);
    mesh.scale.set(w, h, d);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    parent.add(mesh);
    return mesh;
  };

  for (const hood of NEIGHBORHOODS) {
    const root = new THREE.Group();
    root.position.set(hood.x, LOUISIANA_CITY_GROUND_Y, hood.z);
    root.rotation.y = hood.yaw;
    group.add(root);
    // Street-side stone piers and iron arch.
    for (const side of [-1, 1]) {
      addBox(stoneMat, 1.2, 6.2, 1.2, side * 5.8, 3.1, 0, root).castShadow = true;
      addBox(ironMat, 1.5, 0.35, 1.5, side * 5.8, 6.3, 0, root);
      addBox(ironMat, 0.35, 4.7, 0.35, side * 4.1, 4.1, 0, root);
    }
    addBox(ironMat, 13.0, 0.35, 0.5, 0, 6.4, 0, root);
    addBox(ironMat, 0.18, 2.1, 0.18, 0, 5.55, 0, root);
    const texture = createSignTexture(hood.name, hood.subtitle, hood.accent);
    if (texture) {
      const signMat = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false, side: THREE.DoubleSide });
      const sign = new THREE.Mesh(planeGeo, signMat);
      sign.scale.set(11.4, 3.55, 1);
      sign.position.set(0, 5.35, 0.28);
      root.add(sign);
      const back = new THREE.Mesh(planeGeo, signMat);
      back.scale.set(11.4, 3.55, 1);
      back.position.set(0, 5.35, -0.28);
      back.rotation.y = Math.PI;
      root.add(back);
    }
    // Street-name blades on each pier.
    for (let i = 0; i < hood.streets.length; i++) {
      const bladeTex = createSignTexture(hood.streets[i], 'Crescent City', hood.accent);
      if (!bladeTex) continue;
      const bladeMat = new THREE.MeshBasicMaterial({ map: bladeTex, toneMapped: false, side: THREE.DoubleSide });
      const blade = new THREE.Mesh(planeGeo, bladeMat);
      blade.scale.set(3.6, 1.12, 1);
      blade.position.set(-6.8 + i * 6.8, 7.25 + (i % 2) * 0.9, 0.3);
      root.add(blade);
    }
    // Warm lantern light under the gateway.
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.32, 10, 8),
      new THREE.MeshStandardMaterial({
        color: 0xffdf9b,
        emissive: 0xffb347,
        emissiveIntensity: 1.5,
        roughness: 0.25,
      }),
    );
    lamp.position.set(0, 6.1, 0.4);
    root.add(lamp);
  }

  group.traverse((object) => {
    object.updateMatrix();
    object.matrixAutoUpdate = false;
  });
  // Banner signs face the street from both sides, so leave them double-sided
  // and static like the rest of the city.
  group.traverse((object) => {
    if ((object as THREE.Mesh).isMesh) object.userData.noStaticMerge = true;
  });
  return group;
}
