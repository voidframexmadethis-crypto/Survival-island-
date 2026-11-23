import type { AirShuttleSaveState } from './crescentCityAirShuttle';

const AIR_SHUTTLE_KEY = 'survival_island_crescent_clipper_v1';

interface StoredAirShuttle {
  slotId: string;
  state: AirShuttleSaveState;
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) {
    return window.localStorage;
  }
  if (
    typeof globalThis !== 'undefined' &&
    'localStorage' in globalThis &&
    globalThis.localStorage
  ) {
    return globalThis.localStorage;
  }
  return null;
}

function isValidState(raw: unknown): raw is AirShuttleSaveState {
  if (!raw || typeof raw !== 'object') return false;
  const state = raw as Partial<AirShuttleSaveState>;
  return (
    state.version === 1 &&
    (state.direction === 'outbound' || state.direction === 'return') &&
    (state.phase === 'airborne' || state.phase === 'parked') &&
    (state.departureAtMs === null || typeof state.departureAtMs === 'number') &&
    typeof state.elapsedMs === 'number' &&
    Number.isFinite(state.elapsedMs)
  );
}

export function saveAirShuttleState(
  state: AirShuttleSaveState,
  slotId = '',
  storage: Storage | null = getStorage(),
): boolean {
  if (!storage) return false;
  try {
    const payload: StoredAirShuttle = { slotId, state };
    storage.setItem(AIR_SHUTTLE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadAirShuttleState(
  slotId = '',
  storage: Storage | null = getStorage(),
): AirShuttleSaveState | null {
  if (!storage) return null;
  try {
    const stored = storage.getItem(AIR_SHUTTLE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored) as StoredAirShuttle | null;
    if (!parsed || !isValidState(parsed.state)) return null;
    if (parsed.slotId && slotId && parsed.slotId !== slotId) return null;
    return parsed.state;
  } catch {
    return null;
  }
}

export function clearAirShuttleState(storage: Storage | null = getStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(AIR_SHUTTLE_KEY);
  } catch {
    // Ignore storage quota / privacy errors
  }
}

export { AIR_SHUTTLE_KEY };
