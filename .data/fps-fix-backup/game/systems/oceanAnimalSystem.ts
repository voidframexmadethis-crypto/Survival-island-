import * as THREE from 'three';

export interface OceanAnimal {
  mesh: THREE.Object3D;
  direction: THREE.Vector3;
  speed: number;
  turnSpeed: number;
  habitatDepth: number;
  phase: number;
}

export function createOceanAnimal(
  mesh: THREE.Object3D,
  speed = 0.45,
  habitatDepth = 8,
): OceanAnimal {
  return {
    mesh,
    direction: new THREE.Vector3(1, 0, 0),
    speed,
    turnSpeed: 0.35,
    habitatDepth,
    phase: Math.random() * Math.PI * 2,
  };
}

export function updateOceanAnimal(
  animal: OceanAnimal,
  deltaTime: number,
  center: THREE.Vector3,
) {
  const dt = Math.min(deltaTime, 0.05);

  animal.phase += dt * 0.35;

  // Gentle, continuous wandering.
  const targetDirection = new THREE.Vector3(
    Math.cos(animal.phase),
    Math.sin(animal.phase * 0.4) * 0.08,
    Math.sin(animal.phase),
  ).normalize();

  animal.direction.lerp(targetDirection, animal.turnSpeed * dt).normalize();

  // Maintain a preferred swimming depth.
  const targetY = center.y - animal.habitatDepth;

  animal.mesh.position.addScaledVector(animal.direction, animal.speed * dt);

  animal.mesh.position.y += (targetY - animal.mesh.position.y) * 0.15 * dt;

  // Smoothly face the direction of travel.
  const lookTarget = animal.mesh.position.clone().add(animal.direction);

  animal.mesh.lookAt(lookTarget);
}
