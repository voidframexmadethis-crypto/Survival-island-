import assert from 'node:assert/strict';
import test from 'node:test';
import {
  MARKETPLACE_UPLOAD_MAX_BYTES,
  checkMarketplaceUploadFile,
  formatMarketplaceUploadSize,
} from './marketplaceUploads';

test('marketplace uploads accept phone images and self-contained 3D models', () => {
  assert.deepEqual(
    checkMarketplaceUploadFile({ name: 'skin.PNG', type: 'image/png', size: 2048 }),
    { ok: true, kind: 'image' },
  );
  assert.deepEqual(
    checkMarketplaceUploadFile({ name: 'backpack.glb', type: '', size: 4096 }),
    { ok: true, kind: 'glb' },
  );
  assert.deepEqual(
    checkMarketplaceUploadFile({ name: 'weapon.gltf', type: '', size: 4096 }),
    { ok: true, kind: 'glb' },
  );
});

test('marketplace uploads reject empty, oversized and unsupported files', () => {
  const empty = checkMarketplaceUploadFile({ name: '', type: '', size: 0 });
  assert.equal(empty.ok, false);

  const oversized = checkMarketplaceUploadFile({
    name: 'huge.glb',
    type: '',
    size: MARKETPLACE_UPLOAD_MAX_BYTES + 1,
  });
  assert.equal(oversized.ok, false);
  assert.match(oversized.ok ? '' : oversized.message, /8\.0 MB/);

  const unsupported = checkMarketplaceUploadFile({
    name: 'notes.pdf',
    type: 'application/pdf',
    size: 20,
  });
  assert.equal(unsupported.ok, false);
});

test('marketplace upload sizes are readable', () => {
  assert.equal(formatMarketplaceUploadSize(0), '0 B');
  assert.equal(formatMarketplaceUploadSize(512), '512 B');
  assert.equal(formatMarketplaceUploadSize(2048), '2.0 KB');
  assert.equal(formatMarketplaceUploadSize(2 * 1024 * 1024), '2.0 MB');
});
