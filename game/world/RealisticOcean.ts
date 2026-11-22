/**
 * SURVIVAL ISLAND: LOST WORLD
 * FEATURE 11–13: REALISTIC OCEAN SYSTEM
 *
 * STRICT INTEGRATION RULES:
 * - Preserve all existing game features.
 * - Do not replace the existing island, terrain, player,
 *   camera, controls, or scene.
 * - Integrate this as an additional ocean system.
 * - Reuse the existing Three.js renderer and scene.
 * - Do not create a second renderer or animation loop.
 */

import * as THREE from "three";

const _dayDeepColor = new THREE.Color("#042744");
const _dayShallowColor = new THREE.Color("#0fc4ad");

const SHORE_TEX_SIZE = 512;
// Includes the separated Louisiana landmass and the open-water gap.
const SHORE_WORLD_HALF = 2400;

export class RealisticOcean {
  private water: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.PlaneGeometry;
  private shoreHeightTex: THREE.DataTexture | null = null;
  private time = 0;

  constructor(
    private scene: THREE.Scene,
    private width = 6400,
    private height = 6400,
    segments = 72
  ) {
    this.geometry = new THREE.PlaneGeometry(
      width,
      height,
      segments,
      segments
    );

    const fallbackData = new Uint8Array([0, 0, 0, 255]);
    const fallbackTex = new THREE.DataTexture(fallbackData, 1, 1, THREE.RGBAFormat);
    fallbackTex.needsUpdate = true;
    this.shoreHeightTex = fallbackTex;

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: {
          value: new THREE.Color("#042744")
        },
        uShallowColor: {
          value: new THREE.Color("#0fc4ad")
        },
        uSunDirection: {
          value: new THREE.Vector3(0.3, 0.8, 0.4).normalize()
        },
        uSunColor: {
          value: new THREE.Color("#fff3d6")
        },
        uSkyColor: {
          value: new THREE.Color("#7cc4e0")
        },
        uFogColor: {
          value: new THREE.Color("#7cc4e0")
        },
        uFogDensity: { value: 0.0034 },
        uDaylight: { value: 1.0 },
        uReflectionStrength: { value: 1.0 },
        uDetailLevel: { value: 1.0 },
        uShoreHeightTex: { value: fallbackTex },
        uHasShoreTex: { value: 0.0 },
      },

      vertexShader: `
        uniform float uTime;
        varying vec2 vUv;
        varying float vWave;
        varying vec3 vWorldPos;
        varying vec3 vWaveNormal;

        void main() {
          vUv = uv;

          vec3 pos = position;

          float wave1 = sin(pos.x * 0.035 + uTime * 1.15);
          float wave2 = cos(pos.y * 0.048 + uTime * 0.85);
          float wave3 = sin((pos.x + pos.y) * 0.019 + uTime * 0.58);

          float displacement =
            wave1 * 0.34 +
            wave2 * 0.22 +
            wave3 * 0.26;

          pos.z += displacement;
          vWave = displacement;

          float dWdX =
            cos(pos.x * 0.035 + uTime * 1.15) * 0.035 * 0.34 +
            cos((pos.x + pos.y) * 0.019 + uTime * 0.58) * 0.019 * 0.26;
          float dWdY =
            -sin(pos.y * 0.048 + uTime * 0.85) * 0.048 * 0.22 +
            cos((pos.x + pos.y) * 0.019 + uTime * 0.58) * 0.019 * 0.26;

          vec3 localN = normalize(vec3(-dWdX, -dWdY, 1.0));
          vWaveNormal = normalize(mat3(modelMatrix) * localN);

          vec4 worldPosition = modelMatrix * vec4(pos, 1.0);
          vWorldPos = worldPosition.xyz;

          gl_Position =
            projectionMatrix *
            viewMatrix *
            worldPosition;
        }
      `,

      fragmentShader: `
        uniform float uTime;
        uniform vec3 uDeepColor;
        uniform vec3 uShallowColor;
        uniform vec3 uSunDirection;
        uniform vec3 uSunColor;
        uniform vec3 uSkyColor;
        uniform vec3 uFogColor;
        uniform float uFogDensity;
        uniform float uDaylight;
        uniform float uReflectionStrength;
        uniform float uDetailLevel;
        uniform sampler2D uShoreHeightTex;
        uniform float uHasShoreTex;

        varying vec2 vUv;
        varying float vWave;
        varying vec3 vWorldPos;
        varying vec3 vWaveNormal;

        float wHash(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
        }

        // Analytic 2D value-noise with exact (value, d/dx, d/dz) in a single 4-corner lookup (~3x faster on mobile GPUs than finite differences)
        vec3 wNoiseDeriv(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          vec2 u = f * f * (3.0 - 2.0 * f);
          vec2 du = 6.0 * f * (1.0 - f);

          float a = wHash(i);
          float b = wHash(i + vec2(1.0, 0.0));
          float c = wHash(i + vec2(0.0, 1.0));
          float d = wHash(i + vec2(1.0, 1.0));

          float k0 = a;
          float k1 = b - a;
          float k2 = c - a;
          float k3 = a - b - c + d;

          float val = k0 + k1 * u.x + k2 * u.y + k3 * u.x * u.y;
          vec2 deriv = du * vec2(k1 + k3 * u.y, k2 + k3 * u.x);
          return vec3(val, deriv);
        }

        float wNoise(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          return mix(
            mix(wHash(i), wHash(i + vec2(1.0, 0.0)), f.x),
            mix(wHash(i + vec2(0.0, 1.0)), wHash(i + vec2(1.0, 1.0)), f.x),
            f.y
          );
        }

        vec3 computeWaveNormal(vec2 xz, float t, float viewDist) {
          float distAtten = 1.0 - smoothstep(95.0, 235.0, viewDist);
          float detailLod = distAtten * uDetailLevel;
          if (detailLod <= 0.04) {
            return normalize(vWaveNormal);
          }

          vec2 p1 = xz * 0.38 + vec2(t * 0.32, -t * 0.24);
          vec2 p2 = xz * 0.92 + vec2(-t * 0.41, t * 0.29);

          vec3 n1 = wNoiseDeriv(p1);
          vec3 n2 = wNoiseDeriv(p2);
          vec2 grad = n1.yz * (0.55 * 0.38) + n2.yz * (0.32 * 0.92);

          if (detailLod > 0.65) {
            vec2 p3 = xz * 2.15 + vec2(t * 0.55, t * 0.38);
            vec3 n3 = wNoiseDeriv(p3);
            grad += n3.yz * (0.14 * 2.15);
          }

          float s1 = sin(xz.x * 1.35 + xz.y * 0.55 + t * 2.5);
          float s2 = cos(xz.y * 1.65 - xz.x * 0.45 - t * 2.1);
          grad += vec2(s1, s2) * 0.11;

          return normalize(vWaveNormal + vec3(-grad.x, 0.0, -grad.y) * (0.34 + 0.42 * uReflectionStrength) * detailLod);
        }

        void main() {
          vec3 camDelta = cameraPosition - vWorldPos;
          float viewDist = length(camDelta);

          // Sample island shore height map when inside island bounds [-960, 960]
          float waterDepth = 4.5;
          if (uHasShoreTex > 0.5) {
            vec2 shoreUv = vWorldPos.xz / 1920.0 + 0.5;
            if (shoreUv.x >= 0.0 && shoreUv.x <= 1.0 && shoreUv.y >= 0.0 && shoreUv.y <= 1.0) {
              float normH = texture2D(uShoreHeightTex, shoreUv).r;
              float terrainY = normH * 16.0 - 6.0;
              waterDepth = max(0.0, 0.0 - terrainY);
            }
          } else {
            float distFromCenter = length(vWorldPos.xz);
            waterDepth = smoothstep(420.0, 740.0, distFromCenter) * 4.5;
          }

          float depthT = smoothstep(0.0, 3.8, waterDepth);
          vec3 sandSeabedTint = vec3(0.46, 0.44, 0.34) * (0.35 + 0.65 * uDaylight);
          vec3 waterBody = mix(uShallowColor, uDeepColor, depthT);
          float shallowMask = 1.0 - smoothstep(0.05, 1.9, waterDepth);
          vec3 waterColor = mix(waterBody, mix(sandSeabedTint, waterBody, 0.62), shallowMask * 0.66);

          vec3 N = computeWaveNormal(vWorldPos.xz, uTime, viewDist);
          vec3 V = camDelta / max(0.001, viewDist);
          vec3 L = normalize(uSunDirection);
          vec3 H = normalize(L + V);

          float ndv = max(0.001, dot(N, V));
          float ndl = max(0.0, dot(N, L));
          // Schlick Fresnel reflection
          float fresnel = 0.03 + 0.97 * pow(1.0 - ndv, 3.6);
          float specSharp = pow(max(0.0, dot(N, H)), mix(140.0, 280.0, uReflectionStrength));
          float specRibbon = pow(max(0.0, dot(N, H)), 34.0);
          float specSheen = pow(max(0.0, dot(N, H)), 12.0);

          waterColor *= (0.44 + 0.56 * uDaylight) + ndl * 0.30 * uDaylight;

          // Reflected sky: darker zenith tint at steep angles, hazier horizon at
          // grazing angles (a cheap but convincing stand-in for an env probe).
          vec3 R = reflect(-V, N);
          float reflUp = clamp(R.y, 0.0, 1.0);
          vec3 reflSky = mix(uFogColor, uSkyColor, pow(reflUp, 0.55));
          waterColor = mix(
            waterColor,
            reflSky,
            clamp(fresnel * (0.52 + 0.42 * uReflectionStrength), 0.0, 0.90)
          );

          // Restrained sun glitter: realistic highlight energy instead of the
          // previous over-driven bloom-like ribbon.
          waterColor += uSunColor * specSharp * (0.62 + 0.5 * uReflectionStrength) * (0.30 + 0.78 * uDaylight);
          waterColor += uSunColor * specRibbon * 0.30 * uReflectionStrength * uDaylight;
          waterColor += uSunColor * specSheen * 0.09 * uReflectionStrength * uDaylight;

          // Animated lacy shoreline surf foam where water meets sandy shore + near-field crest foam
          float shallowBand = 1.0 - smoothstep(0.02, 0.92, waterDepth);
          float totalFoam = 0.0;
          if (shallowBand > 0.01 || (viewDist < 200.0 && uDetailLevel > 0.42)) {
            float surfNoise = wNoise(vWorldPos.xz * 0.82 - vec2(uTime * 0.44, uTime * 0.36));
            float surfLace = (viewDist < 135.0 && uDetailLevel > 0.52)
              ? wNoise(vWorldPos.xz * 2.35 + vec2(uTime * 0.25, -uTime * 0.18))
              : surfNoise;
            float shoreWave1 = 0.5 + 0.5 * sin(waterDepth * 10.8 - uTime * 2.55 + surfNoise * 3.4);
            float shoreWave2 = 0.5 + 0.5 * sin(waterDepth * 17.5 - uTime * 3.15 + surfLace * 2.6);
            float shoreFoam = shallowBand * smoothstep(0.28, 0.80, surfNoise * 0.65 + surfLace * 0.25 + shoreWave1 * 0.40 + shoreWave2 * 0.24);
            float edgeSurge = (1.0 - smoothstep(0.0, 0.24, waterDepth)) * smoothstep(0.25, 0.70, surfLace);
            float crestFade = 1.0 - smoothstep(90.0, 200.0, viewDist);
            float crestFoam = smoothstep(0.48, 0.76, abs(vWave)) * smoothstep(0.42, 0.78, surfNoise) * 0.34 * crestFade;
            totalFoam = clamp(shoreFoam * 0.92 + edgeSurge * 0.80 + crestFoam, 0.0, 1.0);
            vec3 foamColor = mix(vec3(0.45, 0.54, 0.65), mix(vec3(0.98, 0.99, 1.0), uSunColor, 0.28), uDaylight);
            waterColor = mix(waterColor, foamColor, totalFoam * 0.84);
          }

          // Exponential horizon fog matching scene.fog
          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * viewDist * viewDist);
          waterColor = mix(waterColor, uFogColor, clamp(fogFactor, 0.0, 1.0));

          float alpha = mix(0.68, 0.95, smoothstep(0.0, 1.25, waterDepth));
          alpha = max(alpha, totalFoam * 0.94);
          gl_FragColor = vec4(waterColor, clamp(alpha, 0.46, 0.96));
        }
      `,

      transparent: true
    });

    this.water = new THREE.Mesh(
      this.geometry,
      this.material
    );

    this.water.rotation.x = -Math.PI / 2;
    this.water.position.y = 0;
    this.water.name = 'realistic_ocean';
    this.water.userData.noShadowCast = true;
    this.water.userData.noShadowReceive = true;

    this.scene.add(this.water);
  }

  public buildShoreDepthTexture(
    heightSampler: (x: number, z: number) => number,
  ): void {
    const size = SHORE_TEX_SIZE;
    const data = new Uint8Array(size * size * 4);
    for (let y = 0; y < size; y++) {
      const z = (y / (size - 1) - 0.5) * SHORE_WORLD_HALF * 2;
      for (let x = 0; x < size; x++) {
        const wx = (x / (size - 1) - 0.5) * SHORE_WORLD_HALF * 2;
        const h = heightSampler(wx, z);
        const clamped = Math.max(-6, Math.min(10, h));
        const enc = Math.round(((clamped + 6) / 16) * 255);
        const idx = (y * size + x) * 4;
        data[idx] = enc;
        data[idx + 1] = enc;
        data[idx + 2] = enc;
        data[idx + 3] = 255;
      }
    }

    if (this.shoreHeightTex) {
      this.shoreHeightTex.dispose();
    }
    const tex = new THREE.DataTexture(data, size, size, THREE.RGBAFormat);
    tex.wrapS = THREE.ClampToEdgeWrapping;
    tex.wrapT = THREE.ClampToEdgeWrapping;
    tex.minFilter = THREE.LinearFilter;
    tex.magFilter = THREE.LinearFilter;
    tex.colorSpace = THREE.NoColorSpace;
    tex.needsUpdate = true;

    this.shoreHeightTex = tex;
    this.material.uniforms.uShoreHeightTex.value = tex;
    this.material.uniforms.uHasShoreTex.value = 1.0;
  }

  setVisible(visible: boolean): void {
    this.water.visible = visible;
  }

  setDetailLevel(detail: number): void {
    this.material.uniforms.uDetailLevel.value = THREE.MathUtils.clamp(detail, 0.25, 1.0);
  }

  setEnvironment(params: {
    sunDirection: THREE.Vector3;
    sunColor: THREE.Color;
    skyColor: THREE.Color;
    fogColor: THREE.Color;
    fogDensity: number;
    daylight: number;
    reflectionStrength: number;
  }): void {
    const u = this.material.uniforms;
    (u.uSunDirection.value as THREE.Vector3).copy(params.sunDirection).normalize();
    (u.uSunColor.value as THREE.Color).copy(params.sunColor);
    (u.uSkyColor.value as THREE.Color).copy(params.skyColor);
    (u.uFogColor.value as THREE.Color).copy(params.fogColor);
    u.uFogDensity.value = params.fogDensity;
    u.uDaylight.value = params.daylight;
    u.uReflectionStrength.value = params.reflectionStrength;

    // Smooth day-to-night ocean depth & shallow turquoise tint
    (u.uDeepColor.value as THREE.Color)
      .setHex(0x03182e)
      .lerp(_dayDeepColor, params.daylight);
    (u.uShallowColor.value as THREE.Color)
      .setHex(0x0b4b5c)
      .lerp(_dayShallowColor, params.daylight);
  }

  update(deltaTime: number): void {
    this.time += deltaTime;

    this.material.uniforms.uTime.value =
      this.time;
  }

  dispose(): void {
    this.scene.remove(this.water);
    this.geometry.dispose();
    this.material.dispose();
    if (this.shoreHeightTex) {
      this.shoreHeightTex.dispose();
      this.shoreHeightTex = null;
    }
  }
}
