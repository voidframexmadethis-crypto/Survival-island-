import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  WATERPARK_DECK_Y,
  WATERPARK_LAUNCH,
  WATERPARK_SITE,
  WATERPARK_SLIDES,
  WATERPARK_TOWERS,
  WATERPARK_TOWER_STAIR,
  getWaterparkSlideAccess,
  getWaterparkSlideExitPoint,
  getWaterparkSurfaceY,
  getWaterparkTowerStairTurns,
  getWaterparkTowerStairY,
} from '../world/waterparkLayout';
import { buildWaterparkModel } from '../world/waterparkModels';
import { WaterparkRuntime } from './waterparkRuntime';

function assertClose(actual: number, expected: number, epsilon: number, label: string) {
  assert.ok(
    Math.abs(actual - expected) <= epsilon,
    `${label}: expected ${actual} within ${epsilon} of ${expected}`,
  );
}

test('stair treads are supported across their full visible width, not just the centreline', () => {
  for (const tower of WATERPARK_TOWERS) {
    const turns = getWaterparkTowerStairTurns(tower.height);
    for (const t of [0.12, 0.37, 0.62, 0.87]) {
      const angle = t * turns * Math.PI * 2;
      const treadY = getWaterparkTowerStairY(tower.height, t);
      for (const radialOffset of [-0.66, -0.33, 0, 0.33, 0.66]) {
        const radius = WATERPARK_TOWER_STAIR.radius + radialOffset;
        const wx = WATERPARK_SITE.x + tower.x + Math.cos(angle) * radius;
        const wz = WATERPARK_SITE.z + tower.z + Math.sin(angle) * radius;
        const surface = getWaterparkSurfaceY(wx, wz, treadY + 0.02, treadY + 0.02);
        assert.ok(
          surface >= treadY - 0.02,
          `${tower.id} t=${t.toFixed(2)} r=${radialOffset.toFixed(2)} fell through a tread`,
        );
        assert.ok(
          surface <= treadY + 0.66,
          `${tower.id} t=${t.toFixed(2)} r=${radialOffset.toFixed(2)} stepped onto the wrong flight`,
        );
      }
    }
  }
});

test('every widened landing supports its full tread and both radial wings', () => {
  for (const tower of WATERPARK_TOWERS) {
    for (const landingT of [0.25, 0.5, 0.75]) {
      const angle = landingT * getWaterparkTowerStairTurns(tower.height) * Math.PI * 2;
      const landingY = getWaterparkTowerStairY(tower.height, landingT);
      const cx = WATERPARK_SITE.x + tower.x + Math.cos(angle) * WATERPARK_TOWER_STAIR.radius;
      const cz = WATERPARK_SITE.z + tower.z + Math.sin(angle) * WATERPARK_TOWER_STAIR.radius;
      const radialX = Math.cos(angle);
      const radialZ = Math.sin(angle);
      const tangentX = -Math.sin(angle);
      const tangentZ = Math.cos(angle);
      for (const radial of [-1.05, -0.55, 0, 0.55, 1.05]) {
        for (const tangent of [-0.42, 0, 0.42]) {
          const x = cx + radialX * radial + tangentX * tangent;
          const z = cz + radialZ * radial + tangentZ * tangent;
          const surface = getWaterparkSurfaceY(x, z, landingY + 0.02, landingY + 0.02);
          assertClose(
            surface,
            landingY,
            0.03,
            `${tower.id} landing ${landingT} at r=${radial} t=${tangent}`,
          );
        }
      }
    }
  }
});

test('walking the bare stair centreline reaches every summit without a hole or oversized step', () => {
  for (const tower of WATERPARK_TOWERS) {
    const turns = getWaterparkTowerStairTurns(tower.height);
    const samples = turns * 180;
    let footY = WATERPARK_DECK_Y;
    for (let i = 0; i <= samples; i++) {
      const t = i / samples;
      const angle = t * turns * Math.PI * 2;
      const wx = WATERPARK_SITE.x + tower.x + Math.cos(angle) * WATERPARK_TOWER_STAIR.radius;
      const wz = WATERPARK_SITE.z + tower.z + Math.sin(angle) * WATERPARK_TOWER_STAIR.radius;
      const surface = getWaterparkSurfaceY(wx, wz, footY + 0.01, footY + 0.01);
      assert.ok(
        surface >= footY - 0.55,
        `${tower.id} staircase dropped ${(footY - surface).toFixed(2)} m at t=${t.toFixed(3)}`,
      );
      assert.ok(
        surface - footY <= 0.66,
        `${tower.id} staircase had a ${(surface - footY).toFixed(2)} m step at t=${t.toFixed(3)}`,
      );
      footY = surface;
    }
    const summitY =
      WATERPARK_DECK_Y + tower.height + WATERPARK_TOWER_STAIR.landingRise;
    assertClose(footY, summitY, 0.03, `${tower.id} summit`);
  }
});

test('launch decks and the full catwalk width are walkable for all 28 slide mouths', () => {
  for (const slide of WATERPARK_SLIDES) {
    const access = getWaterparkSlideAccess(slide);
    for (const ox of [-1.78, 0, 1.78]) {
      for (const oz of [-1.78, 0, 1.78]) {
        const x = WATERPARK_SITE.x + access.startX + ox;
        const z = WATERPARK_SITE.z + access.startZ + oz;
        const surface = getWaterparkSurfaceY(x, z, access.startY + 0.02, access.startY + 0.02);
        assertClose(
          surface,
          access.startY,
          0.4,
          `${slide.id} launch deck corner ${ox}/${oz}`,
        );
      }
    }
    for (let i = 1; i < access.catwalk.length; i++) {
      const a = access.catwalk[i - 1];
      const b = access.catwalk[i];
      const sx = b.x - a.x;
      const sz = b.z - a.z;
      const length = Math.hypot(sx, sz);
      if (length < 0.5) continue;
      const nx = -sz / length;
      const nz = sx / length;
      for (const side of [-1, 1]) {
        const x =
          WATERPARK_SITE.x +
          (a.x + b.x) * 0.5 +
          nx * side * (WATERPARK_LAUNCH.catwalkWalkHalfWidth - 0.04);
        const z =
          WATERPARK_SITE.z +
          (a.z + b.z) * 0.5 +
          nz * side * (WATERPARK_LAUNCH.catwalkWalkHalfWidth - 0.04);
        const surface = getWaterparkSurfaceY(x, z, access.startY + 0.02, access.startY + 0.02);
        assertClose(surface, access.startY, 0.4, `${slide.id} catwalk edge ${i}/${side}`);
      }
    }
  }
});

test('splashdown exits are traversed continuously instead of teleporting the player', () => {
  const runtime = new WaterparkRuntime(new THREE.Scene());
  const handles = (
    runtime as unknown as {
      handles: { slides: Array<{ spec: { id: string }; vehicle: THREE.Group }> };
    }
  ).handles;
  for (const slide of WATERPARK_SLIDES) {
    runtime.cancelPhysicalSlide();
    (runtime as unknown as { physicalCooldown: number }).physicalCooldown = 0;
    const access = getWaterparkSlideAccess(slide);
    const entry = runtime.getPhysicalSlideEntry(slide.id)!;
    let snapshot = runtime.tryEnterPhysicalSlide(
      entry.x,
      access.startY + 0.1,
      entry.z,
      3.2,
    );
    assert.ok(snapshot, `${slide.id} did not engage`);
    let previous = snapshot;
    let splashFrames = 0;
    let sawSplash = false;
    let maxPitch = 0;
    let steps = 0;
    while (!snapshot.finished && steps < 6000) {
      snapshot = runtime.stepPhysicalSlide(1 / 60)!;
      assert.ok(snapshot, `${slide.id} lost its collision path`);
      const travel = Math.hypot(
        snapshot.x - previous.x,
        snapshot.y - previous.y,
        snapshot.z - previous.z,
      );
      assert.ok(
        travel <= Math.max(0.8, previous.speed / 60 + 0.5),
        `${slide.id} jumped ${travel.toFixed(2)} m in one frame`,
      );
      assert.ok(
        snapshot.y >= WATERPARK_DECK_Y - 0.8,
        `${slide.id} fell below the splash basin floor`,
      );
      if (snapshot.progressPercent >= 99.99) {
        sawSplash = true;
        splashFrames += 1;
      }
      maxPitch = Math.max(maxPitch, Math.abs(snapshot.pitch));
      previous = snapshot;
      steps += 1;
    }
    assert.ok(snapshot.finished, `${slide.id} did not finish`);
    assert.ok(sawSplash, `${slide.id} never reported splashdown`);
    assert.ok(
      splashFrames >= 12,
      `${slide.id} teleported to the exit in ${splashFrames} frames`,
    );
    assert.equal(snapshot.speed, 0, `${slide.id} exited at speed`);
    const safeExit = getWaterparkSlideExitPoint(slide);
    assertClose(snapshot.x, WATERPARK_SITE.x + safeExit.x, 0.001, `${slide.id} exit x`);
    assertClose(snapshot.z, WATERPARK_SITE.z + safeExit.z, 0.001, `${slide.id} exit z`);
    if (slide.id === 'mississippi_monster') {
      assert.ok(maxPitch > 0.3, 'steep slide did not pitch the raft downward');
    }
    const handle = handles.slides.find((slideHandle) => slideHandle.spec.id === slide.id)!;
    assert.equal(handle.vehicle.visible, false, `${slide.id} vehicle did not park`);
  }
  runtime.dispose();
});

test('ride vehicles follow the flume pitch and bank', () => {
  const runtime = new WaterparkRuntime(new THREE.Scene());
  const handles = (
    runtime as unknown as {
      handles: { slides: Array<{ spec: { id: string }; vehicle: THREE.Group }> };
    }
  ).handles;
  const slide = WATERPARK_SLIDES.find((entry) => entry.id === 'mississippi_monster')!;
  const access = getWaterparkSlideAccess(slide);
  const entry = runtime.getPhysicalSlideEntry(slide.id)!;
  let snapshot = runtime.tryEnterPhysicalSlide(entry.x, access.startY + 0.1, entry.z, 5)!;
  const vehicle = handles.slides.find((handle) => handle.spec.id === slide.id)!.vehicle;
  for (let i = 0; i < 90; i++) {
    snapshot = runtime.stepPhysicalSlide(1 / 60)!;
    assertClose(
      vehicle.rotation.x,
      snapshot.pitch,
      1e-9,
      `vehicle pitch frame ${i}`,
    );
    assertClose(vehicle.rotation.z, snapshot.bank, 1e-9, `vehicle bank frame ${i}`);
  }
  assert.ok(Math.abs(snapshot.pitch) > 0.05, 'vehicle stayed flat on a pitched flume');
  runtime.cancelPhysicalSlide();
  runtime.dispose();
});

test('graphics detail scales water/effects without changing collision surfaces', () => {
  const runtime = new WaterparkRuntime(new THREE.Scene());
  const internals = runtime as unknown as {
    handles: {
      waterMaterial: THREE.MeshStandardMaterial;
      innerTubes: Array<{ mesh: THREE.Group }>;
    };
    particleMaterial: THREE.PointsMaterial;
    ambientLights: THREE.Light[];
  };
  const samplePoints = [
    [WATERPARK_SITE.x + 8, WATERPARK_SITE.z + 6],
    [WATERPARK_SITE.x - 22, WATERPARK_SITE.z + 17],
    [WATERPARK_SITE.x + 34, WATERPARK_SITE.z - 8],
  ] as const;
  const surfacesBefore = samplePoints.map(([x, z]) =>
    getWaterparkSurfaceY(x, z, WATERPARK_DECK_Y + 0.1, WATERPARK_DECK_Y + 0.1),
  );
  runtime.setDetailLevel(1, 1);
  const normalBefore = internals.handles.waterMaterial.normalScale.x;
  const tubesBefore = internals.handles.innerTubes.filter((tube) => tube.mesh.visible).length;
  const lightsBefore = internals.ambientLights.filter((light) => light.visible).length;

  runtime.setDetailLevel(0.2, 0.25);
  const surfacesAfter = samplePoints.map(([x, z]) =>
    getWaterparkSurfaceY(x, z, WATERPARK_DECK_Y + 0.1, WATERPARK_DECK_Y + 0.1),
  );
  assert.deepEqual(surfacesAfter, surfacesBefore, 'graphics preset changed collision');
  assert.ok(
    internals.handles.waterMaterial.normalScale.x < normalBefore,
    'low detail kept the full water normal detail',
  );
  assert.ok(
    internals.handles.innerTubes.filter((tube) => tube.mesh.visible).length < tubesBefore,
    'low detail kept every lazy-river tube active',
  );
  assert.ok(
    internals.ambientLights.filter((light) => light.visible).length < lightsBefore,
    'low detail kept every waterpark point light active',
  );
  assert.ok(internals.particleMaterial.opacity < 0.9, 'low detail kept full particle opacity');
  runtime.dispose();
});

test('waterpark model still builds the same 28 slide identities after the repairs', () => {
  const model = buildWaterparkModel();
  assert.equal(model.slides.length, 28);
  assert.deepEqual(
    new Set(model.slides.map((slide) => slide.spec.id)),
    new Set(WATERPARK_SLIDES.map((slide) => slide.id)),
  );
  assert.equal(model.waterMaterial.name, 'waterpark-water');
  for (const slide of model.slides) {
    assert.ok(slide.vehicle, `${slide.spec.id} lost its vehicle`);
    assert.equal(slide.vehicle.visible, false);
  }
  model.dispose();
});
