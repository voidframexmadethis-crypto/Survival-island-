import * as THREE from 'three';

/**
 * Procedural CanvasTexture generators (zero external PNG/JPG 404s).
 * All albedo/color textures explicitly use THREE.SRGBColorSpace.
 */

export function createGroundDetailTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#e5e5e5';
  ctx.fillRect(0, 0, size, size);

  // Organic soil/pebble/grain speckle
  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 0.6 + Math.random() * 2.2;
    const v = 195 + Math.floor(Math.random() * 55);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(36, 36);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function createBarkTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#6b4c35';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 180; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const w = 2 + Math.random() * 6;
    const h = 16 + Math.random() * 44;
    ctx.fillStyle = Math.random() > 0.5 ? 'rgba(42,26,16,0.45)' : 'rgba(130,96,68,0.35)';
    ctx.fillRect(x, y, w, h);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(1, 3);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function createWaterNormalTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8080ff';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 420; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rx = 8 + Math.random() * 22;
    const ry = 3 + Math.random() * 8;
    const r = 115 + Math.floor(Math.random() * 30);
    const g = 115 + Math.floor(Math.random() * 30);
    ctx.fillStyle = `rgba(${r}, ${g}, 255, 0.28)`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(18, 18);
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function createWoodPlankTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#8b5a2b';
  ctx.fillRect(0, 0, size, size);

  // Planks
  for (let p = 0; p < 4; p++) {
    const y = p * 64;
    ctx.fillStyle = p % 2 === 0 ? '#966232' : '#7f5126';
    ctx.fillRect(0, y, size, 62);
    ctx.fillStyle = '#3f2410';
    ctx.fillRect(0, y + 62, size, 2);
    for (let g = 0; g < 22; g++) {
      ctx.fillStyle = 'rgba(55, 30, 12, 0.25)';
      ctx.fillRect(Math.random() * size, y + Math.random() * 60, 40 + Math.random() * 90, 1.5);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function createRockTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#7b7772';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1600; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const r = 1 + Math.random() * 4.5;
    const shade = 85 + Math.floor(Math.random() * 70);
    ctx.fillStyle = `rgba(${shade},${shade - 2},${shade - 5},0.35)`;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // Subtle mineral striations
  for (let i = 0; i < 42; i++) {
    ctx.strokeStyle = i % 2 === 0 ? 'rgba(38,35,32,0.38)' : 'rgba(180,175,168,0.22)';
    ctx.lineWidth = 1 + Math.random() * 1.5;
    ctx.beginPath();
    const sx = Math.random() * size;
    const sy = Math.random() * size;
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + (Math.random() - 0.5) * 60, sy + (Math.random() - 0.5) * 32);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

export function createLeafCanopyTexture(renderer: THREE.WebGLRenderer): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#2d6a32';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 850; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const rx = 4 + Math.random() * 7;
    const ry = 2 + Math.random() * 4;
    const g = 78 + Math.floor(Math.random() * 68);
    ctx.fillStyle = `rgba(${Math.floor(g * 0.42)},${g},${Math.floor(g * 0.45)},0.55)`;
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, Math.random() * Math.PI, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
  return tex;
}

function makeSeededRand(seed: number): () => number {
  let s = seed % 2147483647;
  if (s <= 0) s += 2147483646;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

export function createHolsteinCoatTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(101);

  ctx.fillStyle = '#f8f7f4';
  ctx.fillRect(0, 0, size, size);

  // Distinct organic black Holstein cow patches
  ctx.fillStyle = '#18181b';
  const patches = [
    [45, 55, 52, 38, 0.3],
    [170, 75, 48, 42, -0.4],
    [110, 175, 64, 44, 0.2],
    [220, 185, 40, 34, 0.5],
    [25, 195, 36, 28, -0.2],
    [130, 32, 38, 22, 0.1],
  ];
  for (const [x, y, rx, ry, rot] of patches) {
    ctx.beginPath();
    ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2);
    ctx.fill();
    for (let k = 0; k < 5; k++) {
      ctx.beginPath();
      ctx.ellipse(
        x + (rand() - 0.5) * rx * 1.1,
        y + (rand() - 0.5) * ry * 1.1,
        rx * (0.28 + rand() * 0.25),
        ry * (0.28 + rand() * 0.25),
        rand() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  }

  // Fine short hair grain
  for (let i = 0; i < 1400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.12)' : 'rgba(24,24,27,0.12)';
    ctx.fillRect(x, y, 2.5, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createYorkshirePigTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(202);

  ctx.fillStyle = '#f6b8b0';
  ctx.fillRect(0, 0, size, size);

  // Subtle rosy skin mottling
  for (let i = 0; i < 95; i++) {
    ctx.fillStyle =
      rand() > 0.45 ? 'rgba(232,146,138,0.22)' : 'rgba(252,211,204,0.22)';
    ctx.beginPath();
    ctx.ellipse(
      rand() * size,
      rand() * size,
      8 + rand() * 20,
      5 + rand() * 14,
      rand() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }

  // Coarse sparse light bristles
  for (let i = 0; i < 750; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle = 'rgba(255,244,235,0.42)';
    ctx.lineWidth = 0.9;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 3.5, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createChestnutHorseTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(303);

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#7c3416');
  grad.addColorStop(0.5, '#96401c');
  grad.addColorStop(1, '#6d2c12');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Glossy Quarter Horse coat dapples & fine sleek hair strokes
  for (let i = 0; i < 80; i++) {
    ctx.fillStyle = 'rgba(182,88,42,0.16)';
    ctx.beginPath();
    ctx.ellipse(
      rand() * size,
      rand() * size,
      6 + rand() * 12,
      4 + rand() * 8,
      0,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  for (let i = 0; i < 1800; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle = rand() > 0.5 ? 'rgba(220,130,75,0.14)' : 'rgba(62,22,8,0.16)';
    ctx.fillRect(x, y, 4, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createWoolFleeceTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(404);

  ctx.fillStyle = '#ede8dc';
  ctx.fillRect(0, 0, size, size);

  // Curly textured white wool locks
  for (let i = 0; i < 620; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = 3 + rand() * 5.5;
    ctx.fillStyle = rand() > 0.45 ? 'rgba(255,253,248,0.72)' : 'rgba(210,202,186,0.58)';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(175,166,150,0.35)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createMottledGoatTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(505);

  ctx.fillStyle = '#7c4a26';
  ctx.fillRect(0, 0, size, size);

  // Mottled cream-white & dark chocolate patches
  for (let i = 0; i < 42; i++) {
    ctx.fillStyle = rand() > 0.38 ? '#f5efe6' : '#3d2414';
    ctx.beginPath();
    ctx.ellipse(
      rand() * size,
      rand() * size,
      10 + rand() * 24,
      7 + rand() * 18,
      rand() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  for (let i = 0; i < 1200; i++) {
    ctx.fillStyle = 'rgba(255,248,238,0.14)';
    ctx.fillRect(rand() * size, rand() * size, 3, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createTabbyFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(606);

  ctx.fillStyle = '#b98856';
  ctx.fillRect(0, 0, size, size);

  // Mackerel tabby stripes
  for (let s = 0; s < 14; s++) {
    const x = (s / 14) * size;
    ctx.fillStyle = 'rgba(42,29,19,0.72)';
    ctx.beginPath();
    ctx.ellipse(x, size * 0.5, 5 + (s % 2) * 3, size * 0.46, 0.12, 0, Math.PI * 2);
    ctx.fill();
  }
  for (let i = 0; i < 1100; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(245,220,185,0.22)' : 'rgba(35,22,12,0.2)';
    ctx.fillRect(rand() * size, rand() * size, 3, 1);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createHayTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(707);

  ctx.fillStyle = '#c9972c';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const len = 14 + rand() * 34;
    const ang = (rand() - 0.5) * 0.55;
    ctx.strokeStyle =
      rand() > 0.4 ? 'rgba(234,195,88,0.7)' : 'rgba(138,94,20,0.55)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(ang) * len, y + Math.sin(ang) * len);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createGrizzlyFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(808);

  ctx.fillStyle = '#3b2416';
  ctx.fillRect(0, 0, size, size);

  // Dark chocolate fur depth
  for (let i = 0; i < 1600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle = rand() > 0.45 ? 'rgba(38,22,12,0.55)' : 'rgba(84,52,32,0.45)';
    ctx.lineWidth = 1.4;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 6 + rand() * 5, y + (rand() - 0.5) * 3);
    ctx.stroke();
  }
  // Silver-tipped grizzled guard hairs
  for (let i = 0; i < 650; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle = 'rgba(216,214,208,0.42)';
    ctx.lineWidth = 1.0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4 + rand() * 3, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createWolfFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(909);

  const grad = ctx.createLinearGradient(0, 0, 0, size);
  grad.addColorStop(0, '#475569');
  grad.addColorStop(0.5, '#94a3b8');
  grad.addColorStop(1, '#e2e8f0');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 2000; i++) {
    const x = rand() * size;
    const y = rand() * size;
    const r = rand();
    ctx.strokeStyle =
      r < 0.35
        ? 'rgba(30,41,59,0.45)'
        : r < 0.72
          ? 'rgba(203,213,225,0.4)'
          : 'rgba(248,250,252,0.48)';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 5 + rand() * 4, y + (rand() - 0.5) * 2.5);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createLionFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1010);

  ctx.fillStyle = '#c88d42';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1600; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.fillStyle =
      rand() > 0.5 ? 'rgba(232,184,108,0.22)' : 'rgba(138,88,28,0.2)';
    ctx.fillRect(x, y, 4, 1.2);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createLionManeTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1111);

  ctx.fillStyle = '#2d180c';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1400; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle =
      rand() > 0.35 ? 'rgba(92,50,22,0.52)' : 'rgba(20,10,5,0.65)';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 8 + rand() * 6, y + (rand() - 0.5) * 4);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createRedFoxFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1212);

  ctx.fillStyle = '#d95318';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1700; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle =
      rand() > 0.45 ? 'rgba(249,115,22,0.38)' : 'rgba(154,52,18,0.34)';
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + 4.5, y + (rand() - 0.5) * 2);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createCrocodileScaleTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1313);

  ctx.fillStyle = '#2c3a21';
  ctx.fillRect(0, 0, size, size);

  // Armored osteoderm scale plates
  const cols = 12;
  const rows = 12;
  const cw = size / cols;
  const ch = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const shade = Math.floor((rand() - 0.5) * 18);
      ctx.fillStyle = `rgb(${48 + shade}, ${64 + shade}, ${34 + shade})`;
      ctx.fillRect(c * cw + 1.5, r * ch + 1.5, cw - 3, ch - 3);
      ctx.strokeStyle = 'rgba(15,22,12,0.72)';
      ctx.lineWidth = 1.5;
      ctx.strokeRect(c * cw + 1, r * ch + 1, cw - 2, ch - 2);
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createBisonFurTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1414);

  ctx.fillStyle = '#362014';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 1800; i++) {
    const x = rand() * size;
    const y = rand() * size;
    ctx.strokeStyle =
      rand() > 0.5 ? 'rgba(78,46,26,0.52)' : 'rgba(26,14,8,0.58)';
    ctx.lineWidth = 2.0;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineTo(x + (rand() - 0.5) * 5, y + 6 + rand() * 5);
    ctx.stroke();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

export function createOwlFeatherTexture(anisotropy = 4): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const rand = makeSeededRand(1515);

  ctx.fillStyle = '#5c493c';
  ctx.fillRect(0, 0, size, size);

  // Intricate mottled brown, gray & cream barred plumage
  for (let r = 0; r < 18; r++) {
    const y = (r / 18) * size;
    for (let c = 0; c < 14; c++) {
      const x = (c / 14) * size + (r % 2) * 8;
      ctx.fillStyle =
        rand() > 0.52
          ? 'rgba(214,202,184,0.48)'
          : rand() > 0.3
            ? 'rgba(46,35,28,0.62)'
            : 'rgba(120,113,108,0.52)';
      ctx.beginPath();
      ctx.ellipse(x, y, 7, 3.8, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = anisotropy;
  return tex;
}

