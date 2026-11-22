import assert from 'node:assert/strict';
import test from 'node:test';
import { CarTrunkBassSystem, averageSubBassBins } from './carTrunkBassSystem';

interface MockParam {
  value: number;
  setTargetAtTime: (value: number, start: number, constant: number) => void;
  setValueAtTime: (value: number, start: number) => void;
  exponentialRampToValueAtTime: (value: number, end: number) => void;
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
    exponentialRampToValueAtTime(next) {
      this.value = next;
    },
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
          data.fill(255);
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

  return { ctx, filters, compressors, analysers, gains, sources, connections };
}

test('averageSubBassBins isolates the 20-140 Hz analyser window', () => {
  const bins = new Uint8Array(64);
  bins[0] = 255;
  bins[1] = 128;
  bins[2] = 64;
  bins[3] = 0;
  bins[7] = 255;
  assert.ok(Math.abs(averageSubBassBins(bins) - (128 + 64) / (6 * 255)) < 1e-6);
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
  const cabin = graph.filters.find((f) => f.frequency.value === 18000);
  assert.ok(subBoost);
  assert.equal(subBoost.type, 'lowshelf');
  assert.equal(subBoost.gain.value, 16);
  assert.ok(cabin);
  assert.equal(cabin.type, 'lowpass');
  assert.equal(graph.compressors[0].threshold.value, -14);
  assert.equal(graph.compressors[0].ratio.value, 8);
  assert.equal(graph.analysers[0].fftSize, 2048);
  assert.equal(graph.analysers[0].smoothingTimeConstant, 0.65);

  // The existing radio source bus feeds only the new DSP, and the DSP returns
  // into the existing cabin chain instead of opening another destination.
  assert.equal(inputConnections.length, 1);
  assert.equal(inputConnections[0], subBoost);
  assert.ok(graph.connections.some(([, b]) => b === output));
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
  assert.equal(graph.sources.length, 1);

  // Outside the 14 m near field, a hit must not rattle the trunk.
  graph.ctx.currentTime = 2;
  system.step(false, 20, true);
  assert.equal(graph.sources.length, 1);

  // Once inside again, the next hit after the 55 ms cap triggers.
  graph.ctx.currentTime = 2.1;
  system.step(true, 0, true);
  assert.equal(graph.sources.length, 2);
  assert.equal(graph.sources[1].started, true);
  assert.equal(graph.sources[1].stopped, true);

  // Radio off decays energy and does not create more rattle.
  graph.ctx.currentTime = 3;
  system.step(true, 0, false);
  assert.ok(system.bassEnergy > 0 && system.bassEnergy < 1);
  assert.equal(graph.sources.length, 2);
  system.dispose();
});
