const KEY = 'survival_island_launch';

export interface SavedCheckpoint {
  x: number;
  y: number;
  z: number;
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

export { KEY };

export const saveGame = (data: object): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Ignore storage quota / privacy errors
  }
};

export const loadGame = <T = Record<string, unknown>>(): T | null => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    return JSON.parse(storage.getItem(KEY) || 'null') as T | null;
  } catch {
    return null;
  }
};

export const saveCheckpoint = (x: number, y: number, z: number): void => {
  if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) return;
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(`${KEY}_checkpoint`, JSON.stringify({ x, y, z }));
  } catch {
    // Ignore storage quota / privacy errors
  }
};

export const loadCheckpoint = (): SavedCheckpoint | null => {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const parsed = JSON.parse(
      storage.getItem(`${KEY}_checkpoint`) || 'null',
    ) as Partial<SavedCheckpoint> | null;
    if (
      parsed &&
      typeof parsed.x === 'number' &&
      Number.isFinite(parsed.x) &&
      typeof parsed.y === 'number' &&
      Number.isFinite(parsed.y) &&
      typeof parsed.z === 'number' &&
      Number.isFinite(parsed.z)
    ) {
      return { x: parsed.x, y: parsed.y, z: parsed.z };
    }
    return null;
  } catch {
    return null;
  }
};

export const saveSettings = (settings: object): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(`${KEY}_settings`, JSON.stringify(settings));
  } catch {
    // Ignore storage quota / privacy errors
  }
};

export const loadSettings = <T = Record<string, unknown>>(): T => {
  const storage = getStorage();
  if (!storage) return {} as T;
  try {
    const parsed = JSON.parse(storage.getItem(`${KEY}_settings`) || '{}');
    return (parsed && typeof parsed === 'object' ? parsed : {}) as T;
  } catch {
    return {} as T;
  }
};

export const saveObjectives = (objectives: string[]): void => {
  const storage = getStorage();
  if (!storage) return;
  try {
    const normalized = Array.isArray(objectives)
      ? Array.from(new Set(objectives.filter((o): o is string => typeof o === 'string')))
      : [];
    storage.setItem(`${KEY}_objectives`, JSON.stringify(normalized));
  } catch {
    // Ignore storage quota / privacy errors
  }
};

export const loadObjectives = (): string[] => {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(`${KEY}_objectives`) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((o): o is string => typeof o === 'string')
      : [];
  } catch {
    return [];
  }
};

export const loadRewards = (): string[] => {
  const storage = getStorage();
  if (!storage) return [];
  try {
    const parsed = JSON.parse(storage.getItem(`${KEY}_rewards`) || '[]');
    return Array.isArray(parsed)
      ? parsed.filter((r): r is string => typeof r === 'string')
      : [];
  } catch {
    return [];
  }
};

export const unlockReward = (reward: string): string[] => {
  const rewards = loadRewards();
  if (typeof reward === 'string' && reward.trim() && !rewards.includes(reward)) {
    rewards.push(reward);
  }
  const storage = getStorage();
  if (storage) {
    try {
      storage.setItem(`${KEY}_rewards`, JSON.stringify(rewards));
    } catch {
      // Ignore storage quota / privacy errors
    }
  }
  return rewards;
};
