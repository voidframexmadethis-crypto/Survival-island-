import * as THREE from 'three';
import { ItemId } from '../types';

export type ExchangeCategory = 'gun_skin' | 'backpack_skin';

export type ExchangeRarity = 'common' | 'rare' | 'epic' | 'legendary' | 'exclusive';

export type PublicationStatus = 'draft' | 'published' | 'unpublished';

export type GunWeaponClass =
  | 'assault_rifle'
  | 'smg'
  | 'shotgun'
  | 'sniper_rifle'
  | 'pistol'
  | 'lmg';

export type BackpackDesignStyle =
  | 'tactical_camo'
  | 'military'
  | 'premium_color'
  | 'futuristic'
  | 'exclusive';

export type CosmeticPatternType =
  | 'solid'
  | 'camo_woodland'
  | 'camo_desert'
  | 'camo_arctic'
  | 'carbon'
  | 'damascus'
  | 'hazard'
  | 'futuristic_grid'
  | 'royal_gold';

export interface CosmeticVisualSpec {
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  emissiveHex?: string;
  metalness: number;
  roughness: number;
  pattern: CosmeticPatternType;
  backpackStyle?: BackpackDesignStyle;
}

export interface ExchangeProduct {
  id: string;
  name: string;
  description: string;
  category: ExchangeCategory;
  weaponClass?: GunWeaponClass;
  compatibleWeapons: ItemId[];
  compatibleLabel: string;
  rarity: ExchangeRarity;
  /** Owner-defined price in SI Coins (never auto-calculated from rarity) */
  price: number;
  status: PublicationStatus;
  featured: boolean;
  newArrival: boolean;
  bestSeller: boolean;
  /** Uploaded product image (data URL or hosted asset URL) */
  productImageUrl?: string | null;
  /** Optional uploaded secondary preview image */
  previewImageUrl?: string | null;
  /** Optional uploaded 3D model (.glb / .gltf data URL or asset URL) */
  model3dUrl?: string | null;
  model3dFileName?: string | null;
  /** Visual styling used for procedural 3D fallback & in-game weapon/backpack finish */
  visual: CosmeticVisualSpec;
  createdAt: number;
  updatedAt: number;
  publishedAt?: number | null;
}

export interface CoinPackage {
  id: string;
  name: string;
  coins: number;
  bonusCoins: number;
  /** Owner-defined real-money price (e.g. 4.99) */
  priceAmount: number;
  /** ISO currency code (e.g. USD, EUR, GBP) */
  currency: string;
  imageUrl?: string | null;
  active: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface ExchangeTransaction {
  id: string;
  type:
    | 'cosmetic_purchase'
    | 'coin_checkout_pending'
    | 'coin_purchase_verified'
    | 'coin_purchase_failed';
  playerId: string;
  itemId?: string;
  itemName?: string;
  packageId?: string;
  coinDelta: number;
  realMoneyAmount?: number;
  currency?: string;
  status: 'completed' | 'pending_provider' | 'failed';
  provider?: string;
  providerReference?: string;
  createdAt: number;
  note?: string;
}

export const CATEGORY_LABELS: Record<ExchangeCategory, string> = {
  gun_skin: 'Gun Skins',
  backpack_skin: 'Backpack Skins',
};

export const WEAPON_CLASS_LABELS: Record<GunWeaponClass, string> = {
  assault_rifle: 'Assault Rifles',
  smg: 'SMGs',
  shotgun: 'Shotguns',
  sniper_rifle: 'Sniper Rifles',
  pistol: 'Pistols',
  lmg: 'LMGs',
};

export const WEAPON_CLASS_COMPATIBLE_ITEMS: Record<GunWeaponClass, ItemId[]> = {
  assault_rifle: ['ak_47', 'm4a1', 'scar_h', 'fn_fal'],
  smg: ['mp5', 'uzi', 'vector'],
  shotgun: ['remington_870', 'mossberg_590', 'sawed_off'],
  sniper_rifle: ['barrett_50', 'remington_700'],
  pistol: ['gun', 'glock_19', 'colt_m1911', 'desert_eagle', 'magnum_44'],
  lmg: ['m249_saw'],
};

export const WEAPON_CLASS_COMPATIBLE_LABEL: Record<GunWeaponClass, string> = {
  assault_rifle: 'AK-47, M4A1, SCAR-H, FN FAL',
  smg: 'MP5, Uzi, Vector',
  shotgun: 'Remington 870, Mossberg 590, Sawed-Off',
  sniper_rifle: 'Barrett .50, Remington 700',
  pistol: 'Glock 19, M1911, Desert Eagle, .44 Magnum',
  lmg: 'M249 SAW',
};

/** Visual badge metadata ONLY — never used to force or auto-assign prices. */
export const RARITY_META: Record<
  ExchangeRarity,
  { label: string; border: string; badge: string; text: string; glow: string }
> = {
  common: {
    label: 'Common',
    border: 'border-stone-600/80',
    badge: 'bg-stone-800/90 text-stone-200 border-stone-600/70',
    text: 'text-stone-300',
    glow: 'from-stone-700/20 to-transparent',
  },
  rare: {
    label: 'Rare',
    border: 'border-sky-500/60',
    badge: 'bg-sky-950/90 text-sky-300 border-sky-500/60',
    text: 'text-sky-300',
    glow: 'from-sky-500/20 to-transparent',
  },
  epic: {
    label: 'Epic',
    border: 'border-fuchsia-500/60',
    badge: 'bg-fuchsia-950/90 text-fuchsia-300 border-fuchsia-500/60',
    text: 'text-fuchsia-300',
    glow: 'from-fuchsia-500/20 to-transparent',
  },
  legendary: {
    label: 'Legendary',
    border: 'border-amber-500/75',
    badge: 'bg-amber-950/90 text-amber-300 border-amber-500/70',
    text: 'text-amber-300',
    glow: 'from-amber-500/25 to-transparent',
  },
  exclusive: {
    label: 'Exclusive',
    border: 'border-rose-500/80',
    badge: 'bg-rose-950/90 text-rose-200 border-rose-500/75',
    text: 'text-rose-300',
    glow: 'from-rose-500/25 to-transparent',
  },
};

export const DEFAULT_VISUAL_SPEC: CosmeticVisualSpec = {
  primaryHex: '#2c3531',
  secondaryHex: '#181d1b',
  accentHex: '#d97706',
  metalness: 0.45,
  roughness: 0.48,
  pattern: 'solid',
};

/**
 * SURVIVAL ISLAND EXCHANGE starts 100% EMPTY.
 * No sample products, no premade skins, no placeholder packages.
 * Every product and coin package is created and managed exclusively by the owner.
 */
export const DEFAULT_EXCHANGE_CATALOG: ExchangeProduct[] = [];
export const DEFAULT_COIN_PACKAGES: CoinPackage[] = [];

export function getWeaponClassForItem(itemId: ItemId | null): GunWeaponClass | null {
  if (!itemId) return null;
  for (const [wc, items] of Object.entries(WEAPON_CLASS_COMPATIBLE_ITEMS) as [
    GunWeaponClass,
    ItemId[],
  ][]) {
    if (items.includes(itemId)) return wc;
  }
  return null;
}

export function formatCurrencyPrice(amount: number, currency: string): string {
  const safeAmount = Number.isFinite(amount) ? Math.max(0, amount) : 0;
  const code = (currency || 'USD').toUpperCase();
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount);
  } catch {
    return `${code} ${safeAmount.toFixed(2)}`;
  }
}

// ---- Procedural Texture & Uploaded Image Texture Cache for 3D Rendering ----
const patternTextureCache = new Map<string, THREE.CanvasTexture>();
const imageTextureCache = new Map<string, THREE.Texture>();

export function getCosmeticImageTexture(imageUrl: string | null | undefined): THREE.Texture | null {
  if (!imageUrl || typeof window === 'undefined') return null;
  const cached = imageTextureCache.get(imageUrl);
  if (cached) return cached;
  const loader = new THREE.TextureLoader();
  const tex = loader.load(imageUrl);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  imageTextureCache.set(imageUrl, tex);
  return tex;
}

export function getCosmeticPatternTexture(
  visual: CosmeticVisualSpec,
): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const key = `${visual.pattern}|${visual.primaryHex}|${visual.secondaryHex}|${visual.accentHex}`;
  const cached = patternTextureCache.get(key);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  ctx.fillStyle = visual.primaryHex;
  ctx.fillRect(0, 0, 256, 256);

  if (
    visual.pattern === 'camo_woodland' ||
    visual.pattern === 'camo_desert' ||
    visual.pattern === 'camo_arctic'
  ) {
    let seed = 1337;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    const colors = [visual.secondaryHex, visual.accentHex, visual.primaryHex];
    for (let i = 0; i < 42; i++) {
      ctx.fillStyle = colors[i % colors.length];
      ctx.beginPath();
      const cx = rand() * 256;
      const cy = rand() * 256;
      const rx = 18 + rand() * 44;
      const ry = 12 + rand() * 34;
      ctx.ellipse(cx, cy, rx, ry, rand() * Math.PI, 0, Math.PI * 2);
      ctx.fill();
    }
  } else if (visual.pattern === 'carbon') {
    ctx.fillStyle = visual.secondaryHex;
    for (let y = 0; y < 256; y += 16) {
      for (let x = 0; x < 256; x += 16) {
        ctx.fillRect(x, y, 8, 8);
        ctx.fillRect(x + 8, y + 8, 8, 8);
      }
    }
    ctx.fillStyle = visual.accentHex;
    ctx.globalAlpha = 0.22;
    for (let y = 0; y < 256; y += 16) {
      ctx.fillRect(0, y, 256, 2);
    }
    ctx.globalAlpha = 1;
  } else if (visual.pattern === 'damascus') {
    ctx.strokeStyle = visual.secondaryHex;
    ctx.lineWidth = 4;
    for (let i = -32; i < 288; i += 14) {
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 8) {
        const y = i + Math.sin(x * 0.05 + i * 0.12) * 14;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.strokeStyle = visual.accentHex;
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = 1.5;
    for (let i = -16; i < 272; i += 28) {
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 8) {
        const y = i + Math.cos(x * 0.06 + i * 0.08) * 10;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
  } else if (visual.pattern === 'hazard') {
    ctx.fillStyle = visual.secondaryHex;
    for (let i = -256; i < 512; i += 36) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + 18, 0);
      ctx.lineTo(i - 238, 256);
      ctx.lineTo(i - 256, 256);
      ctx.closePath();
      ctx.fill();
    }
    ctx.fillStyle = visual.accentHex;
    ctx.fillRect(0, 118, 256, 20);
  } else if (visual.pattern === 'futuristic_grid') {
    ctx.strokeStyle = visual.accentHex;
    ctx.lineWidth = 2;
    ctx.globalAlpha = 0.55;
    for (let i = 0; i <= 256; i += 32) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, 256);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(256, i);
      ctx.stroke();
    }
    ctx.fillStyle = visual.accentHex;
    ctx.globalAlpha = 0.85;
    for (let y = 32; y < 256; y += 64) {
      for (let x = 32; x < 256; x += 64) {
        ctx.fillRect(x - 3, y - 3, 6, 6);
      }
    }
    ctx.globalAlpha = 1;
  } else if (visual.pattern === 'royal_gold') {
    const grad = ctx.createLinearGradient(0, 0, 256, 256);
    grad.addColorStop(0, visual.primaryHex);
    grad.addColorStop(0.5, visual.accentHex);
    grad.addColorStop(1, visual.secondaryHex);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);
    ctx.strokeStyle = visual.accentHex;
    ctx.lineWidth = 3;
    ctx.strokeRect(14, 14, 228, 228);
    ctx.strokeRect(30, 30, 196, 196);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(2, 2);
  tex.needsUpdate = true;
  patternTextureCache.set(key, tex);
  return tex;
}

export interface SkinCatalogItem {
  id: string;
  name: string;
  category: 'backpack' | 'weapon';
  priceLabel: string; // e.g. "Free" or "$2.99"
  payhipUrl: string;
  unlockCode?: string;
  primaryHex: string;
  secondaryHex: string;
  accentHex: string;
  pattern: 'solid' | 'camo' | 'neon_stripes' | 'gold_carbon';
}

export function toBackpackSkinCatalogItem(item: ExchangeProduct): SkinCatalogItem {
  const p = item.visual.pattern;
  const pattern: SkinCatalogItem['pattern'] =
    p === 'camo_woodland' || p === 'camo_desert' || p === 'camo_arctic'
      ? 'camo'
      : p === 'futuristic_grid' || p === 'hazard'
        ? 'neon_stripes'
        : p === 'royal_gold' || p === 'carbon' || p === 'damascus'
          ? 'gold_carbon'
          : 'solid';

  return {
    id: item.id,
    name: item.name,
    category: item.category === 'gun_skin' ? 'weapon' : 'backpack',
    priceLabel: item.price <= 0 ? 'Free' : `${item.price} SI`,
    payhipUrl: '',
    primaryHex: item.visual.primaryHex,
    secondaryHex: item.visual.secondaryHex,
    accentHex: item.visual.accentHex,
    pattern,
  };
}

export const VAULT_PAYHIP_CATALOG: SkinCatalogItem[] = [
  {
    id: 'vault_backpack_explorer',
    name: 'Ranger Olive Pack',
    category: 'backpack',
    priceLabel: 'Free',
    payhipUrl: '',
    primaryHex: '#3f6212',
    secondaryHex: '#1a2e05',
    accentHex: '#d97706',
    pattern: 'camo',
  },
  {
    id: 'vault_backpack_cyber_neon',
    name: 'Cyber Volt Rig',
    category: 'backpack',
    priceLabel: '$2.99',
    payhipUrl: '',
    unlockCode: 'SAVAGE-UNLOCK',
    primaryHex: '#0f172a',
    secondaryHex: '#0284c7',
    accentHex: '#22d3ee',
    pattern: 'neon_stripes',
  },
  {
    id: 'vault_backpack_royal_carbon',
    name: 'Obsidian Gold Carbon Pack',
    category: 'backpack',
    priceLabel: '$4.99',
    payhipUrl: '',
    unlockCode: 'SAVAGE-UNLOCK',
    primaryHex: '#18181b',
    secondaryHex: '#27272a',
    accentHex: '#f59e0b',
    pattern: 'gold_carbon',
  },
  {
    id: 'vault_weapon_gold_carbon',
    name: 'Savage Gold-Carbon Finish',
    category: 'weapon',
    priceLabel: '$3.99',
    payhipUrl: '',
    unlockCode: 'SAVAGE-UNLOCK',
    primaryHex: '#18181b',
    secondaryHex: '#27272a',
    accentHex: '#facc15',
    pattern: 'gold_carbon',
  },
  {
    id: 'vault_weapon_neon_pulse',
    name: 'Cobalt Voltage Finish',
    category: 'weapon',
    priceLabel: '$2.49',
    payhipUrl: '',
    unlockCode: 'SAVAGE-UNLOCK',
    primaryHex: '#0f172a',
    secondaryHex: '#1d4ed8',
    accentHex: '#38bdf8',
    pattern: 'neon_stripes',
  },
];

export function toExchangeProductFromSkinCatalogItem(
  skin: SkinCatalogItem & { mediaDataUrl?: string; mediaKind?: 'image' | 'glb' | 'none' },
): ExchangeProduct {
  const mappedPattern: CosmeticPatternType =
    skin.pattern === 'camo'
      ? 'camo_woodland'
      : skin.pattern === 'neon_stripes'
        ? 'futuristic_grid'
        : skin.pattern === 'gold_carbon'
          ? 'royal_gold'
          : 'solid';

  const allWeaponClasses: ItemId[] = [
    ...WEAPON_CLASS_COMPATIBLE_ITEMS.assault_rifle,
    ...WEAPON_CLASS_COMPATIBLE_ITEMS.smg,
    ...WEAPON_CLASS_COMPATIBLE_ITEMS.shotgun,
    ...WEAPON_CLASS_COMPATIBLE_ITEMS.sniper_rifle,
    ...WEAPON_CLASS_COMPATIBLE_ITEMS.pistol,
    ...WEAPON_CLASS_COMPATIBLE_ITEMS.lmg,
  ];

  return {
    id: skin.id,
    name: skin.name,
    description: 'Custom 3D cosmetic finish.',
    category: skin.category === 'weapon' ? 'gun_skin' : 'backpack_skin',
    compatibleWeapons: skin.category === 'weapon' ? allWeaponClasses : [],
    compatibleLabel: skin.category === 'weapon' ? 'All Firearms' : 'Explorer Backpack',
    rarity: skin.pattern === 'gold_carbon' ? 'legendary' : skin.pattern === 'neon_stripes' ? 'epic' : 'rare',
    price: 0,
    status: 'published',
    featured: true,
    newArrival: false,
    bestSeller: false,
    productImageUrl: skin.mediaKind === 'image' ? skin.mediaDataUrl ?? null : null,
    model3dUrl: skin.mediaKind === 'glb' ? skin.mediaDataUrl ?? null : null,
    visual: {
      primaryHex: skin.primaryHex,
      secondaryHex: skin.secondaryHex,
      accentHex: skin.accentHex,
      emissiveHex: skin.pattern === 'neon_stripes' ? skin.accentHex : undefined,
      metalness: skin.pattern === 'gold_carbon' ? 0.65 : 0.3,
      roughness: skin.pattern === 'gold_carbon' ? 0.32 : 0.55,
      pattern: mappedPattern,
    },
    createdAt: 0,
    updatedAt: 0,
  };
}

function createSkinPatternTexture(item: SkinCatalogItem): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = item.primaryHex;
  ctx.fillRect(0, 0, 512, 512);

  if (item.pattern === 'neon_stripes') {
    ctx.fillStyle = item.secondaryHex;
    for (let y = 0; y < 512; y += 64) {
      ctx.fillRect(0, y, 512, 26);
    }
    ctx.fillStyle = item.accentHex;
    ctx.fillRect(0, 220, 512, 36);
  } else if (item.pattern === 'camo') {
    let seed = Math.max(1, item.id.length) * 997;
    const rand = () => {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    };
    for (let i = 0; i < 42; i++) {
      ctx.fillStyle = i % 2 === 0 ? item.secondaryHex : item.accentHex;
      ctx.beginPath();
      ctx.ellipse(
        rand() * 512,
        rand() * 512,
        35 + rand() * 55,
        22 + rand() * 35,
        rand() * Math.PI,
        0,
        Math.PI * 2,
      );
      ctx.fill();
    }
  } else if (item.pattern === 'gold_carbon') {
    ctx.fillStyle = item.secondaryHex;
    for (let y = 0; y < 512; y += 16) {
      for (let x = y % 32 === 0 ? 0 : 8; x < 512; x += 16) {
        ctx.fillRect(x, y, 8, 8);
      }
    }
    ctx.fillStyle = item.accentHex;
    ctx.fillRect(0, 240, 512, 24);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.needsUpdate = true;
  return tex;
}

/**
 * Builds a sculpted 3D backpack mesh with the chosen skin applied—usable in BOTH
 * the 3D shop preview turntable and attached to the player's back in 3rd person.
 */
export function buildSculptedBackpackMesh(item: SkinCatalogItem): {
  group: THREE.Group;
  dispose: () => void;
} {
  const group = new THREE.Group();
  const disposables: Array<{ dispose: () => void }> = [];

  const skinTex = createSkinPatternTexture(item);
  const packMat = new THREE.MeshStandardMaterial({
    map: skinTex,
    roughness: 0.55,
    metalness: item.pattern === 'gold_carbon' ? 0.55 : 0.15,
  });
  const strapMat = new THREE.MeshStandardMaterial({
    color: '#16181d',
    roughness: 0.85,
    metalness: 0.1,
  });
  const buckleMat = new THREE.MeshStandardMaterial({
    color: item.accentHex,
    roughness: 0.25,
    metalness: 0.85,
  });

  disposables.push(skinTex, packMat, strapMat, buckleMat);

  // Main contoured pack body
  const mainGeo = new THREE.BoxGeometry(0.42, 0.54, 0.22);
  const mainPack = new THREE.Mesh(mainGeo, packMat);
  mainPack.castShadow = true;
  mainPack.name = 'sculpted_backpack_main';

  // Top hooded flap
  const flapGeo = new THREE.BoxGeometry(0.44, 0.12, 0.24);
  const topFlap = new THREE.Mesh(flapGeo, packMat);
  topFlap.position.set(0, 0.25, -0.01);
  topFlap.castShadow = true;

  // Front utility pouch + accent buckle
  const pouchGeo = new THREE.BoxGeometry(0.32, 0.24, 0.08);
  const frontPouch = new THREE.Mesh(pouchGeo, packMat);
  frontPouch.position.set(0, -0.08, -0.14);
  frontPouch.castShadow = true;

  const buckleGeo = new THREE.BoxGeometry(0.08, 0.05, 0.03);
  const buckle = new THREE.Mesh(buckleGeo, buckleMat);
  buckle.position.set(0, 0.18, -0.13);

  // Side hydration pockets
  const sidePocketGeo = new THREE.BoxGeometry(0.07, 0.26, 0.14);
  const leftPocket = new THREE.Mesh(sidePocketGeo, strapMat);
  leftPocket.position.set(-0.24, -0.08, 0);
  const rightPocket = new THREE.Mesh(sidePocketGeo, strapMat);
  rightPocket.position.set(0.24, -0.08, 0);

  // Padded shoulder straps (facing +Z toward player's back)
  const strapGeo = new THREE.BoxGeometry(0.06, 0.48, 0.04);
  const leftStrap = new THREE.Mesh(strapGeo, strapMat);
  leftStrap.position.set(-0.14, 0.02, 0.12);
  const rightStrap = new THREE.Mesh(strapGeo, strapMat);
  rightStrap.position.set(0.14, 0.02, 0.12);

  group.add(
    mainPack,
    topFlap,
    frontPouch,
    buckle,
    leftPocket,
    rightPocket,
    leftStrap,
    rightStrap,
  );
  disposables.push(mainGeo, flapGeo, pouchGeo, buckleGeo, sidePocketGeo, strapGeo);

  return {
    group,
    dispose: () => {
      for (const d of disposables) d.dispose();
    },
  };
}

