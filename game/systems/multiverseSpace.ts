export interface MultiverseUniverse {
  id: number;
  name: string;
  skyTint: string;
  nebulaColor: string;
  galaxies: string[];
  starTypes: string[];
}

export interface SpaceStar {
  name: string;
  type: string;
  color: string;
  radius: number;
}

export interface SpacePlanet {
  id: string;
  name: string;
  biome: string;
  color: string;
  radius: number;
  orbitDist: number;
  gravity: number;
  hasRings?: boolean;
  universeId?: number;
  galaxyName?: string;
  sectorNumber?: number;
  alienCount?: number;
  hasUfoEncounter?: boolean;
}

export interface StarSystemData {
  universe: MultiverseUniverse;
  galaxyName: string;
  galaxyIndex: number;
  systemIndex: number;
  star: SpaceStar;
  planets: SpacePlanet[];
}

export interface AlienGunSpec {
  id: string;
  name: string;
  infiniteEnergy: boolean;
  damage: number;
  fireCooldownMs: number;
  boltColor: string;
}

export interface PortalGearTier {
  tier: number;
  name: string;
  maxJumpRange: number;
}

export interface AlienUfoState {
  id: string;
  location: string;
  hp: number;
  maxHp: number;
  isDowned: boolean;
}

export interface AlienLootItem {
  uid: string;
  id: string;
  name: string;
  mode: 'power_up' | 'decoration';
  appliedToEarth: boolean;
}

export interface IslandLandedUfoState {
  id: string;
  coords: { x: number; y: number; z: number };
  loot: AlienLootItem[];
  claimed: boolean;
}

export type SaturnVLaunchPhase = 'PAD' | 'IGNITION' | 'ASCENT' | 'ORBIT_READY';

export interface SpaceHudSnapshot {
  inSpacePlanet: boolean;
  universeId: number;
  universeName: string;
  galaxyIndex: number;
  galaxyName: string;
  systemIndex: number;
  starName: string;
  planetName: string | null;
  planetBiome: string | null;
  gravity: number;
  activeUfo: AlienUfoState | null;
  equippedAlienGunId: string | null;
  equippedAlienGunName: string | null;
  alienLootCount: number;
  earthPowerUps: number;
  islandUfoClaimed: boolean;
  launchPhase: SaturnVLaunchPhase;
  launchAltitude: number;
  launchVelocityY: number;
  launchStage: number;
  launchOrbitAltitude: number;
  launchDestination: string | null;
}

export const MULTIVERSE_SPACE_ENGINE = {
  currentUniverseId: 1,
  currentGalaxyIndex: 0,
  currentSystemIndex: 0,
  activePlanet: null as SpacePlanet | null,

  universes: [
    {
      id: 1,
      name: 'Universe 1: Prime Cosmos',
      skyTint: '#050814',
      nebulaColor: '#1d3b72',
      galaxies: ['Milky Way', 'Andromeda', 'Triangulum'],
      starTypes: ['Yellow Main Sequence', 'Blue Giant'],
    },
    {
      id: 2,
      name: 'Universe 2: Dwarf Star Expanse',
      skyTint: '#12060a',
      nebulaColor: '#6e1b2d',
      galaxies: ['Cinder Spiral', 'White Dwarf Cluster', 'Obsidian Halo'],
      starTypes: ['White Dwarf', 'Red Dwarf', 'Pulsar Dwarf'],
    },
    {
      id: 3,
      name: 'Universe 3: Xenomorphia',
      skyTint: '#071314',
      nebulaColor: '#147a6e',
      galaxies: ['Emerald Whirlpool', 'Aether Crown', 'Biolume Reach'],
      starTypes: ['Cyan Dwarf', 'Binary Twin Stars'],
    },
    {
      id: 4,
      name: 'Universe 4: Parallel Earths',
      skyTint: '#0d0718',
      nebulaColor: '#4c2282',
      galaxies: ['Mirror Prime', 'Chronos Rift', 'Omega Sector'],
      starTypes: ['White Dwarf', 'Golden Sun'],
    },
  ] as MultiverseUniverse[],

  // Deterministic pseudo-random helper so every planet stays identical when revisited
  seededValue(seed: number): number {
    const x = Math.sin(seed * 9999.91) * 10000;
    return x - Math.floor(x);
  },

  // Generate a full solar system (star + 4 to 8 alien/terrestrial planets)
  generateStarSystem(
    universeId: number,
    galaxyIndex: number,
    systemIndex: number,
  ): StarSystemData {
    const universe =
      this.universes.find((u) => u.id === universeId) || this.universes[0];
    const safeGalaxyIdx = Math.max(0, galaxyIndex % universe.galaxies.length);
    const safeSystemIdx = Math.max(0, Math.floor(systemIndex));
    const baseSeed = universeId * 100000 + safeGalaxyIdx * 1000 + safeSystemIdx * 37;

    // Include our real Solar System as System 0 in Universe 1, Milky Way
    if (universeId === 1 && safeGalaxyIdx === 0 && safeSystemIdx === 0) {
      return {
        universe,
        galaxyName: 'Milky Way',
        galaxyIndex: 0,
        systemIndex: 0,
        star: {
          name: 'Sol (The Sun)',
          type: 'Yellow Main Sequence',
          color: '#ffdd66',
          radius: 28,
        },
        planets: [
          {
            id: 'mercury',
            name: 'Mercury',
            biome: 'crater_rock',
            color: '#9a9590',
            radius: 3.2,
            orbitDist: 55,
            gravity: 0.38,
            universeId: 1,
            galaxyName: 'Milky Way',
            hasUfoEncounter: false,
          },
          {
            id: 'venus',
            name: 'Venus',
            biome: 'sulfur_cloud',
            color: '#e3b868',
            radius: 5.5,
            orbitDist: 80,
            gravity: 0.9,
            universeId: 1,
            galaxyName: 'Milky Way',
            hasUfoEncounter: true,
          },
          {
            id: 'earth',
            name: 'Earth (Home Base)',
            biome: 'sandbox_earth',
            color: '#3b82f6',
            radius: 6.0,
            orbitDist: 110,
            gravity: 1.0,
            universeId: 1,
            galaxyName: 'Milky Way',
            hasUfoEncounter: false,
          },
          {
            id: 'mars',
            name: 'Mars',
            biome: 'red_desert',
            color: '#d95b38',
            radius: 4.2,
            orbitDist: 145,
            gravity: 0.38,
            universeId: 1,
            galaxyName: 'Milky Way',
            hasUfoEncounter: true,
          },
          {
            id: 'jupiter',
            name: 'Jupiter',
            biome: 'gas_giant',
            color: '#d4a373',
            radius: 14.0,
            orbitDist: 205,
            gravity: 2.3,
            universeId: 1,
            galaxyName: 'Milky Way',
            hasUfoEncounter: true,
          },
          {
            id: 'saturn',
            name: 'Saturn',
            biome: 'ringed_giant',
            color: '#e9d8a6',
            radius: 12.0,
            orbitDist: 270,
            gravity: 1.06,
            hasRings: true,
            universeId: 1,
            galaxyName: 'Milky Way',
            hasUfoEncounter: true,
          },
          {
            id: 'uranus',
            name: 'Uranus',
            biome: 'ice_giant',
            color: '#7dd3fc',
            radius: 9.5,
            orbitDist: 330,
            gravity: 0.89,
            hasRings: true,
            universeId: 1,
            galaxyName: 'Milky Way',
            hasUfoEncounter: true,
          },
          {
            id: 'neptune',
            name: 'Neptune',
            biome: 'deep_ice',
            color: '#3b82f6',
            radius: 9.2,
            orbitDist: 390,
            gravity: 1.14,
            universeId: 1,
            galaxyName: 'Milky Way',
            hasUfoEncounter: true,
          },
        ],
      };
    }

    const starType =
      universe.starTypes[
        Math.floor(this.seededValue(baseSeed + 1) * universe.starTypes.length)
      ];
    const isWhiteDwarf = starType.includes('White Dwarf');
    const isRedDwarf = starType.includes('Red Dwarf');
    const galaxyName = universe.galaxies[safeGalaxyIdx];

    const star: SpaceStar = {
      name: `${galaxyName}-${safeSystemIdx + 1}`,
      type: starType,
      color: isWhiteDwarf ? '#e8f4ff' : isRedDwarf ? '#ff4d38' : '#70f3ff',
      radius: isWhiteDwarf ? 12 : isRedDwarf ? 16 : 24,
    };

    const planetCount = 4 + Math.floor(this.seededValue(baseSeed + 2) * 5);
    const alienBiomes = [
      'alien_crystal',
      'bioluminescent_jungle',
      'mirror_earth',
      'obsidian_dwarf_world',
      'plasma_desert',
    ];
    const palette = [
      '#4ade80',
      '#a855f7',
      '#38bdf8',
      '#f43f5e',
      '#facc15',
      '#2dd4bf',
    ];

    const planets: SpacePlanet[] = [];
    for (let i = 0; i < planetCount; i++) {
      const pSeed = baseSeed + (i + 1) * 19;
      const biome =
        alienBiomes[Math.floor(this.seededValue(pSeed + 3) * alienBiomes.length)];
      planets.push({
        id: `u${universeId}_g${safeGalaxyIdx}_s${safeSystemIdx}_p${i}`,
        name: `${star.name} ${String.fromCharCode(66 + i)}`,
        biome,
        color: palette[Math.floor(this.seededValue(pSeed + 4) * palette.length)],
        radius: 4 + this.seededValue(pSeed + 5) * 8,
        orbitDist: 48 + i * 36,
        gravity: Number((0.25 + this.seededValue(pSeed + 6) * 1.15).toFixed(2)),
        hasRings: this.seededValue(pSeed + 7) > 0.72,
        universeId,
        galaxyName,
        hasUfoEncounter: this.seededValue(pSeed + 8) > 0.35,
      });
    }

    return {
      universe,
      galaxyName,
      galaxyIndex: safeGalaxyIdx,
      systemIndex: safeSystemIdx,
      star,
      planets,
    };
  },

  warpTo(universeId: number, galaxyIndex = 0, systemIndex = 0): StarSystemData {
    this.currentUniverseId = universeId;
    this.currentGalaxyIndex = galaxyIndex;
    this.currentSystemIndex = systemIndex;
    return this.generateStarSystem(universeId, galaxyIndex, systemIndex);
  },
};

export const ALIEN_SPACE_SYSTEM = {
  totalPlanets: 10000,
  currentPlanet: null as SpacePlanet | null,
  activeUfo: null as AlienUfoState | null,
  islandLandedUfo: null as IslandLandedUfoState | null,
  alienLootInventory: [] as AlienLootItem[],
  equippedAlienGun: null as AlienGunSpec | null,
  earthPowerUpCount: 0,

  alienGuns: [
    {
      id: 'alien_pulse_rifle',
      name: 'Nova Pulse Blaster',
      infiniteEnergy: true,
      damage: 45,
      fireCooldownMs: 140,
      boltColor: '#38bdf8',
    },
    {
      id: 'alien_void_cannon',
      name: 'Dwarf Star Void Cannon',
      infiniteEnergy: true,
      damage: 95,
      fireCooldownMs: 360,
      boltColor: '#c084fc',
    },
  ] as AlienGunSpec[],

  portalGearTiers: [
    { tier: 1, name: 'Standard Rift Core', maxJumpRange: 500 },
    { tier: 2, name: 'Dwarf Star Stabilizer', maxJumpRange: 5000 },
    { tier: 3, name: 'Multiverse Singularity Drive', maxJumpRange: 100000 },
  ] as PortalGearTier[],

  seed(n: number): number {
    const val = Math.sin(n * 12.9898 + 78.233) * 43758.5453;
    return val - Math.floor(val);
  },

  // Generate any of 10,000+ planets on the fly
  getPlanet(planetNumber: number): SpacePlanet {
    const clamped = Math.max(1, Math.min(this.totalPlanets, Math.floor(planetNumber)));
    const s1 = this.seed(clamped);
    const s2 = this.seed(clamped * 3.17);
    const s3 = this.seed(clamped * 7.41);

    const sectors = [
      'Sol Rim',
      'Dwarf Halo',
      'Nebula Drift',
      'Rift Frontier',
      'Outer Void',
    ];
    const biomes = [
      'crystal_crater',
      'crimson_dunes',
      'glow_fungus',
      'obsidian_ash',
      'low_grav_ice',
    ];
    const colors = ['#22d3ee', '#f43f5e', '#a855f7', '#4ade80', '#fbbf24'];
    const sectorName = sectors[clamped % sectors.length];

    const planet: SpacePlanet = {
      id: `sector_planet_${clamped}`,
      name: `${sectorName} ${clamped}`,
      biome: biomes[Math.floor(s1 * biomes.length)],
      color: colors[Math.floor(s2 * colors.length)],
      radius: 5 + s1 * 7,
      orbitDist: 90 + (clamped % 5) * 40,
      gravity: Number((0.2 + s3 * 1.2).toFixed(2)),
      hasRings: s3 > 0.68,
      sectorNumber: clamped,
      alienCount: 3 + Math.floor(s1 * 8),
      hasUfoEncounter: s2 > 0.45,
      universeId: (clamped % 4) + 1,
      galaxyName: sectorName,
    };

    this.currentPlanet = planet;
    if (planet.hasUfoEncounter) {
      this.spawnUfo(planet.name, 150);
    } else {
      this.activeUfo = null;
    }
    return planet;
  },

  equipAlienGun(gunId: string): AlienGunSpec | null {
    const found = this.alienGuns.find((g) => g.id === gunId);
    if (!found) return null;
    this.equippedAlienGun = found;
    return found;
  },

  // Fire alien weapon with zero ammo drain
  fireAlienGun(nowMs = Date.now(), lastShotMs = 0) {
    const gun = this.equippedAlienGun || this.alienGuns[0];
    if (nowMs - lastShotMs < gun.fireCooldownMs) {
      return { fired: false as const, reason: 'cooldown' };
    }
    return {
      fired: true as const,
      gunName: gun.name,
      infiniteEnergy: true,
      ammoRemaining: 'UNLIMITED' as const,
      damage: gun.damage,
      boltColor: gun.boltColor,
    };
  },

  spawnUfo(locationLabel: string, hp = 150): AlienUfoState {
    this.activeUfo = {
      id: `ufo_${Date.now()}`,
      location: locationLabel,
      hp,
      maxHp: hp,
      isDowned: false,
    };
    return this.activeUfo;
  },

  // Deal damage to an active UFO; shoot it down when HP hits 0
  damageUfo(amount: number) {
    if (!this.activeUfo || this.activeUfo.isDowned) return null;
    this.activeUfo.hp = Math.max(0, this.activeUfo.hp - amount);

    if (this.activeUfo.hp === 0) {
      this.activeUfo.isDowned = true;
      const droppedLoot = this.createAlienLoot(
        'ufo_core',
        'Alien Power Core',
        'power_up',
      );
      this.alienLootInventory.push(droppedLoot);
      return { shotDown: true as const, loot: droppedLoot };
    }
    return { shotDown: false as const, hp: this.activeUfo.hp };
  },

  // Land a UFO directly onto the main island with collectible alien loot
  landUfoOnIsland(zoneCoords = { x: 40, y: 0, z: -35 }): IslandLandedUfoState {
    if (this.islandLandedUfo) return this.islandLandedUfo;
    const lootPieces = [
      this.createAlienLoot('portal_coil', 'Rift Portal Coil', 'power_up'),
      this.createAlienLoot('saucer_beacon', 'Glowing Saucer Relic', 'decoration'),
    ];
    this.islandLandedUfo = {
      id: `island_ufo_${Date.now()}`,
      coords: zoneCoords,
      loot: lootPieces,
      claimed: false,
    };
    return this.islandLandedUfo;
  },

  claimIslandUfoLoot(): AlienLootItem[] {
    if (!this.islandLandedUfo || this.islandLandedUfo.claimed) return [];
    this.islandLandedUfo.claimed = true;
    const claimed = [...this.islandLandedUfo.loot];
    this.alienLootInventory.push(...claimed);
    return claimed;
  },

  createAlienLoot(
    id: string,
    name: string,
    mode: 'power_up' | 'decoration' = 'decoration',
  ): AlienLootItem {
    return {
      uid: `${id}_${Math.random().toString(36).slice(2, 7)}`,
      id,
      name,
      mode,
      appliedToEarth: false,
    };
  },

  // Apply collected alien loot either to power up Earth systems/portals or place as decor
  applyAlienLoot(uid: string, action: 'power_up' | 'decoration' = 'decoration') {
    const item = this.alienLootInventory.find((x) => x.uid === uid);
    if (!item) return { ok: false as const, message: 'Loot item not found.' };

    item.mode = action === 'power_up' ? 'power_up' : 'decoration';
    item.appliedToEarth = true;

    if (item.mode === 'power_up') {
      this.earthPowerUpCount += 1;
      return {
        ok: true as const,
        item,
        effect: `Powered up Earth portal & systems using ${item.name}!`,
      };
    }
    return {
      ok: true as const,
      item,
      effect: `Placed ${item.name} as base/island decoration!`,
    };
  },
};

export const SATURN_V_LAUNCH_CONTROLLER = {
  phase: 'PAD' as SaturnVLaunchPhase, // "PAD" | "IGNITION" | "ASCENT" | "ORBIT_READY"
  altitude: 0,
  velocityY: 0,
  thrustAccel: 28,
  gravity: 9.8,
  orbitAltitude: 450,
  stage: 1, // Stage 1 -> Stage 2 -> Orbital Burn
  onOrbitReached: null as (() => void) | null,

  ignite() {
    this.phase = 'IGNITION';
    this.stage = 1;
    this.velocityY = 0;
    return {
      phase: this.phase,
      stage: this.stage,
      cameraShake: 0.35,
    };
  },

  update(dt: number) {
    if (this.phase === 'PAD' || this.phase === 'ORBIT_READY') {
      return {
        phase: this.phase,
        altitude: this.altitude,
        stage: this.stage,
        cameraShake: 0,
      };
    }

    if (this.phase === 'IGNITION') {
      this.phase = 'ASCENT';
    }

    // Stage separation halfway to orbit for authentic Saturn V feel
    if (this.stage === 1 && this.altitude >= this.orbitAltitude * 0.45) {
      this.stage = 2;
    }

    const netAccel = this.thrustAccel - this.gravity;
    this.velocityY = Math.max(0, this.velocityY + netAccel * dt);
    this.altitude += this.velocityY * dt;

    const shakeIntensity = Math.max(
      0.05,
      0.4 * (1 - this.altitude / this.orbitAltitude),
    );

    if (this.altitude >= this.orbitAltitude) {
      this.altitude = this.orbitAltitude;
      this.velocityY = 0;
      this.phase = 'ORBIT_READY';
      if (typeof this.onOrbitReached === 'function') {
        this.onOrbitReached();
      }
    }

    return {
      phase: this.phase,
      altitude: Math.round(this.altitude),
      stage: this.stage,
      cameraShake: this.phase === 'ASCENT' ? shakeIntensity : 0,
    };
  },

  resetToPad() {
    this.phase = 'PAD';
    this.altitude = 0;
    this.velocityY = 0;
    this.stage = 1;
  },
};

export const MOBILE_HUD_ROCKET_CONTROLS = {
  isMinimized: false,
  rocketModeActive: false,
  onResetInputs: null as (() => void) | null,
  onStateChange: null as ((state: { isMinimized: boolean; rocketModeActive: boolean }) => void) | null,

  // Toggle between full gameplay HUD and collapsed/minimal view
  toggleMinimize(): boolean {
    this.isMinimized = !this.isMinimized;
    this.applyHudState();
    return this.isMinimized;
  },

  // Switch cleanly into Rocket Controls so ground/build buttons don't get in the way
  setRocketControls(active = true): boolean {
    this.rocketModeActive = Boolean(active);
    if (this.rocketModeActive) {
      this.isMinimized = false;
    }
    this.applyHudState();
    return this.rocketModeActive;
  },

  applyHudState(): void {
    if (typeof document === 'undefined') return;

    if ((this.isMinimized || this.rocketModeActive) && typeof this.onResetInputs === 'function') {
      this.onResetInputs();
    }

    const clutterSelectors = [
      '.joystick-pad',
      '.action-wheel',
      '.hotbar-strip',
      '.planet-action-card',
    ];

    clutterSelectors.forEach((sel) => {
      document.querySelectorAll<HTMLElement>(sel).forEach((el) => {
        // Hide ground clutter when minimized OR when rocket controls are active
        el.style.display = this.isMinimized || this.rocketModeActive ? 'none' : '';
      });
    });

    const rocketPanel = document.getElementById('rocket-controls-bar');
    if (rocketPanel) {
      rocketPanel.style.display = this.rocketModeActive && !this.isMinimized ? 'flex' : 'none';
    }

    const minBtn = document.getElementById('minimize-hud-btn');
    if (minBtn) {
      minBtn.textContent = this.isMinimized ? 'Show HUD' : 'Minimize';
    }

    if (typeof this.onStateChange === 'function') {
      this.onStateChange({
        isMinimized: this.isMinimized,
        rocketModeActive: this.rocketModeActive,
      });
    }
  },
};
