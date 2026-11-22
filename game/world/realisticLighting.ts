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
          }
        }
      }
    }

    if (usesTextureMaps && object.geometry instanceof THREE.BufferGeometry) {
      ensureGeometryHasUv(object.geometry);
    }
  });
}

export function upgradeGraphics(
  r: THREE.WebGLRenderer,
  s: THREE.Scene,
  options?: { shadowsEnabled?: boolean; exposure?: number; shadowMapSize?: number },
): void {
  const shadowsEnabled = options?.shadowsEnabled ?? true;
  const shadowMapSize = options?.shadowMapSize ?? 2048;

  r.shadowMap.enabled = shadowsEnabled;
  r.shadowMap.type = THREE.PCFSoftShadowMap;
  r.toneMapping = THREE.ACESFilmicToneMapping;
  r.toneMappingExposure = options?.exposure ?? 0.95;
  r.outputColorSpace = THREE.SRGBColorSpace;

  if (!s.getObjectByName('WorldSun')) {
    const sun = new THREE.DirectionalLight(0xfff4e6, 2.7);
    sun.name = 'WorldSun';
    sun.position.set(100, 150, 80);
    sun.castShadow = shadowsEnabled;
    sun.shadow.mapSize.set(shadowMapSize, shadowMapSize);
    sun.shadow.bias = -0.00015;
    sun.shadow.normalBias = 0.025;
    sun.shadow.radius = 4;
    s.add(sun);
    s.add(sun.target);

    const hemi = new THREE.HemisphereLight(0x9fc4e8, 0x4a4234, 0.7);
    hemi.name = 'WorldHemisphere';
    s.add(hemi);
  }
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

  // Enable physically correct lighting, ACES Filmic tone mapping, and soft PCF shadows.
  upgradeGraphics(renderer, scene, {
    shadowsEnabled,
    exposure: options?.exposure ?? 0.95,
    shadowMapSize,
  });

  // Natural sky and atmospheric background.
  scene.background = new THREE.Color(0x87b9dc);
  scene.fog = new THREE.FogExp2(0xb6cbd5, 0.00065);

  // Soft environmental light (reuse WorldHemisphere from upgradeGraphics if present).
  const existingHemi = scene.getObjectByName('WorldHemisphere');
  const ambient =
    existingHemi instanceof THREE.HemisphereLight
      ? existingHemi
      : new THREE.HemisphereLight(0x9fc4e8, 0x4a4234, 0.7);
  ambient.name = 'WorldHemisphere';
  ambient.color.setHex(0x9fc4e8);
  ambient.groundColor.setHex(0x4a4234);
  ambient.intensity = 0.7;
  if (!existingHemi) {
    scene.add(ambient);
  }

  // Realistic directional sunlight (reuse WorldSun from upgradeGraphics if present).
  const existingSun = scene.getObjectByName('WorldSun');
  const sunlight =
    existingSun instanceof THREE.DirectionalLight
      ? existingSun
      : new THREE.DirectionalLight(0xfff4e6, 2.7);
  sunlight.name = 'WorldSun';
  sunlight.color.setHex(0xfff4e6);
  sunlight.intensity = 2.7;
  sunlight.position.set(100, 150, 80);
  sunlight.castShadow = shadowsEnabled;

  if (
    sunlight.shadow.mapSize.x !== shadowMapSize ||
    sunlight.shadow.mapSize.y !== shadowMapSize
  ) {
    sunlight.shadow.mapSize.set(shadowMapSize, shadowMapSize);
  }
  sunlight.shadow.camera.left = -shadowHalfExtent;
  sunlight.shadow.camera.right = shadowHalfExtent;
  sunlight.shadow.camera.top = shadowHalfExtent;
  sunlight.shadow.camera.bottom = -shadowHalfExtent;
  sunlight.shadow.camera.near = shadowNear;
  sunlight.shadow.camera.far = shadowFar;

  sunlight.shadow.bias = -0.00015;
  sunlight.shadow.normalBias = 0.025;
  sunlight.shadow.radius = shadowRadius;

  if (!existingSun) {
    scene.add(sunlight);
    scene.add(sunlight.target);
  } else if (!sunlight.target.parent) {
    scene.add(sunlight.target);
  }

  // Subtle reflected sky illumination.
  const existingSkyFill = scene.getObjectByName('WorldSkyFill');
  const skyFill =
    existingSkyFill instanceof THREE.DirectionalLight
      ? existingSkyFill
      : new THREE.DirectionalLight(0xa5cfff, 0.32);
  skyFill.name = 'WorldSkyFill';
  skyFill.position.set(-60, 35, -80);
  if (!existingSkyFill) {
    scene.add(skyFill);
    scene.add(skyFill.target);
  }

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

