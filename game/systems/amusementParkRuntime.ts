import * as THREE from 'three';
import {
  DRAGON_VALLEY_POS,
  HILL_HOUSE_POS,
  HOMESTEAD_POS,
  PLAYER_SPAWN,
  RESORT_CORNER_POS,
  RUINED_CASTLE_POS,
  VEHICLE_GARAGE_POS,
  VIKING_VILLAGE_POS,
  WHEATFIELD_POS,
  getTerrainSurfaceHeight,
} from '../world/terrain';
import { isInLouisianaBounds } from '../world/louisianaLandmass';
import {
  buildParkModel,
  parkLocalToWorld,
  updateParkModel,
  type ParkModelHandles,
} from '../coaster/parkModels';
import {
  sanitizePark,
  type AmusementParkDeliveryPayload,
  type ParkLayout,
} from '../coaster/park';

export interface AmusementParkSite {
  x: number;
  y: number;
  z: number;
  yaw: number;
}

export interface SavedAmusementPark {
  id: string;
  name: string;
  site: AmusementParkSite;
  park: ParkLayout;
  coasterId: string | null;
  deliveredAt: number;
}

interface ActivePark {
  data: SavedAmusementPark;
  handles: ParkModelHandles;
  helicopter: THREE.Group;
  rotor: THREE.Mesh;
  delivery: number;
  helicopterLeaving: number;
  elapsed: number;
}

interface Candidate {
  x: number;
  z: number;
  score: number;
}

const LANDMARK_AVOIDS: readonly { x: number; z: number; radius: number }[] = [
  { x: HILL_HOUSE_POS.x, z: HILL_HOUSE_POS.z, radius: 36 },
  { x: VEHICLE_GARAGE_POS.x, z: VEHICLE_GARAGE_POS.z, radius: 30 },
  { x: HOMESTEAD_POS.x, z: HOMESTEAD_POS.z, radius: 38 },
  { x: WHEATFIELD_POS.x, z: WHEATFIELD_POS.z, radius: 28 },
  { x: DRAGON_VALLEY_POS.x, z: DRAGON_VALLEY_POS.z, radius: 62 },
  { x: VIKING_VILLAGE_POS.x, z: VIKING_VILLAGE_POS.z, radius: 52 },
  { x: RESORT_CORNER_POS.x, z: RESORT_CORNER_POS.z, radius: 48 },
  { x: RUINED_CASTLE_POS.x, z: RUINED_CASTLE_POS.z, radius: 50 },
  { x: PLAYER_SPAWN.x, z: PLAYER_SPAWN.z, radius: 32 },
];

/**
 * Surveys the island for a broad, level construction site. The result is
 * deterministic for the same player position and existing parks, so reloading
 * a save does not shuffle a delivered park.
 */
export function findAmusementParkSite(
  prefer?: { x: number; z: number },
  avoid: readonly { x: number; z: number }[] = [],
): AmusementParkSite {
  const candidates: Candidate[] = [];
  const origin = prefer ?? { x: 0, z: 0 };
  const rings = prefer ? [58, 76, 96, 118, 142, 170, 210, 260, 320] : [180, 220, 265, 315, 370, 430];
  for (let ringIndex = 0; ringIndex < rings.length; ringIndex++) {
    const radius = rings[ringIndex];
    for (let step = 0; step < 24; step++) {
      const angle = (step / 24) * Math.PI * 2 + ringIndex * 0.37;
      const x = origin.x + Math.cos(angle) * radius;
      const z = origin.z + Math.sin(angle) * radius;
      const distance = Math.hypot(x, z);
      if (distance < 90 || distance > 610) continue;
      if (isInLouisianaBounds(x, z)) continue;
      let blocked = false;
      for (const landmark of LANDMARK_AVOIDS) {
        if (Math.hypot(x - landmark.x, z - landmark.z) < landmark.radius) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;
      for (const existing of avoid) {
        if (Math.hypot(x - existing.x, z - existing.z) < 82) {
          blocked = true;
          break;
        }
      }
      if (blocked) continue;

      let min = Infinity;
      let max = -Infinity;
      let water = false;
      for (let ix = -2; ix <= 2; ix++) {
        for (let iz = -2; iz <= 2; iz++) {
          const h = getTerrainSurfaceHeight(x + ix * 13, z + iz * 13);
          min = Math.min(min, h);
          max = Math.max(max, h);
          if (h < 2.2) water = true;
        }
      }
      if (water) continue;
      const spread = max - min;
      if (spread > 8.5) continue;
      const centerHeight = getTerrainSurfaceHeight(x, z);
      const slopeX = Math.abs(
        getTerrainSurfaceHeight(x + 5, z) - getTerrainSurfaceHeight(x - 5, z),
      );
      const slopeZ = Math.abs(
        getTerrainSurfaceHeight(x, z + 5) - getTerrainSurfaceHeight(x, z - 5),
      );
      const distancePenalty = prefer ? Math.abs(radius - 92) * 0.02 : 0;
      const score = spread * 3.4 + (slopeX + slopeZ) * 2.2 + distancePenalty + ringIndex * 0.04;
      candidates.push({ x, z, score: score + centerHeight * 0.001 });
    }
  }

  candidates.sort((a, b) => a.score - b.score);
  const best = candidates[0] ?? {
    x: origin.x + 70,
    z: origin.z + 70,
  };
  const y = getTerrainSurfaceHeight(best.x, best.z);
  const yaw = prefer
    ? Math.atan2(prefer.x - best.x, prefer.z - best.z)
    : Math.atan2(-best.x, -best.z);
  return { x: best.x, y, z: best.z, yaw };
}

function createHelicopter(): { group: THREE.Group; rotor: THREE.Mesh } {
  const group = new THREE.Group();
  const bodyMat = new THREE.MeshStandardMaterial({ color: 0xd8d4c8, roughness: 0.52, metalness: 0.32 });
  const darkMat = new THREE.MeshStandardMaterial({ color: 0x2c3236, roughness: 0.55, metalness: 0.35 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x7fb6cb,
    roughness: 0.15,
    metalness: 0.2,
    transparent: true,
    opacity: 0.62,
  });
  const body = new THREE.Mesh(new THREE.BoxGeometry(4.4, 3.0, 7.2), bodyMat);
  body.position.y = 2.4;
  body.castShadow = true;
  group.add(body);
  const cabin = new THREE.Mesh(new THREE.BoxGeometry(3.8, 1.8, 2.6), glassMat);
  cabin.position.set(0, 2.7, 3.0);
  group.add(cabin);
  const tail = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.7, 6.4), bodyMat);
  tail.position.set(0, 3.0, -6.2);
  group.add(tail);
  const fin = new THREE.Mesh(new THREE.BoxGeometry(0.3, 2.2, 1.4), bodyMat);
  fin.position.set(0, 3.8, -9.1);
  group.add(fin);
  const rotorHead = new THREE.Mesh(new THREE.CylinderGeometry(0.35, 0.35, 0.8, 8), darkMat);
  rotorHead.position.set(0, 4.3, 0);
  group.add(rotorHead);
  const rotor = new THREE.Mesh(new THREE.BoxGeometry(14, 0.12, 0.7), darkMat);
  rotor.position.set(0, 4.75, 0);
  rotor.castShadow = true;
  group.add(rotor);
  const tailRotor = new THREE.Mesh(new THREE.BoxGeometry(0.1, 2.2, 0.28), darkMat);
  tailRotor.position.set(0, 4.1, -9.4);
  group.add(tailRotor);
  for (const side of [-1, 1]) {
    const skid = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 5.4), darkMat);
    skid.position.set(side * 1.7, 0.55, 0.4);
    group.add(skid);
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.2, 1.2, 0.2), darkMat);
    strut.position.set(side * 1.7, 1.15, 1.0);
    group.add(strut);
  }
  const lamp = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 8, 6),
    new THREE.MeshStandardMaterial({
      color: 0xffd27a,
      emissive: 0xffa53b,
      emissiveIntensity: 1.8,
      roughness: 0.3,
    }),
  );
  lamp.position.set(0, 1.3, 4.0);
  group.add(lamp);
  return { group, rotor };
}

export class AmusementParkRuntime {
  private readonly scene: THREE.Scene;
  private readonly root = new THREE.Group();
  private readonly active = new Map<string, ActivePark>();
  private seq = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.root.name = 'amusement-park-runtime';
    this.scene.add(this.root);
  }

  get count(): number {
    return this.active.size;
  }

  getSites(): { x: number; z: number }[] {
    return [...this.active.values()].map((entry) => ({
      x: entry.data.site.x,
      z: entry.data.site.z,
    }));
  }

  getSummaries(): { id: string; name: string; site: AmusementParkSite; elements: number }[] {
    return [...this.active.values()].map((entry) => ({
      id: entry.data.id,
      name: entry.data.name,
      site: { ...entry.data.site },
      elements: entry.data.park.elements.length,
    }));
  }

  add(
    payload: AmusementParkDeliveryPayload,
    site: AmusementParkSite,
    coasterId: string | null,
    instant = false,
  ): SavedAmusementPark {
    this.seq += 1;
    const park = sanitizePark(payload.park, payload.name || 'Delivered Park');
    const data: SavedAmusementPark = {
      id: `park_${Date.now()}_${this.seq}`,
      name: park.name,
      site: { ...site },
      park,
      coasterId,
      deliveredAt: Date.now(),
    };
    const handles = buildParkModel(park, {
      groundAt: (x, z) => getTerrainSurfaceHeight(x, z),
      origin: { x: site.x, z: site.z },
      originY: site.y,
      yaw: site.yaw,
      includeVisitors: true,
    });
    handles.group.position.set(site.x, site.y, site.z);
    this.root.add(handles.group);

    const { group: helicopter, rotor } = createHelicopter();
    const bounds = handles.bounds;
    const center = parkLocalToWorld(
      (bounds.minX + bounds.maxX) * 0.5,
      (bounds.minZ + bounds.maxZ) * 0.5,
      site.yaw,
      site.x,
      site.z,
    );
    helicopter.position.set(center.x, site.y + 46, center.z);
    helicopter.rotation.y = site.yaw;
    this.root.add(helicopter);

    const entry: ActivePark = {
      data,
      handles,
      helicopter,
      rotor,
      delivery: instant ? 1 : 0,
      helicopterLeaving: 0,
      elapsed: 0,
    };
    if (instant) {
      handles.group.position.y = site.y;
      helicopter.visible = false;
    } else {
      handles.group.position.y = site.y + 42;
    }
    this.active.set(data.id, entry);
    return data;
  }

  /** Restores parks from a save without replaying the helicopter delivery. */
  restore(list?: SavedAmusementPark[]): void {
    this.clear();
    if (!Array.isArray(list)) return;
    for (const saved of list) {
      if (!saved || !saved.park) continue;
      this.add(
        { name: saved.name, park: saved.park, sentAt: saved.deliveredAt },
        saved.site,
        saved.coasterId ?? null,
        true,
      );
    }
  }

  serialize(): SavedAmusementPark[] {
    return [...this.active.values()].map((entry) => ({
      ...entry.data,
      site: { ...entry.data.site },
      park: {
        ...entry.data.park,
        elements: entry.data.park.elements.map((element) => ({ ...element })),
      },
    }));
  }

  remove(id: string): boolean {
    const entry = this.active.get(id);
    if (!entry) return false;
    this.active.delete(id);
    this.root.remove(entry.handles.group);
    this.root.remove(entry.helicopter);
    entry.handles.dispose();
    return true;
  }

  clear(): void {
    for (const id of [...this.active.keys()]) this.remove(id);
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.root);
  }

  update(dt: number): void {
    for (const entry of this.active.values()) {
      entry.elapsed += dt;
      updateParkModel(entry.handles, dt, entry.elapsed);
      entry.rotor.rotation.y += dt * 28;
      if (entry.delivery < 1) {
        entry.delivery = Math.min(1, entry.delivery + dt / 8.5);
        const eased = 1 - Math.pow(1 - entry.delivery, 3);
        entry.handles.group.position.y =
          entry.data.site.y + (1 - eased) * 42;
        entry.helicopter.position.y = entry.data.site.y + 46 + (1 - eased) * 42;
        if (entry.delivery >= 1) {
          entry.handles.group.position.y = entry.data.site.y;
          entry.helicopterLeaving = 0.001;
        }
      } else if (entry.helicopterLeaving > 0) {
        entry.helicopterLeaving = Math.min(1, entry.helicopterLeaving + dt / 5);
        const eased = entry.helicopterLeaving * entry.helicopterLeaving;
        entry.helicopter.position.y += dt * (12 + eased * 16);
        entry.helicopter.position.x += dt * 7 * eased;
        entry.helicopter.rotation.y += dt * 0.16;
        entry.helicopter.visible = entry.helicopterLeaving < 0.98;
      }
    }
  }
}
