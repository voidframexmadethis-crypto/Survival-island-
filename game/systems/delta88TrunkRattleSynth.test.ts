import assert from 'node:assert/strict';
import test from 'node:test';
import { Delta88TrunkRattleSynth } from './delta88TrunkRattleSynth';
import type { TrunkRattleCharacter } from './carAudioTunings';

interface MockParam {
  value: number;
  setValueAtTime: (value: number, start: number) => void;
  linearRampToValueAtTime: (value: number, end: number) => void;
  exponentialRampToValueAtTime: (value: number, end: number) => void;
}

function makeParam(value = 0): MockParam {
  return {
    value,
    setValueAtTime(next) {
      this.value = next;
    },
    linearRampToValueAtTime(next) {
      this.value = next;
    },
    exponentialRampToValueAtTime(next) {
      this.value = next;
    },
  };
}

function makeContext() {
  const buffers: Array<{ duration: number; data: Float32Array }> = [];
  const sources: Array<{ buffer: unknown; started: boolean; stopped: boolean }> = [];
  const ctx = {
    state: 'running',
    currentTime: 5,
    sampleRate: 48000,
    createBuffer(_channels: number, length: number) {
      const data = new Float32Array(length);
      const buffer = { duration: length / 48000, data, getChannelData: () => data };
      buffers.push(buffer);
      return buffer;
    },
    createBufferSource() {
      const source = {
        buffer: null as unknown,
        playbackRate: makeParam(1),
        started: false,
        stopped: false,
        connect() {},
        disconnect() {},
        start() {
          this.started = true;
        },
        stop() {
          this.stopped = true;
        },
      };
      sources.push(source);
      return source;
    },
    createBiquadFilter() {
      return {
        type: '',
        frequency: makeParam(),
        Q: makeParam(),
        gain: makeParam(),
        connect() {},
        disconnect() {},
      };
    },
    createGain() {
      return {
        gain: makeParam(1),
        connect() {},
        disconnect() {},
      };
    },
  };
  return { ctx, buffers, sources };
}

function character(overrides: Partial<TrunkRattleCharacter> = {}): TrunkRattleCharacter {
  return {
    intensity: 1,
    brightness: 0.5,
    decay: 1,
    lid: 0.8,
    plate: 0.7,
    deck: 0.7,
    quarter: 0.6,
    trim: 0.6,
    ...overrides,
  };
}

function magnitudeAt(data: Float32Array, freq: number, sampleRate = 48000): number {
  const n = Math.min(data.length, 2048);
  let sin = 0;
  let cos = 0;
  for (let i = 0; i < n; i += 1) {
    const phase = (2 * Math.PI * freq * i) / sampleRate;
    sin += data[i] * Math.sin(phase);
    cos += data[i] * Math.cos(phase);
  }
  return Math.sqrt(sin * sin + cos * cos) / n;
}

test('rattle ensemble pre-renders physical panel layers and fires only on hits', () => {
  const { ctx, buffers, sources } = makeContext();
  const out = { connect() {}, disconnect() {} };
  const synth = new Delta88TrunkRattleSynth(
    ctx as unknown as AudioContext,
    out as unknown as AudioNode,
  );

  assert.equal(sources.length, 0, 'nothing plays before a bass hit');
  assert.equal(synth.triggerOnBassHit(0.9), true);
  assert.equal(sources.length, 1);
  assert.equal(sources[0].started, true);
  assert.equal(sources[0].stopped, true);

  // Three varied ensemble renders exist, each normalised below full scale and
  // long enough to read as a panel rattle rather than a click.
  assert.equal(buffers.length, 3);
  for (const buffer of buffers) {
    let peak = 0;
    for (const sample of buffer.data) peak = Math.max(peak, Math.abs(sample));
    assert.ok(buffer.duration > 0.03 && buffer.duration < 0.09);
    assert.ok(peak > 0.1 && peak <= 0.83, `peak ${peak} stays under the ceiling`);
  }

  // 60 ms cap paces hits into a rattle instead of stacking a solid buzz.
  assert.equal(synth.triggerOnBassHit(0.9), false);
  ctx.currentTime = 5.2;
  assert.equal(synth.triggerOnBassHit(0.4), true);
});

test('per-vehicle rattle character changes the panel mix', () => {
  const { ctx, buffers } = makeContext();
  const out = { connect() {}, disconnect() {} };
  const synth = new Delta88TrunkRattleSynth(
    ctx as unknown as AudioContext,
    out as unknown as AudioNode,
  );

  synth.setCharacter(character({ lid: 1, plate: 0, deck: 0, quarter: 0, trim: 0 }));
  const lidBuffer = buffers[buffers.length - 1].data;

  synth.setCharacter(character({ lid: 0, plate: 1, deck: 0, quarter: 0, trim: 0 }));
  const plateBuffer = buffers[buffers.length - 1].data;

  // A plate layer rings around 2 kHz while a lid layer thumps at 172 Hz.
  const lidAtPlate = magnitudeAt(lidBuffer, 2040);
  const plateAtPlate = magnitudeAt(plateBuffer, 2040);
  const lidAtLid = magnitudeAt(lidBuffer, 172);
  const plateAtLid = magnitudeAt(plateBuffer, 172);
  assert.ok(
    plateAtPlate > lidAtPlate * 3,
    `plate layer ${plateAtPlate} vs lid layer ${lidAtPlate} at 2 kHz`,
  );
  assert.ok(
    lidAtLid > plateAtLid * 2,
    `lid layer ${lidAtLid} vs plate layer ${plateAtLid} at 172 Hz`,
  );

  // Re-applying the same character reuses the rendered buffers.
  const count = buffers.length;
  synth.setCharacter(character({ lid: 0, plate: 1, deck: 0, quarter: 0, trim: 0 }));
  assert.equal(buffers.length, count);
});
