import * as THREE from 'three';
import type { CaveType } from './caveSystem';

export type FinalIslandDestination = 'bee-dimension' | 'overworld';
export type FinalIslandTeleport = (destination: FinalIslandDestination) => void;

export type FinalIslandCave = {
  id: string;
  type: CaveType;
  position: THREE.Vector3;
  radius: number;
  discovered: boolean;
};

export type BeeCompanion = {
  id: string;
  name: string;
  color: string;
  friendly: boolean;
  rideable: boolean;
};

export type FinalIslandSaveState = {
  honey: number;
  honeycomb: number;
  honeyJewels: number;
  queenReputation: number;
  dragonUnlocked: boolean;
  bees: BeeCompanion[];
  discoveredCaveIds: string[];
  claimedQueenRewards: string[];
};

export type FinalIslandHudState = {
  honey: number;
  honeycomb: number;
  honeyJewels: number;
  queenReputation: number;
  dragonUnlocked: boolean;
  bees: number;
  friendlyBees: number;
  rideableBees: number;
  discoveredCaves: number;
  totalCaves: number;
};

export type BeeGateHandle = {
  portal: THREE.Group;
  enter: () => void;
  exit: () => void;
};

const SPECIAL_CAVE_TYPES: readonly CaveType[] = [
  'civilization',
  'monster-boss',
  'lush',
  'crystal',
  'red-dragon',
];

const BEE_GATE_HEIGHT = 5.6;
const BEE_NAMES = ['Amber', 'Dandelion', 'Clover', 'Marigold', 'Pollen', 'Saffron'];

function createBeeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `bee-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Final island content layer: honey economy, bee companions, queen reputation,
 * cave discovery jewels, red-dragon unlock, and the Bee Dimension hive gates.
 *
 * Cave streaming is intentionally owned by IslandCaveSystem so the island never
 * renders two overlapping tunnel networks. This system mirrors the canonical
 * cave list (see syncCaves) and turns discoveries into honey-jewel rewards.
 */
export class FinalIslandFeatures {
  caves: FinalIslandCave[] = [];
  honey = 0;
  honeycomb = 0;
  honeyJewels = 0;
  queenReputation = 0;
  dragonUnlocked = false;
  bees: BeeCompanion[] = [];
  claimedQueenRewards: string[] = [];

  readonly scene: THREE.Scene;

  private readonly caveById = new Map<string, FinalIslandCave>();
  private readonly gates = new Set<THREE.Group>();
  private readonly gateLights = new Set<THREE.PointLight>();
  private gatePhase = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  generateCaves(center: THREE.Vector3, radius: number): FinalIslandCave[] {
    this.caves = Array.from({ length: 5000 }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * radius;
      return {
        id: `cave-${i}`,
        type: SPECIAL_CAVE_TYPES[i] ?? 'regular',
        position: new THREE.Vector3(
          center.x + Math.cos(angle) * distance,
          center.y,
          center.z + Math.sin(angle) * distance,
        ),
        radius: i < SPECIAL_CAVE_TYPES.length ? 12 : 5,
        discovered: false,
      };
    });
    this.rebuildCaveIndex();
    return this.caves;
  }

  /** Mirror the game's canonical cave list so ids, types and discovery match gameplay. */
  syncCaves(
    source: readonly {
      id: string;
      type: CaveType;
      x: number;
      z: number;
      discovered: boolean;
    }[],
    heightAt: (x: number, z: number) => number,
  ): FinalIslandCave[] {
    this.caves = source.map((cave) => ({
      id: cave.id,
      type: cave.type,
      position: new THREE.Vector3(cave.x, heightAt(cave.x, cave.z), cave.z),
      radius: cave.type === 'regular' ? 5 : 12,
      discovered: cave.discovered,
    }));
    this.rebuildCaveIndex();
    return this.caves;
  }

  /** Returns true when this cave was discovered for the first time. */
  markDiscovered(id: string): boolean {
    const cave = this.caveById.get(id);
    if (!cave || cave.discovered) return false;
    cave.discovered = true;
    if (cave.type === 'crystal') this.collectJewel(1);
    return true;
  }

  getCave(id: string): FinalIslandCave | undefined {
    return this.caveById.get(id);
  }

  markRedDragonDefeated(): void {
    this.dragonUnlocked = true;
  }

  /** Kept for the original API name; unlocks dragon riding. */
  defeatRedDragon(): string {
    this.markRedDragonDefeated();
    return 'Dragon riding unlocked';
  }

  /**
   * Builds a glowing honey gate on an anchor object. The ring sits low enough to
   * walk through (the original 15m height was unreachable without flight).
   */
  createBeeDimension(anchor: THREE.Object3D, teleport: FinalIslandTeleport): BeeGateHandle {
    const portal = new THREE.Group();
    portal.name = 'honey-bee-gate';

    const ringMat = new THREE.MeshStandardMaterial({
      color: 0xffbd32,
      emissive: 0xff9500,
      emissiveIntensity: 2,
      roughness: 0.35,
      metalness: 0.2,
    });
    const ring = new THREE.Mesh(new THREE.TorusGeometry(5, 0.7, 16, 64), ringMat);
    ring.userData.noShadowCast = true;

    const core = new THREE.Mesh(
      new THREE.CircleGeometry(4.3, 64),
      new THREE.MeshBasicMaterial({
        color: 0x9c5510,
        transparent: true,
        opacity: 0.55,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );

    // Honey-drip bead ring so the gate reads as a hive portal from a distance.
    const beadMat = new THREE.MeshStandardMaterial({
      color: 0xfde68a,
      emissive: 0xf59e0b,
      emissiveIntensity: 1.4,
      roughness: 0.25,
    });
    const beads = new THREE.InstancedMesh(
      new THREE.SphereGeometry(0.38, 10, 8),
      beadMat,
      12,
    );
    const dummy = new THREE.Object3D();
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      dummy.position.set(Math.cos(a) * 5, Math.sin(a) * 5, 0.35);
      dummy.updateMatrix();
      beads.setMatrixAt(i, dummy.matrix);
    }
    beads.instanceMatrix.needsUpdate = true;
    beads.computeBoundingSphere();
    beads.userData.noShadowCast = true;

    const light = new THREE.PointLight(0xffb020, 3.2, 26, 1.6);
    light.position.set(0, 0, 1.2);

    portal.add(ring, core, beads, light);
    portal.position.set(0, BEE_GATE_HEIGHT, 0);
    anchor.add(portal);
    this.gates.add(portal);
    this.gateLights.add(light);

    const enter = () => teleport('bee-dimension');
    const exit = () => teleport('overworld');
    return { portal, enter, exit };
  }

  destroyGate(portal: THREE.Group | null | undefined): void {
    if (!portal) return;
    this.gates.delete(portal);
    portal.removeFromParent();
    portal.traverse((child) => {
      if (child instanceof THREE.PointLight) this.gateLights.delete(child);
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const materials = Array.isArray(child.material) ? child.material : [child.material];
        materials.forEach((m) => m.dispose());
      }
    });
  }

  update(dt: number): void {
    if (this.gates.size === 0) return;
    this.gatePhase = (this.gatePhase + dt * 0.9) % (Math.PI * 2);
    const pulse = 1.6 + Math.sin(this.gatePhase * 1.7) * 0.7;
    for (const gate of this.gates) {
      gate.rotation.y += dt * 0.25;
    }
    for (const light of this.gateLights) {
      light.intensity = pulse * 2.2;
    }
  }

  collectHoney(amount = 1): void {
    this.honey += Math.max(0, Math.floor(amount));
  }

  collectComb(amount = 1): void {
    this.honeycomb += Math.max(0, Math.floor(amount));
  }

  collectJewel(amount = 1): void {
    this.honeyJewels += Math.max(0, Math.floor(amount));
  }

  /** Offer honey to the Hive Queen; each 5 honey raises reputation by 1. */
  donateHoney(amount = 5): boolean {
    const cost = Math.max(1, Math.floor(amount));
    if (this.honey < cost) return false;
    this.honey -= cost;
    this.queenReputation += 1;
    return true;
  }

  addBee(name: string, color = 'gold'): BeeCompanion {
    const bee: BeeCompanion = {
      id: createBeeId(),
      name,
      color,
      friendly: false,
      rideable: false,
    };
    this.bees.push(bee);
    return bee;
  }

  seedWildBees(): void {
    if (this.bees.length > 0) return;
    BEE_NAMES.forEach((name, i) => this.addBee(name, i % 2 === 0 ? 'gold' : 'amber'));
  }

  befriendBee(id: string): boolean {
    const bee = this.bees.find((b) => b.id === id);
    if (!bee || bee.friendly) return false;
    bee.friendly = true;
    return true;
  }

  befriendNextWildBee(): BeeCompanion | null {
    const bee = this.bees.find((b) => !b.friendly);
    if (!bee) return null;
    bee.friendly = true;
    return bee;
  }

  unlockBeeRiding(id: string): boolean {
    const bee = this.bees.find((b) => b.id === id);
    if (!bee?.friendly || bee.rideable) return false;
    bee.rideable = true;
    return true;
  }

  attemptBeeRidingUnlock(): BeeCompanion[] {
    const friendly = this.bees.filter((b) => b.friendly);
    if (friendly.length < 3) return [];
    return this.unlockAllBeeRiding();
  }

  unlockAllBeeRiding(): BeeCompanion[] {
    const newlyRideable = this.bees.filter((b) => b.friendly && !b.rideable);
    newlyRideable.forEach((b) => {
      b.rideable = true;
    });
    return newlyRideable;
  }

  queenReward(required: number, reward: string, inventory: string[]): boolean {
    if (this.queenReputation < required || inventory.includes(reward)) return false;
    inventory.push(reward);
    return true;
  }

  getHudSnapshot(): FinalIslandHudState {
    let discovered = 0;
    for (let i = 0; i < this.caves.length; i++) {
      if (this.caves[i].discovered) discovered++;
    }
    return {
      honey: this.honey,
      honeycomb: this.honeycomb,
      honeyJewels: this.honeyJewels,
      queenReputation: this.queenReputation,
      dragonUnlocked: this.dragonUnlocked,
      bees: this.bees.length,
      friendlyBees: this.bees.filter((b) => b.friendly).length,
      rideableBees: this.bees.filter((b) => b.rideable).length,
      discoveredCaves: discovered,
      totalCaves: this.caves.length,
    };
  }

  serialize(): FinalIslandSaveState {
    return {
      honey: this.honey,
      honeycomb: this.honeycomb,
      honeyJewels: this.honeyJewels,
      queenReputation: this.queenReputation,
      dragonUnlocked: this.dragonUnlocked,
      bees: this.bees.map((b) => ({ ...b })),
      discoveredCaveIds: this.caves.filter((c) => c.discovered).map((c) => c.id),
      claimedQueenRewards: [...this.claimedQueenRewards],
    };
  }

  hydrate(save?: Partial<FinalIslandSaveState> | null): void {
    if (!save) return;
    this.honey = Math.max(0, Math.floor(save.honey ?? 0));
    this.honeycomb = Math.max(0, Math.floor(save.honeycomb ?? 0));
    this.honeyJewels = Math.max(0, Math.floor(save.honeyJewels ?? 0));
    this.queenReputation = Math.max(0, Math.floor(save.queenReputation ?? 0));
    this.dragonUnlocked = Boolean(save.dragonUnlocked);
    if (Array.isArray(save.bees) && save.bees.length > 0) {
      this.bees = save.bees.map((b) => ({
        id: String(b.id),
        name: String(b.name),
        color: String(b.color || 'gold'),
        friendly: Boolean(b.friendly),
        rideable: Boolean(b.friendly && b.rideable),
      }));
    }
    if (Array.isArray(save.discoveredCaveIds)) {
      for (const id of save.discoveredCaveIds) {
        const cave = this.caveById.get(id);
        if (cave) cave.discovered = true;
      }
    }
    this.claimedQueenRewards = Array.isArray(save.claimedQueenRewards)
      ? save.claimedQueenRewards.map(String)
      : [];
  }

  /** Resets progression for a brand-new island without touching the scene. */
  resetProgress(): void {
    this.honey = 0;
    this.honeycomb = 0;
    this.honeyJewels = 0;
    this.queenReputation = 0;
    this.dragonUnlocked = false;
    this.bees = [];
    this.claimedQueenRewards = [];
    for (const cave of this.caves) cave.discovered = false;
  }

  private rebuildCaveIndex(): void {
    this.caveById.clear();
    for (const cave of this.caves) this.caveById.set(cave.id, cave);
  }

  dispose(): void {
    for (const gate of [...this.gates]) this.destroyGate(gate);
    this.gates.clear();
    this.gateLights.clear();
  }
}
