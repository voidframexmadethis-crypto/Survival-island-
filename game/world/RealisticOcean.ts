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

const _dayDeepColor = new THREE.Color("#063b65");
const _dayShallowColor = new THREE.Color("#28c5c4");

export class RealisticOcean {
  private water: THREE.Mesh;
  private material: THREE.ShaderMaterial;
  private geometry: THREE.PlaneGeometry;
  private time = 0;

  constructor(
    private scene: THREE.Scene,
    private width = 6400,
    private height = 6400
  ) {
    this.geometry = new THREE.PlaneGeometry(
      width,
      height,
      96,
      96
    );

    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uDeepColor: {
          value: new THREE.Color("#063b65")
        },
        uShallowColor: {
          value: new THREE.Color("#28c5c4")
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
        uReflectionStrength: { value: 1.0 }
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

          float wave1 = sin(pos.x * 0.035 + uTime * 1.1);
          float wave2 = cos(pos.y * 0.045 + uTime * 0.8);
          float wave3 = sin(
            (pos.x + pos.y) * 0.018 + uTime * 0.55
          );

          float displacement =
            wave1 * 0.65 +
            wave2 * 0.35 +
            wave3 * 0.45;

          pos.z += displacement;
          vWave = displacement;

          // Analytic surface slope in rotated plane space (x, -z in world)
          float dWdX =
            cos(pos.x * 0.035 + uTime * 1.1) * 0.035 * 0.65 +
            cos((pos.x + pos.y) * 0.018 + uTime * 0.55) * 0.018 * 0.45;
          float dWdY =
            -sin(pos.y * 0.045 + uTime * 0.8) * 0.045 * 0.35 +
            cos((pos.x + pos.y) * 0.018 + uTime * 0.55) * 0.018 * 0.45;

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

        varying vec2 vUv;
        varying float vWave;
        varying vec3 vWorldPos;
        varying vec3 vWaveNormal;

        void main() {
          float distFromCenter = length(vWorldPos.xz);
          float radialDepth = smoothstep(500.0, 740.0, distFromCenter);
          float uvDepth = smoothstep(0.0, 0.75, vUv.y);
          float depthBlend = mix(uvDepth, radialDepth, 0.65);

          vec3 waterColor = mix(
            uShallowColor,
            uDeepColor,
            depthBlend
          );

          // Fine animated micro-ripples on top of vertex wave normals
          float r1 = sin(vWorldPos.x * 0.62 + uTime * 2.1) * cos(vWorldPos.z * 0.58 - uTime * 1.6);
          float r2 = cos((vWorldPos.x - vWorldPos.z) * 0.42 + uTime * 1.35);
          vec3 N = normalize(vWaveNormal + vec3(r1 * 0.08, 0.0, r2 * 0.08) * uReflectionStrength);
          vec3 V = normalize(cameraPosition - vWorldPos);
          vec3 L = normalize(uSunDirection);
          vec3 H = normalize(L + V);

          // Diffuse sun warmth & Fresnel sky reflection
          float ndl = max(0.0, dot(N, L));
          float fresnel = pow(1.0 - max(0.0, dot(N, V)), 3.2);
          float spec = pow(max(0.0, dot(N, H)), mix(42.0, 110.0, uReflectionStrength));

          waterColor *= (0.42 + 0.58 * uDaylight) + ndl * 0.22 * uDaylight;
          waterColor = mix(
            waterColor,
            uSkyColor * 1.05,
            clamp(fresnel * 0.72 * uReflectionStrength, 0.0, 0.78)
          );

          float highlights = pow(
            max(0.0, sin(vUv.x * 95.0 + vUv.y * 75.0)),
            16.0
          );

          float foam = smoothstep(
            0.85, 1.1, abs(vWave)
          );

          waterColor += highlights * 0.09 * (0.35 + 0.65 * uDaylight);
          waterColor += uSunColor * spec * (0.28 + 0.78 * uReflectionStrength) * (0.25 + 0.85 * uDaylight);
          waterColor = mix(
            waterColor,
            mix(vec3(0.55, 0.66, 0.78), vec3(0.92, 0.98, 1.0), uDaylight),
            foam * 0.28
          );

          // Exponential horizon fog matching scene.fog
          float viewDist = length(cameraPosition - vWorldPos);
          float fogFactor = 1.0 - exp(-uFogDensity * uFogDensity * viewDist * viewDist);
          waterColor = mix(waterColor, uFogColor, clamp(fogFactor, 0.0, 1.0));

          gl_FragColor = vec4(waterColor, 0.94);
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

  setVisible(visible: boolean): void {
    this.water.visible = visible;
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
  }
}
