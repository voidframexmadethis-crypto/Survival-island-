import * as THREE from 'three';
import { applySafeStandardMaps, ensureGeometryHasUv } from './textures';

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

const isValidTexture = (t: unknown): boolean =>
  t instanceof THREE.Texture && Boolean((t as THREE.Texture).isTexture);

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

    if (object.userData?.preserveShadowFlags) {
      if (!shadowsEnabled || skipCast) {
        object.castShadow = false;
      }
      if (skipReceive) {
        object.receiveShadow = false;
      }
    } else {
      object.castShadow = shadowsEnabled && !skipCast;
      object.receiveShadow = !skipReceive;
    }

    const materials = Array.isArray(object.material)
      ? object.material
      : [object.material];

    let usesTextureMaps = false;
    for (const material of materials) {
      if (
        material instanceof THREE.MeshStandardMaterial ||
        material instanceof THREE.MeshPhysicalMaterial
      ) {
        if (
          (material.map && !isValidTexture(material.map)) ||
          (material.bumpMap && !isValidTexture(material.bumpMap)) ||
          (material.normalMap && !isValidTexture(material.normalMap)) ||
          (material.roughnessMap && !isValidTexture(material.roughnessMap))
        ) {
          applySafeStandardMaps(material, {
            map: material.map,
            bumpMap: material.bumpMap,
            bumpScale: material.bumpScale,
            normalMap: material.normalMap,
            roughnessMap: material.roughnessMap,
          });
        }
        if (
          material.map ||
          material.bumpMap ||
          material.normalMap ||
          material.roughnessMap
        ) {
          usesTextureMaps = true;
        }
        if (!object.userData?.preserveEnvMapIntensity && !material.userData?.preserveEnvMapIntensity) {
          if (Math.abs(material.envMapIntensity - envMapIntensity) > 0.001) {
            material.envMapIntensity = envMapIntensity;
            material.needsUpdate = true;
          }
        }
      }
    }

    if (usesTextureMaps && object.geometry instanceof THREE.BufferGeometry) {
      ensureGeometryHasUv(object.geometry);
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

  // Enable physically correct lighting and PCF shadows.
  renderer.shadowMap.enabled = shadowsEnabled;
  renderer.shadowMap.type = THREE.PCFShadowMap;
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

/**
 * Applies warm golden-hour lighting tuned for shoreline water and tropical foliage.
 */
export function applyGoldenHourLighting(scene: THREE.Scene): void {
  const existingSun = scene.getObjectByName('goldenHourSun');
  const existingHemi = scene.getObjectByName('goldenHourHemi');
  if (existingSun) scene.remove(existingSun);
  if (existingHemi) scene.remove(existingHemi);

  const hemi = new THREE.HemisphereLight('#ffd599', '#1e3a4c', 1.15);
  hemi.name = 'goldenHourHemi';

  const sun = new THREE.DirectionalLight('#ff9e44', 2.4);
  sun.name = 'goldenHourSun';
  sun.position.set(-45, 22, -60);

  scene.add(hemi, sun);
  scene.fog = new THREE.FogExp2('#e8a86b', 0.0045);
}

