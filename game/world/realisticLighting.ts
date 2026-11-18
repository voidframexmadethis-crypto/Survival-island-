import * as THREE from 'three';

export interface RealisticLightingRig {
  sunlight: THREE.DirectionalLight;
  ambient: THREE.HemisphereLight;
  skyFill: THREE.DirectionalLight;
}

export interface RealisticLightingOptions {
  shadowsEnabled?: boolean;
  shadowMapSize?: number;
  shadowHalfExtent?: number;
  shadowNear?: number;
  shadowFar?: number;
  shadowRadius?: number;
  exposure?: number;
  applyMeshPass?: boolean;
}

export function applyRealisticMeshLightingPass(
  root: THREE.Object3D,
  options?: {
    shadowsEnabled?: boolean;
    envMapIntensity?: number;
  },
): void {
  const shadowsEnabled = options?.shadowsEnabled ?? true;
  const envMapIntensity = options?.envMapIntensity ?? 1.0;

  root.traverse((object) => {
    if (!(object instanceof THREE.Mesh)) return;
    if (object.userData?.ignoreLightingPass) return;

    const skipCast = Boolean(object.userData?.noShadowCast);
    const skipReceive = Boolean(object.userData?.noShadowReceive);

    object.castShadow = shadowsEnabled && !skipCast;
    object.receiveShadow = !skipReceive;

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    for (const material of materials) {
      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        if (!object.userData?.preserveEnvMapIntensity) {
          if (Math.abs(material.envMapIntensity - envMapIntensity) > 0.001) {
            material.envMapIntensity = envMapIntensity;
            material.needsUpdate = true;
          }
        }
      }
    }
  });
}

export function enableRealisticIslandLighting(
  scene: THREE.Scene,
  renderer: THREE.WebGLRenderer,
  options?: RealisticLightingOptions,
): RealisticLightingRig {
  const shadowsEnabled = options?.shadowsEnabled ?? true;
  const shadowMapSize = options?.shadowMapSize ?? 2048;
  const shadowHalfExtent = options?.shadowHalfExtent ?? 100;
  const shadowNear = options?.shadowNear ?? 1;
  const shadowFar = options?.shadowFar ?? 300;
  const shadowRadius = options?.shadowRadius ?? 4;

  // Enable physically correct lighting and soft shadows.
  renderer.shadowMap.enabled = shadowsEnabled;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = options?.exposure ?? 1.15;

  // Natural sky and atmospheric background.
  scene.background = new THREE.Color(0x87b9dc);
  scene.fog = new THREE.FogExp2(0xb6cbd5, 0.00065);

  // Soft environmental light.
  const ambient = new THREE.HemisphereLight(0xd9edff, 0x46513a, 1.35);
  scene.add(ambient);

  // Realistic directional sunlight.
  const sunlight = new THREE.DirectionalLight(0xffedcf, 3.2);
  sunlight.position.set(80, 120, 50);
  sunlight.castShadow = shadowsEnabled;

  sunlight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  sunlight.shadow.camera.left = -shadowHalfExtent;
  sunlight.shadow.camera.right = shadowHalfExtent;
  sunlight.shadow.camera.top = shadowHalfExtent;
  sunlight.shadow.camera.bottom = -shadowHalfExtent;
  sunlight.shadow.camera.near = shadowNear;
  sunlight.shadow.camera.far = shadowFar;

  sunlight.shadow.bias = -0.00015;
  sunlight.shadow.normalBias = 0.025;
  sunlight.shadow.radius = shadowRadius;

  scene.add(sunlight);
  scene.add(sunlight.target);

  // Subtle reflected sky illumination.
  const skyFill = new THREE.DirectionalLight(0xa5cfff, 0.45);
  skyFill.position.set(-60, 35, -80);
  scene.add(skyFill);
  scene.add(skyFill.target);

  if (options?.applyMeshPass !== false) {
    applyRealisticMeshLightingPass(scene, { shadowsEnabled });
  }

  return { sunlight, ambient, skyFill };
}
