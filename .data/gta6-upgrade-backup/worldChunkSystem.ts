import * as THREE from 'three';

export type WorldChunk = {
  group: THREE.Group;
  x: number;
  z: number;
};

/**
 * Minecraft-style circular chunk visibility culling.
 * Toggles chunk.group.visible based on grid distance from the player's current chunk.
 */
export function updateWorldChunks(
  chunks: WorldChunk[],
  player: THREE.Vector3,
  chunkSize: number,
  renderRadius: number,
): void {
  const px = Math.floor(player.x / chunkSize);
  const pz = Math.floor(player.z / chunkSize);
  const radiusSq = renderRadius * renderRadius;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    const dx = chunk.x - px;
    const dz = chunk.z - pz;
    const shouldBeVisible = dx * dx + dz * dz <= radiusSq;
    if (chunk.group.visible !== shouldBeVisible) {
      chunk.group.visible = shouldBeVisible;
    }
  }
}

/**
 * Manages spatial WorldChunk buckets for SURVIVAL ISLAND: THE LOST WORLD.
 * Only recalculates chunk visibility when the player crosses into a new chunk
 * or when the active render distance changes.
 */
export class WorldChunkManager {
  public readonly chunkSize: number;
  public readonly chunks: WorldChunk[] = [];
  public readonly foliageChunks: WorldChunk[] = [];
  private readonly chunkMap = new Map<string, WorldChunk>();
  private readonly foliageChunkMap = new Map<string, WorldChunk>();
  private lastChunkX = Number.NaN;
  private lastChunkZ = Number.NaN;
  private lastRenderRadius = -1;

  constructor(
    private readonly parentGroup: THREE.Group,
    chunkSize = 64,
  ) {
    this.chunkSize = chunkSize;
  }

  public getOrCreateChunk(worldX: number, worldZ: number): WorldChunk {
    const cx = Math.floor(worldX / this.chunkSize);
    const cz = Math.floor(worldZ / this.chunkSize);
    const key = `${cx},${cz}`;
    let chunk = this.chunkMap.get(key);
    if (!chunk) {
      const group = new THREE.Group();
      group.name = `world_chunk_${cx}_${cz}`;
      // Kept at (0,0,0) so reparented world-space objects preserve exact coordinates & matrices
      this.parentGroup.add(group);
      chunk = { group, x: cx, z: cz };
      this.chunkMap.set(key, chunk);
      this.chunks.push(chunk);
    }
    return chunk;
  }

  public getOrCreateFoliageChunk(worldX: number, worldZ: number): WorldChunk {
    const cx = Math.floor(worldX / this.chunkSize);
    const cz = Math.floor(worldZ / this.chunkSize);
    const key = `${cx},${cz}`;
    let chunk = this.foliageChunkMap.get(key);
    if (!chunk) {
      const group = new THREE.Group();
      group.name = `world_foliage_chunk_${cx}_${cz}`;
      this.parentGroup.add(group);
      chunk = { group, x: cx, z: cz };
      this.foliageChunkMap.set(key, chunk);
      this.foliageChunks.push(chunk);
    }
    return chunk;
  }

  public addObjectAt(obj: THREE.Object3D, worldX: number, worldZ: number): void {
    const chunk = this.getOrCreateChunk(worldX, worldZ);
    chunk.group.add(obj);
  }

  public addFoliageObjectAt(obj: THREE.Object3D, worldX: number, worldZ: number): void {
    const chunk = this.getOrCreateFoliageChunk(worldX, worldZ);
    chunk.group.add(obj);
  }

  /**
   * Updates chunk visibility ONLY when the player enters a different chunk
   * or when the render distance changes. Returns true if a chunk boundary was crossed.
   */
  public updateIfChunkChanged(
    playerPos: THREE.Vector3,
    renderDistanceMeters: number,
  ): boolean {
    const px = Math.floor(playerPos.x / this.chunkSize);
    const pz = Math.floor(playerPos.z / this.chunkSize);
    // Preserve full existing render distance while avoiding an extra outer ring beyond camera.far
    const renderRadius = Math.max(2, Math.ceil(renderDistanceMeters / this.chunkSize));

    if (
      px === this.lastChunkX &&
      pz === this.lastChunkZ &&
      renderRadius === this.lastRenderRadius
    ) {
      return false;
    }

    this.lastChunkX = px;
    this.lastChunkZ = pz;
    this.lastRenderRadius = renderRadius;

    updateWorldChunks(this.chunks, playerPos, this.chunkSize, renderRadius);
    if (this.foliageChunks.length > 0) {
      // Keep full ambient ground grass & wildflowers within ~128-192m while culling sub-pixel distant grass
      const foliageRadius = Math.min(
        renderRadius,
        Math.max(2, Math.ceil(115 / this.chunkSize)),
      );
      updateWorldChunks(this.foliageChunks, playerPos, this.chunkSize, foliageRadius);
    }
    return true;
  }

  public invalidate(): void {
    this.lastChunkX = Number.NaN;
    this.lastChunkZ = Number.NaN;
    this.lastRenderRadius = -1;
  }
}
