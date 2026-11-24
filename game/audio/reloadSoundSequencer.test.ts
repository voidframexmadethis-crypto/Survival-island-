import assert from 'node:assert/strict';
import test from 'node:test';
import {
  ReloadSoundSequencer,
  getReloadFinishStages,
  getReloadTimeline,
  weaponReloadMechanism,
} from './reloadSoundSequencer';

test('every firearm maps to a physical reload mechanism', () => {
  const expected: Record<string, string> = {
    gun: 'pistol',
    glock_19: 'pistol',
    colt_m1911: 'pistol',
    desert_eagle: 'pistol',
    magnum_44: 'revolver',
    pirate_musket: 'musket',
    remington_870: 'shotgun_tube',
    mossberg_590: 'shotgun_tube',
    sawed_off: 'shotgun_break',
    mp5: 'smg',
    uzi: 'smg',
    vector: 'smg',
    ak_47: 'rifle',
    m4a1: 'rifle',
    scar_h: 'rifle',
    fn_fal: 'rifle',
    barrett_50: 'bolt',
    remington_700: 'bolt',
    m249_saw: 'belt',
    alien_plasma_gun: 'plasma',
  };
  for (const [weaponId, mechanism] of Object.entries(expected)) {
    assert.equal(weaponReloadMechanism(weaponId), mechanism, weaponId);
  }
  // The old-school guns are not all one generic sound.
  assert.ok(new Set(Object.values(expected)).size >= 8);
});

test('magazine reloads are four-stage mechanical sequences', () => {
  const pistol = getReloadTimeline('pistol', 'magazine');
  assert.deepEqual(
    pistol.map((stage) => stage.kind),
    ['mag_release', 'mag_out', 'mag_in', 'mag_seat', 'slide'],
  );
  const rifle = getReloadTimeline('rifle', 'magazine');
  assert.equal(rifle.at(-1)?.kind, 'charge');
  const smg = getReloadTimeline('smg', 'magazine');
  assert.equal(smg.at(-1)?.kind, 'charge');
  const belt = getReloadTimeline('belt', 'magazine');
  assert.equal(belt.filter((stage) => stage.kind === 'belt_feed').length, 2);
  const plasma = getReloadTimeline('plasma', 'magazine');
  assert.deepEqual(
    plasma.map((stage) => stage.kind),
    ['cell_out', 'cell_in', 'cell_latch', 'charge'],
  );

  for (const timeline of [pistol, rifle, smg, belt, plasma]) {
    for (let i = 1; i < timeline.length; i += 1) {
      assert.ok(timeline[i].at >= timeline[i - 1].at, 'stages stay in order');
      assert.ok(timeline[i].at >= 0 && timeline[i].at <= 1);
    }
  }
});

test('single-round guns use their own loading action and closing sound', () => {
  const tube = getReloadTimeline('shotgun_tube', 'single');
  assert.equal(tube[0].kind, 'action_open');
  assert.equal(tube[0].once, true);
  assert.deepEqual(getReloadFinishStages('shotgun_tube', 'single'), ['pump']);

  const breakAction = getReloadTimeline('shotgun_break', 'single');
  assert.equal(breakAction[0].kind, 'break_open');
  assert.deepEqual(getReloadFinishStages('shotgun_break', 'single'), ['break_close']);

  const revolver = getReloadTimeline('revolver', 'single');
  assert.equal(revolver[0].kind, 'cylinder_open');
  assert.deepEqual(getReloadFinishStages('revolver', 'single'), ['cylinder_close']);

  const bolt = getReloadTimeline('bolt', 'single');
  assert.equal(bolt[0].kind, 'bolt_open');
  assert.deepEqual(getReloadFinishStages('bolt', 'single'), ['bolt_close']);
  assert.deepEqual(getReloadFinishStages('bolt', 'magazine'), []);

  const musket = getReloadTimeline('musket', 'single');
  assert.deepEqual(
    musket.map((stage) => stage.kind),
    ['powder', 'ramrod', 'shell_in', 'shell_seat'],
  );
  assert.deepEqual(getReloadFinishStages('musket', 'single'), ['cock']);

  // Magazine weapons finish in their timeline, so no extra closing stage.
  assert.deepEqual(getReloadFinishStages('pistol', 'magazine'), []);
  assert.deepEqual(getReloadFinishStages('rifle', 'magazine'), []);
});

test('a box-magazine bolt gun swaps its magazine and closes the bolt', () => {
  const timeline = getReloadTimeline('bolt', 'magazine');
  assert.deepEqual(
    timeline.map((stage) => stage.kind),
    ['bolt_open', 'mag_out', 'mag_in', 'mag_seat', 'bolt_close'],
  );
  const seq = new ReloadSoundSequencer();
  assert.deepEqual(seq.begin('barrett_50', 'magazine'), []);
  assert.deepEqual(seq.poll('barrett_50', 'magazine', 0.2), [
    'bolt_open',
    'mag_out',
  ]);
  assert.deepEqual(seq.poll('barrett_50', 'magazine', 1), [
    'mag_in',
    'mag_seat',
    'bolt_close',
  ]);
  assert.deepEqual(seq.finish('barrett_50', 'magazine'), []);
});

test('sequencer plays each magazine stage once as progress advances', () => {
  const seq = new ReloadSoundSequencer();
  assert.deepEqual(seq.begin('ak_47', 'magazine'), []);
  assert.deepEqual(seq.poll('ak_47', 'magazine', 0.05), ['mag_release']);
  assert.deepEqual(seq.poll('ak_47', 'magazine', 0.05), []);
  assert.deepEqual(seq.poll('ak_47', 'magazine', 0.2), ['mag_out']);
  assert.deepEqual(seq.poll('ak_47', 'magazine', 0.6), ['mag_in']);
  assert.deepEqual(seq.poll('ak_47', 'magazine', 0.75), ['mag_seat']);
  assert.deepEqual(seq.poll('ak_47', 'magazine', 1), ['charge']);
  assert.deepEqual(seq.poll('ak_47', 'magazine', 1), []);
  assert.deepEqual(seq.finish('ak_47', 'magazine'), []);
});

test('single-shell reload replays shell stages but not the action open', () => {
  const seq = new ReloadSoundSequencer();
  assert.deepEqual(seq.begin('remington_870', 'single'), ['action_open']);
  assert.deepEqual(seq.poll('remington_870', 'single', 0.6), ['shell_in']);
  assert.deepEqual(seq.poll('remington_870', 'single', 0.8), ['shell_seat']);

  // Next shell: timer restarts, progress drops back to 0.
  assert.deepEqual(seq.poll('remington_870', 'single', 0.03), []);
  assert.deepEqual(seq.poll('remington_870', 'single', 0.6), ['shell_in']);
  assert.deepEqual(seq.poll('remington_870', 'single', 0.8), ['shell_seat']);

  assert.deepEqual(seq.finish('remington_870', 'single'), ['pump']);
  assert.deepEqual(seq.finish('remington_870', 'single'), [], 'finish only once');
});

test('cancelling a reload stops every future stage', () => {
  const seq = new ReloadSoundSequencer();
  seq.begin('magnum_44', 'single');
  seq.poll('magnum_44', 'single', 0.5);
  seq.cancel();
  assert.deepEqual(seq.poll('magnum_44', 'single', 0.9), []);
  assert.deepEqual(seq.finish('magnum_44', 'single'), []);
});

test('a different weapon restarts the sequence from its own action', () => {
  const seq = new ReloadSoundSequencer();
  assert.deepEqual(seq.begin('m4a1', 'magazine'), []);
  assert.deepEqual(seq.poll('sawed_off', 'single', 0), ['break_open']);
  assert.deepEqual(seq.poll('sawed_off', 'single', 0.8), ['shell_in', 'shell_seat']);
});
