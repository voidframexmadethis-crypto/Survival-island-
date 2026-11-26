import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  SAVE_TRANSFER_FORMAT,
  applySaveTransferArchive,
  createSaveTransferArchive,
  importSaveTransferFile,
  parseSaveTransferArchive,
  serializeSaveTransferArchive,
  type SaveTransferArchive,
} from './saveTransfer';

class MemoryStorage implements Storage {
  private values = new Map<string, string>();

  get length(): number {
    return this.values.size;
  }

  clear(): void {
    this.values.clear();
  }

  getItem(key: string): string | null {
    return this.values.get(key) ?? null;
  }

  key(index: number): string | null {
    return Array.from(this.values.keys())[index] ?? null;
  }

  removeItem(key: string): void {
    this.values.delete(key);
  }

  setItem(key: string, value: string): void {
    this.values.set(key, value);
  }
}

function seededStorage(): MemoryStorage {
  const storage = new MemoryStorage();
  storage.setItem('survival_island_lost_world_saves_v1', '[{"slotId":"slot_a"}]');
  storage.setItem('survival_island_slot_v1_slot_a', '{"version":1}');
  storage.setItem('survival_island_settings_v1', '{"quality":"high"}');
  storage.setItem('survival_island_session_token_v1', 'do-not-export');
  storage.setItem('survival_island_exchange_equipped_cache_v3', '{"owned":[]}');
  storage.setItem('si_ultimate_park_delivery_v1', '{"park":true}');
  storage.setItem('unrelated_key', 'ignore-me');
  return storage;
}

describe('save transfer', () => {
  test('exports save keys without auth tokens or account cache', () => {
    const archive = createSaveTransferArchive(seededStorage());
    assert.equal(archive.format, SAVE_TRANSFER_FORMAT);
    assert.match(archive.keys['survival_island_lost_world_saves_v1'], /slot_a/);
    assert.equal(archive.keys['survival_island_slot_v1_slot_a'], '{"version":1}');
    assert.equal(archive.keys['survival_island_settings_v1'], '{"quality":"high"}');
    assert.equal(archive.keys['si_ultimate_park_delivery_v1'], '{"park":true}');
    assert.equal(archive.keys['survival_island_session_token_v1'], undefined);
    assert.equal(archive.keys['survival_island_exchange_equipped_cache_v3'], undefined);
    assert.equal(archive.keys.unrelated_key, undefined);
  });

  test('round-trips a backup into a new device store', () => {
    const archive = createSaveTransferArchive(seededStorage());
    const target = new MemoryStorage();
    const result = applySaveTransferArchive(archive, target);

    assert.equal(result.ok, true);
    assert.equal(result.importedKeys, 4);
    assert.equal(target.getItem('survival_island_slot_v1_slot_a'), '{"version":1}');
    assert.equal(target.getItem('survival_island_session_token_v1'), null);
  });

  test('imports a JSON file through the restore path', async () => {
    const target = new MemoryStorage();
    const serialized = serializeSaveTransferArchive(seededStorage());
    const file = new File([serialized], 'survival-island-backup.json', {
      type: 'application/json',
    });
    const result = await importSaveTransferFile(file, target);

    assert.equal(result.ok, true);
    assert.equal(target.getItem('survival_island_settings_v1'), '{"quality":"high"}');
    assert.equal(target.getItem('survival_island_session_token_v1'), null);
  });

  test('parses serialized archives and rejects unknown formats', () => {
    const archive = createSaveTransferArchive(seededStorage());
    const parsed = parseSaveTransferArchive(serializeSaveTransferArchive(seededStorage()));
    assert.equal(parsed?.keys['survival_island_settings_v1'], '{"quality":"high"}');

    const invalid = parseSaveTransferArchive(
      JSON.stringify({ ...archive, format: 'other-game' } as unknown as SaveTransferArchive),
    );
    assert.equal(invalid, null);
  });
});
