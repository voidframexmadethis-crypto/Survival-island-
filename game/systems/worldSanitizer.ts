export interface SanitizableProp {
  x: number;
  y: number;
  z: number;
  allowFloating?: boolean;
  isWaterProp?: boolean;
  yOffset?: number;
}

export interface SanitizableEntity {
  id?: string;
  x: number;
  y: number;
  z: number;
  vy?: number;
  canFly?: boolean;
  isWatercraft?: boolean;
}

export interface SanitizableWorld {
  props?: SanitizableProp[];
  entities?: SanitizableEntity[];
}

export interface SanitizeWorldOptions {
  getGroundY?: (x: number, z: number) => number;
  waterLevel?: number;
  maxWorldRadius?: number;
  maxPropCount?: number;
}

export interface SanitizeWorldResult {
  fixedProps: number;
  removedBroken: number;
}

export function sanitizeWorldAndEntities(
  world: SanitizableWorld,
  options: SanitizeWorldOptions = {},
): SanitizeWorldResult {
  const getGroundY = options.getGroundY || (() => 0);
  const waterLevel = options.waterLevel ?? 0;
  const maxWorldRadius = options.maxWorldRadius || 1500;
  const maxPropCount = options.maxPropCount || 1200;

  let fixedProps = 0;
  let removedBroken = 0;

  // 1. Clean & ground static props (vines, trees, rocks, castles, tiki bars, anvils)
  if (Array.isArray(world.props)) {
    // Trim runaway prop counts if multiple generation passes stacked duplicates
    if (world.props.length > maxPropCount) {
      removedBroken += world.props.length - maxPropCount;
      world.props.length = maxPropCount;
    }

    for (let i = world.props.length - 1; i >= 0; i--) {
      const p = world.props[i];
      if (!p || !Number.isFinite(p.x) || !Number.isFinite(p.z)) {
        world.props.splice(i, 1);
        removedBroken++;
        continue;
      }

      // Remove out-of-bounds props way outside the island
      if (Math.abs(p.x) > maxWorldRadius || Math.abs(p.z) > maxWorldRadius) {
        world.props.splice(i, 1);
        removedBroken++;
        continue;
      }

      // Snap floating or sunken ground props cleanly to terrain height
      if (!p.allowFloating) {
        const groundY = getGroundY(p.x, p.z);
        if (!Number.isFinite(groundY)) {
          world.props.splice(i, 1);
          removedBroken++;
          continue;
        }
        const targetY = p.isWaterProp ? waterLevel : groundY + (p.yOffset || 0);
        if (!Number.isFinite(p.y) || Math.abs(p.y - targetY) > 0.75) {
          p.y = targetY;
          fixedProps++;
        }
      }
    }
  }

  // 2. Clean active entities (dragons, royal ghosts, raiders, jet skis)
  if (Array.isArray(world.entities)) {
    const seenIds = new Set<string>();
    for (let i = world.entities.length - 1; i >= 0; i--) {
      const e = world.entities[i];
      if (
        !e ||
        !Number.isFinite(e.x) ||
        !Number.isFinite(e.y) ||
        !Number.isFinite(e.z)
      ) {
        world.entities.splice(i, 1);
        removedBroken++;
        continue;
      }

      // Deduplicate accidental double-spawns with the same ID
      if (e.id) {
        if (seenIds.has(e.id)) {
          world.entities.splice(i, 1);
          removedBroken++;
          continue;
        }
        seenIds.add(e.id);
      }

      // Prevent non-flying entities from falling endlessly into the void
      if (!e.canFly) {
        const floorY = e.isWatercraft ? waterLevel : getGroundY(e.x, e.z);
        if (e.y < floorY - 5) {
          e.y = floorY + 1;
          if (e.vy !== undefined) e.vy = 0;
          fixedProps++;
        }
      }
    }
  }

  return { fixedProps, removedBroken };
}
