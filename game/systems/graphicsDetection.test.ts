import assert from 'node:assert/strict';
import test from 'node:test';
import {
  classifyGraphicsPreset,
  describeGraphicsPreset,
  type GraphicsHardwareInput,
} from './graphicsDetection';

function input(overrides: Partial<GraphicsHardwareInput> = {}): GraphicsHardwareInput {
  return {
    renderer: 'NVIDIA GeForce RTX 4070',
    hasWebGL: true,
    isTouch: false,
    cores: 12,
    memoryGb: 16,
    screenWidth: 1920,
    screenHeight: 1080,
    ...overrides,
  };
}

test('software renderers fall back to the legacy compatibility preset', () => {
  assert.equal(
    classifyGraphicsPreset(
      input({ renderer: 'ANGLE (Google, SwiftShader Device (Subzero))' }),
    ).preset,
    'legacy',
  );
  assert.equal(
    classifyGraphicsPreset(input({ renderer: '', hasWebGL: false })).preset,
    'legacy',
  );
});

test('phones and tablets start low or balanced, never high or ultra', () => {
  assert.equal(
    classifyGraphicsPreset(input({ isTouch: true, cores: 4, memoryGb: 3 })).preset,
    'low',
  );
  assert.equal(
    classifyGraphicsPreset(input({ isTouch: true, cores: 8, memoryGb: 8 })).preset,
    'balanced',
  );
  assert.notEqual(
    classifyGraphicsPreset(input({ isTouch: true, cores: 10, memoryGb: 16 })).preset,
    'ultra',
  );
});

test('weak desktops avoid shadow-heavy presets', () => {
  assert.equal(
    classifyGraphicsPreset(
      input({ renderer: 'Intel(R) UHD Graphics 620', cores: 4, memoryGb: 8 }),
    ).preset,
    'low',
  );
  assert.equal(
    classifyGraphicsPreset(input({ cores: 2, memoryGb: 2 })).preset,
    'low',
  );
});

test('unknown desktop hardware defaults to balanced', () => {
  assert.equal(
    classifyGraphicsPreset(
      input({ renderer: 'ANGLE (Generic Renderer)', cores: 8, memoryGb: 8 }),
    ).preset,
    'balanced',
  );
});

test('dedicated GPUs start high but ultra is always opt-in', () => {
  assert.equal(classifyGraphicsPreset(input()).preset, 'high');
  assert.notEqual(
    classifyGraphicsPreset(input({ cores: 32, memoryGb: 64 })).preset,
    'ultra',
  );
});

test('console-like TV browsers stay on balanced until tested', () => {
  assert.equal(
    classifyGraphicsPreset(
      input({ renderer: 'AMD Radeon Graphics', cores: 8, memoryGb: 8, isTouch: false }),
    ).preset,
    'balanced',
  );
});

test('every preset has player-facing detection copy', () => {
  for (const preset of ['legacy', 'low', 'balanced', 'high', 'ultra'] as const) {
    assert.ok(describeGraphicsPreset(preset).length > 10);
  }
});
