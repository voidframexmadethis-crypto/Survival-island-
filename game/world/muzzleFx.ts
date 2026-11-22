import * as THREE from 'three';

function makeTexture(
  draw: (ctx: CanvasRenderingContext2D, size: number) => void,
  size = 128,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

/** Hot white core, amber corona and six irregular star spikes. */
export function createMuzzleFlashTexture(): THREE.CanvasTexture | null {
  return makeTexture((ctx, size) => {
    const c = size * 0.5;
    const core = ctx.createRadialGradient(c, c, 0, c, c, size * 0.46);
    core.addColorStop(0, 'rgba(255,255,246,1)');
    core.addColorStop(0.16, 'rgba(255,238,170,0.98)');
    core.addColorStop(0.42, 'rgba(255,166,54,0.62)');
    core.addColorStop(0.72, 'rgba(255,96,10,0.2)');
    core.addColorStop(1, 'rgba(255,70,0,0)');
    ctx.fillStyle = core;
    ctx.fillRect(0, 0, size, size);

    ctx.save();
    ctx.translate(c, c);
    ctx.strokeStyle = 'rgba(255,236,168,0.9)';
    ctx.lineCap = 'round';
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2 + 0.24;
      const len = size * (0.28 + (i % 3) * 0.09);
      ctx.globalAlpha = i % 2 === 0 ? 0.75 : 0.42;
      ctx.lineWidth = i % 2 === 0 ? 4 : 2.2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * size * 0.06, Math.sin(angle) * size * 0.06);
      ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
      ctx.stroke();
    }
    ctx.restore();
  });
}

/** Soft grey powder puff with a hot leading edge. */
export function createMuzzleSmokeTexture(): THREE.CanvasTexture | null {
  return makeTexture((ctx, size) => {
    const c = size * 0.5;
    for (let i = 0; i < 14; i++) {
      const angle = (i / 14) * Math.PI * 2;
      const dist = size * (0.08 + (i % 4) * 0.035);
      const x = c + Math.cos(angle) * dist;
      const y = c + Math.sin(angle) * dist;
      const r = size * (0.2 + (i % 3) * 0.05);
      const puff = ctx.createRadialGradient(x, y, 0, x, y, r);
      puff.addColorStop(0, 'rgba(235,235,235,0.55)');
      puff.addColorStop(0.55, 'rgba(198,198,198,0.26)');
      puff.addColorStop(1, 'rgba(160,160,160,0)');
      ctx.fillStyle = puff;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
    // Faint warm muzzle-side glow baked into the puff.
    const warm = ctx.createRadialGradient(c, c, 0, c, c, size * 0.34);
    warm.addColorStop(0, 'rgba(255,196,120,0.22)');
    warm.addColorStop(1, 'rgba(255,170,80,0)');
    ctx.fillStyle = warm;
    ctx.fillRect(0, 0, size, size);
  });
}
