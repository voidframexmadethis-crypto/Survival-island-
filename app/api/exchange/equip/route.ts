import { NextRequest, NextResponse } from 'next/server';
import {
  getExchangeDb,
  getOrCreatePlayerAccount,
  persistExchangeDb,
  sanitizePlayerId,
} from '@/lib/exchangeStore';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      playerId?: string;
      productId?: string;
      action?: 'equip' | 'unequip';
    };
    const playerId = sanitizePlayerId(body.playerId);
    const productId = String(body.productId || '').trim();
    const action = body.action === 'unequip' ? 'unequip' : 'equip';

    const db = getExchangeDb();
    const account = getOrCreatePlayerAccount(playerId);

    const product =
      db.products.find((p) => p.id === productId) ||
      account.ownedProductSnapshots[productId];

    if (!product) {
      return NextResponse.json({ ok: false, error: 'Product not found.' }, { status: 404 });
    }

    if (action === 'equip') {
      if (!account.ownedProductIds.includes(product.id)) {
        return NextResponse.json(
          { ok: false, error: 'You must own this cosmetic before equipping it.' },
          { status: 403 },
        );
      }
      if (product.category === 'gun_skin' && product.weaponClass) {
        account.equippedGunSkinsByClass[product.weaponClass] = product.id;
      } else if (product.category === 'backpack_skin') {
        account.equippedBackpackSkinId = product.id;
      }
    } else {
      if (product.category === 'gun_skin' && product.weaponClass) {
        if (account.equippedGunSkinsByClass[product.weaponClass] === product.id) {
          delete account.equippedGunSkinsByClass[product.weaponClass];
        }
      } else if (product.category === 'backpack_skin') {
        if (account.equippedBackpackSkinId === product.id) {
          account.equippedBackpackSkinId = null;
        }
      }
    }

    account.updatedAt = Date.now();
    persistExchangeDb();

    return NextResponse.json({
      ok: true,
      equippedGunSkinsByClass: account.equippedGunSkinsByClass,
      equippedBackpackSkinId: account.equippedBackpackSkinId,
    });
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid equip request.' }, { status: 400 });
  }
}
