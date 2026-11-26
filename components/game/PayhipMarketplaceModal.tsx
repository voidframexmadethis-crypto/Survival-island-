'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import {
  buildSculptedBackpackMesh,
  getCosmeticPatternTexture,
  SkinCatalogItem,
  toExchangeProductFromSkinCatalogItem,
} from '@/game/data/exchangeCatalog';
import {
  PayhipPurchaseStatus,
  createPayhipCheckout,
  getExchangeStateSnapshot,
  markPayhipCheckoutPending,
  pollPayhipCheckoutStatus,
  refreshStorefront,
  subscribeExchangeState,
} from '@/game/systems/exchangeManager';
import { PlayerAccountAuthPanel } from './PlayerAccountAuthPanel';
import { isNativeMobileApp } from '@/game/systems/apiConfig';
import { createSafeWebGLRenderer } from '@/game/world/webglUtils';

export interface MarketplaceProps {
  isOpen: boolean;
  items: SkinCatalogItem[];
  unlockedIds: string[];
  equippedBackpackId: string | null;
  equippedWeaponId: string | null;
  onUnlockItem: (itemId: string) => void;
  onEquipItem: (item: SkinCatalogItem) => void;
  onUpdateItemPayhipEmbed?: (itemId: string, rawEmbedOrUrl: string) => void;
  onClose: () => void;
}

/**
 * Extracts a clean HTTPS Payhip URL whether you paste a direct link
 * (e.g. https://payhip.com/b/XXXXX) or Payhip's full HTML embed snippet.
 */
export function extractPayhipCheckoutUrl(rawInput: string): string | null {
  const trimmed = rawInput.trim();
  if (!trimmed) return null;

  const urlMatch = trimmed.match(/https:\/\/(?:www\.)?payhip\.com\/[^\s"'<>]+/i);
  if (!urlMatch) return null;

  try {
    const parsed = new URL(urlMatch[0]);
    if (parsed.protocol !== 'https:') return null;
    return parsed.toString();
  } catch {
    return null;
  }
}

function buildWeaponTurntableMesh(item: SkinCatalogItem): {
  group: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];
  const product = toExchangeProductFromSkinCatalogItem(item);
  const patternTex = getCosmeticPatternTexture(product.visual);

  const primaryMat = new THREE.MeshStandardMaterial({
    color: item.primaryHex,
    map: patternTex,
    metalness: product.visual.metalness,
    roughness: product.visual.roughness,
  });
  const secondaryMat = new THREE.MeshStandardMaterial({
    color: item.secondaryHex,
    metalness: 0.5,
    roughness: 0.45,
  });
  const accentMat = new THREE.MeshStandardMaterial({
    color: item.accentHex,
    emissive: product.visual.emissiveHex
      ? new THREE.Color(product.visual.emissiveHex)
      : new THREE.Color(0x000000),
    emissiveIntensity: product.visual.emissiveHex ? 0.45 : 0,
    metalness: 0.8,
    roughness: 0.25,
  });

  const receiverGeo = new THREE.BoxGeometry(0.68, 0.16, 0.12);
  const barrelGeo = new THREE.CylinderGeometry(0.026, 0.03, 0.56, 12);
  const magGeo = new THREE.BoxGeometry(0.1, 0.3, 0.09);
  const gripGeo = new THREE.BoxGeometry(0.1, 0.24, 0.09);
  const stockGeo = new THREE.BoxGeometry(0.36, 0.14, 0.1);

  const receiver = new THREE.Mesh(receiverGeo, primaryMat);
  const barrel = new THREE.Mesh(barrelGeo, secondaryMat);
  barrel.rotation.z = Math.PI / 2;
  barrel.position.set(0.56, 0.03, 0);
  const mag = new THREE.Mesh(magGeo, accentMat);
  mag.position.set(0.12, -0.18, 0);
  mag.rotation.z = 0.2;
  const grip = new THREE.Mesh(gripGeo, secondaryMat);
  grip.position.set(-0.18, -0.14, 0);
  grip.rotation.z = -0.24;
  const stock = new THREE.Mesh(stockGeo, primaryMat);
  stock.position.set(-0.5, 0.01, 0);

  group.add(receiver, barrel, mag, grip, stock);
  group.scale.setScalar(0.85);
  disposables.push(
    primaryMat,
    secondaryMat,
    accentMat,
    receiverGeo,
    barrelGeo,
    magGeo,
    gripGeo,
    stockGeo,
  );

  return {
    group,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

export const PayhipMarketplaceModal: React.FC<MarketplaceProps> = ({
  isOpen,
  items,
  unlockedIds,
  equippedBackpackId,
  equippedWeaponId,
  onEquipItem,
  onClose,
}) => {
  const [selectedId, setSelectedId] = useState<string>(items[0]?.id ?? '');
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const nativePurchasesBlocked = isNativeMobileApp();
  const [activeCheckoutId, setActiveCheckoutId] = useState<string | null>(null);
  const [purchaseStatus, setPurchaseStatus] = useState<PayhipPurchaseStatus | null>(null);
  const [statusBanner, setStatusBanner] = useState<string | null>(null);
  const [startingCheckout, setStartingCheckout] = useState<boolean>(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState<boolean>(false);
  const [storeSnapshot, setStoreSnapshot] = useState(() => getExchangeStateSnapshot());
  const [webglUnavailable, setWebglUnavailable] = useState<boolean>(false);

  const previewMountRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef<boolean>(false);
  const lastPointerXRef = useRef<number>(0);
  const yawOffsetRef = useRef<number>(Math.PI * 0.82);

  useEffect(() => {
    const unsub = subscribeExchangeState(() => {
      setStoreSnapshot({ ...getExchangeStateSnapshot() });
    });
    if (isOpen) {
      void refreshStorefront().catch(() => {});
    }
    return unsub;
  }, [isOpen]);

  // Poll server Payhip checkout verification status until terminal delivered/failed/refunded state
  useEffect(() => {
    if (!isOpen || !activeCheckoutId) return;
    let cancelled = false;
    const poll = async () => {
      const res = await pollPayhipCheckoutStatus(activeCheckoutId);
      if (cancelled || !res.ok) return;
      if (res.status) setPurchaseStatus(res.status);
      if (res.status === 'delivered' || res.delivered) {
        setCheckoutUrl(null);
        setActiveCheckoutId(null);
        setStatusBanner('Payment successful — Item delivered successfully');
      } else if (res.status === 'failed') {
        setCheckoutUrl(null);
        setActiveCheckoutId(null);
        setStatusBanner('Payment unsuccessful');
      } else if (res.status === 'refunded') {
        setCheckoutUrl(null);
        setActiveCheckoutId(null);
        setStatusBanner('Payment refunded — entitlement revoked.');
      } else if (res.statusMessage) {
        setStatusBanner(res.statusMessage);
      }
    };
    void poll();
    const timer = window.setInterval(() => {
      void poll();
    }, 2000);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [isOpen, activeCheckoutId]);

  const selectedItem = useMemo(
    () => items.find((it) => it.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  // Lightweight 3D turntable preview (only runs while modal is open, zero leaks)
  useEffect(() => {
    if (!isOpen || !selectedItem || !previewMountRef.current || checkoutUrl) return;

    const container = previewMountRef.current;
    const width = container.clientWidth || 260;
    const height = container.clientHeight || 240;

    let renderer: THREE.WebGLRenderer | null = null;
    try {
      renderer = createSafeWebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: 'low-power',
      }).renderer;
    } catch {
      const rafFallback = requestAnimationFrame(() => setWebglUnavailable(true));
      return () => cancelAnimationFrame(rafFallback);
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 20);
    camera.position.set(0, 0.15, 1.55);

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(width, height);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const hemiLight = new THREE.HemisphereLight('#ffffff', '#1e293b', 1.35);
    const keyLight = new THREE.DirectionalLight('#ffffff', 1.6);
    keyLight.position.set(2, 3, 2.5);
    scene.add(hemiLight, keyLight);

    const built =
      selectedItem.category === 'weapon'
        ? buildWeaponTurntableMesh(selectedItem)
        : buildSculptedBackpackMesh(selectedItem);
    yawOffsetRef.current = Math.PI * 0.82;
    built.group.rotation.y = yawOffsetRef.current;
    scene.add(built.group);

    let rafId = 0;
    let lastMs = performance.now();

    const animate = (nowMs: number) => {
      const dt = Math.min((nowMs - lastMs) / 1000, 0.05);
      lastMs = nowMs;
      if (!draggingRef.current) {
        yawOffsetRef.current += dt * 0.85;
      }
      built.group.rotation.y = yawOffsetRef.current;
      renderer?.render(scene, camera);
      rafId = requestAnimationFrame(animate);
    };
    rafId = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(rafId);
      built.dispose();
      renderer?.dispose();
      if (renderer && renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [isOpen, selectedItem, checkoutUrl]);

  if (!isOpen || !selectedItem) return null;

  const effectiveUnlocked = Array.from(
    new Set([...unlockedIds, ...storeSnapshot.ownedProductIds]),
  );
  const isFree =
    Boolean(selectedItem.freeByDefault) ||
    selectedItem.priceLabel.toLowerCase() === 'free' ||
    selectedItem.priceLabel === '$0';
  const isOwned = isFree || effectiveUnlocked.includes(selectedItem.id);
  const isEquipped =
    selectedItem.category === 'backpack'
      ? (storeSnapshot.equippedBackpackSkinId ?? equippedBackpackId) === selectedItem.id
      : selectedItem.category === 'cosmetic'
        ? storeSnapshot.equippedCosmeticIds.includes(selectedItem.id)
        : Object.values(storeSnapshot.equippedGunSkinsByClass).includes(selectedItem.id) ||
          equippedWeaponId === selectedItem.id;

  const handleSelectItem = (item: SkinCatalogItem) => {
    setSelectedId(item.id);
    setCheckoutUrl(null);
    setActiveCheckoutId(null);
    setPurchaseStatus(null);
    setStatusBanner(null);
  };

  const handleBuyWithPayhip = async () => {
    if (nativePurchasesBlocked) {
      setStatusBanner('Purchases are available on the website. Items already owned can be equipped here.');
      return;
    }
    if (!storeSnapshot.authenticated) {
      setShowAuthPrompt(true);
      setStatusBanner('Sign in to your Survival Island account to complete Payhip checkout.');
      return;
    }

    setStartingCheckout(true);
    setStatusBanner('Waiting for payment confirmation');
    setPurchaseStatus('waiting_confirmation');

    const res = await createPayhipCheckout(selectedItem.id);
    setStartingCheckout(false);

    if (!res.ok || !res.checkoutUrl || !res.checkoutId) {
      if (res.authRequired) setShowAuthPrompt(true);
      setPurchaseStatus('failed');
      setStatusBanner(res.error || 'Payment unsuccessful');
      return;
    }

    setActiveCheckoutId(res.checkoutId);
    setCheckoutUrl(res.checkoutUrl);
    setPurchaseStatus(res.status || 'waiting_confirmation');
    setStatusBanner(res.statusMessage || 'Waiting for payment confirmation');
  };

  const handleReturnFromCheckout = async () => {
    setCheckoutUrl(null);
    if (activeCheckoutId) {
      const pendingRes = await markPayhipCheckoutPending(activeCheckoutId);
      setPurchaseStatus(pendingRes.status || 'pending_verification');
      setStatusBanner(pendingRes.statusMessage || 'Purchase pending verification');
    }
  };

  const handleEquipClick = async () => {
    if (!isFree && !storeSnapshot.authenticated) {
      setShowAuthPrompt(true);
      setStatusBanner('Sign in to equip account-owned cosmetics.');
      return;
    }
    onEquipItem(selectedItem);
    setStatusBanner(
      isEquipped
        ? `Unequipped ${selectedItem.name}.`
        : `${selectedItem.name} equipped on character!`,
    );
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-amber-500/40 bg-zinc-950 text-white shadow-2xl">
        {/* Top Store Header */}
        <div className="flex items-center justify-between border-b border-zinc-800 bg-zinc-900/90 px-4 py-3">
          <div className="flex items-center gap-2.5">
            <span className="rounded-md bg-amber-500 px-2 py-0.5 text-xs font-black uppercase tracking-wider text-black">
              Vault Store
            </span>
            <h2 className="text-base font-extrabold tracking-wide sm:text-lg">
              3D Backpacks, Weapon Skins &amp; Cosmetics
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-lg bg-zinc-800 px-3 py-1.5 text-xs font-bold text-zinc-200 hover:bg-red-600 hover:text-white"
          >
            Close
          </button>
        </div>

        {/* Account Bar */}
        <div className="border-b border-zinc-800 bg-zinc-900/60 px-4 py-2.5">
          <PlayerAccountAuthPanel
            authenticated={storeSnapshot.authenticated}
            account={storeSnapshot.account}
            compact={!showAuthPrompt}
            promptMessage={
              showAuthPrompt
                ? 'Sign in or create an account so your Payhip purchases deliver automatically and stay unlocked everywhere.'
                : null
            }
            onAuthenticated={() => {
              setShowAuthPrompt(false);
              setStatusBanner(null);
            }}
          />
        </div>

        {/* Main Body: Catalog List + 3D Turntable / Embedded Checkout */}
        <div className="grid flex-1 grid-cols-1 overflow-y-auto md:grid-cols-12">
          {/* Left Item Selector */}
          <div className="border-b border-zinc-800 p-3 md:col-span-4 md:border-b-0 md:border-r">
            <div className="space-y-2">
              {items.map((item) => {
                const active = item.id === selectedItem.id;
                const itemFree =
                  Boolean(item.freeByDefault) || item.priceLabel.toLowerCase() === 'free';
                const owned = itemFree || effectiveUnlocked.includes(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectItem(item)}
                    className={`flex w-full items-center justify-between rounded-xl border p-3 text-left transition ${
                      active
                        ? 'border-amber-400 bg-amber-500/15'
                        : 'border-zinc-800 bg-zinc-900/60 hover:border-zinc-700'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-extrabold text-white">{item.name}</div>
                      <div className="mt-0.5 text-[11px] uppercase tracking-wider text-zinc-400">
                        {item.category} ·{' '}
                        <span className={owned ? 'text-emerald-400 font-bold' : ''}>
                          {owned ? 'Owned' : item.priceLabel}
                        </span>
                      </div>
                    </div>
                    <span
                      className="h-5 w-5 rounded-full border border-white/20"
                      style={{ backgroundColor: item.primaryHex }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right 3D Preview & Embedded Payhip Checkout */}
          <div className="flex flex-col justify-between p-4 md:col-span-8">
            {!checkoutUrl ? (
              <>
                <div className="relative flex flex-col items-center justify-center rounded-2xl border border-zinc-800 bg-gradient-to-b from-zinc-900 to-black p-3">
                  <div className="absolute left-3 top-3 rounded-md bg-black/70 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    Live 3D Preview · Drag/Spin
                  </div>
                  {selectedItem.productImageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={selectedItem.productImageUrl}
                      alt={selectedItem.name}
                      className="mb-2 h-20 rounded-lg border border-zinc-800 object-contain"
                    />
                  )}
                  {webglUnavailable ? (
                    <div className="flex h-56 w-full flex-col items-center justify-center gap-2 sm:h-64">
                      <div
                        className="h-24 w-24 rounded-2xl border border-zinc-700 shadow-inner"
                        style={{
                          background: `linear-gradient(135deg, ${selectedItem.primaryHex} 0%, ${selectedItem.secondaryHex} 60%, ${selectedItem.accentHex} 100%)`,
                        }}
                      />
                      <span className="text-xs text-zinc-400">
                        3D WebGL preview unavailable on this device
                      </span>
                    </div>
                  ) : (
                    <div
                      ref={previewMountRef}
                      className="h-56 w-full cursor-grab touch-none active:cursor-grabbing sm:h-64"
                      onPointerDown={(e) => {
                        draggingRef.current = true;
                        lastPointerXRef.current = e.clientX;
                        e.currentTarget.setPointerCapture(e.pointerId);
                      }}
                      onPointerMove={(e) => {
                        if (!draggingRef.current) return;
                        const dx = e.clientX - lastPointerXRef.current;
                        lastPointerXRef.current = e.clientX;
                        yawOffsetRef.current += dx * 0.014;
                      }}
                      onPointerUp={(e) => {
                        draggingRef.current = false;
                        try {
                          e.currentTarget.releasePointerCapture(e.pointerId);
                        } catch {
                          // ignore pointer capture error
                        }
                      }}
                      onPointerCancel={() => {
                        draggingRef.current = false;
                      }}
                    />
                  )}
                  <div className="mt-2 text-center">
                    <div className="flex items-center justify-center gap-2">
                      <h3 className="text-lg font-black text-white">{selectedItem.name}</h3>
                      {isOwned && (
                        <span className="rounded bg-emerald-600/25 border border-emerald-500/60 px-2 py-0.5 text-[10px] font-black uppercase text-emerald-300">
                          OWNED
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-zinc-400">
                      Delivered automatically upon Payhip payment confirmation
                    </p>
                  </div>
                </div>

                {/* Action / Purchase Bar */}
                <div className="mt-4 flex flex-col gap-3">
                  <div className="flex flex-wrap items-center gap-2">
                    {isOwned ? (
                      <button
                        type="button"
                        onClick={handleEquipClick}
                        className={`flex-1 rounded-xl px-4 py-3 text-sm font-black uppercase tracking-wide ${
                          isEquipped
                            ? 'bg-emerald-600 text-white'
                            : 'bg-amber-500 text-black hover:bg-amber-400'
                        }`}
                      >
                        {isEquipped ? 'Unequip Skin' : 'Equip Skin Now'}
                      </button>
                    ) : nativePurchasesBlocked ? (
                      <div className="flex-1 rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-3 text-center text-xs text-zinc-300">
                        Purchases are available on the website. Items already owned can be equipped here.
                      </div>
                    ) : (
                      <button
                        type="button"
                        disabled={startingCheckout}
                        onClick={handleBuyWithPayhip}
                        className="flex-1 rounded-xl bg-amber-500 px-4 py-3 text-sm font-black uppercase tracking-wide text-black hover:bg-amber-400 disabled:opacity-50"
                      >
                        {startingCheckout
                          ? 'Preparing Payhip Checkout...'
                          : `Buy via Payhip (${selectedItem.priceLabel})`}
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              /* Embedded Payhip Checkout Frame Inside the App */
              <div className="flex h-full flex-col">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-amber-400">
                    Payhip Checkout · {selectedItem.name} ({selectedItem.priceLabel})
                  </span>
                  <div className="flex items-center gap-2">
                    {activeCheckoutId && (
                      <button
                        type="button"
                        onClick={() => void pollPayhipCheckoutStatus(activeCheckoutId)}
                        className="rounded-lg bg-amber-500/20 border border-amber-500/50 px-2.5 py-1 text-xs font-bold text-amber-200 hover:bg-amber-500/30"
                      >
                        Verify Status
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={handleReturnFromCheckout}
                      className="rounded-lg bg-zinc-800 px-3 py-1 text-xs font-bold text-zinc-200 hover:bg-zinc-700"
                    >
                      ← Back to Preview
                    </button>
                  </div>
                </div>
                <iframe
                  title={`Payhip Checkout - ${selectedItem.name}`}
                  src={checkoutUrl}
                  className="h-[380px] w-full rounded-xl border border-zinc-800 bg-white"
                  sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
                />
              </div>
            )}

            {statusBanner && (
              <div
                className={`mt-3 rounded-lg border px-3 py-2 text-xs font-semibold ${
                  purchaseStatus === 'delivered' || purchaseStatus === 'paid'
                    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-300'
                    : purchaseStatus === 'failed' || purchaseStatus === 'refunded'
                      ? 'border-red-500/50 bg-red-500/15 text-red-300'
                      : 'border-amber-500/40 bg-amber-500/10 text-amber-300'
                }`}
              >
                {statusBanner}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
