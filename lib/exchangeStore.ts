import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import type { NextRequest } from 'next/server';
import {
  CoinPackage,
  DEFAULT_EXCHANGE_CATALOG,
  DEFAULT_VISUAL_SPEC,
  ExchangeProduct,
  ExchangeTransaction,
  GunWeaponClass,
  PartialRefundPolicy,
  WEAPON_CLASS_COMPATIBLE_ITEMS,
  WEAPON_CLASS_COMPATIBLE_LABEL,
  formatCurrencyPrice,
} from '@/game/data/exchangeCatalog';

export type PayhipPurchaseStatus =
  | 'waiting_confirmation'
  | 'pending_verification'
  | 'paid'
  | 'delivered'
  | 'failed'
  | 'refunded';

export const PAYHIP_STATUS_LABELS: Record<PayhipPurchaseStatus, string> = {
  waiting_confirmation: 'Waiting for payment confirmation',
  pending_verification: 'Purchase pending verification',
  paid: 'Payment successful',
  delivered: 'Item delivered successfully',
  failed: 'Payment unsuccessful',
  refunded: 'Payment refunded — entitlement revoked',
};

export interface PayhipCheckoutSession {
  checkoutId: string;
  playerId: string;
  playerEmail: string;
  productId: string;
  productName: string;
  payhipProductId: string | null;
  payhipProductKey: string | null;
  payhipUrl: string;
  expectedAmountCents: number;
  currency: string;
  status: PayhipPurchaseStatus;
  statusMessage: string;
  payhipTransactionId?: string | null;
  createdAt: number;
  updatedAt: number;
  expiresAt: number;
}

export interface ProcessedPayhipEvent {
  idempotencyKey: string;
  eventType: string;
  txId: string;
  playerId: string;
  productId: string;
  paidAmountCents: number;
  refundedAmountCents: number;
  currency: string;
  processedAt: number;
  revoked?: boolean;
}

export interface PlayerAccountRecord {
  playerId: string;
  username?: string;
  email?: string;
  passwordHash?: string;
  coinBalance: number;
  ownedProductIds: string[];
  revokedProductIds?: string[];
  /** Snapshots preserved so players keep owned skins even if unpublished or deleted later */
  ownedProductSnapshots: Record<string, ExchangeProduct>;
  equippedGunSkinsByClass: Partial<Record<GunWeaponClass, string>>;
  equippedBackpackSkinId: string | null;
  equippedCosmeticIds?: string[];
  createdAt?: number;
  updatedAt: number;
}

export interface PublicPlayerProfile {
  playerId: string;
  username: string;
  email: string;
  createdAt: number;
}

export interface ExchangeDatabaseState {
  version: 2 | 3;
  /** Optional owner passphrase hash set via one-time local setup when EXCHANGE_ADMIN_SECRET is unset in dev */
  localDevAdminPassphraseHash?: string | null;
  seededDefaultIds?: string[];
  products: ExchangeProduct[];
  coinPackages: CoinPackage[];
  players: Record<string, PlayerAccountRecord>;
  transactions: ExchangeTransaction[];
  payhipCheckouts?: Record<string, PayhipCheckoutSession>;
  processedPayhipEvents?: Record<string, ProcessedPayhipEvent>;
}

const ADMIN_COOKIE_NAME = 'si_exchange_admin_session';
const PLAYER_COOKIE_NAME = 'si_player_session';
const DATA_DIR = path.join(process.cwd(), '.data');
const DATA_FILE = path.join(DATA_DIR, 'exchange-store.json');

const globalForExchange = globalThis as unknown as {
  __siExchangeDb?: ExchangeDatabaseState;
  __siExchangeEphemeralSigningKey?: string;
};

function createEmptyDb(): ExchangeDatabaseState {
  return {
    version: 3,
    localDevAdminPassphraseHash: null,
    seededDefaultIds: [],
    products: [],
    coinPackages: [],
    players: {},
    transactions: [],
    payhipCheckouts: {},
    processedPayhipEvents: {},
  };
}

function seedDefaultCatalogOnce(db: ExchangeDatabaseState): void {
  if (!Array.isArray(db.seededDefaultIds)) {
    db.seededDefaultIds = [];
  }
  let changed = false;
  for (const def of DEFAULT_EXCHANGE_CATALOG) {
    if (!db.seededDefaultIds.includes(def.id)) {
      db.seededDefaultIds.push(def.id);
      if (!db.products.some((p) => p.id === def.id)) {
        db.products.push({ ...def, visual: { ...def.visual } });
      }
      changed = true;
    }
  }
  if (!db.payhipCheckouts) {
    db.payhipCheckouts = {};
    changed = true;
  }
  if (!db.processedPayhipEvents) {
    db.processedPayhipEvents = {};
    changed = true;
  }
  if (changed) {
    tryWriteDiskDb(db);
  }
}

function tryReadDiskDb(): ExchangeDatabaseState | null {
  try {
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ExchangeDatabaseState>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      version: 3,
      localDevAdminPassphraseHash: parsed.localDevAdminPassphraseHash ?? null,
      seededDefaultIds: Array.isArray(parsed.seededDefaultIds) ? parsed.seededDefaultIds : [],
      products: Array.isArray(parsed.products) ? parsed.products : [],
      coinPackages: Array.isArray(parsed.coinPackages) ? parsed.coinPackages : [],
      players: parsed.players && typeof parsed.players === 'object' ? parsed.players : {},
      transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
      payhipCheckouts:
        parsed.payhipCheckouts && typeof parsed.payhipCheckouts === 'object'
          ? parsed.payhipCheckouts
          : {},
      processedPayhipEvents:
        parsed.processedPayhipEvents && typeof parsed.processedPayhipEvents === 'object'
          ? parsed.processedPayhipEvents
          : {},
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
    // Gracefully keep state in memory if disk write is restricted.
  }
}

export function getExchangeDb(): ExchangeDatabaseState {
  if (!globalForExchange.__siExchangeDb) {
    const db = tryReadDiskDb() ?? createEmptyDb();
    seedDefaultCatalogOnce(db);
    globalForExchange.__siExchangeDb = db;
  }
  return globalForExchange.__siExchangeDb;
}

export function persistExchangeDb(): void {
  if (globalForExchange.__siExchangeDb) {
    tryWriteDiskDb(globalForExchange.__siExchangeDb);
  }
}

export function reloadExchangeDbFromDisk(): ExchangeDatabaseState {
  const db = tryReadDiskDb() ?? createEmptyDb();
  seedDefaultCatalogOnce(db);
  globalForExchange.__siExchangeDb = db;
  return db;
}

export function sanitizePlayerId(raw: string | null | undefined): string {
  const cleaned = (raw || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]/g, '')
    .slice(0, 64);
  return cleaned || 'guest_survivor';
}

export function normalizeEmail(raw: string | null | undefined): string {
  return String(raw || '').trim().toLowerCase().slice(0, 120);
}

export function getOrCreatePlayerAccount(playerId: string): PlayerAccountRecord {
  const cleanId = sanitizePlayerId(playerId);
  const db = getExchangeDb();
  let rec = db.players[cleanId];
  if (!rec) {
    rec = {
      playerId: cleanId,
      coinBalance: 0,
      ownedProductIds: [],
      revokedProductIds: [],
      ownedProductSnapshots: {},
      equippedGunSkinsByClass: {},
      equippedBackpackSkinId: null,
      equippedCosmeticIds: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    db.players[cleanId] = rec;
    persistExchangeDb();
  }
  if (!Array.isArray(rec.revokedProductIds)) rec.revokedProductIds = [];
  if (!Array.isArray(rec.equippedCosmeticIds)) rec.equippedCosmeticIds = [];
  return rec;
}

// ---- Signing Keys & Cryptographic Utilities ----

function getAdminSigningKey(): string {
  const envSecret = process.env.EXCHANGE_ADMIN_SECRET?.trim();
  if (envSecret && envSecret.length >= 8) {
    return crypto.createHash('sha256').update(`si-exchange-sign:${envSecret}`).digest('hex');
  }
  if (!globalForExchange.__siExchangeEphemeralSigningKey) {
    globalForExchange.__siExchangeEphemeralSigningKey = crypto.randomBytes(32).toString('hex');
  }
  return globalForExchange.__siExchangeEphemeralSigningKey;
}

function getPlayerSigningKey(): string {
  const envSecret = process.env.EXCHANGE_ADMIN_SECRET?.trim();
  if (envSecret && envSecret.length >= 8) {
    return crypto.createHash('sha256').update(`si-player-sign:${envSecret}`).digest('hex');
  }
  if (!globalForExchange.__siExchangeEphemeralSigningKey) {
    globalForExchange.__siExchangeEphemeralSigningKey = crypto.randomBytes(32).toString('hex');
  }
  return crypto
    .createHash('sha256')
    .update(`si-player-ephemeral:${globalForExchange.__siExchangeEphemeralSigningKey}`)
    .digest('hex');
}

function safeEqualString(a: string, b: string): boolean {
  try {
    const bufA = Buffer.from(a, 'utf8');
    const bufB = Buffer.from(b, 'utf8');
    if (bufA.length !== bufB.length) return false;
    return crypto.timingSafeEqual(bufA, bufB);
  } catch {
    return false;
  }
}

function hashPlayerPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

function verifyPlayerPassword(password: string, storedHash: string | undefined): boolean {
  if (!storedHash || !storedHash.startsWith('scrypt:')) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const [, salt, hexHash] = parts;
  if (!salt || !hexHash) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64).toString('hex');
    return safeEqualString(derived, hexHash);
  } catch {
    return false;
  }
}

// ---- Server-Side Player Account Auth & Session Cookies ----

export function getPlayerCookieName(): string {
  return PLAYER_COOKIE_NAME;
}

export function createPlayerSessionToken(playerId: string): string {
  const exp = Date.now() + 1000 * 60 * 60 * 24 * 30; // 30 days
  const nonce = crypto.randomBytes(12).toString('hex');
  const payload = `player.${playerId}.${exp}.${nonce}`;
  const sig = crypto
    .createHmac('sha256', getPlayerSigningKey())
    .update(payload)
    .digest('hex');
  return `${payload}.${sig}`;
}

export function verifyPlayerSessionToken(token: string | undefined | null): string | null {
  if (!token) return null;
  const parts = token.split('.');
  if (parts.length !== 5) return null;
  const [role, playerId, expStr, nonce, sig] = parts;
  if (role !== 'player' || !playerId) return null;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return null;
  const payload = `${role}.${playerId}.${expStr}.${nonce}`;
  const expectedSig = crypto
    .createHmac('sha256', getPlayerSigningKey())
    .update(payload)
    .digest('hex');
  if (!safeEqualString(sig, expectedSig)) return null;
  return sanitizePlayerId(playerId);
}

export function getAuthenticatedPlayer(req: NextRequest): PlayerAccountRecord | null {
  const authorization = req.headers.get('authorization') || '';
  const bearerMatch = authorization.match(/^Bearer\s+(.+)$/i);
  const token = bearerMatch?.[1]?.trim() || req.cookies.get(PLAYER_COOKIE_NAME)?.value;
  const playerId = verifyPlayerSessionToken(token);
  if (!playerId) return null;
  const db = getExchangeDb();
  const account = db.players[playerId];
  if (!account || !account.email || !account.passwordHash) return null;
  if (!Array.isArray(account.revokedProductIds)) account.revokedProductIds = [];
  if (!Array.isArray(account.equippedCosmeticIds)) account.equippedCosmeticIds = [];
  return account;
}

export function toPublicPlayerProfile(account: PlayerAccountRecord): PublicPlayerProfile {
  return {
    playerId: account.playerId,
    username: account.username || account.email?.split('@')[0] || account.playerId,
    email: account.email || '',
    createdAt: account.createdAt || account.updatedAt,
  };
}

export function registerPlayerAccount(params: {
  email: string;
  password: string;
  username?: string;
}): { ok: boolean; account?: PlayerAccountRecord; error?: string; status?: number } {
  const email = normalizeEmail(params.email);
  const password = String(params.password || '');
  const rawName = String(params.username || '').trim().slice(0, 32);

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, error: 'Please enter a valid email address.', status: 400 };
  }
  if (password.length < 6) {
    return {
      ok: false,
      error: 'Password must be at least 6 characters long.',
      status: 400,
    };
  }

  const db = getExchangeDb();
  const existing = Object.values(db.players).find(
    (p) => p.email && normalizeEmail(p.email) === email,
  );
  if (existing) {
    return {
      ok: false,
      error: 'An account with this email already exists. Please sign in instead.',
      status: 409,
    };
  }

  const playerId = `acct_${crypto.randomBytes(6).toString('hex')}`;
  const now = Date.now();
  const username = rawName || email.split('@')[0];

  const account: PlayerAccountRecord = {
    playerId,
    username,
    email,
    passwordHash: hashPlayerPassword(password),
    coinBalance: 0,
    ownedProductIds: ['vault_backpack_explorer'],
    revokedProductIds: [],
    ownedProductSnapshots: {},
    equippedGunSkinsByClass: {},
    equippedBackpackSkinId: null,
    equippedCosmeticIds: [],
    createdAt: now,
    updatedAt: now,
  };

  db.players[playerId] = account;
  persistExchangeDb();
  return { ok: true, account };
}

export function authenticatePlayerAccount(params: {
  email: string;
  password: string;
}): { ok: boolean; account?: PlayerAccountRecord; error?: string; status?: number } {
  const email = normalizeEmail(params.email);
  const password = String(params.password || '');
  if (!email || !password) {
    return { ok: false, error: 'Email and password are required.', status: 400 };
  }

  const db = getExchangeDb();
  const account = Object.values(db.players).find(
    (p) => p.email && normalizeEmail(p.email) === email,
  );
  if (!account || !verifyPlayerPassword(password, account.passwordHash)) {
    return { ok: false, error: 'Invalid email or password.', status: 401 };
  }

  if (!Array.isArray(account.revokedProductIds)) account.revokedProductIds = [];
  if (!Array.isArray(account.equippedCosmeticIds)) account.equippedCosmeticIds = [];
  return { ok: true, account };
}

// ---- Server-Side Admin Authorization (Never Exposed to Client) ----

function hashPassphrase(passphrase: string): string {
  return crypto.createHash('sha256').update(`si-owner-v2:${passphrase}`).digest('hex');
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

  if (status.configuredViaEnv) {
    const expected = hashPassphrase(process.env.EXCHANGE_ADMIN_SECRET!.trim());
    const provided = hashPassphrase(trimmed);
    return safeEqualString(expected, provided)
      ? { ok: true }
      : { ok: false, error: 'Invalid owner passphrase.' };
  }

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
  const sig = crypto
    .createHmac('sha256', getAdminSigningKey())
    .update(payload)
    .digest('hex');
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
  const expectedSig = crypto
    .createHmac('sha256', getAdminSigningKey())
    .update(payload)
    .digest('hex');
  return safeEqualString(sig, expectedSig);
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
  payhipConfigured: boolean;
  payhipWebhookConfigured: boolean;
} {
  const payhipApiKey = process.env.PAYHIP_API_KEY?.trim() || '';
  const payhipReady = payhipApiKey.length > 0;
  return {
    configured: payhipReady,
    provider: payhipReady ? 'payhip' : null,
    webhookConfigured: payhipReady,
    payhipConfigured: payhipReady,
    payhipWebhookConfigured: payhipReady,
  };
}

// ---- Product & Coin Package Normalization ----

export function extractPayhipKeyFromUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    if (!parsed.hostname.toLowerCase().includes('payhip.com')) return null;
    const match = parsed.pathname.match(/\/b\/([a-zA-Z0-9_-]+)/i);
    if (match?.[1]) return match[1];
    const slug = parsed.pathname.split('/').filter(Boolean).pop();
    return slug || null;
  } catch {
    return null;
  }
}

export function sanitizeHttpsPayhipUrl(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const match = trimmed.match(/https:\/\/(?:www\.)?payhip\.com\/[^\s"'<>]+/i);
  const candidate = match ? match[0] : trimmed;
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:' || !parsed.hostname.toLowerCase().endsWith('payhip.com')) {
      return null;
    }
    return parsed.toString();
  } catch {
    return null;
  }
}

export function normalizeProductInput(
  input: Partial<ExchangeProduct>,
  existing?: ExchangeProduct,
): ExchangeProduct {
  const now = Date.now();
  const category =
    input.category === 'backpack_skin' ||
    input.category === 'gun_skin' ||
    input.category === 'cosmetic'
      ? input.category
      : existing?.category ?? 'gun_skin';
  const weaponClass: GunWeaponClass | undefined =
    category === 'gun_skin'
      ? input.weaponClass || existing?.weaponClass || 'assault_rifle'
      : undefined;

  const rawPrice = Number(input.price ?? existing?.price ?? 0);
  const safePrice = Number.isFinite(rawPrice) ? Math.max(0, Math.round(rawPrice)) : 0;

  const rawRealMoney =
    input.realMoneyAmount !== undefined
      ? input.realMoneyAmount === null
        ? null
        : Number(input.realMoneyAmount)
      : existing?.realMoneyAmount ?? null;
  const safeRealMoney =
    rawRealMoney !== null && Number.isFinite(rawRealMoney)
      ? Math.max(0, Math.round(rawRealMoney * 100) / 100)
      : null;

  const status =
    input.status === 'published' || input.status === 'unpublished' || input.status === 'draft'
      ? input.status
      : existing?.status ?? 'draft';

  const prevPublishedAt = existing?.publishedAt ?? null;
  const publishedAt = status === 'published' ? prevPublishedAt ?? now : prevPublishedAt;

  const rawPayhipUrl =
    input.payhipUrl !== undefined ? sanitizeHttpsPayhipUrl(input.payhipUrl) : existing?.payhipUrl ?? null;
  const rawPayhipKey =
    input.payhipProductKey !== undefined
      ? (input.payhipProductKey ? String(input.payhipProductKey).trim().slice(0, 80) : null)
      : existing?.payhipProductKey ?? extractPayhipKeyFromUrl(rawPayhipUrl);
  const resolvedPayhipUrl =
    rawPayhipUrl || (rawPayhipKey ? `https://payhip.com/b/${rawPayhipKey}` : null);
  const rawPayhipProductId =
    input.payhipProductId !== undefined
      ? (input.payhipProductId ? String(input.payhipProductId).trim().slice(0, 80) : null)
      : existing?.payhipProductId ?? null;

  const partialRefundPolicy: PartialRefundPolicy =
    input.partialRefundPolicy === 'keep' || input.partialRefundPolicy === 'revoke'
      ? input.partialRefundPolicy
      : existing?.partialRefundPolicy ?? 'revoke';

  return {
    id: existing?.id || `prod_${now}_${crypto.randomBytes(3).toString('hex')}`,
    name: String(input.name ?? existing?.name ?? '').trim().slice(0, 80),
    description: String(input.description ?? existing?.description ?? '').trim().slice(0, 500),
    category,
    weaponClass,
    compatibleWeapons:
      category === 'gun_skin'
        ? existing?.compatibleWeapons && existing.compatibleWeapons.length > 0 && !input.weaponClass
          ? existing.compatibleWeapons
          : weaponClass
            ? WEAPON_CLASS_COMPATIBLE_ITEMS[weaponClass]
            : []
        : [],
    compatibleLabel:
      category === 'gun_skin'
        ? existing?.compatibleLabel === 'All Firearms' && !input.weaponClass
          ? 'All Firearms'
          : weaponClass
            ? WEAPON_CLASS_COMPATIBLE_LABEL[weaponClass]
            : 'All Firearms'
        : category === 'cosmetic'
          ? 'Character Cosmetic'
          : 'All Tactical Backpacks',
    rarity:
      input.rarity &&
      ['common', 'rare', 'epic', 'legendary', 'exclusive'].includes(input.rarity)
        ? input.rarity
        : existing?.rarity ?? 'common',
    price: safePrice,
    realMoneyAmount: safeRealMoney,
    realMoneyCurrency:
      String(input.realMoneyCurrency ?? existing?.realMoneyCurrency ?? 'USD')
        .trim()
        .toUpperCase()
        .slice(0, 3) || 'USD',
    payhipProductId: rawPayhipProductId,
    payhipProductKey: rawPayhipKey,
    payhipUrl: resolvedPayhipUrl,
    partialRefundPolicy,
    freeByDefault:
      input.freeByDefault !== undefined
        ? Boolean(input.freeByDefault)
        : existing?.freeByDefault ?? false,
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
    currency:
      String(input.currency ?? existing?.currency ?? 'USD')
        .trim()
        .toUpperCase()
        .slice(0, 3) || 'USD',
    imageUrl: input.imageUrl !== undefined ? input.imageUrl : existing?.imageUrl ?? null,
    active: input.active !== undefined ? Boolean(input.active) : existing?.active ?? true,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };
}

// ---- Payhip Server-Side Checkout & Webhook Fulfillment ----

export function createPayhipCheckoutForPlayer(
  account: PlayerAccountRecord,
  productId: string,
): {
  ok: boolean;
  status?: number;
  error?: string;
  checkout?: PayhipCheckoutSession;
  checkoutUrl?: string;
} {
  const db = getExchangeDb();
  const product = db.products.find((p) => p.id === productId);
  if (!product || product.status !== 'published') {
    return {
      ok: false,
      status: 404,
      error: 'Product is not available for Payhip checkout.',
    };
  }

  if (account.ownedProductIds.includes(product.id)) {
    return {
      ok: false,
      status: 409,
      error: 'You already own this item in your account.',
    };
  }

  const basePayhipUrl =
    sanitizeHttpsPayhipUrl(product.payhipUrl) ||
    (product.payhipProductKey ? `https://payhip.com/b/${product.payhipProductKey}` : null);
  if (!basePayhipUrl) {
    return {
      ok: false,
      status: 400,
      error: 'This item does not have a Payhip product checkout URL configured.',
    };
  }

  const now = Date.now();
  const checkoutId = `chk_${now}_${crypto.randomBytes(5).toString('hex')}`;
  const expectedAmountCents =
    product.realMoneyAmount && product.realMoneyAmount > 0
      ? Math.round(product.realMoneyAmount * 100)
      : 0;
  const currency = (product.realMoneyCurrency || 'USD').toUpperCase();

  const checkoutUrlObj = new URL(basePayhipUrl);
  if (account.email) {
    checkoutUrlObj.searchParams.set('email', account.email);
  }
  // Passthrough metadata identifying the game account + checkout session (never includes any secrets)
  const metadataToken = `si:${checkoutId}:${account.playerId}:${product.id}`;
  checkoutUrlObj.searchParams.set('custom', metadataToken);
  checkoutUrlObj.searchParams.set('checkout_id', checkoutId);
  checkoutUrlObj.searchParams.set('player_id', account.playerId);
  checkoutUrlObj.searchParams.set('product_id', product.id);

  const session: PayhipCheckoutSession = {
    checkoutId,
    playerId: account.playerId,
    playerEmail: normalizeEmail(account.email),
    productId: product.id,
    productName: product.name,
    payhipProductId: product.payhipProductId ?? null,
    payhipProductKey: product.payhipProductKey ?? extractPayhipKeyFromUrl(basePayhipUrl),
    payhipUrl: checkoutUrlObj.toString(),
    expectedAmountCents,
    currency,
    status: 'waiting_confirmation',
    statusMessage: PAYHIP_STATUS_LABELS.waiting_confirmation,
    payhipTransactionId: null,
    createdAt: now,
    updatedAt: now,
    expiresAt: now + 1000 * 60 * 60 * 24,
  };

  if (!db.payhipCheckouts) db.payhipCheckouts = {};
  db.payhipCheckouts[checkoutId] = session;

  // Prune expired uncompleted checkouts over 48 hours old to keep store compact
  const cutoff = now - 1000 * 60 * 60 * 48;
  for (const [id, chk] of Object.entries(db.payhipCheckouts)) {
    if (chk.updatedAt < cutoff && chk.status === 'waiting_confirmation') {
      delete db.payhipCheckouts[id];
    }
  }

  const tx: ExchangeTransaction = {
    id: `tx_${now}_${crypto.randomBytes(3).toString('hex')}`,
    type: 'payhip_checkout_created',
    playerId: account.playerId,
    itemId: product.id,
    itemName: product.name,
    coinDelta: 0,
    realMoneyAmount: expectedAmountCents / 100,
    currency,
    status: 'pending_provider',
    provider: 'payhip',
    providerReference: checkoutId,
    createdAt: now,
    note: `Waiting for payment confirmation (${formatCurrencyPrice(expectedAmountCents / 100, currency)}).`,
  };
  db.transactions.unshift(tx);
  if (db.transactions.length > 500) db.transactions.length = 500;
  persistExchangeDb();

  return {
    ok: true,
    status: 200,
    checkout: session,
    checkoutUrl: session.payhipUrl,
  };
}

export function getPayhipCheckoutForPlayer(
  account: PlayerAccountRecord,
  checkoutId: string,
): PayhipCheckoutSession | null {
  const db = getExchangeDb();
  const session = db.payhipCheckouts?.[checkoutId];
  if (!session) return null;
  // Strictly isolate checkouts to their owning authenticated player
  if (session.playerId !== account.playerId) return null;
  return session;
}

export function markPayhipCheckoutPendingVerification(
  account: PlayerAccountRecord,
  checkoutId: string,
): PayhipCheckoutSession | null {
  const db = getExchangeDb();
  const session = db.payhipCheckouts?.[checkoutId];
  if (!session || session.playerId !== account.playerId) return null;
  // Never downgrade terminal states (delivered/paid/failed/refunded)
  if (session.status === 'waiting_confirmation') {
    session.status = 'pending_verification';
    session.statusMessage = PAYHIP_STATUS_LABELS.pending_verification;
    session.updatedAt = Date.now();
    persistExchangeDb();
  }
  return session;
}

export function verifyPayhipWebhookSignature(
  rawBody: string,
  payload: Record<string, unknown>,
  headerSignature: string | null,
): { ok: boolean; error?: string; status?: number } {
  const apiKey = process.env.PAYHIP_API_KEY?.trim() || '';

  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      error: 'PAYHIP_API_KEY is not configured on the server.',
    };
  }

  const incomingPayloadSig =
    typeof payload.signature === 'string' ? payload.signature.trim().toLowerCase() : '';
  const incomingHeaderSig = (headerSignature || '').trim().toLowerCase();

  if (!incomingPayloadSig && !incomingHeaderSig) {
    return { ok: false, status: 401, error: 'Missing Payhip webhook signature.' };
  }

  // Payhip documented verification procedure: sha256(PAYHIP_API_KEY) matching payload.signature
  const expectedSha256 = crypto
    .createHash('sha256')
    .update(apiKey)
    .digest('hex')
    .toLowerCase();
  if (incomingPayloadSig && safeEqualString(incomingPayloadSig, expectedSha256)) {
    return { ok: true };
  }

  const expectedHmac = crypto
    .createHmac('sha256', apiKey)
    .update(rawBody)
    .digest('hex')
    .toLowerCase();
  if (incomingHeaderSig && safeEqualString(incomingHeaderSig, expectedHmac)) {
    return { ok: true };
  }

  return { ok: false, status: 401, error: 'Invalid Payhip webhook signature.' };
}

interface ParsedMetadataHints {
  checkoutId?: string;
  playerId?: string;
  productId?: string;
}

function parseMetadataHints(payload: Record<string, unknown>): ParsedMetadataHints {
  const hints: ParsedMetadataHints = {};
  const tryParseString = (raw: unknown) => {
    if (typeof raw !== 'string') return;
    const trimmed = raw.trim();
    if (!trimmed) return;
    if (trimmed.startsWith('si:')) {
      const parts = trimmed.split(':');
      if (parts[1]) hints.checkoutId = parts[1];
      if (parts[2]) hints.playerId = parts[2];
      if (parts[3]) hints.productId = parts[3];
      return;
    }
    if (trimmed.startsWith('{')) {
      try {
        const parsed = JSON.parse(trimmed) as Record<string, unknown>;
        if (typeof parsed.checkoutId === 'string') hints.checkoutId = parsed.checkoutId;
        if (typeof parsed.checkout_id === 'string') hints.checkoutId = parsed.checkout_id;
        if (typeof parsed.playerId === 'string') hints.playerId = parsed.playerId;
        if (typeof parsed.player_id === 'string') hints.playerId = parsed.player_id;
        if (typeof parsed.productId === 'string') hints.productId = parsed.productId;
        if (typeof parsed.product_id === 'string') hints.productId = parsed.product_id;
      } catch {
        // ignore non-JSON custom string
      }
    }
  };

  tryParseString(payload.custom);
  tryParseString(payload.passthrough);

  const meta =
    payload.metadata && typeof payload.metadata === 'object'
      ? (payload.metadata as Record<string, unknown>)
      : null;
  if (meta) {
    if (!hints.checkoutId && typeof meta.checkoutId === 'string') hints.checkoutId = meta.checkoutId;
    if (!hints.checkoutId && typeof meta.checkout_id === 'string')
      hints.checkoutId = meta.checkout_id;
    if (!hints.playerId && typeof meta.playerId === 'string') hints.playerId = meta.playerId;
    if (!hints.playerId && typeof meta.player_id === 'string') hints.playerId = meta.player_id;
    if (!hints.productId && typeof meta.productId === 'string') hints.productId = meta.productId;
  }

  if (!hints.checkoutId && typeof payload.checkout_id === 'string') {
    hints.checkoutId = payload.checkout_id;
  }
  if (!hints.playerId && typeof payload.player_id === 'string') {
    hints.playerId = payload.player_id;
  }

  return hints;
}

function normalizePayhipPriceToCents(raw: unknown): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) {
    return Number.isInteger(raw) ? Math.max(0, raw) : Math.max(0, Math.round(raw * 100));
  }
  if (typeof raw === 'string') {
    const cleaned = raw.trim();
    if (!cleaned) return 0;
    const num = Number(cleaned);
    if (!Number.isFinite(num)) return 0;
    if (cleaned.includes('.')) return Math.max(0, Math.round(num * 100));
    return Math.max(0, Math.round(num));
  }
  return 0;
}

function unequipRevokedProduct(account: PlayerAccountRecord, productId: string): void {
  if (account.equippedBackpackSkinId === productId) {
    account.equippedBackpackSkinId = null;
  }
  for (const wc of Object.keys(account.equippedGunSkinsByClass) as GunWeaponClass[]) {
    if (account.equippedGunSkinsByClass[wc] === productId) {
      delete account.equippedGunSkinsByClass[wc];
    }
  }
  if (Array.isArray(account.equippedCosmeticIds)) {
    account.equippedCosmeticIds = account.equippedCosmeticIds.filter((id) => id !== productId);
  }
}

export function processPayhipWebhookEvent(payload: Record<string, unknown>): {
  ok: boolean;
  statusCode: number;
  duplicate?: boolean;
  status?: string;
  playerId?: string;
  productId?: string;
  transactionId?: string;
  error?: string;
} {
  const db = getExchangeDb();
  if (!db.payhipCheckouts) db.payhipCheckouts = {};
  if (!db.processedPayhipEvents) db.processedPayhipEvents = {};

  const eventType = String(payload.type || payload.event || '').trim().toLowerCase();
  const txId = String(payload.id || payload.transaction_id || payload.sale_id || '').trim();
  const buyerEmail = normalizeEmail(
    typeof payload.email === 'string'
      ? payload.email
      : typeof payload.customer_email === 'string'
        ? payload.customer_email
        : '',
  );
  const currency = String(payload.currency || 'USD').trim().toUpperCase().slice(0, 3) || 'USD';
  const hints = parseMetadataHints(payload);

  if (!eventType || !txId) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Missing Payhip event type or transaction id.',
    };
  }

  // Supported events: paid, refunded, failed/payment_failed
  const isPaid = eventType === 'paid';
  const isRefunded = eventType === 'refunded' || eventType === 'charge.refunded';
  const isFailed =
    eventType === 'failed' ||
    eventType === 'payment_failed' ||
    eventType === 'charge.failed' ||
    eventType === 'dispute.lost';

  if (!isPaid && !isRefunded && !isFailed) {
    return {
      ok: true,
      statusCode: 200,
      status: 'ignored',
    };
  }

  // Extract Payhip items array or fallback single item fields
  const rawItems = Array.isArray(payload.items)
    ? (payload.items as Record<string, unknown>[])
    : [
        {
          product_id: payload.product_id,
          product_key: payload.product_key,
          product_permalink: payload.product_permalink,
          product_name: payload.product_name,
          price: payload.price,
        },
      ];

  // Resolve checkout session first if provided via verified metadata or txId lookup
  const checkoutSession =
    (hints.checkoutId ? db.payhipCheckouts[hints.checkoutId] : undefined) ||
    Object.values(db.payhipCheckouts).find((c) => c.payhipTransactionId === txId);

  const originalPaidEvent = Object.values(db.processedPayhipEvents).find(
    (ev) => ev.txId === txId && ev.eventType === 'paid',
  );

  // Match Payhip product(s) to ExchangeProduct records
  const resolveProduct = (itemObj: Record<string, unknown>): ExchangeProduct | null => {
    const incomingPid = itemObj.product_id ? String(itemObj.product_id).trim() : '';
    const incomingKey =
      (itemObj.product_key ? String(itemObj.product_key).trim() : '') ||
      extractPayhipKeyFromUrl(
        typeof itemObj.product_permalink === 'string' ? itemObj.product_permalink : '',
      ) ||
      '';
    const incomingPermalink =
      typeof itemObj.product_permalink === 'string'
        ? sanitizeHttpsPayhipUrl(itemObj.product_permalink)
        : null;

    if (incomingPid) {
      const byPid = db.products.find(
        (p) =>
          (p.payhipProductId && p.payhipProductId === incomingPid) || p.id === incomingPid,
      );
      if (byPid) return byPid;
    }
    if (incomingKey) {
      const byKey = db.products.find(
        (p) =>
          (p.payhipProductKey &&
            p.payhipProductKey.toLowerCase() === incomingKey.toLowerCase()) ||
          extractPayhipKeyFromUrl(p.payhipUrl)?.toLowerCase() === incomingKey.toLowerCase(),
      );
      if (byKey) return byKey;
    }
    if (incomingPermalink) {
      const byUrl = db.products.find((p) => {
        const clean = sanitizeHttpsPayhipUrl(p.payhipUrl);
        return clean && clean.toLowerCase() === incomingPermalink.toLowerCase();
      });
      if (byUrl) return byUrl;
    }
    if (checkoutSession && !incomingPid && !incomingKey) {
      return db.products.find((p) => p.id === checkoutSession.productId) ?? null;
    }
    if (originalPaidEvent) {
      return db.products.find((p) => p.id === originalPaidEvent.productId) ?? null;
    }
    return null;
  };

  let matchedProduct: ExchangeProduct | null = null;
  for (const itemObj of rawItems) {
    matchedProduct = resolveProduct(itemObj);
    if (matchedProduct) break;
  }

  // If failed payment arrives for a known checkout session, mark it unsuccessful immediately
  if (isFailed) {
    const targetCheckout = checkoutSession;
    const now = Date.now();
    if (targetCheckout) {
      targetCheckout.status = 'failed';
      targetCheckout.statusMessage = PAYHIP_STATUS_LABELS.failed;
      targetCheckout.payhipTransactionId = txId;
      targetCheckout.updatedAt = now;
    }
    db.transactions.unshift({
      id: `tx_${now}_${crypto.randomBytes(3).toString('hex')}`,
      type: 'payhip_failed',
      playerId: targetCheckout?.playerId || hints.playerId || 'unmatched',
      itemId: matchedProduct?.id || targetCheckout?.productId,
      itemName: matchedProduct?.name || targetCheckout?.productName || 'Payhip Purchase',
      coinDelta: 0,
      realMoneyAmount: normalizePayhipPriceToCents(payload.price) / 100,
      currency,
      status: 'failed',
      provider: 'payhip',
      providerReference: txId,
      createdAt: now,
      note: 'Payment unsuccessful — webhook reported failed payment.',
    });
    if (db.transactions.length > 500) db.transactions.length = 500;
    persistExchangeDb();
    return {
      ok: true,
      statusCode: 200,
      status: 'failed',
      transactionId: txId,
      playerId: targetCheckout?.playerId,
      productId: matchedProduct?.id || targetCheckout?.productId,
    };
  }

  if (!matchedProduct) {
    const now = Date.now();
    db.transactions.unshift({
      id: `tx_${now}_${crypto.randomBytes(3).toString('hex')}`,
      type: isRefunded ? 'payhip_refunded' : 'payhip_failed',
      playerId: checkoutSession?.playerId || hints.playerId || 'unmatched',
      itemName: 'Unrecognized Payhip Product',
      coinDelta: 0,
      realMoneyAmount: normalizePayhipPriceToCents(payload.price) / 100,
      currency,
      status: 'failed',
      provider: 'payhip',
      providerReference: txId,
      createdAt: now,
      note: `Payhip webhook could not map product to catalog item (tx=${txId}).`,
    });
    if (db.transactions.length > 500) db.transactions.length = 500;
    persistExchangeDb();
    return {
      ok: false,
      statusCode: 404,
      error: 'Corresponding in-game product could not be verified.',
    };
  }

  // Verify checkout metadata matches product if checkoutSession exists
  if (checkoutSession && checkoutSession.productId !== matchedProduct.id) {
    return {
      ok: false,
      statusCode: 400,
      error: 'Checkout session product mismatch.',
    };
  }

  // Match transaction strictly to verified game account
  let targetAccount: PlayerAccountRecord | undefined;
  if (checkoutSession) {
    targetAccount = db.players[checkoutSession.playerId];
  } else if (originalPaidEvent) {
    targetAccount = db.players[originalPaidEvent.playerId];
  } else if (hints.playerId && db.players[hints.playerId]) {
    targetAccount = db.players[hints.playerId];
  } else if (buyerEmail) {
    // Prefer an unfulfilled checkout matching both product & email first
    const emailCheckout = Object.values(db.payhipCheckouts)
      .filter(
        (c) =>
          c.productId === matchedProduct.id &&
          c.playerEmail === buyerEmail &&
          (c.status === 'waiting_confirmation' || c.status === 'pending_verification'),
      )
      .sort((a, b) => b.createdAt - a.createdAt)[0];
    if (emailCheckout) {
      targetAccount = db.players[emailCheckout.playerId];
    } else {
      targetAccount = Object.values(db.players).find(
        (p) => p.email && normalizeEmail(p.email) === buyerEmail,
      );
    }
  }

  if (!targetAccount || !targetAccount.email) {
    const now = Date.now();
    db.transactions.unshift({
      id: `tx_${now}_${crypto.randomBytes(3).toString('hex')}`,
      type: 'payhip_failed',
      playerId: hints.playerId || 'unmatched',
      itemId: matchedProduct.id,
      itemName: matchedProduct.name,
      coinDelta: 0,
      realMoneyAmount: normalizePayhipPriceToCents(payload.price) / 100,
      currency,
      status: 'failed',
      provider: 'payhip',
      providerReference: txId,
      createdAt: now,
      note: `Could not match Payhip transaction ${txId} to a registered game account.`,
    });
    if (db.transactions.length > 500) db.transactions.length = 500;
    persistExchangeDb();
    return {
      ok: false,
      statusCode: 422,
      error: 'Transaction could not be matched to a valid authenticated game account.',
    };
  }

  // Idempotency / duplicate webhook check
  const idempotencyKey = `${isRefunded ? 'refunded' : 'paid'}:${txId}:${matchedProduct.id}`;
  if (db.processedPayhipEvents[idempotencyKey]) {
    return {
      ok: true,
      statusCode: 200,
      duplicate: true,
      status: isRefunded ? 'refunded' : 'delivered',
      playerId: targetAccount.playerId,
      productId: matchedProduct.id,
      transactionId: txId,
    };
  }

  const now = Date.now();
  const payloadPriceCents = normalizePayhipPriceToCents(payload.price);

  if (isPaid) {
    const expectedCents =
      matchedProduct.realMoneyAmount && matchedProduct.realMoneyAmount > 0
        ? Math.round(matchedProduct.realMoneyAmount * 100)
        : 0;

    // Verify amount meets expected product price if priced > $0
    if (expectedCents > 0 && payloadPriceCents < expectedCents) {
      if (checkoutSession) {
        checkoutSession.status = 'failed';
        checkoutSession.statusMessage = PAYHIP_STATUS_LABELS.failed;
        checkoutSession.payhipTransactionId = txId;
        checkoutSession.updatedAt = now;
      }
      db.transactions.unshift({
        id: `tx_${now}_${crypto.randomBytes(3).toString('hex')}`,
        type: 'payhip_failed',
        playerId: targetAccount.playerId,
        itemId: matchedProduct.id,
        itemName: matchedProduct.name,
        coinDelta: 0,
        realMoneyAmount: payloadPriceCents / 100,
        currency,
        status: 'failed',
        provider: 'payhip',
        providerReference: txId,
        createdAt: now,
        note: `Underpaid Payhip payment rejected (received ${payloadPriceCents}c, expected ${expectedCents}c).`,
      });
      if (db.transactions.length > 500) db.transactions.length = 500;
      persistExchangeDb();
      return {
        ok: false,
        statusCode: 400,
        error: 'Payment amount did not meet product price.',
      };
    }

    // Grant entitlement persistently on player's account
    if (!targetAccount.ownedProductIds.includes(matchedProduct.id)) {
      targetAccount.ownedProductIds.push(matchedProduct.id);
    }
    if (Array.isArray(targetAccount.revokedProductIds)) {
      targetAccount.revokedProductIds = targetAccount.revokedProductIds.filter(
        (id) => id !== matchedProduct.id,
      );
    }
    targetAccount.ownedProductSnapshots[matchedProduct.id] = { ...matchedProduct };
    targetAccount.updatedAt = now;

    if (checkoutSession) {
      checkoutSession.status = 'delivered';
      checkoutSession.statusMessage = PAYHIP_STATUS_LABELS.delivered;
      checkoutSession.payhipTransactionId = txId;
      checkoutSession.updatedAt = now;
    }

    db.processedPayhipEvents[idempotencyKey] = {
      idempotencyKey,
      eventType: 'paid',
      txId,
      playerId: targetAccount.playerId,
      productId: matchedProduct.id,
      paidAmountCents: payloadPriceCents,
      refundedAmountCents: 0,
      currency,
      processedAt: now,
    };

    db.transactions.unshift({
      id: `tx_${now}_${crypto.randomBytes(3).toString('hex')}`,
      type: 'payhip_paid',
      playerId: targetAccount.playerId,
      itemId: matchedProduct.id,
      itemName: matchedProduct.name,
      coinDelta: 0,
      realMoneyAmount: (payloadPriceCents || expectedCents) / 100,
      currency,
      status: 'completed',
      provider: 'payhip',
      providerReference: txId,
      createdAt: now,
      note: 'Payment successful · Item delivered automatically to player inventory.',
    });
    if (db.transactions.length > 500) db.transactions.length = 500;
    persistExchangeDb();

    return {
      ok: true,
      statusCode: 200,
      status: 'delivered',
      playerId: targetAccount.playerId,
      productId: matchedProduct.id,
      transactionId: txId,
    };
  }

  // Handle refund webhook ("refunded")
  const originalCents =
    originalPaidEvent?.paidAmountCents ||
    (matchedProduct.realMoneyAmount ? Math.round(matchedProduct.realMoneyAmount * 100) : 0) ||
    payloadPriceCents;
  const refundRaw =
    payload.refund_amount ?? payload.refunded_amount ?? payload.amount_refunded;
  const refundCents =
    refundRaw !== undefined && refundRaw !== null
      ? normalizePayhipPriceToCents(refundRaw)
      : originalCents;
  const isPartial =
    payload.refund_type === 'partial' ||
    (originalCents > 0 && refundCents > 0 && refundCents < originalCents);

  const policy: PartialRefundPolicy = matchedProduct.partialRefundPolicy || 'revoke';
  const shouldRevoke = !isPartial || policy === 'revoke';

  if (shouldRevoke) {
    targetAccount.ownedProductIds = targetAccount.ownedProductIds.filter(
      (id) => id !== matchedProduct.id,
    );
    if (!Array.isArray(targetAccount.revokedProductIds)) {
      targetAccount.revokedProductIds = [];
    }
    if (!targetAccount.revokedProductIds.includes(matchedProduct.id)) {
      targetAccount.revokedProductIds.push(matchedProduct.id);
    }
    unequipRevokedProduct(targetAccount, matchedProduct.id);
    targetAccount.updatedAt = now;

    if (checkoutSession) {
      checkoutSession.status = 'refunded';
      checkoutSession.statusMessage = PAYHIP_STATUS_LABELS.refunded;
      checkoutSession.updatedAt = now;
    }
  }

  db.processedPayhipEvents[idempotencyKey] = {
    idempotencyKey,
    eventType: 'refunded',
    txId,
    playerId: targetAccount.playerId,
    productId: matchedProduct.id,
    paidAmountCents: originalCents,
    refundedAmountCents: refundCents,
    currency,
    processedAt: now,
    revoked: shouldRevoke,
  };

  db.transactions.unshift({
    id: `tx_${now}_${crypto.randomBytes(3).toString('hex')}`,
    type: isPartial ? 'payhip_partial_refund' : 'payhip_refunded',
    playerId: targetAccount.playerId,
    itemId: matchedProduct.id,
    itemName: matchedProduct.name,
    coinDelta: 0,
    realMoneyAmount: -(refundCents / 100),
    currency,
    status: 'refunded',
    provider: 'payhip',
    providerReference: txId,
    createdAt: now,
    note: isPartial
      ? shouldRevoke
        ? `Partial refund verified (${formatCurrencyPrice(refundCents / 100, currency)}) — entitlement revoked per product policy.`
        : `Partial refund verified (${formatCurrencyPrice(refundCents / 100, currency)}) — entitlement kept per product policy.`
      : `Full refund verified (${formatCurrencyPrice(refundCents / 100, currency)}) — entitlement revoked.`,
  });
  if (db.transactions.length > 500) db.transactions.length = 500;
  persistExchangeDb();

  return {
    ok: true,
    statusCode: 200,
    status: shouldRevoke ? 'refunded' : 'partial_refund_kept',
    playerId: targetAccount.playerId,
    productId: matchedProduct.id,
    transactionId: txId,
  };
}
