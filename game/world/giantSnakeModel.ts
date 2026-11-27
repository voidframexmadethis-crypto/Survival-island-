import * as THREE from 'three';
import {
  GIANT_SNAKE_NAME,
  buildGiantSnakeNodes,
  getGiantSnakeSite,
  getGiantSnakeSwingLaunch,
  getGiantSnakeTunnels,
  type GiantSnakeTunnel,
} from './giantSnakeLayout';
import { getTerrainHeight } from './terrain';

export interface GiantSnakeEnvironment {
  root: THREE.Group;
  update: (dt: number, elapsed: number, speedKmh: number) => void;
  setDetailVisible: (visible: boolean) => void;
  setSwitchOffset: (offset: number) => void;
  dispose: () => void;
}

const GOLD = '#c8a44a';
const GOLD_LIGHT = '#e8cf85';
const SILVER = '#d8dde2';
const GUNMETAL = '#272c33';
const TEAL_ACCENT = '#1f6f6b';

function seeded(index: number): number {
  const x = Math.sin(index * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

function signTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    const bg = ctx.createLinearGradient(0, 0, 0, 256);
    bg.addColorStop(0, '#11161b');
    bg.addColorStop(1, '#1f2a2b');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = GOLD;
    ctx.lineWidth = 10;
    ctx.strokeRect(14, 14, 996, 228);
    ctx.fillStyle = GOLD_LIGHT;
    ctx.font = 'bold 86px Georgia, serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(GIANT_SNAKE_NAME, 512, 112);
    ctx.fillStyle = SILVER;
    ctx.font = '26px Arial, sans-serif';
    ctx.fillText('SWING LAUNCH  ·  46 M  ·  119 KM/H', 512, 196);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

/**
 * Modern five-car Intamin-style launch train. Wheel radius and floor height
 * deliberately match the shared island station deck so boarding, seating and
 * the 0.275 m runtime wheel offset remain correct.
 */
export function buildGiantSnakeTrainCar(index: number, isLead: boolean): THREE.Group {
  const car = new THREE.Group();
  car.name = `GiantSnakeCar_${index}`;

  const body = new THREE.MeshStandardMaterial({
    color: new THREE.Color(isLead ? GOLD : GOLD_LIGHT),
    roughness: 0.26,
    metalness: 0.62,
  });
  const trim = new THREE.MeshStandardMaterial({
    color: new THREE.Color(SILVER),
    roughness: 0.3,
    metalness: 0.7,
  });
  const chassis = new THREE.MeshStandardMaterial({
    color: new THREE.Color(GUNMETAL),
    roughness: 0.42,
    metalness: 0.85,
  });
  const accent = new THREE.MeshStandardMaterial({
    color: new THREE.Color(TEAL_ACCENT),
    roughness: 0.38,
    metalness: 0.35,
  });

  const floor = new THREE.Mesh(new THREE.BoxGeometry(1.12, 0.2, 1.96), body);
  floor.position.y = 0.32;
  floor.castShadow = true;
  car.add(floor);

  const chassisPan = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.16, 2.0), chassis);
  chassisPan.position.y = 0.16;
  car.add(chassisPan);

  // Sculpted zero-car nose and tapered tail.
  const nose = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.3, isLead ? 0.7 : 0.5), body);
  nose.position.set(0, 0.33, isLead ? 1.16 : 1.0);
  nose.rotation.x = isLead ? -0.22 : 0;
  nose.castShadow = true;
  car.add(nose);

  if (isLead) {
    const cowl = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.18, 0.52), trim);
    cowl.position.set(0, 0.49, 1.04);
    cowl.rotation.x = -0.18;
    car.add(cowl);
    const fin = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.28, 0.8), accent);
    fin.position.set(0, 0.6, 0.5);
    fin.rotation.x = -0.25;
    car.add(fin);
  }

  for (const side of [-1, 1]) {
    const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.32, 1.82), chassis);
    skirt.position.set(side * 0.57, 0.24, 0);
    car.add(skirt);
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.025, 0.09, 1.58), trim);
    stripe.position.set(side * 0.615, 0.4, 0);
    car.add(stripe);
    const accentStrip = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.035, 1.2), accent);
    accentStrip.position.set(side * 0.62, 0.47, 0);
    car.add(accentStrip);
  }

  for (const seatX of [-0.255, 0.255]) {
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.16, 0.46), chassis);
    seat.position.set(seatX, 0.5, -0.3);
    car.add(seat);
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.38, 0.6, 0.12), body);
    back.position.set(seatX, 0.8, -0.55);
    car.add(back);
    const headrest = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.18, 0.14), trim);
    headrest.position.set(seatX, 1.05, -0.57);
    car.add(headrest);
    const lapBar = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.07, 0.09), trim);
    lapBar.position.set(seatX, 0.68, 0.08);
    car.add(lapBar);
    const grab = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, 0.26), accent);
    grab.position.set(seatX + 0.22, 0.86, 0.2);
    car.add(grab);
  }

  const wheels: THREE.Mesh[] = [];
  const wheelGeo = new THREE.CylinderGeometry(0.19, 0.19, 0.12, 16);
  wheelGeo.rotateZ(Math.PI / 2);
  for (const side of [-1, 1]) {
    for (const z of [-0.68, 0.68]) {
      const wheel = new THREE.Mesh(wheelGeo, chassis);
      wheel.position.set(side * 0.46, 0, z);
      car.add(wheel);
      wheels.push(wheel);
    }
  }
  car.userData.wheels = wheels;

  if (isLead) {
    for (const side of [-1, 1]) {
      const lamp = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 10, 8),
        new THREE.MeshStandardMaterial({
          color: 0xfef9c3,
          emissive: 0xfacc15,
          emissiveIntensity: 2.2,
          roughness: 0.25,
        }),
      );
      lamp.position.set(side * 0.33, 0.46, isLead ? 1.44 : 1.3);
      car.add(lamp);
    }
  }

  return car;
}

function buildTunnel(tunnel: GiantSnakeTunnel, index: number): THREE.Group {
  const group = new THREE.Group();
  group.name = `giant-snake-tunnel-${index}`;
  if (tunnel.points.length < 2) return group;
  const curve = new THREE.CatmullRomCurve3(
    tunnel.points.map((p) => new THREE.Vector3(p.x, p.y, p.z)),
    false,
    'centripetal',
  );
  const bore = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 100, tunnel.radius, 16, false),
    new THREE.MeshStandardMaterial({
      color: 0x2a211b,
      roughness: 0.96,
      metalness: 0.02,
      side: THREE.DoubleSide,
    }),
  );
  bore.name = 'giant-snake-tunnel-bore';
  group.add(bore);

  const mound = new THREE.Mesh(
    new THREE.TubeGeometry(curve, 100, tunnel.radius + 2.5, 12, false),
    new THREE.MeshStandardMaterial({
      color: 0x3d4a2b,
      roughness: 0.98,
      metalness: 0.01,
    }),
  );
  mound.name = 'giant-snake-tunnel-mound';
  mound.castShadow = true;
  group.add(mound);

  const portalMat = new THREE.MeshStandardMaterial({
    color: 0x5c5146,
    roughness: 0.82,
    metalness: 0.08,
  });
  for (const t of [0, 1]) {
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(tunnel.radius + 0.35, 0.46, 10, 22),
      portalMat,
    );
    ring.position.copy(p);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    group.add(ring);
  }

  const glowMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 2.0,
  });
  for (let i = 1; i < 6; i++) {
    const t = i / 6;
    const p = curve.getPoint(t);
    const tangent = curve.getTangent(t).normalize();
    const ring = new THREE.Mesh(new THREE.TorusGeometry(tunnel.radius - 0.35, 0.08, 6, 18), glowMat);
    ring.position.copy(p);
    ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
    group.add(ring);
  }

  const light = new THREE.PointLight(0xffb75e, 0.85, tunnel.radius * 3, 2);
  light.position.copy(curve.getPoint(0.5));
  group.add(light);
  return group;
}

/** Switch house and sliding transfer table beside the loading siding. */
function buildSwitchHouse(
  group: THREE.Group,
  switchPoint: { x: number; y: number; z: number },
  ground: number,
): THREE.Object3D {
  const housing = new THREE.MeshStandardMaterial({ color: 0x3c444b, roughness: 0.7, metalness: 0.35 });
  const rail = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.3, metalness: 0.75 });
  const base = new THREE.Mesh(new THREE.BoxGeometry(7.2, 0.5, 3.4), housing);
  base.position.set(switchPoint.x + 1.8, ground + 0.25, switchPoint.z + 3.2);
  base.castShadow = true;
  group.add(base);

  const table = new THREE.Group();
  table.name = 'giant-snake-switch-table';
  const deck = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.24, 5.6), housing);
  deck.position.set(switchPoint.x + 1.5, ground + 0.62, switchPoint.z);
  table.add(deck);
  for (const side of [-1, 1]) {
    const edgeRail = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.12, 5.6), rail);
    edgeRail.position.set(switchPoint.x + 1.5 + side * 1.3, ground + 0.82, switchPoint.z);
    table.add(edgeRail);
  }
  table.userData.baseX = table.position.x;
  group.add(table);

  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xfca5a5,
    emissive: 0xef4444,
    emissiveIntensity: 1.8,
  });
  for (const dz of [-2.6, 2.6]) {
    const beacon = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 0.36, 8), beaconMat);
    beacon.position.set(switchPoint.x + 1.5, ground + 1.0, switchPoint.z + dz);
    group.add(beacon);
  }
  return table;
}

export function buildGiantSnakeEnvironment(): GiantSnakeEnvironment {
  const root = new THREE.Group();
  root.name = 'GiantSnakeAttraction';
  const site = getGiantSnakeSite();
  const ground = site.ground;
  const detail = new THREE.Group();
  detail.name = 'giant-snake-detail';
  root.add(detail);

  // Entrance portal and illuminated marquee.
  const steel = new THREE.MeshStandardMaterial({ color: 0x30363c, roughness: 0.5, metalness: 0.7 });
  const gold = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.28, metalness: 0.72 });
  const archX = site.station.x - 14.5;
  const archZ = site.station.z - 0.2;
  for (const dz of [-3.6, 3.6]) {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 7.2, 10), steel);
    post.position.set(archX, ground + 3.6, archZ + dz);
    post.castShadow = true;
    detail.add(post);
    const collar = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 0.32, 10), gold);
    collar.position.set(archX, ground + 6.4, archZ + dz);
    detail.add(collar);
  }
  const beam = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.3, 9.2), steel);
  beam.position.set(archX, ground + 7.1, archZ);
  beam.castShadow = true;
  detail.add(beam);
  const signMap = signTexture();
  const board = new THREE.Mesh(
    new THREE.PlaneGeometry(8.6, 2.15),
    new THREE.MeshBasicMaterial(
      signMap
        ? { map: signMap, side: THREE.DoubleSide }
        : { color: 0x11161b, side: THREE.DoubleSide },
    ),
  );
  board.position.set(archX + 0.45, ground + 6.9, archZ);
  board.rotation.y = Math.PI / 2;
  detail.add(board);

  const lanternMat = new THREE.MeshStandardMaterial({
    color: 0xfef9c3,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.8,
    roughness: 0.35,
  });
  for (const dz of [-2.6, 2.6]) {
    const lantern = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.21, 0.5, 8), lanternMat);
    lantern.position.set(archX + 1.3, ground + 4.8, archZ + dz);
    detail.add(lantern);
  }
  const lamp = new THREE.PointLight(0xffc06a, 1.2, 20, 2);
  lamp.position.set(archX + 1.5, ground + 4.5, archZ);
  root.add(lamp);

  // Tunnels.
  getGiantSnakeTunnels().forEach((tunnel, i) => {
    root.add(buildTunnel(tunnel, i));
  });

  // Switch house/transfer table at the launch siding.
  const swing = getGiantSnakeSwingLaunch();
  const switchTable = buildSwitchHouse(detail, swing.switchStop, ground);

  // Low cypress/marsh planting, deterministic so saves look stable.
  const trackNodes = buildGiantSnakeNodes();
  const clearOfTrack = (x: number, z: number, clearance = 8): boolean =>
    trackNodes.every((n) => Math.hypot(n.position.x - x, n.position.z - z) > clearance);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3f2d1d, roughness: 0.95 });
  const mossMat = new THREE.MeshStandardMaterial({ color: 0x456b24, roughness: 0.9 });
  for (let i = 0; i < 30; i++) {
    const angle = seeded(i) * Math.PI * 2;
    const radius = 42 + seeded(i + 41) * 58;
    const x = site.station.x + Math.cos(angle) * radius;
    const z = site.station.z + Math.sin(angle) * radius;
    if (Math.abs(z - site.station.z) < 10 && x > site.station.x - 30) continue;
    if (!clearOfTrack(x, z, 9)) continue;
    const h = 6 + seeded(i + 9) * 7;
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.32, h, 7), trunkMat);
    trunk.position.set(x, getTerrainHeight(x, z) + h * 0.5, z);
    detail.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.7 + seeded(i + 17) * 1.6, h * 0.55, 7), mossMat);
    crown.position.set(x, trunk.position.y + h * 0.62, z);
    detail.add(crown);
  }

  const reedMat = new THREE.MeshStandardMaterial({ color: 0x6b7f2a, roughness: 0.9 });
  const reedGeo = new THREE.ConeGeometry(0.12, 1.5, 4);
  for (let i = 0; i < 70; i++) {
    const angle = seeded(i + 300) * Math.PI * 2;
    const radius = 30 + seeded(i + 355) * 86;
    const x = site.station.x + Math.cos(angle) * radius;
    const z = site.station.z + Math.sin(angle) * radius;
    if (!clearOfTrack(x, z, 4)) continue;
    const reed = new THREE.Mesh(reedGeo, reedMat);
    reed.position.set(x, getTerrainHeight(x, z) + 0.75, z);
    reed.rotation.z = (seeded(i + 8) - 0.5) * 0.35;
    detail.add(reed);
  }

  let switchOffset = 0;
  return {
    root,
    update(_dt, elapsed, speedKmh) {
      lanternMat.emissiveIntensity = 1.55 + Math.sin(elapsed * 2.7) * 0.18;
      lamp.intensity = 0.95 + Math.sin(elapsed * 2.1 + 1.4) * 0.12;
      // Subtle rail shine and transfer-table settle while the train is near.
      const target = Math.min(1, speedKmh / 120);
      gold.emissiveIntensity = 0.08 + target * 0.12;
      switchTable.position.x = switchTable.userData.baseX + switchOffset;
    },
    setDetailVisible(visible) {
      detail.visible = visible;
      lamp.visible = visible;
    },
    setSwitchOffset(offset) {
      switchOffset = THREE.MathUtils.clamp(offset, -1.75, 1.75);
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
