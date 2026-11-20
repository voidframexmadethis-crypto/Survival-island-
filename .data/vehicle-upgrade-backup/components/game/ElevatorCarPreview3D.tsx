'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { RotateCcw } from 'lucide-react';
import { ExoticElevatorCar } from '@/game/systems/undergroundElevator';
import {
  buildRealLifeCarRig,
  GarageCarVisualConfig,
  normalizeCarArchetype,
  RealLifeCarRig,
  VehicleArchetype,
} from '@/game/world/realLifeCarRig';

interface ElevatorCarPreview3DProps {
  car: ExoticElevatorCar;
}

export function toGarageVisualConfig(car: ExoticElevatorCar): GarageCarVisualConfig {
  let archetype: VehicleArchetype = normalizeCarArchetype(
    `${car.id} ${car.name} ${car.rarity}`,
  );
  if (archetype === 'generic_car' && car.class !== 'Show & Hydraulics') {
    archetype = 'mclaren';
  }
  const isTahoe = archetype === 'chevy_tahoe';
  const isCadillac = archetype === 'cadillac';
  const isDonk = archetype === 'donk';

  return {
    id: car.id,
    displayName: car.name,
    archetype,
    paintColor: car.livery?.bodyColor ?? car.paintColor,
    secondaryColor: car.accentColor,
    rimColor: car.rimColor,
    underglowColor: car.underglowColor,
    wheelRadius: isTahoe ? 0.56 : isDonk ? 0.6 : isCadillac ? 0.36 : 0.38,
    wheelWidth: isTahoe ? 0.34 : isCadillac ? 0.24 : 0.3,
    wheelBaseZ: isTahoe ? 1.44 : isCadillac ? 1.42 : 1.38,
    trackWidthX: isTahoe ? 1.98 : isCadillac ? 1.88 : 1.84,
    hasSubwooferWall: Boolean(car.hasSubwooferWall),
    liveryText: car.livery
      ? {
          title: car.livery.channelName,
          badge: car.livery.ctaText,
          accentColor: car.livery.accentColor,
        }
      : undefined,
  };
}

export function ElevatorCarPreview3D({ car }: ElevatorCarPreview3DProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const yawRef = useRef(-0.58);
  const pitchRef = useRef(0.18);
  const draggingRef = useRef(false);
  const lastPtrRef = useRef({ x: 0, y: 0 });
  const [webglFailed, setWebglFailed] = useState(false);

  const visualConfig = useMemo(() => toGarageVisualConfig(car), [car]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isSoftwareGl = (() => {
      try {
        const probe = document.createElement('canvas');
        const gl = probe.getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: !isSoftwareGl,
        alpha: true,
        powerPreference: 'high-performance',
      });
    } catch {
      const id = window.requestAnimationFrame(() => setWebglFailed(true));
      return () => window.cancelAnimationFrame(id);
    }

    const width = Math.max(220, container.clientWidth);
    const height = Math.max(180, container.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    renderer.shadowMap.enabled = !isSoftwareGl;
    renderer.shadowMap.type = THREE.PCFShadowMap;

    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const envTarget = pmremGenerator.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = envTarget.texture;
    pmremGenerator.dispose();

    const camera = new THREE.PerspectiveCamera(35, width / height, 0.1, 60);
    camera.position.set(0, 1.35, 5.4);
    camera.lookAt(0, 0.55, 0);

    // Warm key + cool Hemisphere fill + cyan/underneath rim
    const hemi = new THREE.HemisphereLight(0xdbeafe, 0x1e293b, 1.25);
    scene.add(hemi);

    const keyLight = new THREE.DirectionalLight(0xfff1d6, 2.3);
    keyLight.position.set(4.2, 5.5, 4.5);
    keyLight.castShadow = !isSoftwareGl;
    keyLight.shadow.mapSize.width = 1024;
    keyLight.shadow.mapSize.height = 1024;
    keyLight.shadow.camera.near = 0.5;
    keyLight.shadow.camera.far = 20;
    keyLight.shadow.camera.left = -3.5;
    keyLight.shadow.camera.right = 3.5;
    keyLight.shadow.camera.top = 3.5;
    keyLight.shadow.camera.bottom = -3.5;
    keyLight.shadow.bias = -0.0005;
    keyLight.shadow.normalBias = 0.02;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x38bdf8, 1.15);
    rimLight.position.set(-4.0, 2.6, -4.0);
    scene.add(rimLight);

    const pivot = new THREE.Group();
    scene.add(pivot);

    // Showroom turntable platform
    const turntableMat = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      metalness: 0.78,
      roughness: 0.28,
    });
    const turntableGeo = new THREE.CylinderGeometry(2.75, 2.9, 0.1, 48);
    const turntable = new THREE.Mesh(turntableGeo, turntableMat);
    turntable.position.y = -0.06;
    turntable.receiveShadow = true;
    pivot.add(turntable);

    const ringMat = new THREE.MeshStandardMaterial({
      color: car.underglowColor || '#38bdf8',
      emissive: car.underglowColor || '#38bdf8',
      emissiveIntensity: 1.6,
      roughness: 0.25,
    });
    const ringGeo = new THREE.TorusGeometry(2.74, 0.03, 10, 56);
    ringGeo.rotateX(Math.PI / 2);
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.position.y = 0.0;
    pivot.add(ringMesh);

    const rig: RealLifeCarRig = buildRealLifeCarRig(visualConfig);
    pivot.add(rig.root);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    yawRef.current = -0.58;
    pitchRef.current = 0.16;

    let disposed = false;
    let frameId = 0;
    let lastTime = performance.now();

    function afterDraw(cb: () => void) {
      if (!renderer || disposed) return;
      try {
        const gl = renderer.getContext() as WebGL2RenderingContext;
        const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
        gl.flush();
        const poll = () => {
          if (disposed) {
            if (sync) gl.deleteSync(sync);
            return;
          }
          const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
          if (state === gl.UNSIGNALED) {
            frameId = window.setTimeout(poll, 5);
          } else {
            if (sync) gl.deleteSync(sync);
            frameId = window.setTimeout(cb, 80);
          }
        };
        frameId = window.setTimeout(poll, 5);
      } catch {
        frameId = window.setTimeout(cb, 80);
      }
    }

    const tick = () => {
      if (disposed || !renderer) return;
      const now = performance.now();
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      if (!draggingRef.current) {
        yawRef.current += dt * 0.42;
      }

      pivot.rotation.y = yawRef.current;
      pivot.rotation.x = THREE.MathUtils.damp(pivot.rotation.x, pitchRef.current, 10, dt);

      if (rig.subCones.length > 0) {
        const pulse = Math.sin(now * 0.008) * 0.5 + 0.5;
        for (const cone of rig.subCones) {
          const baseZ = (cone.userData.baseZ as number | undefined) ?? -0.6;
          cone.position.z = baseZ + pulse * 0.032;
        }
      }

      renderer.render(scene, camera);

      if (isSoftwareGl) {
        afterDraw(tick);
      } else {
        frameId = window.requestAnimationFrame(tick);
      }
    };

    if (isSoftwareGl) {
      renderer.render(scene, camera);
      afterDraw(tick);
    } else {
      frameId = window.requestAnimationFrame(tick);
    }

    const onResize = () => {
      if (!container || !renderer || disposed) return;
      const w = Math.max(220, container.clientWidth);
      const h = Math.max(180, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(frameId);
      window.removeEventListener('resize', onResize);
      rig.dispose();
      turntableGeo.dispose();
      turntableMat.dispose();
      ringGeo.dispose();
      ringMat.dispose();
      envTarget.dispose();
      renderer?.dispose();
      if (container) container.innerHTML = '';
    };
  }, [car.underglowColor, visualConfig]);

  if (webglFailed) {
    return (
      <div className="relative h-48 sm:h-56 flex flex-col items-center justify-center">
        <div
          className="w-64 h-20 rounded-2xl border border-white/25 shadow-2xl flex items-center justify-center px-4 text-xs font-black text-white uppercase tracking-wider"
          style={{
            background: `linear-gradient(135deg, ${car.paintColor} 0%, ${car.accentColor} 100%)`,
          }}
        >
          {car.name}
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-48 sm:h-56 w-full rounded-xl overflow-hidden select-none">
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
          yawRef.current += dx * 0.012;
          pitchRef.current = Math.max(-0.2, Math.min(0.45, pitchRef.current + dy * 0.008));
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
      <div className="pointer-events-none absolute inset-x-2 bottom-2 flex items-center justify-between">
        <span className="px-2 py-0.5 rounded bg-slate-950/85 border border-white/10 text-[10px] font-semibold text-stone-300">
          3D {visualConfig.archetype.replace('_', ' ').toUpperCase()} · Drag to rotate
        </span>
        <button
          type="button"
          onClick={() => {
            yawRef.current = -0.58;
            pitchRef.current = 0.16;
          }}
          className="pointer-events-auto px-2 py-0.5 rounded bg-slate-950/90 hover:bg-slate-800 border border-white/15 text-[10px] font-bold text-stone-200 flex items-center gap-1 transition"
        >
          <RotateCcw className="w-3 h-3" />
          <span>Reset</span>
        </button>
      </div>
    </div>
  );
}
