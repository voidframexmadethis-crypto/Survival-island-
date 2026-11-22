import * as THREE from 'three';
import {
  BOWLING_ALLEY_FLOOR_Y,
  BOWLING_ALLEY_POS,
} from '../world/terrain';

/**
 * Real-regulation ten-pin bowling inside a covered hilltop shelter.
 * Lane 18.29 m (60 ft), 1.0668 m wide (42 in), 2.18 kg pins and a 7 kg ball.
 */
export const BOWLING_LANE_LENGTH = 18.29;
export const BOWLING_LANE_HALF_WIDTH = 1.0668 / 2;
export const BOWLING_BALL_RADIUS = 0.108;
export const BOWLING_PIN_RADIUS = 0.0603;
export const BOWLING_PIN_HEIGHT = 0.381;
export const BOWLING_APPROACH_LOCAL_X = -3.2;
export const BOWLING_BALL_START_X = -0.5;
export const BOWLING_BALL_SPEED = 7.6;
export const BOWLING_STATION_WORLD = {
  x: BOWLING_ALLEY_POS.x - BOWLING_APPROACH_LOCAL_X,
  y: BOWLING_ALLEY_FLOOR_Y,
  z: BOWLING_ALLEY_POS.z,
} as const;

export interface BowlingPin {
  id: string;
  x: number;
  z: number;
  standing: boolean;
  fallAge: number;
  fallAngle: number;
  fallSpeed: number;
  vx: number;
  vz: number;
  tiltX: number;
  tiltZ: number;
  group: THREE.Group;
}

export interface BowlingEvent {
  type: 'pins';
  knocked: number;
  standing: number;
  strike: boolean;
  ballMph: number;
}

export interface BowlingInteraction {
  x: number;
  y: number;
  z: number;
  distance: number;
  label: string;
  sublabel: string;
}

function pinLayout(): { x: number; z: number }[] {
  const rowStep = 0.264;
  const sideStep = 0.3048;
  const result: { x: number; z: number }[] = [];
  for (let row = 0; row < 4; row++) {
    const startZ = -(row * sideStep) * 0.5;
    for (let i = 0; i <= row; i++) {
      result.push({
        x: BOWLING_LANE_LENGTH + row * rowStep,
        z: startZ + i * sideStep,
      });
    }
  }
  return result;
}

const PIN_LAYOUT = pinLayout();

function makePinGeometry(): THREE.LatheGeometry {
  const profile: [number, number][] = [
    [0.001, 0],
    [0.055, 0.012],
    [0.074, 0.055],
    [0.078, 0.105],
    [0.06, 0.17],
    [0.043, 0.225],
    [0.053, 0.27],
    [0.044, 0.31],
    [0.025, 0.35],
    [0.012, 0.381],
  ];
  return new THREE.LatheGeometry(
    profile.map(([radius, y]) => new THREE.Vector2(radius, y)),
    16,
  );
}

function makeScoreTexture(
  standing: number,
  rolls: number,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.fillStyle = '#071a1d';
  ctx.fillRect(0, 0, 512, 256);
  ctx.strokeStyle = '#2dd4bf';
  ctx.lineWidth = 7;
  ctx.strokeRect(7, 7, 498, 242);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#99f6e4';
  ctx.font = '800 34px sans-serif';
  ctx.fillText('BAYOU LANES', 256, 55);
  ctx.fillStyle = '#f8fafc';
  ctx.font = '800 72px monospace';
  ctx.fillText(String(10 - standing), 256, 142);
  ctx.fillStyle = '#5eead4';
  ctx.font = '700 25px sans-serif';
  ctx.fillText(`PINS STANDING ${standing}`, 256, 185);
  ctx.fillStyle = '#94a3b8';
  ctx.font = '600 20px sans-serif';
  ctx.fillText(`ROLL ${rolls + 1} · 18.29 M LANE`, 256, 220);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

export class HilltopBowlingAlley {
  public readonly group = new THREE.Group();
  public readonly station = BOWLING_STATION_WORLD;
  public readonly colliders: { x: number; z: number; radius: number }[] = [];

  private readonly ballGroup = new THREE.Group();
  private readonly pins: BowlingPin[] = [];
  private readonly events: BowlingEvent[] = [];
  private scoreTexture: THREE.CanvasTexture | null = null;
  private scoreMaterial: THREE.MeshBasicMaterial | null = null;
  private readonly laneTopY = 0.04;
  private readonly ballStartY = 0.04 + BOWLING_BALL_RADIUS;
  private rolling = false;
  private ballX = BOWLING_BALL_START_X;
  private ballZ = 0;
  private ballVX = 0;
  private ballVZ = 0;
  private resetTimer = 0;
  private rolls = 0;
  private pendingResult = false;
  private scoreStanding = 10;

  constructor() {
    const root = this.group;
    root.name = 'hilltop-bowling-alley';
    root.position.set(BOWLING_ALLEY_POS.x, BOWLING_ALLEY_FLOOR_Y, BOWLING_ALLEY_POS.z);
    // Local +X points west, down the lane toward the pins.
    root.rotation.y = Math.PI;

    const floorMat = new THREE.MeshStandardMaterial({ color: 0x4b3621, roughness: 0.88 });
    const laneMat = new THREE.MeshStandardMaterial({ color: 0xd6b071, roughness: 0.42, metalness: 0.04 });
    const laneSeamMat = new THREE.MeshStandardMaterial({ color: 0x8a5c2b, roughness: 0.65 });
    const gutterMat = new THREE.MeshStandardMaterial({ color: 0x27343a, roughness: 0.48, metalness: 0.4 });
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x173f3b, roughness: 0.82 });
    const trimMat = new THREE.MeshStandardMaterial({ color: 0x8b5a2b, roughness: 0.78 });
    const roofMat = new THREE.MeshStandardMaterial({ color: 0x3b2a22, roughness: 0.86 });
    const whiteMat = new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.38 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xcbd5e1, roughness: 0.2, metalness: 0.9 });
    const ballMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.16,
      metalness: 0.58,
    });
    const redMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.42 });
    const sofaMat = new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.86 });

    const addBox = (
      parent: THREE.Object3D,
      mat: THREE.Material,
      w: number,
      h: number,
      d: number,
      x: number,
      y: number,
      z: number,
    ): THREE.Mesh => {
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
      mesh.position.set(x, y, z);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      parent.add(mesh);
      return mesh;
    };

    // Raised timber floor and covered pavilion.
    addBox(root, floorMat, 31.0, 0.28, 9.2, 7.3, -0.14, 0);
    addBox(root, wallMat, 0.24, 4.7, 9.2, 22.7, 2.35, 0);
    addBox(root, wallMat, 0.24, 4.7, 9.2, -8.2, 2.35, 0);
    addBox(root, wallMat, 31.0, 0.2, 0.24, 7.3, 4.7, -4.5);
    addBox(root, wallMat, 31.0, 0.2, 0.24, 7.3, 4.7, 4.5);
    addBox(root, roofMat, 32.2, 0.32, 10.0, 7.3, 5.25, 0);
    addBox(root, roofMat, 32.4, 0.24, 4.8, 7.3, 5.62, -2.55);
    addBox(root, roofMat, 32.4, 0.24, 4.8, 7.3, 5.62, 2.55);
    for (const x of [-7.7, 0.2, 8.0, 15.8, 21.8]) {
      for (const z of [-4.25, 4.25]) {
        addBox(root, trimMat, 0.24, 4.9, 0.24, x, 2.42, z);
      }
    }

    // Regulation lane, approach, gutters and pin deck.
    addBox(root, laneMat, 7.4, 0.08, 1.0668, -2.0, 0.0, 0);
    addBox(root, laneMat, BOWLING_LANE_LENGTH, 0.08, 1.0668, BOWLING_LANE_LENGTH * 0.5, 0.0, 0);
    addBox(root, laneMat, 0.94, 0.08, 1.0668, BOWLING_LANE_LENGTH + 0.47, 0.0, 0);
    for (let i = 0; i < 39; i++) {
      addBox(root, laneSeamMat, 0.012, 0.006, 1.04, i * 0.6 - 5.6, this.laneTopY + 0.002, 0);
    }
    for (const side of [-1, 1]) {
      addBox(root, gutterMat, 24.2, 0.11, 0.24, 7.0, -0.02, side * (BOWLING_LANE_HALF_WIDTH + 0.15));
    }
    addBox(root, laneSeamMat, 0.035, 0.004, 1.0668, 0.0, this.laneTopY + 0.004, 0);
    addBox(root, laneSeamMat, 0.035, 0.004, 1.0668, BOWLING_LANE_LENGTH, this.laneTopY + 0.004, 0);

    // Back pit, masking unit and approach console.
    addBox(root, gutterMat, 2.0, 2.2, 7.4, 20.35, 0.2, 0);
    addBox(root, wallMat, 0.35, 3.0, 8.4, 22.25, 1.7, 0);
    addBox(root, whiteMat, 0.08, 1.05, 2.1, 20.55, 1.45, 0);
    addBox(root, redMat, 0.1, 0.24, 0.2, 20.6, 1.55, -0.65);
    addBox(root, redMat, 0.1, 0.24, 0.2, 20.6, 1.55, 0.65);
    addBox(root, trimMat, 2.7, 1.05, 0.85, -4.0, 0.53, -2.2);
    addBox(root, chromeMat, 1.1, 0.16, 0.4, -4.0, 1.12, -2.2);

    // Seating and ball return rack.
    addBox(root, sofaMat, 5.8, 0.42, 0.8, 2.0, 0.42, -3.5);
    addBox(root, sofaMat, 5.8, 0.62, 0.22, 2.0, 0.84, -3.82);
    addBox(root, trimMat, 1.35, 0.62, 2.6, -5.6, 0.31, -2.4);
    addBox(root, chromeMat, 0.14, 0.11, 2.4, -5.6, 0.73, -2.4);
    for (let i = 0; i < 3; i++) {
      const spare = new THREE.Mesh(
        new THREE.SphereGeometry(BOWLING_BALL_RADIUS, 18, 12),
        ballMat,
      );
      spare.position.set(-5.6, 0.82, -3.25 + i * 0.65);
      root.add(spare);
    }

    // Scoreboard with real pin count and roll number.
    this.scoreTexture = makeScoreTexture(10, 0);
    this.scoreMaterial = this.scoreTexture
      ? new THREE.MeshBasicMaterial({ map: this.scoreTexture, toneMapped: false })
      : new THREE.MeshBasicMaterial({ color: 0x0f766e });
    const scoreboard = new THREE.Mesh(new THREE.PlaneGeometry(4.6, 2.3), this.scoreMaterial);
    scoreboard.position.set(1.5, 3.3, 4.36);
    scoreboard.rotation.y = Math.PI;
    root.add(scoreboard);
    addBox(root, trimMat, 4.9, 2.55, 0.12, 1.5, 3.3, 4.42);

    // Sign over the open approach.
    const signMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0xb45309, emissiveIntensity: 0.35 });
    const sign = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 1.15), signMat);
    sign.position.set(-7.95, 4.05, 0);
    sign.rotation.y = Math.PI / 2;
    root.add(sign);
    addBox(root, trimMat, 0.12, 1.35, 6.7, -7.9, 4.05, 0);

    // Warm overhead lights.
    for (const x of [-2.5, 6.0, 14.5]) {
      const light = new THREE.PointLight(0xfff1d6, 0.9, 13, 1.7);
      light.position.set(x, 4.5, 0);
      root.add(light);
    }

    // Ball.
    const ballMesh = new THREE.Mesh(
      new THREE.SphereGeometry(BOWLING_BALL_RADIUS, 24, 16),
      ballMat,
    );
    for (const [hx, hz] of [[-0.034, -0.018], [0.034, -0.018], [0, 0.045]] as const) {
      const hole = new THREE.Mesh(
        new THREE.SphereGeometry(0.014, 8, 6),
        new THREE.MeshBasicMaterial({ color: 0x020617 }),
      );
      hole.position.set(hx, BOWLING_BALL_RADIUS - 0.002, hz);
      ballMesh.add(hole);
    }
    this.ballGroup.name = 'bowling-ball';
    this.ballGroup.position.set(this.ballX, this.ballStartY, this.ballZ);
    this.ballGroup.add(ballMesh);
    root.add(this.ballGroup);

    // Ten pins arranged in the regulation triangle.
    const pinGeo = makePinGeometry();
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xfffbeb, roughness: 0.3 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 });
    for (let i = 0; i < PIN_LAYOUT.length; i++) {
      const p = PIN_LAYOUT[i];
      const group = new THREE.Group();
      group.name = `bowling-pin-${i + 1}`;
      group.position.set(p.x, this.laneTopY, p.z);
      const body = new THREE.Mesh(pinGeo, pinMat);
      body.castShadow = true;
      group.add(body);
      const stripe = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.05, 0.045, 14),
        stripeMat,
      );
      stripe.position.y = 0.252;
      group.add(stripe);
      root.add(group);
      this.pins.push({
        id: `pin_${i + 1}`,
        x: p.x,
        z: p.z,
        standing: true,
        fallAge: 0,
        fallAngle: 0,
        fallSpeed: 0,
        vx: 0,
        vz: 0,
        tiltX: 0,
        tiltZ: 0,
        group,
      });
    }

    // Structural posts use the game's normal 2D collider layer.
    for (const x of [-7.7, 21.8]) {
      for (const z of [-4.25, 4.25]) {
        const worldX = BOWLING_ALLEY_POS.x - x;
        const worldZ = BOWLING_ALLEY_POS.z - z;
        this.colliders.push({ x: worldX, z: worldZ, radius: 0.34 });
      }
    }
  }

  public get isRolling(): boolean {
    return this.rolling;
  }

  public get standingPins(): number {
    return this.pins.filter((pin) => pin.standing).length;
  }

  public get totalRolls(): number {
    return this.rolls;
  }

  public rollBall(): boolean {
    if (this.rolling || this.resetTimer > 0) return false;
    this.rolling = true;
    this.pendingResult = false;
    this.rolls += 1;
    this.ballX = BOWLING_BALL_START_X;
    this.ballZ = 0;
    this.ballVX = BOWLING_BALL_SPEED;
    // A tiny deterministic release drift, like a real hand releasing slightly
    // off centre. It changes each roll without making the result random.
    this.ballVZ = Math.sin(this.rolls * 2.399 + 0.35) * 0.055;
    this.ballGroup.position.set(this.ballX, this.ballStartY, this.ballZ);
    this.ballGroup.rotation.set(0, 0, 0);
    return true;
  }

  public update(dt: number): void {
    const step = Number.isFinite(dt) ? Math.min(0.05, Math.max(0, dt)) : 0;
    if (step <= 0) return;

    if (this.resetTimer > 0) {
      this.resetTimer = Math.max(0, this.resetTimer - step);
      this.updateFallingPins(step);
      if (this.resetTimer === 0) {
        if (this.pendingResult) this.completeRollResult();
        this.resetPins();
      }
      return;
    }

    if (!this.rolling) {
      this.updateFallingPins(step);
      return;
    }

    this.ballX += this.ballVX * step;
    this.ballZ += this.ballVZ * step;
    this.ballVX = Math.max(0, this.ballVX - 0.28 * step);
    this.ballVZ *= Math.pow(0.997, step * 60);

    const maxZ = BOWLING_LANE_HALF_WIDTH - BOWLING_BALL_RADIUS * 0.35;
    if (Math.abs(this.ballZ) > maxZ) {
      this.ballZ = Math.sign(this.ballZ) * maxZ;
      this.ballVZ *= -0.12;
      this.ballVX *= 0.985;
    }

    this.ballGroup.position.set(this.ballX, this.ballStartY, this.ballZ);
    this.ballGroup.rotation.z = -this.ballX / BOWLING_BALL_RADIUS;

    for (const pin of this.pins) {
      if (!pin.standing) continue;
      const dx = this.ballX - pin.x;
      const dz = this.ballZ - pin.z;
      if (Math.hypot(dx, dz) <= BOWLING_BALL_RADIUS + BOWLING_PIN_RADIUS) {
        this.knockPin(pin, this.ballVX, this.ballVZ, dx, dz);
        this.ballVX *= 0.9;
        this.ballVZ += dz * 0.8;
      }
    }
    this.updateFallingPins(step);

    if (this.ballX > BOWLING_LANE_LENGTH + 1.05 || this.ballVX < 0.08) {
      this.finishRoll();
    }
  }

  public getNearbyInteraction(
    playerX: number,
    playerY: number,
    playerZ: number,
  ): BowlingInteraction | null {
    if (Math.abs(playerY - BOWLING_ALLEY_FLOOR_Y) > 2.2) return null;
    const distance = Math.hypot(
      playerX - BOWLING_STATION_WORLD.x,
      playerZ - BOWLING_STATION_WORLD.z,
    );
    if (distance > 3.1) return null;
    return {
      x: BOWLING_STATION_WORLD.x,
      y: BOWLING_STATION_WORLD.y,
      z: BOWLING_STATION_WORLD.z,
      distance,
      label: this.rolling
        ? 'Bowling Ball Rolling'
        : this.resetTimer > 0
          ? 'Waiting for Pin Reset'
          : 'Roll a Real 7 kg Bowling Ball',
      sublabel: this.rolling
        ? `${this.standingPins} pins standing · watch the lane`
        : this.resetTimer > 0
          ? `${this.standingPins} pins standing · automatic reset`
          : 'Regulation 18.29 m lane · press E to bowl',
    };
  }

  public consumeEvents(): BowlingEvent[] {
    if (this.events.length === 0) return [];
    return this.events.splice(0, this.events.length);
  }

  private knockPin(
    pin: BowlingPin,
    vx: number,
    vz: number,
    dx: number,
    dz: number,
  ): void {
    if (!pin.standing) return;
    pin.standing = false;
    pin.fallAge = 0;
    pin.fallAngle = 0;
    pin.fallSpeed = 2.4 + Math.min(3.5, Math.hypot(vx, vz) * 0.38);
    pin.vx = vx * 0.22 + dx * 1.3;
    pin.vz = vz * 0.22 + dz * 1.6;
    const length = Math.max(0.001, Math.hypot(dx, dz));
    pin.tiltZ = (-dx / length) * 0.92;
    pin.tiltX = (dz / length) * 0.92;
  }

  private updateFallingPins(dt: number): void {
    for (const pin of this.pins) {
      if (pin.standing) continue;
      pin.fallAge += dt;
      if (pin.fallAge < 0.9) {
        const drag = Math.pow(0.14, dt);
        pin.x += pin.vx * dt;
        pin.z += pin.vz * dt;
        pin.vx *= drag;
        pin.vz *= drag;
        pin.fallAngle = Math.min(
          Math.PI * 0.5,
          pin.fallAngle + pin.fallSpeed * dt,
        );
        pin.group.position.set(pin.x, this.laneTopY, pin.z);
        pin.group.rotation.set(
          pin.tiltX * pin.fallAngle,
          0,
          pin.tiltZ * pin.fallAngle,
        );
      }
      if (pin.fallAge > 0.12 && pin.fallAge < 0.42) {
        for (const other of this.pins) {
          if (other.standing !== true) continue;
          const dx = pin.x - other.x;
          const dz = pin.z - other.z;
          if (Math.hypot(dx, dz) < BOWLING_PIN_RADIUS * 2.25) {
            this.knockPin(other, pin.vx, pin.vz, dx, dz);
          }
        }
      }
    }
  }

  private finishRoll(): void {
    this.rolling = false;
    this.pendingResult = true;
    this.scoreStanding = this.standingPins;
    this.resetTimer = 3.1;
  }

  private completeRollResult(): void {
    this.pendingResult = false;
    this.scoreStanding = this.standingPins;
    const knocked = 10 - this.scoreStanding;
    this.events.push({
      type: 'pins',
      knocked,
      standing: this.scoreStanding,
      strike: knocked === 10,
      ballMph: BOWLING_BALL_SPEED * 2.23694,
    });
    const updated = makeScoreTexture(this.scoreStanding, this.rolls - 1);
    if (updated && this.scoreMaterial) {
      this.scoreTexture?.dispose();
      this.scoreTexture = updated;
      this.scoreMaterial.map = updated;
      this.scoreMaterial.needsUpdate = true;
    }
  }

  private resetPins(): void {
    for (const pin of this.pins) {
      pin.standing = true;
      pin.x = PIN_LAYOUT[this.pins.indexOf(pin)].x;
      pin.z = PIN_LAYOUT[this.pins.indexOf(pin)].z;
      pin.fallAge = 0;
      pin.fallAngle = 0;
      pin.fallSpeed = 0;
      pin.vx = 0;
      pin.vz = 0;
      pin.group.position.set(pin.x, this.laneTopY, pin.z);
      pin.group.rotation.set(0, 0, 0);
    }
    this.ballX = BOWLING_BALL_START_X;
    this.ballZ = 0;
    this.ballGroup.position.set(this.ballX, this.ballStartY, this.ballZ);
    this.ballGroup.rotation.set(0, 0, 0);
    this.scoreStanding = 10;
  }
}
