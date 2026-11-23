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

  // Ambient street life: walking pedestrians, parked hydraulic dancers and
  // boulevard traffic that the engine rolls every frame.
  assert.ok(main.streetWalkers.length >= 8);
  assert.equal(main.streetDancers.length, 3);
  for (const walker of main.streetWalkers) {
    const info = walker.userData.walk as { range: number; speed: number } | undefined;
    assert.ok(info && info.range > 0 && info.speed > 0, 'walker needs a route');
    walker.traverse((object) => {
      if (object !== walker) assert.equal(object.userData.noStaticMerge, true);
    });
  }
  for (const dancer of main.streetDancers) {
    const info = dancer.userData.hydraulics as
      | { body: { userData: { dynamic?: boolean } }; speed: number }
      | undefined;
    assert.ok(info, 'dancer needs hydraulic data');
    assert.equal(info?.body.userData.dynamic, true);
    assert.ok((info?.speed ?? 0) > 0);
  }
  assert.ok(main.trafficCars.lanes.length >= 8);
  assert.equal(main.trafficCars.bodies.count, 28);
  assert.ok(Number.isFinite(main.streetLifeCenter.x));
  assert.ok(Number.isFinite(main.streetLifeCenter.z));

  main.group.traverse((obj) => {
    assert.ok(Number.isFinite(obj.position.x));
    assert.ok(Number.isFinite(obj.position.y));
    assert.ok(Number.isFinite(obj.position.z));
  });
});
