import * as THREE from 'three';

export interface SafeWebGLRendererOptions {
  antialias?: boolean;
  alpha?: boolean;
  stencil?: boolean;
  powerPreference?: WebGLPowerPreference;
}

export interface SafeWebGLRendererResult {
  renderer: THREE.WebGLRenderer;
  isSoftwareGl: boolean;
}

const FALLBACK_ZERO_PRECISION = {
  precision: 0,
  rangeMin: 0,
  rangeMax: 0,
} as WebGLShaderPrecisionFormat;

function isLiveGlContext(
  gl: WebGLRenderingContext | WebGL2RenderingContext | null,
): gl is WebGLRenderingContext | WebGL2RenderingContext {
  if (!gl) return false;
  try {
    if (typeof gl.isContextLost === 'function' && gl.isContextLost()) {
      return false;
    }
    const vHigh = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
    const fHigh = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    if (vHigh && fHigh) return true;
    const vMed = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.MEDIUM_FLOAT);
    const fMed = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.MEDIUM_FLOAT);
    return Boolean(vMed && fMed);
  } catch {
    return false;
  }
}

function detectSoftwareRendererFromGl(
  gl: WebGLRenderingContext | WebGL2RenderingContext,
): boolean {
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param) || '');
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

/**
 * Safely creates a THREE.WebGLRenderer without creating & force-losing a throwaway probe
 * WebGL context (which triggers context loss / null getShaderPrecisionFormat in Safari/WebKit).
 * Validates context health & shader precision across WebGL2/WebGL1 fallbacks before instantiation.
 */
export function createSafeWebGLRenderer(
  options: SafeWebGLRendererOptions = {},
): SafeWebGLRendererResult {
  const preferAntialias = options.antialias ?? true;
  const alpha = options.alpha ?? false;
  const stencil = options.stencil ?? false;
  const preferPower = options.powerPreference ?? 'high-performance';

  const attempts: {
    type: 'webgl2' | 'webgl';
    antialias: boolean;
    powerPreference: WebGLPowerPreference;
  }[] = [
    { type: 'webgl2', antialias: preferAntialias, powerPreference: preferPower },
    { type: 'webgl2', antialias: false, powerPreference: 'default' },
    { type: 'webgl', antialias: preferAntialias, powerPreference: 'default' },
    { type: 'webgl', antialias: false, powerPreference: 'default' },
  ];

  let lastError: unknown = null;

  for (const attempt of attempts) {
    const canvas = document.createElement('canvas');
    let gl: WebGLRenderingContext | WebGL2RenderingContext | null = null;
    try {
      gl = canvas.getContext(attempt.type, {
        antialias: attempt.antialias,
        alpha,
        stencil,
        powerPreference: attempt.powerPreference,
      }) as WebGLRenderingContext | WebGL2RenderingContext | null;
    } catch (err) {
      lastError = err;
      gl = null;
    }

    if (!isLiveGlContext(gl)) {
      continue;
    }

    const vHigh = gl.getShaderPrecisionFormat(gl.VERTEX_SHADER, gl.HIGH_FLOAT);
    const fHigh = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const precision: 'highp' | 'mediump' =
      (vHigh?.precision ?? 0) > 0 && (fHigh?.precision ?? 0) > 0 ? 'highp' : 'mediump';

    // Guard Three.js getMaxPrecision() against Safari/WebKit returning null transiently
    const origGetPrecision = gl.getShaderPrecisionFormat.bind(gl);
    gl.getShaderPrecisionFormat = (shaderType: number, precisionType: number) => {
      return origGetPrecision(shaderType, precisionType) ?? FALLBACK_ZERO_PRECISION;
    };

    try {
      const renderer = new THREE.WebGLRenderer({
        canvas,
        context: gl,
        antialias: attempt.antialias,
        alpha,
        stencil,
        powerPreference: attempt.powerPreference,
        precision,
      });
      const isSoftwareGl = detectSoftwareRendererFromGl(gl);
      return { renderer, isSoftwareGl };
    } catch (err) {
      lastError = err;
    }
  }

  throw lastError instanceof Error
    ? lastError
    : new Error('Unable to initialize a valid WebGL context.');
}
