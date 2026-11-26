import { isNativeMobileApp } from './apiConfig';

export const SAVE_TRANSFER_FORMAT = 'survival-island-save-transfer-v1';
export const SAVE_TRANSFER_VERSION = 1;
export const SAVE_TRANSFER_MAX_BYTES = 32 * 1024 * 1024;

const SAVE_KEY_PREFIX = 'survival_island_';
const EXTRA_SAVE_KEYS = new Set(['si_ultimate_park_delivery_v1']);
const EXCLUDED_SAVE_KEYS = new Set([
  // Authentication sessions must never travel in a save backup.
  'survival_island_session_token_v1',
  // This cache belongs to a server account, not to a world save.
  'survival_island_exchange_equipped_cache_v3',
]);

export interface SaveTransferArchive {
  format: typeof SAVE_TRANSFER_FORMAT;
  version: typeof SAVE_TRANSFER_VERSION;
  exportedAt: number;
  keys: Record<string, string>;
}

export interface SaveTransferResult {
  ok: boolean;
  message: string;
  importedKeys?: number;
}

function getStorage(): Storage | null {
  if (typeof window !== 'undefined' && window.localStorage) return window.localStorage;
  if (
    typeof globalThis !== 'undefined' &&
    'localStorage' in globalThis &&
    globalThis.localStorage
  ) {
    return globalThis.localStorage;
  }
  return null;
}

function isAllowedSaveKey(key: string): boolean {
  if (EXCLUDED_SAVE_KEYS.has(key)) return false;
  if (EXTRA_SAVE_KEYS.has(key)) return true;
  return key.startsWith(SAVE_KEY_PREFIX);
}

export function createSaveTransferArchive(
  storage: Storage | null = getStorage(),
): SaveTransferArchive {
  const keys: Record<string, string> = {};
  if (storage) {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (!key || !isAllowedSaveKey(key)) continue;
      const value = storage.getItem(key);
      if (value !== null) keys[key] = value;
    }
  }
  return {
    format: SAVE_TRANSFER_FORMAT,
    version: SAVE_TRANSFER_VERSION,
    exportedAt: Date.now(),
    keys,
  };
}

export function serializeSaveTransferArchive(
  storage: Storage | null = getStorage(),
): string {
  return JSON.stringify(createSaveTransferArchive(storage), null, 2);
}

export function parseSaveTransferArchive(raw: string): SaveTransferArchive | null {
  if (raw.length > SAVE_TRANSFER_MAX_BYTES) return null;
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
  const archive = parsed as Partial<SaveTransferArchive>;
  if (archive.format !== SAVE_TRANSFER_FORMAT) return null;
  if (archive.version !== SAVE_TRANSFER_VERSION) return null;
  if (!archive.keys || typeof archive.keys !== 'object' || Array.isArray(archive.keys)) {
    return null;
  }

  const keys: Record<string, string> = {};
  for (const [key, value] of Object.entries(archive.keys)) {
    if (!isAllowedSaveKey(key) || typeof value !== 'string') continue;
    if (value.length > SAVE_TRANSFER_MAX_BYTES) return null;
    keys[key] = value;
  }
  if (Object.keys(keys).length === 0) return null;

  return {
    format: SAVE_TRANSFER_FORMAT,
    version: SAVE_TRANSFER_VERSION,
    exportedAt:
      typeof archive.exportedAt === 'number' && Number.isFinite(archive.exportedAt)
        ? archive.exportedAt
        : Date.now(),
    keys,
  };
}

export function applySaveTransferArchive(
  archive: SaveTransferArchive,
  storage: Storage | null = getStorage(),
): SaveTransferResult {
  if (!storage) {
    return { ok: false, message: 'Save storage is not available on this device.' };
  }

  let importedKeys = 0;
  try {
    for (const [key, value] of Object.entries(archive.keys)) {
      if (!isAllowedSaveKey(key) || typeof value !== 'string') continue;
      storage.setItem(key, value);
      importedKeys += 1;
    }
  } catch {
    return {
      ok: false,
      message:
        'The device could not store the backup. Free some browser storage and try again.',
    };
  }

  if (importedKeys === 0) {
    return { ok: false, message: 'The backup did not contain any Survival Island saves.' };
  }

  return {
    ok: true,
    message: `Restored ${importedKeys} save record${importedKeys === 1 ? '' : 's'}. Reloading…`,
    importedKeys,
  };
}

export async function importSaveTransferFile(
  file: File,
  storage: Storage | null = getStorage(),
): Promise<SaveTransferResult> {
  if (file.size > SAVE_TRANSFER_MAX_BYTES) {
    return { ok: false, message: 'That backup is larger than 32 MB.' };
  }

  let raw: string;
  try {
    raw = await file.text();
  } catch {
    return { ok: false, message: 'Could not read the backup file.' };
  }

  const archive = parseSaveTransferArchive(raw);
  if (!archive) {
    return {
      ok: false,
      message: 'That is not a valid Survival Island save backup.',
    };
  }
  return applySaveTransferArchive(archive, storage);
}

function backupFileName(): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `survival-island-backup-${stamp}.json`;
}

export async function exportSaveTransfer(): Promise<SaveTransferResult> {
  const fileName = backupFileName();
  let json: string;
  try {
    json = serializeSaveTransferArchive();
  } catch {
    return { ok: false, message: 'Could not build the save backup.' };
  }

  if (isNativeMobileApp()) {
    try {
      const [{ Filesystem, Directory, Encoding }, { Share }] = await Promise.all([
        import('@capacitor/filesystem'),
        import('@capacitor/share'),
      ]);
      const written = await Filesystem.writeFile({
        path: fileName,
        data: json,
        directory: Directory.Cache,
        encoding: Encoding.UTF8,
      });
      await Share.share({
        title: 'Survival Island save backup',
        text: 'Backup of Survival Island worlds and settings.',
        url: written.uri,
        dialogTitle: 'Save or share backup',
      });
      return { ok: true, message: 'Backup ready to save or share.' };
    } catch {
      return {
        ok: false,
        message: 'Could not open the native share sheet. Try again from a device with storage access.',
      };
    }
  }

  if (typeof document === 'undefined') {
    return { ok: false, message: 'Downloads are not available in this environment.' };
  }

  try {
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 30_000);
    return { ok: true, message: 'Backup downloaded.' };
  } catch {
    return { ok: false, message: 'Could not download the backup.' };
  }
}
