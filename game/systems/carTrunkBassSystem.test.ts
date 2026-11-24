import assert from 'node:assert/strict';
import test from 'node:test';
import { CarTrunkBassSystem, averageSubBassBins } from './carTrunkBassSystem';

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
    createBuffer(_channels: number, length: number) {
      return {
        getChannelData: () => new Float32Array(length),
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

test('attachGraph builds the 58 Hz trunk DSP without a second media source', () => {
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

  const subBoost = graph.filters.find((f) => f.frequency.value === 58);
  const subPeak = graph.filters.find((f) => f.frequency.value === 64);
  const cabin = graph.filters.find((f) => f.frequency.value === 18000);
  assert.ok(subBoost);
  assert.equal(subBoost.type, 'lowshelf');
  assert.equal(subBoost.gain.value, 18);
  assert.ok(subPeak);
  assert.equal(subPeak.type, 'peaking');
  assert.equal(subPeak.gain.value, 7);
  assert.ok(cabin);
  assert.equal(cabin.type, 'lowpass');
  assert.equal(graph.compressors[0].threshold.value, -14);
  assert.equal(graph.compressors[0].ratio.value, 8);
  assert.equal(graph.compressors[1].threshold.value, -8);
  assert.equal(graph.compressors[1].ratio.value, 12);
  assert.equal(graph.analysers[0].fftSize, 1024);
  assert.equal(graph.analysers[0].smoothingTimeConstant, 0.45);
  // No rattle voice runs continuously; pulses are created only on hits.
  assert.equal(graph.sources.length, 0);

  // Lowrider profiles use less additive trunk EQ so the clean sub gain can be
  // pushed harder without slamming the limiter into audible clicks.
  system.setSubBoost(11, 4);
  assert.equal(subBoost.gain.value, 11);
  assert.equal(subPeak.gain.value, 4);

  // The existing radio source bus feeds only the new DSP, and the DSP returns
  // into the existing cabin chain instead of opening another destination.
  assert.equal(inputConnections.length, 1);
  assert.equal(inputConnections[0], subBoost);
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
    graph.sources[0].playbackRate.value >= 0.92 - 1e-6 &&
      graph.sources[0].playbackRate.value <= 1.16 + 1e-6,
  );
  const bodyBand = graph.filters.find(
    (f) => f.type === 'bandpass' && f.frequency.value >= 480 && f.frequency.value <= 760,
  );
  const edgeHigh = graph.filters.find((f) => f.frequency.value === 2100);
  assert.ok(bodyBand);
  assert.ok(edgeHigh);
  assert.equal(edgeHigh.gain.value, 3.5);

  // A sustained 808 must not machine-gun the rattle between beats.
  graph.ctx.currentTime = 1.2;
  system.step(true, 0, true);
  assert.equal(system.rattleBursts, 1);

  // Outside the 14 m near field, even a new bass hit must not rattle the trunk.
  graph.setAnalyserLevel(0.2);
  graph.ctx.currentTime = 2;
  system.step(false, 20, true);
  graph.setAnalyserLevel(1);
  graph.ctx.currentTime = 2.1;
  system.step(false, 20, true);
  assert.equal(system.rattleBursts, 1);

  // A fresh rising attack inside the car retriggers the same preallocated voice.
  graph.setAnalyserLevel(0.2);
  graph.ctx.currentTime = 2.3;
  system.step(true, 0, true);
  graph.setAnalyserLevel(1);
  graph.ctx.currentTime = 2.4;
  system.step(true, 0, true);
  assert.equal(system.rattleBursts, 2);
  assert.equal(graph.sources.length, 2);

  // Radio off decays energy and does not create more rattle.
  graph.ctx.currentTime = 3;
  system.step(true, 0, false);
  assert.ok(system.bassEnergy > 0 && system.bassEnergy < 1);
  assert.equal(system.rattleBursts, 2);
  system.dispose();
});
