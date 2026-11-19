import crypto from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import {
  getExchangeDb,
  getOrCreatePlayerAccount,
  persistExchangeDb,
  sanitizePlayerId,
} from '@/lib/exchangeStore';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { playerId?: string; productId?: string };
    const playerId = sanitizePlayerId(body.playerId);
    const productId = String(body.productId || '').trim();
    if (!productId) {
      return NextResponse.json({ ok: false, error: 'Missing productId.' }, { status: 400 });
    }

    const db = getExchangeDb();
    const product = db.products.find((p) => p.id === productId);
    if (!product || product.status !== 'published') {
      return NextResponse.json(
        { ok: false, error: 'This product is not currently available for purchase.' },
        { status: 404 },
      );
    }

    const account = getOrCreatePlayerAccount(playerId);

    // Prevent duplicate purchase
    if (account.ownedProductIds.includes(product.id)) {
      return NextResponse.json(
        { ok: false, error: 'You already own this cosmetic item.' },
        { status: 409 },
      );
    }

    // Server-authoritative balance check — never trust client-supplied balance or price
    if (account.coinBalance < product.price) {
      return NextResponse.json(
        {
          ok: false,
          insufficientFunds: true,
          error: `Insufficient SI Coins. You need ${(product.price - account.coinBalance).toLocaleString()} more SI Coins.`,
        },
        { status: 402 },
      );
    }

    account.coinBalance -= product.price;
    account.ownedProductIds.push(product.id);
    account.ownedProductSnapshots[product.id] = { ...product };
    account.updatedAt = Date.now();

    const tx = {
      id: `tx_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`,
      type: 'cosmetic_purchase' as const,
      playerId: account.playerId,
      itemId: product.id,
      itemName: product.name,
      coinDelta: -product.price,
      status: 'completed' as const,
      createdAt: Date.now(),
      note: `Purchased ${product.name} (${product.category === 'gun_skin' ? 'Gun Skin' : 'Backpack Skin'})`,
    };
    db.transactions.unshift(tx);
    if (db.transactions.length > 500) db.transactions.length = 500;
    persistExchangeDb();

    return NextResponse.json({
      ok: true,
      coinBalance: account.coinBalance,
      ownedProductIds: account.ownedProductIds,
      transaction: tx,
    });
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid purchase request.' },
      { status: 400 },
    );
  }
}
