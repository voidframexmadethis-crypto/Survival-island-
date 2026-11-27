import * as THREE from 'three';
import {
  BAYOU_COMET_NAME,
  buildBayouCometNodes,
  getBayouCometSite,
  getBayouCometTunnels,
  type BayouTunnel,
} from './bayouCometLayout';
import { getTerrainHeight } from './terrain';

export interface BayouCometEnvironment {
  root: THREE.Group;
  update: (dt: number, elapsed: number, speedKmh: number) => void;
  setDetailVisible: (visible: boolean) => void;
  dispose: () => void;
}

const TEAL = '#0f766e';
const ORANGE = '#ea580c';

function seeded(index: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function signTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.fillStyle = '#0b2b26';
    ctx.fillRect(0, 0, 512, 128);
    ctx.strokeStyle = '#f59e0b';
    ctx.lineWidth = 8;
    ctx.strokeRect(8, 8, 496, 112);
    ctx.fillStyle = '#fde68a';
    ctx.font = 'bold 62px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(BAYOU_COMET_NAME, 256, 66);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/**
 * A five-car bayou launch train. The wheel bottoms and floor top intentionally
 * match VOLCANO FLEX (0.19 m wheel radius, 0.42 m floor top) so the shared
 * boarding deck and 0.275 m runtime wheel offset line up exactly.
 */
export function buildBayouCometTrainCar(index: number, isLead: boolean): THREE.Group {
  const car = new THREE.Group();
  car.name = `BayouCometCar_${index}`;
  const body = new THREE.MeshStandardMaterial({
    color: new THREE.Color(index === 0 ? ORANGE : TEAL),
    roughness: 0.32,
    metalness: 0.48,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: new THREE.Color('#f8fafc'),
    roughness: 0.42,
    metalness: 0.28,
  });
  const dark = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.7 });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.22, 1.9), body);
  floor.position.y = 0.31;
  floor.castShadow = true;
  car.add(floor);

  const nose = new THREE.Mesh(new THREE.BoxGeometry(1.02, 0.3, 0.55), body);
  nose.position.set(0, 0.34, isLead ? 1.08 : 0.94);
  nose.rotation.x = isLead ? -0.18 : 0;
  car.add(nose);

  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.34, 1.72), dark);
    skirt.position.set(side * 0.54, 0.24, 0);
    car.add(skirt);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.1, 1.5), trim);
    stripe.position.set(side * 0.575, 0.4, 0);
    car.add(stripe);
  }

  for (const seatX of [-0.24, 0.24]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.16, 0.44), dark);
    seat.position.set(seatX, 0.5, -0.35);
    car.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.56, 0.13), body);
    back.position.set(seatX, 0.78, -0.56);
    car.add(back);
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.16), trim);
    headrest.position.set(seatX, 1.02, -0.58);
    car.add(headrest);
    const lapBar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.07, 0.08), trim);
    lapBar.position.set(seatX, 0.66, 0.06);
    car.add(lapBar);
  }

  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.12, 14);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    for (const z of [-0.66, 0.66]) {
      const wheel = new THREE.Mesh(wheelGeo, dark);
      wheel.position.set(side * 0.46, 0, z);
      car.add(wheel);
      wheels.push(wheel);
    }
  }
  car.userData.wheels = wheels;

  if (isLead) {
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.1, 10, 8),
        new THREE.MeshStandardMaterial({
          color: 0xfef3c7,
          emissive: 0xf59e0b,
          emissiveIntensity: 1.4,
          roughness: 0.3,
        }),
      );
      lamp.position.set(side * 0.34, 0.45, 1.34);
      car.add(lamp);
    }
  }

  return car;
}

function buildTunnel(tunnel: BayouTunnel, index: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `bayou-comet-tunnel-${index}`;
  if (tunnel.points.length < 2) return group;
  const curve = new THREE.CatmullRomCurve3(
    tunnel.points.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
    false,
    'centripetal',
  );
  const bore = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 90, tunnel.radius, 14, false),
    new THREE.MeshStandardMaterial({
      color: 0x2f241c,
      roughness: 0.95,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  bore.name = 'bayou-tunnel-bore';
  group.add(bore);

  // Earth berm over the bore so the tunnel reads as passing through a low
  // Louisiana ridge instead of a pipe laid on the marsh.
  const mound = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 90, tunnel.radius + 2.3, 12, false),
    new THREE.MeshStandardMaterial({
      color: 0x3f4a2a,
      roughness: 0.98,
      metalness: 0.01,
    }),
  );
  mound.name = 'bayou-tunnel-mound';
  mound.castShadow = true;
  group.add(mound);

  const portalMat = new THREE.MeshStandardMaterial({
    color: 0x5b4a3a,
    roughness: 0.85,
    metalness: 0.05,
  });
  for (const t of [0, 1]) {
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(tunnel.radius + 0.35, 0.5, 10, 20),
      portalMat,
    );
    ring.position.copy(p);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    group.add(ring);
  }

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.6,
  });
  for (let i = 1; i < 5; i++) {
    const t = i / 5;
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(tunnel.radius - 0.35, 0.09, 6, 18), glowMat);
    ring.position.copy(p);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    group.add(ring);
  }

  const light = new THREE.PointLight(0xffb75e, 0.7, tunnel.radius * 3, 2);
  light.position.copy(curve.getPoint(0.5));
  group.add(light);
  return group;
}

export function buildBayouCometEnvironment(): BayouCometEnvironment {
  const root = new THREE.Group();
  root.name = 'BayouCometAttraction';
  const site = getBayouCometSite();
  const ground = site.ground;
  const detail = new THREE.Group();
  detail.name = 'bayou-detail';
  root.add(detail);

  // Entrance arch and sign alongside the loading platform.
  const wood = new THREE.MeshStandardMaterial({ color: 0x4b3621, roughness: 0.9 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6, metalness: 0.25 });
  const archX = site.station.x - 14.5;
  const archZ = site.station.z - 0.2;
  for (const dz of [-3.4, 3.4]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.38, 6.4, 8), wood);
    post.position.set(archX, ground + 3.2, archZ + dz);
    post.castShadow = true;
    detail.add(post);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 8.4), trim);
  beam.position.set(archX, ground + 6.6, archZ);
  beam.castShadow = true;
  detail.add(beam);
  const signMap = signTexture();
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(7.6, 1.9),
    new THREE.MeshBasicMaterial(
      signMap
        ? { map: signMap, side: THREE.DoubleSide }
        : { color: 0x0b2b26, side: THREE.DoubleSide },
    ),
  );
  board.position.set(archX + 0.4, ground + 6.4, archZ);
  board.rotation.y = Math.PI / 2;
  detail.add(board);

  // Lanterns on the platform posts.
  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef3c7,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.8,
    roughness: 0.35,
  });
  for (const dz of [-2.4, 2.4]) {
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.22, 0.5, 8), lanternMat);
    lantern.position.set(archX + 1.2, ground + 4.6, archZ + dz);
    detail.add(lantern);
  }
  const lamp = new THREE.PointLight(0xffc06a, 1.1, 18, 2);
  lamp.position.set(archX + 1.4, ground + 4.3, archZ);
  root.add(lamp);

  // Tunnels.
  getBayouCometTunnels().forEach((tunnel, i) => {
    root.add(buildTunnel(tunnel, i));
  });

  // Cypress/marsh skirt around the site, deterministic so saves look stable.
  const trackNodes = buildBayouCometNodes();
  const clearOfTrack = (x: number, z: number, clearance = 7): boolean =>
    trackNodes.every((n) => Math.hypot(n.position.x - x, n.position.z - z) > clearance);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f2d1d, roughness: 0.95 });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x3f6212, roughness: 0.9 });
  for (let i = 0; i < 26; i++) {
    const angle = seeded(i) * Math.PI * 2;
    const radius = 38 + seeded(i + 41) * 54;
    const x = site.station.x + Math.cos(angle) * radius;
    const z = site.station.z + Math.sin(angle) * radius;
    // Keep the boarding plaza, launch and track clear.
    if (Math.abs(z - site.station.z) < 9 && x > site.station.x - 26) continue;
    if (!clearOfTrack(x, z, 8)) continue;
    const h = 5 + seeded(i + 9) * 6;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.3, h, 7), trunkMat);
    trunk.position.set(x, getTerrainHeight(x, z) + h * 0.5, z);
    detail.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.6 + seeded(i + 17) * 1.4, h * 0.55, 7), mossMat);
    crown.position.set(x, trunk.position.y + h * 0.62, z);
    detail.add(crown);
  }

  // Reeds in the wet margin.
  const reedMat = new THREE.MeshStandardMaterial({ color: 0x6b7f2a, roughness: 0.9 });
  const reedGeo = new THREE.ConeGeometry(0.12, 1.4, 4);
  for (let i = 0; i < 60; i++) {
    const angle = seeded(i + 300) * Math.PI * 2;
    const radius = 30 + seeded(i + 355) * 80;
    const x = site.station.x + Math.cos(angle) * radius;
    const z = site.station.z + Math.sin(angle) * radius;
    if (!clearOfTrack(x, z, 4)) continue;
    const reed = new THREE.Mesh(reedGeo, reedMat);
    reed.position.set(x, getTerrainHeight(x, z) + 0.7, z);
    reed.rotation.z = (seeded(i + 8) - 0.5) * 0.35;
    detail.add(reed);
  }

  return {
    root,
    update(_dt, elapsed) {
      lanternMat.emissiveIntensity = 1.55 + Math.sin(elapsed * 2.7) * 0.18;
      lamp.intensity = 0.95 + Math.sin(elapsed * 2.1 + 1.4) * 0.12;
    },
    setDetailVisible(visible) {
      detail.visible = visible;
      lamp.visible = visible;
    },
    dispose() {
      root.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
          const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
          for (const m of mats) {
            if (m instanceof THREE.MeshBasicMaterial && m.map) m.map.dispose();
            m.dispose();
          }
        }
      });
    },
  };
}

