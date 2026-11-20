import {
  CoinPackage,
  ExchangeProduct,
  ExchangeTransaction,
  GunWeaponClass,
  SkinCatalogItem,
  VAULT_PAYHIP_CATALOG,
  getWeaponClassForItem,
  toBackpackSkinCatalogItem,
  toExchangeProductFromSkinCatalogItem,
} from '../data/exchangeCatalog';
import { ItemId } from '../types';

export interface PaymentProviderStatus {
  configured: boolean;
  provider: string | null;
  webhookConfigured: boolean;
}

export interface ExchangeStorefrontState {
  loaded: boolean;
  playerId: string;
  coinBalance: number;
  ownedProductIds: string[];
  ownedProducts: ExchangeProduct[];
  equippedGunSkinsByClass: Partial<Record<GunWeaponClass, string>>;
  equippedBackpackSkinId: string | null;
  products: ExchangeProduct[];
  coinPackages: CoinPackage[];
  transactions: ExchangeTransaction[];
  paymentProvider: PaymentProviderStatus;
}

export interface AdminAuthStatus {
  authenticated: boolean;
  configuredViaEnv: boolean;
  configuredViaLocalSetup: boolean;
  needsSetup: boolean;
  productionBlocked: boolean;
}

export interface AdminCatalogState {
  products: ExchangeProduct[];
  coinPackages: CoinPackage[];
  transactions: ExchangeTransaction[];
  paymentProvider: PaymentProviderStatus;
}

const PLAYER_ID_KEY = 'survival_island_exchange_player_id_v1';
const EQUIPPED_CACHE_KEY = 'survival_island_exchange_equipped_cache_v2';

type Listener = () => void;
const listeners = new Set<Listener>();

function getOrCreatePlayerId(): string {
  if (typeof window === 'undefined') return 'guest_survivor';
  try {
    const existing = window.localStorage.getItem(PLAYER_ID_KEY);
    if (existing && existing.length >= 6) return existing;
    const generated = `surv_${Date.now().toString(36)}_${Math.random()
      .toString(36)
      .slice(2, 8)}`;
    window.localStorage.setItem(PLAYER_ID_KEY, generated);
    return generated;
  } catch {
    return 'guest_survivor';
  }
}

let cachedState: ExchangeStorefrontState = {
  loaded: false,
  playerId: 'guest_survivor',
  coinBalance: 0,
  ownedProductIds: [],
  ownedProducts: [],
  equippedGunSkinsByClass: {},
  equippedBackpackSkinId: null,
  products: [],
  coinPackages: [],
  transactions: [],
  paymentProvider: { configured: false, provider: null, webhookConfigured: false },
};

// Hydrate read-only equipped cosmetic visual cache on client boot so GameEngine has instant access
function hydrateEquippedCacheOnce(): void {
  if (typeof window === 'undefined') return;
  try {
    cachedState.playerId = getOrCreatePlayerId();
    const raw = window.localStorage.getItem(EQUIPPED_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<ExchangeStorefrontState>;
    if (Array.isArray(parsed.ownedProducts)) {
      cachedState.ownedProducts = parsed.ownedProducts;
    }
    if (Array.isArray(parsed.ownedProductIds)) {
      cachedState.ownedProductIds = parsed.ownedProductIds;
    }
    if (parsed.equippedGunSkinsByClass) {
      cachedState.equippedGunSkinsByClass = parsed.equippedGunSkinsByClass;
    }
    if (parsed.equippedBackpackSkinId !== undefined) {
      cachedState.equippedBackpackSkinId = parsed.equippedBackpackSkinId;
    }
  } catch {
    // Ignore corrupt cache
  }
}

function saveEquippedCache(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      EQUIPPED_CACHE_KEY,
      JSON.stringify({
        ownedProductIds: cachedState.ownedProductIds,
        ownedProducts: cachedState.ownedProducts,
        equippedGunSkinsByClass: cachedState.equippedGunSkinsByClass,
        equippedBackpackSkinId: cachedState.equippedBackpackSkinId,
      }),
    );
  } catch {
    // Storage quota exceeded — safe to skip local cache
  }
}

if (typeof window !== 'undefined') {
  hydrateEquippedCacheOnce();
}

function notify(): void {
  for (const fn of listeners) fn();
}

export function subscribeExchangeState(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getExchangeStateSnapshot(): ExchangeStorefrontState {
  return cachedState;
}

export function getExchangeItemById(id: string | null | undefined): ExchangeProduct | null {
  if (!id) return null;
  return (
    cachedState.products.find((p) => p.id === id) ||
    cachedState.ownedProducts.find((p) => p.id === id) ||
    null
  );
}

export type ActiveCosmeticSource = 'exchange' | 'vault' | 'custom_phone';

export interface CustomPhoneSkinRecord extends SkinCatalogItem {
  mediaDataUrl?: string;
  mediaKind?: 'image' | 'glb' | 'none';
}

export interface CustomPhoneMarketplaceState {
  skins: CustomPhoneSkinRecord[];
  unlockedIds: string[];
  equippedBackpackId: string | null;
  equippedWeaponId: string | null;
}

export interface VaultPayhipState {
  unlockedIds: string[];
  equippedBackpackId: string | null;
  equippedWeaponId: string | null;
  customPayhipUrls: Record<string, string>;
  preferVaultBackpack: boolean;
  preferVaultWeapon: boolean;
  backpackSource?: ActiveCosmeticSource;
  weaponSource?: ActiveCosmeticSource;
}

const VAULT_PAYHIP_STORAGE_KEY = 'survival_island_vault_payhip_v1';

let cachedVaultState: VaultPayhipState = {
  unlockedIds: ['vault_backpack_explorer'],
  equippedBackpackId: null,
  equippedWeaponId: null,
  customPayhipUrls: {},
  preferVaultBackpack: false,
  preferVaultWeapon: false,
};

function hydrateVaultPayhipOnce(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(VAULT_PAYHIP_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<VaultPayhipState>;
    cachedVaultState = {
      unlockedIds: Array.isArray(parsed.unlockedIds)
        ? parsed.unlockedIds
        : ['vault_backpack_explorer'],
      equippedBackpackId: parsed.equippedBackpackId ?? null,
      equippedWeaponId: parsed.equippedWeaponId ?? null,
      customPayhipUrls:
        parsed.customPayhipUrls && typeof parsed.customPayhipUrls === 'object'
          ? parsed.customPayhipUrls
          : {},
      preferVaultBackpack: Boolean(parsed.preferVaultBackpack),
      preferVaultWeapon: Boolean(parsed.preferVaultWeapon),
      backpackSource: parsed.backpackSource,
      weaponSource: parsed.weaponSource,
    };
  } catch {
    // Ignore storage errors
  }
}

function saveVaultPayhipState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      VAULT_PAYHIP_STORAGE_KEY,
      JSON.stringify(cachedVaultState),
    );
  } catch {
    // Ignore storage quota errors
  }
}

const CUSTOM_PHONE_STORAGE_KEY = 'survival_island_custom_phone_skins_v1';

let cachedCustomPhoneState: CustomPhoneMarketplaceState = {
  skins: [],
  unlockedIds: [],
  equippedBackpackId: null,
  equippedWeaponId: null,
};

function hydrateCustomPhoneOnce(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(CUSTOM_PHONE_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<CustomPhoneMarketplaceState>;
    cachedCustomPhoneState = {
      skins: Array.isArray(parsed.skins) ? parsed.skins : [],
      unlockedIds: Array.isArray(parsed.unlockedIds) ? parsed.unlockedIds : [],
      equippedBackpackId: parsed.equippedBackpackId ?? null,
      equippedWeaponId: parsed.equippedWeaponId ?? null,
    };
  } catch {
    // Ignore storage errors
  }
}

function saveCustomPhoneState(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      CUSTOM_PHONE_STORAGE_KEY,
      JSON.stringify(cachedCustomPhoneState),
    );
  } catch {
    // Ignore storage quota errors
  }
}

if (typeof window !== 'undefined') {
  hydrateVaultPayhipOnce();
  hydrateCustomPhoneOnce();
}

export function getCustomMarketplaceSnapshot(): CustomPhoneMarketplaceState {
  return cachedCustomPhoneState;
}

export function addCustomMarketplaceSkin(
  skin: CustomPhoneSkinRecord,
): CustomPhoneMarketplaceState {
  cachedCustomPhoneState = {
    ...cachedCustomPhoneState,
    skins: [skin, ...cachedCustomPhoneState.skins.filter((s) => s.id !== skin.id)],
  };
  saveCustomPhoneState();
  notify();
  return cachedCustomPhoneState;
}

export function attachCustomMarketplaceCheckout(
  skinId: string,
  payhipUrl: string,
  priceLabel: string,
): CustomPhoneMarketplaceState {
  cachedCustomPhoneState = {
    ...cachedCustomPhoneState,
    skins: cachedCustomPhoneState.skins.map((s) =>
      s.id === skinId ? { ...s, payhipUrl, priceLabel } : s,
    ),
  };
  saveCustomPhoneState();
  notify();
  return cachedCustomPhoneState;
}

export function unlockCustomMarketplaceSkin(skinId: string): CustomPhoneMarketplaceState {
  if (!cachedCustomPhoneState.unlockedIds.includes(skinId)) {
    cachedCustomPhoneState = {
      ...cachedCustomPhoneState,
      unlockedIds: [...cachedCustomPhoneState.unlockedIds, skinId],
    };
    saveCustomPhoneState();
    notify();
  }
  return cachedCustomPhoneState;
}

export function equipCustomMarketplaceSkin(
  skin: CustomPhoneSkinRecord,
): CustomPhoneMarketplaceState {
  if (skin.category === 'backpack') {
    const nextId =
      cachedCustomPhoneState.equippedBackpackId === skin.id ? null : skin.id;
    cachedCustomPhoneState = {
      ...cachedCustomPhoneState,
      equippedBackpackId: nextId,
    };
    cachedVaultState = {
      ...cachedVaultState,
      preferVaultBackpack: false,
      backpackSource: nextId ? 'custom_phone' : 'exchange',
    };
  } else {
    const nextId =
      cachedCustomPhoneState.equippedWeaponId === skin.id ? null : skin.id;
    cachedCustomPhoneState = {
      ...cachedCustomPhoneState,
      equippedWeaponId: nextId,
    };
    cachedVaultState = {
      ...cachedVaultState,
      preferVaultWeapon: false,
      weaponSource: nextId ? 'custom_phone' : 'exchange',
    };
  }
  saveCustomPhoneState();
  saveVaultPayhipState();
  notify();
  return cachedCustomPhoneState;
}

export function getVaultPayhipSnapshot(): VaultPayhipState {
  return cachedVaultState;
}

export function getVaultCatalogItems(): SkinCatalogItem[] {
  const baseItems = VAULT_PAYHIP_CATALOG.map((item) => ({
    ...item,
    payhipUrl: cachedVaultState.customPayhipUrls[item.id] ?? item.payhipUrl,
  }));
  const existingIds = new Set(baseItems.map((it) => it.id));
  const exchangeMapped = cachedState.products
    .filter((p) => !existingIds.has(p.id))
    .map((p) => {
      const converted = toBackpackSkinCatalogItem(p);
      return {
        ...converted,
        payhipUrl: cachedVaultState.customPayhipUrls[converted.id] ?? converted.payhipUrl,
      };
    });
  return [...baseItems, ...exchangeMapped];
}

export function unlockVaultPayhipItem(itemId: string): VaultPayhipState {
  if (!cachedVaultState.unlockedIds.includes(itemId)) {
    cachedVaultState = {
      ...cachedVaultState,
      unlockedIds: [...cachedVaultState.unlockedIds, itemId],
    };
    saveVaultPayhipState();
    notify();
  }
  return cachedVaultState;
}

export function equipVaultPayhipItem(item: SkinCatalogItem): VaultPayhipState {
  if (item.category === 'backpack') {
    const nextId =
      cachedVaultState.equippedBackpackId === item.id && cachedVaultState.preferVaultBackpack
        ? null
        : item.id;
    cachedVaultState = {
      ...cachedVaultState,
      equippedBackpackId: nextId,
      preferVaultBackpack: Boolean(nextId),
      backpackSource: nextId ? 'vault' : 'exchange',
    };
  } else {
    const nextId =
      cachedVaultState.equippedWeaponId === item.id && cachedVaultState.preferVaultWeapon
        ? null
        : item.id;
    cachedVaultState = {
      ...cachedVaultState,
      equippedWeaponId: nextId,
      preferVaultWeapon: Boolean(nextId),
      weaponSource: nextId ? 'vault' : 'exchange',
    };
  }
  saveVaultPayhipState();
  notify();
  return cachedVaultState;
}

export function updateVaultItemPayhipEmbed(
  itemId: string,
  checkoutUrl: string,
): VaultPayhipState {
  cachedVaultState = {
    ...cachedVaultState,
    customPayhipUrls: {
      ...cachedVaultState.customPayhipUrls,
      [itemId]: checkoutUrl,
    },
  };
  saveVaultPayhipState();
  notify();
  return cachedVaultState;
}

export function getEquippedGunSkinForWeapon(
  itemId: ItemId | null,
): ExchangeProduct | null {
  const wc = getWeaponClassForItem(itemId);
  if (!wc) return null;
  if (cachedVaultState.weaponSource === 'custom_phone' && cachedCustomPhoneState.equippedWeaponId) {
    const customSkin = cachedCustomPhoneState.skins.find(
      (s) => s.id === cachedCustomPhoneState.equippedWeaponId && s.category === 'weapon',
    );
    if (customSkin) {
      return toExchangeProductFromSkinCatalogItem(customSkin);
    }
  }
  if (cachedVaultState.preferVaultWeapon && cachedVaultState.equippedWeaponId) {
    const vaultSkin = getVaultCatalogItems().find(
      (it) => it.id === cachedVaultState.equippedWeaponId && it.category === 'weapon',
    );
    if (vaultSkin) {
      return toExchangeProductFromSkinCatalogItem(vaultSkin);
    }
  }
  const skinId = cachedState.equippedGunSkinsByClass[wc];
  if (skinId) {
    const prod = getExchangeItemById(skinId);
    if (prod) return prod;
  }
  if (cachedCustomPhoneState.equippedWeaponId) {
    const customSkin = cachedCustomPhoneState.skins.find(
      (s) => s.id === cachedCustomPhoneState.equippedWeaponId && s.category === 'weapon',
    );
    if (customSkin) {
      return toExchangeProductFromSkinCatalogItem(customSkin);
    }
  }
  if (cachedVaultState.equippedWeaponId) {
    const vaultSkin = getVaultCatalogItems().find(
      (it) => it.id === cachedVaultState.equippedWeaponId && it.category === 'weapon',
    );
    if (vaultSkin) {
      return toExchangeProductFromSkinCatalogItem(vaultSkin);
    }
  }
  return null;
}

export function getEquippedBackpackSkin(): ExchangeProduct | null {
  if (cachedVaultState.backpackSource === 'custom_phone' && cachedCustomPhoneState.equippedBackpackId) {
    const customPack = cachedCustomPhoneState.skins.find(
      (s) => s.id === cachedCustomPhoneState.equippedBackpackId && s.category === 'backpack',
    );
    if (customPack) {
      return toExchangeProductFromSkinCatalogItem(customPack);
    }
  }
  if (cachedVaultState.preferVaultBackpack && cachedVaultState.equippedBackpackId) {
    const vaultPack = getVaultCatalogItems().find(
      (it) => it.id === cachedVaultState.equippedBackpackId && it.category === 'backpack',
    );
    if (vaultPack) {
      return toExchangeProductFromSkinCatalogItem(vaultPack);
    }
  }
  if (cachedState.equippedBackpackSkinId) {
    const prod = getExchangeItemById(cachedState.equippedBackpackSkinId);
    if (prod) return prod;
  }
  if (cachedCustomPhoneState.equippedBackpackId) {
    const customPack = cachedCustomPhoneState.skins.find(
      (s) => s.id === cachedCustomPhoneState.equippedBackpackId && s.category === 'backpack',
    );
    if (customPack) {
      return toExchangeProductFromSkinCatalogItem(customPack);
    }
  }
  if (cachedVaultState.equippedBackpackId) {
    const vaultPack = getVaultCatalogItems().find(
      (it) => it.id === cachedVaultState.equippedBackpackId && it.category === 'backpack',
    );
    if (vaultPack) {
      return toExchangeProductFromSkinCatalogItem(vaultPack);
    }
  }
  return null;
}

export async function refreshStorefront(): Promise<ExchangeStorefrontState> {
  const playerId = getOrCreatePlayerId();
  const res = await fetch(
    `/api/exchange/storefront?playerId=${encodeURIComponent(playerId)}`,
    { cache: 'no-store' },
  );
  if (!res.ok) {
    throw new Error('Failed to load Survival Island Exchange storefront.');
  }
  const data = (await res.json()) as Omit<ExchangeStorefrontState, 'loaded'>;
  cachedState = {
    ...data,
    loaded: true,
  };
  saveEquippedCache();
  notify();
  return cachedState;
}

export async function purchaseExchangeProduct(productId: string): Promise<{
  ok: boolean;
  error?: string;
  insufficientFunds?: boolean;
}> {
  const playerId = getOrCreatePlayerId();
  const res = await fetch('/api/exchange/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, productId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    error?: string;
    insufficientFunds?: boolean;
  };
  await refreshStorefront();
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      error: data.error || 'Purchase could not be completed.',
      insufficientFunds: Boolean(data.insufficientFunds),
    };
  }
  return { ok: true };
}

export async function equipExchangeProduct(
  productId: string,
  action: 'equip' | 'unequip',
): Promise<{ ok: boolean; error?: string }> {
  const playerId = getOrCreatePlayerId();
  const res = await fetch('/api/exchange/equip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, productId, action }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  const targetProd = getExchangeItemById(productId);
  if (res.ok && data.ok && targetProd) {
    if (targetProd.category === 'backpack_skin') {
      cachedVaultState = {
        ...cachedVaultState,
        preferVaultBackpack: false,
        backpackSource: 'exchange',
      };
      saveVaultPayhipState();
    } else if (targetProd.category === 'gun_skin') {
      cachedVaultState = {
        ...cachedVaultState,
        preferVaultWeapon: false,
        weaponSource: 'exchange',
      };
      saveVaultPayhipState();
    }
  }
  await refreshStorefront();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Could not update equipped cosmetic.' };
  }
  return { ok: true };
}

export async function requestCoinPackageCheckout(packageId: string): Promise<{
  ok: boolean;
  providerRequired?: boolean;
  message: string;
}> {
  const playerId = getOrCreatePlayerId();
  const res = await fetch('/api/exchange/coins/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ playerId, packageId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    providerRequired?: boolean;
    message?: string;
    error?: string;
  };
  await refreshStorefront();
  return {
    ok: Boolean(res.ok && data.ok),
    providerRequired: Boolean(data.providerRequired),
    message:
      data.message ||
      data.error ||
      'Payment provider verification is required before coins can be credited.',
  };
}

// ---- Owner Admin API Client ----

export async function checkAdminAuthStatus(): Promise<AdminAuthStatus> {
  const res = await fetch('/api/exchange/admin/auth', { cache: 'no-store' });
  if (!res.ok) {
    return {
      authenticated: false,
      configuredViaEnv: false,
      configuredViaLocalSetup: false,
      needsSetup: false,
      productionBlocked: false,
    };
  }
  return (await res.json()) as AdminAuthStatus;
}

export async function authenticateOwnerAdmin(
  passphrase: string,
  mode: 'login' | 'setup',
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch('/api/exchange/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ passphrase, mode }),
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Authentication failed.' };
  }
  return { ok: true };
}

export async function logoutOwnerAdmin(): Promise<void> {
  await fetch('/api/exchange/admin/auth', { method: 'DELETE' });
}

export async function fetchAdminCatalog(): Promise<AdminCatalogState> {
  const res = await fetch('/api/exchange/admin/catalog', { cache: 'no-store' });
  if (!res.ok) {
    throw new Error('Owner authorization required.');
  }
  const data = (await res.json()) as AdminCatalogState;
  return data;
}

export async function adminCreateProduct(
  payload: Partial<ExchangeProduct>,
): Promise<{ ok: boolean; product?: ExchangeProduct; error?: string }> {
  const res = await fetch('/api/exchange/admin/products', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    product?: ExchangeProduct;
    error?: string;
  };
  await refreshStorefront();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to create product.' };
  }
  return { ok: true, product: data.product };
}

export async function adminUpdateProduct(
  id: string,
  patch: Partial<ExchangeProduct>,
): Promise<{ ok: boolean; product?: ExchangeProduct; error?: string }> {
  const res = await fetch(`/api/exchange/admin/products/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    product?: ExchangeProduct;
    error?: string;
  };
  await refreshStorefront();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to update product.' };
  }
  return { ok: true, product: data.product };
}

export async function adminDeleteProduct(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/exchange/admin/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  await refreshStorefront();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to delete product.' };
  }
  return { ok: true };
}

export async function adminUploadAsset(
  file: File,
  kind: 'image' | 'model3d',
): Promise<{ ok: boolean; url?: string; fileName?: string; error?: string }> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('kind', kind);
  const res = await fetch('/api/exchange/admin/upload', {
    method: 'POST',
    body: fd,
  });
  const data = (await res.json()) as {
    ok?: boolean;
    url?: string;
    fileName?: string;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'File upload failed.' };
  }
  return { ok: true, url: data.url, fileName: data.fileName };
}

export async function adminCreateCoinPackage(
  payload: Partial<CoinPackage>,
): Promise<{ ok: boolean; coinPackage?: CoinPackage; error?: string }> {
  const res = await fetch('/api/exchange/admin/coins', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    coinPackage?: CoinPackage;
    error?: string;
  };
  await refreshStorefront();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to create coin package.' };
  }
  return { ok: true, coinPackage: data.coinPackage };
}

export async function adminUpdateCoinPackage(
  id: string,
  patch: Partial<CoinPackage>,
): Promise<{ ok: boolean; coinPackage?: CoinPackage; error?: string }> {
  const res = await fetch(`/api/exchange/admin/coins/${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(patch),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    coinPackage?: CoinPackage;
    error?: string;
  };
  await refreshStorefront();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to update coin package.' };
  }
  return { ok: true, coinPackage: data.coinPackage };
}

export async function adminDeleteCoinPackage(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const res = await fetch(`/api/exchange/admin/coins/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  });
  const data = (await res.json()) as { ok?: boolean; error?: string };
  await refreshStorefront();
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to delete coin package.' };
  }
  return { ok: true };
}
