import * as THREE from 'three';
import {
  ArmorMaterialTier,
  BodyZone,
  CampStructureType,
  CreatureSpecies,
  CreatureZoneArmor,
  ItemId,
  StructuralBlockKind,
} from '../types';
import {
  applySafeStandardMaps,
  createBisonFurTexture,
  createChestnutHorseTexture,
  createCrocodileScaleTexture,
  createGrizzlyFurTexture,
  createGunmetalTextureSet,
  createHolsteinCoatTexture,
  createLionFurTexture,
  createLionManeTexture,
  createMottledGoatTexture,
  createOwlFeatherTexture,
  createRedFoxFurTexture,
  createTabbyFurTexture,
  createTacticalGloveTextureSet,
  createTacticalGripTextureSet,
  createWolfFurTexture,
  createWoolFleeceTexture,
  createYorkshirePigTexture,
  PbrTextureSet,
} from './textures';
import {
  createExpandedCreatureModel,
  isExpandedCreatureSpecies,
} from './expandedCreatureModels';
import {
  PortalGunMeshHandle,
  createAlienPlasmaGunFirstPersonMesh,
  createInfernoBladeMesh,
  createPortalGunFirstPersonMesh,
} from './multiverseModels';
import {
  ExchangeProduct,
  SkinCatalogItem,
  buildSculptedBackpackMesh,
  getCosmeticImageTexture,
  toBackpackSkinCatalogItem,
} from '../data/exchangeCatalog';

let cachedAnimalTextures: {
  holstein: THREE.CanvasTexture;
  pig: THREE.CanvasTexture;
  horse: THREE.CanvasTexture;
  wool: THREE.CanvasTexture;
  goat: THREE.CanvasTexture;
  tabby: THREE.CanvasTexture;
  grizzly: THREE.CanvasTexture;
  wolf: THREE.CanvasTexture;
  lion: THREE.CanvasTexture;
  lionMane: THREE.CanvasTexture;
  fox: THREE.CanvasTexture;
  croc: THREE.CanvasTexture;
  bison: THREE.CanvasTexture;
  owl: THREE.CanvasTexture;
} | null = null;

function getAnimalTextures() {
  if (!cachedAnimalTextures) {
    cachedAnimalTextures = {
      holstein: createHolsteinCoatTexture(4),
      pig: createYorkshirePigTexture(4),
      horse: createChestnutHorseTexture(4),
      wool: createWoolFleeceTexture(4),
      goat: createMottledGoatTexture(4),
      tabby: createTabbyFurTexture(4),
      grizzly: createGrizzlyFurTexture(4),
      wolf: createWolfFurTexture(4),
      lion: createLionFurTexture(4),
      lionMane: createLionManeTexture(4),
      fox: createRedFoxFurTexture(4),
      croc: createCrocodileScaleTexture(4),
      bison: createBisonFurTexture(4),
      owl: createOwlFeatherTexture(4),
    };
  }
  return cachedAnimalTextures;
}

let cachedFirstPersonPbr: {
  gunmetal: PbrTextureSet;
  grip: PbrTextureSet;
  glove: PbrTextureSet;
} | null = null;

function getFirstPersonPbrTextures() {
  if (!cachedFirstPersonPbr) {
    cachedFirstPersonPbr = {
      gunmetal: createGunmetalTextureSet(4),
      grip: createTacticalGripTextureSet(4),
      glove: createTacticalGloveTextureSet(4),
    };
  }
  return cachedFirstPersonPbr;
}

export interface FirstPersonHandsRig {
  root: THREE.Group;
  leftHand: THREE.Group;
  rightHand: THREE.Group;
  toolGroup: THREE.Group;
  shaft: THREE.Mesh;
  axeHead: THREE.Mesh;
  spearTip: THREE.Mesh;
  clubHead: THREE.Mesh;
  bowArc: THREE.Mesh;
  rodTip: THREE.Mesh;
  sickleBlade: THREE.Mesh;
  warhammerHead: THREE.Group;
  gunMesh: THREE.Group;
  portalGunHandle: PortalGunMeshHandle;
  alienPlasmaGunMesh: THREE.Group;
  infernoBladeMesh: THREE.Group;
  consumableGroup: THREE.Group;
  foodMesh: THREE.Mesh;
  foodMat: THREE.MeshStandardMaterial;
  bottleGroup: THREE.Group;
  bottleWaterMesh: THREE.Mesh;
  bottleWaterMat: THREE.MeshStandardMaterial;
  knifeBlade: THREE.Group;
  soapMesh: THREE.Group;
  leftMeatGroup: THREE.Group;
  leftMeatMesh: THREE.Mesh;
  leftMeatMat: THREE.MeshStandardMaterial;
  foamGroup: THREE.Group;
  cutStripsGroup: THREE.Group;
  setFirearmGrip: (active: boolean) => void;
}

export interface CreatureRig {
  root: THREE.Group;
  body: THREE.Group;
  head: THREE.Group;
  jaw?: THREE.Group;
  tail: THREE.Group;
  legs: THREE.Group[];
  wings?: THREE.Group[];
  breathWisps?: THREE.Mesh[];
  maneTufts?: THREE.Mesh[];
  eyeGlowMat?: THREE.MeshBasicMaterial;
  shadowDisc: THREE.Mesh;
  armorGroups?: Record<BodyZone, THREE.Group>;
}

export interface SkyCelestialHandles {
  group: THREE.Group;
  skyDome: THREE.Mesh;
  sunMesh: THREE.Mesh;
  moonMesh: THREE.Mesh;
  starPoints: THREE.Points;
  starMat: THREE.PointsMaterial;
  updateSky: (params: {
    sunDirection: THREE.Vector3;
    sunColor: THREE.Color;
    zenithColor: THREE.Color;
    horizonColor: THREE.Color;
    daylight: number;
    twilight: number;
    weatherDim: number;
    time: number;
  }) => void;
}

export function createSkyCelestialBodies(): SkyCelestialHandles {
  const group = new THREE.Group();

  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {
      uSunDirection: { value: new THREE.Vector3(0.4, 0.6, 0.3).normalize() },
      uSunColor: { value: new THREE.Color(0xfff1d6) },
      uZenithColor: { value: new THREE.Color(0x164a9a) },
      uHorizonColor: { value: new THREE.Color(0x8ec8ea) },
      uDaylight: { value: 1.0 },
      uTwilight: { value: 0.0 },
      uWeatherDim: { value: 1.0 },
      uTime: { value: 0.0 },
    },
    vertexShader: `
      varying vec3 vLocalDir;
      void main() {
        vLocalDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uSunDirection;
      uniform vec3 uSunColor;
      uniform vec3 uZenithColor;
      uniform vec3 uHorizonColor;
      uniform float uDaylight;
      uniform float uTwilight;
      uniform float uWeatherDim;
      uniform float uTime;

      varying vec3 vLocalDir;

      float sHash(vec2 p) {
        return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
      }

      float sNoise(vec2 p) {
        vec2 i = floor(p);
        vec2 f = fract(p);
        f = f * f * (3.0 - 2.0 * f);
        return mix(
          mix(sHash(i), sHash(i + vec2(1.0, 0.0)), f.x),
          mix(sHash(i + vec2(0.0, 1.0)), sHash(i + vec2(1.0, 1.0)), f.x),
          f.y
        );
      }

      float sFbm(vec2 p) {
        float sum = 0.0;
        float amp = 0.52;
        for (int i = 0; i < 3; i++) {
          sum += amp * sNoise(p);
          p *= 2.08;
          amp *= 0.48;
        }
        return sum;
      }

      void main() {
        vec3 dir = normalize(vLocalDir);
        float elev = clamp(dir.y, -0.25, 1.0);
        float zenithT = pow(clamp(elev, 0.0, 1.0), 0.46);

        // Deep cobalt zenith fading into bright sunlit sky blue at midday, or fiery amber at twilight
        vec3 horizonGlowColor = mix(
          uHorizonColor,
          mix(vec3(1.0, 0.56, 0.18), vec3(1.0, 0.78, 0.36), 0.45),
          clamp(uTwilight * 0.94, 0.0, 0.96)
        );
        vec3 sky = mix(horizonGlowColor, uZenithColor, zenithT);

        // Solar scattering & horizon glow (pure daylight sheen at midday, golden amber during twilight)
        vec3 sunDir = normalize(uSunDirection);
        float sunCos = max(0.0, dot(dir, sunDir));
        float wideScatter = pow(sunCos, 2.8) * (0.20 + uTwilight * 0.68);
        float midHalo = pow(sunCos, 14.0) * (0.38 + uTwilight * 0.78);
        float tightCorona = pow(sunCos, 88.0) * 1.45;
        float sunDisc = smoothstep(0.9972, 0.9992, sunCos);
        float horizonSunMask = exp(-abs(elev - max(0.02, sunDir.y)) * 5.8) * pow(sunCos, 1.9);
        float sunVisible = smoothstep(-0.08, 0.12, sunDir.y) * uDaylight * uWeatherDim;

        vec3 amberGlow = mix(uSunColor, vec3(1.0, 0.54, 0.12), clamp(uTwilight * 0.92, 0.0, 1.0));
        sky += amberGlow * (wideScatter + horizonSunMask * (0.14 + uTwilight * 0.86)) * sunVisible;
        sky += mix(uSunColor, vec3(1.0, 0.98, 0.94), 0.55) * (midHalo + tightCorona + sunDisc * 2.8) * sunVisible;

        // Crisp bright white midday cumulus/cirrus clouds, transitioning smoothly to golden-rimmed sunset clouds at twilight
        if (elev > 0.02) {
          vec2 cloudUv = dir.xz / (elev + 0.22) * 1.48 + vec2(uTime * 0.0085, uTime * 0.004);
          float c1 = sFbm(cloudUv);
          float c2 = sFbm(cloudUv * 2.6 - vec2(uTime * 0.005, 0.0));
          float shape = c1 * 0.68 + c2 * 0.32;
          float cloudDensity = smoothstep(0.45 - (1.0 - uWeatherDim) * 0.22, 0.74, shape);
          float horizonFade = smoothstep(0.02, 0.16, elev);

          float rimFactor = smoothstep(0.40, 0.68, shape) * (0.48 + 0.52 * pow(sunCos, 1.8));
          vec3 cloudShadowCol = mix(
            vec3(0.12, 0.16, 0.26),
            mix(vec3(0.58, 0.71, 0.87), vec3(0.32, 0.24, 0.26), uTwilight),
            uDaylight
          );
          vec3 cloudLitCol = mix(
            vec3(0.42, 0.48, 0.58),
            mix(vec3(1.0, 0.995, 0.99), vec3(1.0, 0.68, 0.28), clamp(uTwilight * 0.92 + pow(sunCos, 1.8) * 0.45 * uTwilight, 0.0, 1.0)),
            uDaylight
          );
          vec3 cloudBase = mix(cloudShadowCol, cloudLitCol, clamp(rimFactor + 0.28 * c2, 0.0, 1.0));
          cloudBase *= mix(0.62, 1.0, uWeatherDim);
          cloudBase += amberGlow * pow(sunCos, 5.0) * (0.18 + uTwilight * 1.15) * sunVisible;

          sky = mix(sky, cloudBase, cloudDensity * horizonFade * (0.64 + 0.30 * uDaylight));
        }

        // Below-horizon atmospheric haze match
        float belowHorizon = smoothstep(0.02, -0.14, elev);
        sky = mix(sky, mix(uHorizonColor, amberGlow, uTwilight * 0.42) * 0.92, belowHorizon);

        gl_FragColor = vec4(sky, 1.0);
      }
    `,
  });

  const skyDome = new THREE.Mesh(
    new THREE.SphereGeometry(205, 32, 20),
    skyMat,
  );
  skyDome.renderOrder = -10;
  skyDome.frustumCulled = false;
  group.add(skyDome);

  const sunMesh = new THREE.Mesh(
    new THREE.SphereGeometry(9, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff3b0, fog: false }),
  );
  group.add(sunMesh);

  const moonMesh = new THREE.Mesh(
    new THREE.SphereGeometry(6.5, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xdbeafe, fog: false }),
  );
  group.add(moonMesh);

  const starCount = 280;
  const starPositions = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(0.12 + Math.random() * 0.88); // Upper hemisphere
    const r = 196;
    starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    starPositions[i * 3 + 1] = r * Math.cos(phi);
    starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  const starGeo = new THREE.BufferGeometry();
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
  const starMat = new THREE.PointsMaterial({
    color: 0xe2e8f0,
    size: 1.6,
    transparent: true,
    opacity: 0,
    fog: false,
    depthWrite: false,
  });
  const starPoints = new THREE.Points(starGeo, starMat);
  starPoints.renderOrder = -9;
  group.add(starPoints);

  const updateSky: SkyCelestialHandles['updateSky'] = (params) => {
    const u = skyMat.uniforms;
    (u.uSunDirection.value as THREE.Vector3).copy(params.sunDirection).normalize();
    (u.uSunColor.value as THREE.Color).copy(params.sunColor);
    (u.uZenithColor.value as THREE.Color).copy(params.zenithColor);
    (u.uHorizonColor.value as THREE.Color).copy(params.horizonColor);
    u.uDaylight.value = params.daylight;
    u.uTwilight.value = params.twilight;
    u.uWeatherDim.value = params.weatherDim;
    u.uTime.value = params.time;
  };

  return { group, skyDome, sunMesh, moonMesh, starPoints, starMat, updateSky };
}

function makeContactShadow(radius: number): THREE.Mesh {
  const geo = new THREE.CircleGeometry(radius, 16);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshBasicMaterial({
    color: 0x090807,
    transparent: true,
    opacity: 0.3,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.position.y = 0.04;
  return mesh;
}

/**
 * First-Person Arms, Hands & Held Tool/Weapon Rig attached to the camera.
 */
export function createFirstPersonHandsRig(): FirstPersonHandsRig {
  const root = new THREE.Group();
  const fpPbr = getFirstPersonPbrTextures();

  const skinMat = new THREE.MeshStandardMaterial({
    color: 0xc98a5f,
    roughness: 0.44,
    metalness: 0.04,
    envMapIntensity: 1.15,
  });
  const gloveMat = new THREE.MeshStandardMaterial({
    color: 0x6b7280,
    map: fpPbr.glove.map,
    normalMap: fpPbr.glove.normalMap,
    normalScale: new THREE.Vector2(1.45, 1.45),
    roughnessMap: fpPbr.glove.roughnessMap,
    roughness: 0.88,
    metalness: 0.14,
    envMapIntensity: 1.2,
  });
  const sleeveMat = new THREE.MeshStandardMaterial({
    color: 0x4b515c,
    map: fpPbr.glove.map,
    normalMap: fpPbr.glove.normalMap,
    normalScale: new THREE.Vector2(1.2, 1.2),
    roughnessMap: fpPbr.glove.roughnessMap,
    roughness: 0.92,
    metalness: 0.08,
  });
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x6b4423, roughness: 0.85 });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.5, metalness: 0.25 });

  const forearmMeshes: THREE.Mesh[] = [];
  const tacticalSleeveExtensions: THREE.Mesh[] = [];
  const fingerJointGeo = new THREE.CapsuleGeometry(0.0085, 0.022, 4, 6);
  const thumbGeo = new THREE.CapsuleGeometry(0.01, 0.028, 4, 6);

  const makeArm = (side: number) => {
    const g = new THREE.Group();
    g.position.set(side * 0.26, -0.25, -0.38);

    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.046, 0.056, 0.30, 12), sleeveMat);
    sleeve.rotation.x = Math.PI / 2.2;
    sleeve.position.set(0, -0.04, 0.14);
    g.add(sleeve);

    // Tactical ribbed gauntlet sleeve extension shown when gripping firearms (replaces exposed forearm gap)
    const tacExt = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.047, 0.19, 12), sleeveMat);
    tacExt.rotation.x = Math.PI / 2.25;
    tacExt.position.set(0, -0.01, -0.01);
    tacExt.visible = false;
    g.add(tacExt);
    tacticalSleeveExtensions.push(tacExt);

    const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.036, 0.18, 4, 8), skinMat);
    forearm.rotation.x = Math.PI / 2.3;
    forearm.position.set(0, -0.01, -0.02);
    g.add(forearm);
    forearmMeshes.push(forearm);

    const wristCuff = new THREE.Mesh(new THREE.CylinderGeometry(0.041, 0.043, 0.05, 12), gloveMat);
    wristCuff.rotation.x = Math.PI / 2.2;
    wristCuff.position.set(0, 0.008, -0.085);
    g.add(wristCuff);

    const palm = new THREE.Mesh(new THREE.BoxGeometry(0.068, 0.052, 0.086), gloveMat);
    palm.position.set(0, 0.018, -0.135);
    g.add(palm);

    const knuckleGuard = new THREE.Mesh(new THREE.BoxGeometry(0.070, 0.022, 0.032), gloveMat);
    knuckleGuard.position.set(0, 0.042, -0.155);
    g.add(knuckleGuard);

    return g;
  };

  const leftHand = makeArm(-1);
  const rightHand = makeArm(1);
  root.add(leftHand, rightHand);

  // Articulated right-hand gloved thumb + curled fingers wrapping pistol grip & trigger guard
  const rightGunGripGroup = new THREE.Group();
  rightGunGripGroup.visible = false;
  const rThumb = new THREE.Mesh(thumbGeo, gloveMat);
  rThumb.position.set(-0.032, 0.052, -0.135);
  rThumb.rotation.set(0.95, 0.25, 0.55);
  const rTriggerFinger = new THREE.Mesh(fingerJointGeo, gloveMat);
  rTriggerFinger.position.set(0.026, 0.038, -0.186);
  rTriggerFinger.rotation.set(1.38, -0.15, 0.18);
  rightGunGripGroup.add(rThumb, rTriggerFinger);
  for (let fi = 0; fi < 3; fi++) {
    const fMesh = new THREE.Mesh(fingerJointGeo, gloveMat);
    fMesh.position.set(-0.022, 0.012 - fi * 0.018, -0.168 + fi * 0.008);
    fMesh.rotation.set(0.18, 0.1, Math.PI / 2.1);
    rightGunGripGroup.add(fMesh);
  }
  rightHand.add(rightGunGripGroup);

  // Articulated left support-hand fingers + forward thumb cradling right knuckles & trigger guard
  const leftGunGripGroup = new THREE.Group();
  leftGunGripGroup.visible = false;
  const lThumb = new THREE.Mesh(thumbGeo, gloveMat);
  lThumb.position.set(0.024, 0.048, -0.188);
  lThumb.rotation.set(1.22, -0.22, -0.32);
  leftGunGripGroup.add(lThumb);
  for (let fi = 0; fi < 4; fi++) {
    const fMesh = new THREE.Mesh(fingerJointGeo, gloveMat);
    fMesh.position.set(0.034, 0.024 - fi * 0.016, -0.172 - fi * 0.003);
    fMesh.rotation.set(0.24, -0.28, -Math.PI / 2.15);
    leftGunGripGroup.add(fMesh);
  }
  leftHand.add(leftGunGripGroup);

  const setFirearmGrip = (active: boolean) => {
    for (let i = 0; i < forearmMeshes.length; i++) {
      forearmMeshes[i].visible = !active;
    }
    for (let i = 0; i < tacticalSleeveExtensions.length; i++) {
      tacticalSleeveExtensions[i].visible = active;
    }
    rightGunGripGroup.visible = active;
    leftGunGripGroup.visible = active;
  };

  // Held Tool / Weapon Group anchored in right hand
  const toolGroup = new THREE.Group();
  toolGroup.position.set(-0.01, 0.03, -0.16);
  rightHand.add(toolGroup);

  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.016, 0.46, 8), woodMat);
  shaft.rotation.x = -Math.PI / 4;
  shaft.position.set(0, 0.12, -0.12);
  toolGroup.add(shaft);

  const axeHead = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.1, 0.14), stoneMat);
  axeHead.position.set(0, 0.24, -0.26);
  axeHead.rotation.x = -Math.PI / 4;
  toolGroup.add(axeHead);

  const spearTip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.16, 5), stoneMat);
  spearTip.position.set(0, 0.29, -0.29);
  spearTip.rotation.x = -Math.PI / 4;
  toolGroup.add(spearTip);

  const clubHead = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.022, 0.22, 8), woodMat);
  clubHead.position.set(0, 0.22, -0.22);
  clubHead.rotation.x = -Math.PI / 4;
  toolGroup.add(clubHead);

  const bowArc = new THREE.Mesh(
    new THREE.TorusGeometry(0.22, 0.014, 6, 14, Math.PI),
    woodMat,
  );
  bowArc.rotation.z = -Math.PI / 2;
  bowArc.position.set(-0.04, 0.06, -0.15);
  toolGroup.add(bowArc);

  const rodTip = new THREE.Mesh(
    new THREE.CylinderGeometry(0.005, 0.012, 0.65, 6),
    woodMat,
  );
  rodTip.rotation.x = -Math.PI / 3.2;
  rodTip.position.set(0, 0.26, -0.34);
  toolGroup.add(rodTip);

  const sickleSteelMat = new THREE.MeshStandardMaterial({
    color: 0xd4d4d8,
    normalMap: fpPbr.gunmetal.normalMap,
    normalScale: new THREE.Vector2(0.55, 0.55),
    roughnessMap: fpPbr.gunmetal.roughnessMap,
    roughness: 0.42,
    metalness: 0.86,
    envMapIntensity: 1.3,
  });
  const sickleBlade = new THREE.Mesh(
    new THREE.TorusGeometry(0.115, 0.014, 6, 14, Math.PI * 1.15),
    sickleSteelMat,
  );
  sickleBlade.position.set(-0.07, 0.26, -0.26);
  sickleBlade.rotation.set(-Math.PI / 4, 0.3, Math.PI * 0.45);
  sickleBlade.visible = false;
  toolGroup.add(sickleBlade);

  const warhammerHead = new THREE.Group();
  warhammerHead.position.set(0, 0.25, -0.25);
  warhammerHead.rotation.x = -Math.PI / 4;
  const basaltMat = new THREE.MeshStandardMaterial({
    color: 0x57534e,
    roughness: 0.78,
    metalness: 0.15,
  });
  const maulBlock = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.11, 0.22), basaltMat);
  const ironBand = new THREE.Mesh(new THREE.BoxGeometry(0.125, 0.125, 0.05), sickleSteelMat);
  const faceFront = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.048, 0.04, 6), sickleSteelMat);
  faceFront.rotation.x = Math.PI / 2;
  faceFront.position.z = -0.12;
  warhammerHead.add(maulBlock, ironBand, faceFront);
  warhammerHead.visible = false;
  toolGroup.add(warhammerHead);

  // Forged Hunting Knife Blade & Crossguard
  const knifeBlade = new THREE.Group();
  knifeBlade.position.set(0, 0.04, -0.06);
  const knifeHandle = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.017, 0.13, 8),
    new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.78 }),
  );
  knifeHandle.rotation.x = -Math.PI / 4;
  knifeHandle.position.set(0, 0.02, -0.03);
  const knifeGuard = new THREE.Mesh(
    new THREE.BoxGeometry(0.042, 0.014, 0.024),
    new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.35, metalness: 0.75 }),
  );
  knifeGuard.rotation.x = -Math.PI / 4;
  knifeGuard.position.set(0, 0.068, -0.078);
  const bladeBody = new THREE.Mesh(
    new THREE.BoxGeometry(0.008, 0.032, 0.2),
    sickleSteelMat,
  );
  bladeBody.rotation.x = Math.PI / 4;
  bladeBody.position.set(0, 0.145, -0.155);
  const bladeTip = new THREE.Mesh(
    new THREE.ConeGeometry(0.016, 0.06, 4),
    sickleSteelMat,
  );
  bladeTip.rotation.x = -Math.PI / 4;
  bladeTip.scale.set(0.35, 1, 1);
  bladeTip.position.set(0, 0.225, -0.235);
  knifeBlade.add(knifeHandle, knifeGuard, bladeBody, bladeTip);
  knifeBlade.visible = false;
  toolGroup.add(knifeBlade);

  // 3D Realistic Tactical Survival Sidearm (Gun) with worn gunmetal PBR, Picatinny rail, ejection port & tritium sights
  const gunMesh = new THREE.Group();
  gunMesh.position.set(0, 0.02, -0.06);
  const gunSteelMat = new THREE.MeshStandardMaterial({
    color: 0xa2aab6,
    map: fpPbr.gunmetal.map,
    normalMap: fpPbr.gunmetal.normalMap,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughnessMap: fpPbr.gunmetal.roughnessMap,
    roughness: 0.62,
    metalness: 0.92,
    envMapIntensity: 1.75,
  });
  const gunGripMat = new THREE.MeshStandardMaterial({
    color: 0x7a8088,
    map: fpPbr.grip.map,
    normalMap: fpPbr.grip.normalMap,
    normalScale: new THREE.Vector2(1.35, 1.35),
    roughnessMap: fpPbr.grip.roughnessMap,
    roughness: 0.9,
    metalness: 0.22,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xd0d8e2,
    normalMap: fpPbr.gunmetal.normalMap,
    normalScale: new THREE.Vector2(0.65, 0.65),
    roughnessMap: fpPbr.gunmetal.roughnessMap,
    roughness: 0.42,
    metalness: 0.96,
    envMapIntensity: 1.85,
  });

  const slide = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.052, 0.258), gunSteelMat);
  slide.position.set(0, 0.066, -0.066);
  slide.castShadow = true;
  gunMesh.add(slide);

  // Upper machined slide bevel & dustcover shroud
  const slideCrown = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.011, 0.244), gunSteelMat);
  slideCrown.position.set(0, 0.095, -0.064);
  gunMesh.add(slideCrown);

  // Brushed metallic side slide rail highlights
  const sideRailL = new THREE.Mesh(new THREE.BoxGeometry(0.0462, 0.008, 0.246), chromeMat);
  sideRailL.position.set(0, 0.048, -0.065);
  gunMesh.add(sideRailL);

  // Machined Picatinny top rail ribs
  for (let pr = 0; pr < 7; pr++) {
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.006, 0.008), gunSteelMat);
    rib.position.set(0, 0.102, 0.01 - pr * 0.022);
    gunMesh.add(rib);
  }

  // Polished steel ejection port & extractor accent
  const ejectionPort = new THREE.Mesh(new THREE.BoxGeometry(0.0455, 0.018, 0.048), chromeMat);
  ejectionPort.position.set(0.002, 0.078, -0.055);
  gunMesh.add(ejectionPort);

  const lowerFrame = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.026, 0.22), gunGripMat);
  lowerFrame.position.set(0, 0.036, -0.058);
  gunMesh.add(lowerFrame);

  // Underbarrel tactical light / laser housing
  const underRailMount = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.024, 0.075), gunSteelMat);
  underRailMount.position.set(0, 0.014, -0.145);
  const underLens = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 10), chromeMat);
  underLens.rotation.x = Math.PI / 2;
  underLens.position.set(0, 0.014, -0.184);
  gunMesh.add(underRailMount, underLens);

  // Machined rear & front slide serrations
  for (let sr = 0; sr < 6; sr++) {
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.0465, 0.036, 0.005), chromeMat);
    notch.position.set(0, 0.066, 0.016 + sr * 0.009);
    gunMesh.add(notch);
  }
  for (let sf = 0; sf < 4; sf++) {
    const fNotch = new THREE.Mesh(new THREE.BoxGeometry(0.046, 0.032, 0.0045), chromeMat);
    fNotch.position.set(0, 0.066, -0.145 - sf * 0.009);
    gunMesh.add(fNotch);
  }

  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.017, 0.22, 12), chromeMat);
  barrel.rotation.x = Math.PI / 2;
  barrel.position.set(0, 0.065, -0.195);
  barrel.castShadow = true;
  gunMesh.add(barrel);

  const muzzleTip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.042, 12), gunSteelMat);
  muzzleTip.rotation.x = Math.PI / 2;
  muzzleTip.position.set(0, 0.065, -0.308);
  gunMesh.add(muzzleTip);

  const grip = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.13, 0.062), gunGripMat);
  grip.rotation.x = 0.26;
  grip.position.set(0, -0.02, 0.01);
  grip.castShadow = true;
  gunMesh.add(grip);

  const triggerGuard = new THREE.Mesh(new THREE.TorusGeometry(0.022, 0.005, 6, 12, Math.PI), gunSteelMat);
  triggerGuard.rotation.x = -Math.PI / 2;
  triggerGuard.position.set(0, 0.018, -0.04);
  const trigger = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.022, 0.008), chromeMat);
  trigger.rotation.x = -0.35;
  trigger.position.set(0, 0.026, -0.038);
  gunMesh.add(triggerGuard, trigger);

  // Iron sights with subtle tritium 3-dot inserts (MeshBasicMaterial skips cosmetic skin overrides)
  const frontSight = new THREE.Mesh(new THREE.BoxGeometry(0.008, 0.016, 0.012), chromeMat);
  frontSight.position.set(0, 0.104, -0.285);
  const frontSightDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.0024, 6, 6),
    new THREE.MeshBasicMaterial({ color: 0x4ade80 }),
  );
  frontSightDot.position.set(0, 0.107, -0.278);

  const rearSight = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.014, 0.012), gunSteelMat);
  rearSight.position.set(0, 0.103, 0.046);
  const rearDotMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24 });
  const rearDotL = new THREE.Mesh(new THREE.SphereGeometry(0.002, 6, 6), rearDotMat);
  rearDotL.position.set(-0.009, 0.105, 0.0525);
  const rearDotR = new THREE.Mesh(new THREE.SphereGeometry(0.002, 6, 6), rearDotMat);
  rearDotR.position.set(0.009, 0.105, 0.0525);
  gunMesh.add(frontSight, frontSightDot, rearSight, rearDotL, rearDotR);

  gunMesh.traverse((obj) => {
    if (obj instanceof THREE.Mesh) {
      obj.userData.preserveEnvMapIntensity = true;
    }
  });

  gunMesh.visible = false;
  toolGroup.add(gunMesh);

  const portalGunHandle = createPortalGunFirstPersonMesh();
  portalGunHandle.group.visible = false;
  toolGroup.add(portalGunHandle.group);

  const alienPlasmaGunMesh = createAlienPlasmaGunFirstPersonMesh();
  alienPlasmaGunMesh.visible = false;
  toolGroup.add(alienPlasmaGunMesh);

  const infernoBladeMesh = createInfernoBladeMesh();
  infernoBladeMesh.visible = false;
  toolGroup.add(infernoBladeMesh);

  // Hand-held Consumables (3D Food Morsel & Water Bottle) for eating, drinking & bottle washing
  const consumableGroup = new THREE.Group();
  consumableGroup.position.set(-0.01, 0.04, -0.16);
  consumableGroup.visible = false;
  rightHand.add(consumableGroup);

  const foodMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.65,
  });
  const foodMesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.055, 1),
    foodMat,
  );
  foodMesh.scale.set(1.15, 0.8, 1.3);
  foodMesh.visible = false;
  consumableGroup.add(foodMesh);

  const bottleGroup = new THREE.Group();
  const bottleShellMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    transparent: true,
    opacity: 0.62,
    roughness: 0.22,
    metalness: 0.1,
  });
  const bottleWaterMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    transparent: true,
    opacity: 0.82,
    roughness: 0.18,
  });
  const bottleCapMat = new THREE.MeshStandardMaterial({
    color: 0x0284c7,
    roughness: 0.45,
  });
  const bBody = new THREE.Mesh(
    new THREE.CylinderGeometry(0.042, 0.042, 0.15, 10),
    bottleShellMat,
  );
  const bottleWaterMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.036, 0.036, 0.115, 10),
    bottleWaterMat,
  );
  bottleWaterMesh.position.y = -0.012;
  const bNeck = new THREE.Mesh(
    new THREE.CylinderGeometry(0.018, 0.034, 0.035, 10),
    bottleShellMat,
  );
  bNeck.position.y = 0.09;
  const bCap = new THREE.Mesh(
    new THREE.CylinderGeometry(0.021, 0.021, 0.022, 10),
    bottleCapMat,
  );
  bCap.position.y = 0.115;
  bottleGroup.add(bBody, bottleWaterMesh, bNeck, bCap);
  bottleGroup.visible = false;
  consumableGroup.add(bottleGroup);

  // Hand-held Soap Bar in right hand for washing & scrubbing meat in lake water
  const soapMesh = new THREE.Group();
  soapMesh.position.set(0, 0.045, -0.15);
  const soapMat = new THREE.MeshStandardMaterial({
    color: 0xa7f3d0,
    roughness: 0.24,
    metalness: 0.05,
  });
  const soapBar = new THREE.Mesh(new THREE.BoxGeometry(0.058, 0.028, 0.078), soapMat);
  const soapTopBevel = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), soapMat);
  soapTopBevel.scale.set(1.02, 0.52, 1.32);
  soapMesh.add(soapBar, soapTopBevel);
  soapMesh.visible = false;
  rightHand.add(soapMesh);

  // Left-hand Meat Slab + Soap Foam + Cut Strips for washing & knife-cutting animations
  const leftMeatGroup = new THREE.Group();
  leftMeatGroup.position.set(0.02, 0.05, -0.15);
  const leftMeatMat = new THREE.MeshStandardMaterial({
    color: 0xb91c1c,
    roughness: 0.58,
  });
  const leftMeatMesh = new THREE.Mesh(
    new THREE.DodecahedronGeometry(0.068, 1),
    leftMeatMat,
  );
  leftMeatMesh.scale.set(1.25, 0.52, 1.45);
  leftMeatGroup.add(leftMeatMesh);

  const foamGroup = new THREE.Group();
  const foamMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    transparent: true,
    opacity: 0.88,
    roughness: 0.35,
  });
  const foamOffsets: [number, number, number, number][] = [
    [-0.032, 0.034, -0.022, 0.026],
    [0.035, 0.032, 0.014, 0.024],
    [0.0, 0.042, 0.028, 0.028],
    [-0.024, 0.028, 0.042, 0.02],
    [0.028, 0.036, -0.036, 0.022],
  ];
  for (const [fx, fy, fz, fr] of foamOffsets) {
    const bubble = new THREE.Mesh(new THREE.SphereGeometry(fr, 8, 8), foamMat);
    bubble.position.set(fx, fy, fz);
    foamGroup.add(bubble);
  }
  foamGroup.visible = false;
  leftMeatGroup.add(foamGroup);

  const cutStripsGroup = new THREE.Group();
  const stripMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.5,
  });
  for (let sIdx = 0; sIdx < 3; sIdx++) {
    const strip = new THREE.Mesh(new THREE.BoxGeometry(0.024, 0.026, 0.115), stripMat);
    strip.position.set(0.055 + sIdx * 0.026, 0.008, 0);
    strip.rotation.z = -0.15 * (sIdx + 1);
    strip.visible = false;
    cutStripsGroup.add(strip);
  }
  cutStripsGroup.visible = false;
  leftMeatGroup.add(cutStripsGroup);

  leftMeatGroup.visible = false;
  leftHand.add(leftMeatGroup);

  return {
    root,
    leftHand,
    rightHand,
    toolGroup,
    shaft,
    axeHead,
    spearTip,
    clubHead,
    bowArc,
    rodTip,
    sickleBlade,
    warhammerHead,
    gunMesh,
    portalGunHandle,
    alienPlasmaGunMesh,
    infernoBladeMesh,
    consumableGroup,
    foodMesh,
    foodMat,
    bottleGroup,
    bottleWaterMesh,
    bottleWaterMat,
    knifeBlade,
    soapMesh,
    leftMeatGroup,
    leftMeatMesh,
    leftMeatMat,
    foamGroup,
    cutStripsGroup,
    setFirearmGrip,
  };
}

/**
 * 3D Giant Realistic Pirate Galleon for the Storm Intro Cinematic.
 * Features a layered timber hull, 16+ broadside iron cannons, 3 towering masts,
 * multiple billowing square sails + lateen spanker + bowsprit jibs, full rope
 * climbing nets (ratlines/shrouds), crow's nests, stern gallery lanterns, and Jolly Roger flag.
 */
export function createSailingShipModel(): THREE.Group {
  const ship = new THREE.Group();

  const darkHullMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.82, metalness: 0.06 });
  const hullMidMat = new THREE.MeshStandardMaterial({ color: 0x52311b, roughness: 0.84, metalness: 0.05 });
  const copperBottomMat = new THREE.MeshStandardMaterial({ color: 0x2c4a3e, roughness: 0.65, metalness: 0.35 });
  const deckMat = new THREE.MeshStandardMaterial({ color: 0x7a4f2b, roughness: 0.86 });
  const trimGoldMat = new THREE.MeshStandardMaterial({ color: 0xd4a438, roughness: 0.32, metalness: 0.78 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2328, roughness: 0.38, metalness: 0.86 });
  const ropeMat = new THREE.MeshStandardMaterial({ color: 0x9c8259, roughness: 0.94 });
  const mastMat = new THREE.MeshStandardMaterial({ color: 0x4a2e19, roughness: 0.84 });
  const sailMat = new THREE.MeshStandardMaterial({
    color: 0xebe2d0,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const weatheredSailMat = new THREE.MeshStandardMaterial({
    color: 0xd9ccb2,
    roughness: 0.92,
    side: THREE.DoubleSide,
  });
  const blackFlagMat = new THREE.MeshStandardMaterial({
    color: 0x111317,
    roughness: 0.88,
    side: THREE.DoubleSide,
  });
  const skullMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc,
    roughness: 0.6,
    side: THREE.DoubleSide,
  });
  const lanternGlowMat = new THREE.MeshStandardMaterial({
    color: 0xffe49e,
    emissive: 0xff9f2e,
    emissiveIntensity: 1.8,
    roughness: 0.25,
  });

  // Helper to create a curved, wind-billowed square sail
  const makeBillowingSail = (width: number, height: number, belly: number, mat: THREE.Material) => {
    const geo = new THREE.PlaneGeometry(width, height, 10, 8);
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const py = pos.getY(i);
      const nx = px / (width * 0.5);
      const ny = py / (height * 0.5);
      // Billow forward (+Z) in the center, pinned at top yard and bottom corners
      const curve = Math.cos(nx * Math.PI * 0.45) * Math.cos(ny * Math.PI * 0.48);
      pos.setZ(i, Math.max(0, curve) * belly);
    }
    geo.computeVertexNormals();
    const mesh = new THREE.Mesh(geo, mat);
    mesh.castShadow = true;
    return mesh;
  };

  // Helper to build a realistic rope climbing net (shrouds + horizontal ratline rungs)
  const makeRopeNet = (
    bottomX: number,
    bottomY: number,
    topX: number,
    topY: number,
    centerZ: number,
    halfSpreadZ: number,
    shroudCount: number,
    rungCount: number,
  ) => {
    const netGroup = new THREE.Group();
    const dy = topY - bottomY;
    const dx = topX - bottomX;
    const shroudLen = Math.hypot(dx, dy);
    const tiltZ = -Math.atan2(dx, dy);

    // Vertical/angled shrouds fanning from hull chainwale up to masthead
    for (let s = 0; s < shroudCount; s++) {
      const f = shroudCount === 1 ? 0 : (s / (shroudCount - 1)) * 2 - 1;
      const zBot = centerZ + f * halfSpreadZ;
      const zTop = centerZ + f * (halfSpreadZ * 0.28);
      const dz = zTop - zBot;
      const len = Math.hypot(shroudLen, dz);
      const rope = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, len, 5), ropeMat);
      rope.position.set((bottomX + topX) * 0.5, (bottomY + topY) * 0.5, (zBot + zTop) * 0.5);
      rope.rotation.z = tiltZ;
      rope.rotation.x = Math.atan2(dz, dy);
      netGroup.add(rope);
    }

    // Horizontal climbing ratline rungs across the shrouds
    for (let r = 1; r <= rungCount; r++) {
      const t = r / (rungCount + 1);
      const rx = bottomX + dx * t;
      const ry = bottomY + dy * t;
      const span = halfSpreadZ * 2 * (1 - 0.72 * t);
      const rung = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.032, span, 4), ropeMat);
      rung.rotation.x = Math.PI / 2;
      rung.position.set(rx, ry, centerZ);
      netGroup.add(rung);
    }

    return netGroup;
  };

  // 1. MASSIVE LAYERED PIRATE GALLEON HULL (~36m long, ~9.2m beam)
  const lowerKeel = new THREE.Mesh(new THREE.BoxGeometry(7.2, 2.2, 24.0), copperBottomMat);
  lowerKeel.position.set(0, 0.4, 0);

  const mainHull = new THREE.Mesh(new THREE.BoxGeometry(8.8, 3.6, 25.5), darkHullMat);
  mainHull.position.set(0, 2.9, 0);
  mainHull.castShadow = true;

  // Tapered flared bow & sharp prow
  const bowLower = new THREE.Mesh(new THREE.ConeGeometry(4.6, 9.0, 4), darkHullMat);
  bowLower.rotation.x = Math.PI / 2;
  bowLower.rotation.y = Math.PI / 4;
  bowLower.scale.set(1.0, 1.0, 0.72);
  bowLower.position.set(0, 2.8, 15.8);

  const forecastle = new THREE.Mesh(new THREE.BoxGeometry(8.2, 1.8, 7.0), hullMidMat);
  forecastle.position.set(0, 5.4, 10.2);

  // Main weather deck + raised quarterdeck + grand captain's stern castle
  const mainDeck = new THREE.Mesh(new THREE.BoxGeometry(8.3, 0.35, 25.0), deckMat);
  mainDeck.position.set(0, 4.75, 0);

  const quarterDeck = new THREE.Mesh(new THREE.BoxGeometry(8.4, 2.4, 9.2), hullMidMat);
  quarterDeck.position.set(0, 5.9, -8.8);

  const poopDeck = new THREE.Mesh(new THREE.BoxGeometry(7.8, 2.0, 5.8), darkHullMat);
  poopDeck.position.set(0, 8.0, -10.8);

  // Ornate gold trim strakes along port & starboard gunwales
  [-4.46, 4.46].forEach((sideX) => {
    const strakeUpper = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 25.6), trimGoldMat);
    strakeUpper.position.set(sideX, 4.55, 0);
    const strakeLower = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 25.2), trimGoldMat);
    strakeLower.position.set(sideX, 2.35, 0);
    // Bulwark railing walls along waist
    const bulwark = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.15, 16.5), hullMidMat);
    bulwark.position.set(sideX * 0.96, 5.35, 0.8);
    ship.add(strakeUpper, strakeLower, bulwark);
  });

  // Stern Gallery Windows & 3 Glowing Brass Stern Lanterns
  for (let w = -2; w <= 2; w++) {
    const winFrame = new THREE.Mesh(new THREE.BoxGeometry(1.05, 1.3, 0.22), trimGoldMat);
    winFrame.position.set(w * 1.35, 7.6, -13.75);
    const winGlass = new THREE.Mesh(new THREE.BoxGeometry(0.82, 1.05, 0.26), lanternGlowMat);
    winGlass.position.set(w * 1.35, 7.6, -13.78);
    ship.add(winFrame, winGlass);
  }
  [-2.6, 0, 2.6].forEach((lx) => {
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.1, 1.4, 6), ironMat);
    post.position.set(lx, 9.5, -13.6);
    const lamp = new THREE.Mesh(new THREE.OctahedronGeometry(0.42, 0), lanternGlowMat);
    lamp.position.set(lx, 10.3, -13.6);
    ship.add(post, lamp);
  });

  // Captain's Helm Wheel on Quarterdeck
  const helmStand = new THREE.Mesh(new THREE.BoxGeometry(0.45, 1.2, 0.5), hullMidMat);
  helmStand.position.set(0, 7.55, -5.8);
  const helmWheel = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.08, 6, 12), trimGoldMat);
  helmWheel.position.set(0, 8.15, -5.55);
  ship.add(lowerKeel, mainHull, bowLower, forecastle, mainDeck, quarterDeck, poopDeck, helmStand, helmWheel);

  // 2. BROADSIDE IRON NAVAL CANNONS (16 Heavy Cannons: 8 Port + 8 Starboard)
  const cannonZPositions = [-7.8, -5.2, -2.6, 0.0, 2.6, 5.2, 7.8, 10.2];
  [-1, 1].forEach((side) => {
    cannonZPositions.forEach((cz) => {
      // Dark open gunport cutout + gold trim surround
      const portHole = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.85, 0.92), ironMat);
      portHole.position.set(side * 4.42, 3.45, cz);
      // Tapered cast-iron cannon barrel protruding through gunport
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.26, 2.15, 8), ironMat);
      barrel.rotation.z = side * (Math.PI / 2);
      barrel.position.set(side * 4.85, 3.45, cz);
      // Muzzle ring
      const muzzle = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.055, 6, 10), ironMat);
      muzzle.rotation.y = Math.PI / 2;
      muzzle.position.set(side * 5.88, 3.45, cz);
      // Wooden carriage visible on gun deck
      const carriage = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.55, 0.65), hullMidMat);
      carriage.position.set(side * 3.7, 5.05, cz);
      ship.add(portHole, barrel, muzzle, carriage);
    });
  });

  // Heavy Iron Anchors hanging at Port & Starboard Bow
  [-1, 1].forEach((side) => {
    const shank = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 2.2, 6), ironMat);
    shank.position.set(side * 4.2, 4.1, 12.6);
    const fluke = new THREE.Mesh(new THREE.TorusGeometry(0.75, 0.11, 6, 10, Math.PI), ironMat);
    fluke.rotation.z = Math.PI;
    fluke.position.set(side * 4.2, 3.2, 12.6);
    ship.add(shank, fluke);
  });

  // 3. LONG ANGLED BOWSPRIT + BOWSPRIT NETTING + 2 TRIANGULAR JIB SAILS
  const bowsprit = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.36, 13.5, 8), mastMat);
  bowsprit.rotation.x = Math.PI / 2 - 0.34;
  bowsprit.position.set(0, 7.6, 19.2);
  ship.add(bowsprit);

  // Golden figurehead beneath bowsprit
  const figurehead = new THREE.Mesh(new THREE.ConeGeometry(0.65, 2.2, 6), trimGoldMat);
  figurehead.rotation.x = Math.PI / 2 - 0.35;
  figurehead.position.set(0, 5.1, 16.5);
  ship.add(figurehead);

  // Two large triangular jib sails on the bowsprit forestays
  const makeJibSail = (zFront: number, yFront: number, zBack: number, yTop: number) => {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.lineTo(zFront - zBack, yFront - 6.8);
    shape.lineTo(0, yTop - 6.8);
    shape.closePath();
    const geo = new THREE.ShapeGeometry(shape);
    geo.rotateY(-Math.PI / 2);
    const jib = new THREE.Mesh(geo, weatheredSailMat);
    jib.position.set(0.15, 6.8, zBack);
    return jib;
  };
  ship.add(
    makeJibSail(24.5, 9.6, 8.6, 18.8),
    makeJibSail(20.5, 8.2, 8.6, 15.6),
  );

  // 4. THREE TOWERING MASTS + MULTIPLE BILLOWING SAILS + CROW'S NESTS + ROPE CLIMBING NETS
  const mastConfigs = [
    { z: 8.6, baseY: 6.1, height: 18.5, yardScale: 0.86, isMain: false },
    { z: -0.4, baseY: 4.8, height: 24.0, yardScale: 1.08, isMain: true },
    { z: -9.6, baseY: 8.9, height: 15.5, yardScale: 0.72, isMain: false },
  ];

  mastConfigs.forEach(({ z: mz, baseY, height, yardScale, isMain }) => {
    // Main Mast Spar
    const mast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.44, height, 10),
      mastMat,
    );
    mast.position.set(0, baseY + height * 0.5, mz);
    mast.castShadow = true;
    ship.add(mast);

    // Crow's Nest Lookout Platform
    const nestY = baseY + height * 0.56;
    const nestFloor = new THREE.Mesh(new THREE.CylinderGeometry(1.45, 1.15, 0.35, 10), hullMidMat);
    nestFloor.position.set(0, nestY, mz);
    const nestRail = new THREE.Mesh(
      new THREE.CylinderGeometry(1.48, 1.48, 0.85, 10, 1, true),
      darkHullMat,
    );
    nestRail.position.set(0, nestY + 0.55, mz);
    ship.add(nestFloor, nestRail);

    // 3 Tiers of Yards & Big Billowing Square Sails per Mast (Lower Course, Topsail, Topgallant)
    const tiers = [
      { yFrac: 0.32, w: 12.2 * yardScale, h: height * 0.28, belly: 1.85, mat: sailMat },
      { yFrac: 0.64, w: 9.8 * yardScale, h: height * 0.24, belly: 1.55, mat: weatheredSailMat },
      { yFrac: 0.86, w: 6.8 * yardScale, h: height * 0.17, belly: 1.15, mat: sailMat },
    ];
    tiers.forEach((tier) => {
      const yy = baseY + height * tier.yFrac;
      const yard = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.14, tier.w + 1.4, 8),
        mastMat,
      );
      yard.rotation.z = Math.PI / 2;
      yard.position.set(0, yy + tier.h * 0.48, mz + 0.35);
      const sail = makeBillowingSail(tier.w, tier.h, tier.belly, tier.mat);
      sail.position.set(0, yy, mz + 0.45);
      ship.add(yard, sail);
    });

    // Port & Starboard Rope Climbing Nets (Shrouds + Horizontal Ratlines) from hull up to Crow's Nest
    const netBottomY = baseY + 0.4;
    const netTopY = nestY - 0.1;
    ship.add(
      makeRopeNet(-4.25, netBottomY, -0.7, netTopY, mz, 2.35, 5, 11),
      makeRopeNet(4.25, netBottomY, 0.7, netTopY, mz, 2.35, 5, 11),
    );

    // Upper Topmast Rope Nets above Crow's Nest
    ship.add(
      makeRopeNet(-1.25, nestY + 0.3, -0.35, baseY + height * 0.88, mz, 1.15, 3, 6),
      makeRopeNet(1.25, nestY + 0.3, 0.35, baseY + height * 0.88, mz, 1.15, 3, 6),
    );

    // Pirate Jolly Roger Black Flag at the Mainmast Peak (and black pennants on Fore/Mizzen)
    const flagY = baseY + height - 0.8;
    const flagW = isMain ? 4.4 : 2.8;
    const flagH = isMain ? 2.5 : 1.3;
    const flag = makeBillowingSail(flagW, flagH, 0.45, blackFlagMat);
    flag.rotation.y = Math.PI / 2;
    flag.position.set(0, flagY, mz - flagW * 0.5);
    ship.add(flag);

    if (isMain) {
      // Crisp white Skull & Crossbones emblem on both sides of the main Jolly Roger
      const skull = new THREE.Mesh(new THREE.CircleGeometry(0.52, 10), skullMat);
      skull.rotation.y = Math.PI / 2;
      skull.position.set(0.32, flagY + 0.18, mz - flagW * 0.5);
      const bone1 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 1.45), skullMat);
      bone1.position.set(0.32, flagY - 0.42, mz - flagW * 0.5);
      bone1.rotation.x = 0.45;
      const bone2 = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.14, 1.45), skullMat);
      bone2.position.set(0.32, flagY - 0.42, mz - flagW * 0.5);
      bone2.rotation.x = -0.45;
      ship.add(skull, bone1, bone2);
    }
  });

  // Aft Mizzen Spanker / Lateen Boom Sail
  const spankerBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 7.6, 6), mastMat);
  spankerBoom.rotation.x = Math.PI / 2;
  spankerBoom.position.set(0, 10.6, -13.4);
  const spankerSail = makeBillowingSail(6.4, 5.4, 0.9, weatheredSailMat);
  spankerSail.rotation.y = Math.PI / 2;
  spankerSail.position.set(0.15, 13.4, -13.2);
  ship.add(spankerBoom, spankerSail);

  // Centerline Forestays & Backstays connecting Masts & Bowsprit
  const addStayRope = (y1: number, z1: number, y2: number, z2: number) => {
    const dy = y2 - y1;
    const dz = z2 - z1;
    const len = Math.hypot(dy, dz);
    const stay = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, len, 5), ropeMat);
    stay.position.set(0, (y1 + y2) * 0.5, (z1 + z2) * 0.5);
    stay.rotation.x = Math.atan2(dz, dy);
    ship.add(stay);
  };
  addStayRope(24.5, 8.6, 9.6, 25.2);   // Foremast -> Bowsprit tip
  addStayRope(18.0, 8.6, 7.5, 19.5);   // Lower forestay -> Bowsprit
  addStayRope(28.0, -0.4, 21.5, 8.6);  // Mainmast -> Foremast
  addStayRope(24.0, -9.6, 25.5, -0.4); // Mizzenmast -> Mainmast
  addStayRope(24.0, -9.6, 9.4, -13.8); // Mizzen backstay -> Stern

  return ship;
}

export function createCreatureModel(species: CreatureSpecies): CreatureRig {
  if (isExpandedCreatureSpecies(species)) {
    return createExpandedCreatureModel(species, makeContactShadow);
  }
  const root = new THREE.Group();
  const body = new THREE.Group();
  const head = new THREE.Group();
  const tail = new THREE.Group();
  const legs: THREE.Group[] = [];
  let jaw: THREE.Group | undefined;
  let wings: THREE.Group[] | undefined;
  let breathWisps: THREE.Mesh[] | undefined;
  let maneTufts: THREE.Mesh[] | undefined;
  let eyeGlowMat: THREE.MeshBasicMaterial | undefined;

  if (species === 'trex') {
    const hideMat = new THREE.MeshStandardMaterial({ color: 0x5c4733, roughness: 0.78 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0x8d7255, roughness: 0.82 });
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.35 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.25 });

    body.position.y = 2.55;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.55, 2.8), hideMat);
    torso.castShadow = true;
    body.add(torso);
    const chest = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.9, 2.2), bellyMat);
    chest.position.set(0, -0.4, 0.1);
    body.add(chest);

    head.position.set(0, 0.65, 1.45);
    body.add(head);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.62, 1.2, 10), hideMat);
    neck.rotation.x = Math.PI / 5;
    neck.position.set(0, 0.3, 0.2);
    head.add(neck);
    const upperJaw = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.62, 1.55), hideMat);
    upperJaw.position.set(0, 0.78, 0.95);
    upperJaw.castShadow = true;
    head.add(upperJaw);
    [-0.38, 0.38].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 6, 6), eyeGlowMat);
      eye.position.set(ex, 0.95, 1.25);
      head.add(eye);
    });

    jaw = new THREE.Group();
    jaw.position.set(0, 0.46, 0.45);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.25, 1.3), bellyMat);
    lowerJaw.position.set(0, -0.05, 0.55);
    jaw.add(lowerJaw);
    for (let t = -2; t <= 2; t++) {
      const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 4), toothMat);
      tooth.rotation.x = Math.PI;
      tooth.position.set(t * 0.14, 0.46, 1.45);
      head.add(tooth);
    }
    head.add(jaw);

    tail.position.set(0, 0.15, -1.35);
    const tailBase = new THREE.Mesh(new THREE.ConeGeometry(0.58, 3.6, 8), hideMat);
    tailBase.rotation.x = -Math.PI / 2;
    tailBase.position.z = -1.7;
    tail.add(tailBase);
    body.add(tail);

    [-1, 1].forEach((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.68, -0.45, -0.2);
      const thigh = new THREE.Mesh(new THREE.BoxGeometry(0.48, 1.15, 0.68), hideMat);
      thigh.position.y = -0.5;
      thigh.castShadow = true;
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.0, 0.36), hideMat);
      shin.position.set(0, -1.4, -0.1);
      leg.add(thigh, shin);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(2.2));
  } else if (species === 'brachiosaurus') {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x627355, roughness: 0.84 });
    body.position.y = 3.2;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(2.1, 2.2, 4.2), skinMat);
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 1.1, 1.9);
    const longNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.65, 6.2, 10), skinMat);
    longNeck.rotation.x = 0.25;
    longNeck.position.set(0, 2.8, 0.8);
    longNeck.castShadow = true;
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.56, 1.1), skinMat);
    skull.position.set(0, 5.8, 1.6);
    head.add(longNeck, skull);
    body.add(head);

    tail.position.set(0, 0.2, -2.1);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.5, 4.2, 8), skinMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.z = -2.0;
    tail.add(tailMesh);
    body.add(tail);

    [
      [-0.85, 1.3],
      [0.85, 1.3],
      [-0.85, -1.3],
      [0.85, -1.3],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.6, lz);
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.34, 0.38, 2.6, 8), skinMat);
      col.position.y = -1.3;
      col.castShadow = true;
      leg.add(col);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(2.8));
  } else if (species === 'velociraptor') {
    const scaleMat = new THREE.MeshStandardMaterial({ color: 0x3b6e4c, roughness: 0.72 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.25 });
    body.position.y = 1.05;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.56, 1.25), scaleMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.32, 0.65);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.3, 0.75), scaleMat);
    snout.position.set(0, 0.32, 0.36);
    const crest = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.24, 0.36), stripeMat);
    crest.position.set(0, 0.54, 0.36);
    [-0.14, 0.14].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.045, 5, 5), eyeGlowMat);
      eye.position.set(ex, 0.39, 0.52);
      head.add(eye);
    });
    head.add(snout, crest);
    body.add(head);
    tail.position.set(0, 0.08, -0.6);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.18, 1.9, 6), scaleMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.z = -0.95;
    tail.add(tailMesh);
    body.add(tail);
    [-1, 1].forEach((side) => {
      const leg = new THREE.Group();
      leg.position.set(side * 0.28, -0.15, -0.1);
      const limb = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.85, 0.22), scaleMat);
      limb.position.y = -0.45;
      leg.add(limb);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.95));
  } else if (species === 'triceratops') {
    const armorMat = new THREE.MeshStandardMaterial({ color: 0x6b604e, roughness: 0.85 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.4 });
    body.position.y = 1.35;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.2, 2.3), armorMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.2, 1.25);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.78, 1.05), armorMat);
    skull.position.set(0, 0.05, 0.45);
    const frill = new THREE.Mesh(new THREE.CylinderGeometry(0.88, 0.88, 0.16, 12), armorMat);
    frill.rotation.x = Math.PI / 2.4;
    frill.position.set(0, 0.48, 0.02);
    head.add(skull, frill);
    [-0.28, 0.28].forEach((hx) => {
      const browHorn = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.85, 7), hornMat);
      browHorn.rotation.x = Math.PI / 2.6;
      browHorn.position.set(hx, 0.38, 0.95);
      head.add(browHorn);
    });
    body.add(head);
    tail.position.set(0, 0, -1.15);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.32, 1.5, 7), armorMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.z = -0.7;
    tail.add(tailMesh);
    body.add(tail);
    [
      [-0.52, 0.72],
      [0.52, 0.72],
      [-0.55, -0.72],
      [0.55, -0.72],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.35, lz);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.22, 1.0, 8), armorMat);
      pillar.position.y = -0.5;
      leg.add(pillar);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.75));
  } else if (species === 'stegosaurus') {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x4e6642, roughness: 0.82 });
    const plateMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.65 });
    body.position.y = 1.3;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(1.25, 1.25, 2.35), skinMat);
    torso.castShadow = true;
    body.add(torso);
    for (let i = 0; i < 6; i++) {
      const plate = new THREE.Mesh(new THREE.OctahedronGeometry(0.34, 0), plateMat);
      plate.scale.set(0.28, 1.35, 0.9);
      plate.position.set(i % 2 === 0 ? -0.18 : 0.18, 0.85, 0.8 - i * 0.36);
      body.add(plate);
    }
    head.position.set(0, -0.1, 1.3);
    const smallHead = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.38, 0.7), skinMat);
    smallHead.position.z = 0.32;
    head.add(smallHead);
    body.add(head);
    tail.position.set(0, 0.05, -1.15);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 1.8, 7), skinMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.z = -0.85;
    tail.add(tailMesh);
    body.add(tail);
    [
      [-0.48, 0.7],
      [0.48, 0.7],
      [-0.48, -0.7],
      [0.48, -0.7],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.3, lz);
      const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.2, 1.0, 8), skinMat);
      pillar.position.y = -0.5;
      leg.add(pillar);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.65));
  } else if (species === 'parasaurolophus') {
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x748554, roughness: 0.76 });
    const crestMat = new THREE.MeshStandardMaterial({ color: 0xc2410c, roughness: 0.65 });
    body.position.y = 1.45;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.0, 2.0), skinMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.45, 1.05);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.34, 0.9, 8), skinMat);
    neck.rotation.x = Math.PI / 4;
    neck.position.set(0, 0.2, 0.22);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.38, 0.75), skinMat);
    skull.position.set(0, 0.56, 0.52);
    const crest = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.14, 1.05, 8), crestMat);
    crest.rotation.x = -Math.PI / 3;
    crest.position.set(0, 0.78, 0.05);
    head.add(neck, skull, crest);
    body.add(head);
    tail.position.set(0, 0.1, -1.0);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.28, 2.0, 7), skinMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.position.z = -0.95;
    tail.add(tailMesh);
    body.add(tail);
    [
      [-0.36, 0.62],
      [0.36, 0.62],
      [-0.38, -0.58],
      [0.38, -0.58],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.25, lz);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.15, 1.2, 8), skinMat);
      limb.position.y = -0.6;
      leg.add(limb);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.35));
  } else if (species === 'deer') {
    const coatMat = new THREE.MeshStandardMaterial({ color: 0x9a6b42, roughness: 0.85 });
    const antlerMat = new THREE.MeshStandardMaterial({ color: 0xd6c7a9, roughness: 0.6 });
    body.position.y = 0.98;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.52, 1.15), coatMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.35, 0.55);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.55, 7), coatMat);
    neck.rotation.x = 0.3;
    neck.position.set(0, 0.18, 0.08);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.22, 0.38), coatMat);
    skull.position.set(0, 0.42, 0.25);
    [-0.1, 0.1].forEach((ax) => {
      const antler = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.42, 5), antlerMat);
      antler.rotation.z = ax > 0 ? -0.35 : 0.35;
      antler.position.set(ax, 0.66, 0.14);
      head.add(antler);
    });
    head.add(neck, skull);
    body.add(head);
    body.add(tail);
    [
      [-0.16, 0.38],
      [0.16, 0.38],
      [-0.16, -0.38],
      [0.16, -0.38],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.22, lz);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.76, 6), coatMat);
      l.position.y = -0.38;
      leg.add(l);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.65));
  } else if (species === 'cattle') {
    // Holstein Dairy Cow — distinct black & white coat, detailed muscle anatomy, udder, wet muzzle
    const tex = getAnimalTextures().holstein;
    const coatMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.72 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.76 });
    const muzzleMat = new THREE.MeshPhysicalMaterial({
      color: 0xf4b6b2,
      roughness: 0.28,
      clearcoat: 0.45,
      clearcoatRoughness: 0.22,
    });
    const udderMat = new THREE.MeshStandardMaterial({ color: 0xf9cbd3, roughness: 0.58 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.42 });
    const eyeMat = new THREE.MeshPhysicalMaterial({
      color: 0x111827,
      roughness: 0.08,
      clearcoat: 1.0,
    });

    body.position.y = 1.12;
    root.add(body);

    // Sculpted muscular barrel, ribcage, shoulder mass & hindquarters
    const barrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.46, 0.88, 6, 12), coatMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.scale.set(0.95, 1.0, 1.06);
    barrel.castShadow = true;
    const chestMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.45, 10, 8), coatMat);
    chestMuscle.scale.set(0.92, 1.04, 1.0);
    chestMuscle.position.set(0, -0.04, 0.42);
    chestMuscle.castShadow = true;
    const rumpMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.44, 10, 8), coatMat);
    rumpMuscle.scale.set(0.94, 0.98, 0.96);
    rumpMuscle.position.set(0, 0.02, -0.45);
    rumpMuscle.castShadow = true;
    const withers = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.24, 0.52), darkMat);
    withers.position.set(0, 0.36, 0.36);
    const dewlap = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.38, 7), coatMat);
    dewlap.rotation.x = Math.PI;
    dewlap.position.set(0, -0.34, 0.62);
    const udder = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 7), udderMat);
    udder.scale.set(0.95, 0.72, 1.05);
    udder.position.set(0, -0.44, -0.34);
    for (let tx = -1; tx <= 1; tx += 2) {
      for (let tz = -1; tz <= 1; tz += 2) {
        const teat = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.014, 0.08, 5), muzzleMat);
        teat.position.set(tx * 0.065, -0.56, -0.34 + tz * 0.055);
        body.add(teat);
      }
    }
    body.add(barrel, chestMuscle, rumpMuscle, withers, dewlap, udder);

    head.position.set(0, 0.26, 0.78);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 0.48, 8), coatMat);
    neck.rotation.x = Math.PI / 3.2;
    neck.position.set(0, 0.05, 0.06);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.46), darkMat);
    skull.position.set(0, 0.14, 0.28);
    skull.castShadow = true;
    const blaze = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.06), hornMat);
    blaze.position.set(0, 0.16, 0.51);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.22, 0.18), muzzleMat);
    muzzle.position.set(0, 0.01, 0.52);
    [-0.08, 0.08].forEach((nx) => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.025, 5, 5), darkMat);
      nostril.position.set(nx, 0.03, 0.61);
      head.add(nostril);
    });
    [-0.17, 0.17].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 7, 6), eyeMat);
      eye.position.set(ex, 0.22, 0.38);
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.07, 0.11), coatMat);
      ear.rotation.z = ex > 0 ? -0.25 : 0.25;
      ear.position.set(ex * 1.65, 0.22, 0.16);
      const h = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.2, 6), hornMat);
      h.rotation.z = ex > 0 ? -0.95 : 0.95;
      h.rotation.x = 0.35;
      h.position.set(ex * 0.9, 0.35, 0.18);
      head.add(eye, ear, h);
    });
    head.add(neck, skull, blaze, muzzle);
    body.add(head);

    tail.position.set(0, 0.24, -0.84);
    const tailCord = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.65, 6), coatMat);
    tailCord.rotation.x = 0.28;
    tailCord.position.set(0, -0.32, -0.09);
    const tailSwitch = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.2, 6), darkMat);
    tailSwitch.position.set(0, -0.68, -0.18);
    tail.add(tailCord, tailSwitch);
    body.add(tail);

    [
      [-0.31, 0.46],
      [0.31, 0.46],
      [-0.32, -0.48],
      [0.32, -0.48],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.24, lz);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.34, 4, 7), coatMat);
      upper.position.y = -0.22;
      upper.castShadow = true;
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.06, 0.42, 7), coatMat);
      cannon.position.y = -0.6;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.072, 0.082, 0.11, 7), darkMat);
      hoof.position.y = -0.82;
      leg.add(upper, cannon, hoof);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.1));
  } else if (species === 'pig') {
    // Large Pink Yorkshire Pig — coarse sparse bristles, muddy hooves, floppy ears, curly tail
    const pigTex = getAnimalTextures().pig;
    const skinMat = new THREE.MeshStandardMaterial({ map: pigTex, roughness: 0.66 });
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0xf4979c, roughness: 0.48 });
    const bristleMat = new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.92 });
    const mudHoofMat = new THREE.MeshStandardMaterial({
      color: 0x3f2a1d,
      roughness: 0.44,
      metalness: 0.05,
    });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x1c1917, roughness: 0.12, clearcoat: 0.9 });

    body.position.y = 0.62;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.36, 0.64, 6, 12), skinMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(1.06, 0.96, 1.0);
    torso.castShadow = true;
    const belly = new THREE.Mesh(new THREE.SphereGeometry(0.36, 9, 8), skinMat);
    belly.scale.set(1.04, 0.85, 1.35);
    belly.position.y = -0.05;
    body.add(torso, belly);

    // Coarse sparse spine bristles
    for (let b = 0; b < 7; b++) {
      const bristle = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.09, 4), bristleMat);
      bristle.position.set((b % 2 === 0 ? -1 : 1) * 0.02, 0.36, 0.32 - b * 0.11);
      bristle.rotation.x = -0.25;
      body.add(bristle);
    }

    head.position.set(0, 0.06, 0.56);
    const jowl = new THREE.Mesh(new THREE.SphereGeometry(0.26, 9, 8), skinMat);
    jowl.scale.set(1.02, 0.95, 1.1);
    jowl.position.z = 0.12;
    jowl.castShadow = true;
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 0.14, 10), snoutMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.03, 0.38);
    [-0.04, 0.04].forEach((nx) => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.02, 5, 5), mudHoofMat);
      nostril.position.set(nx, -0.03, 0.45);
      head.add(nostril);
    });
    [-0.14, 0.14].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 6), eyeMat);
      eye.position.set(ex, 0.08, 0.28);
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.035, 0.2), skinMat);
      ear.rotation.x = 0.55;
      ear.rotation.z = ex > 0 ? -0.45 : 0.45;
      ear.position.set(ex * 1.15, 0.2, 0.12);
      head.add(eye, ear);
    });
    head.add(jowl, snout);
    body.add(head);

    tail.position.set(0, 0.12, -0.58);
    const curl = new THREE.Mesh(new THREE.TorusGeometry(0.06, 0.018, 6, 12, Math.PI * 1.65), skinMat);
    curl.rotation.y = Math.PI / 2;
    curl.position.z = -0.04;
    tail.add(curl);
    body.add(tail);

    [
      [-0.22, 0.34],
      [0.22, 0.34],
      [-0.22, -0.34],
      [0.22, -0.34],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.22, lz);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.068, 0.24, 7), skinMat);
      upper.position.y = -0.11;
      const mudLower = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.068, 0.14, 7), mudHoofMat);
      mudLower.position.y = -0.29;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.068, 0.075, 0.07, 7), mudHoofMat);
      hoof.position.y = -0.37;
      leg.add(upper, mudLower, hoof);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.68));
  } else if (species === 'horse') {
    // Chestnut Quarter Horse — glossy coat, flowing mane and tail, muscular build, reflective eyes
    const horseTex = getAnimalTextures().horse;
    const coatMat = new THREE.MeshPhysicalMaterial({
      map: horseTex,
      roughness: 0.34,
      clearcoat: 0.65,
      clearcoatRoughness: 0.24,
      sheen: 0.55,
      sheenColor: new THREE.Color(0xd97706),
    });
    const maneMat = new THREE.MeshStandardMaterial({ color: 0x2c140a, roughness: 0.78 });
    const muzzleMat = new THREE.MeshStandardMaterial({ color: 0x3b1e14, roughness: 0.48 });
    const blazeMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.6 });
    const hoofMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.36 });
    const eyeMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.04,
      clearcoat: 1.0,
      reflectivity: 1.0,
    });

    body.position.y = 1.28;
    root.add(body);

    // Muscular Quarter Horse barrel, deep chest & powerful hindquarters
    const barrel = new THREE.Mesh(new THREE.CapsuleGeometry(0.38, 0.96, 6, 12), coatMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.scale.set(0.9, 1.02, 1.0);
    barrel.castShadow = true;
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.41, 10, 8), coatMat);
    chest.scale.set(0.88, 1.06, 0.98);
    chest.position.set(0, 0.02, 0.45);
    chest.castShadow = true;
    const hindquarters = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), coatMat);
    hindquarters.scale.set(0.92, 1.02, 1.04);
    hindquarters.position.set(0, 0.06, -0.48);
    hindquarters.castShadow = true;
    body.add(barrel, chest, hindquarters);

    head.position.set(0, 0.32, 0.68);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.3, 0.88, 9), coatMat);
    neck.rotation.x = 0.58;
    neck.position.set(0, 0.32, 0.24);
    neck.castShadow = true;
    // Flowing multi-lock mane crest along upper neck
    for (let m = 0; m < 6; m++) {
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.16, 0.14), maneMat);
      const t = m / 5;
      lock.position.set(0.05, 0.14 + t * 0.48, 0.02 + t * 0.36);
      lock.rotation.z = -0.35;
      lock.rotation.x = 0.45;
      head.add(lock);
    }

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.26, 0.42), coatMat);
    skull.rotation.x = 0.42;
    skull.position.set(0, 0.56, 0.62);
    skull.castShadow = true;
    const snout = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.115, 0.24, 8), muzzleMat);
    snout.rotation.x = Math.PI / 2 + 0.42;
    snout.position.set(0, 0.43, 0.84);
    const blaze = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.04, 0.36), blazeMat);
    blaze.rotation.x = 0.42;
    blaze.position.set(0, 0.63, 0.7);
    [-0.08, 0.08].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.17, 5), coatMat);
      ear.rotation.x = 0.15;
      ear.rotation.z = ex > 0 ? -0.15 : 0.15;
      ear.position.set(ex, 0.78, 0.46);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 8, 7), eyeMat);
      eye.position.set(ex * 1.45, 0.63, 0.65);
      head.add(ear, eye);
    });
    head.add(neck, skull, snout, blaze);
    body.add(head);

    // Flowing horse tail
    tail.position.set(0, 0.26, -0.88);
    for (let t = 0; t < 3; t++) {
      const strand = new THREE.Mesh(new THREE.ConeGeometry(0.08 - t * 0.015, 0.86, 7), maneMat);
      strand.rotation.x = 0.24 + t * 0.08;
      strand.position.set((t - 1) * 0.025, -0.4, -0.1 - t * 0.05);
      tail.add(strand);
    }
    body.add(tail);

    [
      [-0.24, 0.52],
      [0.24, 0.52],
      [-0.25, -0.52],
      [0.25, -0.52],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.18, lz);
      const forearm = new THREE.Mesh(new THREE.CapsuleGeometry(0.095, 0.44, 4, 7), coatMat);
      forearm.position.y = -0.26;
      forearm.castShadow = true;
      const cannon = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.045, 0.52, 7), coatMat);
      cannon.position.y = -0.74;
      const fetlock = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), maneMat);
      fetlock.position.y = -0.98;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.072, 0.1, 7), hoofMat);
      hoof.position.y = -1.06;
      leg.add(forearm, cannon, fetlock, hoof);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.05));
  } else if (species === 'sheep') {
    // Suffolk Sheep — thick textured white wool fleece + matte black face & legs
    const woolTex = getAnimalTextures().wool;
    const woolMat = new THREE.MeshStandardMaterial({ map: woolTex, roughness: 0.96 });
    const blackFaceMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.86 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xd97706, roughness: 0.12, clearcoat: 0.9 });

    body.position.y = 0.68;
    root.add(body);

    // Thick layered wool fleece cloud wrapping torso
    const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.33, 0.58, 6, 10), woolMat);
    core.rotation.x = Math.PI / 2;
    core.castShadow = true;
    body.add(core);
    const fleecePuffs: [number, number, number, number][] = [
      [0, 0.18, 0.25, 0.26],
      [0, 0.2, -0.22, 0.26],
      [-0.22, 0.05, 0.06, 0.24],
      [0.22, 0.05, 0.06, 0.24],
      [-0.2, 0.06, -0.24, 0.23],
      [0.2, 0.06, -0.24, 0.23],
      [0, 0.14, 0.44, 0.22],
    ];
    fleecePuffs.forEach(([px, py, pz, r]) => {
      const puff = new THREE.Mesh(new THREE.DodecahedronGeometry(r, 1), woolMat);
      puff.position.set(px, py, pz);
      puff.castShadow = true;
      body.add(puff);
    });

    head.position.set(0, 0.18, 0.52);
    const skull = new THREE.Mesh(new THREE.CapsuleGeometry(0.13, 0.18, 5, 8), blackFaceMat);
    skull.rotation.x = Math.PI / 2.2;
    skull.position.z = 0.16;
    skull.castShadow = true;
    const woolCrown = new THREE.Mesh(new THREE.SphereGeometry(0.11, 7, 6), woolMat);
    woolCrown.position.set(0, 0.11, 0.04);
    [-0.12, 0.12].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.025, 6, 6), eyeMat);
      eye.position.set(ex, 0.06, 0.22);
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.04, 0.08), blackFaceMat);
      ear.rotation.z = ex > 0 ? -0.45 : 0.45;
      ear.position.set(ex * 1.35, 0.04, 0.08);
      head.add(eye, ear);
    });
    head.add(skull, woolCrown);
    body.add(head);

    tail.position.set(0, 0.08, -0.52);
    const woolTail = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), woolMat);
    woolTail.position.set(0, -0.05, -0.04);
    tail.add(woolTail);
    body.add(tail);

    [
      [-0.18, 0.28],
      [0.18, 0.28],
      [-0.18, -0.28],
      [0.18, -0.28],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.2, lz);
      const woolTop = new THREE.Mesh(new THREE.SphereGeometry(0.09, 6, 6), woolMat);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.036, 0.46, 6), blackFaceMat);
      shin.position.y = -0.24;
      leg.add(woolTop, shin);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.62));
  } else if (species === 'goat') {
    // Nigerian Dwarf Goat — mottled brown & white fur, small curved horns, alert expression
    const goatTex = getAnimalTextures().goat;
    const coatMat = new THREE.MeshStandardMaterial({ map: goatTex, roughness: 0.82 });
    const darkBrownMat = new THREE.MeshStandardMaterial({ color: 0x29180e, roughness: 0.72 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x3f3a36, roughness: 0.48 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xf59e0b, roughness: 0.08, clearcoat: 1.0 });

    body.position.y = 0.56;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.46, 5, 10), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(0.92, 1.04, 1.0);
    torso.castShadow = true;
    body.add(torso);

    head.position.set(0, 0.24, 0.34);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.12, 0.26, 7), coatMat);
    neck.rotation.x = 0.35;
    neck.position.set(0, 0.08, 0.04);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.18, 0.28), coatMat);
    skull.position.set(0, 0.2, 0.16);
    skull.castShadow = true;
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.13, 5), darkBrownMat);
    beard.rotation.x = Math.PI;
    beard.position.set(0, 0.06, 0.25);
    [-0.08, 0.08].forEach((hx) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 6, 6), eyeMat);
      eye.position.set(hx * 1.1, 0.24, 0.22);
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.03, 0.06), coatMat);
      ear.rotation.z = hx > 0 ? 0.18 : -0.18;
      ear.position.set(hx * 1.55, 0.25, 0.08);
      // Small backward-curving horn
      const hornLower = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.14, 6), hornMat);
      hornLower.rotation.x = -0.45;
      hornLower.rotation.z = hx > 0 ? -0.22 : 0.22;
      hornLower.position.set(hx * 0.75, 0.34, 0.09);
      const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.018, 0.1, 5), hornMat);
      hornTip.rotation.x = -1.05;
      hornTip.position.set(hx * 0.95, 0.38, 0.01);
      head.add(eye, ear, hornLower, hornTip);
    });
    head.add(neck, skull, beard);
    body.add(head);

    tail.position.set(0, 0.14, -0.38);
    const uprightTail = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.14, 5), darkBrownMat);
    uprightTail.rotation.x = -0.5;
    uprightTail.position.set(0, 0.06, -0.03);
    tail.add(uprightTail);
    body.add(tail);

    [
      [-0.12, 0.22],
      [0.12, 0.22],
      [-0.12, -0.22],
      [0.12, -0.22],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.14, lz);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.032, 0.38, 6), coatMat);
      l.position.y = -0.19;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.06, 6), darkBrownMat);
      hoof.position.y = -0.39;
      leg.add(l, hoof);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.45));
  } else if (species === 'rabbit') {
    const furMat = new THREE.MeshStandardMaterial({ color: 0xa8927c, roughness: 0.92 });
    body.position.y = 0.26;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.22, 8, 8), furMat);
    torso.scale.set(0.85, 0.85, 1.3);
    body.add(torso);
    head.position.set(0, 0.14, 0.22);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.13, 8, 8), furMat);
    [-0.05, 0.05].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.025, 0.18, 3, 5), furMat);
      ear.position.set(ex, 0.18, -0.02);
      head.add(ear);
    });
    head.add(skull);
    body.add(head);
    body.add(tail);
    [-0.1, 0.1].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.1, -0.1);
      const l = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.18, 0.14), furMat);
      leg.add(l);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.28));
  } else if (species === 'wild_boar') {
    const furMat = new THREE.MeshStandardMaterial({ color: 0x4b3629, roughness: 0.9 });
    const tuskMat = new THREE.MeshStandardMaterial({ color: 0xf5f5f4, roughness: 0.4 });
    body.position.y = 0.6;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.58, 0.52, 0.96), furMat);
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.06, 0.54);
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.34, 0.44), furMat);
    snout.position.z = 0.16;
    [-0.14, 0.14].forEach((tx) => {
      const tusk = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.18, 5), tuskMat);
      tusk.rotation.x = -0.4;
      tusk.position.set(tx, -0.04, 0.36);
      head.add(tusk);
    });
    head.add(snout);
    body.add(head);
    body.add(tail);
    [
      [-0.2, 0.32],
      [0.2, 0.32],
      [-0.2, -0.32],
      [0.2, -0.32],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.2, lz);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.055, 0.4, 6), furMat);
      l.position.y = -0.2;
      leg.add(l);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.58));
  } else if (species === 'jungle_fowl') {
    // Rhode Island Red Rooster — iridescent dark red & black tail feathers, bright red comb & wattle
    const featherMat = new THREE.MeshPhysicalMaterial({
      color: 0x7f1d1d,
      roughness: 0.5,
      iridescence: 0.42,
      iridescenceIOR: 1.35,
    });
    const hackleMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.52 });
    const tailIridescentMat = new THREE.MeshPhysicalMaterial({
      color: 0x0f172a,
      roughness: 0.25,
      metalness: 0.35,
      iridescence: 0.95,
      iridescenceIOR: 1.5,
      clearcoat: 0.7,
    });
    const combMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.42 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.45 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x111827, roughness: 0.08, clearcoat: 1.0 });

    body.position.y = 0.4;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.24, 10, 8), featherMat);
    torso.scale.set(0.84, 0.9, 1.24);
    torso.castShadow = true;
    body.add(torso);
    [-0.18, 0.18].forEach((wx) => {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.14, 8, 6), hackleMat);
      wing.scale.set(0.45, 0.85, 1.35);
      wing.position.set(wx, 0.02, -0.02);
      body.add(wing);
    });

    head.position.set(0, 0.2, 0.2);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.2, 8), hackleMat);
    neck.rotation.x = 0.25;
    neck.position.set(0, 0.06, 0.04);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 8), hackleMat);
    skull.position.set(0, 0.16, 0.08);
    // Serrated bright red comb
    for (let c = 0; c < 4; c++) {
      const point = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.075, 5), combMat);
      point.position.set(0, 0.26 + (c === 1 || c === 2 ? 0.015 : 0), 0.03 + c * 0.032);
      head.add(point);
    }
    // Bright red wattle under beak
    [-0.024, 0.024].forEach((wx) => {
      const wattle = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), combMat);
      wattle.scale.set(0.75, 1.35, 0.75);
      wattle.position.set(wx, 0.09, 0.16);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), eyeMat);
      eye.position.set(wx * 3.5, 0.18, 0.12);
      head.add(wattle, eye);
    });
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.035, 0.11, 5), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.set(0, 0.14, 0.2);
    head.add(neck, skull, beak);
    body.add(head);

    // Sweeping iridescent dark red & black sickle tail feathers
    tail.position.set(0, 0.14, -0.26);
    for (let f = 0; f < 5; f++) {
      const feather = new THREE.Mesh(
        new THREE.ConeGeometry(0.045, 0.34 + (f % 2) * 0.08, 5),
        f % 2 === 0 ? tailIridescentMat : featherMat,
      );
      feather.rotation.x = -0.65 - (f - 2) * 0.12;
      feather.rotation.z = (f - 2) * 0.14;
      feather.position.set((f - 2) * 0.028, 0.12, -0.1);
      tail.add(feather);
    }
    body.add(tail);

    [-0.08, 0.08].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.14, 0.02);
      const l = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.018, 0.24, 5), beakMat);
      l.position.y = -0.12;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.018, 0.1), beakMat);
      foot.position.set(0, -0.25, 0.025);
      leg.add(l, foot);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.28));
  } else if (species === 'duck') {
    // Pekin Duck — bright white plumage with water-droplet sheen, vibrant orange bill & webbed feet
    const whitePlumageMat = new THREE.MeshPhysicalMaterial({
      color: 0xfefefe,
      roughness: 0.42,
      clearcoat: 0.55,
      clearcoatRoughness: 0.16,
    });
    const dropletMat = new THREE.MeshPhysicalMaterial({
      color: 0xe0f2fe,
      roughness: 0.05,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.85,
    });
    const orangeMat = new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.38 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.06, clearcoat: 1.0 });

    body.position.y = 0.28;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.SphereGeometry(0.21, 10, 8), whitePlumageMat);
    torso.scale.set(0.88, 0.82, 1.38);
    torso.castShadow = true;
    body.add(torso);
    [-0.16, 0.16].forEach((wx) => {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), whitePlumageMat);
      wing.scale.set(0.45, 0.72, 1.45);
      wing.position.set(wx, 0.02, -0.02);
      body.add(wing);
    });
    // Glistening water droplets beaded along back feathers
    [
      [0.05, 0.17, 0.04],
      [-0.06, 0.16, -0.06],
      [0.08, 0.14, -0.11],
      [-0.02, 0.17, 0.09],
    ].forEach(([dx, dy, dz]) => {
      const drop = new THREE.Mesh(new THREE.SphereGeometry(0.015, 5, 5), dropletMat);
      drop.position.set(dx, dy, dz);
      body.add(drop);
    });

    head.position.set(0, 0.16, 0.2);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.095, 0.18, 8), whitePlumageMat);
    neck.rotation.x = 0.15;
    neck.position.set(0, 0.06, 0.02);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.095, 8, 8), whitePlumageMat);
    skull.position.set(0, 0.16, 0.05);
    const bill = new THREE.Mesh(new THREE.BoxGeometry(0.085, 0.032, 0.14), orangeMat);
    bill.position.set(0, 0.14, 0.16);
    [-0.068, 0.068].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.016, 5, 5), eyeMat);
      eye.position.set(ex, 0.18, 0.09);
      head.add(eye);
    });
    head.add(neck, skull, bill);
    body.add(head);

    tail.position.set(0, 0.08, -0.28);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), whitePlumageMat);
    tailTip.rotation.x = -1.15;
    tailTip.position.set(0, 0.04, -0.05);
    tail.add(tailTip);
    body.add(tail);

    [-0.075, 0.075].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.12, 0.02);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.016, 0.14, 5), orangeMat);
      shin.position.y = -0.07;
      const webbedFoot = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.11, 3), orangeMat);
      webbedFoot.rotation.x = Math.PI / 2;
      webbedFoot.scale.set(1.0, 1.0, 0.2);
      webbedFoot.position.set(0, -0.14, 0.04);
      leg.add(shin, webbedFoot);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.25));
  } else if (species === 'barn_cat') {
    // Scruffy Tabby Barn Cat — striped fur, cream bib, pointed ears, green-amber eyes, 3D whiskers
    const tabbyTex = getAnimalTextures().tabby;
    const furMat = new THREE.MeshStandardMaterial({ map: tabbyTex, roughness: 0.86 });
    const creamMat = new THREE.MeshStandardMaterial({ color: 0xf5ebe0, roughness: 0.88 });
    const pinkMat = new THREE.MeshStandardMaterial({ color: 0xf4a2a8, roughness: 0.55 });
    const eyeMat = new THREE.MeshPhysicalMaterial({
      color: 0x84cc16,
      emissive: 0x3f6212,
      emissiveIntensity: 0.25,
      roughness: 0.06,
      clearcoat: 1.0,
    });
    const whiskerMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.4 });

    body.position.y = 0.26;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.28, 5, 9), furMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    const chestBib = new THREE.Mesh(new THREE.SphereGeometry(0.095, 7, 6), creamMat);
    chestBib.position.set(0, -0.02, 0.14);
    body.add(torso, chestBib);

    head.position.set(0, 0.12, 0.2);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.105, 8, 8), furMat);
    skull.scale.set(1.06, 0.96, 1.0);
    skull.castShadow = true;
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), creamMat);
    muzzle.scale.set(1.15, 0.78, 0.9);
    muzzle.position.set(0, -0.025, 0.085);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.014, 5, 5), pinkMat);
    nose.position.set(0, -0.01, 0.128);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.08, 4), furMat);
      ear.rotation.z = -side * 0.22;
      ear.position.set(side * 0.065, 0.095, 0.01);
      const innerEar = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.05, 4), pinkMat);
      innerEar.rotation.z = -side * 0.22;
      innerEar.position.set(side * 0.065, 0.092, 0.022);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.02, 6, 6), eyeMat);
      eye.position.set(side * 0.046, 0.025, 0.088);
      // 3 crisp whiskers per cheek
      for (let w = -1; w <= 1; w++) {
        const whisker = new THREE.Mesh(
          new THREE.CylinderGeometry(0.002, 0.001, 0.12, 4),
          whiskerMat,
        );
        whisker.rotation.z = Math.PI / 2 + w * 0.14;
        whisker.rotation.y = side * -0.18;
        whisker.position.set(side * 0.075, -0.024 + w * 0.008, 0.095);
        head.add(whisker);
      }
      head.add(ear, innerEar, eye);
    });
    head.add(skull, muzzle, nose);
    body.add(head);

    tail.position.set(0, 0.04, -0.2);
    const tailSeg1 = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.028, 0.24, 6), furMat);
    tailSeg1.rotation.x = -0.85;
    tailSeg1.position.set(0, 0.08, -0.09);
    const tailSeg2 = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.024, 0.18, 6), furMat);
    tailSeg2.rotation.x = -0.2;
    tailSeg2.position.set(0, 0.22, -0.16);
    tail.add(tailSeg1, tailSeg2);
    body.add(tail);

    [
      [-0.07, 0.13],
      [0.07, 0.13],
      [-0.075, -0.13],
      [0.075, -0.13],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.07, lz);
      const limb = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.17, 6), furMat);
      limb.position.y = -0.08;
      const paw = new THREE.Mesh(new THREE.SphereGeometry(0.026, 6, 5), creamMat);
      paw.position.set(0, -0.17, 0.012);
      leg.add(limb, paw);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.24));
  } else if (species === 'grizzly_bear') {
    // Massive North American Grizzly Bear — silver-tipped dark brown fur, powerful shoulder hump, heavy claws
    const tex = getAnimalTextures().grizzly;
    const furMat = new THREE.MeshStandardMaterial({ map: tex, roughness: 0.9 });
    const snoutMat = new THREE.MeshStandardMaterial({ color: 0x6b4b35, roughness: 0.78 });
    const noseMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35 });
    const clawMat = new THREE.MeshStandardMaterial({ color: 0xd6d3d1, roughness: 0.4 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x1c1917, roughness: 0.1, clearcoat: 0.9 });

    body.position.y = 1.04;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.52, 0.92, 6, 12), furMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(1.06, 1.0, 1.0);
    torso.castShadow = true;
    // Powerful grizzly shoulder hump
    const shoulderHump = new THREE.Mesh(new THREE.SphereGeometry(0.46, 10, 8), furMat);
    shoulderHump.scale.set(1.02, 0.96, 1.05);
    shoulderHump.position.set(0, 0.32, 0.42);
    shoulderHump.castShadow = true;
    const hindquarters = new THREE.Mesh(new THREE.SphereGeometry(0.48, 10, 8), furMat);
    hindquarters.position.set(0, 0.04, -0.46);
    hindquarters.castShadow = true;
    body.add(torso, shoulderHump, hindquarters);

    head.position.set(0, 0.24, 0.86);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.36, 8), furMat);
    neck.rotation.x = Math.PI / 2.6;
    neck.position.set(0, 0.02, 0.06);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.3, 10, 8), furMat);
    skull.scale.set(1.12, 0.96, 1.02);
    skull.position.set(0, 0.08, 0.24);
    skull.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.2, 0.28), snoutMat);
    snout.position.set(0, 0.0, 0.48);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 6), noseMat);
    nose.position.set(0, 0.06, 0.62);
    [-0.16, 0.16].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.085, 7, 6), furMat);
      ear.scale.set(1.0, 1.0, 0.55);
      ear.position.set(ex * 1.15, 0.3, 0.18);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), eyeMat);
      eye.position.set(ex * 0.85, 0.14, 0.44);
      head.add(ear, eye);
    });
    head.add(neck, skull, snout, nose);
    body.add(head);

    tail.position.set(0, 0.14, -0.92);
    const stubTail = new THREE.Mesh(new THREE.SphereGeometry(0.11, 6, 6), furMat);
    tail.add(stubTail);
    body.add(tail);

    [
      [-0.35, 0.44],
      [0.35, 0.44],
      [-0.36, -0.46],
      [0.36, -0.46],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.22, lz);
      const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.34, 4, 8), furMat);
      thigh.position.y = -0.26;
      thigh.castShadow = true;
      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.12, 0.3), furMat);
      paw.position.set(0, -0.74, 0.05);
      for (let c = -1; c <= 1; c++) {
        const claw = new THREE.Mesh(new THREE.ConeGeometry(0.02, 0.09, 4), clawMat);
        claw.rotation.x = Math.PI / 2.2;
        claw.position.set(c * 0.065, -0.75, 0.22);
        leg.add(claw);
      }
      leg.add(thigh, paw);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.25));
  } else if (species === 'gray_wolf') {
    // Timber Wolf — thick layered gray & white fur, piercing amber eyes, cold breath visible
    const wolfTex = getAnimalTextures().wolf;
    const furMat = new THREE.MeshStandardMaterial({ map: wolfTex, roughness: 0.84 });
    const whiteRuffMat = new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.88 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, transparent: true, opacity: 0.9 });

    body.position.y = 0.72;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 0.64, 5, 10), furMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(0.92, 1.02, 1.0);
    torso.castShadow = true;
    const chestRuff = new THREE.Mesh(new THREE.SphereGeometry(0.26, 8, 8), whiteRuffMat);
    chestRuff.scale.set(0.95, 1.05, 0.95);
    chestRuff.position.set(0, 0.04, 0.34);
    body.add(torso, chestRuff);

    head.position.set(0, 0.22, 0.5);
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.22, 0.32, 8), furMat);
    neck.rotation.x = Math.PI / 3.4;
    neck.position.set(0, 0.04, 0.04);
    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.2, 0.28), furMat);
    skull.position.set(0, 0.14, 0.2);
    skull.castShadow = true;
    const snout = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.11, 0.22), whiteRuffMat);
    snout.position.set(0, 0.09, 0.4);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.028, 5, 5), darkMat);
    nose.position.set(0, 0.12, 0.51);
    [-0.08, 0.08].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.15, 5), furMat);
      ear.position.set(ex, 0.29, 0.12);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.024, 6, 6), eyeGlowMat);
      eye.position.set(ex * 0.92, 0.17, 0.32);
      head.add(ear, eye);
    });
    // Visible cold-air breath wisps in front of wolf muzzle
    breathWisps = [];
    const breathMat = new THREE.MeshBasicMaterial({
      color: 0xe2e8f0,
      transparent: true,
      opacity: 0.42,
      depthWrite: false,
    });
    for (let w = 0; w < 3; w++) {
      const wisp = new THREE.Mesh(new THREE.SphereGeometry(0.055 + w * 0.022, 6, 6), breathMat.clone());
      wisp.position.set((w - 1) * 0.02, 0.12 + w * 0.04, 0.56 + w * 0.09);
      head.add(wisp);
      breathWisps.push(wisp);
    }
    head.add(neck, skull, snout, nose);
    body.add(head);

    tail.position.set(0, 0.1, -0.5);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.54, 7), furMat);
    tailMesh.rotation.x = -Math.PI / 2.6;
    tailMesh.position.set(0, -0.1, -0.22);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.16, 6), darkMat);
    tailTip.rotation.x = -Math.PI / 2.6;
    tailTip.position.set(0, -0.2, -0.44);
    tail.add(tailMesh, tailTip);
    body.add(tail);

    [
      [-0.14, 0.32],
      [0.14, 0.32],
      [-0.15, -0.32],
      [0.15, -0.32],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.16, lz);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.042, 0.3, 6), furMat);
      upper.position.y = -0.14;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.035, 0.28, 6), whiteRuffMat);
      lower.position.y = -0.41;
      leg.add(upper, lower);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.65));
  } else if (species === 'african_lion') {
    // Male African Lion — thick dark windblown mane, scarred muzzle, muscular frame
    const textures = getAnimalTextures();
    const coatMat = new THREE.MeshStandardMaterial({ map: textures.lion, roughness: 0.72 });
    const maneMat = new THREE.MeshStandardMaterial({ map: textures.lionMane, roughness: 0.92 });
    const scarMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.5 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x29150b, roughness: 0.75 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.65 });

    body.position.y = 0.92;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 0.84, 6, 12), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.scale.set(0.95, 1.0, 1.0);
    torso.castShadow = true;
    const chestMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.36, 9, 8), coatMat);
    chestMuscle.position.set(0, 0.02, 0.38);
    chestMuscle.castShadow = true;
    const rumpMuscle = new THREE.Mesh(new THREE.SphereGeometry(0.33, 9, 8), coatMat);
    rumpMuscle.position.set(0, 0.02, -0.42);
    body.add(torso, chestMuscle, rumpMuscle);

    head.position.set(0, 0.24, 0.62);
    // Thick windblown dark mane collar + sweeping tufts
    const maneCore = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), maneMat);
    maneCore.scale.set(1.02, 1.08, 0.95);
    maneCore.position.set(0, 0.06, 0.06);
    maneCore.castShadow = true;
    head.add(maneCore);

    maneTufts = [];
    for (let m = 0; m < 10; m++) {
      const a = (m / 10) * Math.PI * 2;
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.32, 5), maneMat);
      tuft.position.set(Math.cos(a) * 0.28, 0.08 + Math.sin(a) * 0.28, 0.04);
      tuft.rotation.z = -a - Math.PI / 2;
      tuft.rotation.x = -0.42;
      head.add(tuft);
      maneTufts.push(tuft);
    }

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.26, 0.34), coatMat);
    skull.position.set(0, 0.08, 0.26);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.15, 0.22), coatMat);
    muzzle.position.set(0, -0.01, 0.44);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 5), darkMat);
    nose.position.set(0, 0.04, 0.55);
    // Scarred muzzle & brow slashes
    const scar1 = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.015, 0.15), scarMat);
    scar1.position.set(0.07, 0.06, 0.47);
    scar1.rotation.y = 0.25;
    const scar2 = new THREE.Mesh(new THREE.BoxGeometry(0.016, 0.09, 0.018), scarMat);
    scar2.position.set(-0.085, 0.14, 0.43);
    scar2.rotation.z = 0.3;
    [-0.12, 0.12].forEach((ex) => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.055, 6, 5), coatMat);
      ear.position.set(ex * 1.15, 0.24, 0.2);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 6, 6), eyeGlowMat);
      eye.position.set(ex * 0.86, 0.13, 0.41);
      head.add(ear, eye);
    });
    head.add(skull, muzzle, nose, scar1, scar2);
    body.add(head);

    tail.position.set(0, 0.14, -0.76);
    const tailShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.02, 0.68, 6), coatMat);
    tailShaft.rotation.x = 0.45;
    tailShaft.position.set(0, -0.26, -0.14);
    const tailTuft = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.16, 6), maneMat);
    tailTuft.rotation.x = -0.9;
    tailTuft.position.set(0, -0.55, -0.28);
    tail.add(tailShaft, tailTuft);
    body.add(tail);

    [
      [-0.22, 0.42],
      [0.22, 0.42],
      [-0.22, -0.44],
      [0.22, -0.44],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.22, lz);
      const upper = new THREE.Mesh(new THREE.CapsuleGeometry(0.09, 0.34, 4, 7), coatMat);
      upper.position.y = -0.22;
      upper.castShadow = true;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.06, 0.32, 7), coatMat);
      lower.position.y = -0.52;
      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.08, 0.18), coatMat);
      paw.position.set(0, -0.68, 0.04);
      leg.add(upper, lower, paw);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.9));
  } else if (species === 'bald_eagle') {
    // American Bald Eagle — wide spread dark brown wings, sharp white head & tail feathers, yellow talons extended
    const darkBrownMat = new THREE.MeshStandardMaterial({ color: 0x3b2416, roughness: 0.72 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.68 });
    const beakYellowMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.35 });
    const talonMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xfde047, roughness: 0.08, clearcoat: 1.0 });

    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.2, 0.48, 5, 10), darkBrownMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    body.add(torso);

    // Sharp White Head & Hooked Yellow Beak
    head.position.set(0, 0.08, 0.32);
    const whiteNeck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.17, 0.22, 8), whiteMat);
    whiteNeck.rotation.x = Math.PI / 2.4;
    whiteNeck.position.set(0, 0.02, 0.04);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.135, 8, 8), whiteMat);
    skull.position.set(0, 0.07, 0.16);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.052, 0.18, 5), beakYellowMat);
    beak.rotation.x = Math.PI / 1.85;
    beak.position.set(0, 0.05, 0.3);
    [-0.08, 0.08].forEach((ex) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.022, 5, 5), eyeMat);
      eye.position.set(ex, 0.09, 0.23);
      head.add(eye);
    });
    head.add(whiteNeck, skull, beak);
    body.add(head);

    // Broad Spread Wings with layered primary feather tips
    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.15, 0.08, 0.06);
      const innerWing = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.045, 0.38), darkBrownMat);
      innerWing.position.x = side * 0.38;
      innerWing.castShadow = true;
      const outerWing = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.032, 0.3), darkBrownMat);
      outerWing.position.set(side * 0.98, 0.02, -0.04);
      outerWing.rotation.y = -side * 0.18;
      wing.add(innerWing, outerWing);
      for (let f = 0; f < 4; f++) {
        const tip = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.32, 4), darkBrownMat);
        tip.rotation.z = -side * (Math.PI / 2);
        tip.rotation.y = -side * (0.28 - f * 0.14);
        tip.position.set(side * 1.28, 0.02, 0.06 - f * 0.075);
        wing.add(tip);
      }
      body.add(wing);
      wings!.push(wing);
    });

    // Fanned White Tail Feathers
    tail.position.set(0, 0.02, -0.36);
    const tailFan = new THREE.Mesh(new THREE.ConeGeometry(0.24, 0.42, 4), whiteMat);
    tailFan.rotation.x = Math.PI / 2;
    tailFan.scale.set(1.3, 1.0, 0.14);
    tailFan.position.z = -0.18;
    tail.add(tailFan);
    body.add(tail);

    // Extended Yellow Legs & Curved Dark Talons
    [-0.09, 0.09].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.12, -0.04);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.024, 0.02, 0.24, 5), beakYellowMat);
      shin.rotation.x = 0.55;
      shin.position.set(0, -0.1, 0.05);
      leg.add(shin);
      for (let t = -1; t <= 1; t++) {
        const talon = new THREE.Mesh(new THREE.ConeGeometry(0.012, 0.08, 4), talonMat);
        talon.rotation.x = 1.2;
        talon.position.set(t * 0.025, -0.22, 0.13);
        leg.add(talon);
      }
      body.add(leg);
      legs.push(leg);
    });

    const shadowDisc = makeContactShadow(0.6);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, shadowDisc };
  } else if (species === 'red_fox') {
    // Wild Red Fox — vibrant rusty-orange coat, white chest, bushy white-tipped tail, black stockings
    const foxTex = getAnimalTextures().fox;
    const coatMat = new THREE.MeshStandardMaterial({ map: foxTex, roughness: 0.84 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.88 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.85 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0xd97706, roughness: 0.08, clearcoat: 1.0 });

    body.position.y = 0.42;
    root.add(body);
    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.44, 5, 10), coatMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    const whiteChest = new THREE.Mesh(new THREE.SphereGeometry(0.15, 7, 6), whiteMat);
    whiteChest.position.set(0, -0.02, 0.24);
    body.add(torso, whiteChest);

    head.position.set(0, 0.16, 0.34);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.125, 8, 8), coatMat);
    skull.scale.set(1.08, 0.9, 1.08);
    skull.castShadow = true;
    const cheekBib = new THREE.Mesh(new THREE.SphereGeometry(0.1, 7, 6), whiteMat);
    cheekBib.scale.set(1.2, 0.72, 0.9);
    cheekBib.position.set(0, -0.04, 0.04);
    const snout = new THREE.Mesh(new THREE.ConeGeometry(0.065, 0.22, 6), coatMat);
    snout.rotation.x = Math.PI / 2;
    snout.position.set(0, -0.02, 0.18);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.018, 5, 5), darkMat);
    nose.position.set(0, -0.02, 0.29);
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.048, 0.13, 4), coatMat);
      ear.position.set(side * 0.075, 0.14, 0.02);
      const earTip = new THREE.Mesh(new THREE.ConeGeometry(0.025, 0.05, 4), darkMat);
      earTip.position.set(side * 0.075, 0.19, 0.02);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.019, 6, 5), eyeMat);
      eye.position.set(side * 0.056, 0.03, 0.11);
      head.add(ear, earTip, eye);
    });
    head.add(skull, cheekBib, snout, nose);
    body.add(head);

    // Bushy rusty tail with crisp white tip
    tail.position.set(0, 0.04, -0.34);
    const tailBase = new THREE.Mesh(new THREE.CapsuleGeometry(0.085, 0.34, 5, 8), coatMat);
    tailBase.rotation.x = Math.PI / 2.4;
    tailBase.position.set(0, -0.04, -0.2);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.18, 7), whiteMat);
    tailTip.rotation.x = -Math.PI / 2.4;
    tailTip.position.set(0, -0.1, -0.44);
    tail.add(tailBase, tailTip);
    body.add(tail);

    [
      [-0.1, 0.2],
      [0.1, 0.2],
      [-0.1, -0.2],
      [0.1, -0.2],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.1, lz);
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.03, 0.16, 6), coatMat);
      upper.position.y = -0.08;
      const stocking = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.024, 0.16, 6), darkMat);
      stocking.position.y = -0.23;
      leg.add(upper, stocking);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.38));
  } else if (species === 'saltwater_crocodile') {
    // Massive Saltwater Crocodile — armored osteoderm scales, scarred snout, yellow reptilian eyes
    const crocTex = getAnimalTextures().croc;
    const scaleMat = new THREE.MeshStandardMaterial({ map: crocTex, roughness: 0.56 });
    const ridgeMat = new THREE.MeshStandardMaterial({ color: 0x1e2616, roughness: 0.62 });
    const toothMat = new THREE.MeshStandardMaterial({ color: 0xfafaf9, roughness: 0.35 });
    const scarMat = new THREE.MeshStandardMaterial({ color: 0x7f1d1d, roughness: 0.45 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xfacc15, transparent: true, opacity: 0.92 });

    body.position.y = 0.24;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.36, 2.05), scaleMat);
    torso.castShadow = true;
    body.add(torso);

    // Armored dorsal osteoderm scute rows
    for (let r = 0; r < 8; r++) {
      [-0.2, 0.2].forEach((sx) => {
        const scute = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.14, 4), ridgeMat);
        scute.position.set(sx, 0.22, 0.78 - r * 0.23);
        body.add(scute);
      });
    }

    head.position.set(0, 0.04, 1.02);
    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.26, 0.55), scaleMat);
    cranium.position.set(0, 0.06, 0.22);
    const upperSnout = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.14, 0.85), scaleMat);
    upperSnout.position.set(0, 0.04, 0.82);
    // Scar across snout & raised yellow reptilian eyes above waterline
    const snoutScar = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.025, 0.04), scarMat);
    snoutScar.position.set(0.05, 0.12, 0.72);
    snoutScar.rotation.y = 0.42;
    [-0.18, 0.18].forEach((ex) => {
      const brow = new THREE.Mesh(new THREE.SphereGeometry(0.075, 6, 6), ridgeMat);
      brow.position.set(ex, 0.19, 0.34);
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 6, 6), eyeGlowMat);
      eye.position.set(ex, 0.21, 0.36);
      head.add(brow, eye);
    });
    // Interlocking teeth
    for (let t = 0; t < 4; t++) {
      [-0.17, 0.17].forEach((tx) => {
        const tooth = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.08, 4), toothMat);
        tooth.rotation.x = Math.PI;
        tooth.position.set(tx, -0.04, 0.52 + t * 0.18);
        head.add(tooth);
      });
    }
    jaw = new THREE.Group();
    jaw.position.set(0, -0.04, 0.3);
    const lowerJaw = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.09, 0.88), ridgeMat);
    lowerJaw.position.set(0, -0.04, 0.48);
    jaw.add(lowerJaw);
    head.add(cranium, upperSnout, snoutScar, jaw);
    body.add(head);

    tail.position.set(0, 0.0, -1.02);
    const tailMesh = new THREE.Mesh(new THREE.ConeGeometry(0.34, 1.95, 6), scaleMat);
    tailMesh.rotation.x = -Math.PI / 2;
    tailMesh.scale.set(1.0, 1.0, 0.58);
    tailMesh.position.z = -0.95;
    for (let ts = 0; ts < 5; ts++) {
      const fin = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.18, 4), ridgeMat);
      fin.position.set(0, 0.16 - ts * 0.015, -0.25 - ts * 0.3);
      tail.add(fin);
    }
    tail.add(tailMesh);
    body.add(tail);

    [
      [-0.48, 0.65],
      [0.48, 0.65],
      [-0.48, -0.65],
      [0.48, -0.65],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.05, lz);
      const upper = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.18), scaleMat);
      upper.position.x = lx > 0 ? 0.1 : -0.1;
      const foot = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.06, 0.28), ridgeMat);
      foot.position.set(lx > 0 ? 0.18 : -0.18, -0.14, 0.06);
      leg.add(upper, foot);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.4));
  } else if (species === 'bison') {
    // American Bison — massive shaggy dark brown front coat, curved black horns, steam rising from nostrils
    const bisonTex = getAnimalTextures().bison;
    const shaggyMat = new THREE.MeshStandardMaterial({ map: bisonTex, roughness: 0.95 });
    const rearCoatMat = new THREE.MeshStandardMaterial({ color: 0x5c3a24, roughness: 0.86 });
    const hornMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.28 });
    const eyeMat = new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.1, clearcoat: 0.9 });

    body.position.y = 1.18;
    root.add(body);

    // Massive shaggy front cape & towering shoulder hump
    const frontCape = new THREE.Mesh(new THREE.SphereGeometry(0.62, 10, 9), shaggyMat);
    frontCape.scale.set(0.95, 1.12, 1.05);
    frontCape.position.set(0, 0.16, 0.34);
    frontCape.castShadow = true;
    const shoulderHump = new THREE.Mesh(new THREE.SphereGeometry(0.46, 9, 8), shaggyMat);
    shoulderHump.scale.set(0.86, 1.05, 0.95);
    shoulderHump.position.set(0, 0.5, 0.25);
    shoulderHump.castShadow = true;
    const rearTorso = new THREE.Mesh(new THREE.CapsuleGeometry(0.42, 0.56, 6, 10), rearCoatMat);
    rearTorso.rotation.x = Math.PI / 2;
    rearTorso.position.set(0, -0.04, -0.35);
    rearTorso.castShadow = true;
    body.add(frontCape, shoulderHump, rearTorso);

    head.position.set(0, 0.04, 0.86);
    const broadSkull = new THREE.Mesh(new THREE.SphereGeometry(0.36, 9, 8), shaggyMat);
    broadSkull.scale.set(1.08, 1.02, 1.04);
    broadSkull.position.set(0, 0.06, 0.16);
    broadSkull.castShadow = true;
    const beard = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.44, 6), shaggyMat);
    beard.rotation.x = Math.PI;
    beard.position.set(0, -0.32, 0.22);
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.2, 0.2), hornMat);
    muzzle.position.set(0, -0.06, 0.44);
    [-0.22, 0.22].forEach((hx) => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 5), eyeMat);
      eye.position.set(hx * 0.95, 0.08, 0.35);
      // Curved black horns
      const hornBase = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.26, 7), hornMat);
      hornBase.rotation.z = hx > 0 ? -1.15 : 1.15;
      hornBase.position.set(hx * 1.15, 0.22, 0.18);
      const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.2, 6), hornMat);
      hornTip.rotation.z = hx > 0 ? 0.32 : -0.32;
      hornTip.position.set(hx * 1.55, 0.34, 0.22);
      head.add(eye, hornBase, hornTip);
    });
    // Visible steam rising from bison nostrils
    breathWisps = [];
    const steamMat = new THREE.MeshBasicMaterial({
      color: 0xf1f5f9,
      transparent: true,
      opacity: 0.44,
      depthWrite: false,
    });
    for (let w = 0; w < 3; w++) {
      const steam = new THREE.Mesh(new THREE.SphereGeometry(0.075 + w * 0.03, 6, 6), steamMat.clone());
      steam.position.set((w - 1) * 0.06, -0.02 + w * 0.09, 0.56 + w * 0.08);
      head.add(steam);
      breathWisps.push(steam);
    }
    head.add(broadSkull, beard, muzzle);
    body.add(head);

    tail.position.set(0, 0.08, -0.82);
    const tailCord = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.48, 6), rearCoatMat);
    tailCord.rotation.x = 0.25;
    tailCord.position.set(0, -0.24, -0.06);
    const tailTip = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 6), shaggyMat);
    tailTip.position.set(0, -0.5, -0.12);
    tail.add(tailCord, tailTip);
    body.add(tail);

    [
      [-0.36, 0.44],
      [0.36, 0.44],
      [-0.32, -0.46],
      [0.32, -0.46],
    ].forEach(([lx, lz], idx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.24, lz);
      const upper = new THREE.Mesh(
        new THREE.CapsuleGeometry(idx < 2 ? 0.15 : 0.12, 0.34, 4, 7),
        idx < 2 ? shaggyMat : rearCoatMat,
      );
      upper.position.y = -0.24;
      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.42, 7), rearCoatMat);
      lower.position.y = -0.62;
      const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.085, 0.1, 7), hornMat);
      hoof.position.y = -0.86;
      leg.add(upper, lower, hoof);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(1.35));
  } else if (species === 'great_horned_owl') {
    // Great Horned Owl — mottled brown & gray feathers, prominent ear tufts, large glowing yellow eyes
    const owlTex = getAnimalTextures().owl;
    const featherMat = new THREE.MeshStandardMaterial({ map: owlTex, roughness: 0.82 });
    const discMat = new THREE.MeshStandardMaterial({ color: 0xb08d6a, roughness: 0.85 });
    const darkMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.5 });
    const talonMat = new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.45 });
    eyeGlowMat = new THREE.MeshBasicMaterial({ color: 0xfde047, transparent: true, opacity: 0.96 });

    body.position.y = 0.28;
    root.add(body);

    const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.24, 6, 10), featherMat);
    torso.castShadow = true;
    body.add(torso);
    [-0.14, 0.14].forEach((wx) => {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), featherMat);
      wing.scale.set(0.42, 1.35, 0.85);
      wing.position.set(wx, -0.02, -0.02);
      body.add(wing);
    });

    head.position.set(0, 0.24, 0.02);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.14, 10, 9), featherMat);
    skull.scale.set(1.06, 0.95, 0.98);
    const facialDisc = new THREE.Mesh(new THREE.CylinderGeometry(0.125, 0.125, 0.03, 12), discMat);
    facialDisc.rotation.x = Math.PI / 2;
    facialDisc.position.set(0, 0.0, 0.125);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.026, 0.07, 5), darkMat);
    beak.rotation.x = Math.PI / 1.7;
    beak.position.set(0, -0.02, 0.165);
    [-1, 1].forEach((side) => {
      // Prominent feathered ear tufts ("horns")
      const earTuft = new THREE.Mesh(new THREE.ConeGeometry(0.036, 0.14, 5), darkMat);
      earTuft.rotation.z = -side * 0.48;
      earTuft.position.set(side * 0.105, 0.13, 0.04);
      // Large glowing yellow owl eyes
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.036, 7, 7), eyeGlowMat);
      eye.position.set(side * 0.056, 0.025, 0.135);
      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.016, 5, 5), darkMat);
      pupil.position.set(side * 0.056, 0.025, 0.165);
      head.add(earTuft, eye, pupil);
    });
    head.add(skull, facialDisc, beak);
    body.add(head);

    tail.position.set(0, -0.18, -0.12);
    const tailFeathers = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.22, 0.04), featherMat);
    tailFeathers.rotation.x = 0.28;
    tailFeathers.position.set(0, -0.06, -0.04);
    tail.add(tailFeathers);
    body.add(tail);

    [-0.06, 0.06].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.18, 0.04);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.02, 0.1, 6), featherMat);
      shin.position.y = -0.05;
      const talon = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.03, 0.075), talonMat);
      talon.position.set(0, -0.1, 0.02);
      leg.add(shin, talon);
      body.add(leg);
      legs.push(leg);
    });
    root.add(makeContactShadow(0.24));
  } else if (species === 'bird') {
    const wingMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.7 });
    const slateMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.72 });
    const beakMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 });
    root.add(body);
    const torso = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.65, 6), wingMat);
    torso.rotation.x = Math.PI / 2;
    torso.castShadow = true;
    body.add(torso);
    head.position.set(0, 0.04, 0.24);
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.095, 7, 6), wingMat);
    const beak = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.18, 5), beakMat);
    beak.rotation.x = Math.PI / 2;
    beak.position.z = 0.14;
    head.add(skull, beak);
    body.add(head);
    wings = [];
    [-1, 1].forEach((side) => {
      const wing = new THREE.Group();
      wing.position.set(side * 0.1, 0.04, 0.02);
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.028, 0.22), slateMat);
      blade.position.x = side * 0.28;
      wing.add(blade);
      body.add(wing);
      wings!.push(wing);
    });
    [-0.06, 0.06].forEach((lx) => {
      const leg = new THREE.Group();
      leg.position.set(lx, -0.08, 0);
      const shin = new THREE.Mesh(new THREE.CylinderGeometry(0.014, 0.012, 0.18, 5), beakMat);
      shin.position.y = -0.09;
      leg.add(shin);
      body.add(leg);
      legs.push(leg);
    });
    tail.position.set(0, 0.02, -0.3);
    const tailFan = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.02, 0.18), slateMat);
    tailFan.position.z = -0.08;
    tail.add(tailFan);
    body.add(tail);
    const shadowDisc = makeContactShadow(0.24);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, wings, shadowDisc };
  } else if (species === 'fish_school') {
    const fishMat = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.3, metalness: 0.35 });
    root.add(body);
    for (let f = 0; f < 4; f++) {
      const fish = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.45, 5), fishMat);
      fish.rotation.x = Math.PI / 2;
      fish.position.set((f - 1.5) * 0.35, (f % 2) * 0.12, (f % 2 - 0.5) * 0.4);
      body.add(fish);
    }
    body.add(head, tail);
    const shadowDisc = makeContactShadow(0.3);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, shadowDisc };
  } else {
    // Interactive Coastal Dolphin
    const skinMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.28, metalness: 0.08 });
    const bellyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    root.add(body);
    const hull = new THREE.Mesh(new THREE.CapsuleGeometry(0.32, 1.25, 6, 12), skinMat);
    hull.rotation.x = Math.PI / 2;
    body.add(hull);
    const belly = new THREE.Mesh(new THREE.CapsuleGeometry(0.27, 1.1, 4, 10), bellyMat);
    belly.rotation.x = Math.PI / 2;
    belly.position.y = -0.07;
    body.add(belly);
    const dorsal = new THREE.Mesh(new THREE.ConeGeometry(0.16, 0.42, 4), skinMat);
    dorsal.rotation.x = -0.35;
    dorsal.position.set(0, 0.38, -0.1);
    body.add(dorsal);
    head.position.set(0, 0, 0.78);
    const rostrum = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.5, 8), skinMat);
    rostrum.rotation.x = Math.PI / 2;
    rostrum.position.z = 0.22;
    head.add(rostrum);
    body.add(head);
    tail.position.set(0, 0, -0.82);
    const fluke = new THREE.Mesh(new THREE.BoxGeometry(0.82, 0.06, 0.34), skinMat);
    fluke.position.z = -0.22;
    tail.add(fluke);
    body.add(tail);
    const shadowDisc = makeContactShadow(0.8);
    shadowDisc.visible = false;
    root.add(shadowDisc);
    return { root, body, head, jaw, tail, legs, shadowDisc };
  }

  return {
    root,
    body,
    head,
    jaw,
    tail,
    legs,
    wings,
    breathWisps,
    maneTufts,
    eyeGlowMat,
    shadowDisc: root.children[root.children.length - 1] as THREE.Mesh,
  };
}

export function createCampStructureModel(
  type: CampStructureType,
  woodTex?: THREE.Texture,
): { group: THREE.Group; fireLight?: THREE.PointLight; flameGroup?: THREE.Group } {
  const group = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({
    color: 0x85532a,
    map: woodTex || null,
    roughness: 0.85,
  });
  const stoneMat = new THREE.MeshStandardMaterial({ color: 0x6b6762, roughness: 0.92 });
  const ironMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.45, metalness: 0.72 });
  const thatchMat = new THREE.MeshStandardMaterial({ color: 0x6b8e23, roughness: 0.92 });

  if (type === 'campfire') {
    const ashPad = new THREE.Mesh(
      new THREE.CylinderGeometry(0.56, 0.64, 0.04, 12),
      new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.98 }),
    );
    ashPad.position.y = 0.02;
    ashPad.receiveShadow = true;
    group.add(ashPad);
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rock = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stoneMat);
      rock.position.set(Math.cos(a) * 0.62, 0.13, Math.sin(a) * 0.62);
      rock.scale.set(1.1, 0.72, 1.0);
      group.add(rock);
    }
    for (let i = 0; i < 4; i++) {
      const log = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.09, 0.92, 7), woodMat);
      log.rotation.z = Math.PI / 2.25;
      log.rotation.y = (i * Math.PI) / 4;
      log.position.y = 0.15;
      group.add(log);
    }
    const flameGroup = new THREE.Group();
    flameGroup.position.y = 0.25;
    const outerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.28, 0.72, 7),
      new THREE.MeshBasicMaterial({ color: 0xf97316 }),
    );
    outerFlame.position.y = 0.26;
    const innerFlame = new THREE.Mesh(
      new THREE.ConeGeometry(0.15, 0.45, 6),
      new THREE.MeshBasicMaterial({ color: 0xfef08a }),
    );
    innerFlame.position.y = 0.18;
    flameGroup.add(outerFlame, innerFlame);
    group.add(flameGroup);
    const fireLight = new THREE.PointLight(0xff8c2b, 3.2, 18, 1.8);
    fireLight.position.y = 0.95;
    group.add(fireLight);
    return { group, fireLight, flameGroup };
  }

  if (type === 'crafting_table') {
    const darkWoodMat = new THREE.MeshStandardMaterial({
      color: 0x5c381c,
      map: woodTex || null,
      roughness: 0.9,
    });
    const leatherMat = new THREE.MeshStandardMaterial({ color: 0x9a6b3e, roughness: 0.78 });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xca8a04, roughness: 0.92 });
    const flintMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.35, metalness: 0.28 });

    // Thick planked tabletop + recessed apron trim
    const top = new THREE.Mesh(new THREE.BoxGeometry(1.68, 0.14, 1.08), woodMat);
    top.position.y = 0.92;
    top.castShadow = true;
    top.receiveShadow = true;
    group.add(top);

    const apronFront = new THREE.Mesh(new THREE.BoxGeometry(1.56, 0.1, 0.96), darkWoodMat);
    apronFront.position.y = 0.81;
    group.add(apronFront);

    // 4 sturdy corner legs
    [
      [-0.68, -0.4],
      [0.68, -0.4],
      [-0.68, 0.4],
      [0.68, 0.4],
    ].forEach(([lx, lz]) => {
      const leg = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.86, 0.13), darkWoodMat);
      leg.position.set(lx, 0.43, lz);
      leg.castShadow = true;
      group.add(leg);
    });

    // Horizontal side & center structural supports
    [-0.4, 0.4].forEach((sz) => {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.08, 0.08), darkWoodMat);
      rail.position.set(0, 0.28, sz);
      group.add(rail);
    });
    [-0.68, 0.68].forEach((sx) => {
      const brace = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.8), darkWoodMat);
      brace.position.set(sx, 0.28, 0);
      group.add(brace);
    });

    // Lower storage shelf + spare timber planks + storage crate + coiled rope
    const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.42, 0.06, 0.82), woodMat);
    shelf.position.y = 0.33;
    shelf.receiveShadow = true;
    group.add(shelf);

    for (let p = 0; p < 3; p++) {
      const sparePlank = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.05, 0.16), darkWoodMat);
      sparePlank.position.set(-0.34, 0.385 + p * 0.052, 0.12 - p * 0.06);
      sparePlank.rotation.y = 0.08 * (p - 1);
      group.add(sparePlank);
    }

    const underCrate = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.28, 0.44), darkWoodMat);
    underCrate.position.set(0.38, 0.5, -0.1);
    group.add(underCrate);

    const underRope = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.04, 7, 14), ropeMat);
    underRope.rotation.x = Math.PI / 2;
    underRope.position.set(0.34, 0.4, 0.24);
    group.add(underRope);

    // Tabletop tools & crafting materials
    const malletHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.028, 0.36, 7), woodMat);
    malletHandle.rotation.z = Math.PI / 2;
    malletHandle.rotation.y = 0.42;
    malletHandle.position.set(0.38, 1.02, 0.18);
    const malletHead = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.12, 0.22), stoneMat);
    malletHead.position.set(0.52, 1.04, 0.11);
    malletHead.rotation.y = 0.42;
    group.add(malletHandle, malletHead);

    // Chisel & sharp flint materials on tabletop
    const chiselHandle = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.024, 0.22, 6), darkWoodMat);
    chiselHandle.rotation.z = Math.PI / 2;
    chiselHandle.rotation.y = -0.3;
    chiselHandle.position.set(-0.46, 1.01, -0.2);
    const chiselBlade = new THREE.Mesh(new THREE.BoxGeometry(0.11, 0.018, 0.045), ironMat);
    chiselBlade.rotation.y = -0.3;
    chiselBlade.position.set(-0.31, 1.01, -0.15);
    group.add(chiselHandle, chiselBlade);

    for (let f = 0; f < 2; f++) {
      const flintPiece = new THREE.Mesh(new THREE.OctahedronGeometry(0.065, 0), flintMat);
      flintPiece.scale.set(1.2, 0.6, 0.9);
      flintPiece.position.set(-0.48 + f * 0.13, 1.02, 0.22);
      group.add(flintPiece);
    }

    // Rolled craft hide/blueprint mat on workbench
    const matSheet = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.34), leatherMat);
    matSheet.position.set(0.02, 1.0, -0.06);
    matSheet.rotation.y = 0.12;
    group.add(matSheet);

    return { group };
  }

  if (type === 'storage_chest') {
    const base = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.62, 0.82), woodMat);
    base.position.y = 0.31;
    base.castShadow = true;
    group.add(base);
    const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.41, 0.41, 1.25, 10, 1, false, 0, Math.PI), woodMat);
    lid.rotation.z = Math.PI / 2;
    lid.rotation.y = Math.PI / 2;
    lid.position.y = 0.62;
    group.add(lid);
    [-0.4, 0.4].forEach((bx) => {
      const band = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.66, 0.86), ironMat);
      band.position.set(bx, 0.33, 0);
      group.add(band);
    });
    return { group };
  }

  if (type === 'sleeping_area') {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.18, 2.25), woodMat);
    frame.position.y = 0.18;
    const mat = new THREE.MeshStandardMaterial({ color: 0x9ca653, roughness: 0.95 });
    const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.12, 2.08), mat);
    mattress.position.y = 0.32;
    const pillow = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.14, 0.85, 10),
      new THREE.MeshStandardMaterial({ color: 0xd6c7a9, roughness: 0.88 }),
    );
    pillow.rotation.z = Math.PI / 2;
    pillow.position.set(0, 0.42, -0.78);
    group.add(frame, mattress, pillow);
    return { group };
  }

  if (type === 'cooking_station') {
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const r = new THREE.Mesh(new THREE.DodecahedronGeometry(0.24, 0), stoneMat);
      r.position.set(Math.cos(a) * 0.7, 0.16, Math.sin(a) * 0.7);
      group.add(r);
    }
    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 1.85, 6), woodMat);
      pole.position.set(Math.cos(a) * 0.48, 0.88, Math.sin(a) * 0.48);
      pole.lookAt(0, 1.78, 0);
      pole.rotateX(Math.PI / 2);
      group.add(pole);
    }
    const kettle = new THREE.Mesh(new THREE.SphereGeometry(0.32, 12, 10), ironMat);
    kettle.position.y = 0.75;
    group.add(kettle);
    const flameGroup = new THREE.Group();
    flameGroup.position.y = 0.2;
    const flame = new THREE.Mesh(new THREE.ConeGeometry(0.26, 0.5, 7), new THREE.MeshBasicMaterial({ color: 0xf97316 }));
    flame.position.y = 0.2;
    flameGroup.add(flame);
    group.add(flameGroup);
    const fireLight = new THREE.PointLight(0xff7722, 2.8, 16, 1.8);
    fireLight.position.y = 0.8;
    group.add(fireLight);
    return { group, fireLight, flameGroup };
  }

  if (type === 'drying_rack') {
    const postMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.92, map: woodTex || null });
    const ropeMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.85 });
    const meatMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.75 });

    const leftPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.8, 6), postMat);
    leftPost.position.set(-0.9, 0.9, 0);
    leftPost.castShadow = true;
    const rightPost = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.08, 1.8, 6), postMat);
    rightPost.position.set(0.9, 0.9, 0);
    rightPost.castShadow = true;
    group.add(leftPost, rightPost);

    const crossbar = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 1.9, 6), postMat);
    crossbar.rotation.z = Math.PI / 2;
    crossbar.position.set(0, 1.7, 0);
    crossbar.castShadow = true;
    group.add(crossbar);

    [-0.5, 0.5].forEach((zOff) => {
      const baseBar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.9, 6), postMat);
      baseBar.rotation.z = Math.PI / 2;
      baseBar.position.set(0, 0.08, zOff);
      group.add(baseBar);
    });

    [-0.45, -0.15, 0.15, 0.45].forEach((xOff) => {
      const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.01, 0.01, 0.4, 4), ropeMat);
      cord.position.set(xOff, 1.45, 0);
      const meatChunk = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 0.08), meatMat);
      meatChunk.position.set(xOff, 1.18, 0);
      group.add(cord, meatChunk);
    });

    return { group };
  }

  if (type === 'basic_shelter') {
    // Timber deck + stone/timber foundation plinth embedded into hill slopes
    const shelterPlinth = new THREE.Mesh(
      new THREE.BoxGeometry(3.05, 0.55, 2.65),
      new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.94 }),
    );
    shelterPlinth.position.set(0, -0.25, 0);
    shelterPlinth.receiveShadow = true;
    shelterPlinth.castShadow = true;
    const shelterDeck = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.1, 2.6), woodMat);
    shelterDeck.position.set(0, 0.04, 0);
    shelterDeck.receiveShadow = true;
    group.add(shelterPlinth, shelterDeck);

    [
      [-1.4, -1.2],
      [1.4, -1.2],
      [-1.4, 1.2],
      [1.4, 1.2],
    ].forEach(([px, pz]) => {
      const h = pz < 0 ? 1.75 : 2.35;
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, h + 0.55, 7), woodMat);
      post.position.set(px, (h - 0.55) / 2, pz);
      post.castShadow = true;
      group.add(post);
    });
    const roof = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.18, 2.9), thatchMat);
    roof.position.set(0, 2.08, 0);
    roof.rotation.x = 0.24;
    roof.castShadow = true;
    roof.receiveShadow = true;
    group.add(roof);
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(2.9, 1.6, 0.12), woodMat);
    backWall.position.set(0, 0.85, -1.2);
    group.add(backWall);

    // Built-in woven sleeping mat inside shelter
    const mat = new THREE.Mesh(
      new THREE.BoxGeometry(1.1, 0.1, 1.85),
      new THREE.MeshStandardMaterial({ color: 0x9ca653, roughness: 0.95 }),
    );
    mat.position.set(0, 0.13, 0.1);
    group.add(mat);
    return { group };
  }

  if (type === 'gravity_monolith') {
    const obsidianMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.28,
      metalness: 0.82,
    });
    const runeMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 2.2,
      roughness: 0.2,
    });
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.1, 0.45, 8), obsidianMat);
    base.position.y = 0.22;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.65, 3.4, 6), obsidianMat);
    pillar.position.y = 1.95;
    pillar.castShadow = true;
    group.add(pillar);

    const vortexRing = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.09, 8, 24), runeMat);
    vortexRing.rotation.x = Math.PI / 2;
    vortexRing.position.y = 2.8;
    group.add(vortexRing);

    const levitatingCrystal = new THREE.Mesh(new THREE.OctahedronGeometry(0.38, 0), runeMat);
    levitatingCrystal.position.y = 4.1;
    group.add(levitatingCrystal);

    const vortexLight = new THREE.PointLight(0x38bdf8, 3.5, 16, 1.6);
    vortexLight.position.y = 3.8;
    group.add(vortexLight);

    return { group, fireLight: vortexLight };
  }

  if (type === 'spike_barricade') {
    for (let i = 0; i < 5; i++) {
      const stake = new THREE.Mesh(new THREE.ConeGeometry(0.12, 1.9, 6), woodMat);
      stake.position.set((i - 2) * 0.46, 0.85, (i % 2) * 0.12);
      stake.rotation.z = (Math.random() - 0.5) * 0.2;
      stake.rotation.x = 0.38;
      stake.castShadow = true;
      group.add(stake);
    }
    const crossBar = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 0.16), woodMat);
    crossBar.position.set(0, 0.65, 0);
    crossBar.castShadow = true;
    group.add(crossBar);
    return { group };
  }

  if (type === 'timeshift_sundial') {
    const marbleMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.4,
      metalness: 0.35,
    });
    const goldMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.8,
      roughness: 0.25,
      metalness: 0.88,
    });
    const plinth = new THREE.Mesh(new THREE.CylinderGeometry(0.9, 1.05, 0.65, 12), marbleMat);
    plinth.position.y = 0.32;
    plinth.castShadow = true;
    group.add(plinth);

    const dialRing = new THREE.Mesh(new THREE.TorusGeometry(0.72, 0.07, 8, 24), goldMat);
    dialRing.rotation.x = Math.PI / 2;
    dialRing.position.y = 0.68;
    group.add(dialRing);

    const gnomon = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.75, 4), goldMat);
    gnomon.position.set(0, 0.95, -0.15);
    gnomon.rotation.x = 0.55;
    gnomon.castShadow = true;
    group.add(gnomon);

    const sundialLight = new THREE.PointLight(0xf59e0b, 2.0, 8, 1.8);
    sundialLight.position.y = 1.2;
    group.add(sundialLight);

    return { group, fireLight: sundialLight };
  }

  if (type === 'auto_turret') {
    const tripodMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.8 });
    const gunMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.3, metalness: 0.9 });
    const sensorMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xb91c1c, emissiveIntensity: 1.5 });

    const baseHub = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.4, 0.3, 8), tripodMat);
    baseHub.position.y = 0.5;
    baseHub.castShadow = true;
    group.add(baseHub);

    for (let i = 0; i < 3; i++) {
      const a = (i / 3) * Math.PI * 2;
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.8, 6), tripodMat);
      leg.position.set(Math.cos(a) * 0.35, 0.25, Math.sin(a) * 0.35);
      leg.lookAt(Math.cos(a) * 0.7, 0, Math.sin(a) * 0.7);
      leg.rotateX(Math.PI / 3);
      group.add(leg);
    }

    const swivel = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.4, 0.6), gunMat);
    swivel.position.y = 0.85;
    swivel.castShadow = true;
    group.add(swivel);

    [-0.12, 0.12].forEach((bx) => {
      const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.9, 8), gunMat);
      barrel.rotation.x = Math.PI / 2;
      barrel.position.set(bx, 0.88, 0.55);
      group.add(barrel);
    });

    const sensorEye = new THREE.Mesh(new THREE.SphereGeometry(0.08, 8, 8), sensorMat);
    sensorEye.position.set(0, 1.1, 0.25);
    group.add(sensorEye);

    const laserLight = new THREE.PointLight(0xef4444, 1.5, 6, 2);
    laserLight.position.set(0, 1.1, 0.3);
    group.add(laserLight);

    return { group, fireLight: laserLight };
  }

  if (type === 'smart_tv') {
    const plasticMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.25, metalness: 0.65 });
    const screenMat = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.9,
      roughness: 0.14,
      metalness: 0.2,
    });
    const standbyLedMat = new THREE.MeshStandardMaterial({
      color: 0x22c55e,
      emissive: 0x22c55e,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });

    const standBase = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.04, 0.4), plasticMat);
    standBase.position.y = 0.02;
    group.add(standBase);

    const standPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.5, 8), plasticMat);
    standPole.position.y = 0.27;
    group.add(standPole);

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(1.8, 1.05, 0.08), plasticMat);
    bezel.position.y = 0.95;
    bezel.castShadow = true;
    group.add(bezel);

    const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.68, 0.93), screenMat);
    screen.position.set(0, 0.95, 0.045);
    group.add(screen);

    const standbyLed = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, 0.015), standbyLedMat);
    standbyLed.position.set(0.78, 0.445, 0.046);
    group.add(standbyLed);

    const tvGlow = new THREE.PointLight(0x38bdf8, 1.8, 8, 1.5);
    tvGlow.position.set(0, 0.95, 0.4);
    group.add(tvGlow);

    group.userData.tvScreenMat = screenMat;
    group.userData.standbyLedMat = standbyLedMat;

    return { group, fireLight: tvGlow };
  }

  if (type === 'coaster_station') {
    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x334155,
      roughness: 0.34,
      metalness: 0.82,
    });
    const deckMat = new THREE.MeshStandardMaterial({
      color: 0x475569,
      roughness: 0.72,
      metalness: 0.25,
    });
    const accentMat = new THREE.MeshStandardMaterial({
      color: 0xe11d48,
      emissive: 0x881337,
      emissiveIntensity: 0.3,
      roughness: 0.32,
      metalness: 0.45,
    });
    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.4,
      metalness: 0.6,
    });
    const hazardMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.42,
      metalness: 0.2,
    });
    const lampMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x38bdf8,
      emissiveIntensity: 1.4,
      roughness: 0.2,
    });

    // Raised station boarding platform alongside track heartline
    const deck = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.24, 5.2), deckMat);
    deck.position.set(1.9, 0.92, 0);
    deck.receiveShadow = true;
    deck.castShadow = true;
    group.add(deck);

    // Steel pier supports under deck
    for (const px of [0.5, 3.3]) {
      for (const pz of [-2.1, 2.1]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.14, 0.92, 8), steelMat);
        leg.position.set(px, 0.46, pz);
        leg.castShadow = true;
        group.add(leg);
      }
    }

    // Yellow safety edging stripe on track-side edge
    const stripe = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.04, 5.05), hazardMat);
    stripe.position.set(0.32, 1.05, 0);
    group.add(stripe);

    // Automatic boarding air-gates along the track loading edge
    for (const gz of [-1.5, -0.5, 0.5, 1.5]) {
      const post = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.95, 0.1), steelMat);
      post.position.set(0.45, 1.5, gz);
      const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.09, 0.72), hazardMat);
      bar.position.set(0.45, 1.72, gz + 0.36);
      group.add(post, bar);
    }

    // Four structural roof canopy columns & gable rafters
    for (const px of [0.45, 3.35]) {
      for (const pz of [-2.2, 2.2]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.1, 2.5, 8), steelMat);
        col.position.set(px, 2.25, pz);
        col.castShadow = true;
        group.add(col);
      }
    }
    const roofPlate = new THREE.Mesh(new THREE.BoxGeometry(3.55, 0.14, 5.5), canopyMat);
    roofPlate.position.set(1.9, 3.55, 0);
    roofPlate.castShadow = true;
    group.add(roofPlate);

    const fascia = new THREE.Mesh(new THREE.BoxGeometry(3.62, 0.24, 5.56), accentMat);
    fascia.position.set(1.9, 3.45, 0);
    group.add(fascia);

    // Operator dispatch console booth
    const consoleBox = new THREE.Mesh(new THREE.BoxGeometry(0.75, 1.05, 0.6), steelMat);
    consoleBox.position.set(2.8, 1.56, -1.6);
    consoleBox.castShadow = true;
    group.add(consoleBox);

    const consolePanel = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.1, 0.45), lampMat);
    consolePanel.position.set(2.8, 2.1, -1.6);
    consolePanel.rotation.x = 0.25;
    group.add(consolePanel);

    const stationLight = new THREE.PointLight(0x38bdf8, 1.6, 12, 1.6);
    stationLight.position.set(1.9, 3.1, 0);
    group.add(stationLight);

    return { group, fireLight: stationLight };
  }

  return { group };
}

/**
 * Physical 3D Collectible Pickup Meshes spawned when trees fall, rocks break, or items drop.
 */
export function createPickupMesh(
  itemId: ItemId,
  woodTex?: THREE.Texture,
): THREE.Group {
  const group = new THREE.Group();

  const barkMat = new THREE.MeshStandardMaterial({
    color: 0x6b4423,
    map: woodTex || null,
    roughness: 0.9,
  });
  const heartwoodMat = new THREE.MeshStandardMaterial({
    color: 0xd6a56e,
    roughness: 0.78,
  });
  const stoneMat = new THREE.MeshStandardMaterial({
    color: 0x78716c,
    roughness: 0.92,
  });
  const flintMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.32,
    metalness: 0.25,
  });
  const oreMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    roughness: 0.3,
    metalness: 0.78,
  });
  const leafMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    roughness: 0.82,
  });
  const berryMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    roughness: 0.45,
  });

  if (itemId === 'wood') {
    const log = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.92, 8), barkMat);
    log.rotation.z = Math.PI / 2;
    log.position.y = 0.16;
    log.castShadow = true;
    const capL = new THREE.Mesh(new THREE.CircleGeometry(0.135, 8), heartwoodMat);
    capL.rotation.y = -Math.PI / 2;
    capL.position.set(-0.465, 0.16, 0);
    const capR = new THREE.Mesh(new THREE.CircleGeometry(0.155, 8), heartwoodMat);
    capR.rotation.y = Math.PI / 2;
    capR.position.set(0.465, 0.16, 0);
    group.add(log, capL, capR);
  } else if (itemId === 'branch') {
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.045, 0.72, 6), barkMat);
      b.rotation.z = Math.PI / 2;
      b.rotation.y = (i - 1) * 0.42;
      b.position.y = 0.07 + i * 0.025;
      group.add(b);
    }
  } else if (itemId === 'stone' || itemId === 'clay' || itemId === 'sand') {
    const mat =
      itemId === 'clay'
        ? new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.94 })
        : itemId === 'sand'
          ? new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.95 })
          : stoneMat;
    const rockA = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), mat);
    rockA.scale.set(1.2, 0.78, 1.0);
    rockA.position.set(-0.08, 0.15, 0);
    rockA.castShadow = true;
    const rockB = new THREE.Mesh(new THREE.DodecahedronGeometry(0.14, 0), mat);
    rockB.position.set(0.16, 0.11, 0.08);
    group.add(rockA, rockB);
  } else if (itemId === 'flint') {
    for (let i = 0; i < 2; i++) {
      const shard = new THREE.Mesh(new THREE.ConeGeometry(0.13, 0.34, 5), flintMat);
      shard.position.set((i - 0.5) * 0.14, 0.15, 0);
      shard.rotation.z = (i - 0.5) * 0.55;
      shard.castShadow = true;
      group.add(shard);
    }
  } else if (itemId === 'metal_ore') {
    const host = new THREE.Mesh(new THREE.DodecahedronGeometry(0.22, 0), stoneMat);
    host.position.y = 0.16;
    host.scale.set(1.1, 0.85, 1.0);
    group.add(host);
    for (let i = 0; i < 3; i++) {
      const nugget = new THREE.Mesh(new THREE.OctahedronGeometry(0.1, 0), oreMat);
      nugget.position.set((i - 1) * 0.11, 0.24, 0.08);
      group.add(nugget);
    }
  } else if (itemId === 'berries') {
    for (let i = 0; i < 4; i++) {
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.08, 7, 7), berryMat);
      b.position.set((i - 1.5) * 0.08, 0.1, (i % 2) * 0.08);
      group.add(b);
    }
  } else if (itemId === 'coconut' || itemId === 'roasted_coconut') {
    const cocoMat = new THREE.MeshStandardMaterial({
      color: itemId === 'roasted_coconut' ? 0x854d0e : 0x6b3e1b,
      roughness: 0.9,
    });
    const huskMat = new THREE.MeshStandardMaterial({ color: 0x3b2314, roughness: 0.95 });
    for (let i = 0; i < 2; i++) {
      const c = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 7), cocoMat);
      c.scale.set(1.0, 1.12, 1.0);
      c.position.set((i - 0.5) * 0.22, 0.17, (i % 2) * 0.08);
      c.castShadow = true;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.04, 6), huskMat);
      cap.position.set(c.position.x, 0.34, c.position.z);
      group.add(c, cap);
    }
  } else if (itemId === 'apple' || itemId === 'baked_apple') {
    const appleMat = new THREE.MeshStandardMaterial({
      color: itemId === 'baked_apple' ? 0xea580c : 0xdc2626,
      roughness: 0.4,
    });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, roughness: 0.9 });
    for (let i = 0; i < 2; i++) {
      const a = new THREE.Mesh(new THREE.SphereGeometry(0.115, 8, 7), appleMat);
      a.scale.set(1.05, 0.95, 1.05);
      a.position.set((i - 0.5) * 0.2, 0.12, (i % 2) * 0.07);
      a.castShadow = true;
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.018, 0.07, 5), stemMat);
      stem.position.set(a.position.x, 0.23, a.position.z);
      const leaf = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.02, 0.05), leafMat);
      leaf.position.set(a.position.x + 0.04, 0.24, a.position.z);
      leaf.rotation.z = 0.35;
      group.add(a, stem, leaf);
    }
  } else if (itemId === 'banana' || itemId === 'roasted_banana') {
    const bananaMat = new THREE.MeshStandardMaterial({
      color: itemId === 'roasted_banana' ? 0xf59e0b : 0xfacc15,
      roughness: 0.55,
    });
    const tipMat = new THREE.MeshStandardMaterial({ color: 0x713f12, roughness: 0.9 });
    for (let i = 0; i < 3; i++) {
      const b = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.048, 0.32, 6), bananaMat);
      b.rotation.z = Math.PI / 2.3;
      b.rotation.y = (i - 1) * 0.35;
      b.position.set((i - 1) * 0.07, 0.11, 0);
      b.castShadow = true;
      const tip = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.032, 0.05, 5), tipMat);
      tip.position.set(b.position.x + 0.15, 0.15, Math.sin(b.rotation.y) * 0.1);
      group.add(b, tip);
    }
  } else if (itemId === 'maple_syrup') {
    const jarMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.25,
      metalness: 0.12,
    });
    const corkMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.125, 0.28, 8), jarMat);
    body.position.y = 0.16;
    body.castShadow = true;
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.08, 0.09, 8), jarMat);
    neck.position.y = 0.33;
    const cork = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.048, 0.06, 7), corkMat);
    cork.position.y = 0.39;
    group.add(body, neck, cork);
  } else if (itemId === 'leaves' || itemId === 'plant_material' || itemId === 'fiber') {
    for (let i = 0; i < 3; i++) {
      const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.38, 4), leafMat);
      leaf.rotation.z = Math.PI / 2.2;
      leaf.rotation.y = (i * Math.PI * 2) / 3;
      leaf.position.y = 0.09;
      group.add(leaf);
    }
  } else if (
    itemId === 'raw_meat' ||
    itemId === 'roasted_meat' ||
    itemId === 'dino_meat' ||
    itemId === 'roasted_dino_meat'
  ) {
    const isDino = itemId === 'dino_meat' || itemId === 'roasted_dino_meat';
    const isRoasted = itemId === 'roasted_meat' || itemId === 'roasted_dino_meat';
    const meatMat = new THREE.MeshStandardMaterial({
      color: isRoasted ? 0x9a3412 : 0xdc2626,
      roughness: 0.65,
    });
    const slab = new THREE.Mesh(
      new THREE.BoxGeometry(isDino ? 0.42 : 0.32, isDino ? 0.18 : 0.14, isDino ? 0.28 : 0.22),
      meatMat,
    );
    slab.position.y = 0.14;
    slab.castShadow = true;
    const boneTip = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.038, isDino ? 0.22 : 0.16, 6),
      new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.8 }),
    );
    boneTip.rotation.z = Math.PI / 2;
    boneTip.position.set(isDino ? 0.26 : 0.2, 0.14, 0);
    group.add(slab, boneTip);
  } else if (itemId === 'mushrooms') {
    const capMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.7 });
    const stemMat = new THREE.MeshStandardMaterial({ color: 0xe7e5e4, roughness: 0.85 });
    for (let i = 0; i < 2; i++) {
      const stem = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.045, 0.14, 6), stemMat);
      stem.position.set((i - 0.5) * 0.16, 0.1, (i % 2) * 0.06);
      const cap = new THREE.Mesh(new THREE.ConeGeometry(0.11, 0.09, 8), capMat);
      cap.position.set(stem.position.x, 0.19, stem.position.z);
      group.add(stem, cap);
    }
  } else if (itemId === 'wheat' || itemId === 'grass' || itemId === 'sugarcane') {
    const strawMat = new THREE.MeshStandardMaterial({
      color: itemId === 'wheat' ? 0xeab308 : itemId === 'sugarcane' ? 0x84cc16 : 0x65a30d,
      roughness: 0.82,
    });
    for (let i = 0; i < 3; i++) {
      const stalk = new THREE.Mesh(
        new THREE.CylinderGeometry(itemId === 'sugarcane' ? 0.036 : 0.025, 0.038, 0.52, 6),
        strawMat,
      );
      stalk.rotation.z = Math.PI / 2;
      stalk.rotation.y = (i - 1) * 0.25;
      stalk.position.y = 0.09 + i * 0.025;
      group.add(stalk);
    }
  } else if (itemId === 'sickle') {
    const handle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.03, 0.34, 7),
      barkMat,
    );
    handle.rotation.z = Math.PI / 2;
    handle.position.set(-0.08, 0.14, 0);
    const blade = new THREE.Mesh(
      new THREE.TorusGeometry(0.14, 0.018, 6, 14, Math.PI * 1.15),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.25, metalness: 0.86 }),
    );
    blade.rotation.x = Math.PI / 2;
    blade.position.set(0.12, 0.14, 0);
    group.add(handle, blade);
  } else if (itemId === 'flour' || itemId === 'sugar' || itemId === 'salt' || itemId === 'dough') {
    const sackMat = new THREE.MeshStandardMaterial({
      color: itemId === 'dough' ? 0xfde68a : 0xf8fafc,
      roughness: 0.9,
    });
    const sack = new THREE.Mesh(new THREE.DodecahedronGeometry(0.18, 1), sackMat);
    sack.scale.set(1.1, 0.82, 0.95);
    sack.position.y = 0.16;
    sack.castShadow = true;
    group.add(sack);
  } else if (itemId === 'bread_loaf' || itemId === 'wheat_bread' || itemId === 'cake' || itemId === 'chocolate_cake' || itemId === 'cookies') {
    const isCake = itemId === 'cake' || itemId === 'chocolate_cake';
    const bMat = new THREE.MeshStandardMaterial({
      color: itemId === 'chocolate_cake' ? 0x5c2d16 : itemId === 'cake' ? 0xf9a8d4 : 0xd97706,
      roughness: 0.65,
    });
    const mesh = isCake
      ? new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.14, 14), bMat)
      : new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.14, 0.2), bMat);
    mesh.position.y = 0.12;
    mesh.castShadow = true;
    group.add(mesh);
  } else if (
    itemId === 'tomato' ||
    itemId === 'lettuce' ||
    itemId === 'cucumber' ||
    itemId === 'jalapeno' ||
    itemId === 'carrot' ||
    itemId === 'potato' ||
    itemId === 'onion' ||
    itemId === 'corn' ||
    itemId === 'bell_pepper' ||
    itemId === 'pumpkin' ||
    itemId === 'garlic'
  ) {
    const colorMap: Record<string, number> = {
      tomato: 0xef4444,
      lettuce: 0x4ade80,
      cucumber: 0x22c55e,
      jalapeno: 0x15803d,
      carrot: 0xf97316,
      potato: 0xb45309,
      onion: 0xdb2777,
      corn: 0xfacc15,
      bell_pepper: 0xfb923c,
      pumpkin: 0xea580c,
      garlic: 0xf5f5f4,
    };
    const vMesh = new THREE.Mesh(
      new THREE.SphereGeometry(itemId === 'pumpkin' ? 0.22 : 0.14, 9, 8),
      new THREE.MeshStandardMaterial({ color: colorMap[itemId] ?? 0x22c55e, roughness: 0.55 }),
    );
    if (itemId === 'cucumber' || itemId === 'corn' || itemId === 'carrot') {
      vMesh.scale.set(0.65, 1.45, 0.65);
    }
    vMesh.position.y = 0.15;
    vMesh.castShadow = true;
    group.add(vMesh);
  } else if (itemId === 'gun') {
    const gunMat = new THREE.MeshStandardMaterial({
      color: 0x18181b,
      roughness: 0.35,
      metalness: 0.85,
    });
    const gripMat = new THREE.MeshStandardMaterial({
      color: 0x451a03,
      roughness: 0.8,
    });
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.09, 0.34), gunMat);
    slide.position.set(0, 0.14, 0);
    slide.castShadow = true;
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 0.22, 8), gunMat);
    barrel.rotation.x = Math.PI / 2;
    barrel.position.set(0, 0.14, -0.22);
    barrel.castShadow = true;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.065, 0.18, 0.09), gripMat);
    grip.rotation.x = 0.3;
    grip.position.set(0, 0.06, 0.08);
    grip.castShadow = true;
    group.add(slide, barrel, grip);
  } else if (itemId === 'ammo') {
    const boxMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.55,
      metalness: 0.3,
    });
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      roughness: 0.25,
      metalness: 0.88,
    });
    const ammoBox = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.18, 0.18), boxMat);
    ammoBox.position.y = 0.11;
    ammoBox.castShadow = true;
    for (let c = 0; c < 3; c++) {
      const bullet = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.08, 6), brassMat);
      bullet.position.set((c - 1) * 0.05, 0.22, 0);
      group.add(bullet);
    }
    group.add(ammoBox);
  } else if (
    itemId === 'dirty_water_bottle' ||
    itemId === 'filtered_water_bottle'
  ) {
    const isClean = itemId === 'filtered_water_bottle';
    const shellMat = new THREE.MeshStandardMaterial({
      color: isClean ? 0xe0f2fe : 0xcbd5e1,
      transparent: true,
      opacity: 0.72,
      roughness: isClean ? 0.2 : 0.65,
      metalness: 0.08,
    });
    const liquidMat = new THREE.MeshStandardMaterial({
      color: isClean ? 0x0ea5e9 : 0x78716c,
      transparent: true,
      opacity: isClean ? 0.85 : 0.6,
      roughness: 0.25,
    });
    const capMat = new THREE.MeshStandardMaterial({
      color: isClean ? 0x0284c7 : 0x57534e,
      roughness: 0.5,
    });
    const bottleBody = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.095, 0.32, 10),
      shellMat,
    );
    bottleBody.position.y = 0.18;
    bottleBody.castShadow = true;
    const liquid = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.08, isClean ? 0.24 : 0.08, 10),
      liquidMat,
    );
    liquid.position.y = isClean ? 0.16 : 0.08;
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.038, 0.07, 0.07, 10),
      shellMat,
    );
    neck.position.y = 0.36;
    const cap = new THREE.Mesh(
      new THREE.CylinderGeometry(0.044, 0.044, 0.045, 10),
      capMat,
    );
    cap.position.y = 0.41;
    group.add(bottleBody, liquid, neck, cap);
  } else if (itemId === 'stone_warhammer') {
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.028, 0.68, 8),
      barkMat,
    );
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0, 0.14, 0);
    const maul = new THREE.Mesh(
      new THREE.BoxGeometry(0.24, 0.18, 0.28),
      stoneMat,
    );
    maul.position.set(0.28, 0.16, 0);
    maul.castShadow = true;
    const strap = new THREE.Mesh(
      new THREE.BoxGeometry(0.08, 0.19, 0.295),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.75 }),
    );
    strap.position.set(0.28, 0.16, 0);
    group.add(shaft, maul, strap);
  } else if (itemId === 'car_key') {
    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xf2c14e,
      roughness: 0.26,
      metalness: 0.92,
      emissive: 0x6b3f00,
      emissiveIntensity: 0.32,
    });
    const shaft = new THREE.Mesh(
      new THREE.CylinderGeometry(0.027, 0.027, 0.46, 8),
      brassMat,
    );
    shaft.rotation.z = Math.PI / 2;
    shaft.position.set(0.07, 0.13, 0);
    shaft.castShadow = true;
    // Clover-style bow so the key reads clearly against grass at pickup distance.
    const bow = new THREE.Mesh(new THREE.TorusGeometry(0.105, 0.031, 8, 18), brassMat);
    bow.rotation.y = Math.PI / 2;
    bow.position.set(-0.18, 0.13, 0);
    bow.castShadow = true;
    const toothA = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.115, 0.031), brassMat);
    toothA.position.set(0.245, 0.075, 0);
    const toothB = new THREE.Mesh(new THREE.BoxGeometry(0.052, 0.078, 0.031), brassMat);
    toothB.position.set(0.165, 0.093, 0);
    group.add(shaft, bow, toothA, toothB);
  } else {
    // Generic compact supply crate/pouch
    const pouch = new THREE.Mesh(
      new THREE.BoxGeometry(0.32, 0.24, 0.28),
      new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.82 }),
    );
    pouch.position.y = 0.14;
    pouch.castShadow = true;
    group.add(pouch);
  }

  // Subtle amber pickup halo ring on ground so collectibles remain legible in tall grass
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(0.28, 0.34, 16),
    new THREE.MeshBasicMaterial({
      color: 0xfbbf24,
      transparent: true,
      opacity: 0.42,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.03;
  group.add(ring);

  return group;
}

/**
 * Creates a physical 3D carcass mesh on the terrain for hunted wildlife and dinosaurs.
 * Renders the fallen beast on its side with a field-dressing stain, exposed ribs,
 * and fresh meat cuts ready for butchering.
 */
export function createCarcassMesh(
  species: CreatureSpecies,
  isDino: boolean,
): THREE.Group {
  const root = new THREE.Group();

  // 1. Dark crimson field-dressing ground stain
  const stainMat = new THREE.MeshBasicMaterial({
    color: 0x3f0a0a,
    transparent: true,
    opacity: 0.65,
    depthWrite: false,
  });
  const stain = new THREE.Mesh(
    new THREE.CircleGeometry(isDino ? 1.45 : 0.78, 14),
    stainMat,
  );
  stain.rotation.x = -Math.PI / 2;
  stain.position.y = 0.025;
  root.add(stain);

  // 2. Downed animal model lying on its side
  const creatureRig = createCreatureModel(species);
  // Lay horizontally on ground on its side
  creatureRig.root.rotation.z = Math.PI / 2.05;
  creatureRig.root.rotation.x = 0.18;
  creatureRig.root.position.y = isDino ? 0.38 : 0.18;
  root.add(creatureRig.root);

  // 3. Exposed butchering cuts & prime meat block
  const meatMat = new THREE.MeshStandardMaterial({
    color: isDino ? 0x991b1b : 0xb91c1c,
    roughness: 0.5,
  });
  const meatCut = new THREE.Mesh(
    new THREE.BoxGeometry(
      isDino ? 0.62 : 0.36,
      isDino ? 0.32 : 0.2,
      isDino ? 0.72 : 0.42,
    ),
    meatMat,
  );
  meatCut.position.set(0, isDino ? 0.52 : 0.28, 0.08);
  meatCut.castShadow = true;
  root.add(meatCut);

  // 4. Exposed ivory rib cage bones
  const boneMat = new THREE.MeshStandardMaterial({
    color: 0xf5f5f4,
    roughness: 0.35,
  });
  const ribCount = isDino ? 4 : 3;
  for (let r = 0; r < ribCount; r++) {
    const rib = new THREE.Mesh(
      new THREE.TorusGeometry(isDino ? 0.24 : 0.14, 0.022, 6, 8, Math.PI),
      boneMat,
    );
    rib.rotation.y = Math.PI / 2;
    rib.rotation.z = 0.32;
    rib.position.set(
      0.04,
      isDino ? 0.58 : 0.32,
      (r - (ribCount - 1) / 2) * (isDino ? 0.22 : 0.14),
    );
    root.add(rib);
  }

  // 5. Subtle harvest beacon ring on ground
  const harvestRing = new THREE.Mesh(
    new THREE.RingGeometry(isDino ? 1.5 : 0.85, isDino ? 1.7 : 0.98, 16),
    new THREE.MeshBasicMaterial({
      color: 0xf87171,
      transparent: true,
      opacity: 0.45,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  harvestRing.rotation.x = -Math.PI / 2;
  harvestRing.position.y = 0.035;
  root.add(harvestRing);

  root.userData.meatCut = meatCut;
  root.userData.creatureRoot = creatureRig.root;

  return root;
}

/**
 * Creates an unplayable Farmer NPC wearing a straw sun hat, plaid shirt, and denim overalls.
 */
export function createFarmerNpcModel(): {
  group: THREE.Group;
  head: THREE.Group;
  armR: THREE.Group;
} {
  const group = new THREE.Group();
  const denimMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.85 });
  const shirtMat = new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.86 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd99b6c, roughness: 0.72 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.9 });
  const hatMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.92 });
  const hatBandMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85 });
  const beardMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.9 });

  // Boots + Legs
  [-0.14, 0.14].forEach((lx) => {
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.22, 0.22), bootMat);
    boot.position.set(lx, 0.11, 0.02);
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.1, 0.62, 8), denimMat);
    leg.position.set(lx, 0.52, 0);
    leg.castShadow = true;
    group.add(boot, leg);
  });

  // Torso (plaid shirt + overalls bib)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.66, 0.3), shirtMat);
  torso.position.y = 1.15;
  torso.castShadow = true;
  const bib = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.44, 0.32), denimMat);
  bib.position.y = 1.06;
  group.add(torso, bib);

  // Arms
  const armL = new THREE.Group();
  armL.position.set(-0.34, 1.4, 0);
  const aL = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.54, 7), shirtMat);
  aL.position.y = -0.24;
  const hL = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 6), skinMat);
  hL.position.y = -0.52;
  armL.add(aL, hL);

  const armR = new THREE.Group();
  armR.position.set(0.34, 1.4, 0);
  const aR = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.075, 0.54, 7), shirtMat);
  aR.position.y = -0.24;
  const hR = new THREE.Mesh(new THREE.SphereGeometry(0.075, 7, 6), skinMat);
  hR.position.y = -0.52;
  armR.add(aR, hR);
  group.add(armL, armR);

  // Head + Straw Hat + Smile/Beard
  const head = new THREE.Group();
  head.position.set(0, 1.66, 0);
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.2, 12, 10), skinMat);
  cranium.castShadow = true;
  const beard = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.14, 0.12), beardMat);
  beard.position.set(0, -0.1, 0.14);
  const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.44, 0.04, 16), hatMat);
  brim.position.y = 0.14;
  const crown = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.22, 0.18, 14), hatMat);
  crown.position.y = 0.24;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.215, 0.05, 14), hatBandMat);
  band.position.y = 0.17;
  head.add(cranium, beard, brim, crown, band);
  group.add(head);

  return { group, head, armR };
}

/**
 * Creates a staged 3D growing crop plant mesh (stage 0=seedling, 1=leafy, 2=ripe produce).
 */
export function createCropPlantMesh(
  produceItemId: ItemId,
  progress: number,
  watered: boolean,
): THREE.Group {
  const g = new THREE.Group();
  const soilMat = new THREE.MeshStandardMaterial({
    color: watered ? 0x3b2414 : 0x6b4b32,
    roughness: 0.95,
  });
  const mound = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.42, 0.1, 10), soilMat);
  mound.position.y = 0.05;
  g.add(mound);

  const stage = progress >= 1 ? 2 : progress >= 0.45 ? 1 : 0;
  const leafMat = new THREE.MeshStandardMaterial({
    color: watered ? 0x22c55e : 0x4d7c0f,
    roughness: 0.78,
  });

  if (stage === 0) {
    for (let i = 0; i < 2; i++) {
      const sprout = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.22, 5), leafMat);
      sprout.position.set((i - 0.5) * 0.12, 0.18, 0);
      sprout.rotation.z = (i - 0.5) * 0.4;
      g.add(sprout);
    }
    return g;
  }

  const foliageScale = stage === 2 ? 1.15 : 0.72;
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(0.11 * foliageScale, 0.46 * foliageScale, 5), leafMat);
    leaf.position.set(Math.cos(a) * 0.12, 0.22 * foliageScale, Math.sin(a) * 0.12);
    leaf.rotation.z = -Math.cos(a) * 0.55;
    leaf.rotation.x = Math.sin(a) * 0.55;
    g.add(leaf);
  }

  if (stage === 2) {
    const fruitColors: Record<string, number> = {
      wheat: 0xeab308,
      sugarcane: 0x84cc16,
      lettuce: 0x4ade80,
      tomato: 0xef4444,
      cucumber: 0x16a34a,
      jalapeno: 0x15803d,
      carrot: 0xf97316,
      potato: 0xd97706,
      onion: 0xdb2777,
      corn: 0xfacc15,
      bell_pepper: 0xfb923c,
      pumpkin: 0xea580c,
      garlic: 0xf5f5f4,
    };
    const fCol = fruitColors[produceItemId] ?? 0xef4444;
    const fruitMat = new THREE.MeshStandardMaterial({ color: fCol, roughness: 0.45 });
    const count = produceItemId === 'pumpkin' || produceItemId === 'lettuce' ? 1 : 3;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = count === 1 ? 0 : 0.16;
      const fruit = new THREE.Mesh(
        new THREE.SphereGeometry(produceItemId === 'pumpkin' ? 0.22 : 0.1, 8, 7),
        fruitMat,
      );
      fruit.position.set(Math.cos(a) * r, produceItemId === 'pumpkin' ? 0.22 : 0.34, Math.sin(a) * r);
      g.add(fruit);
    }
  }

  return g;
}

export interface HouseStationTarget {
  id: string;
  kind:
    | 'house_couch'
    | 'house_bed'
    | 'house_tv'
    | 'house_fridge'
    | 'house_stove'
    | 'house_toilet'
    | 'house_sink'
    | 'house_shower'
    | 'house_music_studio'
    | 'house_studio_drums'
    | 'house_studio_booth';
  label: string;
  sublabel: string;
  x: number;
  y: number;
  z: number;
  range: number;
  sitX?: number;
  sitY?: number;
  sitZ?: number;
  sitYaw?: number;
}

export interface HilltopHouseResult {
  group: THREE.Group;
  colliders: { x: number; z: number; radius: number }[];
  stations: HouseStationTarget[];
  tvScreenMesh: THREE.Mesh;
  tvScreenMat: THREE.MeshStandardMaterial;
}

/**
 * Builds the Premade Fully Furnished House on a Hill at (worldX, worldY, worldZ).
 * Doorway faces East (+X) directly toward the access ramp & homestead.
 */
export function createHilltopHouse(
  worldX: number,
  worldY: number,
  worldZ: number,
  woodTex: THREE.CanvasTexture,
): HilltopHouseResult {
  const group = new THREE.Group();
  group.position.set(worldX, worldY, worldZ);

  const colliders: { x: number; z: number; radius: number }[] = [];
  const addLocalCollider = (lx: number, lz: number, radius: number) => {
    colliders.push({ x: worldX + lx, z: worldZ + lz, radius });
  };

  // Materials
  const floorMat = new THREE.MeshStandardMaterial({ color: 0xa16207, map: woodTex, roughness: 0.72 });
  const tileMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.45 });
  const wallOuterMat = new THREE.MeshStandardMaterial({ color: 0xd6cfc4, roughness: 0.82 });
  const wallInnerMat = new THREE.MeshStandardMaterial({ color: 0xf5f0e6, roughness: 0.85 });
  const roofMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.85 });
  const trimMat = new THREE.MeshStandardMaterial({ color: 0x5c3a21, map: woodTex, roughness: 0.8 });
  const glassMat = new THREE.MeshStandardMaterial({
    color: 0x93c5fd,
    transparent: true,
    opacity: 0.42,
    roughness: 0.15,
    metalness: 0.25,
  });
  const fabricMat = new THREE.MeshStandardMaterial({ color: 0x1e40af, roughness: 0.88 });
  const rugMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.94 });
  const rugBorderMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
  const steelMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.28, metalness: 0.78 });
  const porcelainMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.22 });
  const chromeMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.92 });
  const darkTvMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.3, metalness: 0.4 });
  const tvScreenMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.85,
    roughness: 0.2,
  });

  // 1. Stone Foundation Plinth + Main Hardwood Floor Deck & Front Porch (+X = East entrance)
  const foundationMat = new THREE.MeshStandardMaterial({ color: 0x57534e, roughness: 0.94 });
  const mainFoundation = new THREE.Mesh(new THREE.BoxGeometry(9.8, 1.8, 8.8), foundationMat);
  mainFoundation.position.set(-0.5, -0.88, 0);
  mainFoundation.receiveShadow = true;
  mainFoundation.castShadow = true;
  group.add(mainFoundation);

  // House interior spans X: -5.2 to +4.2 (9.4m), Z: -4.2 to +4.2 (8.4m)
  const mainFloor = new THREE.Mesh(new THREE.BoxGeometry(9.6, 0.14, 8.6), floorMat);
  mainFloor.position.set(-0.5, 0.01, 0);
  mainFloor.receiveShadow = true;
  group.add(mainFloor);

  // Porch Stone Foundation + Deck on +X side (X: +4.2 to +6.4) + Entry Step
  const porchFoundation = new THREE.Mesh(new THREE.BoxGeometry(2.35, 1.8, 6.35), foundationMat);
  porchFoundation.position.set(5.3, -0.9, 0);
  porchFoundation.receiveShadow = true;
  group.add(porchFoundation);

  const porchFloor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.14, 6.2), trimMat);
  porchFloor.position.set(5.3, 0.0, 0);
  porchFloor.receiveShadow = true;
  group.add(porchFloor);

  const entryStep = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.16, 3.2), foundationMat);
  entryStep.position.set(6.65, -0.02, 0);
  entryStep.receiveShadow = true;
  group.add(entryStep);

  // Bathroom Tiled Floor (NW corner: X -5.2..-1.0, Z -4.2..0.0)
  const bathFloor = new THREE.Mesh(new THREE.BoxGeometry(4.2, 0.02, 4.2), tileMat);
  bathFloor.position.set(-3.1, 0.085, -2.1);
  bathFloor.receiveShadow = true;
  group.add(bathFloor);

  // Kitchen Tiled Floor (NE corner: X -0.8..4.2, Z -4.2..-1.2)
  const kitchenFloor = new THREE.Mesh(new THREE.BoxGeometry(4.8, 0.02, 3.0), tileMat);
  kitchenFloor.position.set(1.7, 0.085, -2.7);
  kitchenFloor.receiveShadow = true;
  group.add(kitchenFloor);

  // 2. Exterior & Interior Partition Walls (tall 3.1m)
  const wallH = 3.1;
  const addWall = (lx: number, lz: number, sx: number, sz: number, withColliders = true) => {
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx, wallH, sz), wallOuterMat);
    w.position.set(lx, wallH / 2 + 0.06, lz);
    w.castShadow = true;
    w.receiveShadow = true;
    w.userData.isHouseWall = true;
    const inner = new THREE.Mesh(
      new THREE.BoxGeometry(Math.max(0.06, sx - 0.03), wallH - 0.05, Math.max(0.06, sz - 0.03)),
      wallInnerMat,
    );
    inner.position.copy(w.position);
    inner.userData.isHouseWall = true;
    group.add(w, inner);

    if (withColliders) {
      const length = Math.max(sx, sz);
      const steps = Math.max(1, Math.ceil(length / 0.85));
      for (let i = 0; i < steps; i++) {
        const t = steps === 1 ? 0 : i / (steps - 1) - 0.5;
        const cx = sx >= sz ? lx + t * Math.max(0, sx - 0.56) : lx;
        const cz = sz > sx ? lz + t * Math.max(0, sz - 0.56) : lz;
        addLocalCollider(cx, cz, 0.30);
      }
    }
  };

  // West Back Wall
  addWall(-5.2, 0, 0.24, 8.6);
  // North Wall
  addWall(-0.5, -4.2, 9.6, 0.24);
  // South Partition Wall (Z = +4.2) separating main rooms from Dedicated Music Studio Wing,
  // leaving a wide 2.7m open archway at X: +1.5 .. +4.2 along the East entry corridor!
  addWall(-1.85, 4.2, 6.7, 0.24);
  const studioArchHeader = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.72, 0.26), trimMat);
  studioArchHeader.position.set(2.85, 2.78, 4.2);
  studioArchHeader.userData.isHouseWall = true;
  const studioSignPlaque = new THREE.Mesh(
    new THREE.BoxGeometry(1.15, 0.24, 0.08),
    new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xd97706,
      emissiveIntensity: 0.9,
      roughness: 0.3,
    }),
  );
  studioSignPlaque.position.set(2.85, 2.52, 4.05);
  group.add(studioArchHeader, studioSignPlaque);

  // East Front Wall (split cleanly leaving wide 2.6m open doorway at Z: -1.3 .. +1.3!)
  addWall(4.2, -2.75, 0.24, 2.9);
  addWall(4.2, 2.75, 0.24, 2.9);
  // Door header lintel above open doorway
  const doorHeader = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.75, 2.65), trimMat);
  doorHeader.position.set(4.2, 2.78, 0);
  doorHeader.userData.isHouseWall = true;
  group.add(doorHeader);

  // Decorative Glazed Windows on West & Front walls
  [
    [4.2, 1.65, 2.75, 0.3, 1.1, 1.4],
    [4.2, 1.65, -2.75, 0.3, 1.1, 1.4],
    [-5.2, 1.65, 2.0, 0.3, 1.1, 1.6],
  ].forEach(([wx, wy, wz, sx, sy, sz]) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.08, sy + 0.08, sz + 0.08), trimMat);
    frame.position.set(wx, wy, wz);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.12, sy - 0.08, sz - 0.08), glassMat);
    pane.position.set(wx, wy, wz);
    group.add(frame, pane);
  });

  // Interior Partition Wall separating Bathroom (NW) & Bedroom (SW) on West side (leaving wide 2.0m hallway doors!)
  // North-South spine at X = -1.0 from Z = -4.2 to -1.9 (Bath West door open Z: -1.9..-0.2) and Z = 0.0 to 2.2 (Bed open Z: 2.2..4.1)
  addWall(-1.0, -3.1, 0.2, 2.2);
  addWall(-1.0, 1.2, 0.2, 2.2);
  // East-West divider between Bathroom (Z<0) and Bedroom (Z>0) on West side
  addWall(-3.1, -0.1, 4.2, 0.2);

  // Porch Pillars
  [-2.8, 2.8].forEach((pz) => {
    const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.12, 3.0, 8), trimMat);
    pillar.position.set(6.1, 1.55, pz);
    pillar.castShadow = true;
    group.add(pillar);
    addLocalCollider(6.1, pz, 0.28);
  });

  // 3. Pitched Timber Shingle Roof + Warm Ceiling Lights
  const roofPitchL = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.22, 5.4), roofMat);
  roofPitchL.position.set(0.3, 4.05, -2.2);
  roofPitchL.rotation.x = 0.38;
  roofPitchL.castShadow = true;
  roofPitchL.userData.isHouseWall = true;
  const roofPitchR = new THREE.Mesh(new THREE.BoxGeometry(12.2, 0.22, 5.4), roofMat);
  roofPitchR.position.set(0.3, 4.05, 2.2);
  roofPitchR.rotation.x = -0.38;
  roofPitchR.castShadow = true;
  roofPitchR.userData.isHouseWall = true;
  const ridgeBeam = new THREE.Mesh(new THREE.BoxGeometry(12.3, 0.25, 0.35), trimMat);
  ridgeBeam.position.set(0.3, 4.95, 0);
  group.add(roofPitchL, roofPitchR, ridgeBeam);

  // Warm Interior Ceiling Lights
  const livingLight = new THREE.PointLight(0xffedd5, 1.35, 13, 1.4);
  livingLight.position.set(1.5, 2.85, 0.8);
  const bedBathLight = new THREE.PointLight(0xfef3c7, 0.95, 9, 1.5);
  bedBathLight.position.set(-3.0, 2.85, 0.5);
  group.add(livingLight, bedBathLight);

  // ==========================================================
  // 4. FURNISHINGS (LIVING ROOM, KITCHEN, BEDROOM, BATHROOM)
  // ==========================================================

  // A. Living Room: Carpet/Rug (centered at X=0.75, Z=1.8 so East corridor X: +2.0..+4.1 stays wide open!)
  const rugBorder = new THREE.Mesh(new THREE.BoxGeometry(2.6, 0.025, 2.5), rugBorderMat);
  rugBorder.position.set(0.75, 0.095, 1.8);
  const rugInner = new THREE.Mesh(new THREE.BoxGeometry(2.25, 0.03, 2.15), rugMat);
  rugInner.position.set(0.75, 0.1, 1.8);
  group.add(rugBorder, rugInner);

  // B. Plush Couch / Sofa (X=0.75, Z=3.35 facing North toward TV stand at Z=0.35!)
  const couchGroup = new THREE.Group();
  couchGroup.position.set(0.75, 0.08, 3.35);
  const couchBase = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.42, 0.92), fabricMat);
  couchBase.position.y = 0.24;
  couchBase.castShadow = true;
  const couchBack = new THREE.Mesh(new THREE.BoxGeometry(2.05, 0.55, 0.22), fabricMat);
  couchBack.position.set(0, 0.62, 0.35);
  const armCouchL = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.48, 0.92), fabricMat);
  armCouchL.position.set(-0.96, 0.46, 0);
  const armCouchR = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.48, 0.92), fabricMat);
  armCouchR.position.set(0.96, 0.46, 0);
  couchGroup.add(couchBase, couchBack, armCouchL, armCouchR);
  group.add(couchGroup);
  addLocalCollider(0.75, 3.35, 0.68);

  // Coffee Table in front of Couch (on the rug)
  const coffeeTableTop = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.08, 0.66), trimMat);
  coffeeTableTop.position.set(0.75, 0.46, 1.95);
  const coffeeLegs = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.38, 0.48), trimMat);
  coffeeLegs.position.set(0.75, 0.24, 1.95);
  group.add(coffeeTableTop, coffeeLegs);
  addLocalCollider(0.75, 1.95, 0.38);

  // C. Working Flat-Screen TV & Entertainment Stand (X=0.75, Z=0.35 facing South toward Couch!)
  const tvStand = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.55, 0.5), trimMat);
  tvStand.position.set(0.75, 0.35, 0.35);
  tvStand.castShadow = true;
  const tvFrame = new THREE.Mesh(new THREE.BoxGeometry(1.65, 1.0, 0.1), darkTvMat);
  tvFrame.position.set(0.75, 1.24, 0.35);
  tvFrame.castShadow = true;
  const tvScreenMesh = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 0.86), tvScreenMat);
  tvScreenMesh.position.set(0.75, 1.24, 0.41);
  const tvStandbyLedMat = new THREE.MeshStandardMaterial({
    color: 0x22c55e,
    emissive: 0x22c55e,
    emissiveIntensity: 1.5,
    roughness: 0.2,
  });
  const tvStandbyLed = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.018, 0.015), tvStandbyLedMat);
  tvStandbyLed.position.set(1.44, 0.76, 0.405);
  tvScreenMesh.userData.standbyLedMat = tvStandbyLedMat;
  group.add(tvStand, tvFrame, tvScreenMesh, tvStandbyLed);
  addLocalCollider(0.75, 0.35, 0.52);

  // D. Kitchen (North-East wall Z=-3.55): Refrigerator, Stove/Oven, Kitchen Counter & Sink
  // Refrigerator at X=-0.1, Z=-3.5
  const fridgeBody = new THREE.Mesh(new THREE.BoxGeometry(0.95, 1.95, 0.85), steelMat);
  fridgeBody.position.set(-0.1, 1.05, -3.55);
  fridgeBody.castShadow = true;
  const fridgeSplit = new THREE.Mesh(new THREE.BoxGeometry(0.96, 0.03, 0.87), darkTvMat);
  fridgeSplit.position.set(-0.1, 1.38, -3.55);
  const fridgeHandle = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.55, 0.06), chromeMat);
  fridgeHandle.position.set(0.28, 1.05, -3.1);
  group.add(fridgeBody, fridgeSplit, fridgeHandle);
  addLocalCollider(-0.1, -3.55, 0.55);

  // Kitchen Stove / Oven at X=1.25, Z=-3.55
  const stoveBody = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.92, 0.82), steelMat);
  stoveBody.position.set(1.25, 0.54, -3.55);
  stoveBody.castShadow = true;
  const ovenWindow = new THREE.Mesh(
    new THREE.BoxGeometry(0.72, 0.38, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xc2410c, emissiveIntensity: 0.65 }),
  );
  ovenWindow.position.set(1.25, 0.48, -3.13);
  group.add(stoveBody, ovenWindow);
  [
    [1.0, -3.38],
    [1.5, -3.38],
    [1.0, -3.72],
    [1.5, -3.72],
  ].forEach(([bx, bz]) => {
    const burner = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 12), darkTvMat);
    burner.position.set(bx, 1.01, bz);
    group.add(burner);
  });
  addLocalCollider(1.25, -3.55, 0.55);

  // Kitchen Counter & Basin at X=2.7, Z=-3.55
  const counterBase = new THREE.Mesh(new THREE.BoxGeometry(1.5, 0.9, 0.8), trimMat);
  counterBase.position.set(2.7, 0.53, -3.55);
  const counterTop = new THREE.Mesh(new THREE.BoxGeometry(1.55, 0.06, 0.84), porcelainMat);
  counterTop.position.set(2.7, 0.99, -3.55);
  group.add(counterBase, counterTop);
  addLocalCollider(2.7, -3.55, 0.55);

  // E. Bedroom (South-West room: X=-3.6, Z=2.55): Cozy Bed & Nightstand
  const bedFrame = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.35, 2.35), trimMat);
  bedFrame.position.set(-3.65, 0.26, 2.55);
  const mattress = new THREE.Mesh(new THREE.BoxGeometry(1.72, 0.25, 2.2), porcelainMat);
  mattress.position.set(-3.65, 0.52, 2.55);
  const blanket = new THREE.Mesh(
    new THREE.BoxGeometry(1.74, 0.14, 1.55),
    new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.85 }),
  );
  blanket.position.set(-3.65, 0.62, 2.22);
  const headboard = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.95, 0.14), trimMat);
  headboard.position.set(-3.65, 0.72, 3.68);
  const pillowL = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.4), porcelainMat);
  pillowL.position.set(-4.05, 0.7, 3.35);
  const pillowR = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.14, 0.4), porcelainMat);
  pillowR.position.set(-3.25, 0.7, 3.35);
  group.add(bedFrame, mattress, blanket, headboard, pillowL, pillowR);
  addLocalCollider(-3.65, 2.55, 0.95);

  // F. Bathroom (North-West room): Toilet, Sink Vanity, Walk-in Shower / Tub
  // Toilet at X=-2.2, Z=-3.65
  const toiletTank = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.78, 0.26), porcelainMat);
  toiletTank.position.set(-2.2, 0.52, -3.82);
  const toiletBowl = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.2, 0.42, 12), porcelainMat);
  toiletBowl.position.set(-2.2, 0.29, -3.52);
  group.add(toiletTank, toiletBowl);
  addLocalCollider(-2.2, -3.62, 0.36);

  // Bathroom Sink Vanity + Mirror at X=-3.3, Z=-3.7
  const vanityCab = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.82, 0.58), trimMat);
  vanityCab.position.set(-3.3, 0.49, -3.72);
  const sinkBasin = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.08, 0.62), porcelainMat);
  sinkBasin.position.set(-3.3, 0.93, -3.72);
  const faucet = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.03, 0.22, 8), chromeMat);
  faucet.position.set(-3.3, 1.06, -3.88);
  const mirror = new THREE.Mesh(
    new THREE.BoxGeometry(0.8, 0.85, 0.04),
    new THREE.MeshStandardMaterial({ color: 0xe0f2fe, roughness: 0.12, metalness: 0.65 }),
  );
  mirror.position.set(-3.3, 1.65, -4.05);
  group.add(vanityCab, sinkBasin, faucet, mirror);
  addLocalCollider(-3.3, -3.72, 0.42);

  // Walk-in Bathtub / Shower at X=-4.45, Z=-2.95
  const tubBase = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.48, 1.85), porcelainMat);
  tubBase.position.set(-4.45, 0.32, -2.95);
  const tubWater = new THREE.Mesh(
    new THREE.BoxGeometry(0.92, 0.04, 1.6),
    new THREE.MeshStandardMaterial({ color: 0x38bdf8, transparent: true, opacity: 0.65 }),
  );
  tubWater.position.set(-4.45, 0.55, -2.95);
  const showerGlass = new THREE.Mesh(new THREE.BoxGeometry(0.06, 1.85, 1.15), glassMat);
  showerGlass.position.set(-3.88, 1.25, -2.6);
  const showerPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.9, 8), chromeMat);
  showerPipe.position.set(-4.92, 1.45, -2.95);
  const showerHead = new THREE.Mesh(new THREE.ConeGeometry(0.14, 0.12, 10), chromeMat);
  showerHead.position.set(-4.72, 2.32, -2.95);
  showerHead.rotation.z = 0.4;
  group.add(tubBase, tubWater, showerGlass, showerPipe, showerHead);
  addLocalCollider(-4.45, -2.95, 0.65);

  // ==========================================================
  // G. DEDICATED MUSIC PRODUCTION STUDIO WING (Z: +4.2 .. +8.4, X: -4.2 .. +4.2)
  // Enterable via South archway from Living Room (X: +2.0 .. +4.1)
  // ==========================================================
  const studioFoundation = new THREE.Mesh(new THREE.BoxGeometry(8.8, 1.8, 4.6), foundationMat);
  studioFoundation.position.set(0.0, -0.88, 6.4);
  studioFoundation.receiveShadow = true;
  studioFoundation.castShadow = true;
  group.add(studioFoundation);

  const studioFloor = new THREE.Mesh(new THREE.BoxGeometry(8.6, 0.14, 4.4), floorMat);
  studioFloor.position.set(0.0, 0.01, 6.3);
  studioFloor.receiveShadow = true;
  group.add(studioFloor);

  // Studio Control Room Carpet + Booth Acoustic Mat
  const studioRugMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.95 });
  const studioRugTrimMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.9 });
  const studioRugTrim = new THREE.Mesh(new THREE.BoxGeometry(3.4, 0.025, 2.3), studioRugTrimMat);
  studioRugTrim.position.set(1.35, 0.092, 6.45);
  const studioRug = new THREE.Mesh(new THREE.BoxGeometry(3.15, 0.03, 2.05), studioRugMat);
  studioRug.position.set(1.35, 0.097, 6.45);
  const boothRug = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.03, 3.2), studioRugMat);
  boothRug.position.set(-2.75, 0.097, 6.35);
  group.add(studioRugTrim, studioRug, boothRug);

  // Studio Exterior Walls & Roof
  addWall(-4.2, 6.3, 0.24, 4.4); // West outer wall
  addWall(0.0, 8.4, 8.6, 0.24);  // South outer wall
  addWall(4.2, 6.3, 0.24, 4.4);  // East outer wall

  // Studio Wing Acoustic Ceiling & Sloped Roof
  const studioCeiling = new THREE.Mesh(new THREE.BoxGeometry(8.85, 0.22, 4.6), trimMat);
  studioCeiling.position.set(0.0, 3.22, 6.35);
  studioCeiling.userData.isHouseWall = true;
  const studioRoof = new THREE.Mesh(new THREE.BoxGeometry(9.2, 0.22, 4.9), roofMat);
  studioRoof.position.set(0.0, 3.55, 6.35);
  studioRoof.rotation.x = -0.14;
  studioRoof.castShadow = true;
  studioRoof.userData.isHouseWall = true;
  group.add(studioCeiling, studioRoof);

  // Glazed Studio Windows (South & East walls)
  [
    [1.2, 1.85, 8.4, 2.1, 0.95, 0.3],
    [4.2, 1.75, 6.3, 0.3, 1.0, 1.5],
  ].forEach(([wx, wy, wz, sx, sy, sz]) => {
    const frame = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.08, sy + 0.08, sz + 0.08), trimMat);
    frame.position.set(wx, wy, wz);
    const pane = new THREE.Mesh(new THREE.BoxGeometry(sx + 0.12, sy - 0.08, sz - 0.08), glassMat);
    pane.position.set(wx, wy, wz);
    group.add(frame, pane);
  });

  // Acoustic Foam Sound-Absorption Wall Panels
  const foamMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.96 });
  const foamAccentMat = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.92 });
  [
    [0.05, 1.8, 8.22, 1.2, 1.1, 0.08],
    [2.35, 1.8, 8.22, 1.2, 1.1, 0.08],
    [4.02, 1.8, 5.1, 0.08, 1.2, 0.9],
    [4.02, 1.8, 7.6, 0.08, 1.2, 0.9],
    [-4.02, 1.7, 5.4, 0.08, 1.4, 1.1],
    [-4.02, 1.7, 7.1, 0.08, 1.4, 1.1],
    [-2.75, 1.7, 8.22, 2.1, 1.4, 0.08],
  ].forEach(([px, py, pz, sx, sy, sz], idx) => {
    const panel = new THREE.Mesh(
      new THREE.BoxGeometry(sx, sy, sz),
      idx % 2 === 0 ? foamMat : foamAccentMat,
    );
    panel.position.set(px, py, pz);
    group.add(panel);
  });

  // Warm Studio Ceiling Light (keeps total house lights at 3)
  const studioLight = new THREE.PointLight(0xfde68a, 1.15, 10, 1.5);
  studioLight.position.set(0.6, 2.85, 6.45);
  group.add(studioLight);

  // Studio Material Palette
  const deskWoodMat = new THREE.MeshStandardMaterial({ color: 0x27201c, roughness: 0.55 });
  const matteBlackMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.42, metalness: 0.35 });
  const brushedAlumMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.85 });
  const dawScreenMat = new THREE.MeshStandardMaterial({
    color: 0x1e293b,
    emissive: 0x0284c7,
    emissiveIntensity: 0.72,
    roughness: 0.2,
  });
  const ledAmberMat = new THREE.MeshStandardMaterial({
    color: 0xfbbf24,
    emissive: 0xf59e0b,
    emissiveIntensity: 1.1,
    roughness: 0.25,
  });
  const ledGreenMat = new THREE.MeshStandardMaterial({
    color: 0x4ade80,
    emissive: 0x22c55e,
    emissiveIntensity: 1.1,
    roughness: 0.25,
  });
  const onAirMat = new THREE.MeshStandardMaterial({
    color: 0xef4444,
    emissive: 0xdc2626,
    emissiveIntensity: 1.35,
    roughness: 0.25,
  });
  const coneMat = new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.45, metalness: 0.25 });

  // 1. PRODUCTION DESK & PRODUCER CHAIR (X=1.25, Z=7.5)
  const deskGroup = new THREE.Group();
  deskGroup.position.set(1.25, 0.08, 7.5);
  const deskMainTop = new THREE.Mesh(new THREE.BoxGeometry(2.55, 0.07, 0.96), deskWoodMat);
  deskMainTop.position.set(0, 0.74, 0);
  deskMainTop.castShadow = true;
  const deskBridge = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.16, 0.34), deskWoodMat);
  deskBridge.position.set(0, 0.86, 0.28);
  const deskLegL = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.74, 0.84), matteBlackMat);
  deskLegL.position.set(-1.18, 0.37, 0);
  const deskLegR = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.74, 0.84), matteBlackMat);
  deskLegR.position.set(1.18, 0.37, 0);
  const deskRackLeft = new THREE.Mesh(new THREE.BoxGeometry(0.56, 0.56, 0.7), matteBlackMat);
  deskRackLeft.position.set(-0.88, 0.44, 0.05);
  // Producer Swivel Chair in front of desk (no collider so walkways stay smooth)
  const chairSeat = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.09, 0.52), matteBlackMat);
  chairSeat.position.set(0, 0.48, -0.78);
  const chairBack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.62, 0.09), matteBlackMat);
  chairBack.position.set(0, 0.82, -1.0);
  const chairStem = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.4, 8), chromeMat);
  chairStem.position.set(0, 0.24, -0.78);
  const chairBase = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.32, 0.06, 8), matteBlackMat);
  chairBase.position.set(0, 0.04, -0.78);
  deskGroup.add(
    deskMainTop,
    deskBridge,
    deskLegL,
    deskLegR,
    deskRackLeft,
    chairSeat,
    chairBack,
    chairStem,
    chairBase,
  );
  group.add(deskGroup);
  addLocalCollider(0.55, 7.65, 0.36);
  addLocalCollider(1.95, 7.65, 0.36);

  // 2. COMPUTER (Dual DAW Displays + PC Tower + QWERTY Keyboard)
  const monitorStandL = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), brushedAlumMat);
  monitorStandL.position.set(0.88, 1.05, 7.82);
  const pcBezelL = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 0.05), darkTvMat);
  pcBezelL.position.set(0.88, 1.28, 7.8);
  pcBezelL.rotation.y = 0.14;
  const pcScreenL = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), dawScreenMat);
  pcScreenL.position.set(0.875, 1.28, 7.77);
  pcScreenL.rotation.y = Math.PI + 0.14;

  const monitorStandR = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.24, 0.12), brushedAlumMat);
  monitorStandR.position.set(1.62, 1.05, 7.82);
  const pcBezelR = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.42, 0.05), darkTvMat);
  pcBezelR.position.set(1.62, 1.28, 7.8);
  pcBezelR.rotation.y = -0.14;
  const pcScreenR = new THREE.Mesh(new THREE.PlaneGeometry(0.62, 0.36), dawScreenMat);
  pcScreenR.position.set(1.625, 1.28, 7.77);
  pcScreenR.rotation.y = Math.PI - 0.14;

  // DAW timeline waveform bars on left screen & spectrum bars on right screen
  [1.22, 1.28, 1.34].forEach((by, bIdx) => {
    const bar = new THREE.Mesh(
      new THREE.BoxGeometry(0.46, 0.032, 0.01),
      bIdx % 2 === 0 ? ledAmberMat : ledGreenMat,
    );
    bar.position.set(0.875, by, 7.76);
    bar.rotation.y = 0.14;
    group.add(bar);
  });
  [-0.18, -0.09, 0, 0.09, 0.18].forEach((ox, sIdx) => {
    const h = 0.09 + (sIdx % 3) * 0.065;
    const eqBar = new THREE.Mesh(
      new THREE.BoxGeometry(0.05, h, 0.01),
      sIdx % 2 === 0 ? ledGreenMat : ledAmberMat,
    );
    eqBar.position.set(1.625 + ox, 1.18 + h / 2, 7.76);
    eqBar.rotation.y = -0.14;
    group.add(eqBar);
  });

  // Illuminated Studio Workstation PC Tower beside desk
  const pcTower = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.54, 0.52), matteBlackMat);
  pcTower.position.set(2.68, 0.35, 7.65);
  const pcLedStrip = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.42, 0.02), ledAmberMat);
  pcLedStrip.position.set(2.62, 0.36, 7.38);
  const qwertyKb = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.02, 0.15), matteBlackMat);
  qwertyKb.position.set(1.25, 0.87, 7.45);
  group.add(
    monitorStandL,
    pcBezelL,
    pcScreenL,
    monitorStandR,
    pcBezelR,
    pcScreenR,
    pcTower,
    pcLedStrip,
    qwertyKb,
  );

  // 3. STUDIO MONITORS (Left & Right 2-way speakers on isolation pads)
  [
    { x: 0.25, rot: 0.22 },
    { x: 2.25, rot: -0.22 },
  ].forEach(({ x: sx, rot }) => {
    const spkGroup = new THREE.Group();
    spkGroup.position.set(sx, 1.02, 7.76);
    spkGroup.rotation.y = rot;
    const isoPad = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.04, 0.3), foamMat);
    const cab = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.4, 0.28), matteBlackMat);
    cab.position.y = 0.22;
    const woofer = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 0.03, 14), coneMat);
    woofer.rotation.x = Math.PI / 2;
    woofer.position.set(0, 0.17, -0.14);
    const tweeter = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.03, 12), chromeMat);
    tweeter.rotation.x = Math.PI / 2;
    tweeter.position.set(0, 0.33, -0.14);
    spkGroup.add(isoPad, cab, woofer, tweeter);
    group.add(spkGroup);
  });

  // 4. MIDI KEYBOARD (49-key controller on front desk with white & black keys)
  const midiGroup = new THREE.Group();
  midiGroup.position.set(1.25, 0.87, 7.18);
  const midiBody = new THREE.Mesh(new THREE.BoxGeometry(1.06, 0.06, 0.28), matteBlackMat);
  const midiWhiteBed = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.03, 0.15), porcelainMat);
  midiWhiteBed.position.set(0.05, 0.032, -0.04);
  midiGroup.add(midiBody, midiWhiteBed);
  for (let k = 0; k < 14; k++) {
    if (k % 7 === 2 || k % 7 === 6) continue;
    const blackKey = new THREE.Mesh(new THREE.BoxGeometry(0.028, 0.026, 0.09), darkTvMat);
    blackKey.position.set(-0.33 + k * 0.058, 0.05, -0.01);
    midiGroup.add(blackKey);
  }
  const pitchWheel = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.03, 0.08), ledAmberMat);
  pitchWheel.position.set(-0.44, 0.04, -0.02);
  midiGroup.add(pitchWheel);
  group.add(midiGroup);

  // 5. MIXING CONSOLE (Multi-fader desk section on left side of production desk)
  const mixerGroup = new THREE.Group();
  mixerGroup.position.set(0.32, 0.87, 7.26);
  const mixerChassis = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.07, 0.44), brushedAlumMat);
  const mixerMeter = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.03), ledGreenMat);
  mixerMeter.position.set(0, 0.04, 0.14);
  mixerGroup.add(mixerChassis, mixerMeter);
  for (let f = 0; f < 6; f++) {
    const fx = -0.22 + f * 0.088;
    const slot = new THREE.Mesh(new THREE.BoxGeometry(0.018, 0.01, 0.2), darkTvMat);
    slot.position.set(fx, 0.038, -0.06);
    const cap = new THREE.Mesh(new THREE.BoxGeometry(0.038, 0.028, 0.045), matteBlackMat);
    cap.position.set(fx, 0.05, -0.08 + (f % 3) * 0.04);
    const knob = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.025, 8), ledAmberMat);
    knob.position.set(fx, 0.048, 0.08);
    mixerGroup.add(slot, cap, knob);
  }
  group.add(mixerGroup);

  // 6. AUDIO INTERFACE (Desktop preamp unit with gain halos)
  const ifaceBox = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.075, 0.2), brushedAlumMat);
  ifaceBox.position.set(2.05, 0.89, 7.45);
  const ifaceKnobL = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 10), ledGreenMat);
  ifaceKnobL.rotation.x = Math.PI / 2;
  ifaceKnobL.position.set(1.97, 0.89, 7.34);
  const ifaceKnobR = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.03, 10), ledAmberMat);
  ifaceKnobR.rotation.x = Math.PI / 2;
  ifaceKnobR.position.set(2.08, 0.89, 7.34);
  group.add(ifaceBox, ifaceKnobL, ifaceKnobR);

  // 7. HEADPHONES (Over-ear studio headphones on desk stand)
  const hpStandPole = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.34, 8), chromeMat);
  hpStandPole.position.set(2.34, 1.02, 7.22);
  const hpBand = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.04, 0.05), matteBlackMat);
  hpBand.position.set(2.34, 1.19, 7.22);
  const hpCupL = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), matteBlackMat);
  hpCupL.rotation.z = Math.PI / 2;
  hpCupL.position.set(2.25, 1.08, 7.22);
  const hpCupR = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.04, 12), matteBlackMat);
  hpCupR.rotation.z = Math.PI / 2;
  hpCupR.position.set(2.43, 1.08, 7.22);
  group.add(hpStandPole, hpBand, hpCupL, hpCupR);

  // 8. DRUM MACHINE / SAMPLER STAND (East Studio Corner X=3.45, Z=7.25)
  const drumStandPole = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.88, 8), chromeMat);
  drumStandPole.position.set(3.45, 0.52, 7.25);
  const drumPadChassis = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.08, 0.56), matteBlackMat);
  drumPadChassis.position.set(3.45, 0.98, 7.25);
  drumPadChassis.rotation.x = 0.22;
  drumPadChassis.rotation.y = -0.35;
  group.add(drumStandPole, drumPadChassis);
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 4; col++) {
      const pad = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.025, 0.09),
        (row + col) % 2 === 0 ? ledAmberMat : ledGreenMat,
      );
      pad.position.set(
        3.29 + col * 0.11,
        1.03 - row * 0.018,
        7.12 + row * 0.095,
      );
      group.add(pad);
    }
  }
  addLocalCollider(3.45, 7.25, 0.32);

  // 9. ISOLATED RECORDING BOOTH (West Studio Wing X: -4.1..-1.3, Z: +4.4..+8.2)
  // Partition wall at X = -1.3 from Z = +6.4..+8.3, leaving wide open booth entry at Z: +4.4..+6.4
  addWall(-1.3, 7.35, 0.2, 1.9);
  const boothGlassFrame = new THREE.Mesh(new THREE.BoxGeometry(0.24, 1.08, 1.45), trimMat);
  boothGlassFrame.position.set(-1.3, 1.65, 7.25);
  const boothWindowPane = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.94, 1.3), glassMat);
  boothWindowPane.position.set(-1.3, 1.65, 7.25);
  const onAirSign = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.22, 0.65), onAirMat);
  onAirSign.position.set(-1.26, 2.65, 5.25);
  group.add(boothGlassFrame, boothWindowPane, onAirSign);

  // 10. CONDENSER MICROPHONE ON BOOM STAND + POP FILTER (Inside Recording Booth at X=-2.85, Z=7.05)
  const micBase = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.24, 0.05, 14), matteBlackMat);
  micBase.position.set(-2.85, 0.11, 7.05);
  const micPole = new THREE.Mesh(new THREE.CylinderGeometry(0.022, 0.024, 1.45, 8), chromeMat);
  micPole.position.set(-2.85, 0.85, 7.05);
  const micBoom = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.62, 8), chromeMat);
  micBoom.position.set(-2.68, 1.56, 6.95);
  micBoom.rotation.z = -0.95;
  micBoom.rotation.y = 0.4;
  const micBody = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.038, 0.2, 12), brushedAlumMat);
  micBody.position.set(-2.5, 1.52, 6.86);
  const micCapsule = new THREE.Mesh(new THREE.SphereGeometry(0.045, 12, 10), chromeMat);
  micCapsule.position.set(-2.5, 1.64, 6.86);
  const popFilter = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.016, 16), matteBlackMat);
  popFilter.rotation.z = Math.PI / 2;
  popFilter.position.set(-2.4, 1.58, 6.8);
  group.add(micBase, micPole, micBoom, micBody, micCapsule, popFilter);
  addLocalCollider(-2.85, 7.05, 0.28);

  const stations: HouseStationTarget[] = [
    {
      id: 'house_music_studio',
      kind: 'house_music_studio',
      label: 'Open Music Production Studio',
      sublabel: 'DAW, MIDI Synth, Sequencer, Mixing Console & Samples',
      x: worldX + 1.25,
      y: worldY,
      z: worldZ + 6.9,
      range: 2.95,
    },
    {
      id: 'house_studio_drums',
      kind: 'house_studio_drums',
      label: 'Play Drum Machine & Sequencer',
      sublabel: '16-Step Beat Pads, BPM & Custom WAV Kits',
      x: worldX + 3.25,
      y: worldY,
      z: worldZ + 7.0,
      range: 2.4,
    },
    {
      id: 'house_studio_booth',
      kind: 'house_studio_booth',
      label: 'Enter Recording Booth & Mic',
      sublabel: 'Record live vocals/audio into Studio Sampler',
      x: worldX - 2.6,
      y: worldY,
      z: worldZ + 6.55,
      range: 2.4,
    },
    {
      id: 'house_couch',
      kind: 'house_couch',
      label: 'Sit on Living Room Couch',
      sublabel: 'Relax in front of the TV',
      x: worldX + 0.75,
      y: worldY,
      z: worldZ + 3.1,
      range: 2.3,
      sitX: worldX + 0.75,
      sitY: worldY + 0.15,
      sitZ: worldZ + 3.25,
      sitYaw: 0, // facing North (-Z) toward TV
    },
    {
      id: 'house_tv',
      kind: 'house_tv',
      label: 'Watch TV (YouTube)',
      sublabel: 'Stream videos & survival channels',
      x: worldX + 0.75,
      y: worldY,
      z: worldZ + 0.6,
      range: 3.2,
    },
    {
      id: 'house_fridge',
      kind: 'house_fridge',
      label: 'Open Refrigerator',
      sublabel: 'Cold storage & fresh dairy',
      x: worldX - 0.1,
      y: worldY,
      z: worldZ - 3.3,
      range: 2.4,
    },
    {
      id: 'house_stove',
      kind: 'house_stove',
      label: 'Bake / Cook on Stove',
      sublabel: 'Oven for Bread, Cake, Cookies & Meals',
      x: worldX + 1.25,
      y: worldY,
      z: worldZ - 3.3,
      range: 2.4,
    },
    {
      id: 'house_bed',
      kind: 'house_bed',
      label: 'Sleep in Bed',
      sublabel: 'Restore full Health, Stamina & Warmth',
      x: worldX - 3.4,
      y: worldY,
      z: worldZ + 2.4,
      range: 2.6,
    },
    {
      id: 'house_toilet',
      kind: 'house_toilet',
      label: 'Use Bathroom Toilet',
      sublabel: 'Sit & freshen up',
      x: worldX - 2.2,
      y: worldY,
      z: worldZ - 3.4,
      range: 2.0,
      sitX: worldX - 2.2,
      sitY: worldY + 0.05,
      sitZ: worldZ - 3.42,
      sitYaw: Math.PI, // facing South (+Z)
    },
    {
      id: 'house_sink',
      kind: 'house_sink',
      label: 'Use Bathroom Sink',
      sublabel: 'Drink fresh water & refill bottles',
      x: worldX - 3.3,
      y: worldY,
      z: worldZ - 3.45,
      range: 2.0,
    },
    {
      id: 'house_shower',
      kind: 'house_shower',
      label: 'Take Hot Shower / Bath',
      sublabel: 'Restores +60 Stamina, Warmth & +20 HP',
      x: worldX - 4.2,
      y: worldY,
      z: worldZ - 2.8,
      range: 2.3,
    },
  ];

  return { group, colliders, stations, tvScreenMesh, tvScreenMat };
}

/**
 * Composite multi-part architectural masonry & timber engineering modules (y = 0..2.0m flush).
 * Tracks materials in userData.stressMaterials so high structural stress visibly tints & glows red.
 */
export function createStructuralBlockMesh(
  kind: StructuralBlockKind,
  isPreview = false,
): THREE.Group {
  const group = new THREE.Group();
  const stressMaterials: THREE.MeshStandardMaterial[] = [];

  const mkMat = (hex: number, roughness: number, metalness = 0.04) => {
    const mat = new THREE.MeshStandardMaterial({
      color: hex,
      roughness,
      metalness,
      transparent: isPreview,
      opacity: isPreview ? 0.56 : 1.0,
    });
    stressMaterials.push(mat);
    return mat;
  };

  if (kind === 'stone_block') {
    const stoneMain = mkMat(0x78716c, 0.9);
    const stoneTrim = mkMat(0x57534e, 0.78);
    const mortarMat = mkMat(0x44403c, 0.96);

    // Lower ashlar course + recessed mortar band + upper dressed course + coping top
    const lowerCourse = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.88, 2.34), stoneMain);
    lowerCourse.position.y = 0.44;
    const mortarSeam = new THREE.Mesh(new THREE.BoxGeometry(2.26, 0.14, 2.26), mortarMat);
    mortarSeam.position.y = 0.95;
    const upperCourse = new THREE.Mesh(new THREE.BoxGeometry(2.34, 0.84, 2.34), stoneMain);
    upperCourse.position.y = 1.44;
    const deckCap = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.16, 2.4), stoneTrim);
    deckCap.position.y = 1.92;
    group.add(lowerCourse, mortarSeam, upperCourse, deckCap);

    // 4 Corner dressed stone quoins for tactile fortress relief
    for (let sx = -1; sx <= 1; sx += 2) {
      for (let sz = -1; sz <= 1; sz += 2) {
        const quoin = new THREE.Mesh(new THREE.BoxGeometry(0.46, 1.82, 0.46), stoneTrim);
        quoin.position.set(sx * 0.98, 0.92, sz * 0.98);
        group.add(quoin);
      }
    }
  } else if (kind === 'stone_pillar') {
    const baseStone = mkMat(0x57534e, 0.82);
    const shaftStone = mkMat(0x94a3b8, 0.65);
    const capStone = mkMat(0x64748b, 0.72);

    const plinth = new THREE.Mesh(new THREE.BoxGeometry(1.36, 0.34, 1.36), baseStone);
    plinth.position.y = 0.17;
    const collarLower = new THREE.Mesh(new THREE.CylinderGeometry(0.56, 0.62, 0.16, 10), capStone);
    collarLower.position.y = 0.42;
    const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.5, 1.12, 12), shaftStone);
    shaft.position.y = 1.06;
    const collarUpper = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.48, 0.18, 10), capStone);
    collarUpper.position.y = 1.71;
    const capital = new THREE.Mesh(new THREE.BoxGeometry(1.48, 0.22, 1.48), baseStone);
    capital.position.y = 1.89;
    group.add(plinth, collarLower, shaft, collarUpper, capital);
  } else if (kind === 'stone_arch') {
    const pierStone = mkMat(0x57534e, 0.84);
    const archStone = mkMat(0x78716c, 0.74);
    const keystoneMat = mkMat(0xa8a29e, 0.58);

    // Two grounded side piers
    const pierL = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.25, 2.34), pierStone);
    pierL.position.set(-0.92, 0.625, 0);
    const pierR = new THREE.Mesh(new THREE.BoxGeometry(0.56, 1.25, 2.34), pierStone);
    pierR.position.set(0.92, 0.625, 0);
    // Flat walkable top spandrel deck
    const topDeck = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.28, 2.4), pierStone);
    topDeck.position.y = 1.86;
    group.add(pierL, pierR, topDeck);

    // Curved voussoir arch ring (5 angled stone blocks + center keystone)
    const segCount = 5;
    for (let i = 0; i < segCount; i++) {
      const t = (i / (segCount - 1) - 0.5) * Math.PI * 0.82;
      const r = 0.92;
      const vx = Math.sin(t) * r;
      const vy = 0.95 + Math.cos(t) * 0.78;
      const isKeystone = i === 2;
      const block = new THREE.Mesh(
        new THREE.BoxGeometry(isKeystone ? 0.46 : 0.42, isKeystone ? 0.44 : 0.36, 2.28),
        isKeystone ? keystoneMat : archStone,
      );
      block.position.set(vx, vy, 0);
      block.rotation.z = -t;
      group.add(block);
    }
    // Corner spandrel masonry shoulders filling deck-to-arch transition
    const shoulderL = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.54, 2.3), archStone);
    shoulderL.position.set(-0.86, 1.48, 0);
    const shoulderR = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.54, 2.3), archStone);
    shoulderR.position.set(0.86, 1.48, 0);
    group.add(shoulderL, shoulderR);
  } else if (kind === 'timber_beam') {
    const timberMat = mkMat(0x7c4a21, 0.86);
    const plankMat = mkMat(0x9a5f2d, 0.76);
    const ironMat = mkMat(0x334155, 0.42, 0.68);

    // Heavy top walkway plank deck (y = 1.62..2.0 so it aligns flush with masonry bridges!)
    for (let i = -2; i <= 2; i++) {
      const plank = new THREE.Mesh(new THREE.BoxGeometry(2.36, 0.16, 0.42), plankMat);
      plank.position.set(0, 1.92, i * 0.46);
      group.add(plank);
    }
    // Two longitudinal timber stringer beams beneath deck
    for (let sx = -1; sx <= 1; sx += 2) {
      const stringer = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.36, 2.34), timberMat);
      stringer.position.set(sx * 0.95, 1.66, 0);
      group.add(stringer);
      // Diagonal truss braces underneath
      const braceA = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.4), timberMat);
      braceA.position.set(sx * 0.95, 1.25, -0.48);
      braceA.rotation.x = 0.62;
      const braceB = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 1.4), timberMat);
      braceB.position.set(sx * 0.95, 1.25, 0.48);
      braceB.rotation.x = -0.62;
      const bolt = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.24, 0.24), ironMat);
      bolt.position.set(sx * 0.95, 1.66, 0);
      group.add(braceA, braceB, bolt);
    }
  } else {
    // timber_pillar
    const footStone = mkMat(0x57534e, 0.88);
    const postWood = mkMat(0x6b3e1b, 0.84);
    const braceWood = mkMat(0x8b5324, 0.74);

    const footing = new THREE.Mesh(new THREE.BoxGeometry(0.98, 0.28, 0.98), footStone);
    footing.position.y = 0.14;
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.3, 1.56, 8), postWood);
    post.position.y = 1.06;
    const topPlate = new THREE.Mesh(new THREE.BoxGeometry(1.18, 0.22, 1.18), braceWood);
    topPlate.position.y = 1.89;
    const kneeL = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.68, 0.14), braceWood);
    kneeL.position.set(-0.32, 1.55, 0);
    kneeL.rotation.z = -0.65;
    const kneeR = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.68, 0.14), braceWood);
    kneeR.position.set(0.32, 1.55, 0);
    kneeR.rotation.z = 0.65;
    group.add(footing, post, topPlate, kneeL, kneeR);
  }

  group.traverse((child) => {
    if (child instanceof THREE.Mesh) {
      child.castShadow = !isPreview;
      child.receiveShadow = !isPreview;
    }
  });
  group.userData.stressMaterials = stressMaterials;
  return group;
}

export function createPowderKegMesh(): THREE.Group {
  const g = new THREE.Group();
  const woodMat = new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.84 });
  const hoopMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.38, metalness: 0.72 });
  const dangerMat = new THREE.MeshStandardMaterial({
    color: 0xdc2626,
    emissive: 0x7f1d1d,
    emissiveIntensity: 0.35,
    roughness: 0.55,
  });
  const body = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.62, 12), woodMat);
  body.position.y = 0.31;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.275, 0.275, 0.16, 12), dangerMat);
  band.position.y = 0.31;
  const hoopTop = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.025, 6, 14), hoopMat);
  hoopTop.rotation.x = Math.PI / 2;
  hoopTop.position.y = 0.54;
  const hoopBot = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.025, 6, 14), hoopMat);
  hoopBot.rotation.x = Math.PI / 2;
  hoopBot.position.y = 0.1;
  const fuse = new THREE.Mesh(
    new THREE.CylinderGeometry(0.025, 0.025, 0.18, 6),
    new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xf97316, emissiveIntensity: 0.9 }),
  );
  fuse.position.set(0.05, 0.68, 0);
  fuse.rotation.z = -0.35;
  g.add(body, band, hoopTop, hoopBot, fuse);
  return g;
}

export function createWaterTorrentMesh(): THREE.Group {
  const g = new THREE.Group();
  const oakMat = new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.82 });
  const aquaMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0284c7,
    emissiveIntensity: 0.4,
    roughness: 0.22,
  });
  const cask = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.24, 0.58, 12), oakMat);
  cask.position.y = 0.29;
  const band = new THREE.Mesh(new THREE.CylinderGeometry(0.272, 0.272, 0.16, 12), aquaMat);
  band.position.y = 0.29;
  const spout = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.24, 8), aquaMat);
  spout.rotation.x = Math.PI / 2;
  spout.position.set(0, 0.22, 0.28);
  g.add(cask, band, spout);
  return g;
}

function makeArmorMaterial(tier: ArmorMaterialTier): THREE.MeshStandardMaterial {
  if (tier === 'stone') {
    return new THREE.MeshStandardMaterial({
      color: 0x57534e,
      roughness: 0.85,
      metalness: 0.22,
    });
  }
  if (tier === 'bone') {
    return new THREE.MeshStandardMaterial({
      color: 0xe7e5e4,
      roughness: 0.58,
      metalness: 0.08,
    });
  }
  return new THREE.MeshStandardMaterial({
    color: 0x78350f,
    roughness: 0.9,
  });
}

export function attachCreatureArmorPlates(
  rig: CreatureRig,
  species: CreatureSpecies,
  zoneArmor: CreatureZoneArmor,
): void {
  const headGroup = new THREE.Group();
  const chestGroup = new THREE.Group();
  const limbGroup = new THREE.Group();

  const isLargeDino =
    species === 'trex' ||
    species === 'triceratops' ||
    species === 'stegosaurus' ||
    species === 'brachiosaurus' ||
    species === 'spinosaurus' ||
    species === 'ankylosaurus' ||
    species === 'allosaurus' ||
    species === 'diplodocus' ||
    species === 'elephant' ||
    species === 'rhinoceros' ||
    species === 'hippopotamus';

  // Head Helm Armor
  if (zoneArmor.head.tier !== 'none' && zoneArmor.head.maxHp > 0) {
    const mat = makeArmorMaterial(zoneArmor.head.tier);
    const crownW = isLargeDino ? 0.72 : 0.34;
    const crownH = isLargeDino ? 0.22 : 0.12;
    const crownL = isLargeDino ? 0.96 : 0.44;
    const helmCrown = new THREE.Mesh(new THREE.BoxGeometry(crownW, crownH, crownL), mat);
    helmCrown.position.set(0, isLargeDino ? 0.38 : 0.18, isLargeDino ? 0.15 : 0.06);
    helmCrown.castShadow = true;
    headGroup.add(helmCrown);

    // Ridge horn / brow crest
    const brow = new THREE.Mesh(
      new THREE.DodecahedronGeometry(isLargeDino ? 0.26 : 0.12, 0),
      mat,
    );
    brow.scale.set(1.2, 0.7, 1.4);
    brow.position.set(0, isLargeDino ? 0.48 : 0.24, isLargeDino ? 0.42 : 0.18);
    headGroup.add(brow);
  }
  rig.head.add(headGroup);

  // Chest / Dorsal Armor Plate
  if (zoneArmor.chest.tier !== 'none' && zoneArmor.chest.maxHp > 0) {
    const mat = makeArmorMaterial(zoneArmor.chest.tier);
    const scaleW = isLargeDino ? 1.45 : 0.72;
    const scaleH = isLargeDino ? 0.38 : 0.22;
    const scaleL = isLargeDino ? 1.85 : 0.88;
    const dorsalPlate = new THREE.Mesh(new THREE.BoxGeometry(scaleW, scaleH, scaleL), mat);
    dorsalPlate.position.set(0, isLargeDino ? 0.62 : 0.3, 0);
    dorsalPlate.castShadow = true;
    chestGroup.add(dorsalPlate);

    for (let s = -1; s <= 1; s += 2) {
      const flank = new THREE.Mesh(
        new THREE.BoxGeometry(isLargeDino ? 0.24 : 0.12, isLargeDino ? 0.68 : 0.34, isLargeDino ? 1.35 : 0.65),
        mat,
      );
      flank.position.set(s * (scaleW * 0.48), isLargeDino ? 0.16 : 0.08, 0.08);
      flank.rotation.z = s * -0.22;
      flank.castShadow = true;
      chestGroup.add(flank);
    }
  }
  rig.body.add(chestGroup);

  // Limb Greaves mounted on legs
  if (zoneArmor.limb.tier !== 'none' && zoneArmor.limb.maxHp > 0 && rig.legs.length > 0) {
    const mat = makeArmorMaterial(zoneArmor.limb.tier);
    const r = isLargeDino ? 0.28 : 0.14;
    const h = isLargeDino ? 0.56 : 0.28;
    for (let i = 0; i < Math.min(2, rig.legs.length); i++) {
      const greave = new THREE.Mesh(
        new THREE.CylinderGeometry(r, r * 0.88, h, 7),
        mat,
      );
      greave.position.set(0, isLargeDino ? -0.45 : -0.2, 0.06);
      rig.legs[i].add(greave);
      limbGroup.userData[`leg_${i}`] = greave;
    }
  }

  rig.armorGroups = {
    head: headGroup,
    chest: chestGroup,
    limb: limbGroup,
  };
}

export function createCaveCeilingClusterMesh(): THREE.Group {
  const g = new THREE.Group();
  const rockMat = new THREE.MeshStandardMaterial({
    color: 0x332e2b,
    roughness: 0.94,
    metalness: 0.12,
  });
  const fissureMat = new THREE.MeshStandardMaterial({
    color: 0xf97316,
    emissive: 0xea580c,
    emissiveIntensity: 0.85,
    roughness: 0.35,
  });

  const cap = new THREE.Mesh(new THREE.DodecahedronGeometry(1.15, 0), rockMat);
  cap.scale.set(1.25, 0.62, 1.25);
  cap.position.y = 0.2;
  cap.castShadow = true;
  g.add(cap);

  const offsets = [
    [0, -0.65, 0, 0.42, 1.55],
    [-0.55, -0.52, 0.38, 0.32, 1.2],
    [0.58, -0.48, -0.32, 0.34, 1.28],
    [-0.28, -0.45, -0.52, 0.26, 1.05],
    [0.34, -0.5, 0.54, 0.28, 1.12],
  ];
  offsets.forEach(([ox, oy, oz, rad, h]) => {
    const spike = new THREE.Mesh(new THREE.ConeGeometry(rad, h, 6), rockMat);
    spike.rotation.x = Math.PI;
    spike.position.set(ox, oy, oz);
    spike.castShadow = true;
    g.add(spike);
  });

  // Glowing stress fracture ring signaling destructible cave ceiling!
  const seam = new THREE.Mesh(
    new THREE.TorusGeometry(0.95, 0.075, 6, 14),
    fissureMat,
  );
  seam.rotation.x = Math.PI / 2;
  seam.position.y = 0.35;
  g.add(seam);

  g.userData.fissureMat = fissureMat;
  return g;
}

export function createCave(
  s: THREE.Object3D,
  options?: {
    position?: THREE.Vector3;
    radius?: number;
    leaveEntranceGap?: boolean;
    seed?: number;
  },
): THREE.Group {
  const g = new THREE.Group();
  const radius = options?.radius ?? 10;
  const leaveEntranceGap = options?.leaveEntranceGap ?? false;
  let state = (options?.seed ?? 9173) >>> 0;
  const nextRand = (): number => {
    if (options?.seed === undefined) return Math.random();
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };

  const rockGeo = new THREE.DodecahedronGeometry(3, 1);
  const rock = new THREE.MeshStandardMaterial({
    color: 0x343c32,
    roughness: 0.9,
  });

  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    // Leave south (+Z) entrance gap open when placed as a walk-in overworld grotto
    if (leaveEntranceGap && Math.sin(a) > 0.82) continue;
    const m = new THREE.Mesh(rockGeo, rock);
    m.position.set(Math.cos(a) * radius, 2, Math.sin(a) * radius);
    m.castShadow = true;
    m.receiveShadow = true;
    g.add(m);
  }

  const crystalGeo = new THREE.OctahedronGeometry(0.8);
  const crystal = new THREE.MeshStandardMaterial({
    color: 0x32e6d0,
    emissive: 0x087d72,
    emissiveIntensity: 2,
    roughness: 0.22,
  });

  for (let i = 0; i < 12; i++) {
    const m = new THREE.Mesh(crystalGeo, crystal);
    let cx = nextRand() * 12 - 6;
    let cz = nextRand() * 12 - 6;
    if (leaveEntranceGap && Math.hypot(cx, cz) < 3.5) {
      const ang = (i / 12) * Math.PI * 2;
      cx = Math.cos(ang) * 5.2;
      cz = Math.sin(ang) * 5.2;
    }
    m.position.set(cx, 0, cz);
    m.scale.y = 2;
    g.add(m);
  }

  if (options?.position) {
    g.position.copy(options.position);
  }

  s.add(g);
  return g;
}

export interface RemotePlayerMeshHandle {
  group: THREE.Group;
  bodyGroup: THREE.Group;
  headGroup: THREE.Group;
  armL: THREE.Group;
  armR: THREE.Group;
  legL: THREE.Group;
  legR: THREE.Group;
  heldGunMesh: THREE.Mesh;
  heldToolMesh: THREE.Mesh;
  backpackMesh: THREE.Mesh;
  backpackGroup: THREE.Group;
  backpackDispose: () => void;
  speakerSprite?: THREE.Sprite;
}

const DEFAULT_EXPLORER_BACKPACK_SKIN: SkinCatalogItem = {
  id: 'default_explorer_pack',
  name: 'Explorer Pack',
  category: 'backpack',
  priceLabel: 'Free',
  payhipUrl: '',
  primaryHex: '#78350f',
  secondaryHex: '#451a03',
  accentHex: '#d97706',
  pattern: 'solid',
};

export function applyBackpackSkinToPlayerHandle(
  handle: RemotePlayerMeshHandle,
  skin: ExchangeProduct | null,
): void {
  const catalogItem =
    skin && skin.category === 'backpack_skin'
      ? toBackpackSkinCatalogItem(skin)
      : DEFAULT_EXPLORER_BACKPACK_SKIN;
  const nextBuilt = buildSculptedBackpackMesh(catalogItem);

  if (skin && skin.category === 'backpack_skin') {
    const imgTex = getCosmeticImageTexture(skin.productImageUrl);
    nextBuilt.group.traverse((child) => {
      if (
        child instanceof THREE.Mesh &&
        child.material instanceof THREE.MeshStandardMaterial &&
        child.material.map
      ) {
        if (imgTex) {
          applySafeStandardMaps(child.material, { map: imgTex });
          child.material.color.set('#ffffff');
        }
        child.material.metalness = skin.visual.metalness;
        child.material.roughness = skin.visual.roughness;
        if (skin.visual.emissiveHex) {
          child.material.emissive.set(skin.visual.emissiveHex);
          child.material.emissiveIntensity = 0.25;
        }
        child.material.needsUpdate = true;
      }
    });
  }

  handle.backpackGroup.clear();
  handle.backpackDispose();
  handle.backpackDispose = nextBuilt.dispose;
  handle.backpackGroup.add(nextBuilt.group);

  const mainMesh = nextBuilt.group.getObjectByName('sculpted_backpack_main');
  if (mainMesh instanceof THREE.Mesh) {
    handle.backpackMesh = mainMesh;
  }
}

export function createRemotePlayerMesh(
  name: string,
  accentHex = 0x38bdf8,
  showNameplate = true,
): RemotePlayerMeshHandle {
  const group = new THREE.Group();
  const bodyGroup = new THREE.Group();
  group.add(bodyGroup);

  const jacketMat = new THREE.MeshStandardMaterial({ color: accentHex, roughness: 0.72 });
  const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.86 });
  const bootMat = new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.9 });
  const skinMat = new THREE.MeshStandardMaterial({ color: 0xd99b6c, roughness: 0.7 });
  const visorMat = new THREE.MeshStandardMaterial({
    color: 0x0f172a,
    metalness: 0.8,
    roughness: 0.2,
  });

  // Articulated Legs
  const makeLeg = (lx: number) => {
    const legPivot = new THREE.Group();
    legPivot.position.set(lx, 0.78, 0);
    const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.105, 0.09, 0.62, 8), pantsMat);
    thigh.position.y = -0.34;
    thigh.castShadow = true;
    const boot = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.2, 0.24), bootMat);
    boot.position.set(0, -0.68, 0.03);
    boot.castShadow = true;
    legPivot.add(thigh, boot);
    bodyGroup.add(legPivot);
    return legPivot;
  };
  const legL = makeLeg(-0.14);
  const legR = makeLeg(0.14);

  // Torso + Sculpted 3D Survival Backpack (straps face +Z toward torso back)
  const torso = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.68, 0.28), jacketMat);
  torso.position.y = 1.14;
  torso.castShadow = true;
  const backpackGroup = new THREE.Group();
  backpackGroup.position.set(0, 1.16, -0.25);
  const builtPack = buildSculptedBackpackMesh(DEFAULT_EXPLORER_BACKPACK_SKIN);
  backpackGroup.add(builtPack.group);
  const backpack =
    (builtPack.group.getObjectByName('sculpted_backpack_main') as THREE.Mesh) ||
    (builtPack.group.children[0] as THREE.Mesh);
  bodyGroup.add(torso, backpackGroup);

  // Articulated Arms + Held Item Proxies
  const makeArm = (ax: number) => {
    const armPivot = new THREE.Group();
    armPivot.position.set(ax, 1.4, 0);
    const sleeve = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.07, 0.52, 8), jacketMat);
    sleeve.position.y = -0.24;
    sleeve.castShadow = true;
    const hand = new THREE.Mesh(new THREE.SphereGeometry(0.075, 8, 6), skinMat);
    hand.position.y = -0.52;
    armPivot.add(sleeve, hand);
    bodyGroup.add(armPivot);
    return armPivot;
  };
  const armL = makeArm(-0.33);
  const armR = makeArm(0.33);

  const heldGunMesh = new THREE.Mesh(
    new THREE.BoxGeometry(0.08, 0.12, 0.52),
    new THREE.MeshStandardMaterial({ color: 0x1e293b, metalness: 0.78, roughness: 0.3 }),
  );
  heldGunMesh.position.set(0, -0.5, 0.24);
  heldGunMesh.visible = false;
  armR.add(heldGunMesh);

  const heldToolMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.03, 0.03, 0.65, 6),
    new THREE.MeshStandardMaterial({ color: 0x92400e, roughness: 0.85 }),
  );
  heldToolMesh.rotation.x = Math.PI / 2.2;
  heldToolMesh.position.set(0, -0.52, 0.22);
  heldToolMesh.visible = false;
  armR.add(heldToolMesh);

  // Head + Shades Visor
  const headGroup = new THREE.Group();
  headGroup.position.set(0, 1.68, 0);
  const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.19, 12, 10), skinMat);
  cranium.castShadow = true;
  const hair = new THREE.Mesh(
    new THREE.SphereGeometry(0.195, 10, 8, 0, Math.PI * 2, 0, Math.PI * 0.55),
    bootMat,
  );
  hair.position.y = 0.02;
  const visor = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.075, 0.08), visorMat);
  visor.position.set(0, 0.02, 0.16);
  headGroup.add(cranium, hair, visor);
  bodyGroup.add(headGroup);

  let speakerSprite: THREE.Sprite | undefined;

  // Floating Nameplate & Active Speaker Sprites
  if (showNameplate && typeof document !== 'undefined') {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'rgba(12, 10, 9, 0.78)';
      ctx.beginPath();
      ctx.roundRect(12, 10, 232, 44, 12);
      ctx.fill();
      ctx.strokeStyle = 'rgba(245, 158, 11, 0.75)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = '#fef3c7';
      ctx.font = 'bold 24px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(name.slice(0, 18), 128, 33);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    const sprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    sprite.position.set(0, 2.25, 0);
    sprite.scale.set(1.5, 0.38, 1);
    group.add(sprite);

    // Xbox-style Glowing Green Audio Wave Active Speaker Badge above nameplate
    const spCanvas = document.createElement('canvas');
    spCanvas.width = 160;
    spCanvas.height = 72;
    const spCtx = spCanvas.getContext('2d');
    if (spCtx) {
      spCtx.shadowColor = '#10b981';
      spCtx.shadowBlur = 12;
      spCtx.fillStyle = 'rgba(6, 78, 59, 0.92)';
      spCtx.beginPath();
      spCtx.roundRect(14, 10, 132, 52, 26);
      spCtx.fill();
      spCtx.shadowBlur = 0;
      spCtx.strokeStyle = '#34d399';
      spCtx.lineWidth = 3;
      spCtx.stroke();

      // Glowing green speaker cone + soundwave bars
      spCtx.fillStyle = '#34d399';
      spCtx.beginPath();
      spCtx.moveTo(40, 28);
      spCtx.lineTo(50, 28);
      spCtx.lineTo(62, 18);
      spCtx.lineTo(62, 54);
      spCtx.lineTo(50, 44);
      spCtx.lineTo(40, 44);
      spCtx.closePath();
      spCtx.fill();

      // Audio wave bars
      const bars = [
        { x: 74, h: 16 },
        { x: 86, h: 28 },
        { x: 98, h: 20 },
        { x: 110, h: 32 },
        { x: 122, h: 14 },
      ];
      spCtx.fillStyle = '#6ee7b7';
      for (const bar of bars) {
        spCtx.beginPath();
        spCtx.roundRect(bar.x, 36 - bar.h / 2, 6, bar.h, 3);
        spCtx.fill();
      }
    }
    const spTex = new THREE.CanvasTexture(spCanvas);
    spTex.colorSpace = THREE.SRGBColorSpace;
    speakerSprite = new THREE.Sprite(
      new THREE.SpriteMaterial({ map: spTex, transparent: true, depthWrite: false }),
    );
    speakerSprite.position.set(0, 2.7, 0);
    speakerSprite.scale.set(0.76, 0.34, 1);
    speakerSprite.visible = false;
    group.add(speakerSprite);
  }

  return {
    group,
    bodyGroup,
    headGroup,
    armL,
    armR,
    legL,
    legR,
    heldGunMesh,
    heldToolMesh,
    backpackMesh: backpack,
    backpackGroup,
    backpackDispose: builtPack.dispose,
    speakerSprite,
  };
}
