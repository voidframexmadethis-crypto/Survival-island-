import assert from 'node:assert/strict';
import test from 'node:test';
import { CarTrunkBassSystem, averageSubBassBins } from './carTrunkBassSystem';
import { VEHICLE_AUDIO_TUNINGS } from './carAudioTunings';

interface MockParam {
  value: number;
  setTargetAtTime: (value: number, start: number, constant: number) => void;
  setValueAtTime: (value: number, start: number) => void;
  linearRampToValueAtTime: (value: number, end: number) => void;
  exponentialRampToValueAtTime: (value: number, end: number) => void;
  cancelScheduledValues: (start: number) => void;
}

function makeParam(value = 0): MockParam {
  return {
    value,
    setTargetAtTime(next) {
      this.value = next;
    },
    setValueAtTime(next) {
      this.value = next;
    },
    linearRampToValueAtTime(next) {
      this.value = next;
    },
    exponentialRampToValueAtTime(next) {
      this.value = next;
    },
    cancelScheduledValues() {},
  };
}

interface MockNode {
  kind: string;
  connect: (dest: unknown) => void;
  disconnect: () => void;
}

interface MockFilter extends MockNode {
  type: string;
  frequency: MockParam;
  gain: MockParam;
  Q: MockParam;
}

interface MockCompressor extends MockNode {
  threshold: MockParam;
  knee: MockParam;
  ratio: MockParam;
  attack: MockParam;
  release: MockParam;
}

interface MockAnalyser extends MockNode {
  fftSize: number;
  smoothingTimeConstant: number;
  getByteFrequencyData: (data: Uint8Array) => void;
}

interface MockShaper extends MockNode {
  curve: Float32Array | null;
  oversample: string;
}

interface MockSource extends MockNode {
  buffer: unknown;
  playbackRate: MockParam;
  started: boolean;
  stopped: boolean;
  start: () => void;
  stop: () => void;
}

function makeMockGraph() {
  const filters: MockFilter[] = [];
  const compressors: MockCompressor[] = [];
  const analysers: MockAnalyser[] = [];
  const gains: MockNode[] = [];
  const sources: MockSource[] = [];
  const shapers: MockShaper[] = [];
  const connections: Array<[unknown, unknown]> = [];
  let analyserLevel = 1;

  const makeNode = (kind: string): MockNode => ({
    kind,
    connect(dest) {
      connections.push([this, dest]);
    },
    disconnect() {},
  });

  const ctx = {
    state: 'running',
    currentTime: 1,
    sampleRate: 48000,
    destination: { kind: 'destination' },
    createBiquadFilter(): MockFilter {
      const filter: MockFilter = {
        ...makeNode('filter'),
        type: 'lowpass',
        frequency: makeParam(350),
        gain: makeParam(0),
        Q: makeParam(1),
      };
      filters.push(filter);
      return filter;
    },
    createDynamicsCompressor(): MockCompressor {
      const compressor: MockCompressor = {
        ...makeNode('compressor'),
        threshold: makeParam(),
        knee: makeParam(),
        ratio: makeParam(),
        attack: makeParam(),
        release: makeParam(),
      };
      compressors.push(compressor);
      return compressor;
    },
    createAnalyser(): MockAnalyser {
      const analyser: MockAnalyser = {
        ...makeNode('analyser'),
        fftSize: 0,
        smoothingTimeConstant: 0,
        getByteFrequencyData(data: Uint8Array) {
          data.fill(Math.round(analyserLevel * 255));
        },
      };
      analysers.push(analyser);
      return analyser;
    },
    createGain(): MockNode {
      const gain = { ...makeNode('gain'), gain: makeParam(1) };
      gains.push(gain);
      return gain;
    },
    createWaveShaper(): MockShaper {
      const shaper: MockShaper = {
        ...makeNode('waveshaper'),
        curve: null,
        oversample: 'none',
      };
      shapers.push(shaper);
      return shaper;
    },
    createBuffer(_channels: number, length: number) {
      return {
        getChannelData: () => new Float32Array(length),
        duration: length / 48000,
      };
    },
    createBufferSource(): MockSource {
      const source: MockSource = {
        ...makeNode('source'),
        buffer: null,
        playbackRate: makeParam(1),
        started: false,
        stopped: false,
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
    close() {
      return Promise.resolve();
    },
  };

  return {
    ctx,
    filters,
    compressors,
    analysers,
    gains,
    sources,
    shapers,
    connections,
    setAnalyserLevel(level: number) {
      analyserLevel = level;
    },
  };
}

test('averageSubBassBins isolates the 40-170 Hz analyser window', () => {
  const bins = new Uint8Array(64);
  bins[0] = 255;
  bins[1] = 128;
  bins[2] = 64;
  bins[3] = 0;
  bins[7] = 255;
  assert.ok(Math.abs(averageSubBassBins(bins) - (128 + 64) / (3 * 255)) < 1e-6);
});

test('attachGraph builds the layered trunk DSP without a second media source', () => {
  const graph = makeMockGraph();
  const inputConnections: unknown[] = [];
  const input = {
    kind: 'input',
    connect(dest: unknown) {
      inputConnections.push(dest);
    },
    disconnect() {},
  };
  const output = { kind: 'output', connect() {}, disconnect() {} };
  const system = new CarTrunkBassSystem();

  assert.equal(
    system.attachGraph(
      graph.ctx as unknown as AudioContext,
      input as unknown as AudioNode,
      output as unknown as AudioNode,
    ),
    true,
  );

  const subsonic = graph.filters.filter(
    (f) => f.type === 'highpass' && f.frequency.value === 28,
  );
  const subBoost = graph.filters.find(
    (f) => f.frequency.value === 58 && f.type === 'lowshelf',
  );
  const subBand = graph.filters.find(
    (f) => f.type === 'peaking' && f.frequency.value === 48,
  );
  const lowBand = graph.filters.find(
    (f) => f.type === 'peaking' && f.frequency.value === 82,
  );
  const midBand = graph.filters.find(
    (f) => f.type === 'peaking' && f.frequency.value === 128,
  );
  const body = graph.filters.find(
    (f) => f.type === 'peaking' && f.frequency.value === 70,
  );
  const cabin = graph.filters.find((f) => f.frequency.value === 18000);
  assert.equal(subsonic.length, 2, 'two cascaded subsonic highpasses');
  assert.ok(subBoost);
  assert.ok(subBand);
  assert.ok(lowBand);
  assert.ok(midBand);
  assert.ok(body);
  assert.ok(cabin);
  assert.equal(cabin.type, 'lowpass');
  assert.equal(graph.compressors[0].threshold.value, -18);
  assert.equal(graph.compressors[0].ratio.value, 4);
  assert.equal(graph.compressors[1].threshold.value, -8);
  assert.equal(graph.compressors[1].ratio.value, 12);
  assert.equal(graph.analysers[0].fftSize, 1024);
  assert.equal(graph.analysers[0].smoothingTimeConstant, 0.45);
  // Harmonics are shaped and high-passed out of the bass fundamental.
  assert.equal(graph.shapers.length, 1);
  assert.ok((graph.shapers[0].curve?.length ?? 0) > 0);
  assert.equal(
    graph.filters.filter((f) => f.frequency.value === 165).length,
    1,
    'harmonic highpass keeps generated harmonics above the 160 Hz band',
  );
  // No rattle voice runs continuously; pulses are created only on hits.
  assert.equal(graph.sources.length, 0);

  // Direct shelf changes remain available for callers that only tweak EQ.
  system.setSubBoost(11, 4);
  assert.equal(subBoost.gain.value, 11);
  assert.equal(body.gain.value, 4);

  // The existing radio source bus feeds only the new DSP, and the DSP returns
  // into the existing cabin chain instead of opening another destination.
  assert.equal(inputConnections.length, 1);
  assert.equal(inputConnections[0], subsonic[0]);
  assert.ok(graph.connections.some(([, b]) => b === output));
  system.dispose();
});

test('rattle stays off until a profile explicitly enables it', () => {
  const graph = makeMockGraph();
  const input = { kind: 'input', connect() {}, disconnect() {} };
  const output = { kind: 'output', connect() {}, disconnect() {} };
  const system = new CarTrunkBassSystem();
  system.attachGraph(
    graph.ctx as unknown as AudioContext,
    input as unknown as AudioNode,
    output as unknown as AudioNode,
  );

  system.step(true, 0, true);
  assert.equal(system.bassEnergy, 1);
  assert.equal(system.rattleBursts, 0);
  assert.equal(graph.sources.length, 0);
  system.dispose();
});

test('step converts sub-bass hits into rattle bursts and respects proximity', () => {
  const graph = makeMockGraph();
  const input = { kind: 'input', connect() {}, disconnect() {} };
  const output = { kind: 'output', connect() {}, disconnect() {} };
  const system = new CarTrunkBassSystem();
  system.attachGraph(
    graph.ctx as unknown as AudioContext,
    input as unknown as AudioNode,
    output as unknown as AudioNode,
  );
  system.setRattleEnabled(true);

  system.step(true, 0, true);
  assert.equal(system.bassEnergy, 1);
  assert.equal(system.rattleBursts, 1);
  assert.equal(graph.sources.length, 1);
  assert.equal(graph.sources[0].started, true);
  assert.equal(graph.sources[0].stopped, true);
  assert.ok(
    graph.sources[0].playbackRate.value >= 0.94 - 1e-6 &&
      graph.sources[0].playbackRate.value <= 1.14 + 1e-6,
  );
  const tone = graph.filters.find(
    (f) => f.type === 'lowpass' && f.frequency.value > 2000,
  );
  const presence = graph.filters.find(
    (f) => f.type === 'peaking' && f.frequency.value > 2400,
  );
  assert.ok(tone);
  assert.ok(presence);
  assert.ok(presence.gain.value >= 1.5);

  // A sustained 808 keeps the trunk panel shaking, so it keeps rattling. The
  // synth's 65 ms cap paces this into a rattle instead of a solid buzz.
  graph.ctx.currentTime = 1.2;
  system.step(true, 0, true);
  assert.equal(system.rattleBursts, 2);
  assert.equal(graph.sources.length, 2);

  // Outside the 14 m near field, even a new bass hit must not rattle the trunk.
  graph.setAnalyserLevel(0.2);
  graph.ctx.currentTime = 2;
  system.step(false, 20, true);
  graph.setAnalyserLevel(1);
  graph.ctx.currentTime = 2.1;
  system.step(false, 20, true);
  assert.equal(system.rattleBursts, 2);

  // A fresh rising attack inside the car retriggers the same preallocated voice.
  graph.setAnalyserLevel(0.2);
  graph.ctx.currentTime = 2.3;
  system.step(true, 0, true);
  graph.setAnalyserLevel(1);
  graph.ctx.currentTime = 2.4;
  system.step(true, 0, true);
  assert.equal(system.rattleBursts, 3);
  assert.equal(graph.sources.length, 3);

  // Radio off decays energy and does not create more rattle.
  graph.ctx.currentTime = 3;
  system.step(true, 0, false);
  assert.ok(system.bassEnergy > 0 && system.bassEnergy < 1);
  assert.equal(system.rattleBursts, 3);
  system.dispose();
});

test('cabin bass boost takes the hot Blue DONK gain and reverts to unity outside', () => {
  const graph = makeMockGraph();
  const input = { kind: 'input', connect() {}, disconnect() {} };
  const output = { kind: 'output', connect() {}, disconnect() {} };
  const system = new CarTrunkBassSystem();
  system.attachGraph(
    graph.ctx as unknown as AudioContext,
    input as unknown as AudioNode,
    output as unknown as AudioNode,
  );

  const gainValues = () =>
    graph.gains.map((g) => (g as unknown as { gain: MockParam }).gain.value);

  system.setCabinBassBoost(true, 48);
  assert.equal(gainValues().filter((v) => v === 48).length, 1);

  system.setCabinBassBoost(false, 48);
  assert.equal(gainValues().filter((v) => v === 48).length, 0);
  system.dispose();
});

test('setTuning moves every band, harmonic mix and rattle voice per vehicle', () => {
  const graph = makeMockGraph();
  const input = { kind: 'input', connect() {}, disconnect() {} };
  const output = { kind: 'output', connect() {}, disconnect() {} };
  const system = new CarTrunkBassSystem();
  system.attachGraph(
    graph.ctx as unknown as AudioContext,
    input as unknown as AudioNode,
    output as unknown as AudioNode,
  );

  const [subsonicA, subsonicB, shelf, subBand, lowBand, midBand, body] = graph.filters;
  assert.equal(subsonicA.frequency.value, 28);
  assert.equal(subsonicB.frequency.value, 28);

  system.setTuning(VEHICLE_AUDIO_TUNINGS.donk);
  assert.equal(system.getTuning().id, 'donk');
  assert.equal(subBand.frequency.value, 38);
  assert.equal(subBand.gain.value, 7);
  assert.equal(lowBand.frequency.value, 72);
  assert.equal(lowBand.gain.value, 6);
  assert.equal(midBand.frequency.value, 148);
  assert.equal(midBand.gain.value, 4);
  assert.equal(body.frequency.value, 52);
  assert.equal(body.gain.value, 5);
  assert.equal(shelf.gain.value, 12);

  const harmonicGain = graph.gains
    .map((g) => (g as unknown as { gain: MockParam }).gain.value)
    .find((v) => Math.abs(v - 0.5 * 0.42) < 1e-6);
  assert.ok(harmonicGain, 'DONK harmonic exciter mix is applied');

  // Distinct body: crossover, resonance and rattle mix all move.
  system.setTuning(VEHICLE_AUDIO_TUNINGS.cadillac_coupe_deville);
  assert.equal(subBand.frequency.value, 46);
  assert.equal(lowBand.frequency.value, 80);
  assert.equal(midBand.frequency.value, 134);
  assert.equal(body.frequency.value, 58);
  assert.equal(body.Q.value, 1.6);

  // A hit still produces exactly one pre-rendered five-layer rattle voice.
  system.setRattleEnabled(true);
  system.step(true, 0, true);
  assert.equal(graph.sources.length, 1);
  system.dispose();
});
