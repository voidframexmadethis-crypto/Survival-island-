import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { FXAAPass } from 'three/examples/jsm/postprocessing/FXAAPass.js';
import type { GraphicsPreset } from '../types';

export type CinematicPostQuality = 'off' | 'low' | 'medium' | 'high' | 'ultra';

export interface CinematicPostFxOptions {
  /** MSAA samples for the HDR composer target (WebGL2 only). */
  samples?: number;
}

/**
 * Display-space finishing shader applied while the frame is still linear HDR.
 * Adds a filmic S-curve, saturation, split-tone warmth, vignette and a cheap
 * unsharp mask before the OutputPass tone-maps the image.
 */
const CinematicGradeShader = {
  name: 'CinematicGradeShader',
  uniforms: {
    tDiffuse: { value: null as THREE.Texture | null },
    uResolution: { value: new THREE.Vector2(1, 1) },
    uVignette: { value: 0.14 },
    uSaturation: { value: 1.02 },
    uContrast: { value: 1.04 },
    uSharpen: { value: 0.08 },
    uWarmth: { value: 0.3 },
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform vec2 uResolution;
    uniform float uVignette;
    uniform float uSaturation;
    uniform float uContrast;
    uniform float uSharpen;
    uniform float uWarmth;
    varying vec2 vUv;

    float luma(vec3 c) {
      return dot(c, vec3(0.2126, 0.7152, 0.0722));
    }

    void main() {
      vec2 texel = 1.0 / max(uResolution, vec2(1.0));
      vec3 color = texture2D(tDiffuse, vUv).rgb;

      if (uSharpen > 0.0001) {
        vec3 north = texture2D(tDiffuse, vUv + vec2(0.0, texel.y)).rgb;
        vec3 south = texture2D(tDiffuse, vUv - vec2(0.0, texel.y)).rgb;
        vec3 east = texture2D(tDiffuse, vUv + vec2(texel.x, 0.0)).rgb;
        vec3 west = texture2D(tDiffuse, vUv - vec2(texel.x, 0.0)).rgb;
        vec3 blur = (north + south + east + west) * 0.25;
        color = max(color + (color - blur) * uSharpen, 0.0);
      }

      // Filmic contrast pivot on linear mid-grey.
      color = mix(vec3(0.18), color, uContrast);
      float luminance = luma(color);
      color = max(mix(vec3(luminance), color, uSaturation), 0.0);

      // Gentle warm highlights / cool shadows (split toning).
      color += vec3(0.018, 0.008, -0.005) * smoothstep(0.25, 1.15, luminance) * uWarmth;
      color += vec3(-0.006, 0.002, 0.012) * (1.0 - smoothstep(0.0, 0.35, luminance)) * uWarmth;

      vec2 centered = vUv - 0.5;
      float vignette = 1.0 - dot(centered, centered) * uVignette;
      color *= clamp(vignette, 0.0, 1.0);

      // Sub-LSB dither removes sky/ramp banding without adding visible noise.
      float dither = fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453);
      color += (dither - 0.5) * (1.0 / 255.0);

      gl_FragColor = vec4(max(color, 0.0), 1.0);
    }
  `,
};

interface QualityProfile {
  bloom: boolean;
  bloomStrength: number;
  bloomRadius: number;
  bloomThreshold: number;
  vignette: number;
  saturation: number;
  contrast: number;
  sharpen: number;
  warmth: number;
}

const QUALITY_PROFILES: Record<Exclude<CinematicPostQuality, 'off'>, QualityProfile> = {
  low: {
    bloom: false,
    bloomStrength: 0,
    bloomRadius: 0.45,
    bloomThreshold: 1.7,
    vignette: 0.07,
    saturation: 1.0,
    contrast: 1.015,
    sharpen: 0.04,
    warmth: 0.18,
  },
  medium: {
    bloom: true,
    bloomStrength: 0.2,
    bloomRadius: 0.55,
    bloomThreshold: 1.9,
    vignette: 0.1,
    saturation: 1.01,
    contrast: 1.03,
    sharpen: 0.06,
    warmth: 0.24,
  },
  high: {
    // Bloom only picks up genuinely emissive/specular HDR values (>1.9 linear), so
    // daylight sky and sunlit rock no longer smear into a washed-out glow.
    bloom: true,
    bloomStrength: 0.26,
    bloomRadius: 0.62,
    bloomThreshold: 2.1,
    vignette: 0.14,
    saturation: 1.02,
    contrast: 1.045,
    sharpen: 0.085,
    warmth: 0.3,
  },
  ultra: {
    bloom: true,
    bloomStrength: 0.3,
    bloomRadius: 0.68,
    bloomThreshold: 2.25,
    vignette: 0.16,
    saturation: 1.025,
    contrast: 1.055,
    sharpen: 0.1,
    warmth: 0.34,
  },
};

/** Maps the game's graphics preset to a post-processing tier without breaking low-end devices. */
export function resolveCinematicPostQuality(params: {
  preset: GraphicsPreset;
  isTouch: boolean;
  isSoftwareGl: boolean;
}): CinematicPostQuality {
  if (params.isSoftwareGl || params.preset === 'low') return 'off';
  if (params.isTouch) return params.preset === 'medium' ? 'low' : 'medium';
  return params.preset;
}

export class CinematicPostFx {
  private readonly composer: EffectComposer;
  private readonly bloom: UnrealBloomPass;
  private readonly grade: ShaderPass;
  private readonly output: OutputPass;
  private readonly fxaa: FXAAPass;
  private readonly msaaSamples: number;

  private quality: CinematicPostQuality = 'off';
  private width = 1;
  private height = 1;
  private pixelRatio = 1;

  constructor(
    renderer: THREE.WebGLRenderer,
    scene: THREE.Scene,
    camera: THREE.Camera,
    options: CinematicPostFxOptions = {},
  ) {
    const supportsMsaa = renderer.capabilities.isWebGL2;
    const gl = renderer.getContext();
    const canRenderHalfFloat =
      supportsMsaa &&
      Boolean(
        gl.getExtension('EXT_color_buffer_float') ??
          gl.getExtension('EXT_color_buffer_half_float'),
      );

    const size = renderer.getSize(new THREE.Vector2());
    this.width = Math.max(1, Math.round(size.x));
    this.height = Math.max(1, Math.round(size.y));
    this.pixelRatio = renderer.getPixelRatio();

    const samples = supportsMsaa ? Math.max(0, Math.round(options.samples ?? 0)) : 0;
    this.msaaSamples = samples;
    const renderTarget = new THREE.WebGLRenderTarget(
      Math.max(1, Math.round(this.width * this.pixelRatio)),
      Math.max(1, Math.round(this.height * this.pixelRatio)),
      {
        type: canRenderHalfFloat ? THREE.HalfFloatType : THREE.UnsignedByteType,
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
        depthBuffer: true,
        stencilBuffer: false,
        samples,
      },
    );
    renderTarget.texture.name = 'CinematicPostFx.hdr';

    this.composer = new EffectComposer(renderer, renderTarget);
    this.composer.setSize(this.width, this.height);

    this.bloom = new UnrealBloomPass(
      new THREE.Vector2(this.bloomWidth, this.bloomHeight),
      QUALITY_PROFILES.medium.bloomStrength,
      QUALITY_PROFILES.medium.bloomRadius,
      QUALITY_PROFILES.medium.bloomThreshold,
    );
    this.bloom.enabled = false;
    this.resizeBloom();

    this.grade = new ShaderPass(CinematicGradeShader);
    this.output = new OutputPass();
    this.fxaa = new FXAAPass();
    // FXAA only compensates for the missing MSAA path on mobile/WebGL1.
    this.fxaa.enabled = samples === 0;

    this.composer.addPass(new RenderPass(scene, camera));
    this.composer.addPass(this.bloom);
    this.composer.addPass(this.grade);
    this.composer.addPass(this.output);
    this.composer.addPass(this.fxaa);

    this.updateGradeResolution();
  }

  /** Bloom runs at half resolution: 4x cheaper and visually identical once blurred. */
  private get bloomWidth(): number {
    return Math.max(1, Math.round(this.width * this.pixelRatio * 0.5));
  }

  private get bloomHeight(): number {
    return Math.max(1, Math.round(this.height * this.pixelRatio * 0.5));
  }

  private resizeBloom(): void {
    this.bloom.setSize(this.bloomWidth, this.bloomHeight);
  }

  get active(): boolean {
    return this.quality !== 'off';
  }

  setQuality(quality: CinematicPostQuality): void {
    if (this.quality === quality) return;
    this.quality = quality;

    if (quality === 'off') {
      this.bloom.enabled = false;
      return;
    }

    const profile = QUALITY_PROFILES[quality];
    this.bloom.enabled = profile.bloom;
    this.bloom.strength = profile.bloomStrength;
    this.bloom.radius = profile.bloomRadius;
    this.bloom.threshold = profile.bloomThreshold;

    this.grade.uniforms.uVignette.value = profile.vignette;
    this.grade.uniforms.uSaturation.value = profile.saturation;
    this.grade.uniforms.uContrast.value = profile.contrast;
    this.grade.uniforms.uSharpen.value = profile.sharpen;
    this.grade.uniforms.uWarmth.value = profile.warmth;

    this.fxaa.enabled = this.msaaSamples === 0;
  }

  setPixelRatio(pixelRatio: number): void {
    const next = Math.max(0.5, pixelRatio);
    if (Math.abs(next - this.pixelRatio) < 0.001) return;
    this.pixelRatio = next;
    this.composer.setPixelRatio(next);
    this.resizeBloom();
    this.updateGradeResolution();
  }

  setSize(width: number, height: number): void {
    const nextWidth = Math.max(1, Math.round(width));
    const nextHeight = Math.max(1, Math.round(height));
    if (nextWidth === this.width && nextHeight === this.height) {
      this.updateGradeResolution();
      return;
    }
    this.width = nextWidth;
    this.height = nextHeight;
    this.composer.setSize(nextWidth, nextHeight);
    this.resizeBloom();
    this.updateGradeResolution();
  }

  /** Renders the cinematic chain. Returns false when the caller should render directly. */
  render(): boolean {
    if (this.quality === 'off') return false;
    this.composer.render();
    return true;
  }

  dispose(): void {
    this.bloom.dispose();
    this.grade.dispose();
    this.fxaa.dispose();
    this.output.material.dispose();
    this.composer.dispose();
    this.quality = 'off';
  }

  private updateGradeResolution(): void {
    const width = Math.max(1, Math.round(this.width * this.pixelRatio));
    const height = Math.max(1, Math.round(this.height * this.pixelRatio));
    (this.grade.uniforms.uResolution.value as THREE.Vector2).set(width, height);
  }
}
