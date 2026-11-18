export type AnimalState = 'idle' | 'wandering' | 'feeding' | 'fleeing';

export interface Animal {
  id: string;
  x: number;
  z: number;
  state: AnimalState;
  fleeUntil: number;
}

export interface Player {
  x: number;
  z: number;
  firing: boolean;
}

export interface Carcass {
  id: string;
  x: number;
  z: number;
  owner: 'player' | 'world';
  collected: boolean;
}

export const ANIMAL_FLEE_DISTANCE = 15;
export const GUNSHOT_FLEE_DISTANCE = 40;

export function updateAnimalReactions(
  animals: Animal[],
  player: Player,
  now: number,
): void {
  for (const animal of animals) {
    const dx = animal.x - player.x;
    const dz = animal.z - player.z;
    const distance = Math.hypot(dx, dz);

    const threatened =
      distance < ANIMAL_FLEE_DISTANCE ||
      (player.firing && distance < GUNSHOT_FLEE_DISTANCE);

    if (threatened) {
      animal.state = 'fleeing';
      animal.fleeUntil = now + 5000;
    } else if (animal.state === 'fleeing' && now >= animal.fleeUntil) {
      animal.state = 'wandering';
    }
  }
}

export function canAnimalEatCarcass(carcass: Carcass): boolean {
  if (carcass.collected) return false;
  if (carcass.owner === 'player') return false;

  return true;
}
