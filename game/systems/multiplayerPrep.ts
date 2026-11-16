import {
  GameStats,
  InventorySlot,
  PlacedStructure,
  PlayerVitals,
  WeatherType,
} from '../types';

/**
 * Future Multiplayer Compatibility Layer.
 * Stage 1 runs deterministically in single-player mode.
 * Future stages can bind a WebSocket / WebRTC transport to this adapter
 * without rewriting inventory, structure placement, or world interaction logic.
 */

export interface PlayerSyncFrame {
  playerId: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  isCrouching: boolean;
  isSwimming: boolean;
  equippedItemId: string | null;
  vitals: PlayerVitals;
}

export interface WorldSyncSnapshot {
  tick: number;
  dayCount: number;
  timeOfDay: number;
  weather: WeatherType;
  structures: PlacedStructure[];
  players: PlayerSyncFrame[];
}

export type WorldActionEvent =
  | { type: 'harvest_node'; playerId: string; nodeId: string; damage: number }
  | { type: 'place_structure'; playerId: string; structure: PlacedStructure }
  | { type: 'craft_item'; playerId: string; recipeId: string }
  | { type: 'inventory_sync'; playerId: string; inventory: InventorySlot[]; stats: GameStats };

export interface WorldTransportAdapter {
  readonly mode: 'singleplayer' | 'multiplayer';
  sendAction: (event: WorldActionEvent) => void;
  getRemotePlayers: () => PlayerSyncFrame[];
}

export class LocalSinglePlayerAdapter implements WorldTransportAdapter {
  public readonly mode = 'singleplayer' as const;

  public sendAction(_event: WorldActionEvent): void {
    // Local authoritative execution in Stage 1
  }

  public getRemotePlayers(): PlayerSyncFrame[] {
    return [];
  }
}
