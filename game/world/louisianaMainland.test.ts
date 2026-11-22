import test from 'node:test';
import assert from 'node:assert/strict';
import { buildLouisianaMainland } from './louisianaMainland';

test('Crescent City builds a populated mainland district with ramps and collision', () => {
  const main = buildLouisianaMainland();

  assert.ok(main.group.children.length > 20);
  assert.ok(main.colliders.length >= 20);
  assert.equal(main.stuntRamps.length, 2);
  assert.ok(main.terminalPos.x > 0);
  assert.ok(main.terminalPos.z > main.garagePos.z);
  assert.ok(Number.isFinite(main.safehousePos.y));
  assert.ok(Number.isFinite(main.docksPos.y));
  assert.ok(Number.isFinite(main.vaultPos.y));

  main.group.traverse((obj) => {
    assert.ok(Number.isFinite(obj.position.x));
    assert.ok(Number.isFinite(obj.position.y));
    assert.ok(Number.isFinite(obj.position.z));
  });
});
