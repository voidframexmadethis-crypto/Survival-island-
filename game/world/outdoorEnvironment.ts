import * as THREE from 'three';

export interface OutdoorEnvironmentParams {
  sunDirection: THREE.Vector3;
  sunColor: THREE.Color;
  zenithColor: THREE.Color;
  horizonColor: THREE.Color;
  groundColor: THREE.Color;
  daylight: number;
  weatherDim: number;
  /** 0..1 sunset/sunrise warmth for the horizon band. */
  twilight: number;
}

const skyVertex = /* glsl */ `
  varying vec3 vDir;
  void main() {
    vDir = position;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const skyFragment = /* glsl */ `
  uniform vec3 uSunDirection;
  uniform vec3 uSunColor;
  uniform vec3 uZenithColor;
  uniform vec3 uHorizonColor;
  uniform vec3 uGroundColor;
  uniform float uDaylight;
  uniform float uWeatherDim;
  uniform float uTwilight;
  varying vec3 vDir;

  void main() {
    vec3 dir = normalize(vDir);
    float h = dir.y;

    float up = pow(clamp(h, 0.0, 1.0), 0.48);
    vec3 sky = mix(uHorizonColor, uZenithColor, up);

    // Warmer, hazier horizon band at sunrise/sunset.
    sky = mix(sky, uHorizonColor * mix(1.0, 1.18, uTwilight), exp(-abs(h) * 14.0) * 0.4);

    float cosSun = max(0.0, dot(dir, normalize(uSunDirection)));
    float halo = pow(cosSun, 7.0) * 0.10 + pow(cosSun, 160.0) * 0.45;
    float disc = smoothstep(0.99965, 0.99992, cosSun) * 9.0;
    sky += uSunColor * (halo + disc) * uDaylight * uWeatherDim;

    // Dim, sun-warmed ground bounce below the horizon.
    vec3 ground = uGroundColor * (0.42 + 0.58 * clamp(-h * 1.6, 0.0, 1.0));
    ground += uSunColor * 0.04 * uDaylight * uWeatherDim;
    sky = mix(sky, ground, smoothstep(0.015, -0.10, h));

    gl_FragColor = vec4(max(sky, vec3(0.0)), 1.0);
  }
`;

/**
 * Builds a small outdoor sky/ground probe and converts it to a PMREM texture.
 * Used for image-based lighting so rock, foliage, paint, chrome and glass
 * reflect the actual time-of-day sky instead of an indoor studio box.
 */
export function createOutdoorEnvironmentTexture(
  renderer: THREE.WebGLRenderer,
  params: OutdoorEnvironmentParams,
): THREE.Texture {
  const scene = new THREE.Scene();
  const material = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    depthTest: false,
    uniforms: {
      uSunDirection: { value: params.sunDirection.clone().normalize() },
      uSunColor: { value: params.sunColor.clone() },
      uZenithColor: { value: params.zenithColor.clone() },
      uHorizonColor: { value: params.horizonColor.clone() },
      uGroundColor: { value: params.groundColor.clone() },
      uDaylight: { value: params.daylight },
      uWeatherDim: { value: params.weatherDim },
      uTwilight: { value: params.twilight },
    },
    vertexShader: skyVertex,
    fragmentShader: skyFragment,
  });
  const dome = new THREE.Mesh(new THREE.SphereGeometry(10, 32, 20), material);
  scene.add(dome);

  const generator = new THREE.PMREMGenerator(renderer);
  generator.compileEquirectangularShader();
  // 128px cube: the probe is heavily blurred by the PMREM chain anyway, so the
  // smaller capture looks identical while cutting the one-off GPU cost ~4x.
  const target = generator.fromScene(scene, 0.02, 0.1, 40, { size: 128 });
  const texture = target.texture;
  texture.name = 'OutdoorEnvironment';

  generator.dispose();
  dome.geometry.dispose();
  material.dispose();

  return texture;
}
