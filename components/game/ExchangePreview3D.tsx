'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { Box, Image as ImageIcon, RotateCcw } from 'lucide-react';
import {
  ExchangeProduct,
  buildSculptedBackpackMesh,
  getCosmeticImageTexture,
  getCosmeticPatternTexture,
  toBackpackSkinCatalogItem,
} from '@/game/data/exchangeCatalog';
import { createSafeWebGLRenderer } from '@/game/world/webglUtils';

interface ExchangePreview3DProps {
  item: ExchangeProduct;
  heightClass?: string;
}

function buildGunPreviewMesh(item: ExchangeProduct): THREE.Group {
  const group = new THREE.Group();
  const { visual } = item;
  const imgTex = getCosmeticImageTexture(item.productImageUrl);
  const patternTex = imgTex || getCosmeticPatternTexture(visual);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: imgTex ? '#ffffff' : visual.primaryHex,
    map: patternTex,
    metalness: visual.metalness,
    roughness: visual.roughness,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: visual.secondaryHex,
    metalness: Math.min(1, visual.metalness + 0.1),
    roughness: Math.max(0.15, visual.roughness - 0.05),
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: visual.accentHex,
    emissive: visual.emissiveHex ? new THREE.Color(visual.emissiveHex) : new THREE.Color(0x000000),
    emissiveIntensity: visual.emissiveHex ? 0.55 : 0,
    metalness: 0.75,
    roughness: 0.25,
  });

  const wc = item.weaponClass || 'assault_rifle';

  if (wc === 'pistol') {
    const slide = new THREE.Mesh(new THREE.BoxGeometry(0.92, 0.2, 0.18), primaryMat);
    slide.position.set(0.06, 0.16, 0);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(0.84, 0.12, 0.16), secondaryMat);
    frame.position.set(0.02, 0.02, 0);
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.54, 0.16), primaryMat);
    grip.position.set(-0.26, -0.24, 0);
    grip.rotation.z = -0.22;
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.22, 14),
      accentMat,
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.58, 0.16, 0);
    const rail = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.035, 0.12), accentMat);
    rail.position.set(0.1, 0.27, 0);
    group.add(slide, frame, grip, barrel, rail);
  } else if (wc === 'smg') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.26, 0.2), primaryMat);
    body.position.set(0, 0.08, 0);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.045, 0.045, 0.42, 14),
      secondaryMat,
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.72, 0.1, 0);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.13, 0.58, 0.12), accentMat);
    mag.position.set(0.2, -0.32, 0);
    mag.rotation.z = 0.12;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.4, 0.14), secondaryMat);
    grip.position.set(-0.28, -0.24, 0);
    grip.rotation.z = -0.2;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.12), primaryMat);
    stock.position.set(-0.72, 0.08, 0);
    group.add(body, barrel, mag, grip, stock);
  } else if (wc === 'shotgun') {
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.24, 0.2), primaryMat);
    receiver.position.set(-0.08, 0.08, 0);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.055, 1.35, 14),
      secondaryMat,
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.68, 0.15, 0);
    const pump = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.075, 0.48, 12), accentMat);
    pump.rotation.z = Math.PI / 2;
    pump.position.set(0.62, 0.02, 0);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.24, 0.16), primaryMat);
    stock.position.set(-0.78, -0.02, 0);
    stock.rotation.z = 0.12;
    group.add(receiver, barrel, pump, stock);
  } else if (wc === 'sniper_rifle') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 0.18), primaryMat);
    body.position.set(-0.08, 0.05, 0);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.052, 1.35, 16),
      secondaryMat,
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.95, 0.09, 0);
    const scope = new THREE.Mesh(
      new THREE.CylinderGeometry(0.075, 0.065, 0.68, 16),
      accentMat,
    );
    scope.rotation.z = Math.PI / 2;
    scope.position.set(0.05, 0.28, 0);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.24, 0.15), primaryMat);
    stock.position.set(-0.92, 0.0, 0);
    group.add(body, barrel, scope, stock);
  } else if (wc === 'lmg') {
    const body = new THREE.Mesh(new THREE.BoxGeometry(1.25, 0.3, 0.24), primaryMat);
    body.position.set(0, 0.1, 0);
    const boxMag = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.36, 0.34), accentMat);
    boxMag.position.set(0.16, -0.22, 0.04);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.055, 0.065, 0.92, 14),
      secondaryMat,
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(0.98, 0.12, 0);
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.24, 0.18), primaryMat);
    stock.position.set(-0.88, 0.05, 0);
    group.add(body, boxMag, barrel, stock);
  } else {
    // Assault Rifle
    const receiver = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.25, 0.2), primaryMat);
    receiver.position.set(-0.05, 0.08, 0);
    const handguard = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.2, 0.19), secondaryMat);
    handguard.position.set(0.62, 0.08, 0);
    const barrel = new THREE.Mesh(
      new THREE.CylinderGeometry(0.042, 0.046, 0.56, 14),
      secondaryMat,
    );
    barrel.rotation.z = Math.PI / 2;
    barrel.position.set(1.12, 0.1, 0);
    const mag = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.52, 0.14), accentMat);
    mag.position.set(0.18, -0.26, 0);
    mag.rotation.z = 0.22;
    const grip = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.38, 0.14), secondaryMat);
    grip.position.set(-0.28, -0.22, 0);
    grip.rotation.z = -0.24;
    const stock = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.22, 0.15), primaryMat);
    stock.position.set(-0.82, 0.04, 0);
    group.add(receiver, handguard, barrel, mag, grip, stock);
  }

  group.scale.setScalar(1.05);
  return group;
}

function buildBackpackPreviewMesh(item: ExchangeProduct): {
  group: THREE.Group;
  dispose?: () => void;
} {
  const sculpted = buildSculptedBackpackMesh(toBackpackSkinCatalogItem(item));
  const imgTex = getCosmeticImageTexture(item.productImageUrl);
  const patternTex = imgTex || getCosmeticPatternTexture(item.visual);

  // Apply uploaded image / advanced pattern & emissive accent if present, keeping sculpted silhouette
  sculpted.group.traverse((child) => {
    if (
      child instanceof THREE.Mesh &&
      child.material instanceof THREE.MeshStandardMaterial &&
      child.material.map
    ) {
      if (imgTex) {
        child.material.map = patternTex;
        child.material.color.set('#ffffff');
      }
      child.material.metalness = item.visual.metalness;
      child.material.roughness = item.visual.roughness;
      if (item.visual.emissiveHex) {
        child.material.emissive.set(item.visual.emissiveHex);
        child.material.emissiveIntensity = 0.4;
      }
      child.material.needsUpdate = true;
    }
  });

  // Scale up to match the 3D showroom pedestal proportions
  sculpted.group.scale.setScalar(2.35);
  return sculpted;
}

export function ExchangePreview3D({
  item,
  heightClass = 'h-64 sm:h-72',
}: ExchangePreview3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const rotRef = useRef({ x: 0.16, y: -0.55 });
  const draggingRef = useRef(false);
  const lastPtrRef = useRef({ x: 0, y: 0 });
  const [webglFailed, setWebglFailed] = useState(false);

  const hasImage = Boolean(item.previewImageUrl || item.productImageUrl);
  const hasCustom3D = Boolean(item.model3dUrl);
  const itemKey = `${item.id}|${item.model3dUrl || ''}|${item.previewImageUrl || item.productImageUrl || ''}`;
  const defaultViewMode: '3d' | 'image' = hasImage && !hasCustom3D ? 'image' : '3d';
  const [viewOverride, setViewOverride] = useState<{
    key: string;
    mode: '3d' | 'image';
  } | null>(null);
  const viewMode: '3d' | 'image' =
    viewOverride && viewOverride.key === itemKey ? viewOverride.mode : defaultViewMode;
  const setViewMode = (mode: '3d' | 'image') => setViewOverride({ key: itemKey, mode });

  useEffect(() => {
    if (viewMode !== '3d') return;
    const container = containerRef.current;
    if (!container) return;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = createSafeWebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'high-performance',
      }).renderer;
    } catch {
      const rafId = window.requestAnimationFrame(() => setWebglFailed(true));
      return () => window.cancelAnimationFrame(rafId);
    }

    const width = Math.max(160, container.clientWidth);
    const height = Math.max(160, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, width / height, 0.1, 50);
    camera.position.set(0, 0.25, 3.6);
    camera.lookAt(0, 0, 0);

    const hemi = new THREE.HemisphereLight(0xfff4e0, 0x1c1917, 1.35);
    scene.add(hemi);
    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.2);
    keyLight.position.set(3.2, 4.5, 4.0);
    scene.add(keyLight);
    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.1);
    rimLight.position.set(-3.5, 2.0, -3.2);
    scene.add(rimLight);

    const pivot = new THREE.Group();
    scene.add(pivot);

    let disposed = false;
    let fallbackDispose: (() => void) | undefined;

    const attachFallbackModel = () => {
      if (disposed) return;
      fallbackDispose?.();
      fallbackDispose = undefined;
      pivot.clear();
      if (item.category === 'gun_skin') {
        pivot.add(buildGunPreviewMesh(item));
      } else {
        const built = buildBackpackPreviewMesh(item);
        fallbackDispose = built.dispose;
        pivot.add(built.group);
      }
    };

    if (item.model3dUrl) {
      const loader = new GLTFLoader();
      loader.load(
        item.model3dUrl,
        (gltf) => {
          if (disposed) return;
          pivot.clear();
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
          const maxDim = Math.max(size.x, size.y, size.z, 0.001);
          const scale = 2.0 / maxDim;
          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));
          pivot.add(model);
        },
        undefined,
        () => {
          attachFallbackModel();
        },
      );
    } else {
      attachFallbackModel();
    }

    const pedestal = new THREE.Mesh(
      new THREE.CylinderGeometry(1.15, 1.25, 0.08, 32),
      new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        metalness: 0.6,
        roughness: 0.4,
      }),
    );
    pedestal.position.y = -0.92;
    scene.add(pedestal);

    rotRef.current = { x: 0.14, y: -0.55 };

    let rafId = 0;
    let lastTime = performance.now();
    const animate = (now: number) => {
      rafId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;
      if (!draggingRef.current) {
        rotRef.current.y += dt * 0.45;
      }
      pivot.rotation.y = rotRef.current.y;
      pivot.rotation.x = rotRef.current.x;
      renderer?.render(scene, camera);
    };
    rafId = window.requestAnimationFrame(animate);

    const onResize = () => {
      if (!container || !renderer) return;
      const w = Math.max(160, container.clientWidth);
      const h = Math.max(160, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(rafId);
      window.removeEventListener('resize', onResize);
      fallbackDispose?.();
      scene.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry?.dispose();
          const mat = obj.material;
          if (Array.isArray(mat)) {
            mat.forEach((m) => m.dispose());
          } else if (mat) {
            mat.dispose();
          }
        }
      });
      renderer?.dispose();
      if (container) container.innerHTML = '';
    };
  }, [item, viewMode]);

  const activeImageSrc = item.previewImageUrl || item.productImageUrl || null;

  return (
    <div
      className={`relative w-full ${heightClass} rounded-xl border border-stone-800 bg-gradient-to-b from-stone-900 via-stone-950 to-black overflow-hidden select-none`}
    >
      {viewMode === 'image' && activeImageSrc ? (
        <div className="w-full h-full flex items-center justify-center p-4">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={activeImageSrc}
            alt={item.name}
            className="max-w-full max-h-full object-contain rounded-lg shadow-2xl"
          />
        </div>
      ) : webglFailed ? (
        <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
          <div
            className="w-24 h-24 rounded-2xl border border-stone-700 shadow-inner"
            style={{
              background: `linear-gradient(135deg, ${item.visual.primaryHex} 0%, ${item.visual.secondaryHex} 55%, ${item.visual.accentHex} 100%)`,
            }}
          />
          <div className="text-xs font-semibold text-stone-300">{item.name}</div>
          <div className="text-[11px] text-stone-500">3D preview unavailable on this device</div>
        </div>
      ) : (
        <div
          ref={containerRef}
          className="w-full h-full cursor-grab active:cursor-grabbing touch-none"
          onPointerDown={(e) => {
            draggingRef.current = true;
            lastPtrRef.current = { x: e.clientX, y: e.clientY };
            (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
          }}
          onPointerMove={(e) => {
            if (!draggingRef.current) return;
            const dx = e.clientX - lastPtrRef.current.x;
            const dy = e.clientY - lastPtrRef.current.y;
            lastPtrRef.current = { x: e.clientX, y: e.clientY };
            rotRef.current.y += dx * 0.012;
            rotRef.current.x = Math.max(-0.75, Math.min(0.75, rotRef.current.x + dy * 0.01));
          }}
          onPointerUp={(e) => {
            draggingRef.current = false;
            try {
              (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId);
            } catch {
              // ignore
            }
          }}
          onPointerCancel={() => {
            draggingRef.current = false;
          }}
        />
      )}

      {/* Top-left mode switcher */}
      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
        {hasImage && (
          <button
            type="button"
            onClick={() => setViewMode(viewMode === 'image' ? '3d' : 'image')}
            className="px-2.5 py-1.5 rounded-lg bg-stone-950/90 hover:bg-stone-800 border border-stone-700/80 text-[11px] font-semibold text-stone-200 flex items-center gap-1.5 transition"
          >
            {viewMode === 'image' ? (
              <>
                <Box className="w-3.5 h-3.5 text-amber-400" />
                <span>3D View</span>
              </>
            ) : (
              <>
                <ImageIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Image</span>
              </>
            )}
          </button>
        )}
        {hasCustom3D && viewMode === '3d' && (
          <span className="px-2 py-1 rounded-md bg-emerald-950/85 border border-emerald-500/50 text-[10px] font-bold text-emerald-300 uppercase">
            Custom 3D
          </span>
        )}
      </div>

      {/* Bottom controls */}
      {viewMode === '3d' && !webglFailed && (
        <div className="pointer-events-none absolute inset-x-3 bottom-2.5 flex items-center justify-between">
          <span className="px-2 py-1 rounded-md bg-stone-950/80 border border-stone-800 text-[10px] font-medium text-stone-400">
            Drag to rotate 3D preview
          </span>
          <button
            type="button"
            onClick={() => {
              rotRef.current = { x: 0.14, y: -0.55 };
            }}
            className="pointer-events-auto px-2 py-1 rounded-md bg-stone-950/85 hover:bg-stone-800 border border-stone-700 text-[10px] font-semibold text-stone-200 flex items-center gap-1 transition"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>
      )}
    </div>
  );
}
