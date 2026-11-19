import * as THREE from 'three';

export interface UndergroundElevatorHandles {
  root: THREE.Group;
  platformGroup: THREE.Group;
  ramMeshes: THREE.Mesh[];
  beaconMat: THREE.MeshStandardMaterial;
  kioskScreenMat: THREE.MeshStandardMaterial;
  setLiftProgress: (t: number) => void; // 0 = deep underground (-6.2m), 1 = flush with surface (0.14m)
}

/**
 * Builds the 3D Underground Exotic Garage Vault Shaft & Hydraulic Car Elevator
 * positioned right next to the main Vehicle Garage.
 */
export function buildUndergroundCarElevator(): UndergroundElevatorHandles {
  const root = new THREE.Group();

  const concreteMat = new THREE.MeshStandardMaterial({
    color: 0x334155,
    roughness: 0.85,
    metalness: 0.12,
  });
  const darkVaultMat = new THREE.MeshStandardMaterial({
    color: 0x0b1120,
    roughness: 0.72,
    metalness: 0.35,
  });
  const steelMat = new THREE.MeshStandardMaterial({
    color: 0x475569,
    roughness: 0.35,
    metalness: 0.82,
  });
  const chromeMat = new THREE.MeshStandardMaterial({
    color: 0xe2e8f0,
    roughness: 0.14,
    metalness: 0.96,
  });
  const hazardMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    roughness: 0.45,
    metalness: 0.25,
  });
  const ledCyanMat = new THREE.MeshStandardMaterial({
    color: 0x22d3ee,
    emissive: 0x06b6d4,
    emissiveIntensity: 1.6,
    roughness: 0.2,
  });
  const beaconMat = new THREE.MeshStandardMaterial({
    color: 0xf59e0b,
    emissive: 0xf59e0b,
    emissiveIntensity: 0.9,
    roughness: 0.2,
  });
  const kioskScreenMat = new THREE.MeshStandardMaterial({
    color: 0x38bdf8,
    emissive: 0x0ea5e9,
    emissiveIntensity: 1.4,
    roughness: 0.15,
  });

  // 1. Concrete Surface Collar Frame around the Underground Shaft Opening (8.6m x 10.6m)
  const collarW = 8.6;
  const collarL = 10.6;
  const rimThick = 1.1;

  const northRim = new THREE.Mesh(
    new THREE.BoxGeometry(collarW, 0.36, rimThick),
    concreteMat,
  );
  northRim.position.set(0, 0.18, -collarL * 0.5 + rimThick * 0.5);
  const southRim = northRim.clone();
  southRim.position.z = collarL * 0.5 - rimThick * 0.5;

  const westRim = new THREE.Mesh(
    new THREE.BoxGeometry(rimThick, 0.36, collarL - rimThick * 2),
    concreteMat,
  );
  westRim.position.set(-collarW * 0.5 + rimThick * 0.5, 0.18, 0);
  const eastRim = westRim.clone();
  eastRim.position.x = collarW * 0.5 - rimThick * 0.5;
  root.add(northRim, southRim, westRim, eastRim);

  // Hazard yellow trim strips along the collar edges
  const hNorth = new THREE.Mesh(
    new THREE.BoxGeometry(collarW - 1.6, 0.06, 0.28),
    hazardMat,
  );
  hNorth.position.set(0, 0.37, -collarL * 0.5 + 1.05);
  const hSouth = hNorth.clone();
  hSouth.position.z = collarL * 0.5 - 1.05;
  const hWest = new THREE.Mesh(
    new THREE.BoxGeometry(0.28, 0.06, collarL - 1.6),
    hazardMat,
  );
  hWest.position.set(-collarW * 0.5 + 1.05, 0.37, 0);
  const hEast = hWest.clone();
  hEast.position.x = collarW * 0.5 - 1.05;
  root.add(hNorth, hSouth, hWest, hEast);

  // 2. Recessed Underground Garage Vault Shaft (-6.6m deep!)
  const shaftW = collarW - rimThick * 2;
  const shaftL = collarL - rimThick * 2;
  const shaftDepth = 6.6;

  const shaftFloor = new THREE.Mesh(
    new THREE.BoxGeometry(shaftW + 0.4, 0.3, shaftL + 0.4),
    darkVaultMat,
  );
  shaftFloor.position.set(0, -shaftDepth, 0);
  root.add(shaftFloor);

  // 4 Underground Vault Shaft Walls + Glowing Cyan Underground Strip Lights
  const wallN = new THREE.Mesh(
    new THREE.BoxGeometry(shaftW, shaftDepth, 0.22),
    darkVaultMat,
  );
  wallN.position.set(0, -shaftDepth * 0.5, -shaftL * 0.5);
  const wallS = wallN.clone();
  wallS.position.z = shaftL * 0.5;
  const wallW = new THREE.Mesh(
    new THREE.BoxGeometry(0.22, shaftDepth, shaftL),
    darkVaultMat,
  );
  wallW.position.set(-shaftW * 0.5, -shaftDepth * 0.5, 0);
  const wallE = wallW.clone();
  wallE.position.x = shaftW * 0.5;
  root.add(wallN, wallS, wallW, wallE);

  for (const sy of [-1.8, -4.2]) {
    const stripL = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.14, shaftL - 0.8),
      ledCyanMat,
    );
    stripL.position.set(-shaftW * 0.5 + 0.14, sy, 0);
    const stripR = stripL.clone();
    stripR.position.x = shaftW * 0.5 - 0.14;
    root.add(stripL, stripR);
  }

  // 3. Animated Hydraulic Car Elevator Platform + 4 Telescoping Chrome Rams
  const platformGroup = new THREE.Group();
  const deck = new THREE.Mesh(
    new THREE.BoxGeometry(shaftW - 0.25, 0.34, shaftL - 0.25),
    steelMat,
  );
  deck.receiveShadow = true;
  platformGroup.add(deck);

  // Glowing perimeter wheel-guide rails on the elevator platform
  const guideL = new THREE.Mesh(
    new THREE.BoxGeometry(0.16, 0.08, shaftL - 1.2),
    ledCyanMat,
  );
  guideL.position.set(-1.55, 0.2, 0);
  const guideR = guideL.clone();
  guideR.position.x = 1.55;
  platformGroup.add(guideL, guideR);

  // Center turntable ring inlay
  const ring = new THREE.Mesh(
    new THREE.RingGeometry(2.1, 2.35, 32),
    hazardMat,
  );
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = 0.19;
  platformGroup.add(ring);
  root.add(platformGroup);

  const ramMeshes: THREE.Mesh[] = [];
  const ramOffsets: [number, number][] = [
    [-2.1, -3.0],
    [2.1, -3.0],
    [-2.1, 3.0],
    [2.1, 3.0],
  ];
  for (const [rx, rz] of ramOffsets) {
    const ram = new THREE.Mesh(
      new THREE.CylinderGeometry(0.18, 0.22, 1.0, 12),
      chromeMat,
    );
    ram.position.set(rx, -shaftDepth * 0.5, rz);
    root.add(ram);
    ramMeshes.push(ram);
  }

  // 4. Corner Safety Bollards with Amber Warning Beacons
  const cornerCoords: [number, number][] = [
    [-collarW * 0.5 + 0.45, -collarL * 0.5 + 0.45],
    [collarW * 0.5 - 0.45, -collarL * 0.5 + 0.45],
    [-collarW * 0.5 + 0.45, collarL * 0.5 - 0.45],
    [collarW * 0.5 - 0.45, collarL * 0.5 - 0.45],
  ];
  for (const [cx, cz] of cornerCoords) {
    const post = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.18, 1.15, 10),
      steelMat,
    );
    post.position.set(cx, 0.72, cz);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 10, 10),
      beaconMat,
    );
    lamp.position.set(cx, 1.38, cz);
    root.add(post, lamp);
  }

  // 5. Overhead Steel Archway Sign ("UNDERGROUND VAULT LIFT")
  const archL = new THREE.Mesh(
    new THREE.BoxGeometry(0.32, 4.4, 0.32),
    steelMat,
  );
  archL.position.set(-collarW * 0.5 + 0.5, 2.35, -collarL * 0.5 + 0.5);
  const archR = archL.clone();
  archR.position.x = collarW * 0.5 - 0.5;
  const archBeam = new THREE.Mesh(
    new THREE.BoxGeometry(collarW - 0.6, 0.55, 0.42),
    darkVaultMat,
  );
  archBeam.position.set(0, 4.5, -collarL * 0.5 + 0.5);
  const archLight = new THREE.Mesh(
    new THREE.BoxGeometry(collarW - 1.6, 0.14, 0.46),
    ledCyanMat,
  );
  archLight.position.set(0, 4.5, -collarL * 0.5 + 0.5);
  root.add(archL, archR, archBeam, archLight);

  // 6. Standing High-Tech Garage Vault Computer Station (Dual Monitors + Keyboard Deck + AI Core)
  const computerGroup = new THREE.Group();
  computerGroup.position.set(-collarW * 0.5 - 1.15, 0, collarL * 0.5 - 1.2);

  // Heavy brushed-steel computer desk pedestal
  const deskBase = new THREE.Mesh(
    new THREE.BoxGeometry(1.45, 1.05, 0.85),
    steelMat,
  );
  deskBase.position.set(0, 0.53, 0);
  computerGroup.add(deskBase);

  // Angled glowing keyboard & biometric touch deck
  const keyboardDeck = new THREE.Mesh(
    new THREE.BoxGeometry(1.18, 0.08, 0.42),
    darkVaultMat,
  );
  keyboardDeck.position.set(0, 1.08, 0.16);
  keyboardDeck.rotation.x = 0.14;
  const keyGlow = new THREE.Mesh(
    new THREE.BoxGeometry(0.96, 0.03, 0.24),
    ledCyanMat,
  );
  keyGlow.position.set(0, 1.12, 0.17);
  keyGlow.rotation.x = 0.14;
  computerGroup.add(keyboardDeck, keyGlow);

  // Main wide curved-bezel Computer Monitor + AI Voice Core Light
  const monitorStand = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.12, 0.52, 10),
    chromeMat,
  );
  monitorStand.position.set(0, 1.32, -0.18);
  const monitorBezel = new THREE.Mesh(
    new THREE.BoxGeometry(1.42, 0.86, 0.1),
    darkVaultMat,
  );
  monitorBezel.position.set(0, 1.66, -0.16);
  monitorBezel.rotation.x = -0.14;
  const monitorScreen = new THREE.Mesh(
    new THREE.BoxGeometry(1.28, 0.72, 0.05),
    kioskScreenMat,
  );
  monitorScreen.position.set(0, 1.66, -0.1);
  monitorScreen.rotation.x = -0.14;

  // Glowing AI Voice Orb mounted atop the computer monitor
  const aiVoiceOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 14, 14),
    ledCyanMat,
  );
  aiVoiceOrb.position.set(0, 2.22, -0.18);
  computerGroup.add(monitorStand, monitorBezel, monitorScreen, aiVoiceOrb);

  root.add(computerGroup);

  const setLiftProgress = (t: number): void => {
    const clamped = Math.max(0, Math.min(1, t));
    const minY = -6.0;
    const maxY = 0.16;
    const deckY = minY + (maxY - minY) * clamped;
    platformGroup.position.y = deckY;

    const ramHeight = Math.max(0.35, deckY - -shaftDepth);
    for (const ram of ramMeshes) {
      ram.scale.y = ramHeight;
      ram.position.y = -shaftDepth + ramHeight * 0.5;
    }
  };

  // Start flush at surface level ready to receive/summon cars
  setLiftProgress(1);

  return {
    root,
    platformGroup,
    ramMeshes,
    beaconMat,
    kioskScreenMat,
    setLiftProgress,
  };
}
