export type ManagedWorldObject = {
  id: string;
  x: number;
  z: number;
  loaded: boolean;
  load: () => void;
  unload: () => void;
};

export class WorldPerformanceManager {
  private objects = new Map<string, ManagedWorldObject>();
  private lastUpdate = 0;
  private frame = 0;
  private timer?: ReturnType<typeof setInterval>;

  readonly LOAD_DISTANCE = 450;
  readonly UNLOAD_DISTANCE = 600;
  readonly UPDATE_INTERVAL = 250;

  register(object: ManagedWorldObject) {
    this.objects.set(object.id, object);
  }

  unregister(id: string) {
    const object = this.objects.get(id);
    if (object?.loaded) object.unload();
    this.objects.delete(id);
  }

  update(playerX: number, playerZ: number, now = performance.now()) {
    if (now - this.lastUpdate < this.UPDATE_INTERVAL) return;
    this.lastUpdate = now;

    const list = Array.from(this.objects.values());
    const budget = 25;
    const loadDistSq = this.LOAD_DISTANCE ** 2;
    const unloadDistSq = this.UNLOAD_DISTANCE ** 2;

    for (let i = 0; i < Math.min(budget, list.length); i++) {
      const index = (this.frame * budget + i) % Math.max(1, list.length);
      const object = list[index];
      if (!object) continue;

      const dx = object.x - playerX;
      const dz = object.z - playerZ;
      const distanceSquared = dx * dx + dz * dz;

      if (!object.loaded && distanceSquared < loadDistSq) {
        object.load();
        object.loaded = true;
      } else if (object.loaded && distanceSquared > unloadDistSq) {
        object.unload();
        object.loaded = false;
      }
    }

    this.frame++;
  }

  /**
   * Immediately synchronizes all registered world objects (used on world start,
   * save load, or teleport so nearby objects appear without waiting for a budget cycle).
   */
  syncAll(playerX: number, playerZ: number) {
    const loadDistSq = this.LOAD_DISTANCE ** 2;
    const unloadDistSq = this.UNLOAD_DISTANCE ** 2;

    for (const object of this.objects.values()) {
      const dx = object.x - playerX;
      const dz = object.z - playerZ;
      const distanceSquared = dx * dx + dz * dz;

      if (!object.loaded && distanceSquared < loadDistSq) {
        object.load();
        object.loaded = true;
      } else if (object.loaded && distanceSquared > unloadDistSq) {
        object.unload();
        object.loaded = false;
      }
    }
    this.lastUpdate = typeof performance !== 'undefined' ? performance.now() : Date.now();
  }

  getStats(): { total: number; loaded: number } {
    let loaded = 0;
    for (const object of this.objects.values()) {
      if (object.loaded) loaded++;
    }
    return { total: this.objects.size, loaded };
  }

  start(getPlayerPosition: () => { x: number; z: number }) {
    this.stop();
    this.timer = setInterval(() => {
      const player = getPlayerPosition();
      this.update(player.x, player.z);
    }, this.UPDATE_INTERVAL);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = undefined;
  }

  dispose() {
    this.stop();
    for (const object of this.objects.values()) {
      if (object.loaded) {
        object.unload();
        object.loaded = false;
      }
    }
    this.objects.clear();
  }
}
