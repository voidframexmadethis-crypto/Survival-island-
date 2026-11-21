import assert from 'node:assert/strict';
import test from 'node:test';
import * as THREE from 'three';
import {
  CABIN_BASS_AND_FIRST_PERSON,
  setupCarAudio,
  updateCarAudioPosition,
  updateCarStereo3D,
} from './carRadioSystem';

function createMockAudioElement(paused = true) {
  let playCalls = 0;
  let shouldReject = false;
  const mock = {
    paused,
    volume: 0,
    setReject(val: boolean) {
      shouldReject = val;
    },
    getPlayCalls() {
      return playCalls;
    },
    play() {
      playCalls += 1;
      if (shouldReject) {
        return Promise.reject(new Error('autoplay blocked'));
      }
      mock.paused = false;
      return Promise.resolve();
    },
  };
  return mock;
}

test('updateCarAudioPosition plays paused audio inside 3m and computes spatial volume', async () => {
  const car = new THREE.Object3D();
  car.position.set(10, 0, -5);
  const player = new THREE.Object3D();
  player.position.set(11.5, 0, -5); // 1.5m away (< 3m)

  let resumed = false;
  const listener = {
    context: {
      state: 'suspended',
      resume: () => {
        resumed = true;
        return Promise.resolve();
      },
    },
  } as unknown as THREE.AudioListener;

  const audio = createMockAudioElement(true);
  const result = updateCarAudioPosition(
    audio as unknown as HTMLAudioElement,
    car,
    player,
    listener,
  );

  assert.equal(result.inside, true);
  assert.ok(Math.abs(result.distance - 1.5) < 1e-6);
  assert.ok(Math.abs(result.volume - (1 - 1.5 / 35)) < 1e-6);
  assert.equal(audio.volume, result.volume);
  assert.equal(audio.getPlayCalls(), 1);
  assert.equal(resumed, true);

  // Calling again while already playing does not call play() redundantly
  const second = updateCarAudioPosition(
    audio as unknown as HTMLAudioElement,
    car,
    player,
    listener,
  );
  assert.equal(second.inside, true);
  assert.equal(audio.getPlayCalls(), 1);
});

test('updateCarAudioPosition attenuates over 35m and clamps to [0, 1] outside cabin', async () => {
  const car = new THREE.Object3D();
  car.position.set(0, 0, 0);
  const player = new THREE.Object3D();
  const listener = {} as unknown as THREE.AudioListener;

  const audio = createMockAudioElement(true);
  audio.setReject(true);

  // Mid-range: 17.5m -> volume 0.5, not inside, paused audio stays paused
  player.position.set(17.5, 0, 0);
  const mid = updateCarAudioPosition(
    audio as unknown as HTMLAudioElement,
    car,
    player,
    listener,
  );
  assert.equal(mid.inside, false);
  assert.ok(Math.abs(mid.volume - 0.5) < 1e-6);
  assert.equal(audio.getPlayCalls(), 0);

  // Beyond 35m: clamps to 0
  player.position.set(50, 0, 0);
  const far = updateCarAudioPosition(
    audio as unknown as HTMLAudioElement,
    car,
    player,
    listener,
  );
  assert.equal(far.inside, false);
  assert.equal(far.volume, 0);

  // Inside 3m with blocked autoplay rejects silently without throwing
  player.position.set(1, 0, 0);
  const blocked = updateCarAudioPosition(
    audio as unknown as HTMLAudioElement,
    car,
    player,
    listener,
  );
  assert.equal(blocked.inside, true);
  assert.equal(audio.getPlayCalls(), 1);
  await new Promise((r) => setTimeout(r, 0));
});

test('CABIN_BASS_AND_FIRST_PERSON clamps spatialAttenuation and tracks userPaused', () => {
  CABIN_BASS_AND_FIRST_PERSON.setSpatialAttenuation(1.8);
  assert.equal(CABIN_BASS_AND_FIRST_PERSON.spatialAttenuation, 1);
  CABIN_BASS_AND_FIRST_PERSON.setSpatialAttenuation(-0.5);
  assert.equal(CABIN_BASS_AND_FIRST_PERSON.spatialAttenuation, 0);
  CABIN_BASS_AND_FIRST_PERSON.setSpatialAttenuation(0.45);
  assert.equal(CABIN_BASS_AND_FIRST_PERSON.spatialAttenuation, 0.45);

  CABIN_BASS_AND_FIRST_PERSON.pause();
  assert.equal(CABIN_BASS_AND_FIRST_PERSON.userPaused, true);
  assert.equal(CABIN_BASS_AND_FIRST_PERSON.stereoPlaying, false);
});

test('updateCarStereo3D updates panner position, listener position, and camera forward orientation', () => {
  const makeParam = () => {
    const calls: Array<{ val: number; t: number; tc: number }> = [];
    return {
      calls,
      setTargetAtTime(val: number, t: number, tc: number) {
        calls.push({ val, t, tc });
      },
    };
  };

  const panner = {
    positionX: makeParam(),
    positionY: makeParam(),
    positionZ: makeParam(),
    context: {
      currentTime: 12.5,
      listener: {
        positionX: makeParam(),
        positionY: makeParam(),
        positionZ: makeParam(),
        forwardX: makeParam(),
        forwardY: makeParam(),
        forwardZ: makeParam(),
      },
    },
  };

  const parent = new THREE.Group();
  parent.position.set(10, 2, -4);
  const car = new THREE.Object3D();
  car.position.set(2, 0.5, 1);
  parent.add(car);

  const camera = new THREE.PerspectiveCamera(68, 1, 0.1, 100);
  camera.position.set(5, 3, 8);
  camera.rotation.set(0, Math.PI / 2, 0); // Looking toward -X

  updateCarStereo3D(panner as unknown as PannerNode, car, camera);

  assert.equal(panner.positionX.calls[0].val, 12);
  assert.equal(panner.positionY.calls[0].val, 2.5);
  assert.equal(panner.positionZ.calls[0].val, -3);
  assert.equal(panner.positionX.calls[0].t, 12.5);
  assert.equal(panner.positionX.calls[0].tc, 0.04);

  const listener = panner.context.listener;
  assert.equal(listener.positionX.calls[0].val, 5);
  assert.equal(listener.positionY.calls[0].val, 3);
  assert.equal(listener.positionZ.calls[0].val, 8);

  // Camera rotated +90 deg around Y turns (0, 0, -1) -> (-1, 0, 0)
  assert.ok(Math.abs(listener.forwardX.calls[0].val - -1) < 1e-6);
  assert.ok(Math.abs(listener.forwardY.calls[0].val) < 1e-6);
  assert.ok(Math.abs(listener.forwardZ.calls[0].val) < 1e-6);
});

test('setupCarAudio routes through HRTF PannerNode with 100Hz bass and 48Hz sub filters', () => {
  const connections: Array<[unknown, unknown]> = [];
  const makeNode = (label: string) => ({
    label,
    type: '',
    frequency: { value: 0 },
    Q: { value: 0 },
    gain: { value: 0 },
    fftSize: 0,
    frequencyBinCount: 128,
    panningModel: '',
    distanceModel: '',
    refDistance: 0,
    maxDistance: 0,
    rolloffFactor: 0,
    connect(dest: unknown) {
      connections.push([this, dest]);
    },
    disconnect() {},
  });

  const destination = { label: 'destination' };
  const origWindow = (globalThis as unknown as { window?: unknown }).window;
  class MockAudioContext {
    state = 'running';
    destination = destination;
    createMediaElementSource() {
      return makeNode('source');
    }
    createBiquadFilter() {
      return makeNode('filter');
    }
    createGain() {
      return makeNode('gain');
    }
    createAnalyser() {
      return makeNode('analyser');
    }
    createPanner() {
      return makeNode('panner');
    }
    close() {
      return Promise.resolve();
    }
  }

  (globalThis as unknown as { window: { AudioContext: typeof MockAudioContext } }).window = {
    AudioContext: MockAudioContext,
  };

  try {
    const mockAudio = {
      paused: true,
      ended: false,
      addEventListener() {},
      removeEventListener() {},
    } as unknown as HTMLAudioElement;

    const handles = setupCarAudio(mockAudio, 'classic');
    assert.equal(handles.bass.frequency.value, 100);
    assert.ok(Math.abs(handles.bass.gain.value - 6 * 1.8) < 1e-6);
    assert.equal(handles.sub.frequency.value, 48);
    assert.equal(handles.sub.Q.value, 0.8);
    assert.ok(Math.abs(handles.sub.gain.value - 5 * 1.5) < 1e-6);

    assert.equal(handles.panner.panningModel, 'HRTF');
    assert.equal(handles.panner.distanceModel, 'inverse');
    assert.equal(handles.panner.refDistance, 2);
    assert.equal(handles.panner.maxDistance, 55);
    assert.equal(handles.panner.rolloffFactor, 1.4);

    // analyser -> panner -> destination
    assert.ok(
      connections.some(([a, b]) => a === handles.analyser && b === handles.panner),
    );
    assert.ok(
      connections.some(([a, b]) => a === handles.panner && b === destination),
    );
    handles.destroy();
  } finally {
    if (origWindow === undefined) {
      delete (globalThis as unknown as { window?: unknown }).window;
    } else {
      (globalThis as unknown as { window?: unknown }).window = origWindow;
    }
  }
});
