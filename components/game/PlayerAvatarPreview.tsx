'use client';

import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { UserRound } from 'lucide-react';
import { getEquippedBackpackSkin } from '@/game/systems/exchangeManager';
import {
  applyBackpackSkinToPlayerHandle,
  createRemotePlayerMesh,
  type RemotePlayerMeshHandle,
} from '@/game/world/models';
import { createSafeWebGLRenderer } from '@/game/world/webglUtils';

interface PlayerAvatarPreviewProps {
  /** Changes whenever the equipped backpack skin changes. */
  skinKey: string;
  className?: string;
}

/**
 * A small, self-contained turntable of the actual player rig wearing the
 * currently equipped backpack skin. Kept separate from the engine so the
 * inventory screen can show the same cosmetic the world uses.
 */
export function PlayerAvatarPreview({ skinKey, className = '' }: PlayerAvatarPreviewProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = createSafeWebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      }).renderer;
    } catch {
      setWebglUnavailable(true);
      return;
    }
    setWebglUnavailable(false);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 30);
    camera.position.set(2.45, 1.55, 3.55);
    camera.lookAt(0, 1.02, 0);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;

    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight('#fff7ed', '#1c1917', 1.5);
    const keyLight = new THREE.DirectionalLight('#ffffff', 1.8);
    keyLight.position.set(2.5, 3.5, 3);
    const rimLight = new THREE.DirectionalLight('#f59e0b', 0.9);
    rimLight.position.set(-3, 2, -2);
    scene.add(hemi, keyLight, rimLight);

    const floor = new THREE.Mesh(
      new THREE.CircleGeometry(0.82, 36),
      new THREE.MeshStandardMaterial({
        color: 0x1c1917,
        roughness: 0.96,
        metalness: 0.04,
        transparent: true,
        opacity: 0.92,
      }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.012;
    scene.add(floor);

    const handle: RemotePlayerMeshHandle = createRemotePlayerMesh(
      'Explorer',
      0x38bdf8,
      false,
    );
    handle.group.rotation.y = Math.PI * 0.78;
    applyBackpackSkinToPlayerHandle(handle, getEquippedBackpackSkin());
    scene.add(handle.group);

    const resize = () => {
      const width = host.clientWidth || 300;
      const height = host.clientHeight || 260;
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    };
    resize();

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    observer?.observe(host);

    let raf = 0;
    let previousMs = performance.now();
    let elapsed = 0;
    const tick = (nowMs: number) => {
      const dt = Math.min(0.05, Math.max(0, (nowMs - previousMs) / 1000));
      previousMs = nowMs;
      elapsed += dt;
      // Slow turntable so both the face and the equipped pack are readable.
      handle.group.rotation.y = Math.PI * 0.78 + elapsed * 0.34;
      handle.armL.rotation.x = Math.sin(elapsed * 1.35) * 0.055;
      handle.armR.rotation.x = -Math.sin(elapsed * 1.35) * 0.055;
      handle.legL.rotation.x = Math.sin(elapsed * 0.9) * 0.018;
      handle.legR.rotation.x = -Math.sin(elapsed * 0.9) * 0.018;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(raf);
      observer?.disconnect();
      handle.backpackDispose();
      handle.group.traverse((obj) => {
        if (!(obj instanceof THREE.Mesh)) return;
        obj.geometry?.dispose();
        const materials = Array.isArray(obj.material) ? obj.material : [obj.material];
        for (const material of materials) material?.dispose();
      });
      scene.remove(handle.group, floor);
      floor.geometry.dispose();
      if (floor.material instanceof THREE.Material) floor.material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [skinKey]);

  return (
    <div className={`relative isolate overflow-hidden ${className}`}>
      <div
        className="pointer-events-none absolute inset-x-8 bottom-5 h-16 rounded-full bg-amber-500/10 blur-2xl"
        aria-hidden
      />
      <div ref={hostRef} className="absolute inset-0" aria-hidden />
      {webglUnavailable && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-stone-400">
          <UserRound className="h-14 w-14 text-amber-500/70" />
          <span className="text-[11px] font-semibold uppercase tracking-wider">
            3D preview unavailable
          </span>
          <span className="max-w-[190px] text-[10px] leading-relaxed">
            Your equipped pack still applies in the world.
          </span>
        </div>
      )}
    </div>
  );
}
