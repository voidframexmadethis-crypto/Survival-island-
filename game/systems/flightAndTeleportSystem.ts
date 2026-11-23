import {
  CAUSEWAY_GATEWAY_POINT,
  CAUSEWAY_ISLAND_POINT,
} from './islandMainlandTransit';
import {
  AUTUMN_GROVE_POS,
  BADLANDS_MINESHAFT_POS,
  BURIED_TREASURE_POS,
  CAVE_POS,
  CHERRY_GROVE_POS,
  CORAL_REEF_POS,
  CRESCENT_CITY_DOCKS_POS,
  CRESCENT_CITY_GARAGE_POS,
  CRESCENT_CITY_POS,
  CRESCENT_CITY_SAFEHOUSE_POS,
  CRESCENT_CITY_TERMINAL_POS,
  CRESCENT_CITY_VAULT_POS,
  DEAD_OAK_POS,
  DESERT_PYRAMID_POS,
  DESERT_VILLAGE_POS,
  DESERT_WELL_POS,
  DRAGON_VALLEY_POS,
  ERODED_BADLANDS_POS,
  EXPEDITION_POS,
  FARMER_POS,
  FROZEN_OCEAN_ICEBERG_POS,
  FROZEN_PEAKS_POS,
  GROVE_OUTPOST_POS,
  HILL_HOUSE_POS,
  HOMESTEAD_POS,
  ICE_SPIKES_POS,
  JAGGED_PEAKS_POS,
  JUNGLE_TEMPLE_POS,
  LAKE_CENTER,
  MANGROVE_SWAMP_POS,
  MEADOW_OUTPOST_POS,
  MUSHROOM_FIELDS_POS,
  OCEAN_MONUMENT_POS,
  PILLAGER_OUTPOST_POS,
  PLAINS_VILLAGE_POS,
  PLAYER_SPAWN,
  RESORT_CORNER_POS,
  RUINED_CASTLE_POS,
  RUINED_PORTAL_POS,
  SAVANNA_PLATEAU_POS,
  SAVANNA_VILLAGE_POS,
  SHIPWRECK_POS,
  SNOWY_IGLOO_POS,
  SNOWY_PLAINS_OUTPOST_POS,
  SNOWY_SLOPES_IGLOO_POS,
  SNOWY_VILLAGE_POS,
  STONY_PEAKS_POS,
  SUNFLOWER_VILLAGE_POS,
  SWAMP_HUT_POS,
  SWAMP_POS,
  TAIGA_VILLAGE_POS,
  UNDERGROUND_ELEVATOR_KIOSK_POS,
  VEHICLE_GARAGE_POS,
  VIKING_VILLAGE_POS,
  WATERFALL_POS,
  WHEATFIELD_POS,
  WINDSWEPT_SAVANNA_POS,
  WOODED_BADLANDS_POS,
  WOODLAND_MANSION_POS,
} from '../world/terrain';
import { WATERPARK_DECK_Y, WATERPARK_SITE } from '../world/waterparkLayout';
import { getVolcanoFlexSite } from '../world/volcanoFlexLayout';

export interface FlightPlayerState {
  x: number;
  y: number;
  z: number;
  vx?: number;
  vy: number;
  vz?: number;
  isFlying: boolean;
  mode?: string;
}

export interface TeleportDestination {
  x: number;
  y?: number;
  z: number;
}

export interface FlightControlsInput {
  forward?: number; // -1 to 1 (W/S or stick Y)
  strafe?: number; // -1 to 1 (A/D or stick X)
  ascend?: number; // -1 to 1 (Space = +1, Shift/Ctrl = -1)
  yaw?: number; // camera yaw in radians
  pitch?: number; // camera pitch in radians for aim-flight
  aimFlight?: boolean;
  boost?: boolean;
}

export interface FlightAndTeleportOptions {
  flySpeed?: number;
  verticalSpeed?: number;
  boostMultiplier?: number;
  getGroundHeight?: ((x: number, z: number) => number) | null;
  onStatusChange?: ((msg: string, type: 'info' | 'flight' | 'success' | 'error') => void) | null;
}

export const ISLAND_TELEPORT_DESTINATIONS: Record<string, TeleportDestination> = {
  'dragon valley': { x: DRAGON_VALLEY_POS.x, y: 12, z: DRAGON_VALLEY_POS.z },
  'viking village': { x: VIKING_VILLAGE_POS.x, y: 8, z: VIKING_VILLAGE_POS.z },
  'resort corner': { x: RESORT_CORNER_POS.x, y: 6, z: RESORT_CORNER_POS.z },
  'crescent city': { x: CRESCENT_CITY_POS.x, z: CRESCENT_CITY_POS.z },
  'crescent terminal': { x: CRESCENT_CITY_TERMINAL_POS.x, z: CRESCENT_CITY_TERMINAL_POS.z },
  'crescent causeway': { x: CAUSEWAY_GATEWAY_POINT.x, z: CAUSEWAY_GATEWAY_POINT.z },
  'crescent bridge': { x: CAUSEWAY_GATEWAY_POINT.x, z: CAUSEWAY_GATEWAY_POINT.z },
  'river bridge': { x: CAUSEWAY_GATEWAY_POINT.x, z: CAUSEWAY_GATEWAY_POINT.z },
  'island causeway': { x: 0, z: 680 },
  'coastal causeway': { x: CAUSEWAY_GATEWAY_POINT.x, z: CAUSEWAY_GATEWAY_POINT.z },
  'east bank': { x: CAUSEWAY_ISLAND_POINT.x, z: CAUSEWAY_ISLAND_POINT.z },
  'bayou customs': { x: CRESCENT_CITY_GARAGE_POS.x, z: CRESCENT_CITY_GARAGE_POS.z },
  'magazine street': { x: CRESCENT_CITY_SAFEHOUSE_POS.x, z: CRESCENT_CITY_SAFEHOUSE_POS.z },
  'riverfront dock': { x: CRESCENT_CITY_DOCKS_POS.x, z: CRESCENT_CITY_DOCKS_POS.z },
  'vault locker': { x: CRESCENT_CITY_VAULT_POS.x, z: CRESCENT_CITY_VAULT_POS.z },
  'french quarter': { x: CRESCENT_CITY_POS.x, z: CRESCENT_CITY_POS.z },
  'louisiana mainland': { x: CRESCENT_CITY_POS.x, z: CRESCENT_CITY_POS.z },
  'ruined castle': { x: RUINED_CASTLE_POS.x, y: 8, z: RUINED_CASTLE_POS.z },
  desert: { x: DESERT_PYRAMID_POS.x, z: DESERT_PYRAMID_POS.z },
  'desert pyramid': { x: DESERT_PYRAMID_POS.x, z: DESERT_PYRAMID_POS.z },
  'desert village': { x: DESERT_VILLAGE_POS.x, z: DESERT_VILLAGE_POS.z },
  'desert well': { x: DESERT_WELL_POS.x, z: DESERT_WELL_POS.z },
  savanna: { x: SAVANNA_VILLAGE_POS.x, z: SAVANNA_VILLAGE_POS.z },
  'savanna village': { x: SAVANNA_VILLAGE_POS.x, z: SAVANNA_VILLAGE_POS.z },
  'savanna plateau': { x: SAVANNA_PLATEAU_POS.x, z: SAVANNA_PLATEAU_POS.z },
  'windswept savanna': { x: WINDSWEPT_SAVANNA_POS.x, z: WINDSWEPT_SAVANNA_POS.z },
  badlands: { x: BADLANDS_MINESHAFT_POS.x, z: BADLANDS_MINESHAFT_POS.z },
  mineshaft: { x: BADLANDS_MINESHAFT_POS.x, z: BADLANDS_MINESHAFT_POS.z },
  'wooded badlands': { x: WOODED_BADLANDS_POS.x, z: WOODED_BADLANDS_POS.z },
  'eroded badlands': { x: ERODED_BADLANDS_POS.x, z: ERODED_BADLANDS_POS.z },
  swamp: { x: SWAMP_HUT_POS.x, z: SWAMP_HUT_POS.z },
  'swamp hut': { x: SWAMP_HUT_POS.x, z: SWAMP_HUT_POS.z },
  'murky swamp': { x: SWAMP_POS.x, z: SWAMP_POS.z },
  'mangrove swamp': { x: MANGROVE_SWAMP_POS.x, z: MANGROVE_SWAMP_POS.z },
  'mushroom fields': { x: MUSHROOM_FIELDS_POS.x, z: MUSHROOM_FIELDS_POS.z },
  'cherry grove': { x: CHERRY_GROVE_POS.x, z: CHERRY_GROVE_POS.z },
  'ice spikes': { x: ICE_SPIKES_POS.x, z: ICE_SPIKES_POS.z },
  'snowy plains': { x: SNOWY_PLAINS_OUTPOST_POS.x, z: SNOWY_PLAINS_OUTPOST_POS.z },
  'snowy village': { x: SNOWY_VILLAGE_POS.x, z: SNOWY_VILLAGE_POS.z },
  'snowy slopes': { x: SNOWY_SLOPES_IGLOO_POS.x, z: SNOWY_SLOPES_IGLOO_POS.z },
  igloo: { x: SNOWY_IGLOO_POS.x, z: SNOWY_IGLOO_POS.z },
  'jagged peaks': { x: JAGGED_PEAKS_POS.x, z: JAGGED_PEAKS_POS.z },
  'frozen peaks': { x: FROZEN_PEAKS_POS.x, z: FROZEN_PEAKS_POS.z },
  'stony peaks': { x: STONY_PEAKS_POS.x, z: STONY_PEAKS_POS.z },
  grove: { x: GROVE_OUTPOST_POS.x, z: GROVE_OUTPOST_POS.z },
  meadow: { x: MEADOW_OUTPOST_POS.x, z: MEADOW_OUTPOST_POS.z },
  plains: { x: PLAINS_VILLAGE_POS.x, z: PLAINS_VILLAGE_POS.z },
  'sunflower plains': { x: SUNFLOWER_VILLAGE_POS.x, z: SUNFLOWER_VILLAGE_POS.z },
  'ruined portal': { x: RUINED_PORTAL_POS.x, z: RUINED_PORTAL_POS.z },
  taiga: { x: TAIGA_VILLAGE_POS.x, z: TAIGA_VILLAGE_POS.z },
  jungle: { x: JUNGLE_TEMPLE_POS.x, z: JUNGLE_TEMPLE_POS.z },
  'autumn grove': { x: AUTUMN_GROVE_POS.x, z: AUTUMN_GROVE_POS.z },
  'ocean monument': { x: OCEAN_MONUMENT_POS.x, y: 6, z: OCEAN_MONUMENT_POS.z },
  'coral reef': { x: CORAL_REEF_POS.x, y: 5, z: CORAL_REEF_POS.z },
  'frozen ocean': { x: FROZEN_OCEAN_ICEBERG_POS.x, y: 12, z: FROZEN_OCEAN_ICEBERG_POS.z },
  'buried treasure': { x: BURIED_TREASURE_POS.x, z: BURIED_TREASURE_POS.z },
  spawn: { x: PLAYER_SPAWN.x, z: PLAYER_SPAWN.z },
  shipwreck: { x: SHIPWRECK_POS.x, y: 8, z: SHIPWRECK_POS.z },
  homestead: { x: HOMESTEAD_POS.x, z: HOMESTEAD_POS.z },
  'hill house': { x: HILL_HOUSE_POS.x, z: HILL_HOUSE_POS.z },
  waterpark: {
    x: WATERPARK_SITE.x + 38,
    y: WATERPARK_DECK_Y + 0.65,
    z: WATERPARK_SITE.z - 42,
  },
  'hilltop waterpark': {
    x: WATERPARK_SITE.x + 38,
    y: WATERPARK_DECK_Y + 0.65,
    z: WATERPARK_SITE.z - 42,
  },
  volcano: {
    x: getVolcanoFlexSite().station.x,
    y: getVolcanoFlexSite().station.y + 1.1,
    z: getVolcanoFlexSite().station.z,
  },
  'volcano flex': {
    x: getVolcanoFlexSite().station.x,
    y: getVolcanoFlexSite().station.y + 1.1,
    z: getVolcanoFlexSite().station.z,
  },
  'volcano flex coaster': {
    x: getVolcanoFlexSite().station.x,
    y: getVolcanoFlexSite().station.y + 1.1,
    z: getVolcanoFlexSite().station.z,
  },
  garage: { x: VEHICLE_GARAGE_POS.x, z: VEHICLE_GARAGE_POS.z },
  'underground garage': {
    x: UNDERGROUND_ELEVATOR_KIOSK_POS.x,
    z: UNDERGROUND_ELEVATOR_KIOSK_POS.z,
  },
  'car vault': {
    x: UNDERGROUND_ELEVATOR_KIOSK_POS.x,
    z: UNDERGROUND_ELEVATOR_KIOSK_POS.z,
  },
  farmer: { x: FARMER_POS.x, z: FARMER_POS.z },
  wheatfield: { x: WHEATFIELD_POS.x, z: WHEATFIELD_POS.z },
  lake: { x: LAKE_CENTER.x, y: 6, z: LAKE_CENTER.z },
  waterfall: { x: WATERFALL_POS.x, z: WATERFALL_POS.z },
  cave: { x: CAVE_POS.x, z: CAVE_POS.z },
  expedition: { x: EXPEDITION_POS.x, z: EXPEDITION_POS.z },
  mansion: { x: WOODLAND_MANSION_POS.x, z: WOODLAND_MANSION_POS.z },
  outpost: { x: PILLAGER_OUTPOST_POS.x, z: PILLAGER_OUTPOST_POS.z },
  'dead oak': { x: DEAD_OAK_POS.x, z: DEAD_OAK_POS.z },
};

export class FlightAndTeleportSystem {
  public player: FlightPlayerState;
  public destinations: Record<string, TeleportDestination>;
  public flySpeed: number;
  public verticalSpeed: number;
  public boostMultiplier: number;
  public getGroundHeight: ((x: number, z: number) => number) | null;
  public onStatusChange:
    | ((msg: string, type: 'info' | 'flight' | 'success' | 'error') => void)
    | null;

  constructor(
    player: FlightPlayerState,
    destinations: Record<string, TeleportDestination> = {},
    options: FlightAndTeleportOptions = {},
  ) {
    this.player = player;
    this.destinations = destinations;
    this.flySpeed = options.flySpeed || 32;
    this.verticalSpeed = options.verticalSpeed || 22;
    this.boostMultiplier = options.boostMultiplier || 1.8;
    this.getGroundHeight = options.getGroundHeight || null;
    this.onStatusChange = options.onStatusChange || null;
  }

  public get flying(): boolean {
    return this.player.isFlying;
  }

  public notify(
    message: string,
    type: 'info' | 'flight' | 'success' | 'error' = 'info',
  ): void {
    if (typeof this.onStatusChange === 'function') {
      this.onStatusChange(message, type);
    }
  }

  // Works in BOTH Survival and Creative
  public toggleFlight(forceState?: boolean): boolean {
    const nextState =
      typeof forceState === 'boolean' ? forceState : !this.player.isFlying;

    this.player.isFlying = nextState;
    this.player.vy = 0;
    if (this.player.vx !== undefined) this.player.vx = 0;
    if (this.player.vz !== undefined) this.player.vz = 0;

    this.notify(
      nextState
        ? `Flight ON (${this.player.mode || 'Survival/Creative'})`
        : 'Flight OFF — Gravity active',
      'flight',
    );

    return nextState;
  }

  // Call inside fixed/clamped update loop when player.isFlying is true
  public updateFlight(dt: number, controls: FlightControlsInput = {}): void {
    if (!this.player.isFlying) return;

    const {
      forward = 0,
      strafe = 0,
      ascend = 0,
      yaw = 0,
      pitch = 0,
      aimFlight = false,
      boost = false,
    } = controls;

    const speed = this.flySpeed * (boost ? this.boostMultiplier : 1);
    const vSpeed = this.verticalSpeed * (boost ? this.boostMultiplier : 1);

    // Keep vertical velocity zeroed so gravity never pulls the player down mid-flight
    this.player.vy = 0;

    let moveX = 0;
    let moveY = ascend * vSpeed;
    let moveZ = 0;

    if (aimFlight) {
      // Fly in the exact direction the camera is facing
      const cosPitch = Math.cos(pitch);
      const dirX = Math.sin(yaw) * cosPitch;
      const dirY = Math.sin(pitch);
      const dirZ = -Math.cos(yaw) * cosPitch;

      const rightX = Math.cos(yaw);
      const rightZ = Math.sin(yaw);

      moveX += (dirX * forward + rightX * strafe) * speed;
      moveZ += (dirZ * forward + rightZ * strafe) * speed;
      moveY += dirY * forward * speed;
    } else {
      // Classic horizontal plane + separate vertical lift/drop (Minecraft-style)
      const sinY = Math.sin(yaw);
      const cosY = Math.cos(yaw);

      const fwdX = sinY * forward;
      const fwdZ = -cosY * forward;
      const rightX = cosY * strafe;
      const rightZ = sinY * strafe;

      moveX = (fwdX + rightX) * speed;
      moveZ = (fwdZ + rightZ) * speed;
    }

    this.player.x += moveX * dt;
    this.player.y += moveY * dt;
    this.player.z += moveZ * dt;

    // Prevent flying deep underground if a ground height function is provided
    if (typeof this.getGroundHeight === 'function') {
      const minFloorY = this.getGroundHeight(this.player.x, this.player.z) + 1.5;
      if (this.player.y < minFloorY) {
        this.player.y = minFloorY;
      }
    }
  }

  // Type a biome or landmark name (supports "/tp desert", "tp desert", or just "desert")
  public teleportTo(
    rawInput: string,
  ):
    | { ok: true; destination: string; coords: TeleportDestination }
    | { ok: false } {
    if (!rawInput || !rawInput.trim()) {
      this.notify('Type a biome name to teleport.', 'error');
      return { ok: false };
    }

    const cleaned = rawInput
      .toLowerCase()
      .replace(/^\/?(tp|teleport|warp|go)\s+/i, '')
      .trim();

    const keys = Object.keys(this.destinations);
    const exactOrPartial =
      keys.find((k) => k.toLowerCase() === cleaned) ||
      keys.find((k) => k.toLowerCase().includes(cleaned));

    if (!exactOrPartial) {
      this.notify(`Couldn't find "${cleaned}". Check your biome list.`, 'error');
      return { ok: false };
    }

    const spot = this.destinations[exactOrPartial];
    const safeGroundY =
      typeof this.getGroundHeight === 'function'
        ? this.getGroundHeight(spot.x, spot.z)
        : (spot.y ?? 20);

    this.player.x = spot.x;
    this.player.y = Math.max(spot.y ?? safeGroundY, safeGroundY) + 4; // clear ground/cliffs
    this.player.z = spot.z;
    this.player.vy = 0;

    this.notify(`Teleported to ${exactOrPartial}!`, 'success');
    return { ok: true, destination: exactOrPartial, coords: spot };
  }
}
