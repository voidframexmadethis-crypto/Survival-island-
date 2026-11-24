/**
 * Lowrider & Old-School Airbag Suspension System (Three.js + Cannon-es / Rapier)
 * -----------------------------------------------------------------------------
 * Features:
 *  1. High-Lift Bouncing Hydraulics (4-corner, front/rear, side-to-side, 3-wheel,
 *     and timed rhythmic bunny-hop / front-end sky-high hops).
 *  2. Airbag Suspension for ALL old-school cars (Slammed / Cruise / Raised +
 *     individual axle/corner pressure in PSI with progressive air-spring curves).
 *  3. Realistic Chassis Weight Transfer (gas squat, brake dive, cornering roll,
 *     anti-roll bar coupling, and asymmetric compression/rebound damping).
 *  4. Procedural Web Audio FX (hydraulic pump whine, airbag dump hiss, scrape)
 *     + Three.js GPU-friendly Scrape Spark Particle System for bumper/frame hits.
 */

import * as THREE from 'three';

// -----------------------------------------------------------------------------
// 1. OLD-SCHOOL CAR SUSPENSION PRESETS
//    Add your game's vehicle IDs here; any unlisted old-school car uses
//    `default_old_school` automatically.
// -----------------------------------------------------------------------------
export const OLD_SCHOOL_CAR_PRESETS = {
  cadillac_coupe_deville: {
    displayName: 'Cadillac Coupe DeVille (13" Symmers)',
    massKg: 2150,
    wheelbase: 3.25,
    trackWidth: 1.62,
    chassisHeightClearance: 0.24,
    // Airbag limits (meters from neutral rest length)
    airbag: {
      minRestLength: 0.08,   // Slammed frame-on-ground
      cruiseRestLength: 0.28,
      maxRestLength: 0.52,
      inflateSpeed: 0.42,    // m/s
      deflateSpeed: 0.78,    // m/s (faster air-out dump)
      baseStiffness: 28000,
      reboundDamping: 4200,
      compressionDamping: 2600,
    },
    // Hydraulics limits (extreme stroke for high hops)
    hydraulics: {
      minRestLength: 0.06,
      cruiseRestLength: 0.26,
      maxLiftLength: 1.18,   // Very high static lift
      hopPeakLength: 1.55,   // Peak extension during accumulator hop
      pumpSpeed: 4.8,        // Fast hydraulic ram speed (m/s)
      dropSpeed: 3.4,
      hopImpulse: 18500,     // Upward impulse (N*s) for massive hop
      frontHopPitchTorque: 14500, // Lifts nose sky-high
      stiffness: 52000,
      reboundDamping: 1950,  // Lower rebound damping = realistic bounce!
      compressionDamping: 2100,
    },
    antiRollStiffness: 9500,
    squatFactor: 0.14,
    diveFactor: 0.18,
    rollFactor: 0.16,
  },

  chevy_impala_64: {
    displayName: '1964 Chevrolet Impala',
    massKg: 1720,
    wheelbase: 3.02,
    trackWidth: 1.54,
    chassisHeightClearance: 0.22,
    airbag: {
      minRestLength: 0.07,
      cruiseRestLength: 0.26,
      maxRestLength: 0.50,
      inflateSpeed: 0.46,
      deflateSpeed: 0.85,
      baseStiffness: 24500,
      reboundDamping: 3700,
      compressionDamping: 2300,
    },
    hydraulics: {
      minRestLength: 0.05,
      cruiseRestLength: 0.25,
      maxLiftLength: 1.28,
      hopPeakLength: 1.72,   // Classic competition hopper height
      pumpSpeed: 5.6,
      dropSpeed: 3.8,
      hopImpulse: 21000,
      frontHopPitchTorque: 16800,
      stiffness: 58000,
      reboundDamping: 1650,
      compressionDamping: 1900,
    },
    antiRollStiffness: 8200,
    squatFactor: 0.16,
    diveFactor: 0.20,
    rollFactor: 0.18,
  },

  default_old_school: {
    displayName: 'Classic Old-School Cruiser',
    massKg: 1850,
    wheelbase: 2.95,
    trackWidth: 1.56,
    chassisHeightClearance: 0.23,
    airbag: {
      minRestLength: 0.08,
      cruiseRestLength: 0.27,
      maxRestLength: 0.48,
      inflateSpeed: 0.44,
      deflateSpeed: 0.80,
      baseStiffness: 25500,
      reboundDamping: 3900,
      compressionDamping: 2450,
    },
    hydraulics: {
      minRestLength: 0.06,
      cruiseRestLength: 0.25,
      maxLiftLength: 1.15,
      hopPeakLength: 1.50,
      pumpSpeed: 4.9,
      dropSpeed: 3.5,
      hopImpulse: 17500,
      frontHopPitchTorque: 13800,
      stiffness: 49000,
      reboundDamping: 1850,
      compressionDamping: 2050,
    },
    antiRollStiffness: 8800,
    squatFactor: 0.15,
    diveFactor: 0.19,
    rollFactor: 0.17,
  },
};

export const CORNERS = ['FL', 'FR', 'RL', 'RR']; // 0:FL, 1:FR, 2:RL, 3:RR

// -----------------------------------------------------------------------------
// 2. PROCEDURAL WEB AUDIO FX (No external sound files needed)
// -----------------------------------------------------------------------------
export class LowriderAudioFX {
  constructor() {
    this.ctx = null;
    this.pumpOsc = null;
    this.pumpGain = null;
    this.isMuted = false;
    this.lastScrapeTime = 0;
  }

  _ensureContext() {
    if (this.isMuted) return null;
    if (!this.ctx && typeof window !== 'undefined') {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) this.ctx = new AudioCtx();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  startPump(intensity = 1.0) {
    const ctx = this._ensureContext();
    if (!ctx) return;

    if (!this.pumpOsc) {
      this.pumpOsc = ctx.createOscillator();
      const filter = ctx.createBiquadFilter();
      this.pumpGain = ctx.createGain();

      this.pumpOsc.type = 'sawtooth';
      this.pumpOsc.frequency.value = 115 + intensity * 65;

      filter.type = 'bandpass';
      filter.frequency.value = 420;
      filter.Q.value = 2.2;

      this.pumpGain.gain.value = 0.0;
      this.pumpOsc.connect(filter);
      filter.connect(this.pumpGain);
      this.pumpGain.connect(ctx.destination);
      this.pumpOsc.start();
    }

    const now = ctx.currentTime;
    this.pumpOsc.frequency.setTargetAtTime(125 + intensity * 85, now, 0.04);
    this.pumpGain.gain.setTargetAtTime(Math.min(0.14, 0.06 * intensity), now, 0.03);
  }

  stopPump() {
    if (!this.ctx || !this.pumpGain) return;
    this.pumpGain.gain.setTargetAtTime(0.0, this.ctx.currentTime, 0.04);
  }

  playAirRelease(duration = 0.45) {
    const ctx = this._ensureContext();
    if (!ctx) return;

    const bufferSize = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (bufferSize * 0.45));
    }

    const noise = ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 1800;

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.14, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    noise.start();
  }

  playScrapeImpact(strength = 1.0) {
    const ctx = this._ensureContext();
    if (!ctx) return;
    const now = ctx.currentTime;
    if (now - this.lastScrapeTime < 0.09) return;
    this.lastScrapeTime = now;

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(95 + Math.random() * 40, now);
    osc.frequency.exponentialRampToValueAtTime(36, now + 0.14);

    gain.gain.setValueAtTime(Math.min(0.22, 0.12 * strength), now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + 0.16);
  }
}

// -----------------------------------------------------------------------------
// 3. SCRAPE SPARK PARTICLE SYSTEM (Three.js)
// -----------------------------------------------------------------------------
export class ScrapeSparkSystem {
  constructor(scene, maxParticles = 180) {
    this.scene = scene;
    this.maxParticles = maxParticles;
    this.positions = new Float32Array(maxParticles * 3);
    this.velocities = new Float32Array(maxParticles * 3);
    this.lifetimes = new Float32Array(maxParticles);
    this.cursor = 0;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    const material = new THREE.PointsMaterial({
      color: 0xffb347,
      size: 0.11,
      transparent: true,
      opacity: 0.92,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.points = new THREE.Points(geometry, material);
    this.points.frustumCulled = false;
    if (scene) scene.add(this.points);
  }

  emitBurst(worldPos, carVelocity, count = 12) {
    for (let i = 0; i < count; i++) {
      const idx = this.cursor;
      const i3 = idx * 3;
      this.cursor = (this.cursor + 1) % this.maxParticles;

      this.positions[i3] = worldPos.x + (Math.random() - 0.5) * 0.25;
      this.positions[i3 + 1] = worldPos.y + 0.03;
      this.positions[i3 + 2] = worldPos.z + (Math.random() - 0.5) * 0.25;

      this.velocities[i3] = -carVelocity.x * 0.35 + (Math.random() - 0.5) * 3.8;
      this.velocities[i3 + 1] = 1.2 + Math.random() * 3.4;
      this.velocities[i3 + 2] = -carVelocity.z * 0.35 + (Math.random() - 0.5) * 3.8;

      this.lifetimes[idx] = 0.22 + Math.random() * 0.32;
    }
  }

  update(dt, groundY = 0) {
    for (let i = 0; i < this.maxParticles; i++) {
      if (this.lifetimes[i] <= 0) {
        this.positions[i * 3 + 1] = -9999; // hide inactive
        continue;
      }
      this.lifetimes[i] -= dt;
      const i3 = i * 3;
      this.velocities[i3 + 1] -= 14.5 * dt; // gravity
      this.positions[i3] += this.velocities[i3] * dt;
      this.positions[i3 + 1] += this.velocities[i3 + 1] * dt;
      this.positions[i3 + 2] += this.velocities[i3 + 2] * dt;

      if (this.positions[i3 + 1] < groundY + 0.02) {
        this.positions[i3 + 1] = groundY + 0.02;
        this.velocities[i3 + 1] = Math.abs(this.velocities[i3 + 1]) * 0.45;
      }
    }
    this.points.geometry.attributes.position.needsUpdate = true;
  }
}

// -----------------------------------------------------------------------------
// 4. PHYSICS ADAPTERS (Supports Cannon-es RaycastVehicle & Rapier / Generic)
// -----------------------------------------------------------------------------
export const PhysicsAdapters = {
  /**
   * Adapter for cannon-es CANNON.RaycastVehicle
   */
  cannonRaycastVehicle(vehicle, chassisBody) {
    return {
      getPosition: () => new THREE.Vector3(chassisBody.position.x, chassisBody.position.y, chassisBody.position.z),
      getQuaternion: () => new THREE.Quaternion(chassisBody.quaternion.x, chassisBody.quaternion.y, chassisBody.quaternion.z, chassisBody.quaternion.w),
      getVelocity: () => new THREE.Vector3(chassisBody.velocity.x, chassisBody.velocity.y, chassisBody.velocity.z),
      getAngularVelocity: () => new THREE.Vector3(chassisBody.angularVelocity.x, chassisBody.angularVelocity.y, chassisBody.angularVelocity.z),
      getWheelCount: () => vehicle.wheelInfos.length,
      getWheelSuspensionDelta: (i) => vehicle.wheelInfos[i].suspensionLength - vehicle.wheelInfos[i].suspensionRestLength,
      isWheelGrounded: (i) => vehicle.wheelInfos[i].isInContact,
      setWheelParams: (i, { restLength, stiffness, dampingCompression, dampingRelaxation }) => {
        const w = vehicle.wheelInfos[i];
        w.suspensionRestLength = restLength;
        w.suspensionStiffness = stiffness / 1000; // cannon-es scales stiffness per kg/unit
        w.dampingCompression = dampingCompression / 1000;
        w.dampingRelaxation = dampingRelaxation / 1000;
      },
      applyWorldImpulse: (impulseVec, worldPoint) => {
        chassisBody.applyImpulse(
          { x: impulseVec.x, y: impulseVec.y, z: impulseVec.z },
          {
            x: worldPoint.x - chassisBody.position.x,
            y: worldPoint.y - chassisBody.position.y,
            z: worldPoint.z - chassisBody.position.z,
          }
        );
      },
      applyWorldTorque: (torqueVec) => {
        chassisBody.torque.x += torqueVec.x;
        chassisBody.torque.y += torqueVec.y;
        chassisBody.torque.z += torqueVec.z;
      },
      applyWorldForceAtPoint: (forceVec, worldPoint) => {
        chassisBody.applyForce(
          { x: forceVec.x, y: forceVec.y, z: forceVec.z },
          {
            x: worldPoint.x - chassisBody.position.x,
            y: worldPoint.y - chassisBody.position.y,
            z: worldPoint.z - chassisBody.position.z,
          }
        );
      },
    };
  },

  /**
   * Adapter for Rapier RigidBody + Raycast/Spring wheels
   */
  rapierRigidBody(rigidBody, wheelStateArray) {
    return {
      getPosition: () => {
        const t = rigidBody.translation();
        return new THREE.Vector3(t.x, t.y, t.z);
      },
      getQuaternion: () => {
        const r = rigidBody.rotation();
        return new THREE.Quaternion(r.x, r.y, r.z, r.w);
      },
      getVelocity: () => {
        const v = rigidBody.linvel();
        return new THREE.Vector3(v.x, v.y, v.z);
      },
      getAngularVelocity: () => {
        const w = rigidBody.angvel();
        return new THREE.Vector3(w.x, w.y, w.z);
      },
      getWheelCount: () => wheelStateArray.length,
      getWheelSuspensionDelta: (i) => wheelStateArray[i].compression || 0,
      isWheelGrounded: (i) => !!wheelStateArray[i].grounded,
      setWheelParams: (i, params) => {
        Object.assign(wheelStateArray[i], params);
      },
      applyWorldImpulse: (impulseVec, worldPoint) => {
        rigidBody.applyImpulseAtPoint(impulseVec, worldPoint, true);
      },
      applyWorldTorque: (torqueVec) => {
        rigidBody.addTorque(torqueVec, true);
      },
      applyWorldForceAtPoint: (forceVec, worldPoint) => {
        rigidBody.addForceAtPoint(forceVec, worldPoint, true);
      },
    };
  },
};

// -----------------------------------------------------------------------------
// 5. MAIN LOWRIDER & AIRBAG SUSPENSION CONTROLLER
// -----------------------------------------------------------------------------
export class LowriderSuspensionController {
  /**
   * @param {Object} options
   * @param {string} options.carId - Key in OLD_SCHOOL_CAR_PRESETS
   * @param {Object} options.physicsAdapter - From PhysicsAdapters
   * @param {THREE.Scene} [options.scene] - Optional Three.js scene for sparks
   * @param {THREE.Object3D[]} [options.hydraulicRamMeshes] - Optional 4 meshes [FL, FR, RL, RR]
   */
  constructor({ carId = 'default_old_school', physicsAdapter, scene = null, hydraulicRamMeshes = [] }) {
    this.preset = OLD_SCHOOL_CAR_PRESETS[carId] || OLD_SCHOOL_CAR_PRESETS.default_old_school;
    this.physics = physicsAdapter;
    this.ramMeshes = hydraulicRamMeshes;

    // Modes: 'airbag' | 'hydraulics'
    this.mode = 'hydraulics';

    // Per-corner state: 0:FL, 1:FR, 2:RL, 3:RR
    this.corners = CORNERS.map((name) => ({
      name,
      targetNormalized: 0.25, // 0 = slammed, 1 = max static lift
      currentLength: this.preset.hydraulics.cruiseRestLength,
      velocity: 0,
      hopTimer: 0,
      psi: 65,
    }));

    // Dynamic state for weight transfer
    this.prevLocalVel = new THREE.Vector3();
    this.smoothedAccel = new THREE.Vector3();

    // Auto-bounce rhythm state (for holding HOP or rhythmic bouncing)
    this.isAutoBouncing = false;
    this.bouncePhase = 0;
    this.bounceCooldown = 0;

    // FX
    this.audio = new LowriderAudioFX();
    this.sparks = scene ? new ScrapeSparkSystem(scene) : null;
  }

  // --- Mode & Preset Controls ------------------------------------------------

  setMode(mode) {
    if (mode !== 'airbag' && mode !== 'hydraulics') return;
    if (this.mode !== mode) {
      this.mode = mode;
      this.isAutoBouncing = false;
      this.audio.playAirRelease(0.3);
    }
  }

  /**
   * Airbag Presets (works for ALL old-school cars):
   * 'slammed' | 'cruise' | 'raised'
   */
  setAirbagPreset(presetName) {
    this.setMode('airbag');
    const map = { slammed: 0.0, cruise: 0.42, raised: 1.0 };
    const val = map[presetName] ?? 0.42;
    if (presetName === 'slammed') {
      this.audio.playAirRelease(0.65);
    }
    this.corners.forEach((c) => {
      c.targetNormalized = val;
    });
  }

  /**
   * Classic Hydraulic Switches:
   * 'front_up', 'rear_up', 'all_up', 'slam', 'tilt_left', 'tilt_right', 'three_wheel_fl', 'three_wheel_fr'
   */
  setHydraulicPose(pose) {
    this.setMode('hydraulics');
    const targets = {
      slam:           [0.0, 0.0, 0.0, 0.0],
      cruise:         [0.22, 0.22, 0.22, 0.22],
      front_up:       [1.0, 1.0, 0.05, 0.05],
      rear_up:        [0.05, 0.05, 1.0, 1.0],
      all_up:         [1.0, 1.0, 1.0, 1.0],
      tilt_left:      [0.05, 1.0, 0.05, 1.0],
      tilt_right:     [1.0, 0.05, 1.0, 0.05],
      three_wheel_fl: [0.02, 1.0, 1.0, 0.25], // Lifts FR & RL high, tucks FL
      three_wheel_fr: [1.0, 0.02, 0.25, 1.0],
    }[pose];

    if (!targets) return;
    if (pose === 'slam') this.audio.playAirRelease(0.4);
    else this.audio.startPump(0.85);

    targets.forEach((t, i) => {
      this.corners[i].targetNormalized = t;
    });
  }

  /**
   * High-Lift Bounce / Hop ('front' | 'all' | 'rear')
   * Triggers a high-pressure hydraulic accumulator burst so the car goes VERY HIGH
   * and bounces naturally on landing.
   */
  triggerHop(type = 'front', powerMultiplier = 1.0) {
    this.setMode('hydraulics');
    const h = this.preset.hydraulics;
    const pos = this.physics.getPosition();
    const quat = this.physics.getQuaternion();
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);

    // Require at least 1 wheel near ground to push off realistically
    const anyGrounded = CORNERS.some((_, i) => this.physics.isWheelGrounded(i));
    if (!anyGrounded) return false;

    this.audio.startPump(1.3 * powerMultiplier);

    const halfWB = this.preset.wheelbase * 0.5;
    if (type === 'front') {
      // Launch front axle sky-high
      this.corners[0].hopTimer = 0.22;
      this.corners[1].hopTimer = 0.22;
      this.corners[0].targetNormalized = 1.25;
      this.corners[1].targetNormalized = 1.25;

      const frontPoint = pos.clone().addScaledVector(forward, halfWB);
      const impulse = up.clone().multiplyScalar(h.hopImpulse * powerMultiplier);
      this.physics.applyWorldImpulse(impulse, frontPoint);

      // Extra pitch torque around local X axis for dramatic wheelie hop
      const pitchTorque = right.clone().multiplyScalar(-h.frontHopPitchTorque * powerMultiplier);
      this.physics.applyWorldTorque(pitchTorque);
    } else if (type === 'all') {
      // Full-body 4-wheel bunny hop
      this.corners.forEach((c) => {
        c.hopTimer = 0.24;
        c.targetNormalized = 1.3;
      });
      const impulse = up.clone().multiplyScalar(h.hopImpulse * 1.45 * powerMultiplier);
      this.physics.applyWorldImpulse(impulse, pos);
    } else if (type === 'rear') {
      this.corners[2].hopTimer = 0.22;
      this.corners[3].hopTimer = 0.22;
      this.corners[2].targetNormalized = 1.2;
      this.corners[3].targetNormalized = 1.2;

      const rearPoint = pos.clone().addScaledVector(forward, -halfWB);
      const impulse = up.clone().multiplyScalar(h.hopImpulse * 0.9 * powerMultiplier);
      this.physics.applyWorldImpulse(impulse, rearPoint);
    }

    return true;
  }

  /**
   * Toggle continuous rhythmic hopping (auto-times hits at compression bottom)
   */
  setAutoBounce(enabled, type = 'front') {
    this.isAutoBouncing = enabled;
    this.autoBounceType = type;
    if (!enabled) this.audio.stopPump();
  }

  // --- Per-Frame Physics & Realism Update ------------------------------------

  /**
   * Call once per physics tick (e.g. 60Hz fixed timestep)
   * @param {number} dt - Delta time in seconds
   * @param {Object} [driverInput] - { throttle: -1..1, brake: 0..1, steer: -1..1, groundY: 0 }
   */
  update(dt, driverInput = {}) {
    const safeDt = Math.min(dt, 0.05);
    const groundY = driverInput.groundY ?? 0;

    const pos = this.physics.getPosition();
    const quat = this.physics.getQuaternion();
    const vel = this.physics.getVelocity();

    // 1. Compute local velocity & smoothed acceleration for realistic weight transfer
    const invQuat = quat.clone().invert();
    const localVel = vel.clone().applyQuaternion(invQuat);
    const rawAccel = localVel.clone().sub(this.prevLocalVel).divideScalar(Math.max(safeDt, 0.001));
    this.prevLocalVel.copy(localVel);
    this.smoothedAccel.lerp(rawAccel, Math.min(1, safeDt * 10));

    // Weight transfer offsets (meters)
    const pitchTransfer = THREE.MathUtils.clamp(
      -this.smoothedAccel.z * this.preset.squatFactor * 0.015 +
      (driverInput.brake || 0) * this.preset.diveFactor * 0.12 -
      (driverInput.throttle || 0) * this.preset.squatFactor * 0.10,
      -0.14,
      0.14
    );
    const rollTransfer = THREE.MathUtils.clamp(
      this.smoothedAccel.x * this.preset.rollFactor * 0.015,
      -0.12,
      0.12
    );

    const cfg = this.mode === 'airbag' ? this.preset.airbag : this.preset.hydraulics;
    const minLen = cfg.minRestLength;
    const maxLen = this.mode === 'airbag' ? cfg.maxRestLength : cfg.maxLiftLength;
    let pumpActive = false;

    // 2. Update each corner's actuator length, spring rate, and damping
    for (let i = 0; i < 4; i++) {
      const c = this.corners[i];
      const isFront = i < 2;
      const isLeft = i === 0 || i === 2;

      let desiredLen;
      if (c.hopTimer > 0 && this.mode === 'hydraulics') {
        c.hopTimer -= safeDt;
        desiredLen = this.preset.hydraulics.hopPeakLength;
        pumpActive = true;
      } else {
        desiredLen = THREE.MathUtils.lerp(minLen, maxLen, THREE.MathUtils.clamp(c.targetNormalized, 0, 1.3));
      }

      // Apply dynamic squat/dive and cornering roll
      desiredLen += isFront ? -pitchTransfer : pitchTransfer;
      desiredLen += isLeft ? rollTransfer : -rollTransfer;
      desiredLen = THREE.MathUtils.clamp(desiredLen, minLen * 0.85, this.mode === 'hydraulics' ? cfg.hopPeakLength : maxLen);

      const diff = desiredLen - c.currentLength;
      const speed = diff > 0
        ? (this.mode === 'airbag' ? cfg.inflateSpeed : cfg.pumpSpeed)
        : (this.mode === 'airbag' ? cfg.deflateSpeed : cfg.dropSpeed);

      if (Math.abs(diff) > 0.008 && diff > 0 && this.mode === 'hydraulics') {
        pumpActive = true;
      }

      const step = Math.sign(diff) * Math.min(Math.abs(diff), speed * safeDt);
      c.velocity = step / Math.max(safeDt, 0.001);
      c.currentLength += step;

      // Progressive airbag spring rate (higher PSI = stiffer ride)
      const normalizedHeight = (c.currentLength - minLen) / Math.max(0.01, maxLen - minLen);
      c.psi = this.mode === 'airbag' ? Math.round(5 + normalizedHeight * 115) : Math.round(400 + normalizedHeight * 2600);

      const dynamicStiffness = this.mode === 'airbag'
        ? cfg.baseStiffness * (0.65 + normalizedHeight * 0.85)
        : cfg.stiffness;

      // Push updated parameters to physics vehicle
      this.physics.setWheelParams(i, {
        restLength: c.currentLength,
        stiffness: dynamicStiffness,
        dampingCompression: cfg.compressionDamping,
        dampingRelaxation: cfg.reboundDamping,
      });

      // Update optional 3D hydraulic ram visual mesh
      if (this.ramMeshes[i]) {
        this.ramMeshes[i].scale.y = Math.max(0.25, c.currentLength / 0.25);
      }
    }

    // 3. Anti-roll bar coupling (reduces excessive side-to-side wobble in corners)
    this._applyAntiRollBar(quat);

    // 4. Auto-bounce timing (triggers next hop right as front wheels compress on landing)
    if (this.isAutoBouncing && this.mode === 'hydraulics') {
      this.bounceCooldown -= safeDt;
      const frontGrounded = this.physics.isWheelGrounded(0) || this.physics.isWheelGrounded(1);
      if (frontGrounded && vel.y < -0.35 && this.bounceCooldown <= 0) {
        this.triggerHop(this.autoBounceType || 'front', 1.12);
        this.bounceCooldown = 0.42;
      }
    }

    if (!pumpActive && !this.isAutoBouncing) {
      this.audio.stopPump();
    }

    // 5. Scrape & Spark detection (rear bumper / frame rail hits asphalt)
    this._updateScrapeFX(safeDt, pos, quat, vel, groundY);
  }

  _applyAntiRollBar(quat) {
    const kRoll = this.preset.antiRollStiffness;
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(quat);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(quat);
    const pos = this.physics.getPosition();

    // Front axle anti-roll (0 vs 1) and Rear axle anti-roll (2 vs 3)
    const pairs = [[0, 1], [2, 3]];
    for (const [lIdx, rIdx] of pairs) {
      const travelL = this.physics.getWheelSuspensionDelta(lIdx);
      const travelR = this.physics.getWheelSuspensionDelta(rIdx);
      const antiRollForce = (travelL - travelR) * kRoll;

      const halfTrack = this.preset.trackWidth * 0.5;
      if (this.physics.isWheelGrounded(lIdx)) {
        const ptL = pos.clone().addScaledVector(right, -halfTrack);
        this.physics.applyWorldForceAtPoint(up.clone().multiplyScalar(-antiRollForce), ptL);
      }
      if (this.physics.isWheelGrounded(rIdx)) {
        const ptR = pos.clone().addScaledVector(right, halfTrack);
        this.physics.applyWorldForceAtPoint(up.clone().multiplyScalar(antiRollForce), ptR);
      }
    }
  }

  _updateScrapeFX(dt, pos, quat, vel, groundY) {
    const forward = new THREE.Vector3(0, 0, 1).applyQuaternion(quat);
    const rearBumperWorld = pos.clone()
      .addScaledVector(forward, -this.preset.wheelbase * 0.68);
    rearBumperWorld.y -= this.preset.chassisHeightClearance;

    const speed = vel.length();
    if (rearBumperWorld.y <= groundY + 0.04 && (speed > 1.2 || Math.abs(vel.y) > 1.5)) {
      this.audio.playScrapeImpact(Math.min(1.5, speed * 0.15 + 0.5));
      if (this.sparks) {
        this.sparks.emitBurst(rearBumperWorld, vel, Math.min(18, Math.ceil(speed * 1.5 + 4)));
      }
    }

    if (this.sparks) {
      this.sparks.update(dt, groundY);
    }
  }
}
