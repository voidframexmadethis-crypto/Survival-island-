import type { LouisianaFerrySaveState } from './louisianaFerryVoyage';

const FERRY_VOYAGE_KEY = 'survival_island_crescent_star_voyage_v3';
/** Nine-hour voyages written by the previous build; still resumes on the clock. */
const LEGACY_FERRY_VOYAGE_KEY = 'survival_island_crescent_star_voyage_v2';

interface StoredFerryVoyage {
  slotId: string;
  state: LouisianaFerrySaveState;
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

function isValidState(raw: unknown): raw is LouisianaFerrySaveState {
  if (!raw || typeof raw !== 'object') return false;
  const state = raw as Partial<LouisianaFerrySaveState>;
  return (
    (state.version === 2 || state.version === 3) &&
    (state.direction === 'outbound' || state.direction === 'return') &&
    typeof state.phase === 'string' &&
    (state.departureAtMs === null || typeof state.departureAtMs === 'number') &&
    typeof state.elapsedMs === 'number' &&
    Number.isFinite(state.elapsedMs) &&
    typeof state.routeProgress === 'number' &&
    Number.isFinite(state.routeProgress)
  );
}

export function saveFerryVoyageState(
  state: LouisianaFerrySaveState,
  slotId = '',
  storage: Storage | null = getStorage(),
): boolean {
  if (!storage) return false;
  try {
    const payload: StoredFerryVoyage = { slotId, state };
    storage.setItem(FERRY_VOYAGE_KEY, JSON.stringify(payload));
    storage.removeItem(LEGACY_FERRY_VOYAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function loadFerryVoyageState(
  slotId = '',
  storage: Storage | null = getStorage(),
): LouisianaFerrySaveState | null {
  if (!storage) return null;
  try {
    const stored = storage.getItem(FERRY_VOYAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as StoredFerryVoyage | null;
      if (!parsed || !isValidState(parsed.state)) return null;
      // Only resume a voyage that belongs to the slot being loaded.
      if (parsed.slotId && slotId && parsed.slotId !== slotId) return null;
      return parsed.state;
    }
    const legacyRaw = storage.getItem(LEGACY_FERRY_VOYAGE_KEY);
    if (!legacyRaw) return null;
    const legacy = JSON.parse(legacyRaw) as StoredFerryVoyage | null;
    if (!legacy || !isValidState(legacy.state)) return null;
    if (legacy.slotId && slotId && legacy.slotId !== slotId) return null;
    return legacy.state;
  } catch {
    return null;
  }
}

export function clearFerryVoyageState(
  storage: Storage | null = getStorage(),
): void {
  if (!storage) return;
  try {
    storage.removeItem(FERRY_VOYAGE_KEY);
    storage.removeItem(LEGACY_FERRY_VOYAGE_KEY);
  } catch {
    // Ignore storage quota / privacy errors
  }
}

export { FERRY_VOYAGE_KEY, LEGACY_FERRY_VOYAGE_KEY };
