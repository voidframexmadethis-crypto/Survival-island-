'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { buildSculptedBackpackMesh, SkinCatalogItem } from '@/game/data/exchangeCatalog';
import { applySafeStandardMaps, ensureGeometryHasUv } from '@/game/world/textures';
import { extractPayhipCheckoutUrl } from './PayhipMarketplaceModal';

function buildSculptedWeaponPreviewMesh(item: SkinCatalogItem): {
  group: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const bodyMat = new THREE.MeshStandardMaterial({
    color: item.primaryHex || '#1e293b',
    roughness: 0.36,
    metalness: 0.72,
  });
  const trimMat = new THREE.MeshStandardMaterial({
    color: item.secondaryHex || '#0f172a',
    roughness: 0.48,
    metalness: 0.55,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: item.accentHex || '#f59e0b',
    roughness: 0.28,
    metalness: 0.85,
  });
  disposables.push(bodyMat, trimMat, accentMat);

  const receiverGeo = new THREE.BoxGeometry(0.56, 0.14, 0.11);
  const receiver = new THREE.Mesh(receiverGeo, bodyMat);
  receiver.name = 'sculpted_weapon_main';

  const barrelGeo = new THREE.CylinderGeometry(0.024, 0.028, 0.44, 12);
  barrelGeo.rotateZ(Math.PI / 2);
  const barrel = new THREE.Mesh(barrelGeo, trimMat);
  barrel.position.set(0.46, 0.02, 0);

  const shroudGeo = new THREE.BoxGeometry(0.26, 0.09, 0.09);
  const shroud = new THREE.Mesh(shroudGeo, bodyMat);
  shroud.position.set(0.32, 0.02, 0);
  shroud.name = 'sculpted_weapon_shroud';

  const stockGeo = new THREE.BoxGeometry(0.28, 0.12, 0.09);
  const stock = new THREE.Mesh(stockGeo, trimMat);
  stock.position.set(-0.38, -0.02, 0);

  const gripGeo = new THREE.BoxGeometry(0.075, 0.18, 0.07);
  const grip = new THREE.Mesh(gripGeo, trimMat);
  grip.position.set(-0.14, -0.14, 0);
  grip.rotation.z = -0.25;

  const magGeo = new THREE.BoxGeometry(0.085, 0.21, 0.065);
  const mag = new THREE.Mesh(magGeo, accentMat);
  mag.position.set(0.08, -0.15, 0);
  mag.rotation.z = 0.16;

  const opticGeo = new THREE.BoxGeometry(0.16, 0.055, 0.065);
  const optic = new THREE.Mesh(opticGeo, accentMat);
  optic.position.set(0.0, 0.1, 0);

  group.add(receiver, barrel, shroud, stock, grip, mag, optic);
  disposables.push(receiverGeo, barrelGeo, shroudGeo, stockGeo, gripGeo, magGeo, opticGeo);

  return {
    group,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

export interface CustomMarketplaceSkin extends SkinCatalogItem {
  mediaDataUrl?: string;
  mediaKind?: 'image' | 'glb' | 'none';
}

export interface BlankPhoneMarketplaceProps {
  isOpen: boolean;
  skins: CustomMarketplaceSkin[];
  unlockedIds: string[];
  equippedBackpackId: string | null;
  equippedWeaponId: string | null;
  onAddUploadedSkin: (skin: CustomMarketplaceSkin) => void;
  onAttachCheckout: (skinId: string, payhipUrl: string, priceLabel: string) => void;
  onUnlockSkin: (skinId: string) => void;
  onEquipSkin: (skin: CustomMarketplaceSkin) => void;
  onClose: () => void;
}

export const BlankPhoneMarketplaceModal: React.FC<BlankPhoneMarketplaceProps> = ({
  isOpen,
  skins,
  unlockedIds,
  equippedBackpackId,
  equippedWeaponId,
  onAddUploadedSkin,
  onAttachCheckout,
  onUnlockSkin,
  onEquipSkin,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>('');
  const [activeTool, setActiveTool] = useState<'none' | 'upload_skin' | 'add_checkout'>('none');
  const [checkoutState, setCheckoutState] = useState<{ skinId: string; url: string } | null>(
    null,
  );
  const [statusMsg, setStatusMsg] = useState<string>('');

  // "+ Skin Upload" state (no pre-filled item names or placeholder skins)
  const [uploadName, setUploadName] = useState('');
  const [uploadSlot, setUploadSlot] = useState<'backpack' | 'weapon'>('backpack');
  const [uploadMediaUrl, setUploadMediaUrl] = useState('');
  const [uploadMediaKind, setUploadMediaKind] = useState<'image' | 'glb' | 'none'>('none');
  const [unlockCode, setUnlockCode] = useState('');
  const [enteredCode, setEnteredCode] = useState('');

  // "+ Checkout" state (for pasting your Payhip embedded checkout)
  const [targetSkinId, setTargetSkinId] = useState('');
  const [payhipInput, setPayhipInput] = useState('');
  const [priceText, setPriceText] = useState('');
  const [webglUnavailable, setWebglUnavailable] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewContainerRef = useRef<HTMLDivElement | null>(null);

  const selectedSkin = useMemo(
    () => skins.find((s) => s.id === selectedId) ?? skins[0] ?? null,
    [skins, selectedId],
  );

  const resolvedTargetSkinId = targetSkinId || selectedSkin?.id || skins[0]?.id || '';
  const checkoutUrlActive =
    checkoutState && selectedSkin && checkoutState.skinId === selectedSkin.id
      ? checkoutState.url
      : null;

  // Live 3D turntable preview for uploaded backpack/weapon skins
  useEffect(() => {
    if (!isOpen || !selectedSkin || !previewContainerRef.current || checkoutUrlActive) return;

    const host = previewContainerRef.current;
    const w = host.clientWidth || 260;
    const h = host.clientHeight || 220;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      });
    } catch {
      const rafFallback = requestAnimationFrame(() => setWebglUnavailable(true));
      return () => cancelAnimationFrame(rafFallback);
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, w / h, 0.1, 20);
    camera.position.set(0, 0.15, 1.55);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(w, h);

    host.innerHTML = '';
    host.appendChild(renderer.domElement);

    const hemi = new THREE.HemisphereLight('#ffffff', '#1e293b', 1.35);
    const dir = new THREE.DirectionalLight('#ffffff', 1.6);
    dir.position.set(2, 3, 2.5);
    scene.add(hemi, dir);

    const pivot = new THREE.Group();
    pivot.rotation.y = Math.PI * 0.82;
    scene.add(pivot);

    let disposed = false;
    let uploadedTex: THREE.Texture | null = null;
    let gltfGroup: THREE.Object3D | null = null;
    let rig: { group: THREE.Group; dispose: () => void } | null = null;

    const attachSculptedFallback = () => {
      if (disposed) return;
      rig =
        selectedSkin.category === 'weapon'
          ? buildSculptedWeaponPreviewMesh(selectedSkin)
          : buildSculptedBackpackMesh(selectedSkin);
      if (selectedSkin.mediaDataUrl && selectedSkin.mediaKind === 'image') {
        const loader = new THREE.TextureLoader();
        uploadedTex = loader.load(
          selectedSkin.mediaDataUrl,
          (loaded) => {
            if (disposed) {
              loaded.dispose();
              return;
            }
            loaded.colorSpace = THREE.SRGBColorSpace;
            loaded.needsUpdate = true;
            rig?.group.traverse((obj) => {
              if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
                const isPrimarySurface =
                  obj.material.map !== null ||
                  obj.name === 'sculpted_backpack_main' ||
                  obj.name === 'sculpted_weapon_main' ||
                  obj.name === 'sculpted_weapon_shroud';
                if (isPrimarySurface) {
                  if (obj.geometry instanceof THREE.BufferGeometry) {
                    ensureGeometryHasUv(obj.geometry);
                  }
                  obj.material.color.set('#ffffff');
                  applySafeStandardMaps(obj.material, { map: loaded });
                }
              }
            });
          },
          undefined,
          () => {
            if (!disposed) {
              setStatusMsg('Could not decode uploaded image texture — using solid skin finish.');
            }
          },
        );
      }
      pivot.add(rig.group);
    };

    if (selectedSkin.mediaDataUrl && selectedSkin.mediaKind === 'glb') {
      const gltfLoader = new GLTFLoader();
      gltfLoader.load(
        selectedSkin.mediaDataUrl,
        (gltf) => {
          if (disposed) return;
          const model = gltf.scene;
          const box = new THREE.Box3().setFromObject(model);
          const size = new THREE.Vector3();
          const center = new THREE.Vector3();
          box.getSize(size);
          box.getCenter(center);
          const maxDim = Math.max(size.x, size.y, size.z, 0.001);
          const scale = 0.85 / maxDim;
          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));
          gltfGroup = model;
          pivot.add(model);
        },
        undefined,
        () => {
          attachSculptedFallback();
        },
      );
    } else {
      attachSculptedFallback();
    }

    let raf = 0;
    let prevMs = performance.now();
    const tick = (nowMs: number) => {
      const dt = Math.min((nowMs - prevMs) / 1000, 0.05);
      prevMs = nowMs;
      pivot.rotation.y += dt * 0.8;
      renderer?.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      uploadedTex?.dispose();
      rig?.dispose();
      if (gltfGroup) {
        gltfGroup.traverse((obj) => {
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
      }
      renderer?.dispose();
      if (renderer && renderer.domElement.parentNode === host) {
        host.removeChild(renderer.domElement);
      }
    };
  }, [isOpen, selectedSkin, checkoutUrlActive]);

  if (!isOpen) return null;

  const handlePhoneFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isGlb = file.name.toLowerCase().endsWith('.glb');
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setUploadMediaUrl(reader.result);
        setUploadMediaKind(isGlb ? 'glb' : 'image');
        if (!uploadName.trim()) {
          setUploadName(file.name.replace(/\.[^/.]+$/, ''));
        }
        setStatusMsg(`Selected "${file.name}" from phone.`);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSkinFromPhone = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = uploadName.trim();
    if (!finalName) {
      setStatusMsg('Enter a skin name before saving.');
      return;
    }

    const created: CustomMarketplaceSkin = {
      id: `skin-${Date.now()}`,
      name: finalName,
      category: uploadSlot,
      priceLabel: '',
      payhipUrl: '',
      unlockCode: unlockCode.trim(),
      primaryHex: '#ffffff',
      secondaryHex: '#18181b',
      accentHex: '#f59e0b',
      pattern: 'solid',
      mediaDataUrl: uploadMediaUrl || undefined,
      mediaKind: uploadMediaKind,
    };

    onAddUploadedSkin(created);
    setSelectedId(created.id);
    setTargetSkinId(created.id);
    setUploadName('');
    setUploadMediaUrl('');
    setUploadMediaKind('none');
    setUnlockCode('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    setActiveTool('none');
    setStatusMsg(`Added "${created.name}" (${created.category}).`);
  };

  const handleSaveCheckout = (e: React.FormEvent) => {
    e.preventDefault();
    const targetId = resolvedTargetSkinId;
    if (!targetId) {
      setStatusMsg('Upload a skin first so it has a target to attach checkout to.');
      return;
    }

    const cleanUrl = extractPayhipCheckoutUrl(payhipInput);
    if (!cleanUrl) {
      setStatusMsg('Paste a valid Payhip URL or Payhip embedded checkout snippet.');
      return;
    }

    onAttachCheckout(targetId, cleanUrl, priceText.trim());
    setPayhipInput('');
    setPriceText('');
    setActiveTool('none');
    setStatusMsg('Embedded Payhip checkout saved.');
  };

  const isUnlocked = selectedSkin
    ? !selectedSkin.payhipUrl ||
      !selectedSkin.unlockCode ||
      unlockedIds.includes(selectedSkin.id)
    : false;

  const isEquipped = selectedSkin
    ? selectedSkin.category === 'backpack'
      ? equippedBackpackId === selectedSkin.id
      : equippedWeaponId === selectedSkin.id
    : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-2.5"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 text-white">
        {/* Header with Two Separate "+" Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 bg-zinc-900 px-3.5 py-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTool('upload_skin');
                fileInputRef.current?.click();
              }}
              className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-xl font-black text-black hover:bg-emerald-400"
              title="Upload Gun or Backpack Skin from Phone"
              aria-label="Add Skin from Phone"
            >
              +
            </button>
            <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              Skin
            </span>

            <button
              type="button"
              onClick={() => {
                setTargetSkinId(selectedSkin?.id || skins[0]?.id || '');
                setActiveTool((prev) => (prev === 'add_checkout' ? 'none' : 'add_checkout'));
              }}
              className="ml-2 flex h-9 w-9 items-center justify-center rounded-xl bg-amber-500 text-xl font-black text-black hover:bg-amber-400"
              title="Add Payhip Embedded Checkout"
              aria-label="Add Embedded Checkout"
            >
              +
            </button>
            <span className="text-xs font-extrabold uppercase tracking-wider text-amber-400">
              Checkout
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
          >
            Close
          </button>
        </div>

        {/* Hidden Phone File Picker */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,.glb"
          onChange={handlePhoneFileChange}
          className="hidden"
        />

        {/* Tool 1: + Skin Upload Drawer (Phone File + Gun/Backpack Slot) */}
        {activeTool === 'upload_skin' && (
          <form
            onSubmit={handleSaveSkinFromPhone}
            className="grid grid-cols-1 gap-2.5 border-b border-zinc-800 bg-zinc-900/90 p-3.5 sm:grid-cols-12"
          >
            <input
              type="text"
              value={uploadName}
              onChange={(e) => setUploadName(e.target.value)}
              placeholder="Skin name"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white sm:col-span-4"
            />

            <select
              value={uploadSlot}
              onChange={(e) => setUploadSlot(e.target.value as 'backpack' | 'weapon')}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white sm:col-span-3"
            >
              <option value="backpack">Backpack Skin</option>
              <option value="weapon">Gun Skin</option>
            </select>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-dashed border-emerald-500/70 bg-zinc-950 px-3 py-2 text-xs font-bold text-emerald-300 sm:col-span-3"
            >
              {uploadMediaKind === 'none'
                ? 'Pick Phone File'
                : `File Ready (${uploadMediaKind})`}
            </button>

            <input
              type="text"
              value={unlockCode}
              onChange={(e) => setUnlockCode(e.target.value)}
              placeholder="Unlock code (optional)"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white sm:col-span-2"
            />

            <button
              type="submit"
              className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-black uppercase text-black hover:bg-emerald-400 sm:col-span-12"
            >
              Save Skin to Marketplace
            </button>
          </form>
        )}

        {/* Tool 2: + Checkout Drawer (Paste Payhip Embedded Checkout) */}
        {activeTool === 'add_checkout' && (
          <form
            onSubmit={handleSaveCheckout}
            className="grid grid-cols-1 gap-2.5 border-b border-zinc-800 bg-zinc-900/90 p-3.5 sm:grid-cols-12"
          >
            <select
              value={resolvedTargetSkinId}
              onChange={(e) => setTargetSkinId(e.target.value)}
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white sm:col-span-4"
            >
              {skins.length === 0 ? (
                <option value="">Upload a skin first</option>
              ) : (
                skins.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.category})
                  </option>
                ))
              )}
            </select>

            <input
              type="text"
              value={payhipInput}
              onChange={(e) => setPayhipInput(e.target.value)}
              placeholder="Paste Payhip embedded checkout URL or HTML"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white sm:col-span-5"
            />

            <input
              type="text"
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              placeholder="Price label"
              className="rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white sm:col-span-3"
            />

            <button
              type="submit"
              className="rounded-lg bg-amber-500 px-4 py-2 text-xs font-black uppercase text-black hover:bg-amber-400 sm:col-span-12"
            >
              Save Payhip Checkout
            </button>
          </form>
        )}

        {statusMsg && (
          <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-2 text-xs font-medium text-zinc-200">
            {statusMsg}
          </div>
        )}

        {/* Empty Marketplace Body Until You Upload Your Own Skins */}
        {skins.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
            <p className="text-sm font-bold text-zinc-300">Marketplace is blank.</p>
            <p className="mt-1 text-xs text-zinc-500">
              Tap the green <span className="font-bold text-emerald-400">+</span> to upload a
              gun or backpack skin from your phone, then tap the amber{' '}
              <span className="font-bold text-amber-400">+</span> to attach your Payhip checkout.
            </p>
          </div>
        ) : (
          <div className="grid flex-1 grid-cols-1 overflow-y-auto md:grid-cols-12">
            {/* Uploaded Skins List */}
            <div className="border-b border-zinc-800 p-3 md:col-span-4 md:border-b-0 md:border-r">
              <div className="space-y-2">
                {skins.map((skin) => (
                  <button
                    key={skin.id}
                    type="button"
                    onClick={() => {
                      setSelectedId(skin.id);
                      setCheckoutState(null);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left ${
                      selectedSkin?.id === skin.id
                        ? 'border-amber-400 bg-amber-500/15'
                        : 'border-zinc-800 bg-zinc-900/60'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold">{skin.name}</div>
                      <div className="text-[11px] uppercase text-zinc-400">
                        {skin.category}
                        {skin.priceLabel ? ` · ${skin.priceLabel}` : ''}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Preview + Embedded Payhip Checkout */}
            {selectedSkin && (
              <div className="flex flex-col justify-between p-4 md:col-span-8">
                {!checkoutUrlActive ? (
                  <>
                    <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-3">
                      {webglUnavailable ? (
                        <div className="flex h-56 w-full flex-col items-center justify-center gap-2 text-xs text-zinc-400">
                          {selectedSkin.mediaDataUrl && selectedSkin.mediaKind === 'image' ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={selectedSkin.mediaDataUrl}
                              alt={selectedSkin.name}
                              className="max-h-44 rounded-lg object-contain"
                            />
                          ) : (
                            <span>3D WebGL preview unavailable on this device</span>
                          )}
                        </div>
                      ) : (
                        <div ref={previewContainerRef} className="h-56 w-full" />
                      )}
                      <div className="mt-2 text-center text-sm font-black">
                        {selectedSkin.name}
                      </div>
                    </div>

                    <div className="mt-4 flex flex-col gap-2.5">
                      {isUnlocked ? (
                        <button
                          type="button"
                          onClick={() => onEquipSkin(selectedSkin)}
                          className={`rounded-xl px-4 py-3 text-xs font-black uppercase ${
                            isEquipped
                              ? 'bg-emerald-600 text-white'
                              : 'bg-emerald-500 text-black hover:bg-emerald-400'
                          }`}
                        >
                          {isEquipped ? 'Equipped' : `Equip ${selectedSkin.category}`}
                        </button>
                      ) : (
                        <>
                          {selectedSkin.payhipUrl && (
                            <button
                              type="button"
                              onClick={() =>
                                setCheckoutState({
                                  skinId: selectedSkin.id,
                                  url: selectedSkin.payhipUrl,
                                })
                              }
                              className="rounded-xl bg-amber-500 px-4 py-3 text-xs font-black uppercase text-black hover:bg-amber-400"
                            >
                              Open Checkout{' '}
                              {selectedSkin.priceLabel ? `(${selectedSkin.priceLabel})` : ''}
                            </button>
                          )}

                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={enteredCode}
                              onChange={(e) => setEnteredCode(e.target.value)}
                              placeholder="Enter unlock code"
                              className="flex-1 rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2 text-xs text-white"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                if (
                                  enteredCode.trim() &&
                                  enteredCode.trim() === selectedSkin.unlockCode
                                ) {
                                  onUnlockSkin(selectedSkin.id);
                                  onEquipSkin(selectedSkin);
                                  setEnteredCode('');
                                  setStatusMsg(`Unlocked & equipped ${selectedSkin.name}.`);
                                } else {
                                  setStatusMsg('Code does not match.');
                                }
                              }}
                              className="rounded-lg bg-zinc-800 px-4 py-2 text-xs font-bold uppercase text-amber-400"
                            >
                              Unlock
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="flex h-full flex-col">
                    <div className="mb-2 flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-400">
                        {selectedSkin.name}
                      </span>
                      <button
                        type="button"
                        onClick={() => setCheckoutState(null)}
                        className="rounded-lg bg-zinc-800 px-3 py-1 text-xs font-bold"
                      >
                        Back
                      </button>
                    </div>
                    <iframe
                      title={selectedSkin.name}
                      src={checkoutUrlActive}
                      className="h-[360px] w-full rounded-xl border border-zinc-800 bg-white"
                      sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
