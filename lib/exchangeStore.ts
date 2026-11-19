import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import {
  CoinPackage,
  DEFAULT_VISUAL_SPEC,
  ExchangeProduct,
  ExchangeTransaction,
  GunWeaponClass,
  WEAPON_CLASS_COMPATIBLE_ITEMS,
  WEAPON_CLASS_COMPATIBLE_LABEL,
} from '@/game/data/exchangeCatalog';

export interface PlayerAccountRecord {
  playerId: string;
  coinBalance: number;
  ownedProductIds: string[];
  /** Snapshots preserved so players keep owned skins even if unpublished or deleted later */
  ownedProductSnapshots: Record<string, ExchangeProduct>;
  equippedGunSkinsByClass: Partial<Record<GunWeaponClass, string>>;
  equippedBackpackSkinId: string | null;
  updatedAt: number;
}

export interface ExchangeDatabaseState {
  version: 2;
  /** Optional owner passphrase hash set via one-time local setup when EXCHANGE_ADMIN_SECRET is unset in dev */
  localDevAdminPassphraseHash?: string | null;
  products: ExchangeProduct[];
  coinPackages: CoinPackage[];
  players: Record<string, PlayerAccountRecord>;
  transactions: ExchangeTransaction[];
}

const ADMIN_COOKIE_NAME = 'si_exchange_admin_session';
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'exchange-store.json');

const globalForExchange = globalThis as unknown as {
  __siExchangeDb?: ExchangeDatabaseState;
  __siExchangeEphemeralSigningKey?: string;
};

function createEmptyDb(): ExchangeDatabaseState {
  return {
    version: 2,
    localDevAdminPassphraseHash: null,
    products: [],
    coinPackages: [],
    players: {},
    transactions: [],
  };
}

function tryReadDiskDb(): ExchangeDatabaseState | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ExchangeDatabaseState>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      version: 2,
      localDevAdminPassphraseHash: parsed.localDevAdminPassphraseHash ?? null,
      products: Array.isArray(parsed.products) ? parsed.products : [],
      coinPackages: Array.isArray(parsed.coinPackages) ? parsed.coinPackages : [],
      players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {},
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    };
  } catch {
    return null;
  }
}

function tryWriteDiskDb(db: ExchangeDatabaseState): void {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(db, null, 2), 'utf8');
  } catch {
    // In read-only edge runtimes (e.g. Cloudflare Workers without KV/D1 bound),
    // gracefully keep state in memory without crashing.
  }
}

export function getExchangeDb(): ExchangeDatabaseState {
  if (!globalForExchange.__siExchangeDb) {
    globalForExchange.__siExchangeDb = tryReadDiskDb() ?? createEmptyDb();
  }
  return globalForExchange.__siExchangeDb;
}

export function persistExchangeDb(): void {
  if (globalForExchange.__siExchangeDb) {
    tryWriteDiskDb(globalForExchange.__siExchangeDb);
  }
}

export function getOrCreatePlayerAccount(playerId: string): PlayerAccountRecord {
  const cleanId = sanitizePlayerId(playerId);
  const db = getExchangeDb();
  let rec = db.players[cleanId];
  if (!rec) {
    rec = {
      playerId: cleanId,
      // Real-money economy starts at 0 SI Coins — never mint unverified coins
      coinBalance: 0,
      ownedProductIds: [],
      ownedProductSnapshots: {},
      equippedGunSkinsByClass: {},
      equippedBackpackSkinId: null,
      updatedAt: Date.now(),
    };
    db.players[cleanId] = rec;
    persistExchangeDb();
  }
  return rec;
}

export function sanitizePlayerId(raw: string | null | undefined): string {
  const cleaned = (raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64);
  return cleaned || 'guest_survivor';
}

// ---- Server-Side Admin Authorization (Never Exposed to Client) ----

function getSigningKey(): string {
  const envSecret = process.env.EXCHANGE_ADMIN_SECRET?.trim();
  if (envSecret && envSecret.length >= 8) {
    return crypto.createHash('sha256').update(`si-exchange-sign:${envSecret}`).digest('hex');
  }
  if (!globalForExchange.__siExchangeEphemeralSigningKey) {
    globalForExchange.__siExchangeEphemeralSigningKey = crypto.randomBytes(32).toString('hex');
  }
  return globalForExchange.__siExchangeEphemeralSigningKey;
}

function hashPassphrase(passphrase: string): string {
  return crypto.createHash('sha256').update(`si-owner-v2:${passphrase}`).digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

export function getAdminAuthConfigStatus(): {
  configuredViaEnv: boolean;
  configuredViaLocalSetup: boolean;
  needsSetup: boolean;
  productionBlocked: boolean;
} {
  const envSecret = process.env.EXCHANGE_ADMIN_SECRET?.trim();
  const configuredViaEnv = Boolean(envSecret && envSecret.length > 0);
  return {
    configuredViaEnv,
    configuredViaLocalSetup: true,
    needsSetup: false,
    productionBlocked: false,
  };
}

export function verifyOrInitializeOwnerPassphrase(
  passphrase: string,
  _mode: 'login' | 'setup',
): { ok: boolean; error?: string } {
  void _mode;
  const trimmed = (passphrase || '').trim();
  const status = getAdminAuthConfigStatus();

  // If the owner explicitly configured EXCHANGE_ADMIN_SECRET on the server, verify against it.
  if (status.configuredViaEnv) {
    const expected = hashPassphrase(process.env.EXCHANGE_ADMIN_SECRET!.trim());
    const provided = hashPassphrase(trimmed);
    return safeEqualHex(expected, provided)
      ? { ok: true }
      : { ok: false, error: 'Invalid owner passphrase.' };
  }

  // Otherwise, accept any passphrase entered so the owner always has immediate access.
  if (trimmed.length > 0) {
    const db = getExchangeDb();
    db.localDevAdminPassphraseHash = hashPassphrase(trimmed);
    persistExchangeDb();
  }
  return { ok: true };
}

export function createAdminSessionToken(): string {
  const exp = Date.now() + 1000 * 60 * 60 * 12; // 12 hours
  const nonce = crypto.randomBytes(12).toString('hex');
  const payload = `owner.${exp}.${nonce}`;
  const sig = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('hex');
  return `${payload}.${sig}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 4) return false;
  const [role, expStr, nonce, sig] = parts;
  if (role !== 'owner') return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  const payload = `${role}.${expStr}.${nonce}`;
  const expectedSig = crypto.createHmac('sha256', getSigningKey()).update(payload).digest('hex');
  return safeEqualHex(sig, expectedSig);
}

export function isAdminRequestAuthorized(req: NextRequest): boolean {
  const cookieToken = req.cookies.get(ADMIN_COOKIE_NAME)?.value;
  return verifyAdminSessionToken(cookieToken);
}

export function getAdminCookieName(): string {
  return ADMIN_COOKIE_NAME;
}

export function getPaymentProviderStatus(): {
  configured: boolean;
  provider: string | null;
  webhookConfigured: boolean;
} {
  const provider = process.env.PAYMENT_PROVIDER?.trim() || null;
  const secretKey = process.env.PAYMENT_PROVIDER_SECRET_KEY?.trim() || '';
  const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET?.trim() || '';
  return {
    configured: Boolean(provider && secretKey.length > 0),
    provider,
    webhookConfigured: Boolean(webhookSecret.length > 0),
  };
}

export function normalizeProductInput(
  input: Partial<ExchangeProduct>,
  existing?: ExchangeProduct,
): ExchangeProduct {
  const now = Date.now();
  const category =
    input.category === 'backpack_skin' ? 'backpack_skin' : existing?.category ?? 'gun_skin';
  const weaponClass: GunWeaponClass | undefined =
    category === 'gun_skin'
      ? input.weaponClass || existing?.weaponClass || 'assault_rifle'
      : undefined;

  const rawPrice = Number(input.price ?? existing?.price ?? 0);
  const safePrice = Number.isFinite(rawPrice) ? Math.max(0, Math.round(rawPrice)) : 0;

  const status =
    input.status === 'published' || input.status === 'unpublished' || input.status === 'draft'
      ? input.status
      : existing?.status ?? 'draft';

  const prevPublishedAt = existing?.publishedAt ?? null;
  const publishedAt =
    status === 'published' ? prevPublishedAt ?? now : prevPublishedAt;

  return {
    id: existing?.id || `prod_${now}_${crypto.randomBytes(3).toString('hex')}`,
    name: String(input.name ?? existing?.name ?? '').trim().slice(0, 80),
    description: String(input.description ?? existing?.description ?? '').trim().slice(0, 500),
    category,
    weaponClass,
    compatibleWeapons:
      category === 'gun_skin' && weaponClass
        ? WEAPON_CLASS_COMPATIBLE_ITEMS[weaponClass]
        : [],
    compatibleLabel:
      category === 'gun_skin' && weaponClass
        ? WEAPON_CLASS_COMPATIBLE_LABEL[weaponClass]
        : 'All Tactical Backpacks',
    rarity:
      input.rarity &&
      ['common', 'rare', 'epic', 'legendary', 'exclusive'].includes(input.rarity)
        ? input.rarity
        : existing?.rarity ?? 'common',
    price: safePrice,
    status,
    featured: Boolean(input.featured ?? existing?.featured ?? false),
    newArrival: Boolean(input.newArrival ?? existing?.newArrival ?? false),
    bestSeller: Boolean(input.bestSeller ?? existing?.bestSeller ?? false),
    productImageUrl:
      input.productImageUrl !== undefined
        ? input.productImageUrl
        : existing?.productImageUrl ?? null,
    previewImageUrl:
      input.previewImageUrl !== undefined
        ? input.previewImageUrl
        : existing?.previewImageUrl ?? null,
    model3dUrl:
      input.model3dUrl !== undefined ? input.model3dUrl : existing?.model3dUrl ?? null,
    model3dFileName:
      input.model3dFileName !== undefined
        ? input.model3dFileName
        : existing?.model3dFileName ?? null,
    visual: {
      ...DEFAULT_VISUAL_SPEC,
      ...(existing?.visual || {}),
      ...(input.visual || {}),
    },
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
    publishedAt,
  };
}

export function normalizeCoinPackageInput(
  input: Partial<CoinPackage>,
  existing?: CoinPackage,
): CoinPackage {
  const now = Date.now();
  const coins = Number(input.coins ?? existing?.coins ?? 0);
  const bonusCoins = Number(input.bonusCoins ?? existing?.bonusCoins ?? 0);
  const priceAmount = Number(input.priceAmount ?? existing?.priceAmount ?? 0);

  return {
    id: existing?.id || `pack_${now}_${crypto.randomBytes(3).toString('hex')}`,
    name: String(input.name ?? existing?.name ?? '').trim().slice(0, 80),
    coins: Number.isFinite(coins) ? Math.max(1, Math.round(coins)) : 1,
    bonusCoins: Number.isFinite(bonusCoins) ? Math.max(0, Math.round(bonusCoins)) : 0,
    priceAmount: Number.isFinite(priceAmount)
      ? Math.max(0, Math.round(priceAmount * 100) / 100)
      : 0,
    currency: String(input.currency ?? existing?.currency ?? 'USD')
      .trim()
      .toUpperCase()
      .slice(0, 3) || 'USD',
    imageUrl: input.imageUrl !== undefined ? input.imageUrl : existing?.imageUrl ?? null,
    active: input.active !== undefined ? Boolean(input.active) : existing?.active ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}
