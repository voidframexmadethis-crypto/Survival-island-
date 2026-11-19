import { NextRequest, NextResponse } from 'next/server';
import {
  getExchangeDb,
  getOrCreatePlayerAccount,
  getPaymentProviderStatus,
  sanitizePlayerId,
} from '@/lib/exchangeStore';

export async function GET(req: NextRequest) {
  const playerId = sanitizePlayerId(req.nextUrl.searchParams.get('playerId'));
  const db = getExchangeDb();
  const account = getOrCreatePlayerAccount(playerId);

  // Players ONLY see published products and active coin packages
  const publishedProducts = db.products.filter((p) => p.status === 'published');
  const activeCoinPackages = db.coinPackages.filter((pkg) => pkg.active);

  // Preserve owned items even if they were later unpublished or removed from the public store
  const ownedProducts = account.ownedProductIds
    .map(
      (id) =>
        db.products.find((p) => p.id === id) || account.ownedProductSnapshots[id] || null,
    )
    .filter(Boolean);

  const playerTransactions = db.transactions
    .filter((t) => t.playerId === account.playerId)
    .slice(0, 60);

  return NextResponse.json({
    playerId: account.playerId,
    coinBalance: account.coinBalance,
    ownedProductIds: account.ownedProductIds,
    ownedProducts,
    equippedGunSkinsByClass: account.equippedGunSkinsByClass,
    equippedBackpackSkinId: account.equippedBackpackSkinId,
    products: publishedProducts,
    coinPackages: activeCoinPackages,
    transactions: playerTransactions,
    paymentProvider: getPaymentProviderStatus(),
  });
}
