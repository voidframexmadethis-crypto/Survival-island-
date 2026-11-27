import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import type { WildlifeArchetype } from './globalWildlifeRoster';

export const GLOBAL_WILDLIFE_ARCHETYPES: readonly WildlifeArchetype[] = [
  'quadruped',
  'ungulate',
  'primate',
  'bird',
  'raptor',
  'waterbird',
  'penguin',
  'serpent',
  'lizard',
  'crocodile',
  'turtle',
  'fish',
  'shark',
  'cetacean',
  'seal',
  'insect',
  'crab',
  'amphibian',
  'cephalopod',
  'benthic',
];

export type WildlifeLod = 'near' | 'far';

const geometryCache = new Map<string, THREE.BufferGeometry>();

type V3 = readonly [number, number, number];

function box(
  w: number,
  h: number,
  d: number,
  pos: V3,
  rot: V3 = [0, 0, 0],
): THREE.BufferGeometry {
  const g = new THREE.BoxGeometry(w, h, d);
  g.rotateX(rot[0]);
  g.rotateY(rot[1]);
  g.rotateZ(rot[2]);
  g.translate(pos[0], pos[1], pos[2]);
  return g;
}

function sphere(
  r: number,
  pos: V3,
  scale: V3 = [1, 1, 1],
  segments = 8,
): THREE.BufferGeometry {
  const g = new THREE.SphereGeometry(r, segments, Math.max(4, segments - 2));
  g.scale(scale[0], scale[1], scale[2]);
  g.translate(pos[0], pos[1], pos[2]);
  return g;
}

function cylinder(
  rTop: number,
  rBottom: number,
  h: number,
  pos: V3,
  rot: V3 = [0, 0, 0],
  segments = 6,
): THREE.BufferGeometry {
  const g = new THREE.CylinderGeometry(rTop, rBottom, h, segments);
  g.rotateX(rot[0]);
  g.rotateY(rot[1]);
  g.rotateZ(rot[2]);
  g.translate(pos[0], pos[1], pos[2]);
  return g;
}

function cone(
  r: number,
  h: number,
  pos: V3,
  rot: V3 = [0, 0, 0],
  segments = 6,
): THREE.BufferGeometry {
  const g = new THREE.ConeGeometry(r, h, segments);
  g.rotateX(rot[0]);
  g.rotateY(rot[1]);
  g.rotateZ(rot[2]);
  g.translate(pos[0], pos[1], pos[2]);
  return g;
}

function capsule(
  r: number,
  length: number,
  pos: V3,
  rot: V3 = [0, 0, 0],
  segments = 6,
): THREE.BufferGeometry {
  const g = new THREE.CapsuleGeometry(r, length, 3, segments);
  g.rotateX(rot[0]);
  g.rotateY(rot[1]);
  g.rotateZ(rot[2]);
  g.translate(pos[0], pos[1], pos[2]);
  return g;
}

function torus(
  r: number,
  tube: number,
  pos: V3,
  rot: V3 = [0, 0, 0],
): THREE.BufferGeometry {
  const g = new THREE.TorusGeometry(r, tube, 4, 8);
  g.rotateX(rot[0]);
  g.rotateY(rot[1]);
  g.rotateZ(rot[2]);
  g.translate(pos[0], pos[1], pos[2]);
  return g;
}

function merge(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const merged = mergeGeometries(parts, false);
  for (const part of parts) part.dispose();
  if (!merged) {
    return new THREE.BoxGeometry(0.6, 0.6, 1);
  }
  merged.computeVertexNormals();
  merged.computeBoundingSphere();
  return merged;
}

function quadruped(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    box(0.62, 0.48, 1.1, [0, 0.7, 0]),
    sphere(0.32, [0, 0.92, 0.62], [1, 0.92, 1.1], far ? 6 : 8),
    box(0.24, 0.2, 0.32, [0, 0.88, 0.89]),
    cone(0.07, 0.2, [-0.18, 1.14, 0.56], [0, 0, -0.2]),
    cone(0.07, 0.2, [0.18, 1.14, 0.56], [0, 0, 0.2]),
    cone(0.16, 0.7, [0, 0.72, -0.72], [Math.PI / 2.4, 0, 0]),
  ];
  if (!far) {
    for (const x of [-0.22, 0.22]) {
      for (const z of [-0.34, 0.34]) {
        p.push(cylinder(0.085, 0.11, 0.62, [x, 0.3, z], [0, 0, 0], 5));
      }
    }
  }
  return merge(p);
}

function ungulate(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    box(0.68, 0.56, 1.3, [0, 1.02, 0]),
    cylinder(0.17, 0.24, 0.65, [0, 1.4, 0.56], [0.35, 0, 0], far ? 5 : 7),
    sphere(0.25, [0, 1.72, 0.78], [0.85, 0.9, 1.1], 7),
    box(0.2, 0.16, 0.28, [0, 1.62, 1.0]),
    cone(0.12, 0.52, [0, 1.18, -0.72], [Math.PI / 2.5, 0, 0]),
  ];
  if (!far) {
    for (const x of [-0.26, 0.26]) {
      for (const z of [-0.4, 0.4]) {
        p.push(cylinder(0.07, 0.095, 0.86, [x, 0.48, z], [0, 0, 0], 5));
      }
    }
    p.push(
      cone(0.06, 0.5, [-0.13, 2.05, 0.68], [0.2, 0, -0.4]),
      cone(0.06, 0.5, [0.13, 2.05, 0.68], [0.2, 0, 0.4]),
    );
  }
  return merge(p);
}

function primate(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    capsule(0.27, 0.55, [0, 1.05, 0], [0, 0, 0], far ? 5 : 7),
    sphere(0.25, [0, 1.58, 0.04], [1, 1, 1], far ? 6 : 8),
    sphere(0.08, [0, 1.56, 0.26], [1, 0.8, 0.6], 5),
  ];
  if (!far) {
    p.push(
      cylinder(0.07, 0.08, 0.58, [-0.3, 1.0, 0], [0, 0, -0.25], 5),
      cylinder(0.07, 0.08, 0.58, [0.3, 1.0, 0], [0, 0, 0.25], 5),
      cylinder(0.09, 0.1, 0.6, [-0.15, 0.34, 0], [0, 0, 0], 5),
      cylinder(0.09, 0.1, 0.6, [0.15, 0.34, 0], [0, 0, 0], 5),
    );
  }
  return merge(p);
}

function birdBase(far: boolean, raptor: boolean): THREE.BufferGeometry {
  const bodyR = raptor ? 0.34 : 0.25;
  const p: THREE.BufferGeometry[] = [
    sphere(bodyR, [0, 0.52, 0], [1, 0.9, 1.35], far ? 6 : 8),
    sphere(raptor ? 0.2 : 0.15, [0, 0.72, 0.3], [1, 1, 1], far ? 5 : 7),
    cone(0.07, 0.24, [0, 0.7, 0.5], [Math.PI / 2, 0, 0], 5),
    cone(0.18, 0.5, [0, 0.5, -0.42], [Math.PI / 2.8, 0, 0], 5),
  ];
  if (!far) {
    const wing = raptor ? 0.95 : 0.55;
    p.push(
      box(wing, 0.045, 0.34, [-wing * 0.52, 0.68, -0.02], [0, 0, 0.12]),
      box(wing, 0.045, 0.34, [wing * 0.52, 0.68, -0.02], [0, 0, -0.12]),
      cylinder(0.025, 0.03, 0.28, [-0.09, 0.18, 0], [0, 0, 0], 4),
      cylinder(0.025, 0.03, 0.28, [0.09, 0.18, 0], [0, 0, 0], 4),
    );
  }
  return merge(p);
}

function waterbird(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    sphere(0.28, [0, 0.56, 0], [1, 0.8, 1.35], far ? 6 : 8),
    cylinder(0.07, 0.1, 0.85, [0, 1.02, 0.24], [0.15, 0, 0], far ? 5 : 7),
    sphere(0.15, [0, 1.47, 0.34], [0.9, 1, 1.1], 6),
    cone(0.07, 0.3, [0, 1.42, 0.54], [Math.PI / 2, 0, 0], 5),
    cone(0.2, 0.55, [0, 0.5, -0.48], [Math.PI / 2.6, 0, 0], 5),
  ];
  if (!far) {
    p.push(
      box(0.62, 0.04, 0.38, [-0.32, 0.58, -0.04], [0, 0, 0.12]),
      box(0.62, 0.04, 0.38, [0.32, 0.58, -0.04], [0, 0, -0.12]),
      cylinder(0.03, 0.035, 0.45, [-0.1, 0.24, 0], [0, 0, 0], 4),
      cylinder(0.03, 0.035, 0.45, [0.1, 0.24, 0], [0, 0, 0], 4),
    );
  }
  return merge(p);
}

function penguin(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    capsule(0.28, 0.45, [0, 0.62, 0], [0, 0, 0], far ? 5 : 7),
    sphere(0.2, [0, 1.08, 0.02], [1, 1, 1], far ? 5 : 7),
    cone(0.07, 0.24, [0, 1.06, 0.22], [Math.PI / 2, 0, 0], 5),
  ];
  if (!far) {
    p.push(
      box(0.08, 0.36, 0.18, [-0.28, 0.68, 0], [0, 0, 0.16]),
      box(0.08, 0.36, 0.18, [0.28, 0.68, 0], [0, 0, -0.16]),
      box(0.12, 0.05, 0.24, [-0.12, 0.04, 0.05]),
      box(0.12, 0.05, 0.24, [0.12, 0.04, 0.05]),
    );
  }
  return merge(p);
}

function serpent(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    sphere(0.2, [0, 0.26, 0.66], [0.9, 0.7, 1.2], 6),
    box(0.16, 0.08, 0.22, [0, 0.22, 0.88]),
  ];
  const segments = far ? 3 : 6;
  for (let i = 0; i < segments; i++) {
    const z = 0.35 - i * 0.24;
    const x = Math.sin(i * 0.9) * 0.09;
    p.push(sphere(0.17 - i * 0.012, [x, 0.2, z], [1, 0.65, 1.2], far ? 5 : 6));
  }
  return merge(p);
}

function lizard(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    box(0.36, 0.18, 0.78, [0, 0.32, 0]),
    box(0.24, 0.16, 0.3, [0, 0.34, 0.5]),
    cone(0.16, 0.9, [0, 0.28, -0.72], [Math.PI / 2.5, 0, 0], 5),
  ];
  if (!far) {
    for (const x of [-0.28, 0.28]) {
      for (const z of [-0.24, 0.28]) {
        p.push(cylinder(0.035, 0.05, 0.28, [x, 0.18, z], [0, 0, x < 0 ? 0.45 : -0.45], 4));
      }
    }
    p.push(sphere(0.05, [-0.1, 0.44, 0.58], [1, 1, 1], 4), sphere(0.05, [0.1, 0.44, 0.58], [1, 1, 1], 4));
  }
  return merge(p);
}

function crocodile(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    box(0.45, 0.3, 1.7, [0, 0.3, 0]),
    box(0.34, 0.24, 0.72, [0, 0.32, 1.05]),
    cone(0.25, 1.5, [0, 0.28, -1.32], [Math.PI / 2.2, 0, 0], 5),
  ];
  if (!far) {
    for (const x of [-0.3, 0.3]) {
      for (const z of [-0.65, 0.55]) {
        p.push(box(0.12, 0.12, 0.34, [x, 0.14, z], [0, x < 0 ? 0.5 : -0.5, 0]));
      }
    }
    for (let i = 0; i < 3; i++) {
      p.push(cone(0.04, 0.14, [0, 0.5, -0.36 + i * 0.32], [0, 0, 0], 4));
    }
  }
  return merge(p);
}

function turtle(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    sphere(0.42, [0, 0.32, 0], [1.05, 0.48, 1.25], far ? 6 : 8),
    sphere(0.15, [0, 0.34, 0.55], [1, 1, 1.1], 6),
    cone(0.12, 0.28, [0, 0.3, -0.6], [Math.PI / 2.4, 0, 0], 4),
  ];
  if (!far) {
    for (const x of [-0.42, 0.42]) {
      for (const z of [-0.22, 0.22]) {
        p.push(box(0.22, 0.1, 0.18, [x, 0.17, z], [0, 0, x < 0 ? 0.3 : -0.3]));
      }
    }
  }
  return merge(p);
}

function fishBody(far: boolean, shark: boolean): THREE.BufferGeometry {
  const length = shark ? 1.75 : 1.05;
  const radius = shark ? 0.27 : 0.22;
  const p: THREE.BufferGeometry[] = [
    capsule(radius, length, [0, 0.3, 0], [Math.PI / 2, 0, 0], far ? 5 : 7),
    cone(shark ? 0.2 : 0.15, 0.45, [0, 0.44, -length * 0.68], [Math.PI / 2, 0, 0], 5),
  ];
  if (!far) {
    p.push(
      cone(shark ? 0.3 : 0.18, shark ? 0.52 : 0.34, [0, 0.3 + radius + 0.18, -0.05], [0, 0, 0], 4),
      box(shark ? 0.04 : 0.03, shark ? 0.42 : 0.28, shark ? 0.38 : 0.24, [0, 0.3, -length * 0.8], [0, 0, 0]),
    );
  }
  return merge(p);
}

function cetacean(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    capsule(0.5, 1.7, [0, 0.5, 0], [Math.PI / 2, 0, 0], far ? 6 : 8),
    sphere(0.36, [0, 0.56, 1.0], [0.9, 0.9, 1.1], far ? 5 : 7),
    box(0.9, 0.05, 0.45, [0, 0.5, -1.05]),
    cone(0.26, 0.55, [0, 1.05, -0.15], [0, 0, 0], 4),
  ];
  return merge(p);
}

function seal(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    capsule(0.3, 1.0, [0, 0.3, 0], [Math.PI / 2, 0, 0], far ? 5 : 7),
    sphere(0.22, [0, 0.36, 0.62], [0.95, 0.95, 1.15], 6),
  ];
  if (!far) {
    p.push(
      box(0.4, 0.04, 0.24, [-0.25, 0.14, 0.36], [0, 0, 0.2]),
      box(0.4, 0.04, 0.24, [0.25, 0.14, 0.36], [0, 0, -0.2]),
      box(0.45, 0.04, 0.22, [0, 0.2, -0.7]),
    );
  }
  return merge(p);
}

function insect(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    sphere(0.16, [0, 0.16, 0], [0.85, 0.8, 1.55], 5),
    sphere(0.11, [0, 0.18, 0.24], [1, 1, 1], 5),
  ];
  if (!far) {
    p.push(
      box(0.08, 0.02, 0.22, [-0.15, 0.22, 0.02], [0, 0, 0.2]),
      box(0.08, 0.02, 0.22, [0.15, 0.22, 0.02], [0, 0, -0.2]),
    );
    for (const x of [-0.12, 0.12]) {
      for (const z of [-0.1, 0.06, 0.2]) {
        p.push(cylinder(0.012, 0.018, 0.2, [x, 0.08, z], [0, 0, x < 0 ? 0.4 : -0.4], 3));
      }
    }
  }
  return merge(p);
}

function crab(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    sphere(0.3, [0, 0.18, 0], [1.25, 0.5, 1], 6),
  ];
  if (!far) {
    p.push(
      sphere(0.14, [-0.48, 0.18, 0.22], [1.2, 0.65, 0.7], 5),
      sphere(0.14, [0.48, 0.18, 0.22], [1.2, 0.65, 0.7], 5),
    );
    for (let i = 0; i < 3; i++) {
      p.push(
        cylinder(0.025, 0.04, 0.3, [-0.42, 0.1, -0.1 - i * 0.12], [0, 0, 0.8], 3),
        cylinder(0.025, 0.04, 0.3, [0.42, 0.1, -0.1 - i * 0.12], [0, 0, -0.8], 3),
      );
    }
  }
  return merge(p);
}

function amphibian(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    sphere(0.26, [0, 0.2, 0], [1, 0.65, 1.25], far ? 5 : 7),
    sphere(0.16, [0, 0.25, 0.26], [1, 0.8, 1], 5),
    sphere(0.04, [-0.1, 0.36, 0.38], [1, 1, 1], 4),
    sphere(0.04, [0.1, 0.36, 0.38], [1, 1, 1], 4),
  ];
  if (!far) {
    for (const x of [-0.3, 0.3]) {
      p.push(box(0.16, 0.05, 0.28, [x, 0.08, 0.25], [0, 0, 0]));
    }
  }
  return merge(p);
}

function cephalopod(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    sphere(0.3, [0, 0.55, 0], [1, 1.35, 1], far ? 6 : 8),
    sphere(0.07, [-0.16, 0.58, 0.28], [1, 1, 1], 4),
    sphere(0.07, [0.16, 0.58, 0.28], [1, 1, 1], 4),
  ];
  const tentacles = far ? 3 : 6;
  for (let i = 0; i < tentacles; i++) {
    const angle = (i / tentacles) * Math.PI * 2;
    p.push(
      cylinder(
        0.025,
        0.05,
        0.6,
        [Math.cos(angle) * 0.2, 0.18, Math.sin(angle) * 0.2],
        [Math.sin(angle) * 0.7, 0, -Math.cos(angle) * 0.7],
        4,
      ),
    );
  }
  return merge(p);
}

function benthic(far: boolean): THREE.BufferGeometry {
  const p: THREE.BufferGeometry[] = [
    sphere(0.3, [0, 0.2, 0], [1, 0.55, 1], 6),
  ];
  const arms = far ? 3 : 5;
  for (let i = 0; i < arms; i++) {
    const angle = (i / arms) * Math.PI * 2;
    p.push(
      box(
        0.12,
        0.06,
        0.48,
        [Math.cos(angle) * 0.26, 0.16, Math.sin(angle) * 0.26],
        [0, angle, 0],
      ),
    );
  }
  return merge(p);
}

function buildGeometry(archetype: WildlifeArchetype, far: boolean): THREE.BufferGeometry {
  switch (archetype) {
    case 'quadruped':
      return quadruped(far);
    case 'ungulate':
      return ungulate(far);
    case 'primate':
      return primate(far);
    case 'bird':
      return birdBase(far, false);
    case 'raptor':
      return birdBase(far, true);
    case 'waterbird':
      return waterbird(far);
    case 'penguin':
      return penguin(far);
    case 'serpent':
      return serpent(far);
    case 'lizard':
      return lizard(far);
    case 'crocodile':
      return crocodile(far);
    case 'turtle':
      return turtle(far);
    case 'fish':
      return fishBody(far, false);
    case 'shark':
      return fishBody(far, true);
    case 'cetacean':
      return cetacean(far);
    case 'seal':
      return seal(far);
    case 'insect':
      return insect(far);
    case 'crab':
      return crab(far);
    case 'amphibian':
      return amphibian(far);
    case 'cephalopod':
      return cephalopod(far);
    case 'benthic':
      return benthic(far);
  }
}

/** Shared low-poly geometry for every instance of an archetype. */
export function getGlobalWildlifeGeometry(
  archetype: WildlifeArchetype,
  lod: WildlifeLod,
): THREE.BufferGeometry {
  const key = `${archetype}:${lod}`;
  let geometry = geometryCache.get(key);
  if (!geometry) {
    geometry = buildGeometry(archetype, lod === 'far');
    geometryCache.set(key, geometry);
  }
  return geometry;
}

export function getGlobalWildlifeMaterial(): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: 0xffffff,
    roughness: 0.82,
    metalness: 0.02,
    vertexColors: false,
  });
}
