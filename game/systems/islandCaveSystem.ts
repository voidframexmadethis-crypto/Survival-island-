import * as THREE from 'three';

export type CaveType =
  | 'regular'
  | 'civilization'
  | 'monster-boss'
  | 'lush'
  | 'crystal'
  | 'red-dragon';

export type Cave = {
  id: string;
  type: CaveType;
  position: THREE.Vector3;
  discovered: boolean;
  built: boolean;
};

export const CAVE_TOTAL = 5000;
export const LOAD_DISTANCE = 450;

export class IslandCaveSystem {
  caves: Cave[] = [];
  private active = new Map<string, THREE.Group>();

  generate(center: THREE.Vector3, radius: number): Cave[] {
    const special: CaveType[] = [
      'civilization',
      'monster-boss',
      'lush',
      'crystal',
      'red-dragon',
    ];

    this.caves = Array.from({ length: CAVE_TOTAL }, (_, i) => {
      const angle = Math.random() * Math.PI * 2;
      const distance = Math.sqrt(Math.random()) * radius;

      return {
        id: `cave-${i}`,
        type: i < special.length ? special[i] : 'regular',
        position: new THREE.Vector3(
          center.x + Math.cos(angle) * distance,
          center.y,
          center.z + Math.sin(angle) * distance,
        ),
        discovered: false,
        built: false,
      };
    });

    return this.caves;
  }

  // Removes terrain triangles around cave entrances.
  // Use only with compatible X/Z grid terrain geometry.
  carveTerrain(
    geometry: THREE.BufferGeometry,
    openings: { x: number; z: number; radius: number }[],
  ): boolean {
    const positions = geometry.getAttribute('position');
    const index = geometry.getIndex();
    if (!index || !positions) return false;

    const kept: number[] = [];

    for (let i = 0; i < index.count; i += 3) {
      const a = index.getX(i);
      const b = index.getX(i + 1);
      const c = index.getX(i + 2);

      const x = (positions.getX(a) + positions.getX(b) + positions.getX(c)) / 3;
      const z = (positions.getZ(a) + positions.getZ(b) + positions.getZ(c)) / 3;

      const blocked = openings.some(
        (o) => Math.hypot(x - o.x, z - o.z) < o.radius,
      );

      if (!blocked) {
        kept.push(a, b, c);
      }
    }

    geometry.setIndex(kept);
    geometry.computeVertexNormals();
    geometry.computeBoundingSphere();
    return true;
  }

  build(cave: Cave, scene: THREE.Scene): void {
    if (cave.built || this.active.has(cave.id)) return;

    const group = new THREE.Group();
    group.userData.caveId = cave.id;
    group.userData.caveType = cave.type;

    // Curve control points in local group space so group.position places the tunnel entrance at cave.position.
    const path = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -5, -15),
      new THREE.Vector3(4, -10, -35),
      new THREE.Vector3(0, -12, -55),
    ]);

    const tunnel = new THREE.TubeGeometry(path, 32, 12, 8, false);
    const mat = new THREE.MeshStandardMaterial({
      color: cave.type === 'red-dragon' ? 0x4a0808 : 0x514b43,
      roughness: 0.95,
      side: THREE.BackSide,
    });

    const mesh = new THREE.Mesh(tunnel, mat);
    mesh.receiveShadow = true;
    mesh.userData.noShadowCast = true;
    group.add(mesh);

    group.position.copy(cave.position);
    scene.add(group);

    this.active.set(cave.id, group);
    cave.built = true;
  }

  private disposeGroup(group: THREE.Group, scene?: THREE.Scene): void {
    if (scene) {
      scene.remove(group);
    } else {
      group.removeFromParent();
    }
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        if (Array.isArray(child.material)) {
          child.material.forEach((m) => m.dispose());
        } else {
          child.material.dispose();
        }
      }
    });
  }

  update(player: THREE.Vector3, scene: THREE.Scene): void {
    for (const cave of this.caves) {
      const distance = cave.position.distanceTo(player);

      if (distance < 25) cave.discovered = true;

      if (distance < LOAD_DISTANCE) {
        this.build(cave, scene);
      } else if (distance > LOAD_DISTANCE * 1.4 && cave.built) {
        const group = this.active.get(cave.id);
        if (group) {
          this.disposeGroup(group, scene);
          this.active.delete(cave.id);
        }
        cave.built = false;
      }
    }
  }

  getActiveCount(): number {
    return this.active.size;
  }

  dispose(scene?: THREE.Scene): void {
    for (const group of this.active.values()) {
      this.disposeGroup(group, scene);
    }
    this.active.clear();
    for (const cave of this.caves) {
      cave.built = false;
    }
  }
}

export class CaveBoss {
  health = 1000;
  phase = 1;
  defeated = false;
  attackCooldown = 0;

  constructor(
    public name: string,
    public model: THREE.Object3D,
    public damage = 25,
  ) {}

  update(
    delta: number,
    player: THREE.Vector3,
    hurtPlayer: (n: number) => void,
  ): void {
    if (this.defeated) return;
    this.attackCooldown = Math.max(0, this.attackCooldown - delta);

    const distance = this.model.position.distanceTo(player);
    if (distance > 30) return;

    this.model.lookAt(player);

    if (distance > 4) {
      const dir = new THREE.Vector3()
        .subVectors(player, this.model.position)
        .normalize();
      this.model.position.addScaledVector(dir, delta * (4 + this.phase));
    } else if (this.attackCooldown === 0) {
      hurtPlayer(this.damage * this.phase);
      this.attackCooldown = Math.max(0.7, 2 - this.phase * 0.4);
    }
  }

  takeDamage(amount: number): boolean {
    if (this.defeated) return false;
    this.health = Math.max(0, this.health - amount);
    if (this.health < 650) this.phase = 2;
    if (this.health < 300) this.phase = 3;

    if (this.health <= 0) {
      this.defeated = true;
      this.model.visible = false;
      return true;
    }

    return false;
  }
}
