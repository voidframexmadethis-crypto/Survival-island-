import type { GraphicsPreset } from '../types';

/**
 * Hardware probe used to pick a safe first-run graphics preset.
 *
 * It is deliberately conservative: the goal is to keep the game playable on
 * console browsers, laptops and phones, not to squeeze out the highest preset.
 * Players can always raise the preset in Settings after seeing how it runs.
 *
 * This only reads capabilities. It never changes gameplay or world simulation.
 */
export interface GraphicsHardwareInput {
  renderer: string;
  hasWebGL: boolean;
  isTouch: boolean;
  cores: number;
  memoryGb: number;
  screenWidth: number;
  screenHeight: number;
}

export interface GraphicsHardwareReport extends GraphicsHardwareInput {
  preset: GraphicsPreset;
  reason: string;
}

const SOFTWARE_RENDERER =
  /swiftshader|llvmpipe|softpipe|software|microsoft basic render|basic render driver|mesa offscreen/i;

const DISCRETE_GPU =
  /nvidia|geforce|rtx|gtx|quadro|radeon rx|radeon pro|rx\s?[5-9]\d{2}|apple m[1-9]|arc a\d/i;

/** GPUs with enough headroom to start on High; everything else stays safer. */
const HIGH_TIER_GPU =
  /rtx\s?[2-5]\d{3}|apple m[2-9]|radeon rx\s?[6-9]\d{2}|arc a[57]\d{2}/i;

const APPLE_SILICON = /apple m[1-9]/i;

const INTEGRATED_GPU = /intel|iris|uhd|hd graphics|mali|adreno|powervr/i;

/**
 * Pure classifier so the safety rules can be tested without a browser.
 */
export function classifyGraphicsPreset(input: GraphicsHardwareInput): {
  preset: GraphicsPreset;
  reason: string;
} {
  if (!input.hasWebGL) {
    return {
      preset: 'legacy',
      reason: 'No WebGL context — compatibility renderer only.',
    };
  }
  if (SOFTWARE_RENDERER.test(input.renderer)) {
    return {
      preset: 'legacy',
      reason: 'Software renderer detected — disabling post-FX and shadows.',
    };
  }

  const smallScreen = input.screenWidth > 0 && input.screenWidth < 820;
  const mobile = input.isTouch || smallScreen;

  if (mobile) {
    if (input.cores <= 4 || input.memoryGb <= 3) {
      return {
        preset: 'low',
        reason: 'Phone/tablet class hardware — battery-safe preset.',
      };
    }
    if (input.cores >= 6 && input.memoryGb >= 4) {
      return {
        preset: 'balanced',
        reason: 'Capable tablet/phone — balanced preset without heavy shadows.',
      };
    }
    return {
      preset: 'low',
      reason: 'Mobile browser — low preset for stable frame pacing.',
    };
  }

  if (input.cores <= 2 || input.memoryGb <= 2) {
    return {
      preset: 'low',
      reason: 'Entry-level desktop — low preset to avoid GPU stalls.',
    };
  }

  const discrete = DISCRETE_GPU.test(input.renderer);
  const appleSilicon = APPLE_SILICON.test(input.renderer);
  const highTier = HIGH_TIER_GPU.test(input.renderer);

  if (highTier && (input.cores >= 8 || appleSilicon) && input.memoryGb >= 8) {
    // Ultra stays opt-in; even strong machines start one tier down so the
    // first console/TV session is reliably smooth.
    return {
      preset: 'high',
      reason: 'High-end GPU and 8 GB+ memory — high preset with room to spare.',
    };
  }

  if (discrete && input.cores >= 6 && input.memoryGb >= 4) {
    return {
      preset: 'balanced',
      reason: 'Dedicated GPU with limited memory — balanced preset.',
    };
  }

  if (INTEGRATED_GPU.test(input.renderer) && input.cores <= 4) {
    return {
      preset: 'low',
      reason: 'Integrated GPU on a low-core CPU — low preset.',
    };
  }

  return {
    preset: 'balanced',
    reason: 'General browser hardware — balanced preset is the safe default.',
  };
}

function readRenderer(): { renderer: string; hasWebGL: boolean } {
  if (typeof document === 'undefined') {
    return { renderer: '', hasWebGL: false };
  }
  let canvas: HTMLCanvasElement | null = null;
  try {
    canvas = document.createElement('canvas');
    const gl =
      canvas.getContext('webgl2', { failIfMajorPerformanceCaveat: false }) ??
      canvas.getContext('webgl', { failIfMajorPerformanceCaveat: false });
    if (!gl) return { renderer: '', hasWebGL: false };
    const debug = gl.getExtension('WEBGL_debug_renderer_info');
    const renderer = String(
      debug
        ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER) || '',
    );
    const lose = gl.getExtension('WEBGL_lose_context');
    lose?.loseContext();
    return { renderer, hasWebGL: true };
  } catch {
    return { renderer: '', hasWebGL: false };
  } finally {
    canvas?.remove();
  }
}

/**
 * Probes the current browser. Safe to call before a WebGL game engine exists.
 */
export function detectGraphicsHardware(): GraphicsHardwareReport {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') {
    return {
      renderer: '',
      hasWebGL: false,
      isTouch: false,
      cores: 4,
      memoryGb: 8,
      screenWidth: 0,
      screenHeight: 0,
      preset: 'balanced',
      reason: 'Server-side default — balanced preset.',
    };
  }

  const nav = navigator as Navigator & { deviceMemory?: number };
  const isTouch =
    'ontouchstart' in window ||
    nav.maxTouchPoints > 0 ||
    window.matchMedia?.('(pointer: coarse)')?.matches === true;
  const cores = Math.max(1, Number(nav.hardwareConcurrency) || 4);
  const memoryGb = Math.max(
    1,
    Number(nav.deviceMemory) || (isTouch ? 4 : 8),
  );
  const screenWidth = Math.max(
    0,
    Number(window.innerWidth) || Number(window.screen?.width) || 0,
  );
  const screenHeight = Math.max(
    0,
    Number(window.innerHeight) || Number(window.screen?.height) || 0,
  );

  const { renderer, hasWebGL } = readRenderer();
  const classified = classifyGraphicsPreset({
    renderer,
    hasWebGL,
    isTouch,
    cores,
    memoryGb,
    screenWidth,
    screenHeight,
  });

  return {
    renderer,
    hasWebGL,
    isTouch,
    cores,
    memoryGb,
    screenWidth,
    screenHeight,
    preset: classified.preset,
    reason: classified.reason,
  };
}

export function describeGraphicsPreset(preset: GraphicsPreset): string {
  switch (preset) {
    case 'legacy':
      return 'Compatibility mode for software renderers and very old GPUs.';
    case 'low':
      return 'Battery-friendly: no shadows or post-FX, reduced vegetation.';
    case 'balanced':
      return 'Recommended default: shadows, water gloss and moderate effects.';
    case 'high':
      return 'Sharp shadows, full draw distance and higher-resolution effects.';
    case 'ultra':
      return 'Cinematic post-FX and maximum vegetation for strong desktop GPUs.';
  }
}
