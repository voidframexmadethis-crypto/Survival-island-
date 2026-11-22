import assert from 'node:assert/strict';
import test from 'node:test';
import {
  NAVIGATOR_FAREWELL_BOARD_POS,
  NavigatorCompanionController,
  type NavigatorCompanionContext,
} from './navigatorCompanionSystem';
import {
  NAVIGATOR_FAREWELL_DURATION,
  sampleNavigatorFarewell,
} from './navigatorFarewellCinematic';

function baseContext(overrides: Partial<NavigatorCompanionContext> = {}): NavigatorCompanionContext {
  return {
    dt: 1 / 60,
    elapsed: 0,
    playerX: 0,
    playerY: -0.5,
    playerZ: 748,
    activePlayerVehicleId: null,
    playerIsFlying: false,
    playerSwimming: true,
    shelterPos: { x: -50, z: 600 },
    shipwreckPos: { x: -8, z: 748 },
    getTerrainHeight: (x, z) => (z > 710 ? -4 : 1.45),
    oceanLevel: 0,
    resourceNodes: [],
    creatures: [],
    vehicles: [],
    vehicleMeshes: new Map(),
    onChopHit: () => {},
    onTreeFelled: () => {},
    onShootCreature: () => false,
    onToast: () => {},
    onSpawnParticles: () => {},
    onPlaySplash: () => {},
    ...overrides,
  };
}

test('swimming away near the wreck starts the permanent departure', () => {
  const navigator = new NavigatorCompanionController();
  navigator.resetAtSpawn(-14, 750, -4);
  const toasts: string[] = [];
  const context = baseContext({
    playerX: 0,
    playerZ: 748,
    onToast: (message) => toasts.push(message),
  });

  navigator.update(context);
  assert.equal(navigator.isCompanionActive(), true);

  const phases = new Set<string>();
  for (let i = 0; i < 60 * 12; i++) {
    navigator.update({ ...context, elapsed: i / 60 });
    phases.add(
      navigator.getHudState(0, 748, { x: -50, z: 600 }).departurePhase,
    );
  }

  assert.ok(phases.has('swim_to_wood'), 'must swim back to the wreck');
  assert.ok(phases.has('climb_wood'), 'must climb onto the driftwood');
  assert.ok(phases.has('sitting_wood'), 'must sit on the driftwood');
  assert.equal(navigator.isCompanionActive(), false);
  assert.equal(navigator.isDeparted(), true);
  assert.equal(navigator.isSittingAtWreck(), true);
  assert.ok(toasts.some((message) => message.includes('staying together')));
  assert.ok(
    Math.abs(navigator.x - NAVIGATOR_FAREWELL_BOARD_POS.x) < 0.1 &&
      Math.abs(navigator.z - NAVIGATOR_FAREWELL_BOARD_POS.z) < 0.1,
    'navigator must finish sitting on the wreck driftwood',
  );
});

test('the ferry cinematic is requested once and can be skipped permanently', () => {
  const navigator = new NavigatorCompanionController();
  navigator.restoreState({
    gender: 'girl',
    ...NAVIGATOR_FAREWELL_BOARD_POS,
    y: -0.47,
    yaw: 0,
    task: 'stay',
    departurePhase: 'sitting_wood',
    relationship: 'departed',
    cinematicSeen: false,
    droppedGunPos: null,
  });
  assert.equal(navigator.consumeFarewellCinematicRequest(), true);
  assert.equal(navigator.consumeFarewellCinematicRequest(), false);
  navigator.markFarewellCinematicSeen();
  assert.equal(navigator.consumeFarewellCinematicRequest(), false);
  assert.equal(navigator.exportState().cinematicSeen, true);
});

test('save restore keeps the navigator sitting at the wreck and never follows again', () => {
  const navigator = new NavigatorCompanionController();
  navigator.restoreState({
    gender: 'boy',
    x: NAVIGATOR_FAREWELL_BOARD_POS.x,
    y: -0.45,
    z: NAVIGATOR_FAREWELL_BOARD_POS.z,
    yaw: 0.4,
    task: 'stay',
    departurePhase: 'sitting_wood',
    relationship: 'departed',
    cinematicSeen: true,
    droppedGunPos: null,
  });
  const saved = navigator.exportState();
  const restored = new NavigatorCompanionController();
  restored.restoreState(saved);
  const startX = restored.x;
  const startZ = restored.z;
  for (let i = 0; i < 60 * 6; i++) {
    restored.update(
      baseContext({
        elapsed: i / 60,
        playerX: 120,
        playerZ: 620,
        playerSwimming: false,
      }),
    );
  }
  assert.equal(restored.isSittingAtWreck(), true);
  assert.equal(restored.isCompanionActive(), false);
  assert.ok(Math.abs(restored.x - startX) < 0.01);
  assert.ok(Math.abs(restored.z - startZ) < 0.01);
  assert.equal(restored.exportState().relationship, 'departed');
  assert.equal(restored.getDepartureBoardPosition().x, NAVIGATOR_FAREWELL_BOARD_POS.x);
});

test('farewell cinematic has a clear emotional beat and ends on the wreck', () => {
  const board = { x: 1.5, z: 752.5 };
  const opening = sampleNavigatorFarewell(0, board.x, board.z);
  const dialogue = sampleNavigatorFarewell(5, board.x, board.z);
  const ending = sampleNavigatorFarewell(NAVIGATOR_FAREWELL_DURATION, board.x, board.z);

  assert.equal(opening.finished, false);
  assert.ok(opening.subtitle.includes('drifting plank'));
  assert.equal(dialogue.speaker, 'ELENA');
  const mateo = sampleNavigatorFarewell(5, board.x, board.z, 0, 'Mateo');
  assert.equal(mateo.speaker, 'MATEO');
  assert.ok(mateo.subtitle.includes('thought we were companions'));
  assert.ok(dialogue.subtitle.includes('everything was fine'));
  assert.ok(ending.finished);
  assert.ok(opening.ferryX < dialogue.ferryX);
  for (const value of [
    dialogue.cameraX,
    dialogue.cameraY,
    dialogue.cameraZ,
    dialogue.lookX,
    dialogue.lookY,
    dialogue.lookZ,
    ending.ferryX,
  ]) {
    assert.ok(Number.isFinite(value));
  }
});
