import * as THREE from 'three';

export type ShaderSurfaceMode = 'terrain' | 'foliage' | 'rock' | 'wood';

export interface EnvironmentShaderUniforms {
  uShaderTime: { value: number };
  uShaderSunDir: { value: THREE.Vector3 };
  uShaderSunColor: { value: THREE.Color };
  uShaderSkyColor: { value: THREE.Color };
  uShaderDaylight: { value: number };
  uShaderQuality: { value: number }; // 0 = Low, 1 = Medium, 2 = High
}

const SHARED_UNIFORMS: EnvironmentShaderUniforms = {
  uShaderTime: { value: 0 },
  uShaderSunDir: { value: new THREE.Vector3(0.4, 0.85, 0.35).normalize() },
  uShaderSunColor: { value: new THREE.Color(0xfff1d6) },
  uShaderSkyColor: { value: new THREE.Color(0x7cc4e0) },
  uShaderDaylight: { value: 1.0 },
  uShaderQuality: { value: 1.0 },
};

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

  material.customProgramCacheKey = () => `si_env_${mode}`;

  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShaderTime = SHARED_UNIFORMS.uShaderTime;
    shader.uniforms.uShaderSunDir = SHARED_UNIFORMS.uShaderSunDir;
    shader.uniforms.uShaderSunColor = SHARED_UNIFORMS.uShaderSunColor;
    shader.uniforms.uShaderSkyColor = SHARED_UNIFORMS.uShaderSkyColor;
    shader.uniforms.uShaderDaylight = SHARED_UNIFORMS.uShaderDaylight;
    shader.uniforms.uShaderQuality = SHARED_UNIFORMS.uShaderQuality;

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
  mode === 'foliage'
    ? `if (uShaderQuality >= 0.5) {
  float windMask = clamp(position.y * 0.45 + 0.55, 0.0, 1.4);
  float wavePhase = siWorldPosPre.x * 0.55 + siWorldPosPre.z * 0.45 + uShaderTime * 1.85;
  float gust = sin(wavePhase) * ${windAmplitude.toFixed(4)} + cos(wavePhase * 1.65) * ${(windAmplitude * 0.4).toFixed(4)};
  transformed.x += gust * windMask;
  transformed.z += sin(wavePhase * 0.8 + 1.2) * ${(windAmplitude * 0.65).toFixed(4)} * windMask;
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
uniform vec3 uShaderSunDir;
uniform vec3 uShaderSunColor;
uniform vec3 uShaderSkyColor;
uniform float uShaderDaylight;
uniform float uShaderQuality;
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
        '#include <color_fragment>',
        `#include <color_fragment>
if (uShaderQuality >= 0.5) {
  vec3 siN = normalize(vSiWorldNormal);
  vec3 siView = normalize(cameraPosition - vSiWorldPos);
  ${
    mode === 'terrain'
      ? `
  // Crisp micro-grain & valley crevice AO + wet shoreline shading
  float macroTex = siNoise(vSiWorldPos.xz * 0.14);
  float microTex = siNoise(vSiWorldPos.xz * 1.15);
  float slopeUp = clamp(siN.y, 0.0, 1.0);
  float valleyAo = mix(0.84, 1.04, smoothstep(0.35, 0.96, slopeUp));
  float detailMod = 0.93 + macroTex * 0.09 + microTex * 0.05;
  diffuseColor.rgb *= valleyAo * detailMod;
  // Subtle damp sand darkening just above ocean level
  float shoreWet = 1.0 - smoothstep(0.0, 0.72, max(0.0, vSiWorldPos.y));
  diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb * vec3(0.68, 0.70, 0.74), shoreWet * 0.55);
  `
      : mode === 'foliage'
        ? `
  // Rich foliage depth: darkened inner canopy underside + warm sunlit leaf translucency
  float leafVar = siNoise(vSiWorldPos.xz * 0.85 + vSiWorldPos.y * 0.6);
  float canopyAo = mix(0.74, 1.06, clamp(siN.y * 0.5 + 0.52, 0.0, 1.0));
  diffuseColor.rgb *= canopyAo * (0.91 + leafVar * 0.16);
  float backLight = pow(max(0.0, dot(siView, -uShaderSunDir)), 2.2) * (0.35 + 0.65 * max(0.0, siN.y * 0.5 + 0.5));
  diffuseColor.rgb += uShaderSunColor * diffuseColor.rgb * backLight * uShaderDaylight * (uShaderQuality >= 1.5 ? 0.52 : 0.36);
  `
        : mode === 'rock'
          ? `
  // Faceted rock micro-grain + crevice ambient occlusion
  float rockGrain = siNoise(vSiWorldPos.xz * 1.6 + vSiWorldPos.y * 1.3);
  float rockAo = mix(0.78, 1.05, clamp(vSiLocalY * 0.45 + 0.55, 0.0, 1.0));
  diffuseColor.rgb *= rockAo * (0.88 + rockGrain * 0.2);
  `
          : `
  // Bark / wood base contact AO + subtle sunlit edge lift
  float woodGrain = siNoise(vec2(vSiWorldPos.x + vSiWorldPos.z, vSiWorldPos.y * 2.2));
  float contactAo = mix(0.76, 1.03, smoothstep(-0.2, 0.8, vSiLocalY));
  diffuseColor.rgb *= contactAo * (0.91 + woodGrain * 0.14);
  `
  }
}
`,
      )
      .replace(
        '#include <dithering_fragment>',
        `if (uShaderQuality >= 0.5) {
  vec3 siNEnd = normalize(vSiWorldNormal);
  vec3 siViewEnd = normalize(cameraPosition - vSiWorldPos);
  // Subtle sky hemisphere bounce & golden-hour rim lift so night/shadows stay sculpted
  float skyFill = clamp(siNEnd.y * 0.5 + 0.5, 0.0, 1.0);
  float fresnelRim = pow(1.0 - max(0.0, dot(siNEnd, siViewEnd)), 3.5);
  gl_FragColor.rgb += uShaderSkyColor * (0.015 + 0.025 * skyFill) * (0.35 + 0.65 * uShaderDaylight);
  gl_FragColor.rgb += uShaderSunColor * fresnelRim * uShaderDaylight * ${(mode === 'foliage' ? 0.075 : 0.045).toFixed(3)};
}
#include <dithering_fragment>`,
      );
  };

  material.needsUpdate = true;
  return material;
}
