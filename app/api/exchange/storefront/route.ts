import { NextRequest, NextResponse } from 'next/server';
import {
  getAuthenticatedPlayer,
  getExchangeDb,
  getPaymentProviderStatus,
  loadExchangeDb,
  toPublicPlayerProfile,
} from '@/lib/exchangeStore';

export async function GET(req: NextRequest) {
  try {
    await loadExchangeDb();
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Exchange database is unavailable. Please try again shortly.' },
      { status: 503 },
    );
  }
  const db = getExchangeDb();
  const account = getAuthenticatedPlayer(req);

  // Players ONLY see published products and active coin packages
  const publishedProducts = db.products.filter((p) => p.status === 'published');
  const activeCoinPackages = db.coinPackages.filter((pkg) => pkg.active);
  const freeDefaultIds = publishedProducts
    .filter((p) => p.freeByDefault)
    .map((p) => p.id);

  if (!account) {
    const freeProducts = publishedProducts.filter((p) => p.freeByDefault);
    return NextResponse.json({
      authenticated: false,
      account: null,
      playerId: null,
      coinBalance: 0,
      ownedProductIds: freeDefaultIds,
      revokedProductIds: [],
      ownedProducts: freeProducts,
      equippedGunSkinsByClass: {},
      equippedBackpackSkinId: null,
      equippedCosmeticIds: [],
      // Launch catalog is intentionally empty. Owned/free items remain available
      // in ownedProducts so existing saves keep their cosmetics.
      products: [],
      coinPackages: [],
      transactions: [],
      pendingCheckouts: [],
      paymentProvider: getPaymentProviderStatus(),
    });
  }

  const effectiveOwnedIds = Array.from(
    new Set([...freeDefaultIds, ...account.ownedProductIds]),
  );

  // Preserve owned items even if they were later unpublished or removed from the public store
  const ownedProducts = effectiveOwnedIds
    .map(
      (id) =>
        db.products.find((p) => p.id === id) || account.ownedProductSnapshots[id] || null,
    )
    .filter(Boolean);

  const playerTransactions = db.transactions
    .filter((t) => t.playerId === account.playerId)
    .slice(0, 60);

  const pendingCheckouts = Object.values(db.payhipCheckouts || {})
    .filter(
      (c) =>
        c.playerId === account.playerId &&
        (c.status === 'waiting_confirmation' || c.status === 'pending_verification'),
    )
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, 10);

  return NextResponse.json({
    authenticated: true,
    account: toPublicPlayerProfile(account),
    playerId: account.playerId,
    coinBalance: account.coinBalance,
    ownedProductIds: effectiveOwnedIds,
    revokedProductIds: account.revokedProductIds || [],
    ownedProducts,
    equippedGunSkinsByClass: account.equippedGunSkinsByClass,
    equippedBackpackSkinId: account.equippedBackpackSkinId,
    equippedCosmeticIds: account.equippedCosmeticIds || [],
    products: [],
    coinPackages: [],
    transactions: playerTransactions,
    pendingCheckouts,
    paymentProvider: getPaymentProviderStatus(),
  });
}
