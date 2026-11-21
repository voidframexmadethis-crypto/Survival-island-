import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ManagedWorldObject,
  WorldPerformanceManager,
} from './worldPerformanceManager';

test('WorldPerformanceManager enforces 450m load, 600m unload hysteresis, and 250ms throttle', () => {
  const mgr = new WorldPerformanceManager();
  assert.equal(mgr.LOAD_DISTANCE, 450);
  assert.equal(mgr.UNLOAD_DISTANCE, 600);
  assert.equal(mgr.UPDATE_INTERVAL, 250);

  let loads = 0;
  let unloads = 0;
  const obj: ManagedWorldObject = {
    id: 'chunk_1',
    x: 400,
    z: 0,
    loaded: false,
    load: () => {
      loads++;
    },
    unload: () => {
      unloads++;
    },
  };
  mgr.register(obj);

  // Throttled when now < UPDATE_INTERVAL if lastUpdate is 0 -> wait, first update at now=300 runs
  mgr.update(0, 0, 100);
  assert.equal(obj.loaded, false);
  assert.equal(loads, 0);

  // At t=300: distance = 400 < 450 -> loads
  mgr.update(0, 0, 300);
  assert.equal(obj.loaded, true);
  assert.equal(loads, 1);

  // Move to playerX = -150 -> distance = 550 (between 450 and 600 hysteresis band) -> stays loaded
  mgr.update(-150, 0, 600);
  assert.equal(obj.loaded, true);
  assert.equal(unloads, 0);

  // Throttled if within 250ms of 600
  mgr.update(-300, 0, 700);
  assert.equal(obj.loaded, true);
  assert.equal(unloads, 0);

  // Move to playerX = -250 -> distance = 650 > 600 at t=900 -> unloads
  mgr.update(-250, 0, 900);
  assert.equal(obj.loaded, false);
  assert.equal(unloads, 1);

  mgr.dispose();
});

test('WorldPerformanceManager budgets 25 objects per update and unloads safely on unregister/dispose', () => {
  const mgr = new WorldPerformanceManager();
  const created: ManagedWorldObject[] = [];

  for (let i = 0; i < 60; i++) {
    const item: ManagedWorldObject = {
      id: `obj_${i}`,
      x: 10,
      z: 10,
      loaded: false,
      load: () => {},
      unload: () => {},
    };
    created.push(item);
    mgr.register(item);
  }

  // First update processes 25 objects
  mgr.update(0, 0, 300);
  assert.equal(mgr.getStats().loaded, 25);

  // Second update processes next 25 objects
  mgr.update(0, 0, 600);
  assert.equal(mgr.getStats().loaded, 50);

  // Third update processes remaining 10 (+ wrap-around) -> all 60 loaded
  mgr.update(0, 0, 900);
  assert.equal(mgr.getStats().loaded, 60);

  // unregister unloads loaded object
  let unregisteredUnloaded = false;
  mgr.register({
    id: 'extra',
    x: 0,
    z: 0,
    loaded: true,
    load: () => {},
    unload: () => {
      unregisteredUnloaded = true;
    },
  });
  mgr.unregister('extra');
  assert.equal(unregisteredUnloaded, true);

  // dispose unloads remaining loaded objects and clears map
  let disposedUnload = false;
  mgr.register({
    id: 'extra2',
    x: 0,
    z: 0,
    loaded: true,
    load: () => {},
    unload: () => {
      disposedUnload = true;
    },
  });
  mgr.dispose();
  assert.equal(disposedUnload, true);
  assert.equal(mgr.getStats().total, 0);
});
