import { NextRequest, NextResponse } from 'next/server';
import {
  GunWeaponClass,
  getWeaponClassForItem,
} from '@/game/data/exchangeCatalog';
import {
  getAuthenticatedPlayer,
  getExchangeDb,
  persistExchangeDb,
} from '@/lib/exchangeStore';

export async function POST(req: NextRequest) {
  const account = getAuthenticatedPlayer(req);
  if (!account) {
    return NextResponse.json(
      {
        ok: false,
        authRequired: true,
        error: 'Please sign in to your account to equip or unequip cosmetics.',
      },
      { status: 401 },
    );
  }

  try {
    const body = (await req.json()) as {
      productId?: string;
      action?: 'equip' | 'unequip';
    };
    const productId = String(body.productId || '').trim();
    const action = body.action === 'unequip' ? 'unequip' : 'equip';

    const db = getExchangeDb();
    const product =
      db.products.find((p) => p.id === productId) ||
      account.ownedProductSnapshots[productId];

    if (!product) {
      return NextResponse.json({ ok: false, error: 'Product not found.' }, { status: 404 });
    }

    const isOwned =
      Boolean(product.freeByDefault) || account.ownedProductIds.includes(product.id);

    // Resolve all weapon classes this gun skin supports
    const targetClasses = new Set<GunWeaponClass>();
    if (product.category === 'gun_skin') {
      if (product.weaponClass) targetClasses.add(product.weaponClass);
      for (const itemId of product.compatibleWeapons || []) {
        const wc = getWeaponClassForItem(itemId);
        if (wc) targetClasses.add(wc);
      }
      if (targetClasses.size === 0) targetClasses.add('assault_rifle');
    }

    if (action === 'equip') {
      if (!isOwned) {
        return NextResponse.json(
          { ok: false, error: 'You must own this cosmetic before equipping it.' },
          { status: 403 },
        );
      }
      if (product.category === 'gun_skin') {
        for (const wc of targetClasses) {
          account.equippedGunSkinsByClass[wc] = product.id;
        }
      } else if (product.category === 'backpack_skin') {
        account.equippedBackpackSkinId = product.id;
      } else if (product.category === 'cosmetic') {
        if (!Array.isArray(account.equippedCosmeticIds)) {
          account.equippedCosmeticIds = [];
        }
        if (!account.equippedCosmeticIds.includes(product.id)) {
          account.equippedCosmeticIds.push(product.id);
        }
      }
    } else {
      if (product.category === 'gun_skin') {
        for (const wc of Object.keys(account.equippedGunSkinsByClass) as GunWeaponClass[]) {
          if (account.equippedGunSkinsByClass[wc] === product.id) {
            delete account.equippedGunSkinsByClass[wc];
          }
        }
      } else if (product.category === 'backpack_skin') {
        if (account.equippedBackpackSkinId === product.id) {
          account.equippedBackpackSkinId = null;
        }
      } else if (product.category === 'cosmetic') {
        account.equippedCosmeticIds = (account.equippedCosmeticIds || []).filter(
          (id) => id !== product.id,
        );
      }
    }

    account.updatedAt = Date.now();
    persistExchangeDb();

    return NextResponse.json({
      ok: true,
      equippedGunSkinsByClass: account.equippedGunSkinsByClass,
      equippedBackpackSkinId: account.equippedBackpackSkinId,
      equippedCosmeticIds: account.equippedCosmeticIds || [],
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid equip request.' }, { status: 400 });
  }
}
