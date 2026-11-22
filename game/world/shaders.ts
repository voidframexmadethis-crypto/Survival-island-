import * as THREE from 'three';

export { ensureGeometryHasUv, applySafeStandardMaps } from './textures';

export type ShaderSurfaceMode = 'terrain' | 'foliage' | 'grass' | 'palm_frond' | 'rock' | 'wood';

export interface EnvironmentShaderUniforms {
  uShaderTime: { value: number };
  uShaderSunDir: { value: THREE.Vector3 };
  uShaderSunColor: { value: THREE.Color };
  uShaderSkyColor: { value: THREE.Color };
  uShaderDaylight: { value: number };
  uShaderQuality: { value: number }; // 0 = Low, 1 = Medium, 2 = High
  /** 0 = dry, 1 = fully rain-soaked surfaces. */
  uShaderWetness: { value: number };
}

const SHARED_UNIFORMS: EnvironmentShaderUniforms = {
  uShaderTime: { value: 0 },
  uShaderSunDir: { value: new THREE.Vector3(0.4, 0.85, 0.35).normalize() },
  uShaderSunColor: { value: new THREE.Color(0xfff1d6) },
  uShaderSkyColor: { value: new THREE.Color(0x7cc4e0) },
  uShaderDaylight: { value: 1.0 },
  uShaderQuality: { value: 1.0 },
  uShaderWetness: { value: 0 },
};

/** Globally drives rain wetness across terrain, rock, wood and foliage. */
export function setShaderWetness(wetness: number): void {
  SHARED_UNIFORMS.uShaderWetness.value = Math.max(0, Math.min(1, wetness));
}

export function updateShaderEnvironment(
  elapsed: number,
  sunDir: THREE.Vector3,
  sunColor: THREE.Color,
  skyColor: THREE.Color,
  daylight: number,
  qualityTier: number,
): void {
  SHARED_UNIFORMS.uShaderTime.value = elapsed;
  SHARED_UNIFORMS.uShaderSunDir.value.copy(sunDir).normalize();
  SHARED_UNIFORMS.uShaderSunColor.value.copy(sunColor);
  SHARED_UNIFORMS.uShaderSkyColor.value.copy(skyColor);
  SHARED_UNIFORMS.uShaderDaylight.value = daylight;
  SHARED_UNIFORMS.uShaderQuality.value = qualityTier;
}

const enhancedMaterialKeys = new WeakSet<THREE.Material>();

/**
 * Enhances Three.js MeshStandardMaterial with lightweight, mobile-friendly
 * Minecraft-shader-inspired visual depth:
 * - World-space micro-detail & grounding ambient occlusion
 * - Foliage wind sway + sunlit subsurface leaf translucency
 * - Atmospheric sun rim & wet shoreline darkening
 * Supports both regular Mesh and InstancedMesh cleanly.
 */
export function enhanceSurfaceMaterial<T extends THREE.MeshStandardMaterial>(
  material: T,
  mode: ShaderSurfaceMode,
  windAmplitude = 0.045,
): T {
  if (enhancedMaterialKeys.has(material)) return material;
  enhancedMaterialKeys.add(material);
  material.userData.surfaceMode = mode;

  // Grass and palm fronds share the foliage lighting model (soft translucent
  // leaves) but each needs its own wind mask: blades sway from the root up,
  // while a frond pivots from the crown so its outer leaflets travel furthest.
  const isFoliage = mode === 'foliage' || mode === 'grass' || mode === 'palm_frond';
  const windMaskExpr =
    mode === 'grass'
      ? 'clamp(position.y * 0.95 + 0.28, 0.0, 1.55)'
      : mode === 'palm_frond'
        ? 'clamp(0.10 + length(position.xz) * 1.15, 0.0, 1.5)'
        : 'clamp(position.y * 0.45 + 0.55, 0.0, 1.4)';

  material.customProgramCacheKey = () => `si_env_${mode}`;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShaderTime = SHARED_UNIFORMS.uShaderTime;
    shader.uniforms.uShaderSunDir = SHARED_UNIFORMS.uShaderSunDir;
    shader.uniforms.uShaderSunColor = SHARED_UNIFORMS.uShaderSunColor;
    shader.uniforms.uShaderSkyColor = SHARED_UNIFORMS.uShaderSkyColor;
    shader.uniforms.uShaderDaylight = SHARED_UNIFORMS.uShaderDaylight;
    shader.uniforms.uShaderQuality = SHARED_UNIFORMS.uShaderQuality;
    shader.uniforms.uShaderWetness = SHARED_UNIFORMS.uShaderWetness;

    shader.vertexShader = shader.vertexShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uShaderTime;
uniform float uShaderQuality;
varying vec3 vSiWorldPos;
varying vec3 vSiWorldNormal;
varying float vSiLocalY;
`,
      )
      .replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
vSiLocalY = position.y;
vec4 siInstancePos = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  siInstancePos = instanceMatrix * siInstancePos;
#endif
vec4 siWorldPosPre = modelMatrix * siInstancePos;
${
  isFoliage
    ? `if (uShaderQuality >= 0.5) {
  vec3 siWindCamDelta = cameraPosition - siWorldPosPre.xyz;
  if (dot(siWindCamDelta, siWindCamDelta) < (uShaderQuality >= 2.0 ? 16900.0 : 8100.0)) {
    float windMask = ${windMaskExpr};
    float wavePhase = siWorldPosPre.x * 0.55 + siWorldPosPre.z * 0.45 + uShaderTime * 1.85;
    float gust = sin(wavePhase) * ${windAmplitude.toFixed(4)} + cos(wavePhase * 1.65) * ${(windAmplitude * 0.4).toFixed(4)};
    float flutter = sin(wavePhase * 3.35 + position.x * 4.2 + position.z * 2.6) * ${(windAmplitude * (mode === 'grass' ? 0.34 : 0.22)).toFixed(4)};
    transformed.x += (gust + flutter) * windMask;
    transformed.z += sin(wavePhase * 0.8 + 1.2) * ${(windAmplitude * 0.65).toFixed(4)} * windMask;
  }
}`
    : ''
}
`,
      )
      .replace(
        '#include <worldpos_vertex>',
        `#include <worldpos_vertex>
vec4 siWp = vec4(transformed, 1.0);
#ifdef USE_INSTANCING
  siWp = instanceMatrix * siWp;
#endif
siWp = modelMatrix * siWp;
vSiWorldPos = siWp.xyz;
vec3 siNorm = normal;
#ifdef USE_INSTANCING
  siNorm = mat3(instanceMatrix) * siNorm;
#endif
vSiWorldNormal = normalize(mat3(modelMatrix) * siNorm);
`,
      );

    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uShaderTime;
uniform vec3 uShaderSunDir;
uniform vec3 uShaderSunColor;
uniform vec3 uShaderSkyColor;
uniform float uShaderDaylight;
uniform float uShaderQuality;
uniform float uShaderWetness;
varying vec3 vSiWorldPos;
varying vec3 vSiWorldNormal;
varying float vSiLocalY;

float siHash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float siNoise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float a = siHash(i);
  float b = siHash(i + vec2(1.0, 0.0));
  float c = siHash(i + vec2(0.0, 1.0));
  float d = siHash(i + vec2(1.0, 1.0));
  return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
}
`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `#include <roughnessmap_fragment>
${
  mode === 'terrain'
    ? `if (uShaderQuality >= 0.5) {
  float swash = 0.24 * sin(uShaderTime * 1.45 - vSiWorldPos.x * 0.08 + vSiWorldPos.z * 0.05);
  float shoreWetMask = (1.0 - smoothstep(-0.04, 1.42 + swash, max(-0.1, vSiWorldPos.y))) * smoothstep(-0.45, 0.04, vSiWorldPos.y);
  roughnessFactor = mix(roughnessFactor, 0.045, clamp(shoreWetMask, 0.0, 1.0) * 0.95);
}`
    : mode === 'rock'
      ? `if (uShaderQuality >= 0.5) {
  float rockWet = 1.0 - smoothstep(0.15, 1.65, max(0.0, vSiWorldPos.y));
  roughnessFactor = mix(roughnessFactor, 0.10, clamp(rockWet, 0.0, 1.0) * 0.86);
}`
      : ''
}
if (uShaderWetness > 0.001) {
  float wetUp = clamp(vSiWorldNormal.y * 0.5 + 0.5, 0.0, 1.0);
  float rainRough = ${isFoliage ? '0.36' : mode === 'wood' ? '0.16' : '0.06'};
  float rainStrength = uShaderWetness * mix(0.55, 1.0, wetUp) * ${isFoliage ? '0.5' : '0.92'};
  roughnessFactor = mix(roughnessFactor, rainRough, rainStrength);
}
`,
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
if (uShaderQuality >= 0.5) {
  vec3 siN = normalize(vSiWorldNormal);
  vec3 siCamVec = cameraPosition - vSiWorldPos;
  float siDistSq = dot(siCamVec, siCamVec);
  vec3 siView = siCamVec * inversesqrt(max(0.0001, siDistSq));
  float siNearDetail = siDistSq < (uShaderQuality >= 1.5 ? 16900.0 : 8100.0) ? 1.0 : 0.0;
  ${
    mode === 'terrain'
      ? `
  float slopeUp = clamp(siN.y, 0.0, 1.0);
  float valleyAo = mix(0.74, 1.09, smoothstep(0.32, 0.96, slopeUp));
  if (siNearDetail > 0.5) {
    // Crisp multi-scale micro-grain, coastal wind ripples, valley AO, meadow soil mottling & glistening wet shoreline
    float macroTex = siNoise(vSiWorldPos.xz * 0.14);
    float midTex = siNoise(vSiWorldPos.xz * 1.15);
    float fineTex = siNoise(vSiWorldPos.xz * 4.8);
    float rippleBand = 0.5 + 0.5 * sin(vSiWorldPos.x * 2.3 + vSiWorldPos.z * 0.95 + macroTex * 4.2);
    float sandElevMask = 1.0 - smoothstep(1.2, 4.4, max(0.0, vSiWorldPos.y));
    float meadowMask = smoothstep(2.0, 4.2, vSiWorldPos.y) * smoothstep(0.55, 0.88, siN.y);
    float soilMottle = smoothstep(0.54, 0.78, siNoise(vSiWorldPos.xz * 0.38)) * meadowMask;
    float detailMod = 0.88 + macroTex * 0.12 + midTex * 0.08 + fineTex * 0.06 + (rippleBand - 0.5) * 0.06 * sandElevMask;
    diffuseColor.rgb *= valleyAo * detailMod;
    diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.56, 0.48, 0.34), soilMottle * 0.52);
  } else {
    diffuseColor.rgb *= valleyAo * 0.98;
  }
  float swashColor = 0.24 * sin(uShaderTime * 1.45 - vSiWorldPos.x * 0.08 + vSiWorldPos.z * 0.05);
  float shoreWet = (1.0 - smoothstep(-0.04, 1.35 + swashColor, max(-0.1, vSiWorldPos.y))) * smoothstep(-0.5, 0.02, vSiWorldPos.y);
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.42, 0.40, 0.38), clamp(shoreWet, 0.0, 1.0) * 0.84);
  `
      : isFoliage
        ? `
  float canopyAo = mix(0.50, 1.18, clamp(siN.y * 0.5 + 0.54, 0.0, 1.0));
  ${
    mode === 'grass'
      ? `// Baked contact shadow grounds each blade clump into the terrain.
  canopyAo *= mix(0.58, 1.0, smoothstep(0.0, 0.6, vSiLocalY));
  `
      : ''
  }
  if (siNearDetail > 0.5) {
    float leafVar = siNoise(vSiWorldPos.xz * 0.85 + vSiWorldPos.y * 0.6) * 0.62 + siNoise(vSiWorldPos.xz * 2.4 + vSiWorldPos.y * 1.7) * 0.38;
    diffuseColor.rgb *= canopyAo * (0.86 + leafVar * 0.28);
  } else {
    diffuseColor.rgb *= canopyAo;
  }
  float sunFront = max(0.0, dot(siN, uShaderSunDir));
  float backLight = pow(max(0.0, dot(siView, -uShaderSunDir)), 1.55) * (0.45 + 0.55 * max(0.0, siN.y * 0.5 + 0.5));
  float transStrength = (backLight * 0.92 + sunFront * 0.28) * uShaderDaylight * (uShaderQuality >= 1.5 ? 0.90 : 0.64);
  diffuseColor.rgb += mix(uShaderSunColor, vec3(0.92, 1.0, 0.48), 0.24) * diffuseColor.rgb * transStrength;
  `
        : mode === 'rock'
          ? `
  float rockAo = mix(0.68, 1.06, clamp(vSiLocalY * 0.45 + 0.55, 0.0, 1.0));
  if (siNearDetail > 0.5) {
    float strata = 0.5 + 0.5 * sin(vSiWorldPos.y * 2.6 + siNoise(vSiWorldPos.xz * 0.45) * 3.2);
    float rockGrain = siNoise(vSiWorldPos.xz * 1.9 + vSiWorldPos.y * 1.5);
    diffuseColor.rgb *= rockAo * (0.82 + rockGrain * 0.24 + strata * 0.07);
    float mossMask = smoothstep(0.58, 0.92, siN.y) * smoothstep(0.9, 2.0, vSiWorldPos.y) * (1.0 - smoothstep(10.0, 16.0, vSiWorldPos.y));
    float mossPatch = smoothstep(0.38, 0.70, siNoise(vSiWorldPos.xz * 0.72));
    diffuseColor.rgb = mix(diffuseColor.rgb, vec3(0.24, 0.42, 0.14), mossMask * mossPatch * 0.72);
  } else {
    diffuseColor.rgb *= rockAo * 0.96;
  }
  float rockShoreWet = 1.0 - smoothstep(0.1, 1.55, max(0.0, vSiWorldPos.y));
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.36, 0.37, 0.40), clamp(rockShoreWet, 0.0, 1.0) * 0.78);
  `
          : `
  float contactAo = mix(0.66, 1.05, smoothstep(-0.2, 1.2, vSiLocalY));
  if (siNearDetail > 0.5) {
    float woodGrain = siNoise(vec2(vSiWorldPos.x * 1.5 + vSiWorldPos.z * 1.5, vSiWorldPos.y * 2.8));
    diffuseColor.rgb *= contactAo * (0.88 + woodGrain * 0.22);
  } else {
    diffuseColor.rgb *= contactAo * 0.98;
  }
  `
  }
}
if (uShaderWetness > 0.001) {
  float rainDarken = ${isFoliage ? '0.07' : mode === 'wood' ? '0.16' : '0.24'};
  diffuseColor.rgb *= 1.0 - uShaderWetness * rainDarken;
}
`,
      )
      .replace(
        '#include <dithering_fragment>',
        `if (uShaderQuality >= 0.5) {
  vec3 siNEnd = normalize(vSiWorldNormal);
  vec3 siViewEnd = normalize(cameraPosition - vSiWorldPos);
  float skyFill = clamp(siNEnd.y * 0.5 + 0.5, 0.0, 1.0);
  float fresnelRim = pow(1.0 - max(0.0, dot(siNEnd, siViewEnd)), 3.4);
  gl_FragColor.rgb += uShaderSkyColor * (0.015 + 0.025 * skyFill) * (0.35 + 0.65 * uShaderDaylight);
  gl_FragColor.rgb += uShaderSunColor * fresnelRim * uShaderDaylight * ${(isFoliage ? 0.125 : 0.058).toFixed(3)};
  ${
    mode === 'terrain'
      ? `
  // Mirror-like golden-hour sun path sheen across wet shoreline sand
  float shoreGlintMask = (1.0 - smoothstep(0.0, 1.38, max(0.0, vSiWorldPos.y))) * smoothstep(-0.25, 0.04, vSiWorldPos.y);
  if (shoreGlintMask > 0.01) {
    vec3 wetHalf = normalize(uShaderSunDir + siViewEnd);
    float wetSpec = pow(max(0.0, dot(siNEnd, wetHalf)), 46.0);
    float wetBroad = pow(max(0.0, dot(siNEnd, wetHalf)), 11.0);
    float wetFresnel = 0.18 + 0.82 * pow(1.0 - max(0.0, dot(siNEnd, siViewEnd)), 2.8);
    gl_FragColor.rgb += uShaderSunColor * (wetSpec * 0.88 + wetBroad * 0.22) * wetFresnel * shoreGlintMask * uShaderDaylight;
  }
  `
      : ''
  }
}
#include <dithering_fragment>`,
      );
  };

  material.needsUpdate = true;
  return material;
}
