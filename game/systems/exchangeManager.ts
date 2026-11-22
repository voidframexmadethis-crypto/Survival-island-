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
  payhipConfigured?: boolean;
  payhipWebhookConfigured?: boolean;
}

export interface PlayerProfileSummary {
  playerId: string;
  username: string;
  email: string;
  createdAt: number;
}

export type PayhipPurchaseStatus =
  | 'waiting_confirmation'
  | 'pending_verification'
  | 'paid'
  | 'delivered'
  | 'failed'
  | 'refunded';

export interface PayhipCheckoutSummary {
  checkoutId: string;
  productId: string;
  productName: string;
  status: PayhipPurchaseStatus;
  statusMessage: string;
  createdAt: number;
  updatedAt: number;
}

export interface ExchangeStorefrontState {
  loaded: boolean;
  authenticated: boolean;
  account: PlayerProfileSummary | null;
  playerId: string | null;
  coinBalance: number;
  ownedProductIds: string[];
  revokedProductIds: string[];
  ownedProducts: ExchangeProduct[];
  equippedGunSkinsByClass: Partial<Record<GunWeaponClass, string>>;
  equippedBackpackSkinId: string | null;
  equippedCosmeticIds: string[];
  products: ExchangeProduct[];
  coinPackages: CoinPackage[];
  transactions: ExchangeTransaction[];
  pendingCheckouts: PayhipCheckoutSummary[];
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

const EQUIPPED_CACHE_KEY = 'survival_island_exchange_equipped_cache_v3';

type Listener = () => void;
const listeners = new Set<Listener>();

let cachedState: ExchangeStorefrontState = {
  loaded: false,
  authenticated: false,
  account: null,
  playerId: null,
  coinBalance: 0,
  ownedProductIds: ['vault_backpack_explorer'],
  revokedProductIds: [],
  ownedProducts: [],
  equippedGunSkinsByClass: {},
  equippedBackpackSkinId: null,
  equippedCosmeticIds: [],
  products: [],
  coinPackages: [],
  transactions: [],
  pendingCheckouts: [],
  paymentProvider: {
    configured: false,
    provider: null,
    webhookConfigured: false,
    payhipConfigured: false,
    payhipWebhookConfigured: false,
  },
};

function hydrateEquippedCacheOnce(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(EQUIPPED_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<ExchangeStorefrontState>;
    if (parsed.authenticated && parsed.playerId) {
      cachedState.authenticated = true;
      cachedState.playerId = parsed.playerId;
      cachedState.account = parsed.account ?? null;
      if (Array.isArray(parsed.ownedProducts)) cachedState.ownedProducts = parsed.ownedProducts;
      if (Array.isArray(parsed.ownedProductIds)) {
        cachedState.ownedProductIds = parsed.ownedProductIds;
      }
      if (parsed.equippedGunSkinsByClass) {
        cachedState.equippedGunSkinsByClass = parsed.equippedGunSkinsByClass;
      }
      if (parsed.equippedBackpackSkinId !== undefined) {
        cachedState.equippedBackpackSkinId = parsed.equippedBackpackSkinId;
      }
      if (Array.isArray(parsed.equippedCosmeticIds)) {
        cachedState.equippedCosmeticIds = parsed.equippedCosmeticIds;
      }
    }
  } catch {
    // Ignore corrupt cache
  }
}

function saveEquippedCache(): void {
  if (typeof window === 'undefined') return;
  try {
    if (!cachedState.authenticated) {
      window.localStorage.removeItem(EQUIPPED_CACHE_KEY);
      return;
    }
    window.localStorage.setItem(
      EQUIPPED_CACHE_KEY,
      JSON.stringify({
        authenticated: cachedState.authenticated,
        account: cachedState.account,
        playerId: cachedState.playerId,
        ownedProductIds: cachedState.ownedProductIds,
        ownedProducts: cachedState.ownedProducts,
        equippedGunSkinsByClass: cachedState.equippedGunSkinsByClass,
        equippedBackpackSkinId: cachedState.equippedBackpackSkinId,
        equippedCosmeticIds: cachedState.equippedCosmeticIds,
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
  /** Old pre-launch uploads stay stored for saves but do not show in the launch catalog. */
  launchVisible?: boolean;
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
      unlockedIds: [], // Paid unlocks are never persisted solely in unverified localStorage
      equippedBackpackId: null,
      equippedWeaponId: null,
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
      JSON.stringify({
        skins: cachedCustomPhoneState.skins,
        unlockedIds: [],
        equippedBackpackId: null,
        equippedWeaponId: null,
      }),
    );
  } catch {
    // Ignore storage quota errors
  }
}

if (typeof window !== 'undefined') {
  hydrateCustomPhoneOnce();
}

export function getCustomMarketplaceSnapshot(): CustomPhoneMarketplaceState {
  return {
    ...cachedCustomPhoneState,
    // Launch starts with no listings. Previously uploaded records are retained
    // in storage so equipped cosmetics and save compatibility are untouched.
    skins: cachedCustomPhoneState.skins.filter((skin) => skin.launchVisible === true),
    unlockedIds: cachedState.ownedProductIds,
  };
}

export function addCustomMarketplaceSkin(
  skin: CustomPhoneSkinRecord,
): CustomPhoneMarketplaceState {
  cachedCustomPhoneState = {
    ...cachedCustomPhoneState,
    skins: [
      { ...skin, launchVisible: true },
      ...cachedCustomPhoneState.skins.filter((s) => s.id !== skin.id),
    ],
  };
  saveCustomPhoneState();
  notify();
  return getCustomMarketplaceSnapshot();
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
  return getCustomMarketplaceSnapshot();
}

export function unlockCustomMarketplaceSkin(_skinId: string): CustomPhoneMarketplaceState {
  void _skinId;
  // Entitlement unlocks happen strictly server-side via Payhip webhooks.
  void refreshStorefront().catch(() => {});
  return getCustomMarketplaceSnapshot();
}

export function equipCustomMarketplaceSkin(
  skin: CustomPhoneSkinRecord,
): CustomPhoneMarketplaceState {
  // Only allow equipping items owned on the authenticated server account or free preview packs
  const isOwnedOnServer =
    skin.freeByDefault || cachedState.ownedProductIds.includes(skin.id);
  if (!isOwnedOnServer) {
    return getCustomMarketplaceSnapshot();
  }
  if (skin.category === 'backpack') {
    const nextId = cachedCustomPhoneState.equippedBackpackId === skin.id ? null : skin.id;
    cachedCustomPhoneState = {
      ...cachedCustomPhoneState,
      equippedBackpackId: nextId,
    };
  } else if (skin.category === 'weapon') {
    const nextId = cachedCustomPhoneState.equippedWeaponId === skin.id ? null : skin.id;
    cachedCustomPhoneState = {
      ...cachedCustomPhoneState,
      equippedWeaponId: nextId,
    };
  }
  notify();
  return getCustomMarketplaceSnapshot();
}

export function getVaultPayhipSnapshot(): VaultPayhipState {
  // Derive weapon & backpack equip & ownership authoritatively from server storefront state
  const equippedWeaponFromServer =
    Object.values(cachedState.equippedGunSkinsByClass).find(Boolean) ?? null;

  return {
    unlockedIds: Array.from(
      new Set(['vault_backpack_explorer', ...cachedState.ownedProductIds]),
    ),
    equippedBackpackId: cachedState.equippedBackpackSkinId,
    equippedWeaponId: equippedWeaponFromServer,
    customPayhipUrls: {},
    preferVaultBackpack: Boolean(cachedState.equippedBackpackSkinId),
    preferVaultWeapon: Boolean(equippedWeaponFromServer),
    backpackSource: 'exchange',
    weaponSource: 'exchange',
  };
}

export function getVaultCatalogItems(): SkinCatalogItem[] {
  const sourceProducts = cachedState.products;
  if (sourceProducts.length === 0) {
    return VAULT_PAYHIP_CATALOG;
  }
  const serverMapped = sourceProducts.map((p) => toBackpackSkinCatalogItem(p));
  const seenIds = new Set(serverMapped.map((it) => it.id));
  const fallbacks = VAULT_PAYHIP_CATALOG.filter((it) => !seenIds.has(it.id));
  return [...serverMapped, ...fallbacks];
}

export function unlockVaultPayhipItem(_itemId: string): VaultPayhipState {
  void _itemId;
  // Paid items can NEVER be unlocked client-side; always sync from verified server account.
  void refreshStorefront().catch(() => {});
  return getVaultPayhipSnapshot();
}

export function equipVaultPayhipItem(item: SkinCatalogItem): VaultPayhipState {
  const isEquipped =
    item.category === 'backpack'
      ? cachedState.equippedBackpackSkinId === item.id
      : Object.values(cachedState.equippedGunSkinsByClass).includes(item.id);
  void equipExchangeProduct(item.id, isEquipped ? 'unequip' : 'equip');
  return getVaultPayhipSnapshot();
}

export function updateVaultItemPayhipEmbed(
  _itemId: string,
  _checkoutUrl: string,
): VaultPayhipState {
  void _itemId;
  void _checkoutUrl;
  return getVaultPayhipSnapshot();
}

function isProductOwnedByActiveAccount(prod: ExchangeProduct): boolean {
  if (prod.freeByDefault) return true;
  return cachedState.authenticated && cachedState.ownedProductIds.includes(prod.id);
}

export function getEquippedGunSkinForWeapon(
  itemId: ItemId | null,
): ExchangeProduct | null {
  const wc = getWeaponClassForItem(itemId);
  if (!wc) return null;

  if (cachedState.authenticated) {
    const skinId = cachedState.equippedGunSkinsByClass[wc];
    if (skinId) {
      const prod = getExchangeItemById(skinId);
      if (prod && isProductOwnedByActiveAccount(prod)) {
        return prod;
      }
    }
  }

  if (cachedCustomPhoneState.equippedWeaponId) {
    const customSkin = cachedCustomPhoneState.skins.find(
      (s) => s.id === cachedCustomPhoneState.equippedWeaponId && s.category === 'weapon',
    );
    if (
      customSkin &&
      (customSkin.freeByDefault ||
        (cachedState.authenticated && cachedState.ownedProductIds.includes(customSkin.id)))
    ) {
      return toExchangeProductFromSkinCatalogItem(customSkin);
    }
  }

  return null;
}

export function getEquippedBackpackSkin(): ExchangeProduct | null {
  if (cachedState.equippedBackpackSkinId) {
    const prod = getExchangeItemById(cachedState.equippedBackpackSkinId);
    if (prod && isProductOwnedByActiveAccount(prod)) {
      return prod;
    }
  }

  if (cachedCustomPhoneState.equippedBackpackId) {
    const customPack = cachedCustomPhoneState.skins.find(
      (s) => s.id === cachedCustomPhoneState.equippedBackpackId && s.category === 'backpack',
    );
    if (
      customPack &&
      (customPack.freeByDefault ||
        (cachedState.authenticated && cachedState.ownedProductIds.includes(customPack.id)))
    ) {
      return toExchangeProductFromSkinCatalogItem(customPack);
    }
  }

  return null;
}

export async function refreshStorefront(): Promise<ExchangeStorefrontState> {
  const res = await fetch('/api/exchange/storefront', { cache: 'no-store' });
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

// ---- Player Account Authentication Client ----

export async function loginPlayerAccount(
  email: string,
  password: string,
): Promise<{ ok: boolean; account?: PlayerProfileSummary; error?: string }> {
  const res = await fetch('/api/exchange/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'login', email, password }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    account?: PlayerProfileSummary;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Sign in failed.' };
  }
  await refreshStorefront();
  return { ok: true, account: data.account };
}

export async function registerPlayerAccount(
  email: string,
  password: string,
  username?: string,
): Promise<{ ok: boolean; account?: PlayerProfileSummary; error?: string }> {
  const res = await fetch('/api/exchange/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: 'register', email, password, username }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    account?: PlayerProfileSummary;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Registration failed.' };
  }
  await refreshStorefront();
  return { ok: true, account: data.account };
}

export async function logoutPlayerAccount(): Promise<void> {
  await fetch('/api/exchange/auth', { method: 'DELETE' });
  cachedCustomPhoneState = {
    ...cachedCustomPhoneState,
    equippedBackpackId: null,
    equippedWeaponId: null,
  };
  await refreshStorefront();
}

// ---- Payhip Checkout & Automatic Verification Polling ----

export async function createPayhipCheckout(productId: string): Promise<{
  ok: boolean;
  authRequired?: boolean;
  checkoutId?: string;
  checkoutUrl?: string;
  status?: PayhipPurchaseStatus;
  statusMessage?: string;
  error?: string;
}> {
  const res = await fetch('/api/exchange/payhip/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    authRequired?: boolean;
    checkoutId?: string;
    checkoutUrl?: string;
    status?: PayhipPurchaseStatus;
    statusMessage?: string;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      authRequired: Boolean(data.authRequired),
      error: data.error || 'Unable to start Payhip checkout.',
    };
  }
  return {
    ok: true,
    checkoutId: data.checkoutId,
    checkoutUrl: data.checkoutUrl,
    status: data.status,
    statusMessage: data.statusMessage,
  };
}

export async function pollPayhipCheckoutStatus(checkoutId: string): Promise<{
  ok: boolean;
  status?: PayhipPurchaseStatus;
  statusMessage?: string;
  delivered?: boolean;
  owned?: boolean;
  error?: string;
}> {
  const res = await fetch(
    `/api/exchange/payhip/status?checkoutId=${encodeURIComponent(checkoutId)}`,
    { cache: 'no-store' },
  );
  const data = (await res.json()) as {
    ok?: boolean;
    status?: PayhipPurchaseStatus;
    statusMessage?: string;
    delivered?: boolean;
    owned?: boolean;
    error?: string;
  };
  if (!res.ok || !data.ok) {
    return { ok: false, error: data.error || 'Failed to check payment status.' };
  }
  if (data.delivered || data.status === 'delivered' || data.status === 'refunded') {
    await refreshStorefront();
  }
  return {
    ok: true,
    status: data.status,
    statusMessage: data.statusMessage,
    delivered: Boolean(data.delivered),
    owned: Boolean(data.owned),
  };
}

export async function markPayhipCheckoutPending(checkoutId: string): Promise<{
  ok: boolean;
  status?: PayhipPurchaseStatus;
  statusMessage?: string;
}> {
  const res = await fetch('/api/exchange/payhip/status', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ checkoutId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    status?: PayhipPurchaseStatus;
    statusMessage?: string;
  };
  return {
    ok: Boolean(res.ok && data.ok),
    status: data.status,
    statusMessage: data.statusMessage,
  };
}

export async function purchaseExchangeProduct(productId: string): Promise<{
  ok: boolean;
  authRequired?: boolean;
  error?: string;
  insufficientFunds?: boolean;
}> {
  const res = await fetch('/api/exchange/purchase', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    authRequired?: boolean;
    error?: string;
    insufficientFunds?: boolean;
  };
  await refreshStorefront();
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      authRequired: Boolean(data.authRequired),
      error: data.error || 'Purchase could not be completed.',
      insufficientFunds: Boolean(data.insufficientFunds),
    };
  }
  return { ok: true };
}

export async function equipExchangeProduct(
  productId: string,
  action: 'equip' | 'unequip',
): Promise<{ ok: boolean; authRequired?: boolean; error?: string }> {
  const res = await fetch('/api/exchange/equip', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, action }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    authRequired?: boolean;
    error?: string;
  };
  await refreshStorefront();
  if (!res.ok || !data.ok) {
    return {
      ok: false,
      authRequired: Boolean(data.authRequired),
      error: data.error || 'Could not update equipped cosmetic.',
    };
  }
  return { ok: true };
}

export async function requestCoinPackageCheckout(packageId: string): Promise<{
  ok: boolean;
  authRequired?: boolean;
  providerRequired?: boolean;
  message: string;
}> {
  const res = await fetch('/api/exchange/coins/checkout', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ packageId }),
  });
  const data = (await res.json()) as {
    ok?: boolean;
    authRequired?: boolean;
    providerRequired?: boolean;
    message?: string;
    error?: string;
  };
  await refreshStorefront();
  return {
    ok: Boolean(res.ok && data.ok),
    authRequired: Boolean(data.authRequired),
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
